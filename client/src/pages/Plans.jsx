import React, { useEffect, useState, useContext } from 'react';
import axios from 'axios';
import { Check, AlertCircle, MapPin, CheckCircle, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import NotificationContext from '../context/NotificationContext';
import { canUpgradeToPlan, MEAL_PRICE_MULTIPLIER } from '../utils/orderUtils';
import AddressSelector from '../components/AddressSelector';
import Modal from '../components/Modal';
import SubscriptionPrice from '../components/SubscriptionPrice';
import useRazorpay from '../hooks/useRazorpay';

const Plans = () => {
    const { initPayment, loading: paymentLoading } = useRazorpay();

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

            // 1. Initiate Subscription
            const { data: orderData } = await axios.post(
                'http://localhost:5000/api/subscriptions/subscribe-init',
                {
                    planId: selectedPlan._id,
                    mealType,
                    deliveryAddress
                },
                config
            );

            // 2. Process Payment using Hook
            await initPayment({
                amount: orderData.amount,
                currency: orderData.currency,
                orderId: orderData.orderId,
                user: user,
                description: `Subscribe to ${selectedPlan.name} (${selectedPlan.duration})`,
                verifyUrl: 'http://localhost:5000/api/subscriptions/subscribe-verify',
                metadata: {
                    planId: selectedPlan._id,
                    mealType,
                    deliveryAddress
                },
                showNotification,
                onSuccess: (data) => {
                    showNotification('Subscription successful! Redirecting...', 'success');
                    navigate('/my-subscription');
                },
                onError: (err) => {
                    // Error already handled by hook notification
                }
            });

            setSelectedPlan(null);
        } catch (error) {
            console.error('Error initiating subscription:', error);
            showNotification(error.response?.data?.message || 'Failed to initiate subscription', 'error');
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
        const isCurrent = currentSubscription && currentSubscription.plan._id === plan._id;
        const isSelected = selectedPlan && selectedPlan._id === plan._id;

        return (
            <div key={plan._id} className={`relative border rounded-2xl shadow-sm divide-y divide-gray-200 bg-white flex flex-col hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 ${isCurrent ? 'ring-2 ring-orange-500 border-orange-500' : isSelected ? 'ring-2 ring-blue-500 border-blue-500 scale-105' : 'border-gray-200'}`}>
                <div className="p-8">
                    {isCurrent && (
                        <div className="absolute top-0 right-0 transform translate-x-2 -translate-y-2">
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-orange-600 text-white shadow-lg">
                                <Check className="w-3 h-3 mr-1" /> ACTIVE
                            </span>
                        </div>
                    )}
                    <h3 className="text-xl leading-8 font-black text-gray-900">{plan.name}</h3>
                    <p className="mt-4 text-sm text-gray-500 leading-relaxed h-10">{plan.description}</p>
                    <p className="mt-8 flex items-baseline">
                        <span className="text-5xl font-black text-gray-900">₹{plan.price}</span>
                        <span className="text-base font-bold text-gray-600 ml-1">/{plan.duration}</span>
                    </p>
                    <button
                        type="button"
                        onClick={() => handleInitiateSubscribe(plan)}
                        disabled={isCurrent && currentSubscription?.mealType === 'both'}
                        className={`mt-8 block w-full border border-transparent rounded-xl py-3 text-sm font-black text-white text-center transition-all duration-300 shadow-md transform active:scale-95 ${isCurrent && currentSubscription?.mealType === 'both'
                            ? 'bg-gray-300 cursor-not-allowed shadow-none'
                            : isCurrent
                                ? 'bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700'
                                : 'bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 hover:shadow-orange-200/50'
                            }`}
                    >
                        {isCurrent
                            ? (currentSubscription?.mealType === 'both' ? 'Fully Subscribed' : 'Upgrade Meal Type')
                            : 'Choose Plan'}
                    </button>
                    {isCurrent && currentSubscription?.mealType !== 'both' && (
                        <p className="mt-2 text-center text-[10px] font-bold text-teal-600 uppercase tracking-wider">
                            Currently: {currentSubscription.mealType} only
                        </p>
                    )}
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
            <Modal
                isOpen={!!selectedPlan}
                onClose={() => setSelectedPlan(null)}
                title="Customize Your Subscription"
                maxWidth="sm:max-w-xl"
            >
                <div>
                    <p className="text-sm text-gray-500 mb-6 flex items-center bg-gray-50 p-3 rounded-xl border border-gray-100">
                        <Info className="w-4 h-4 mr-2 text-orange-500" />
                        Selected Plan: <span className="font-black text-gray-900 ml-1">{selectedPlan?.name} ({selectedPlan?.duration})</span>
                    </p>

                    {/* Meal Type Selection */}
                    <div className="mb-8">
                        <label className="block text-xs font-black text-gray-400 mb-4 uppercase tracking-widest">Select Meal Option</label>
                        <div className="grid grid-cols-1 gap-3">
                            {[
                                { id: 'both', label: 'Lunch + Dinner', multiplier: MEAL_PRICE_MULTIPLIER.BOTH, desc: 'Complete daily nutrition' },
                                { id: 'lunch', label: 'Lunch Only', multiplier: MEAL_PRICE_MULTIPLIER.LUNCH_ONLY, desc: 'Mid-day healthy meal' },
                                { id: 'dinner', label: 'Dinner Only', multiplier: MEAL_PRICE_MULTIPLIER.DINNER_ONLY, desc: 'Light evening meal' }
                            ].map((opt) => {
                                const isCurrentlyActive = currentSubscription?.plan?._id === selectedPlan?._id && currentSubscription?.mealType === opt.id;
                                const canSelect = !isCurrentlyActive && (currentSubscription?.plan?._id !== selectedPlan?._id || opt.id === 'both');

                                return (
                                    <div
                                        key={opt.id}
                                        onClick={() => canSelect && setMealType(opt.id)}
                                        className={`relative flex flex-col p-5 border-2 rounded-2xl cursor-pointer transition-all duration-300 ${mealType === opt.id
                                            ? 'border-orange-500 bg-orange-50/50 shadow-md ring-1 ring-orange-500'
                                            : 'border-gray-100 hover:border-gray-200 bg-white'
                                            } ${!canSelect ? 'opacity-40 cursor-not-allowed grayscale' : ''}`}
                                    >
                                        <div className="flex justify-between items-center mb-1">
                                            <span className={`text-sm font-black ${mealType === opt.id ? 'text-orange-900' : 'text-gray-900'}`}>{opt.label}</span>
                                            {isCurrentlyActive && <span className="text-[10px] font-black text-teal-600 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">ACTIVE</span>}
                                            {!isCurrentlyActive && <span className="text-sm font-black text-gray-900">₹{(selectedPlan?.price * opt.multiplier).toFixed(0)}</span>}
                                        </div>
                                        <span className="text-[11px] text-gray-500 font-medium">{opt.desc}</span>
                                        {mealType === opt.id && (
                                            <div className="absolute -top-1.5 -right-1.5 bg-orange-600 text-white rounded-full p-1 shadow-lg transform scale-110">
                                                <CheckCircle className="w-3.5 h-3.5" />
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Address Selection */}
                    <div className="mb-4">
                        <AddressSelector
                            user={user}
                            selectedAddress={deliveryAddress}
                            onAddressChange={setDeliveryAddress}
                        />
                    </div>

                    {/* Unified Price Component */}
                    {selectedPlan && (
                        <SubscriptionPrice
                            selectedPlan={selectedPlan}
                            currentSubscription={currentSubscription}
                            mealType={mealType}
                            MEAL_PRICE_MULTIPLIER={MEAL_PRICE_MULTIPLIER}
                        />
                    )}

                    <div className="mt-8 flex flex-col sm:flex-row gap-3">
                        <button
                            type="button"
                            onClick={handleConfirmSubscribe}
                            disabled={paymentLoading}
                            className={`flex-1 inline-flex justify-center items-center rounded-2xl border border-transparent shadow-xl px-8 py-4 bg-gradient-to-r from-orange-500 to-orange-600 text-sm font-black text-white hover:from-orange-600 hover:to-orange-700 transition-all duration-300 transform active:scale-95 disabled:opacity-50`}
                        >
                            {paymentLoading ? 'Initializing Secure Payment...' : 'Confirm & Pay Now'}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default Plans;
