/**
 * Validates if an order can be placed based on the 12-hour advance requirement
 * @param {string} orderDate - The date for the order (YYYY-MM-DD format)
 * @param {string} mealTime - 'Lunch' or 'Dinner'
 * @returns {Object} - { isValid: boolean, hoursUntilDeadline: number, errorMessage: string }
 */
export const validateOrderTime = (orderDate, mealTime) => {
    const now = new Date();
    const targetDate = new Date(orderDate);

    if (mealTime === 'Lunch') {
        targetDate.setHours(12, 0, 0, 0);
    } else if (mealTime === 'Dinner') {
        targetDate.setHours(20, 0, 0, 0);
    }

    const diffInMs = targetDate - now;
    const hoursUntilDeadline = diffInMs / (1000 * 60 * 60);

    const isValid = hoursUntilDeadline >= 12;
    const errorMessage = isValid
        ? ''
        : `Order window closed. ${mealTime} must be ordered 12 hours in advance. Please select a future date.`;

    return {
        isValid,
        hoursUntilDeadline,
        errorMessage
    };
};

/**
 * Calculates cancellation fee and refund amount for an order
 * @param {Object} order - The order object
 * @returns {Object} - { cancellationFee: number, refundAmount: number, percentage: string, message: string }
 */
export const calculateCancellationFee = (order) => {
    const totalAmount = parseFloat(order.totalAmount) || 0;

    let cancellationFee = 0;
    let refundAmount = 0;
    let percentage = '0%';

    // Policy: Subscriptions have a NO REFUND policy regardless of status or timing
    if (order.type === 'subscription_purchase' || order.type === 'subscription_upgrade') {
        cancellationFee = totalAmount;
        refundAmount = 0;
        percentage = '100%';
    }
    // Policy 1: If Pending (Admin hasn't approved), 0% cancellation fee
    else if (order.status === 'Pending') {
        cancellationFee = 0;
        refundAmount = totalAmount;
        percentage = '0%';
    } else {
        // Time-based cancellation fees for Approved orders
        const now = new Date();
        const deliveryDate = new Date(order.deliveryDate);
        const diffInMs = deliveryDate - now;
        const diffInHours = diffInMs / (1000 * 60 * 60);

        let isLateCancellation = false;

        if (order.type === 'event') {
            // Event: < 5 hours
            isLateCancellation = diffInHours < 5;
        } else if (order.type === 'single') {
            // Single/Custom: < 2 hours
            isLateCancellation = diffInHours < 2;
        }

        if (isLateCancellation) {
            cancellationFee = totalAmount; // 100% fee
            refundAmount = 0;
            percentage = '100%';
        } else {
            // 20% Fee calculation
            cancellationFee = totalAmount * 0.20;
            refundAmount = totalAmount - cancellationFee;
            percentage = '20%';
        }
    }

    // Format for display
    const feeDisplay = cancellationFee > 0 ? `₹${cancellationFee.toFixed(2)}` : '₹0.00';
    const refundDisplay = refundAmount > 0 ? `₹${refundAmount.toFixed(2)}` : '₹0.00';

    const message = cancellationFee > 0
        ? `⚠️ Cancellation Fee Applies\n\n` +
        `• Order Total: ₹${totalAmount.toFixed(2)}\n` +
        `• Cancellation Fee (${percentage}): -${feeDisplay}\n` +
        `• Refund Amount: ${refundDisplay}\n\n` +
        `Are you sure you want to cancel?`
        : `✅ Full Refund Applicable\n\n` +
        `Total Amount: ₹${totalAmount.toFixed(2)}\n` +
        `You will receive a full refund of ${refundDisplay}.\n\n` +
        `Are you sure you want to cancel?`;

    return {
        cancellationFee,
        refundAmount,
        percentage,
        message
    };
};

/**
 * Checks if a user can upgrade to a new plan
 * @param {Object} currentSubscription - The current subscription object
 * @param {Object} newPlan - The plan to upgrade to
 * @param {string} newMealType - The new meal type ('both', 'lunch', or 'dinner')
 * @returns {Object} - { canUpgrade: boolean, reason: string }
 */
export const canUpgradeToPlan = (currentSubscription, newPlan, newMealType = 'both') => {
    if (!currentSubscription) {
        return { canUpgrade: true, reason: '' };
    }

    const isSamePlan = currentSubscription.plan._id === newPlan._id;

    // If it's the same plan, check if user is upgrading meal type
    if (isSamePlan) {
        const currentMealType = currentSubscription.mealType || 'both';

        // Allow upgrade from lunch/dinner to both on the same plan
        if ((currentMealType === 'lunch' || currentMealType === 'dinner') && newMealType === 'both') {
            return {
                canUpgrade: true,
                reason: 'Upgrading to Both meals! You will be charged the difference.'
            };
        }

        // If trying to get the exact same plan with same meal type, prevent it
        if (currentMealType === newMealType) {
            return {
                canUpgrade: false,
                reason: 'You already have this subscription active!'
            };
        }

        // Prevent downgrade from both to lunch/dinner
        if (currentMealType === 'both' && (newMealType === 'lunch' || newMealType === 'dinner')) {
            return {
                canUpgrade: false,
                reason: 'Cannot downgrade from Both meals to single meal. Please cancel current subscription first.'
            };
        }
    }

    const tierMap = { 'Basic': 1, 'Premium': 2, 'Exotic': 3 };
    const durationMap = { 'monthly': 1, 'yearly': 2 };

    const currentTier = tierMap[currentSubscription.plan.name] || 0;
    const newTier = tierMap[newPlan.name] || 0;
    const currentDuration = durationMap[currentSubscription.plan.duration] || 0;
    const newDuration = durationMap[newPlan.duration] || 0;

    const isHigherTier = newTier > currentTier;
    const isSameTierLongerDuration = (newTier === currentTier) && (newDuration > currentDuration);

    if (!isHigherTier && !isSameTierLongerDuration) {
        return {
            canUpgrade: false,
            reason: 'You can only upgrade to a higher tier or longer duration. Use "My Subscription" page to upgrade.'
        };
    }

    return {
        canUpgrade: true,
        reason: 'This is an upgrade! You will be charged the difference.'
    };
};

/**
 * Constants for meal pricing
 */
export const MEAL_PRICE_MULTIPLIER = {
    BOTH: 1.0,
    LUNCH: 0.5,
    DINNER: 0.5,
    LUNCH_ONLY: 0.5,
    DINNER_ONLY: 0.5
};
