import React, { useContext, useState, useEffect, useMemo } from 'react';
import api from '../lib/api';
import { useNavigate } from 'react-router-dom';
import CartContext from '../context/CartContext';
import AuthContext from '../context/AuthContext';
import NotificationContext from '../context/NotificationContext';
import { useQueryClient } from '@tanstack/react-query';
import { Trash2, Plus, Minus, Tag, X } from 'lucide-react';
import AddressSelector from '../components/AddressSelector';
import useRazorpay from '../hooks/useRazorpay';

import { useActiveCoupons, useValidateCoupon } from '../hooks/useCoupons';

const Cart = () => {
    const { cartItems, removeFromCart, updateQuantity, getCartTotal, clearCart } = useContext(CartContext);
    const { user } = useContext(AuthContext);
    const { showNotification } = useContext(NotificationContext);
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const { initPayment, loading: paymentLoading } = useRazorpay();

    // TanStack Query Hooks
    const { data: availableCoupons = [] } = useActiveCoupons();
    const validateCouponMutation = useValidateCoupon();

    // Coupon State
    const [couponCode, setCouponCode] = useState('');
    const [appliedCoupon, setAppliedCoupon] = useState(null);
    const [couponError, setCouponError] = useState('');
    const [couponSuccess, setCouponSuccess] = useState('');

    const [deliveryAddress, setDeliveryAddress] = useState({
        street: '',
        city: '',
        zip: ''
    });

    useEffect(() => {
        if (user && user.addresses && user.addresses.length > 0) {
            setDeliveryAddress(user.addresses[0]);
        }
    }, [user]);

    const handleApplyCoupon = async () => {
        if (!couponCode.trim()) return;
        setCouponError('');
        setCouponSuccess('');

        try {
            const data = await validateCouponMutation.mutateAsync(couponCode);
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

        // Tiffin Delivery Logic: 
        // 1. Group items by delivery slot (Date + Meal Time)
        // 2. Calculate subtotal for each slot
        // 3. If slot subtotal > ₹700 -> FREE Delivery
        // 4. Else -> ₹40 Delivery Fee per slot
        const deliverySlots = {}; // Key: "YYYY-MM-DD_MealTime", Value: subtotal amount

        cartItems.forEach(item => {
            if (item.type === 'single_tiffin' && item.deliveryDate && item.mealTime) {
                const dateKey = new Date(item.deliveryDate).toISOString().split('T')[0];
                const slotKey = `${dateKey}_${item.mealTime}`;

                if (!deliverySlots[slotKey]) {
                    deliverySlots[slotKey] = 0;
                }
                deliverySlots[slotKey] += (item.totalAmount || 0);
            }
        });

        const DELIVERY_FEE_PER_SLOT = 40;
        const FREE_DELIVERY_THRESHOLD = 700;

        let tiffinFee = 0;
        Object.values(deliverySlots).forEach(slotSubtotal => {
            if (slotSubtotal <= FREE_DELIVERY_THRESHOLD) {
                tiffinFee += DELIVERY_FEE_PER_SLOT;
            }
        });

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

            const { data: orderData } = await api.post(
                '/api/orders/razorpay',
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
                verifyUrl: '/api/orders/verify',
                metadata: { deliveryAddress, type: orderType },
                showNotification,
                onSuccess: async (verificationData, razorpayRawResponse) => {
                    const dbOrderItems = cartItems.map(item => {
                        let itemDeliveryDate = new Date();
                        if (item.deliveryDate) {
                            itemDeliveryDate = new Date(item.deliveryDate);
                        } else {
                            itemDeliveryDate.setDate(itemDeliveryDate.getDate() + 1);
                        }

                        if (item.type === 'event') {
                            return {
                                name: 'Event Catering',
                                quantity: item.guestCount,
                                selectedItems: { name: item.items.map(i => `${i.name} ×${i.quantity}`).join(', ') },
                                deliveryDate: itemDeliveryDate,
                                deliveryTime: item.deliveryTime || '12:00 PM'
                            };
                        } else {
                            return {
                                name: item.name,
                                quantity: item.quantity,
                                selectedItems: { name: (item.menuItems || []).join(', '), planType: item.planType },
                                deliveryDate: itemDeliveryDate,
                                deliveryTime: item.mealTime === 'Lunch' ? '12:00 PM' : '8:00 PM'
                            };
                        }
                    });

                    const paymentDate = new Date();

                    const finalOrderData = {
                        items: dbOrderItems,
                        price: price,
                        totalAmount: finalTotal,
                        type: orderType,
                        paymentDate: paymentDate,
                        deliveryAddress: deliveryAddress,
                        paymentId: razorpayRawResponse.razorpay_payment_id,
                        paymentStatus: 'Paid',
                        discountAmount: discountAmount,
                        couponCode: appliedCoupon ? appliedCoupon.code : null
                    };

                    try {
                        await api.post('/api/orders', finalOrderData, config);
                        queryClient.invalidateQueries({ queryKey: ['orderStats'] });
                        clearCart();
                        showNotification('Order placed successfully!', 'success');
                        navigate('/orders');
                    } catch (orderErr) {
                        console.error('Order save failed:', orderErr);
                        const msg = orderErr.response?.data?.error || orderErr.response?.data?.message || 'Failed to save order';
                        showNotification('Payment done but order save failed: ' + msg, 'error');
                        setError('Payment succeeded but order could not be saved: ' + msg);
                    }
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

    const handleWhatsAppCheckout = () => {
        if (!deliveryAddress.street || !deliveryAddress.city || !deliveryAddress.zip) {
            setError('Please provide a complete delivery address for WhatsApp Checkout.');
            return;
        }

        const { price, discountAmount, deliveryFee, finalTotal } = orderSummary;

        // The Cafe Owner's WhatsApp Number (Include country code, no + or spaces)
        // Adjust this number as needed.
        const cafePhoneNumber = "6666666666";

        // 1. Format the Cart into a nice readable list
        let orderDetails = cartItems.map(item => {
            if (item.type === 'event') {
                return `▪️ Event Catering: ${item.guestCount} guests (₹${item.totalAmount})\n   Date: ${item.deliveryDate ? new Date(item.deliveryDate).toLocaleDateString('en-IN') : 'N/A'}\n   Menu: ${item.items.map(i => i.name).join(', ')}`;
            } else if (item.type === 'single_tiffin') {
                return `▪️ ${item.name} (${item.planType}, ${item.mealTime}): ${item.quantity || 1}x (₹${item.totalAmount})\n   Date: ${item.deliveryDate ? new Date(item.deliveryDate).toLocaleDateString('en-IN') : 'N/A'}\n   Menu: ${item.menuItems.join(', ')}`;
            } else {
                return `▪️ ${item.quantity || 1}x ${item.name} (₹${item.price * (item.quantity || 1)})`;
            }
        }).join('\n\n');

        // 2. Create the final message template
        const message = `
*NEW ORDER RECEIVED* 

*Delivery Address:*
${deliveryAddress.street}, ${deliveryAddress.city}, ${deliveryAddress.zip}

*Order Details:*
${orderDetails}

*Summary:*
Subtotal: ₹${price}
Discount: -₹${discountAmount}
Delivery Fee: ₹${deliveryFee}
*Total Amount: ₹${finalTotal}*

_Please confirm my order!_
`.trim();

        // 3. Encode the message for the URL
        const encodedMessage = encodeURIComponent(message);

        // 4. Generate the wa.me link & open it in a new tab
        const whatsappUrl = `https://wa.me/${cafePhoneNumber}?text=${encodedMessage}`;

        window.open(whatsappUrl, '_blank');
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
                                                        {item.deliveryDate && (
                                                            <p className="text-sm text-gray-500">
                                                                Date: {new Date(item.deliveryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} | Time: {item.deliveryTime}
                                                            </p>
                                                        )}
                                                        <p className="text-sm text-gray-500">
                                                            Menu: {item.items.map(i => i.name).join(', ')}
                                                        </p>
                                                        <p className="text-gray-900 font-semibold mt-1">₹{item.totalAmount}</p>
                                                    </div>
                                                ) : item.type === 'single_tiffin' ? (
                                                    <div>
                                                        <h3 className="text-lg font-medium text-gray-900">{item.name}</h3>
                                                        <p className="text-sm text-gray-500">Plan: {item.planType} | Meal: {item.mealTime}</p>
                                                        {item.deliveryDate && (
                                                            <p className="text-sm text-gray-500">
                                                                Date: {new Date(item.deliveryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} | Time: {item.mealTime === 'Lunch' ? '12:00 PM' : '8:00 PM'}
                                                            </p>
                                                        )}
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

                                        {/* Quantity Controls for tiffin and event items */}
                                        <div className="flex items-center space-x-4">
                                            <div className="flex items-center border border-gray-300 rounded-md">
                                                <button
                                                    onClick={() => {
                                                        const currentQty = item.type === 'event' ? item.guestCount : item.quantity;
                                                        if (currentQty <= 1) {
                                                            removeFromCart(item.id);
                                                        } else {
                                                            updateQuantity(item.id, currentQty - 1);
                                                        }
                                                    }}
                                                    className="p-2 hover:bg-gray-100"
                                                >
                                                    <Minus className="h-4 w-4" />
                                                </button>
                                                <span className="px-4 py-2 text-gray-900 font-medium">
                                                    {item.type === 'event' ? item.guestCount : item.quantity}
                                                </span>
                                                <button
                                                    onClick={() => {
                                                        const currentQty = item.type === 'event' ? item.guestCount : item.quantity;
                                                        // Prevent exceeding max guests if it's an event
                                                        if (item.type === 'event' && currentQty >= 50) {
                                                            showNotification('Guest count cannot exceed 50.', 'error');
                                                            return;
                                                        }
                                                        const result = updateQuantity(item.id, currentQty + 1);
                                                        if (result && !result.success) {
                                                            showNotification(result.message, 'error');
                                                        }
                                                    }}
                                                    className="p-2 hover:bg-gray-100"
                                                >
                                                    <Plus className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </div>

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
                                className="w-full bg-orange-600 text-white py-3 px-4 rounded-md font-medium hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 mb-3"
                            >
                                {loading ? 'Processing...' : 'Checkout with Razorpay'}
                            </button>

                            <button
                                onClick={handleWhatsAppCheckout}
                                disabled={loading}
                                className="w-full bg-green-500 text-white py-3 px-4 rounded-md font-medium hover:bg-green-600 flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all hover:scale-105 disabled:opacity-50"
                            >
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
                                </svg>
                                <span>Checkout via WhatsApp</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Cart;
