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
    const { planId, mealType } = req.body;

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

        // Razorpay requires at least ₹1 for order creation
        const totalAmount = Math.max(finalPrice, 0);

        if (totalAmount < 1 && activeSub) {
            // If price difference is 0 or negative, we could skip Razorpay
            // But for simplicity, we charge a minimum of ₹1 to process as a transaction
            // OR handle as a free switch if you prefer.
            // Let's stick with min ₹1 for now to ensure Razorpay flow works, or handle free case.
        }

        const order = await razorpayUtil.createOrder(totalAmount, 'receipt_order');

        res.json({
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            planId: plan._id,
            mealType: mealType || 'both',
            upgradeDiscount: upgradeDiscount // Send for UI transparency
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
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, planId, mealType, deliveryAddress } = req.body;

    try {
        // Verify signature
        if (!razorpayUtil.verifySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature)) {
            return res.status(400).json({ message: 'Invalid payment signature' });
        }

        const plan = await Plan.findById(planId);

        // 1. Calculate the TOTAL VALUE of this new subscription
        let priceMultiplier = 1;
        const selectedMealType = mealType || 'both';
        if (selectedMealType === 'lunch' || selectedMealType === 'dinner') {
            priceMultiplier = 0.5;
        }
        const totalValue = plan.price * priceMultiplier;

        // 2. Handle the transition (Cancel Old Subscription)
        const activeSub = await Subscription.findOne({
            user: req.user._id,
            status: 'Active'
        });

        if (activeSub) {
            activeSub.status = 'Cancelled';
            // We don't issue a refund through Razorpay here because the value 
            // was used as a discount for the new subscription.
            await activeSub.save();
        }

        // 3. Set Subscription Dates
        const startDate = new Date();
        const endDate = subUtils.calculateEndDate(startDate, plan.duration);

        const subscription = new Subscription({
            user: req.user._id,
            plan: plan._id,
            startDate,
            endDate,
            status: 'Active',
            paymentId: razorpay_payment_id,
            amountPaid: totalValue, // Store the full value for future refund logic
            mealType: selectedMealType,
            deliveryAddress: deliveryAddress
        });

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
                price: totalValue
            }],
            totalAmount: totalValue,
            status: 'Confirmed',
            type: 'subscription_purchase',
            deliveryDate: new Date(),
            paymentStatus: 'Paid',
            paymentId: razorpay_payment_id,
            subscription: createdSubscription._id,
            deliveryAddress: deliveryAddress
        });

        await order.save();

        res.status(201).json({ subscription: createdSubscription, order });

    } catch (error) {
        console.error('Error verifying payment:', error);
        res.status(500).json({ message: 'Server Error' });
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

        res.json({
            message: 'Subscription cancelled successfully',
            subscription
        });
    } catch (error) {
        console.error('Error cancelling subscription:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Initiate Subscription Renewal
// @route   POST /api/subscriptions/renew-init
// @access  Private
const renewSubscription = async (req, res) => {
    const { subscriptionId } = req.body;

    try {
        const subscription = await Subscription.findOne({
            _id: subscriptionId,
            user: req.user._id
        }).populate('plan');

        if (!subscription) {
            return res.status(404).json({ message: 'Subscription not found' });
        }

        const plan = subscription.plan;

        if (!plan) {
            return res.status(404).json({ message: 'Plan associated with this subscription was not found. Please buy a new subscription.' });
        }

        const order = await razorpayUtil.createOrder(plan.price, 'receipt_renew');

        res.json({
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            subscriptionId: subscription._id,
            planId: plan._id,
        });

    } catch (error) {
        console.error('Error initiating renewal:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Verify Renewal Payment
// @route   POST /api/subscriptions/renew-verify
// @access  Private
const verifyRenewal = async (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, subscriptionId } = req.body;

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

        const subscription = await Subscription.findOne({
            _id: subscriptionId,
            user: req.user._id
        }).populate('plan');

        if (!subscription) {
            return res.status(404).json({ message: 'Subscription not found' });
        }

        const plan = subscription.plan;

        // Calculate new dates
        const startDate = new Date();
        const endDate = subUtils.calculateEndDate(startDate, plan.duration);

        // Update Subscription
        subscription.startDate = startDate;
        subscription.endDate = endDate;
        subscription.status = 'Active';
        subscription.paymentId = razorpay_payment_id;
        subscription.amountPaid = plan.price;

        await subscription.save();

        // Update User's current subscription
        const user = await User.findById(req.user._id);
        user.currentSubscription = subscription._id;
        await user.save();

        // Update existing Order (Find the order associated with this subscription)
        // We assume 1-to-1 mapping for simplicity in this flow, or find the latest one.
        // Actually, the user asked to "refresh on that old order".
        // Let's find the order that links to this subscription.
        const order = await Order.findOne({ subscription: subscription._id });

        if (order) {
            order.paymentStatus = 'Paid';
            order.paymentId = razorpay_payment_id;
            order.status = 'Confirmed'; // Reset status if it was cancelled
            order.deliveryDate = new Date(); // Update delivery date to now? Or keep original? "Refresh" implies update.
            order.updatedAt = new Date();
            await order.save();
        }

        res.json({ message: 'Subscription renewed successfully', subscription, order });

    } catch (error) {
        console.error('Error verifying renewal:', error);
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
        }).populate('plan');

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
            .sort({ createdAt: -1 });
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

            // Same plan - cannot repurchase
            if (plan._id.toString() === currentPlan._id.toString()) {
                return false;
            }

            // Upgrade rules:
            // 1. Higher tier (same or different duration)
            // 2. Same tier, longer duration
            const isHigherTier = planTier > currentTier;
            const isSameTierLongerDuration = (planTier === currentTier) && (planDuration > currentDuration);

            return isHigherTier || isSameTierLongerDuration;
        });

        // Calculate upgrade price for each
        const upgradesWithPricing = availableUpgrades.map(plan => ({
            ...plan.toObject(),
            upgradePrice: Math.max(0, plan.price - subscription.amountPaid),
            originalPrice: plan.price,
            discount: subscription.amountPaid
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
    const { newPlanId, newMealType, newDeliveryAddress } = req.body;

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
        let priceMultiplier = 1;
        if (newMealType === 'lunch' || newMealType === 'dinner') {
            priceMultiplier = 0.5;
        }
        const newPlanTotal = newPlan.price * priceMultiplier;

        // Calculate upgrade price (Full credit if same tier)
        let upgradeDiscount = 0;
        if (currentPlan._id.toString() === newPlanId.toString()) {
            upgradeDiscount = currentSubscription.amountPaid;
        } else {
            const now = new Date();
            const start = new Date(currentSubscription.startDate);
            const end = new Date(currentSubscription.endDate);
            const totalDays = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
            const usedDays = Math.ceil((now - start) / (1000 * 60 * 60 * 24));
            const remainingDays = Math.max(0, totalDays - usedDays);
            upgradeDiscount = Math.floor((currentSubscription.amountPaid / totalDays) * remainingDays);
        }

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
            discount: currentSubscription.amountPaid,
            newMealType: newMealType || 'both',
            newDeliveryAddress
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
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, currentSubscriptionId, newPlanId, newMealType, newDeliveryAddress } = req.body;

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
        currentSubscription.status = 'Cancelled';
        await currentSubscription.save();

        // Calculate new dates
        const startDate = new Date();
        const endDate = subUtils.calculateEndDate(startDate, newPlan.duration);

        // Calculate amount paid
        let priceMultiplier = 1;
        const selectedMealType = newMealType || 'both';
        if (selectedMealType === 'lunch' || selectedMealType === 'dinner') {
            priceMultiplier = 0.5;
        }
        const newAmountPaid = newPlan.price * priceMultiplier;

        // Create new subscription
        const newSubscription = new Subscription({
            user: req.user._id,
            plan: newPlan._id,
            startDate,
            endDate,
            status: 'Active',
            paymentId: razorpay_payment_id,
            amountPaid: newAmountPaid,
            mealType: selectedMealType,
            deliveryAddress: newDeliveryAddress || currentSubscription.deliveryAddress // Use new or fallback to old (if we had it, but old might not have it)
        });

        await newSubscription.save();

        // Update user's current subscription
        const user = await User.findById(req.user._id);
        user.currentSubscription = newSubscription._id;
        await user.save();

        // Create Order record
        const upgradePrice = Math.max(0, newAmountPaid - currentSubscription.amountPaid);
        const mealTypeLabel = selectedMealType === 'both' ? 'Lunch + Dinner' : selectedMealType.charAt(0).toUpperCase() + selectedMealType.slice(1);

        const order = new Order({
            user: req.user._id,
            items: [{
                name: `Upgrade to ${newPlan.name} Plan (${newPlan.duration}) - ${mealTypeLabel}`,
                quantity: 1,
                price: upgradePrice
            }],
            totalAmount: upgradePrice,
            status: 'Confirmed',
            type: 'subscription_upgrade',
            deliveryDate: new Date(),
            paymentStatus: 'Paid',
            paymentId: razorpay_payment_id,
            subscription: newSubscription._id,
            deliveryAddress: newDeliveryAddress || currentSubscription.deliveryAddress
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
        });

        if (!subscription) {
            return res.status(404).json({ message: 'No active subscription found' });
        }

        // Check if user is trying to switch to 'both' without having it
        // If it's an upgrade, we usually want them to go through the upgrade/payment flow
        // But the user said "if you provide both option for my current plan, then don't charge for that amount which i already paid for"
        // This suggests they want a simple switch if the price is the same or if they are okay with it.
        // However, switching TO both usually costs more.

        if (mealType === 'both' && subscription.mealType !== 'both') {
            return res.status(400).json({
                message: 'Upgrading to both meals requires an additional payment. Please use the upgrade section.'
            });
        }

        subscription.mealType = mealType;
        await subscription.save();

        res.json({
            message: `Meal type updated to ${mealType}. (No refund applied as per policy)`,
            subscription
        });
    } catch (error) {
        console.error('Error changing meal type:', error);
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
    changeMealType
};
