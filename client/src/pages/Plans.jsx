import React, { useEffect, useState, useContext } from 'react';
import axios from 'axios';
import { Check, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import NotificationContext from '../context/NotificationContext';
import { canUpgradeToPlan, MEAL_PRICE_MULTIPLIER } from '../utils/orderUtils';

const Plans = () => {
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentSubscription, setCurrentSubscription] = useState(null);
    const { user } = useContext(AuthContext);
    const { showNotification } = useContext(NotificationContext);
    const navigate = useNavigate();

    const [selectedPlan, setSelectedPlan] = useState(null);
    const [mealType, setMealType] = useState('both');
    const [deliveryAddress, setDeliveryAddress] = useState({
        street: '',
        city: '',
        zip: '',
        country: 'India'
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await axios.get('http://localhost:5000/api/plans');
                setPlans(res.data);

                // Fetch current subscription if user is logged in
                if (user) {
                    try {
                        const config = {
                            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
                        };
                        const subRes = await axios.get('http://localhost:5000/api/subscriptions/me', config);
                        setCurrentSubscription(subRes.data);
                    } catch (error) {
                        // No active subscription, that's okay
                        setCurrentSubscription(null);
                    }
                }

                setLoading(false);
            } catch (error) {
                console.error('Error fetching plans:', error);
                setLoading(false);
                showNotification('Failed to load plans', 'error');
            }
        };

        fetchData();

        // Load Razorpay script
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.async = true;
        document.body.appendChild(script);

        return () => {
            document.body.removeChild(script);
        };
    }, [user]);

    const handleInitiateSubscribe = (plan) => {
        if (!user) {
            navigate('/login');
            return;
        }

        // Use utility function to check upgrade eligibility
        // Check with 'both' since that's the default when modal opens
        const { canUpgrade, reason } = canUpgradeToPlan(currentSubscription, plan, 'both');

        if (!canUpgrade) {
            showNotification(reason, 'error');
            return;
        }

        // If valid upgrade, show message
        if (currentSubscription && reason) {
            showNotification(reason, 'info');
        }

        setSelectedPlan(plan);
        setMealType('both'); // Default
        setDeliveryAddress({ street: '', city: '', zip: '', country: 'India' });
    };

    const handleConfirmSubscribe = async () => {
        if (!selectedPlan) return;

        if (!deliveryAddress.street || !deliveryAddress.city || !deliveryAddress.zip) {
            showNotification('Please fill in all address fields.', 'error');
            return;
        }

        try {
            const config = {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                },
            };

            // 1. Create Order
            const { data: orderData } = await axios.post(
                'http://localhost:5000/api/subscriptions',
                {
                    planId: selectedPlan._id,
                    mealType: mealType,
                    deliveryAddress: deliveryAddress
                },
                config
            );

            // 2. Open Razorpay Checkout
            const options = {
                key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_placeholder',
                amount: orderData.amount,
                currency: orderData.currency,
                name: "Payal's Kitchen",
                description: `Subscription - ${selectedPlan.name} (${mealType})`,
                order_id: orderData.orderId,
                handler: async function (response) {
                    try {
                        // 3. Verify Payment
                        await axios.post(
                            'http://localhost:5000/api/subscriptions/verify',
                            {
                                razorpay_order_id: response.razorpay_order_id,
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_signature: response.razorpay_signature,
                                planId: selectedPlan._id,
                                mealType: mealType,
                                deliveryAddress: deliveryAddress
                            },
                            config
                        );
                        showNotification('Subscription successful! Redirecting...', 'success');
                        navigate('/my-subscription');
                    } catch (error) {
                        console.error('Payment verification failed:', error);
                        showNotification('Payment verification failed. Please contact support.', 'error');
                    }
                },
                prefill: {
                    name: user.name,
                    email: user.email,
                },
                theme: {
                    color: '#ea580c',
                },
            };

            const rzp1 = new window.Razorpay(options);
            rzp1.on('payment.failed', function (response) {
                showNotification(response.error.description, 'error');
            });
            rzp1.open();
            setSelectedPlan(null); // Close modal

        } catch (error) {
            console.error('Error initiating subscription:', error);
            showNotification('Failed to initiate subscription. Please try again.', 'error');
        }
    };

    if (loading) {
        return <div className="text-center py-10">Loading plans...</div>;
    }

    // Filter and sort plans
    const monthlyPlans = plans
        .filter(plan => plan.duration === 'monthly')
        .sort((a, b) => a.price - b.price);

    const yearlyPlans = plans
        .filter(plan => plan.duration === 'yearly')
        .sort((a, b) => a.price - b.price);

    const PlanCard = ({ plan }) => {
        const isCurrent = currentSubscription &&
            currentSubscription.plan._id === plan._id &&
            (currentSubscription.mealType === 'both' || !currentSubscription.mealType);

        return (
            <div key={plan._id} className={`border rounded-lg shadow-sm divide-y divide-gray-200 bg-white flex flex-col hover:shadow-lg transition-shadow duration-300 ${isCurrent ? 'border-orange-500 border-2' : 'border-gray-200'}`}>
                <div className="p-6">
                    {isCurrent && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 mb-2">
                            Current Plan
                        </span>
                    )}
                    <h3 className="text-lg leading-6 font-medium text-gray-900">{plan.name}</h3>
                    <p className="mt-4 text-sm text-gray-500">{plan.description}</p>
                    <p className="mt-8">
                        <span className="text-4xl font-extrabold text-gray-900">₹{plan.price}</span>
                        <span className="text-base font-medium text-gray-500">/{plan.duration}</span>
                    </p>
                    <button
                        type="button"
                        onClick={() => handleInitiateSubscribe(plan)}
                        disabled={isCurrent}
                        className={`mt-8 block w-full border border-transparent rounded-md py-2 text-sm font-semibold text-white text-center transition-colors duration-200 ${isCurrent
                            ? 'bg-gray-400 cursor-not-allowed'
                            : 'bg-orange-600 hover:bg-orange-700'
                            }`}
                    >
                        {isCurrent ? 'Current Plan' : 'Subscribe Now'}
                    </button>
                </div>
                <div className="pt-6 pb-8 px-6 flex-grow">
                    <h4 className="text-sm font-medium text-gray-900 tracking-wide uppercase">What's included</h4>
                    <ul className="mt-6 space-y-4">
                        {plan.features.map((feature, index) => (
                            <li key={index} className="flex space-x-3">
                                <Check className="flex-shrink-0 h-5 w-5 text-green-500" aria-hidden="true" />
                                <span className="text-sm text-gray-500">{feature}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        );
    };

    return (
        <div className="bg-gray-50 py-12 relative">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
                        Choose Your Plan
                    </h2>
                    <p className="mt-4 text-xl text-gray-500">
                        Flexible subscription options tailored to your needs.
                    </p>
                </div>

                {/* No Refund Warning */}
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-8 max-w-4xl mx-auto">
                    <div className="flex">
                        <AlertCircle className="h-5 w-5 text-yellow-400" />
                        <div className="ml-3">
                            <p className="text-sm text-yellow-700 font-medium">
                                Important: No refunds available on subscription purchases or upgrades.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Monthly Plans Section */}
                <div className="mb-16">
                    <h3 className="text-2xl font-bold text-gray-900 mb-6 border-b pb-2 border-gray-200">Monthly Plans</h3>
                    <div className="space-y-4 sm:space-y-0 sm:grid sm:grid-cols-2 sm:gap-6 lg:max-w-4xl lg:mx-auto xl:max-w-none xl:mx-0 xl:grid-cols-3">
                        {monthlyPlans.map(plan => <PlanCard key={plan._id} plan={plan} />)}
                    </div>
                </div>

                {/* Yearly Plans Section */}
                <div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-6 border-b pb-2 border-gray-200">Yearly Plans <span className="text-sm font-normal text-green-600 ml-2">(Best Value: 2 Months Free!)</span></h3>
                    <div className="space-y-4 sm:space-y-0 sm:grid sm:grid-cols-2 sm:gap-6 lg:max-w-4xl lg:mx-auto xl:max-w-none xl:mx-0 xl:grid-cols-3">
                        {yearlyPlans.map(plan => <PlanCard key={plan._id} plan={plan} />)}
                    </div>
                </div>
            </div>

            {/* Meal Selection Modal */}
            {selectedPlan && (
                <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
                    <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={() => setSelectedPlan(null)}></div>
                        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
                        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                                <div className="sm:flex sm:items-start">
                                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                                        <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                                            Customize Your Subscription
                                        </h3>
                                        <div className="mt-2">
                                            <p className="text-sm text-gray-500 mb-4">
                                                Plan: <span className="font-semibold">{selectedPlan.name} ({selectedPlan.duration})</span>
                                            </p>

                                            {/* Meal Type Selection */}
                                            <div className="mb-6">
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Select Meal Option</label>
                                                <div className="space-y-2">
                                                    <div className="flex items-center">
                                                        <input
                                                            id="both"
                                                            name="mealType"
                                                            type="radio"
                                                            checked={mealType === 'both'}
                                                            onChange={() => setMealType('both')}
                                                            disabled={currentSubscription?.plan?._id === selectedPlan._id && (currentSubscription?.mealType === 'both' || !currentSubscription?.mealType)}
                                                            className="focus:ring-orange-500 h-4 w-4 text-orange-600 border-gray-300 disabled:opacity-50"
                                                        />
                                                        <label htmlFor="both" className={`ml-3 block text-sm font-medium ${currentSubscription?.plan?._id === selectedPlan._id && (currentSubscription?.mealType === 'both' || !currentSubscription?.mealType) ? 'text-gray-400' : 'text-gray-700'}`}>
                                                            Both (Lunch + Dinner) - <span className="font-bold">₹{selectedPlan.price * MEAL_PRICE_MULTIPLIER.BOTH}</span>
                                                        </label>
                                                    </div>
                                                    <div className="flex items-center">
                                                        <input
                                                            id="lunch"
                                                            name="mealType"
                                                            type="radio"
                                                            checked={mealType === 'lunch'}
                                                            onChange={() => setMealType('lunch')}
                                                            disabled={
                                                                currentSubscription?.plan?._id === selectedPlan._id &&
                                                                (currentSubscription?.mealType === 'lunch' || currentSubscription?.mealType === 'dinner' || currentSubscription?.mealType === 'both')
                                                            }
                                                            className="focus:ring-orange-500 h-4 w-4 text-orange-600 border-gray-300 disabled:opacity-50"
                                                        />
                                                        <label htmlFor="lunch" className={`ml-3 block text-sm font-medium ${currentSubscription?.plan?._id === selectedPlan._id && (currentSubscription?.mealType === 'lunch' || currentSubscription?.mealType === 'dinner' || currentSubscription?.mealType === 'both') ? 'text-gray-400' : 'text-gray-700'}`}>
                                                            Lunch Only - <span className="font-bold">₹{selectedPlan.price * MEAL_PRICE_MULTIPLIER.LUNCH_ONLY}</span>
                                                        </label>
                                                    </div>
                                                    <div className="flex items-center">
                                                        <input
                                                            id="dinner"
                                                            name="mealType"
                                                            type="radio"
                                                            checked={mealType === 'dinner'}
                                                            onChange={() => setMealType('dinner')}
                                                            disabled={
                                                                currentSubscription?.plan?._id === selectedPlan._id &&
                                                                (currentSubscription?.mealType === 'dinner' || currentSubscription?.mealType === 'lunch' || currentSubscription?.mealType === 'both')
                                                            }
                                                            className="focus:ring-orange-500 h-4 w-4 text-orange-600 border-gray-300 disabled:opacity-50"
                                                        />
                                                        <label htmlFor="dinner" className={`ml-3 block text-sm font-medium ${currentSubscription?.plan?._id === selectedPlan._id && (currentSubscription?.mealType === 'dinner' || currentSubscription?.mealType === 'lunch' || currentSubscription?.mealType === 'both') ? 'text-gray-400' : 'text-gray-700'}`}>
                                                            Dinner Only - <span className="font-bold">₹{selectedPlan.price * MEAL_PRICE_MULTIPLIER.DINNER_ONLY}</span>
                                                        </label>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Address Input */}
                                            <div className="mb-4">
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Delivery Address</label>
                                                <div className="space-y-3">
                                                    <input
                                                        type="text"
                                                        placeholder="Street Address"
                                                        value={deliveryAddress.street}
                                                        onChange={(e) => setDeliveryAddress({ ...deliveryAddress, street: e.target.value })}
                                                        className="shadow-sm focus:ring-orange-500 focus:border-orange-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                                                    />
                                                    <div className="flex space-x-2">
                                                        <input
                                                            type="text"
                                                            placeholder="City"
                                                            value={deliveryAddress.city}
                                                            onChange={(e) => setDeliveryAddress({ ...deliveryAddress, city: e.target.value })}
                                                            className="shadow-sm focus:ring-orange-500 focus:border-orange-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                                                        />
                                                        <input
                                                            type="text"
                                                            placeholder="ZIP Code"
                                                            value={deliveryAddress.zip}
                                                            onChange={(e) => setDeliveryAddress({ ...deliveryAddress, zip: e.target.value })}
                                                            className="shadow-sm focus:ring-orange-500 focus:border-orange-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Price Breakdown */}
                                            <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                                                <h4 className="text-sm font-bold text-gray-900 mb-3">Price Breakdown</h4>
                                                <div className="space-y-2 text-sm">
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-600">New Plan Price</span>
                                                        <span className="font-medium text-gray-900">₹{(selectedPlan.price * MEAL_PRICE_MULTIPLIER[mealType.toUpperCase()]).toFixed(2)}</span>
                                                    </div>

                                                    {currentSubscription && (
                                                        <div className="flex justify-between text-green-600 font-medium">
                                                            <span>Upgrade Credit (Existing Plan)</span>
                                                            <span>- ₹{(() => {
                                                                if (currentSubscription.plan._id === selectedPlan._id) {
                                                                    return currentSubscription.amountPaid.toFixed(2);
                                                                }
                                                                const now = new Date();
                                                                const start = new Date(currentSubscription.startDate);
                                                                const end = new Date(currentSubscription.endDate);
                                                                const totalDays = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
                                                                const usedDays = Math.ceil((now - start) / (1000 * 60 * 60 * 24));
                                                                const remainingDays = Math.max(0, totalDays - usedDays);
                                                                return Math.floor((currentSubscription.amountPaid / totalDays) * remainingDays).toFixed(2);
                                                            })()}</span>
                                                        </div>
                                                    )}

                                                    <div className="pt-2 border-t border-gray-300 flex justify-between text-base font-bold text-orange-600">
                                                        <span>Amount to Pay</span>
                                                        <span>₹{(() => {
                                                            const newPrice = selectedPlan.price * MEAL_PRICE_MULTIPLIER[mealType.toUpperCase()];
                                                            if (!currentSubscription) return newPrice.toFixed(2);

                                                            let credit = 0;
                                                            if (currentSubscription.plan._id === selectedPlan._id) {
                                                                credit = currentSubscription.amountPaid;
                                                            } else {
                                                                const now = new Date();
                                                                const start = new Date(currentSubscription.startDate);
                                                                const end = new Date(currentSubscription.endDate);
                                                                const totalDays = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
                                                                const usedDays = Math.ceil((now - start) / (1000 * 60 * 60 * 24));
                                                                const remainingDays = Math.max(0, totalDays - usedDays);
                                                                credit = Math.floor((currentSubscription.amountPaid / totalDays) * remainingDays);
                                                            }

                                                            return Math.max(0, newPrice - credit).toFixed(2);
                                                        })()}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-white px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={handleConfirmSubscribe}
                                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-6 py-2 bg-orange-600 text-base font-medium text-white hover:bg-orange-700 transition-colors sm:ml-3 sm:w-auto sm:text-sm"
                                >
                                    Confirm & Pay
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSelectedPlan(null)}
                                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Plans;
