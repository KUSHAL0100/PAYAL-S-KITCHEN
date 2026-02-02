import React, { useEffect, useState, useContext } from 'react';
import axios from 'axios';
import { AlertCircle, Clock, Package, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import NotificationContext from '../context/NotificationContext';
import { useNavigate } from 'react-router-dom';
import { calculateCancellationFee } from '../utils/orderUtils';

const Orders = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const { user } = useContext(AuthContext);
    const { showNotification } = useContext(NotificationContext);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchOrders = async () => {
            try {
                const config = {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('token')}`,
                    },
                };
                const res = await axios.get('http://127.0.0.1:5000/api/orders/myorders', config);
                setOrders(res.data);
                setLoading(false);
            } catch (error) {
                console.error('Error fetching orders:', error);
                setLoading(false);
                showNotification('Failed to fetch orders', 'error');
            }
        };

        if (user) {
            fetchOrders();
        }

        // Load Razorpay script
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.async = true;
        document.body.appendChild(script);

        return () => {
            document.body.removeChild(script);
        };
    }, [user]);

    const handleCancelOrder = async (order) => {
        // Calculate refund using utility function
        const { cancellationFee, refundAmount, percentage, message } = calculateCancellationFee(order);

        if (!window.confirm(message)) return;

        try {
            const config = {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                },
            };

            const response = await axios.put(
                `http://127.0.0.1:5000/api/orders/${order._id}/cancel`,
                {},
                config
            );

            const { refund, refundError } = response.data;

            if (refundError) {
                showNotification(
                    `Order cancelled. Refund failed: ${refundError}. Contact support.`,
                    'warning'
                );
            } else if (refund) {
                showNotification(
                    `Order cancelled. ₹${(refund.amount / 100).toFixed(2)} refund processed.`,
                    'success'
                );
            } else {
                showNotification('Order cancelled (No refund applicable).', 'info');
            }

            // Refresh orders
            const res = await axios.get('http://127.0.0.1:5000/api/orders/myorders', config);
            setOrders(res.data);
        } catch (error) {
            console.error('Error cancelling order:', error);
            showNotification(
                error.response?.data?.message || 'Failed to cancel order',
                'error'
            );
        }
    };

    if (loading) {
        return <div className="text-center py-10">Loading orders...</div>;
    }

    // Filter out subscription orders (they have their own page now)
    const filteredOrders = orders.filter(order =>
        order.type !== 'subscription_purchase' &&
        order.type !== 'subscription_upgrade'
    );

    return (
        <div className="bg-gray-50/50 min-h-screen py-16">
            <div className="max-w-5xl mx-auto px-6 lg:px-8">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
                    <div>
                        <h2 className="text-4xl font-black text-gray-900 tracking-tight mb-2">Order History</h2>
                        <p className="text-gray-500 font-medium tracking-wide uppercase text-xs">Manage and track your recent meals</p>
                    </div>

                    <div className="flex items-center gap-3 px-4 py-2 bg-amber-50 border border-amber-100 rounded-2xl">
                        <AlertCircle className="h-5 w-5 text-amber-500" />
                        <p className="text-xs text-amber-700 font-black uppercase tracking-wider">
                            20% Cancellation Fee applies
                        </p>
                    </div>
                </div>

                {filteredOrders.length === 0 ? (
                    <div className="text-center py-24 bg-white rounded-[2.5rem] border border-gray-100 shadow-sm">
                        <div className="inline-flex items-center justify-center h-20 w-20 rounded-3xl bg-gray-50 text-gray-400 mb-6">
                            <Clock className="h-10 w-10" />
                        </div>
                        <h3 className="text-xl font-black text-gray-900 mb-2">No orders yet</h3>
                        <p className="text-gray-500 mb-8">Seems like you haven't placed any orders yet.</p>
                        <Link to="/menu" className="inline-flex items-center px-8 py-3 bg-orange-600 text-white font-black rounded-2xl hover:bg-orange-700 transition-all active:scale-95 shadow-lg shadow-orange-100">
                            Explore Menu
                        </Link>
                    </div>
                ) : (
                    <div className="grid gap-8">
                        {filteredOrders.map((order) => (
                            <div key={order._id} className="group bg-white rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden">
                                {/* Header */}
                                <div className="px-8 py-6 border-b border-gray-50 flex flex-wrap items-center justify-between gap-4 bg-gray-50/30">
                                    <div className="flex items-center gap-6">
                                        <div className="h-14 w-14 bg-white rounded-2xl flex flex-col items-center justify-center shadow-sm border border-gray-100">
                                            <span className="text-[10px] font-black text-gray-400 uppercase leading-none mb-1">
                                                {new Date(order.createdAt).toLocaleString('default', { month: 'short' })}
                                            </span>
                                            <span className="text-xl font-black text-gray-900 leading-none">
                                                {new Date(order.createdAt).getDate()}
                                            </span>
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-black text-gray-900">
                                                Order #{order._id.slice(-6).toUpperCase()}
                                            </h3>
                                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">
                                                {order.type === 'event' ? 'Catering Event' : 'Single Tiffin'}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.15em] shadow-sm ${order.status === 'Delivered' ? 'bg-teal-50 text-teal-600 border border-teal-100' :
                                                order.status === 'Cancelled' ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                                                    'bg-amber-50 text-amber-600 border border-amber-100'
                                            }`}>
                                            {order.status}
                                        </span>

                                        {(order.type === 'event' || order.type === 'single') &&
                                            order.status !== 'Cancelled' &&
                                            order.status !== 'Delivered' && (
                                                <button
                                                    onClick={() => handleCancelOrder(order)}
                                                    className="px-4 py-1.5 bg-white border border-rose-200 text-rose-500 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-rose-50 transition-colors shadow-sm active:scale-95"
                                                >
                                                    Cancel
                                                </button>
                                            )}
                                    </div>
                                </div>

                                {/* Body */}
                                <div className="p-8 grid md:grid-cols-2 gap-12">
                                    <div>
                                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Ordered Items</h4>
                                        <div className="space-y-4">
                                            {order.items.map((item, idx) => (
                                                <div key={idx} className="flex justify-between items-start group/item">
                                                    <div>
                                                        <p className="text-sm font-black text-gray-800 flex items-center gap-2">
                                                            <span className="h-5 w-5 bg-orange-50 text-orange-600 text-[10px] flex items-center justify-center rounded-lg">{item.quantity}x</span>
                                                            {item.name}
                                                        </p>
                                                        {item.selectedItems?.length > 0 && (
                                                            <p className="text-[10px] font-bold text-gray-400 mt-1 pl-7">
                                                                {item.selectedItems.join(' • ')}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <span className="text-sm font-black text-gray-900">
                                                        ₹{order.type === 'event' ? item.price : item.price * item.quantity}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        <div className="grid grid-cols-2 gap-8">
                                            <div>
                                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Delivery Date</h4>
                                                <p className="text-sm font-black text-gray-900">{new Date(order.deliveryDate).toLocaleDateString(undefined, { dateStyle: 'long' })}</p>
                                            </div>
                                            <div>
                                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Total Paid</h4>
                                                <p className="text-xl font-black text-orange-600">₹{order.totalAmount}</p>
                                            </div>
                                        </div>

                                        {/* Refund Details for Cancelled Orders */}
                                        {order.status === 'Cancelled' && (
                                            <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100">
                                                <div className="flex justify-between items-center mb-2">
                                                    <span className="text-[10px] font-black text-rose-800 uppercase tracking-widest">Refund Details</span>
                                                    <span className="text-[10px] font-bold text-rose-600">Processed</span>
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <span className="block text-[10px] text-rose-600 opacity-70 uppercase font-black tracking-tighter">Cancellation Fee</span>
                                                        <span className="text-sm font-black text-rose-800">₹{order.cancellationFee?.toFixed(2) || '0.00'}</span>
                                                    </div>
                                                    <div>
                                                        <span className="block text-[10px] text-rose-600 opacity-70 uppercase font-black tracking-tighter">Amount Refunded</span>
                                                        <span className="text-sm font-black text-teal-600">₹{order.refundAmount?.toFixed(2) || '0.00'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Orders;
