import React from 'react';

const SubscriptionPrice = ({
    selectedPlan,
    currentSubscription,
    mealType,
    MEAL_PRICE_MULTIPLIER
}) => {
    // Math logic extracted from Plans.jsx and MySubscription.jsx
    const calculateCredit = () => {
        if (!currentSubscription) return 0;

        if (currentSubscription.plan._id === selectedPlan._id) {
            return currentSubscription.amountPaid;
        }

        const now = new Date();
        const start = new Date(currentSubscription.startDate);
        const end = new Date(currentSubscription.endDate);
        const totalDays = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
        const usedDays = Math.ceil((now - start) / (1000 * 60 * 60 * 24));
        const remainingDays = Math.max(0, totalDays - usedDays);

        return Math.floor((currentSubscription.amountPaid / totalDays) * remainingDays);
    };

    const multiplier = MEAL_PRICE_MULTIPLIER ?
        (MEAL_PRICE_MULTIPLIER[mealType.toUpperCase()] || 1) :
        (mealType === 'both' ? 1 : 0.5);

    const newPrice = selectedPlan.price * multiplier;
    const credit = calculateCredit();
    const payable = Math.max(0, newPrice - credit);

    return (
        <div className="mt-6 p-6 bg-gray-50 rounded-2xl border border-gray-100 shadow-inner">
            <h4 className="text-sm font-black text-gray-900 mb-4 uppercase tracking-wider">Price Breakdown</h4>
            <div className="space-y-3">
                <div className="flex justify-between text-sm">
                    <span className="text-gray-500 font-medium">New Plan ({mealType})</span>
                    <span className="font-bold text-gray-900">₹{newPrice.toFixed(2)}</span>
                </div>

                {currentSubscription && (
                    <div className="flex justify-between text-sm text-teal-600 font-bold bg-teal-50/50 px-2 py-1 rounded-lg">
                        <span>Upgrade Credit</span>
                        <span>- ₹{credit.toFixed(2)}</span>
                    </div>
                )}

                <div className="pt-3 border-t border-gray-200 flex justify-between items-center text-lg font-black text-orange-600">
                    <span>Amount to Pay</span>
                    <span>₹{payable.toFixed(2)}</span>
                </div>
            </div>
            {currentSubscription && payable === 0 && (
                <p className="mt-3 text-[10px] text-teal-600 font-bold uppercase text-center bg-teal-50 py-1 rounded-full">
                    Plan downgrade / equal cost: No payment required
                </p>
            )}
        </div>
    );
};

export default SubscriptionPrice;
