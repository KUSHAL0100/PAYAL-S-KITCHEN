/**
 * Calculates the end date for a subscription based on duration
 * @param {Date} startDate 
 * @param {string} duration - 'monthly' or 'yearly'
 * @returns {Date}
 */
const calculateEndDate = (startDate, duration) => {
    const endDate = new Date(startDate);
    if (duration === 'monthly') {
        endDate.setMonth(endDate.getMonth() + 1);
    } else if (duration === 'yearly') {
        endDate.setFullYear(endDate.getFullYear() + 1);
    }
    return endDate;
};

/**
 * Calculates the pro-rata credit remaining for an active subscription
 * @param {Object} activeSub 
 * @param {Date} now 
 * @returns {number} - Credit amount in INR
 */
const calculateProRataCredit = (activeSub, now = new Date()) => {
    const start = new Date(activeSub.startDate);
    const end = new Date(activeSub.endDate);

    const totalDays = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));

    const usedDays = Math.ceil((now - start) / (1000 * 60 * 60 * 24));
    const remainingDays = Math.max(0, totalDays - usedDays);

    if (remainingDays <= 0) return 0;

    // Formula: (PlanValue / TotalDays) * RemainingDays
    const valueToProrate = activeSub.planValue || activeSub.amountPaid;
    return Math.floor((valueToProrate / totalDays) * remainingDays);
};

/**
 * Calculates the price multiplier based on meal type
 * @param {string} mealType 
 * @returns {number}
 */
const getPriceMultiplier = (mealType) => {
    return (mealType === 'lunch' || mealType === 'dinner') ? 0.5 : 1;
};

module.exports = {
    calculateEndDate,
    calculateProRataCredit,
    getPriceMultiplier
};
