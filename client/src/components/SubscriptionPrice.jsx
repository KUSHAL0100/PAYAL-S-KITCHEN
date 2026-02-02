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

        const now = new Date();
        const start = new Date(currentSubscription.startDate);
        const end = new Date(currentSubscription.endDate);

        const totalDays = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
        const nowTime = new Date(now).setHours(0, 0, 0, 0);
        const startTime = new Date(start).setHours(0, 0, 0, 0);

        const usedDays = Math.ceil((now - start) / (1000 * 60 * 60 * 24));
        const remainingDays = Math.max(0, totalDays - usedDays);

        if (remainingDays <= 0) return 0;

        return Math.floor((currentSubscription.amountPaid / totalDays) * remainingDays);
    };

    const multiplier = MEAL_PRICE_MULTIPLIER ?
        (MEAL_PRICE_MULTIPLIER[mealType.toUpperCase()] || 1) :
        (mealType === 'both' ? 1 : 0.5);

    const newPrice = selectedPlan.price * multiplier;

    // Detailed Breakdown Info
    const start = new Date(currentSubscription.startDate);
    const end = new Date(currentSubscription.endDate);
    const now = new Date();
    const totalDays = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
    const usedDays = Math.max(0, Math.ceil((now - start) / (1000 * 60 * 60 * 24)));
    const remainingDays = Math.max(0, totalDays - usedDays);
    const credit = calculateCredit();
    const payable = Math.max(0, newPrice - credit);

    if (!currentSubscription) return null;

    return (
        <div className="mt-6 p-6 bg-gray-50 rounded-2xl border border-gray-100 shadow-inner">
            <h4 className="text-sm font-black text-gray-900 mb-4 uppercase tracking-wider">Upgrade Breakdown</h4>
            <div className="space-y-4">
                {/* Credit Logic Explanation */}
                <div className="bg-white p-3 rounded-xl border border-gray-100 space-y-2">
                    <div className="flex justify-between items-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                        <span>Current Plan Credit</span>
                        <span className="text-teal-600 px-2 py-0.5 bg-teal-50 rounded-md">Pro-rata Applied</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-[10px] text-gray-400 font-bold uppercase">Days Remaining</p>
                            <p className="text-sm font-black text-gray-900">{remainingDays} / {totalDays} Days</p>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] text-gray-400 font-bold uppercase">Remaining Value</p>
                            <p className="text-sm font-black text-teal-600">₹{credit.toFixed(2)}</p>
                        </div>
                    </div>
                </div>

                {/* Final Calculation */}
                <div className="space-y-3 pt-2">
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-500 font-medium">New Plan ({mealType})</span>
                        <span className="font-bold text-gray-900">₹{newPrice.toFixed(2)}</span>
                    </div>

                    <div className="flex justify-between text-sm text-teal-600 font-bold">
                        <span>Credit from Current Plan</span>
                        <span>- ₹{credit.toFixed(2)}</span>
                    </div>

                    <div className="pt-4 border-t border-gray-200 flex justify-between items-center">
                        <div>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Final Amount to Pay</p>
                            <p className="text-2xl font-black text-orange-600">₹{payable.toFixed(2)}</p>
                        </div>
                        {payable === 0 && (
                            <span className="px-3 py-1 bg-teal-100 text-teal-700 text-[10px] font-black rounded-full uppercase">Free Upgrade</span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SubscriptionPrice;
