import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Calendar, AlertCircle, RefreshCw, TrendingUp, X, Info } from 'lucide-react';
import AuthContext from '../context/AuthContext';
import NotificationContext from '../context/NotificationContext';
import AddressSelector from '../components/AddressSelector';
import Modal from '../components/Modal';
import SubscriptionPrice from '../components/SubscriptionPrice';
import useRazorpay from '../hooks/useRazorpay';

const MySubscription = () => {
    const { user } = useContext(AuthContext);
    const { showNotification } = useContext(NotificationContext);
    const navigate = useNavigate();

    const [subscription, setSubscription] = useState(null);
    const [loading, setLoading] = useState(true);
    const [availableUpgrades, setAvailableUpgrades] = useState([]);
    const [processingRenew, setProcessingRenew] = useState(false);
    const [processingUpgrade, setProcessingUpgrade] = useState(false);
    const [selectedUpgradePlan, setSelectedUpgradePlan] = useState(null);
    const [upgradeMealType, setUpgradeMealType] = useState('both');
    const [upgradeDeliveryAddress, setUpgradeDeliveryAddress] = useState({
        street: '',
        city: '',
        zip: '',
        country: 'India'
    });

    const { initPayment, loading: paymentLoading } = useRazorpay();

    useEffect(() => {
        if (!user) {
            navigate('/login');
            return;
        }
        fetchSubscriptionData();
    }, [user]);

    const fetchSubscriptionData = async () => {
        setLoading(true);
        try {
            const config = {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
            };

            // Fetch current subscription
            const subRes = await axios.get('http://localhost:5000/api/subscriptions/me', config);
            setSubscription(subRes.data);

            // Fetch available upgrades
            const upgradeRes = await axios.get('http://localhost:5000/api/subscriptions/available-upgrades', config);
            setAvailableUpgrades(upgradeRes.data.availableUpgrades || []);

        } catch (error) {
            if (error.response?.status === 404) {
                setSubscription(null);
                showNotification('You do not have an active subscription', 'info');
            } else {
                console.error('Error fetching subscription:', error);
                showNotification('Failed to load subscription data', 'error');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleRenew = async () => {
        if (!subscription) return;

        setProcessingRenew(true);
        try {
            const config = {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
            };

            const { data: orderData } = await axios.post(
                'http://localhost:5000/api/subscriptions/renew-init',
                { subscriptionId: subscription._id },
                config
            );

            await initPayment({
                amount: orderData.amount,
                currency: orderData.currency,
                orderId: orderData.orderId,
                user: user,
                description: `Renew ${subscription.plan.name}`,
                verifyUrl: 'http://localhost:5000/api/subscriptions/renew-verify',
                metadata: {
                    subscriptionId: orderData.subscriptionId,
                },
                showNotification,
                onSuccess: (data) => {
                    showNotification('Subscription renewed successfully!', 'success');
                    fetchSubscriptionData();
                },
                onError: (err) => {
                    showNotification('Renewal failed. Please contact support.', 'error');
                }
            });

        } catch (error) {
            console.error('Error initiating renewal:', error);
            showNotification('Failed to initiate renewal', 'error');
        } finally {
            setProcessingRenew(false);
        }
    };

    const handleInitiateUpgrade = (plan) => {
        setSelectedUpgradePlan(plan);
        setUpgradeMealType('both');
        // Pre-fill address from current subscription if available
        if (subscription && subscription.deliveryAddress) {
            setUpgradeDeliveryAddress({
                street: subscription.deliveryAddress.street || '',
                city: subscription.deliveryAddress.city || '',
                zip: subscription.deliveryAddress.zip || '',
                country: subscription.deliveryAddress.country || 'India'
            });
        } else {
            setUpgradeDeliveryAddress({ street: '', city: '', zip: '', country: 'India' });
        }
    };

    const handleConfirmUpgrade = async () => {
        if (!selectedUpgradePlan) return;

        if (!upgradeDeliveryAddress.street || !upgradeDeliveryAddress.city || !upgradeDeliveryAddress.zip) {
            showNotification('Please fill in all address fields.', 'error');
            return;
        }

        setProcessingUpgrade(true);
        try {
            const config = {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
            };

            const { data: orderData } = await axios.post(
                'http://localhost:5000/api/subscriptions/upgrade-init',
                {
                    newPlanId: selectedUpgradePlan._id,
                    newMealType: upgradeMealType,
                    newDeliveryAddress: upgradeDeliveryAddress
                },
                config
            );

            await initPayment({
                amount: orderData.amount,
                currency: orderData.currency,
                orderId: orderData.orderId,
                user: user,
                description: `Upgrade to ${selectedUpgradePlan.name}`,
                verifyUrl: 'http://localhost:5000/api/subscriptions/upgrade-verify',
                metadata: {
                    currentSubscriptionId: orderData.currentSubscriptionId,
                    newPlanId: orderData.newPlanId,
                    newMealType: upgradeMealType,
                    newDeliveryAddress: upgradeDeliveryAddress
                },
                showNotification,
                onSuccess: (data) => {
                    showNotification('Subscription upgraded successfully!', 'success');
                    fetchSubscriptionData();
                    setSelectedUpgradePlan(null);
                },
                onError: (err) => {
                    showNotification('Upgrade failed. Please contact support.', 'error');
                }
            });

        } catch (error) {
            console.error('Error initiating upgrade:', error);
            showNotification(error.response?.data?.message || 'Failed to initiate upgrade', 'error');
        } finally {
            setProcessingUpgrade(false);
        }
    };

    const handleCancel = async () => {
        if (!subscription) return;

        if (!window.confirm('Are you sure you want to cancel your subscription? This action cannot be undone.')) {
            return;
        }

        try {
            const config = {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
            };

            await axios.post(
                'http://localhost:5000/api/subscriptions/cancel',
                { subscriptionId: subscription._id },
                config
            );

            showNotification('Subscription cancelled successfully', 'success');
            fetchSubscriptionData();
        } catch (error) {
            console.error('Error cancelling subscription:', error);
            showNotification('Failed to cancel subscription', 'error');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
                    <p className="mt-4 text-gray-500">Loading subscription...</p>
                </div>
            </div>
        );
    }

    if (!subscription) {
        return (
            <div className="min-h-screen bg-gray-50 py-12">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center">
                        <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-lg font-medium text-gray-900">No Active Subscription</h3>
                        <p className="mt-1 text-sm text-gray-500">You don't have an active subscription yet.</p>
                        <div className="mt-6">
                            <button
                                onClick={() => navigate('/plans')}
                                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700"
                            >
                                Browse Plans
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-12 relative">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <h2 className="text-3xl font-extrabold text-gray-900 mb-8">My Subscription</h2>

                {/* Current Subscription Card */}
                <div className="bg-white shadow-lg rounded-lg overflow-hidden mb-8">
                    <div className="bg-gradient-to-r from-orange-500 to-red-600 px-6 py-4">
                        <div className="flex justify-between items-center">
                            <h3 className="text-2xl font-bold text-white">
                                {subscription.plan?.name || 'Unknown'} Plan ({subscription.plan?.duration || 'N/A'})
                            </h3>
                            <span className="bg-white text-orange-600 px-3 py-1 rounded-full text-sm font-bold shadow-sm">
                                {subscription.mealType === 'both' ? 'Lunch + Dinner' :
                                    subscription.mealType === 'lunch' ? 'Lunch Only' : 'Dinner Only'}
                            </span>
                        </div>
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium mt-2 ${subscription.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                            {subscription.status}
                        </span>
                    </div>

                    <div className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                            <div>
                                <p className="text-sm text-gray-500 flex items-center">
                                    <Calendar className="h-4 w-4 mr-1" /> Start Date
                                </p>
                                <p className="text-lg font-semibold text-gray-900">
                                    {new Date(subscription.startDate).toLocaleDateString('en-US', {
                                        weekday: 'long', month: 'short', day: 'numeric', year: 'numeric'
                                    })}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 flex items-center">
                                    <Calendar className="h-4 w-4 mr-1" /> Expiry Date
                                </p>
                                <p className="text-lg font-semibold text-gray-900">
                                    {new Date(subscription.endDate).toLocaleDateString('en-US', {
                                        weekday: 'long', month: 'short', day: 'numeric', year: 'numeric'
                                    })}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Price Paid</p>
                                <p className="text-lg font-semibold text-gray-900">₹{subscription.amountPaid}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Delivery Address</p>
                                <p className="text-sm font-medium text-gray-900">
                                    {subscription.deliveryAddress ?
                                        `${subscription.deliveryAddress.street}, ${subscription.deliveryAddress.city}, ${subscription.deliveryAddress.zip}` :
                                        'Not provided'}
                                </p>
                            </div>
                        </div>

                        {subscription.status === 'Active' ? (
                            <div className="space-y-6">
                                {/* Manage Meal Options */}
                                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                                    <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center">
                                        Manage Meal Option (Partial Cancellation)
                                    </h4>
                                    <div className="flex flex-wrap gap-2">
                                        {['both', 'lunch', 'dinner'].map((type) => (
                                            <button
                                                key={type}
                                                disabled={subscription.mealType === type}
                                                onClick={async () => {
                                                    if (type === 'both' && subscription.mealType !== 'both') {
                                                        showNotification('Upgrading to both meals requires additional payment. Please use the upgrade section below.', 'info');
                                                        return;
                                                    }

                                                    const isDowngrade = subscription.mealType === 'both' && type !== 'both';
                                                    const confirmMessage = isDowngrade
                                                        ? `Are you sure you want to switch to ${type.toUpperCase()} only? No refund will be given for the removed meal portion.`
                                                        : `Are you sure you want to switch your subscription meal timing to ${type.toUpperCase()}?`;

                                                    if (!window.confirm(confirmMessage)) return;

                                                    try {
                                                        const config = {
                                                            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
                                                        };
                                                        await axios.put('http://localhost:5000/api/subscriptions/change-meal-type', { mealType: type }, config);
                                                        showNotification(`Switched to ${type.toUpperCase()} meals.`, 'success');
                                                        fetchSubscriptionData();
                                                    } catch (err) {
                                                        showNotification('Failed to update meal type', 'error');
                                                    }
                                                }}
                                                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${subscription.mealType === type
                                                    ? 'bg-orange-600 text-white cursor-default'
                                                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                                                    }`}
                                            >
                                                {type === 'both' ? 'Both Meals' : type.charAt(0).toUpperCase() + type.slice(1) + ' Only'}
                                            </button>
                                        ))}
                                    </div>
                                    <p className="mt-2 text-xs text-gray-500 italic">
                                        * You can switch to a single meal option at any time, but no refund is provided for the removed meal portion.
                                    </p>
                                </div>

                                <div className="flex flex-wrap gap-3">
                                    <button
                                        onClick={handleRenew}
                                        disabled={processingRenew}
                                        className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                                    >
                                        <RefreshCw className="h-4 w-4 mr-2" />
                                        {processingRenew ? 'Processing...' : 'Renew Subscription'}
                                    </button>
                                    <button
                                        onClick={handleCancel}
                                        className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50"
                                    >
                                        <X className="h-4 w-4 mr-2" />
                                        Cancel Subscription
                                    </button>
                                </div>
                            </div>
                        ) : null}
                    </div>
                </div>

                {/* No Refund Warning */}
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-8">
                    <div className="flex">
                        <AlertCircle className="h-5 w-5 text-yellow-400" />
                        <div className="ml-3">
                            <p className="text-sm text-yellow-700 font-medium">
                                No refunds available on subscription purchases or upgrades.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Available Upgrades */}
                {availableUpgrades.length > 0 && subscription.status === 'Active' && (
                    <div>
                        <h3 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
                            <TrendingUp className="h-6 w-6 mr-2 text-orange-600" />
                            Available Upgrades
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {availableUpgrades.map((plan) => (
                                <div key={plan._id} className="bg-white shadow-md rounded-lg overflow-hidden border-2 border-gray-200 hover:border-orange-500 transition-colors">
                                    <div className="p-6">
                                        <h4 className="text-xl font-bold text-gray-900 mb-2">
                                            {plan.name} Plan
                                        </h4>
                                        <p className="text-sm text-gray-600 mb-4 capitalize">{plan.duration}</p>

                                        <div className="mb-4">
                                            <p className="text-sm text-gray-500">Base Price: ₹{plan.price}</p>
                                            <p className="text-xs text-gray-500 mt-1">Select meal options to see final upgrade price</p>
                                        </div>

                                        <button
                                            onClick={() => handleInitiateUpgrade(plan)}
                                            disabled={processingUpgrade}
                                            className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 disabled:opacity-50"
                                        >
                                            <TrendingUp className="h-4 w-4 mr-2" />
                                            {processingUpgrade ? 'Processing...' : 'Upgrade Now'}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Upgrade Modal */}
            <Modal
                isOpen={!!selectedUpgradePlan}
                onClose={() => setSelectedUpgradePlan(null)}
                title="Customize Upgrade"
                maxWidth="sm:max-w-xl"
            >
                <div>
                    <p className="text-sm text-gray-500 mb-6 flex items-center bg-gray-50 p-3 rounded-xl border border-gray-100">
                        <Info className="w-4 h-4 mr-2 text-orange-500" />
                        Upgrade to: <span className="font-black text-gray-900 ml-1">{selectedUpgradePlan?.name} ({selectedUpgradePlan?.duration})</span>
                    </p>

                    {/* Meal Type Selection */}
                    <div className="mb-8">
                        <label className="block text-xs font-black text-gray-400 mb-4 uppercase tracking-widest">Select Meal Option</label>
                        <div className="grid grid-cols-1 gap-3">
                            {[
                                { id: 'both', label: 'Both (Lunch + Dinner)', price: selectedUpgradePlan?.price },
                                { id: 'lunch', label: 'Lunch Only', price: selectedUpgradePlan?.price * 0.5 },
                                { id: 'dinner', label: 'Dinner Only', price: selectedUpgradePlan?.price * 0.5 }
                            ].map((opt) => {
                                const isDisabled = subscription.plan._id === selectedUpgradePlan?._id &&
                                    (subscription.mealType === opt.id || (subscription.mealType === 'both' && opt.id !== 'both') || (opt.id !== 'both' && subscription.mealType && subscription.mealType !== opt.id));

                                return (
                                    <div
                                        key={opt.id}
                                        onClick={() => !isDisabled && setUpgradeMealType(opt.id)}
                                        className={`relative flex flex-col p-5 border-2 rounded-2xl cursor-pointer transition-all duration-300 ${upgradeMealType === opt.id
                                            ? 'border-orange-500 bg-orange-50/50 shadow-md ring-1 ring-orange-500'
                                            : 'border-gray-100 hover:border-gray-200 bg-white'
                                            } ${isDisabled ? 'opacity-40 cursor-not-allowed grayscale' : ''}`}
                                    >
                                        <div className="flex justify-between items-center mb-1">
                                            <span className={`text-sm font-black ${upgradeMealType === opt.id ? 'text-orange-900' : 'text-gray-900'}`}>{opt.label}</span>
                                            <span className="text-sm font-black text-gray-900">₹{opt.price?.toFixed(0)}</span>
                                        </div>
                                        {upgradeMealType === opt.id && (
                                            <div className="absolute -top-1.5 -right-1.5 bg-orange-600 text-white rounded-full p-1 shadow-lg transform scale-110">
                                                <CheckCircle className="w-3.5 h-3.5" />
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Address Input */}
                    <div className="mb-4">
                        <AddressSelector
                            user={user}
                            selectedAddress={upgradeDeliveryAddress}
                            onAddressChange={setUpgradeDeliveryAddress}
                        />
                    </div>

                    {/* Price Summary Component */}
                    {selectedUpgradePlan && (
                        <SubscriptionPrice
                            selectedPlan={selectedUpgradePlan}
                            currentSubscription={subscription}
                            mealType={upgradeMealType}
                        />
                    )}

                    <div className="mt-8">
                        <button
                            type="button"
                            onClick={handleConfirmUpgrade}
                            disabled={paymentLoading || processingUpgrade}
                            className={`w-full inline-flex justify-center items-center rounded-2xl border border-transparent shadow-xl px-8 py-4 bg-gradient-to-r from-orange-500 to-orange-600 text-sm font-black text-white hover:from-orange-600 hover:to-orange-700 transition-all duration-300 transform active:scale-95 disabled:opacity-50`}
                        >
                            {paymentLoading || processingUpgrade ? 'Processing...' : 'Proceed to Payment'}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default MySubscription;
