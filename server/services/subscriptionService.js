const subscriptionRepo = require('../repositories/subscriptionRepository');
const orderRepo = require('../repositories/orderRepository');
const planRepo = require('../repositories/planRepository');
const userRepo = require('../repositories/userRepository');
const deliveryPauseRepo = require('../repositories/deliveryPauseRepository');
const razorpayUtil = require('../utils/razorpay');
const subUtils = require('../utils/subscriptionUtils');

/**
 * Service: All business logic for Subscriptions.
 */

// ─── Tier/Duration maps (used in upgrade validation) ───
const TIER_MAP = { 'Basic': 1, 'Premium': 2, 'Exotic': 3 };
const DURATION_MAP = { 'monthly': 1, 'yearly': 2 };

// ─── Buy Subscription (Create Razorpay Order) ───
const buySubscription = async (userId, { planId, mealType, lunchAddress, dinnerAddress }) => {
    const plan = await planRepo.findById(planId);
    if (!plan) return { success: false, status: 404, message: 'Plan not found' };

    const priceMultiplier = subUtils.getPriceMultiplier(mealType);
    const newPlanPrice = plan.price * priceMultiplier;

    const activeSub = await subscriptionRepo.findActiveByUserId(userId);
    let finalPrice = newPlanPrice;
    let upgradeDiscount = 0;

    if (activeSub) {
        upgradeDiscount = subUtils.calculateProRataCredit(activeSub);
        finalPrice = Math.max(0, newPlanPrice - upgradeDiscount);
    }

    const totalAmount = Math.max(finalPrice, 0);

    // Free Switch (credit covers cost)
    if (totalAmount === 0) {
        return {
            success: true,
            data: {
                bypassPayment: true,
                orderId: `free_${Date.now()}`,
                amount: 0, currency: 'INR',
                planId: plan._id, mealType: mealType || 'both',
                upgradeDiscount, lunchAddress, dinnerAddress
            }
        };
    }

    const order = await razorpayUtil.createOrder(totalAmount, 'receipt_order');
    return {
        success: true,
        data: {
            orderId: order.id, amount: order.amount, currency: order.currency,
            planId: plan._id, mealType: mealType || 'both',
            upgradeDiscount, lunchAddress, dinnerAddress
        }
    };
};

// ─── Verify Payment & Activate Subscription ───
const verifyAndActivate = async (userId, body) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, planId, mealType, lunchAddress, dinnerAddress } = body;

    // Verify signature (skip for free switch)
    if (razorpay_payment_id && razorpay_payment_id !== 'free_switch') {
        if (!razorpayUtil.verifySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature)) {
            return { success: false, status: 400, message: 'Invalid payment signature' };
        }
    }

    const plan = await planRepo.findById(planId);
    if (!plan) throw new Error('Plan not found');

    const selectedMealType = mealType || 'both';
    const totalValue = plan.price * subUtils.getPriceMultiplier(selectedMealType);

    // Handle old subscription transition
    const activeSub = await subscriptionRepo.findActiveByUserId(userId);
    let upgradeDiscount = 0;
    if (activeSub) {
        upgradeDiscount = subUtils.calculateProRataCredit(activeSub);
        activeSub.status = 'Upgraded';
        await subscriptionRepo.save(activeSub);
        await orderRepo.updateManyBySubscription(activeSub._id, { status: 'Upgraded' });
    }

    const finalPricePaid = Math.max(0, totalValue - upgradeDiscount);
    const startDate = new Date();
    const endDate = subUtils.calculateEndDate(startDate, plan.duration);

    // Build subscription data
    const subscriptionData = {
        user: userId, plan: plan._id, planValue: totalValue,
        startDate, endDate, status: 'Active',
        paymentId: razorpay_payment_id || 'Free Switch',
        amountPaid: finalPricePaid, mealType: selectedMealType
    };
    if (lunchAddress?.street) subscriptionData.lunchAddress = lunchAddress;
    if (dinnerAddress?.street) subscriptionData.dinnerAddress = dinnerAddress;

    const createdSubscription = await subscriptionRepo.create(subscriptionData);

    // Update user's current subscription
    const user = await userRepo.findById(userId);
    user.currentSubscription = createdSubscription._id;
    await userRepo.save(user);

    // Transfer pauses from old subscription
    if (activeSub) {
        await deliveryPauseRepo.transferToNewSubscription(activeSub._id, createdSubscription._id);
    }

    // Create order record
    const mealTypeLabel = selectedMealType === 'both' ? 'Lunch + Dinner' : selectedMealType.charAt(0).toUpperCase() + selectedMealType.slice(1);
    const order = await orderRepo.create({
        user: userId,
        items: [{
            name: `${plan.name} Plan (${plan.duration}) - ${mealTypeLabel}`,
            quantity: 1,
            selectedItems: { name: plan.name, duration: plan.duration, mealType: mealTypeLabel, planId: plan._id },
            deliveryDate: startDate
        }],
        price: totalValue, proRataCredit: upgradeDiscount, totalAmount: finalPricePaid,
        status: 'Confirmed', type: activeSub ? 'subscription_upgrade' : 'subscription_purchase',
        paymentDate: new Date(), paymentStatus: 'Paid',
        paymentId: razorpay_payment_id || 'Free Switch',
        subscription: createdSubscription._id,
        deliveryAddress: (createdSubscription.lunchAddress?.street) ? createdSubscription.lunchAddress : { street: 'N/A', city: 'N/A', zip: '000000' }
    });

    return { success: true, subscription: createdSubscription, order };
};

// ─── Cancel Subscription (User) ───
const cancelSubscription = async (userId, subscriptionId) => {
    const subscription = await subscriptionRepo.findByIdAndUserId(subscriptionId, userId);
    if (!subscription) return { success: false, status: 404, message: 'Subscription not found' };
    if (subscription.status !== 'Active') return { success: false, status: 400, message: 'Subscription is not active' };

    subscription.status = 'Cancelled';
    await subscriptionRepo.save(subscription);

    // Clear user's current subscription
    const user = await userRepo.findById(userId);
    if (user.currentSubscription?.toString() === subscriptionId) {
        user.currentSubscription = null;
        await userRepo.save(user);
    }

    // Mark connected orders as Cancelled
    await orderRepo.updateManyBySubscription(subscription._id, { status: 'Cancelled', refundAmount: 0, cancellationFee: 1 });

    // Cancel active delivery pauses
    await deliveryPauseRepo.cancelBySubscription(subscription._id);

    // Update last order's cancellation fee
    const lastOrder = await orderRepo.findLatestBySubscription(subscription._id);
    if (lastOrder) {
        lastOrder.refundAmount = 0;
        lastOrder.cancellationFee = lastOrder.totalAmount;
        await lastOrder.save();
    }

    return { success: true, subscription };
};

// ─── Cancel Subscription (Admin) ───
const adminCancelSubscription = async (subscriptionId) => {
    const subscription = await subscriptionRepo.findById(subscriptionId);
    if (!subscription) return { success: false, status: 404, message: 'Subscription not found' };

    subscription.status = 'Cancelled';
    await subscriptionRepo.save(subscription);

    const user = await userRepo.findById(subscription.user);
    if (user?.currentSubscription?.toString() === subscription._id.toString()) {
        user.currentSubscription = null;
        await userRepo.save(user);
    }

    await orderRepo.updateManyBySubscription(subscription._id, { status: 'Cancelled', refundAmount: 0 });
    await deliveryPauseRepo.cancelBySubscription(subscription._id);

    return { success: true, subscription };
};

// ─── Get Available Upgrades ───
const getAvailableUpgrades = async (userId) => {
    const subscription = await subscriptionRepo.findActiveByUserIdWithPlan(userId);

    if (!subscription) {
        const allPlans = await planRepo.findAll();
        return { success: true, data: allPlans };
    }

    const currentPlan = subscription.plan;
    const currentTier = TIER_MAP[currentPlan.name] || 0;
    const currentDuration = DURATION_MAP[currentPlan.duration] || 0;

    const allPlans = await planRepo.findAll();

    const availableUpgrades = allPlans.filter(plan => {
        const planTier = TIER_MAP[plan.name] || 0;
        const planDuration = DURATION_MAP[plan.duration] || 0;
        if (plan._id.toString() === currentPlan._id.toString()) return subscription.mealType !== 'both';
        return planTier > currentTier || (planTier === currentTier && planDuration > currentDuration);
    });

    const creditRemaining = subUtils.calculateProRataCredit(subscription);
    const upgradesWithPricing = availableUpgrades.map(plan => ({
        ...plan.toObject(),
        upgradePrice: Math.max(0, plan.price - creditRemaining),
        originalPrice: plan.price,
        discount: creditRemaining
    }));

    return { success: true, data: { currentSubscription: subscription, availableUpgrades: upgradesWithPricing } };
};

// ─── Initiate Upgrade ───
const initiateUpgrade = async (userId, { newPlanId, newMealType, newDeliveryAddress, lunchAddress, dinnerAddress }) => {
    const currentSubscription = await subscriptionRepo.findActiveByUserIdWithPlan(userId);
    if (!currentSubscription) return { success: false, status: 400, message: 'No active subscription found to upgrade' };

    const newPlan = await planRepo.findById(newPlanId);
    if (!newPlan) return { success: false, status: 404, message: 'New plan not found' };

    const currentPlan = currentSubscription.plan;
    const currentTier = TIER_MAP[currentPlan.name] || 0;
    const newTier = TIER_MAP[newPlan.name] || 0;
    const currentDuration = DURATION_MAP[currentPlan.duration] || 0;
    const newDuration = DURATION_MAP[newPlan.duration] || 0;

    const isHigherTier = newTier > currentTier;
    const isSameTierLongerDuration = (newTier === currentTier) && (newDuration > currentDuration);

    if (!isHigherTier && !isSameTierLongerDuration) {
        if (newPlanId !== currentPlan._id.toString()) {
            return { success: false, status: 400, message: 'Can only upgrade to higher tier or longer duration.' };
        }
    }

    const newPlanTotal = newPlan.price * subUtils.getPriceMultiplier(newMealType);
    const upgradeDiscount = subUtils.calculateProRataCredit(currentSubscription);
    const upgradePrice = Math.max(0, newPlanTotal - upgradeDiscount);

    const order = await razorpayUtil.createOrder(upgradePrice, 'receipt_upgrade');

    return {
        success: true,
        data: {
            orderId: order.id, amount: order.amount, currency: order.currency,
            currentSubscriptionId: currentSubscription._id, newPlanId: newPlan._id,
            upgradePrice, discount: upgradeDiscount,
            newMealType: newMealType || 'both', newDeliveryAddress, lunchAddress, dinnerAddress
        }
    };
};

// ─── Verify Upgrade Payment ───
const verifyUpgrade = async (userId, body) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, currentSubscriptionId, newPlanId, newMealType, lunchAddress, dinnerAddress } = body;

    if (!razorpayUtil.verifySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature)) {
        return { success: false, status: 400, message: 'Invalid payment signature' };
    }

    const currentSubscription = await subscriptionRepo.findByIdAndUserId(currentSubscriptionId, userId);
    if (!currentSubscription) return { success: false, status: 404, message: 'Current subscription not found' };

    const newPlan = await planRepo.findById(newPlanId);
    if (!newPlan) return { success: false, status: 404, message: 'New plan not found' };

    // Cancel old subscription
    currentSubscription.status = 'Upgraded';
    await subscriptionRepo.save(currentSubscription);
    await orderRepo.updateManyBySubscription(currentSubscription._id, { status: 'Upgraded' });

    // Calculate new dates and pricing
    const startDate = new Date();
    const endDate = subUtils.calculateEndDate(startDate, newPlan.duration);
    const selectedMealType = newMealType || 'both';
    const newAmountPaid = newPlan.price * subUtils.getPriceMultiplier(selectedMealType);
    const upgradeDiscount = subUtils.calculateProRataCredit(currentSubscription, startDate);
    const upgradePrice = Math.max(0, newAmountPaid - upgradeDiscount);

    // Build new subscription
    const newSubscriptionData = {
        user: userId, plan: newPlan._id, planValue: newAmountPaid,
        startDate, endDate, status: 'Active',
        paymentId: razorpay_payment_id, amountPaid: upgradePrice, mealType: selectedMealType
    };
    if (lunchAddress?.street) newSubscriptionData.lunchAddress = lunchAddress;
    else if (currentSubscription.lunchAddress) newSubscriptionData.lunchAddress = currentSubscription.lunchAddress;
    if (dinnerAddress?.street) newSubscriptionData.dinnerAddress = dinnerAddress;
    else if (currentSubscription.dinnerAddress) newSubscriptionData.dinnerAddress = currentSubscription.dinnerAddress;

    const newSubscription = await subscriptionRepo.create(newSubscriptionData);

    // Update user
    const user = await userRepo.findById(userId);
    user.currentSubscription = newSubscription._id;
    await userRepo.save(user);

    // Transfer pauses
    await deliveryPauseRepo.transferToNewSubscription(currentSubscription._id, newSubscription._id);

    // Create order record
    const mealTypeLabel = selectedMealType === 'both' ? 'Lunch + Dinner' : selectedMealType.charAt(0).toUpperCase() + selectedMealType.slice(1);
    const order = await orderRepo.create({
        user: userId,
        items: [{
            name: `Upgrade to ${newPlan.name} Plan (${newPlan.duration}) - ${mealTypeLabel}`,
            quantity: 1,
            selectedItems: { name: newPlan.name, duration: newPlan.duration, mealType: mealTypeLabel, planId: newPlan._id, type: 'upgrade' },
            deliveryDate: startDate
        }],
        price: newAmountPaid, proRataCredit: upgradeDiscount, totalAmount: upgradePrice,
        status: 'Confirmed', type: 'subscription_upgrade',
        paymentDate: new Date(), paymentStatus: 'Paid', paymentId: razorpay_payment_id,
        subscription: newSubscription._id, deliveryAddress: newSubscription.lunchAddress
    });

    return { success: true, subscription: newSubscription, order };
};

// ─── Change Meal Type ───
const changeMealType = async (userId, newMealType) => {
    const subscription = await subscriptionRepo.findActiveByUserIdWithPlan(userId);
    if (!subscription) return { success: false, status: 404, message: 'No active subscription found' };

    if (newMealType === 'both' && subscription.mealType !== 'both') {
        return { success: false, status: 400, message: 'Upgrading to both meals requires an additional payment. Please use the upgrade section.' };
    }

    subscription.mealType = newMealType;
    const priceMultiplier = subUtils.getPriceMultiplier(newMealType);
    if (subscription.plan?.price) {
        subscription.planValue = subscription.plan.price * priceMultiplier;
    }
    await subscriptionRepo.save(subscription);

    return { success: true, subscription };
};

// ─── Update Delivery Addresses ───
const updateDeliveryAddresses = async (userId, { lunchAddress, dinnerAddress, useDualAddresses }) => {
    const subscription = await subscriptionRepo.findActiveByUserId(userId);
    if (!subscription) return { success: false, status: 404, message: 'No active subscription found' };

    if (useDualAddresses && subscription.mealType === 'both' && lunchAddress && dinnerAddress) {
        subscription.lunchAddress = lunchAddress;
        subscription.dinnerAddress = dinnerAddress;
    } else {
        const address = lunchAddress || dinnerAddress;
        if (address) {
            subscription.lunchAddress = address;
            subscription.dinnerAddress = address;
        }
    }
    await subscriptionRepo.save(subscription);

    return { success: true, subscription };
};

module.exports = {
    buySubscription,
    verifyAndActivate,
    cancelSubscription,
    adminCancelSubscription,
    getAvailableUpgrades,
    initiateUpgrade,
    verifyUpgrade,
    changeMealType,
    updateDeliveryAddresses
};
