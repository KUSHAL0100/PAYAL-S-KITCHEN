const Subscription = require('../models/Subscription');
const Plan = require('../models/Plan');
const User = require('../models/User');
const Order = require('../models/Order');
const razorpayUtil = require('../utils/razorpay');
const subUtils = require('../utils/subscriptionUtils');
const crypto = require('crypto');

// @desc    Buy a subscription (Create Razorpay Order)
// @route   POST /api/subscriptions
// @access  Private
const buySubscription = async (req, res) => {
    const { planId, mealType, lunchAddress, dinnerAddress } = req.body;

    try {
        const plan = await Plan.findById(planId);
        if (!plan) {
            return res.status(404).json({ message: 'Plan not found' });
        }

        // 1. Calculate base price for new selection
        let priceMultiplier = 1;
        if (mealType === 'lunch' || mealType === 'dinner') {
            priceMultiplier = 0.5;
        }
        const newPlanPrice = plan.price * priceMultiplier;

        // 2. Check for active subscription to calculate upgrade difference
        const activeSub = await Subscription.findOne({
            user: req.user._id,
            status: 'Active'
        });

        let finalPrice = newPlanPrice;
        let upgradeDiscount = 0;

        if (activeSub) {
            upgradeDiscount = subUtils.calculateProRataCredit(activeSub);
            finalPrice = Math.max(0, newPlanPrice - upgradeDiscount);
        }

        const totalAmount = Math.max(finalPrice, 0);

        // Handle Free Switch (Credit covers cost or 100% discount)
        if (totalAmount === 0) {
            return res.json({
                bypassPayment: true,
                orderId: `free_${Date.now()}`, // Dummy ID
                amount: 0,
                currency: 'INR',
                planId: plan._id,
                mealType: mealType || 'both',
                upgradeDiscount: upgradeDiscount,
                lunchAddress,
                dinnerAddress
            });
        }

        const order = await razorpayUtil.createOrder(totalAmount, 'receipt_order');

        res.json({
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            planId: plan._id,
            mealType: mealType || 'both',
            upgradeDiscount: upgradeDiscount,
            lunchAddress,
            dinnerAddress
        });
    } catch (error) {
        console.error('Error creating Razorpay order:', error);
        res.status(500).json({ message: 'Error creating payment order', error: error.message });
    }
};

// @desc    Verify Payment and Activate Subscription
// @route   POST /api/subscriptions/verify
// @access  Private
const verifySubscriptionPayment = async (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, planId, mealType, lunchAddress, dinnerAddress } = req.body;

    try {
        // Verify signature ONLY if payment ID is present (not a free switch)
        if (razorpay_payment_id && razorpay_payment_id !== 'free_switch') {
            if (!razorpayUtil.verifySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature)) {
                return res.status(400).json({ message: 'Invalid payment signature' });
            }
        }

        const plan = await Plan.findById(planId);

        if (!plan) {
            throw new Error('Plan not found');
        }

        // 1. Calculate the TOTAL VALUE of this new subscription
        const selectedMealType = mealType || 'both';
        const totalValue = plan.price * subUtils.getPriceMultiplier(selectedMealType);

        // 2. Handle the transition (Cancel Old Subscription & Calculate Credit)
        const activeSub = await Subscription.findOne({
            user: req.user._id,
            status: 'Active'
        });

        let upgradeDiscount = 0;
        if (activeSub) {
            upgradeDiscount = subUtils.calculateProRataCredit(activeSub);
            activeSub.status = 'Upgraded';
            await activeSub.save();

            // Sync: Mark previous orders as Upgraded
            await Order.updateMany(
                { subscription: activeSub._id },
                { status: 'Upgraded' }
            );
        }

        const finalPricePaid = Math.max(0, totalValue - upgradeDiscount);

        // 3. Set Subscription Dates
        const startDate = new Date();
        const endDate = subUtils.calculateEndDate(startDate, plan.duration);

        // 4. Prepare subscription data
        const subscriptionData = {
            user: req.user._id,
            plan: plan._id,
            planValue: totalValue, // Store full market value
            startDate,
            endDate,
            status: 'Active',
            paymentId: razorpay_payment_id || 'Free Switch',
            amountPaid: finalPricePaid, // Actual cash paid
            mealType: selectedMealType
        };

        // Assign addresses
        if (lunchAddress && lunchAddress.street) {
            subscriptionData.lunchAddress = lunchAddress;
        }
        if (dinnerAddress && dinnerAddress.street) {
            subscriptionData.dinnerAddress = dinnerAddress;
        }

        const subscription = new Subscription(subscriptionData);
        const createdSubscription = await subscription.save();

        // Update user's current subscription
        const user = await User.findById(req.user._id);
        user.currentSubscription = createdSubscription._id;
        await user.save();

        // Create Order record
        const mealTypeLabel = selectedMealType === 'both' ? 'Lunch + Dinner' : selectedMealType.charAt(0).toUpperCase() + selectedMealType.slice(1);

        const order = new Order({
            user: req.user._id,
            items: [{
                name: `${plan.name} Plan (${plan.duration}) - ${mealTypeLabel}`,
                quantity: 1,
                selectedItems: {
                    name: plan.name,
                    duration: plan.duration,
                    mealType: mealTypeLabel,
                    planId: plan._id
                },
                deliveryDate: startDate
            }],
            price: totalValue,
            proRataCredit: upgradeDiscount,
            totalAmount: finalPricePaid,
            status: 'Confirmed',
            type: activeSub ? 'subscription_upgrade' : 'subscription_purchase',
            paymentDate: new Date(),
            paymentStatus: 'Paid',
            paymentId: razorpay_payment_id || 'Free Switch',
            subscription: createdSubscription._id,
            deliveryAddress: (createdSubscription.lunchAddress && createdSubscription.lunchAddress.street) ? createdSubscription.lunchAddress : { street: 'N/A', city: 'N/A', zip: '000000' }
        });

        await order.save();

        res.status(201).json({ subscription: createdSubscription, order });

    } catch (error) {
        res.status(500).json({ message: error.message || 'Server Error' });
    }
};

// @desc    Cancel Subscription
// @route   POST /api/subscriptions/cancel
// @access  Private
const cancelSubscription = async (req, res) => {
    const { subscriptionId } = req.body;

    try {
        const subscription = await Subscription.findOne({
            _id: subscriptionId,
            user: req.user._id
        });

        if (!subscription) {
            return res.status(404).json({ message: 'Subscription not found' });
        }

        if (subscription.status !== 'Active') {
            return res.status(400).json({ message: 'Subscription is not active' });
        }

        // No refunds or cancellation fees for subscriptions
        subscription.status = 'Cancelled';
        await subscription.save();

        // Also update the user's current subscription reference if it matches
        const user = await User.findById(req.user._id);
        if (user.currentSubscription && user.currentSubscription.toString() === subscriptionId) {
            user.currentSubscription = null;
            await user.save();
        }

        // Mark ALL connected orders as 'Cancelled' so it reflects in Order History
        await Order.updateMany(
            { subscription: subscription._id },
            {
                status: 'Cancelled',
                refundAmount: 0,
                cancellationFee: 1 // We can't easily know totalAmount for each in updateMany, but orderController handles the logic if they try to cancel again.
                // Actually, let's just update the status. The specific refund policy is handled in the order cancel route too.
            }
        );

        // For the latest order, we want to set the cancellationFee correctly if we had a single reference, 
        // but updateMany is safer to ensure nothing stays "Confirmed".
        const lastOrder = await Order.findOne({ subscription: subscription._id }).sort({ createdAt: -1 });
        if (lastOrder) {
            lastOrder.refundAmount = 0;
            lastOrder.cancellationFee = lastOrder.totalAmount;
            await lastOrder.save();
        }

        res.json({
            message: 'Subscription cancelled successfully',
            subscription
        });
    } catch (error) {
        console.error('Error cancelling subscription:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get my subscription
// @route   GET /api/subscriptions/me
// @access  Private
const getMySubscription = async (req, res) => {
    try {
        const subscription = await Subscription.findOne({
            user: req.user._id,
            status: 'Active',
        }).populate('plan').lean();

        if (subscription) {
            res.json(subscription);
        } else {
            res.status(404).json({ message: 'No active subscription found' });
        }
    } catch (error) {
        console.error('Error in getMySubscription:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get all subscriptions (Admin)
// @route   GET /api/subscriptions
// @access  Private/Admin
const getAllSubscriptions = async (req, res) => {
    try {
        const subscriptions = await Subscription.find({})
            .populate('user', 'name email')
            .populate('plan', 'name price duration')
            .sort({ createdAt: -1 })
            .lean();
        res.json(subscriptions);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Cancel Subscription (Admin)
// @route   PUT /api/subscriptions/:id/cancel
// @access  Private/Admin
const adminCancelSubscription = async (req, res) => {
    try {
        const subscription = await Subscription.findById(req.params.id);

        if (!subscription) {
            return res.status(404).json({ message: 'Subscription not found' });
        }

        subscription.status = 'Cancelled';
        await subscription.save();

        // Update user's current subscription if it matches
        const user = await User.findById(subscription.user);
        if (user && user.currentSubscription && user.currentSubscription.toString() === subscription._id.toString()) {
            user.currentSubscription = null;
            await user.save();
        }

        // Update associated orders to Cancelled
        await Order.updateMany(
            { subscription: subscription._id },
            {
                status: 'Cancelled',
                refundAmount: 0
            }
        );

        res.json({ message: 'Subscription cancelled by admin', subscription });
    } catch (error) {
        console.error('Error cancelling subscription:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get available upgrade plans for user
// @route   GET /api/subscriptions/available-upgrades
// @access  Private
const getAvailableUpgrades = async (req, res) => {
    try {
        const subscription = await Subscription.findOne({
            user: req.user._id,
            status: 'Active',
        }).populate('plan');

        if (!subscription) {
            // No active subscription, return all plans
            const allPlans = await Plan.find({});
            return res.json(allPlans);
        }

        const currentPlan = subscription.plan;

        // Define tier hierarchy
        const tierMap = { 'Basic': 1, 'Premium': 2, 'Exotic': 3 };
        const durationMap = { 'monthly': 1, 'yearly': 2 };

        const currentTier = tierMap[currentPlan.name] || 0;
        const currentDuration = durationMap[currentPlan.duration] || 0;

        // Get all plans
        const allPlans = await Plan.find({});

        // Filter for valid upgrades
        const availableUpgrades = allPlans.filter(plan => {
            const planTier = tierMap[plan.name] || 0;
            const planDuration = durationMap[plan.duration] || 0;

            // Same plan - allow if upgrading meal type (e.g. Lunch -> Both)
            if (plan._id.toString() === currentPlan._id.toString()) {
                return subscription.mealType !== 'both';
            }

            // Upgrade rules:
            // 1. Higher tier (same or different duration)
            // 2. Same tier, longer duration
            const isHigherTier = planTier > currentTier;
            const isSameTierLongerDuration = (planTier === currentTier) && (planDuration > currentDuration);

            return isHigherTier || isSameTierLongerDuration;
        });

        // Calculate amount remaining on current subscription (Pro-rata credit)
        const creditRemaining = subUtils.calculateProRataCredit(subscription);

        // Calculate upgrade price for each
        const upgradesWithPricing = availableUpgrades.map(plan => ({
            ...plan.toObject(),
            upgradePrice: Math.max(0, plan.price - creditRemaining),
            originalPrice: plan.price,
            discount: creditRemaining
        }));

        res.json({
            currentSubscription: subscription,
            availableUpgrades: upgradesWithPricing
        });

    } catch (error) {
        console.error('Error getting available upgrades:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Initiate Subscription Upgrade
// @route   POST /api/subscriptions/upgrade-init
// @access  Private
const upgradeSubscription = async (req, res) => {
    const { newPlanId, newMealType, newDeliveryAddress, lunchAddress, dinnerAddress } = req.body;

    try {
        const currentSubscription = await Subscription.findOne({
            user: req.user._id,
            status: 'Active',
        }).populate('plan');

        if (!currentSubscription) {
            return res.status(400).json({ message: 'No active subscription found to upgrade' });
        }

        const newPlan = await Plan.findById(newPlanId);
        if (!newPlan) {
            return res.status(404).json({ message: 'New plan not found' });
        }

        const currentPlan = currentSubscription.plan;

        // Validate upgrade (Tier/Duration check)
        const tierMap = { 'Basic': 1, 'Premium': 2, 'Exotic': 3 };
        const durationMap = { 'monthly': 1, 'yearly': 2 };

        const currentTier = tierMap[currentPlan.name] || 0;
        const newTier = tierMap[newPlan.name] || 0;
        const currentDuration = durationMap[currentPlan.duration] || 0;
        const newDuration = durationMap[newPlan.duration] || 0;

        const isHigherTier = newTier > currentTier;
        const isSameTierLongerDuration = (newTier === currentTier) && (newDuration > currentDuration);

        // Also allow same tier/duration if upgrading from single meal to both?
        // e.g. Basic Monthly Lunch -> Basic Monthly Both
        // But the plan ID would be the same. The frontend should handle "Modify Subscription" for that?
        // The user said "upgrade only".
        // If plan IDs are different, it's a plan change.
        // If plan IDs are same, it's a meal type change (which we might not support via "upgrade" route if ID is same).
        // But let's assume newPlanId is passed.

        if (!isHigherTier && !isSameTierLongerDuration) {
            // Check if it's same plan but upgrading meal type (e.g. Lunch -> Both)
            // This requires us to check if newPlanId === currentPlan._id
            if (newPlanId !== currentPlan._id.toString()) {
                return res.status(400).json({ message: 'Can only upgrade to higher tier or longer duration.' });
            }
        }

        // Calculate new plan price based on meal type
        const newPlanTotal = newPlan.price * subUtils.getPriceMultiplier(newMealType);

        // Calculate amount remaining on current subscription (Pro-rata credit)
        const upgradeDiscount = subUtils.calculateProRataCredit(currentSubscription);
        const upgradePrice = Math.max(0, newPlanTotal - upgradeDiscount);

        if (upgradePrice < 1) {
            // Minimal charge for processing
        }

        // Create Razorpay order
        const order = await razorpayUtil.createOrder(upgradePrice, 'receipt_upgrade');

        res.json({
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            currentSubscriptionId: currentSubscription._id,
            newPlanId: newPlan._id,
            upgradePrice,
            discount: upgradeDiscount,
            newMealType: newMealType || 'both',
            newDeliveryAddress,
            lunchAddress,
            dinnerAddress
        });

    } catch (error) {
        console.error('Error initiating upgrade:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Verify Upgrade Payment
// @route   POST /api/subscriptions/upgrade-verify
// @access  Private
const verifyUpgrade = async (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, currentSubscriptionId, newPlanId, newMealType, newDeliveryAddress, lunchAddress, dinnerAddress } = req.body;

    try {
        // Verify signature
        const body = razorpay_order_id + '|' + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest('hex');

        if (expectedSignature !== razorpay_signature) {
            return res.status(400).json({ message: 'Invalid payment signature' });
        }

        const currentSubscription = await Subscription.findOne({
            _id: currentSubscriptionId,
            user: req.user._id
        });

        if (!currentSubscription) {
            return res.status(404).json({ message: 'Current subscription not found' });
        }

        const newPlan = await Plan.findById(newPlanId);
        if (!newPlan) {
            return res.status(404).json({ message: 'New plan not found' });
        }

        // Cancel old subscription
        currentSubscription.status = 'Upgraded';
        await currentSubscription.save();

        // Mark ALL previous orders as Upgraded to avoid confusion in Order History
        // Use currentSubscription._id to find all orders linked to the subscription we are transitioning FROM
        await Order.updateMany(
            { subscription: currentSubscription._id },
            { status: 'Upgraded' }
        );

        // Calculate new dates
        const startDate = new Date();
        const endDate = subUtils.calculateEndDate(startDate, newPlan.duration);

        // Calculate amount paid and pro-rata credits
        const selectedMealType = newMealType || 'both';
        const newAmountPaid = newPlan.price * subUtils.getPriceMultiplier(selectedMealType);
        const upgradeDiscount = subUtils.calculateProRataCredit(currentSubscription, startDate);
        const upgradePrice = Math.max(0, newAmountPaid - upgradeDiscount);

        // Prepare new subscription data
        const newSubscriptionData = {
            user: req.user._id,
            plan: newPlan._id,
            planValue: newAmountPaid, // Store full market value
            startDate,
            endDate,
            status: 'Active',
            paymentId: razorpay_payment_id,
            amountPaid: upgradePrice, // Store actual cash paid
            mealType: selectedMealType
        };

        // Assign addresses from provided data or fall back to current subscription
        if (lunchAddress && lunchAddress.street) {
            newSubscriptionData.lunchAddress = lunchAddress;
        } else if (currentSubscription.lunchAddress) {
            newSubscriptionData.lunchAddress = currentSubscription.lunchAddress;
        }

        if (dinnerAddress && dinnerAddress.street) {
            newSubscriptionData.dinnerAddress = dinnerAddress;
        } else if (currentSubscription.dinnerAddress) {
            newSubscriptionData.dinnerAddress = currentSubscription.dinnerAddress;
        }


        // Create new subscription
        const newSubscription = new Subscription(newSubscriptionData);
        await newSubscription.save();

        // Update user's current subscription
        const user = await User.findById(req.user._id);
        user.currentSubscription = newSubscription._id;
        await user.save();

        // Create Order record (Calculate final price paid after pro-rata discount)
        const mealTypeLabel = selectedMealType === 'both' ? 'Lunch + Dinner' : selectedMealType.charAt(0).toUpperCase() + selectedMealType.slice(1);

        const order = new Order({
            user: req.user._id,
            items: [{
                name: `Upgrade to ${newPlan.name} Plan (${newPlan.duration}) - ${mealTypeLabel}`,
                quantity: 1,
                name: `Upgrade to ${newPlan.name} Plan (${newPlan.duration}) - ${mealTypeLabel}`,
                quantity: 1,
                selectedItems: {
                    name: newPlan.name,
                    duration: newPlan.duration,
                    mealType: mealTypeLabel,
                    planId: newPlan._id,
                    type: 'upgrade'
                },
                deliveryDate: startDate
            }],
            price: newAmountPaid,
            proRataCredit: upgradeDiscount,
            totalAmount: upgradePrice,
            status: 'Confirmed',
            type: 'subscription_upgrade',
            paymentDate: new Date(),
            paymentStatus: 'Paid',
            paymentId: razorpay_payment_id,
            subscription: newSubscription._id,
            deliveryAddress: newSubscription.lunchAddress // Use lunchAddress (always populated)
        });

        await order.save();

        res.status(201).json({
            message: 'Subscription upgraded successfully',
            subscription: newSubscription,
            order
        });

    } catch (error) {
        console.error('Error verifying upgrade:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Change meal type for active subscription (No refund)
// @route   PUT /api/subscriptions/change-meal-type
// @access  Private
const changeMealType = async (req, res) => {
    const { mealType } = req.body; // 'both', 'lunch', 'dinner'

    try {
        const subscription = await Subscription.findOne({
            user: req.user._id,
            status: 'Active'
        }).populate('plan');

        if (!subscription) {
            return res.status(404).json({ message: 'No active subscription found' });
        }

        // Check if user is trying to switch to 'both' without having it
        if (mealType === 'both' && subscription.mealType !== 'both') {
            return res.status(400).json({
                message: 'Upgrading to both meals requires an additional payment. Please use the upgrade section.'
            });
        }

        // Update meal type
        subscription.mealType = mealType;

        // Update planValue to reflect the new meal type's market value
        // This ensures that future upgrades/credits are calculated based on the CURRENT service level
        const priceMultiplier = subUtils.getPriceMultiplier(mealType);
        if (subscription.plan && subscription.plan.price) {
            subscription.planValue = subscription.plan.price * priceMultiplier;
        }

        await subscription.save(); // Pre-save hook will handle address duplication if needed


        res.json({
            message: `Meal type updated to ${mealType}. (No refund applied as per policy)`,
            subscription
        });
    } catch (error) {
        console.error('Error changing meal type:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

const updateDeliveryAddresses = async (req, res) => {
    const { lunchAddress, dinnerAddress, useDualAddresses } = req.body;

    try {
        const subscription = await Subscription.findOne({
            user: req.user._id,
            status: 'Active'
        });

        if (!subscription) {
            return res.status(404).json({ message: 'No active subscription found' });
        }

        // Update addresses based on whether dual addresses are used
        if (useDualAddresses && subscription.mealType === 'both' && lunchAddress && dinnerAddress) {
            // Set different addresses for lunch and dinner
            subscription.lunchAddress = lunchAddress;
            subscription.dinnerAddress = dinnerAddress;
        } else {
            // Use same address for both - assign to both fields
            const address = lunchAddress || dinnerAddress;
            if (address) {
                subscription.lunchAddress = address;
                subscription.dinnerAddress = address;
            }
        }

        await subscription.save(); // Pre-save hook will handle meal-type specific logic

        res.json({
            message: 'Delivery addresses updated successfully',
            subscription
        });
    } catch (error) {
        console.error('Error updating delivery addresses:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

module.exports = {
    buySubscription,
    verifySubscriptionPayment,
    cancelSubscription,
    renewSubscription,
    verifyRenewal,
    getMySubscription,
    getAllSubscriptions,
    adminCancelSubscription,
    getAvailableUpgrades,
    upgradeSubscription,
    verifyUpgrade,
    changeMealType,
    updateDeliveryAddresses
};
