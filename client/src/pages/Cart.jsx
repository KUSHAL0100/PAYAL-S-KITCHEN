import React, { useContext, useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import CartContext from '../context/CartContext';
import AuthContext from '../context/AuthContext';
import NotificationContext from '../context/NotificationContext';
import axios from 'axios';
import { Trash2, Plus, Minus, Tag, X, MapPin, CheckCircle } from 'lucide-react';
import AddressSelector from '../components/AddressSelector';
import useRazorpay from '../hooks/useRazorpay';

const Cart = () => {
    const { cartItems, removeFromCart, updateQuantity, getCartTotal, clearCart } = useContext(CartContext);
    const { user } = useContext(AuthContext);
    const { showNotification } = useContext(NotificationContext);
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const { initPayment, loading: paymentLoading } = useRazorpay();

    // Coupon State
    const [couponCode, setCouponCode] = useState('');
    const [appliedCoupon, setAppliedCoupon] = useState(null);
    const [availableCoupons, setAvailableCoupons] = useState([]);
    const [couponError, setCouponError] = useState('');
    const [couponSuccess, setCouponSuccess] = useState('');

    const [deliveryAddress, setDeliveryAddress] = useState({
        street: '',
        city: '',
        zip: ''
    });

    useEffect(() => {
        // Fetch active coupons
        fetchCoupons();
    }, []);

    useEffect(() => {
        if (user && user.addresses && user.addresses.length > 0) {
            setDeliveryAddress(user.addresses[0]);
        }
    }, [user]);

    const fetchCoupons = async () => {
        try {
            const config = {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                },
            };
            const { data } = await axios.get('http://127.0.0.1:5000/api/coupons/active', config);
            setAvailableCoupons(data);
        } catch (error) {
            console.error('Error fetching coupons:', error);
        }
    };

    const handleApplyCoupon = async () => {
        if (!couponCode.trim()) return;
        setCouponError('');
        setCouponSuccess('');

        try {
            const config = {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                },
            };
            const { data } = await axios.post(
                'http://127.0.0.1:5000/api/coupons/validate',
                { code: couponCode },
                config
            );

            setAppliedCoupon(data);
            setCouponSuccess(`Coupon '${data.code}' applied! You save ${data.discountPercentage}%`);
            setCouponCode('');
        } catch (error) {
            setCouponError(error.response?.data?.message || 'Invalid coupon');
            setAppliedCoupon(null);
        }
    };

    const handleRemoveCoupon = () => {
        setAppliedCoupon(null);
        setCouponSuccess('');
        setCouponError('');
        setCouponCode('');
    };



    // Calculate order summary values using useMemo for better performance
    const orderSummary = useMemo(() => {
        const foodSubtotal = getCartTotal();

        // Specific category logic
        const hasTiffin = cartItems.some(item => item.type === 'single_tiffin');
        const hasEvent = cartItems.some(item => item.type === 'event');

        // Tiffin Delivery Logic: ₹100 if subtotal <= 1000
        const tiffinSubtotal = cartItems
            .filter(item => item.type === 'single_tiffin')
            .reduce((sum, item) => sum + (item.totalAmount || 0), 0);
        const tiffinFee = hasTiffin && tiffinSubtotal <= 1000 ? 100 : 0;

        // Event Delivery Logic: ₹200 if guests <= 30
        const totalGuests = cartItems
            .filter(item => item.type === 'event')
            .reduce((sum, item) => sum + (item.guestCount || 0), 0);
        const eventFee = hasEvent && totalGuests <= 30 ? 200 : 0;

        const totalDeliveryFee = tiffinFee + eventFee;

        // Discount strictly on food only
        const discount = appliedCoupon
            ? Math.round((foodSubtotal * appliedCoupon.discountPercentage) / 100)
            : 0;

        const finalTotal = foodSubtotal - discount + totalDeliveryFee;

        return {
            price: foodSubtotal,
            discountAmount: discount,
            tiffinFee,
            eventFee,
            deliveryFee: totalDeliveryFee,
            finalTotal: finalTotal
        };
    }, [cartItems, appliedCoupon, getCartTotal]);


    const handleCheckout = async () => {
        if (!user) {
            navigate('/login');
            return;
        }

        if (!deliveryAddress.street || !deliveryAddress.city || !deliveryAddress.zip) {
            setError('Please provide a complete delivery address.');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const { price, discountAmount, deliveryFee, finalTotal } = orderSummary;

            // 1. Create Razorpay Order Context
            const config = {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                },
            };

            const { data: orderData } = await axios.post(
                'http://127.0.0.1:5000/api/orders/razorpay',
                { amount: finalTotal },
                config
            );

            const hasEvent = cartItems.some(item => item.type === 'event');
            const orderType = hasEvent ? 'event' : 'single';

            // 2. Process Payment using Hook
            await initPayment({
                amount: orderData.amount,
                currency: orderData.currency,
                orderId: orderData.id,
                user: user,
                description: "Meal Order Payment",
                verifyUrl: 'http://127.0.0.1:5000/api/orders/verify',
                metadata: { deliveryAddress, type: orderType },
                showNotification,
                onSuccess: async (verificationData, razorpayRawResponse) => {
                    // The hook handles verification POST to /api/orders/verify
                    // Note: verificationData is from backend, razorpayRawResponse is from SDK (has payment_id)

                    const dbOrderItems = cartItems.map(item => {
                        if (item.type === 'event') {
                            return {
                                name: 'Event Catering',
                                quantity: item.guestCount,
                                selectedItems: { name: item.items.map(i => i.name).join(', ') }
                            };
                        } else {
                            return {
                                name: item.name,
                                quantity: item.quantity,
                                selectedItems: { name: (item.menuItems || []).join(', ') }
                            };
                        }
                    });

                    let deliveryDate = new Date();
                    const itemWithDate = cartItems.find(item => item.deliveryDate);
                    if (itemWithDate) {
                        deliveryDate = new Date(itemWithDate.deliveryDate);
                    } else {
                        deliveryDate.setDate(deliveryDate.getDate() + 1);
                    }

                    const finalOrderData = {
                        items: dbOrderItems,
                        price: price,
                        totalAmount: finalTotal,
                        type: orderType,
                        deliveryDate: deliveryDate,
                        deliveryAddress: deliveryAddress,
                        paymentId: razorpayRawResponse.razorpay_payment_id,
                        paymentStatus: 'Paid',
                        discountAmount: discountAmount,
                        couponCode: appliedCoupon ? appliedCoupon.code : null
                    };

                    await axios.post('http://127.0.0.1:5000/api/orders', finalOrderData, config);

                    clearCart();
                    showNotification('Order placed successfully!', 'success');
                    navigate('/orders');
                },
                onError: (err) => {
                    setError('Payment failed. Please try again.');
                }
            });

        } catch (err) {
            console.error('Checkout error:', err);
            setError(err.response?.data?.message || 'Checkout failed');
        } finally {
            setLoading(false);
        }
    };

    if (cartItems.length === 0) {
        return (
            <div className="text-center py-20">
                <h2 className="text-2xl font-bold text-gray-900">Your cart is empty</h2>
                <p className="mt-4 text-gray-500">Add some delicious meals to get started.</p>
            </div>
        );
    }

    return (
        <div className="bg-white py-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <h2 className="text-3xl font-extrabold text-gray-900 mb-8">Shopping Cart</h2>

                {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}

                <div className="flex flex-col lg:flex-row gap-12">
                    <div className="lg:w-2/3">
                        <div className="bg-white shadow overflow-hidden sm:rounded-lg border border-gray-200 mb-6">
                            <ul className="divide-y divide-gray-200">
                                {cartItems.map((item, index) => (
                                    <li key={index} className="p-6 flex items-center justify-between">
                                        <div className="flex items-center w-full">
                                            <div className="ml-4 flex-1">
                                                {item.type === 'event' ? (
                                                    <div>
                                                        <h3 className="text-lg font-medium text-gray-900">Event Catering</h3>
                                                        <p className="text-sm text-gray-500">Guests: {item.guestCount}</p>
                                                        <p className="text-sm text-gray-500">
                                                            Menu: {item.items.map(i => i.name).join(', ')}
                                                        </p>
                                                        <p className="text-gray-900 font-semibold mt-1">₹{item.totalAmount}</p>
                                                    </div>
                                                ) : item.type === 'single_tiffin' ? (
                                                    <div>
                                                        <h3 className="text-lg font-medium text-gray-900">{item.name}</h3>
                                                        <p className="text-sm text-gray-500">Plan: {item.planType} | Meal: {item.mealTime}</p>
                                                        <p className="text-sm text-gray-500">Quantity: {item.quantity}</p>
                                                        <p className="text-sm text-gray-500">
                                                            Menu: {item.menuItems.join(', ')}
                                                        </p>
                                                        <p className="text-gray-900 font-semibold mt-1">₹{item.totalAmount}</p>
                                                    </div>
                                                ) : (
                                                    <div>
                                                        <h3 className="text-lg font-medium text-gray-900">{item.name}</h3>
                                                        <p className="text-gray-500">₹{item.price}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Quantity Controls (Only for non-event/non-single-tiffin items for now) */}
                                        {item.type !== 'event' && item.type !== 'single_tiffin' && (
                                            <div className="flex items-center space-x-4">
                                                <div className="flex items-center border border-gray-300 rounded-md">
                                                    <button
                                                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                                        className="p-2 hover:bg-gray-100"
                                                    >
                                                        <Minus className="h-4 w-4" />
                                                    </button>
                                                    <span className="px-4 py-2 text-gray-900">{item.quantity}</span>
                                                    <button
                                                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                                        className="p-2 hover:bg-gray-100"
                                                    >
                                                        <Plus className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        <button
                                            onClick={() => removeFromCart(item.id || index)}
                                            className="ml-4 text-red-600 hover:text-red-800"
                                        >
                                            <Trash2 className="h-5 w-5" />
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Available Coupons Section */}
                        {availableCoupons.length > 0 && (
                            <div className="bg-white shadow sm:rounded-lg border border-gray-200 p-6 mb-6">
                                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                                    <Tag className="h-5 w-5 mr-2 text-orange-600" />
                                    Available Coupons
                                </h3>
                                <div className="grid gap-4 sm:grid-cols-2">
                                    {availableCoupons.map((coupon) => (
                                        <div
                                            key={coupon._id}
                                            className="border border-dashed border-orange-300 bg-orange-50 rounded-lg p-4 cursor-pointer hover:bg-orange-100 transition-colors"
                                            onClick={() => setCouponCode(coupon.code)}
                                        >
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <span className="font-bold text-orange-700">{coupon.code}</span>
                                                    <p className="text-sm text-gray-600 mt-1">{coupon.description || `${coupon.discountPercentage}% Off`}</p>
                                                </div>
                                                <span className="bg-white text-orange-600 text-xs font-bold px-2 py-1 rounded border border-orange-200">
                                                    {coupon.discountPercentage}%
                                                </span>
                                            </div>
                                            <p className="text-xs text-gray-500 mt-2">Expires: {new Date(coupon.expiryDate).toLocaleDateString()}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="lg:w-1/3">
                        <div className="bg-gray-50 p-6 rounded-lg shadow-sm border border-gray-200">
                            <h3 className="text-lg font-medium text-gray-900 mb-4">Order Summary</h3>

                            {/* Delivery Address Section */}
                            <div className="mb-6 border-b border-gray-200 pb-6">
                                <AddressSelector
                                    user={user}
                                    selectedAddress={deliveryAddress}
                                    onAddressChange={setDeliveryAddress}
                                />
                            </div>

                            {/* Coupon Input */}
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Have a coupon?</label>
                                <div className="flex space-x-2">
                                    <input
                                        type="text"
                                        value={couponCode}
                                        onChange={(e) => setCouponCode(e.target.value)}
                                        placeholder="Enter code"
                                        className="flex-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                                        disabled={!!appliedCoupon}
                                    />
                                    {appliedCoupon ? (
                                        <button
                                            onClick={handleRemoveCoupon}
                                            className="bg-red-100 text-red-700 px-3 py-2 rounded-md hover:bg-red-200"
                                        >
                                            <X className="h-5 w-5" />
                                        </button>
                                    ) : (
                                        <button
                                            onClick={handleApplyCoupon}
                                            className="bg-gray-800 text-white px-4 py-2 rounded-md hover:bg-gray-700 text-sm font-medium"
                                        >
                                            Apply
                                        </button>
                                    )}
                                </div>
                                {couponError && <p className="mt-2 text-sm text-red-600">{couponError}</p>}
                                {couponSuccess && <p className="mt-2 text-sm text-green-600">{couponSuccess}</p>}
                            </div>


                            <div className="flex justify-between mb-2">
                                <span className="text-gray-600">Food Subtotal</span>
                                <span className="font-medium text-gray-900">₹{orderSummary.price}</span>
                            </div>
                            {orderSummary.discountAmount > 0 && (
                                <div className="flex justify-between mb-2 text-green-600 font-bold">
                                    <span>Discount ({appliedCoupon.code})</span>
                                    <span>-₹{orderSummary.discountAmount}</span>
                                </div>
                            )}
                            {orderSummary.tiffinFee > 0 && (
                                <div className="flex justify-between mb-2">
                                    <span className="text-gray-600">Delivery (Tiffin Orders)</span>
                                    <span className="font-medium text-gray-900">₹{orderSummary.tiffinFee}</span>
                                </div>
                            )}
                            {orderSummary.eventFee > 0 && (
                                <div className="flex justify-between mb-2">
                                    <span className="text-gray-600">Delivery (Event Catering)</span>
                                    <span className="font-medium text-gray-900">₹{orderSummary.eventFee}</span>
                                </div>
                            )}
                            {(orderSummary.tiffinFee === 0 && cartItems.some(i => i.type === 'single_tiffin')) && (
                                <div className="flex justify-between mb-2 text-teal-600 font-bold">
                                    <span>Delivery (Tiffin)</span>
                                    <span>FREE</span>
                                </div>
                            )}
                            {(orderSummary.eventFee === 0 && cartItems.some(i => i.type === 'event')) && (
                                <div className="flex justify-between mb-2 text-teal-600 font-bold">
                                    <span>Delivery (Event)</span>
                                    <span>FREE</span>
                                </div>
                            )}
                            <div className="border-t border-gray-200 pt-4 flex justify-between mb-6">
                                <span className="text-xl font-bold text-gray-900">Total</span>
                                <span className="text-xl font-bold text-gray-900">₹{orderSummary.finalTotal}</span>
                            </div>
                            <button
                                onClick={handleCheckout}
                                disabled={loading}
                                className="w-full bg-orange-600 text-white py-3 px-4 rounded-md font-medium hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50"
                            >
                                {loading ? 'Processing...' : 'Checkout'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Cart;
