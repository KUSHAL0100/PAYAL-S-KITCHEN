import React, { useEffect, useState, useContext, useMemo } from 'react';
import axios from 'axios';
import { Plus, Trash2, Edit2, Check, X, Package, Calendar, Clock, MessageSquare, Filter, Tag, Users, LayoutDashboard, TrendingUp, AlertCircle, CreditCard, Utensils, RefreshCw, ChevronRight, Activity, PieChart } from 'lucide-react';
import AuthContext from '../../context/AuthContext';
import NotificationContext from '../../context/NotificationContext';

const CompactAddress = ({ address, label }) => {
    if (!address?.street) return null;
    return (
        <div className="flex flex-col leading-tight">
            <div className="flex items-start gap-1">
                {label && (
                    <div className="flex flex-col items-center mt-0.5">
                        {label.split('').map((char, i) => (
                            <span key={i} className={`text-[8px] font-black ${char === 'L' ? 'text-orange-600' : 'text-blue-600'}`}>{char}</span>
                        ))}
                    </div>
                )}
                <span className="text-[10px] font-bold text-gray-900 break-words max-w-[150px]">{address.street}</span>
            </div>
            <span className="text-[9px] text-gray-500 ml-3 font-medium">{address.city}</span>
        </div>
    );
};

const AdminDashboard = () => {
    const { user } = useContext(AuthContext);
    const { showNotification } = useContext(NotificationContext);

    const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'plans', 'orders', 'complaints', 'discounts', 'subscriptions', 'menus'

    // Plans State
    const [plans, setPlans] = useState([]);
    const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
    const [editingPlan, setEditingPlan] = useState(null);
    const [planFormData, setPlanFormData] = useState({
        name: 'Basic',
        price: '',
        duration: 'monthly',
        description: '',
        features: ''
    });

    // Orders State
    const [orders, setOrders] = useState([]);
    const [loadingOrders, setLoadingOrders] = useState(true);
    const [orderFilter, setOrderFilter] = useState('all'); // 'all', 'event', 'plans', 'single'

    // Complaints State
    const [complaints, setComplaints] = useState([]);
    const [loadingComplaints, setLoadingComplaints] = useState(false);
    const [isReplyModalOpen, setIsReplyModalOpen] = useState(false);
    const [selectedComplaint, setSelectedComplaint] = useState(null);
    const [replyText, setReplyText] = useState('');

    // Coupons State
    const [coupons, setCoupons] = useState([]);
    const [couponFormData, setCouponFormData] = useState({ code: '', discountPercentage: '', expiryDate: '' });

    // Subscriptions State
    const [subscriptions, setSubscriptions] = useState([]);
    const [loadingSubscriptions, setLoadingSubscriptions] = useState(false);

    // Menu Management State
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedPlanType, setSelectedPlanType] = useState('Basic');
    const [dailyMenu, setDailyMenu] = useState(null);
    const [loadingMenu, setLoadingMenu] = useState(false);
    const [isMenuModalOpen, setIsMenuModalOpen] = useState(false);
    const [menuFormData, setMenuFormData] = useState({
        lunch: '',
        dinner: '',
        isWeekendSpecial: false
    });

    // Dashboard Stats Calculation
    const stats = useMemo(() => {
        const totalRevenue = orders.reduce((acc, order) => {
            // Only count paid/confirmed orders towards revenue
            if (order.status === 'Pending' || order.status === 'Rejected' || order.status === 'Cancelled') return acc;
            const paid = parseFloat(order.totalAmount) || 0;
            const refund = parseFloat(order.refundAmount) || 0;
            return acc + (paid - refund);
        }, 0);

        const totalRefunds = orders.reduce((acc, order) => acc + (parseFloat(order.refundAmount) || 0), 0);
        const totalOrders = orders.length;
        const activeSubscriptions = subscriptions.filter(sub => sub.status === 'Active').length;
        const pendingComplaints = complaints.filter(c => c.status !== 'Resolved').length;
        const totalPlans = plans.length;
        const activeCoupons = coupons.length;

        return {
            totalRevenue: Math.round(totalRevenue).toLocaleString(),
            totalRefunds: Math.round(totalRefunds).toLocaleString(),
            totalOrders,
            activeSubscriptions,
            pendingComplaints,
            totalPlans,
            activeCoupons
        };
    }, [orders, subscriptions, complaints, plans, coupons]);

    useEffect(() => {
        fetchPlans();
        fetchOrders();
        fetchComplaints();
        fetchCoupons();
        fetchSubscriptions();
        if (activeTab === 'menus') {
            fetchMenu();
        }
    }, [activeTab, selectedDate, selectedPlanType]);

    // --- Plans Logic ---
    const fetchPlans = async () => {
        try {
            const res = await axios.get('http://127.0.0.1:5000/api/plans');
            setPlans(res.data);
        } catch (error) {
            console.error('Error fetching plans:', error);
            showNotification('Failed to fetch plans', 'error');
        }
    };

    const handlePlanSubmit = async (e) => {
        e.preventDefault();
        try {
            const config = {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
            };

            const payload = {
                ...planFormData,
                features: typeof planFormData.features === 'string'
                    ? planFormData.features.split(',').map(f => f.trim())
                    : planFormData.features
            };

            if (editingPlan) {
                await axios.put(`http://127.0.0.1:5000/api/plans/${editingPlan._id}`, payload, config);
                showNotification('Plan updated successfully', 'success');
            } else {
                await axios.post('http://127.0.0.1:5000/api/plans', payload, config);
                showNotification('Plan created successfully', 'success');
            }

            fetchPlans();
            closePlanModal();
        } catch (error) {
            console.error('Error saving plan:', error);
            showNotification('Failed to save plan', 'error');
        }
    };

    const handleDeletePlan = async (id) => {
        if (!window.confirm('Are you sure you want to delete this plan?')) return;
        try {
            const config = {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
            };
            await axios.delete(`http://127.0.0.1:5000/api/plans/${id}`, config);
            fetchPlans();
            showNotification('Plan deleted successfully', 'success');
        } catch (error) {
            console.error('Error deleting plan:', error);
            showNotification('Failed to delete plan', 'error');
        }
    };

    const openPlanModal = (plan = null) => {
        if (plan) {
            setEditingPlan(plan);
            setPlanFormData({
                name: plan.name,
                price: plan.price,
                duration: plan.duration,
                description: plan.description,
                features: plan.features.join(', ')
            });
        } else {
            setEditingPlan(null);
            setPlanFormData({
                name: 'Basic',
                price: '',
                duration: 'monthly',
                description: '',
                features: ''
            });
        }
        setIsPlanModalOpen(true);
    };

    const closePlanModal = () => {
        setIsPlanModalOpen(false);
        setEditingPlan(null);
    };

    // --- Orders Logic ---
    const fetchOrders = async () => {
        setLoadingOrders(true);
        try {
            const config = {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
            };
            const res = await axios.get('http://127.0.0.1:5000/api/orders', config);
            setOrders(res.data);
            setLoadingOrders(false);
        } catch (error) {
            console.error('Error fetching orders:', error);
            showNotification('Failed to fetch orders', 'error');
            setLoadingOrders(false);
        }
    };

    const handleUpdateOrderStatus = async (orderId, newStatus) => {
        // Confirmation dialog for rejections
        if (newStatus === 'Rejected') {
            const order = orders.find(o => o._id === orderId);
            const amount = order?.totalAmount || 0;
            if (!window.confirm(`Reject this order?\n\nA full refund of ₹${amount} will be processed to the customer.`)) return;
        }

        try {
            const config = {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
            };
            const response = await axios.put(`http://127.0.0.1:5000/api/orders/${orderId}/status`, { status: newStatus }, config);

            // Use the full updated order from the API response
            const updatedOrder = response.data.order || response.data;
            setOrders(orders.map(order =>
                order._id === orderId ? { ...order, ...updatedOrder } : order
            ));

            if (newStatus === 'Rejected') {
                const refundAmt = response.data.refundAmount || 0;
                if (response.data.refundError) {
                    showNotification(`Order rejected. Refund of ₹${refundAmt} failed: ${response.data.refundError}`, 'warning');
                } else {
                    showNotification(`Order rejected. ₹${refundAmt} refund processed.`, 'success');
                }
            } else {
                showNotification(`Order ${newStatus === 'Confirmed' ? 'Accepted' : newStatus}`, 'success');
            }
        } catch (error) {
            console.error('Error updating order status:', error);
            showNotification('Failed to update order status', 'error');
        }
    };

    const filteredOrders = orders.filter(order => {
        if (orderFilter === 'all') return true;
        if (orderFilter === 'event') return order.type === 'event';
        if (orderFilter === 'plans') return order.type === 'subscription_purchase';
        if (orderFilter === 'single') return order.type === 'single';
        return true;
    });

    // --- Complaints Logic ---
    const fetchComplaints = async () => {
        setLoadingComplaints(true);
        try {
            const config = {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
            };
            const res = await axios.get('http://127.0.0.1:5000/api/complaints', config);
            setComplaints(res.data);
            setLoadingComplaints(false);
        } catch (error) {
            console.error('Error fetching complaints:', error);
            // showNotification('Failed to fetch complaints', 'error'); // Optional: suppress if not critical
            setLoadingComplaints(false);
        }
    };

    const openReplyModal = (complaint) => {
        setSelectedComplaint(complaint);
        setReplyText(complaint.resolution || '');
        setIsReplyModalOpen(true);
    };

    const closeReplyModal = () => {
        setIsReplyModalOpen(false);
        setSelectedComplaint(null);
        setReplyText('');
    };

    const handleReplySubmit = async (e) => {
        e.preventDefault();
        try {
            const config = {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
            };
            await axios.put(`http://127.0.0.1:5000/api/complaints/${selectedComplaint._id}`, {
                resolution: replyText,
                status: 'Resolved'
            }, config);

            // Optimistic update
            setComplaints(complaints.map(c =>
                c._id === selectedComplaint._id ? { ...c, resolution: replyText, status: 'Resolved' } : c
            ));

            showNotification('Complaint resolved successfully', 'success');
            closeReplyModal();
        } catch (error) {
            console.error('Error replying to complaint:', error);
            showNotification('Failed to reply to complaint', 'error');
        }
    };

    // --- Coupons Logic ---
    const fetchCoupons = async () => {
        try {
            const config = { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } };
            const res = await axios.get('http://127.0.0.1:5000/api/coupons', config);
            setCoupons(res.data);
        } catch (error) {
            console.error('Error fetching coupons:', error);
        }
    };

    const handleCreateCoupon = async (e) => {
        e.preventDefault();
        try {
            const config = { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } };
            await axios.post('http://127.0.0.1:5000/api/coupons', {
                ...couponFormData,
                discountPercentage: parseInt(couponFormData.discountPercentage)
            }, config);
            showNotification('Coupon created successfully', 'success');
            setCouponFormData({ code: '', discountPercentage: '', expiryDate: '' });
            fetchCoupons();
        } catch (error) {
            console.error('Error creating coupon:', error);
            console.error('Error response:', error.response);
            showNotification(error.response?.data?.message || 'Failed to create coupon', 'error');
        }
    };

    const handleDeleteCoupon = async (id) => {
        if (!window.confirm('Delete this coupon?')) return;
        try {
            const config = { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } };
            await axios.delete(`http://127.0.0.1:5000/api/coupons/${id}`, config);
            showNotification('Coupon deleted', 'success');
            fetchCoupons();
        } catch (error) {
            console.error('Error deleting coupon:', error);
            showNotification('Failed to delete coupon', 'error');
        }
    };

    // --- Subscriptions Logic ---
    const fetchSubscriptions = async () => {
        setLoadingSubscriptions(true);
        try {
            const config = { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } };
            const res = await axios.get('http://127.0.0.1:5000/api/subscriptions', config);
            setSubscriptions(res.data);
            setLoadingSubscriptions(false);
        } catch (error) {
            console.error('Error fetching subscriptions:', error);
            setLoadingSubscriptions(false);
        }
    };

    const handleCancelSubscription = async (id) => {
        if (!window.confirm('Are you sure you want to cancel this user\'s subscription?\nThis will process a pro-rata refund if applicable.')) return;
        try {
            const config = { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } };
            await axios.put(`http://127.0.0.1:5000/api/subscriptions/${id}/cancel`, {}, config);
            showNotification('Subscription cancelled successfully', 'success');
            fetchSubscriptions();
        } catch (error) {
            console.error('Error cancelling subscription:', error);
            showNotification('Failed to cancel subscription', 'error');
        }
    };

    // --- Menu Management Logic ---
    const fetchMenu = async () => {
        setLoadingMenu(true);
        try {
            const res = await axios.get(`http://127.0.0.1:5000/api/menu?date=${selectedDate}&planType=${selectedPlanType}`);
            if (res.data && res.data.length > 0) {
                setDailyMenu(res.data[0]);
            } else {
                setDailyMenu(null);
            }
            setLoadingMenu(false);
        } catch (error) {
            console.error('Error fetching menu:', error);
            setLoadingMenu(false);
        }
    };

    const handleMenuSubmit = async (e) => {
        e.preventDefault();
        try {
            const config = { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } };
            const payload = {
                date: selectedDate,
                planType: selectedPlanType,
                items: {
                    lunch: menuFormData.lunch.split(',').map(i => i.trim()).filter(i => i),
                    dinner: menuFormData.dinner.split(',').map(i => i.trim()).filter(i => i)
                },
                isWeekendSpecial: menuFormData.isWeekendSpecial
            };

            if (dailyMenu) {
                await axios.put(`http://127.0.0.1:5000/api/menu/${dailyMenu._id}`, payload, config);
                showNotification('Menu updated successfully', 'success');
            } else {
                await axios.post('http://127.0.0.1:5000/api/menu', payload, config);
                showNotification('Menu created successfully', 'success');
            }
            setIsMenuModalOpen(false);
            fetchMenu();
        } catch (error) {
            console.error('Error saving menu:', error);
            showNotification('Failed to save menu', 'error');
        }
    };

    const handleDeleteMenu = async () => {
        if (!dailyMenu || !window.confirm('Delete this menu?')) return;
        try {
            const config = { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } };
            await axios.delete(`http://127.0.0.1:5000/api/menu/${dailyMenu._id}`, config);
            showNotification('Menu deleted', 'success');
            setDailyMenu(null);
        } catch (error) {
            console.error('Error deleting menu:', error);
            showNotification('Failed to delete menu', 'error');
        }
    };

    const openMenuModal = () => {
        if (dailyMenu) {
            setMenuFormData({
                lunch: dailyMenu.items.lunch.join(', '),
                dinner: dailyMenu.items.dinner.join(', '),
                isWeekendSpecial: dailyMenu.isWeekendSpecial
            });
        } else {
            setMenuFormData({
                lunch: '',
                dinner: '',
                isWeekendSpecial: false
            });
        }
        setIsMenuModalOpen(true);
    };

    return (
        <div className="bg-gray-50 min-h-screen py-10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header Section */}
                <div className="flex flex-col lg:flex-row justify-between lg:items-end mb-10 gap-6">
                    <div>
                        <h2 className="text-4xl font-black text-gray-900 tracking-tight">Admin Dashboard</h2>
                        <p className="text-gray-500 mt-2 text-lg">Welcome back, {user?.name || 'Admin'}. Here's what's happening today.</p>
                    </div>
                    <div className="flex space-x-2 overflow-x-auto pb-4 lg:pb-0 scrollbar-hide">
                        {[
                            { id: 'overview', icon: LayoutDashboard, label: 'Overview' },
                            { id: 'orders', icon: Package, label: 'Orders' },
                            { id: 'plans', icon: PieChart, label: 'Plans' },
                            { id: 'complaints', icon: MessageSquare, label: 'Complaints' },
                            { id: 'discounts', icon: Tag, label: 'Discounts' },
                            { id: 'subscriptions', icon: CreditCard, label: 'Subscriptions' },
                            { id: 'refunds', icon: RefreshCw, label: 'Refunds' },
                            { id: 'menus', icon: Utensils, label: 'Menus' },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`px-5 py-3 rounded-2xl font-bold whitespace-nowrap flex items-center transition-all ${activeTab === tab.id
                                    ? 'bg-orange-600 text-white shadow-xl shadow-orange-200 -translate-y-1'
                                    : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-100 hover:border-gray-200'
                                    }`}
                            >
                                <tab.icon className="h-4 w-4 mr-2" />
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* --- Overview Tab --- */}
                {activeTab === 'overview' && (
                    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
                        {/* Stats Grid - 3x2 Symmetric Layout */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {/* Revenue Card */}
                            <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 hover:shadow-xl hover:shadow-gray-200/50 transition-all relative overflow-hidden group">
                                <div className="absolute -top-4 -right-4 p-8 opacity-5 group-hover:scale-125 transition-transform duration-500">
                                    <TrendingUp className="h-24 w-24 text-green-600" />
                                </div>
                                <div className="flex items-center space-x-5">
                                    <div className="p-4 bg-green-50 rounded-2xl text-green-600">
                                        <TrendingUp className="h-8 w-8" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Total Revenue</p>
                                        <h3 className="text-3xl font-black text-gray-900 mt-1">₹{stats.totalRevenue}</h3>
                                        <div className="flex items-center mt-2 text-green-600">
                                            <Activity className="h-4 w-4 mr-1" />
                                            <span className="text-xs font-bold">Net Sales</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Orders Card */}
                            <div onClick={() => setActiveTab('orders')} className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 hover:shadow-xl hover:shadow-gray-200/50 transition-all relative overflow-hidden group cursor-pointer">
                                <div className="absolute -top-4 -right-4 p-8 opacity-5 group-hover:scale-125 transition-transform duration-500">
                                    <Package className="h-24 w-24 text-blue-600" />
                                </div>
                                <div className="flex items-center space-x-5">
                                    <div className="p-4 bg-blue-50 rounded-2xl text-blue-600">
                                        <Package className="h-8 w-8" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Total Orders</p>
                                        <h3 className="text-3xl font-black text-gray-900 mt-1">{stats.totalOrders}</h3>
                                        <div className="flex items-center mt-2 text-blue-600">
                                            <Package className="h-4 w-4 mr-1" />
                                            <span className="text-xs font-bold uppercase">Total Transactions</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Subscriptions Card */}
                            <div onClick={() => setActiveTab('subscriptions')} className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 hover:shadow-xl hover:shadow-gray-200/50 transition-all relative overflow-hidden group cursor-pointer">
                                <div className="absolute -top-4 -right-4 p-8 opacity-5 group-hover:scale-125 transition-transform duration-500">
                                    <CreditCard className="h-24 w-24 text-purple-600" />
                                </div>
                                <div className="flex items-center space-x-5">
                                    <div className="p-4 bg-purple-50 rounded-2xl text-purple-600">
                                        <CreditCard className="h-8 w-8" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Subscriptions</p>
                                        <h3 className="text-3xl font-black text-gray-900 mt-1">{stats.activeSubscriptions}</h3>
                                        <div className="flex items-center mt-2 text-purple-600">
                                            <Users className="h-4 w-4 mr-1" />
                                            <span className="text-xs font-bold">Active Members</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Refunds Card */}
                            <div onClick={() => setActiveTab('refunds')} className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 hover:shadow-xl hover:shadow-gray-200/50 transition-all relative overflow-hidden group cursor-pointer">
                                <div className="absolute -top-4 -right-4 p-8 opacity-5 group-hover:scale-125 transition-transform duration-500">
                                    <RefreshCw className="h-24 w-24 text-amber-600" />
                                </div>
                                <div className="flex items-center space-x-5">
                                    <div className="p-4 bg-amber-50 rounded-2xl text-amber-600">
                                        <RefreshCw className="h-8 w-8" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Refunds</p>
                                        <h3 className="text-3xl font-black text-orange-600 mt-1">₹{stats.totalRefunds}</h3>
                                        <div className="flex items-center mt-2 text-amber-600">
                                            <Activity className="h-4 w-4 mr-1" />
                                            <span className="text-xs font-bold text-gray-500 uppercase">Process Amount</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Complaints Card */}
                            <div onClick={() => setActiveTab('complaints')} className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 hover:shadow-xl hover:shadow-gray-200/50 transition-all relative overflow-hidden group cursor-pointer">
                                <div className="absolute -top-4 -right-4 p-8 opacity-5 group-hover:scale-125 transition-transform duration-500">
                                    <MessageSquare className="h-24 w-24 text-red-600" />
                                </div>
                                <div className="flex items-center space-x-5">
                                    <div className="p-4 bg-red-50 rounded-2xl text-red-600">
                                        <MessageSquare className="h-8 w-8" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Complaints</p>
                                        <h3 className="text-3xl font-black text-gray-900 mt-1">{stats.pendingComplaints}</h3>
                                        <div className="flex items-center mt-2 text-red-600">
                                            <AlertCircle className="h-4 w-4 mr-1" />
                                            <span className="text-xs font-bold">Requires Action</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Coupons Card */}
                            <div onClick={() => setActiveTab('discounts')} className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 hover:shadow-xl hover:shadow-gray-200/50 transition-all relative overflow-hidden group cursor-pointer">
                                <div className="absolute -top-4 -right-4 p-8 opacity-5 group-hover:scale-125 transition-transform duration-500">
                                    <Tag className="h-24 w-24 text-orange-600" />
                                </div>
                                <div className="flex items-center space-x-5">
                                    <div className="p-4 bg-orange-50 rounded-2xl text-orange-600">
                                        <Tag className="h-8 w-8" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Promo Coupons</p>
                                        <h3 className="text-3xl font-black text-gray-900 mt-1">{stats.activeCoupons}</h3>
                                        <div className="flex items-center mt-2 text-orange-600">
                                            <Filter className="h-4 w-4 mr-1" />
                                            <span className="text-xs font-bold">Active Offers</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Recent Activity & Quick Actions Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                            {/* Recent Activity (Left Column) */}
                            <div className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                                <div className="px-8 py-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/30">
                                    <h3 className="text-xl font-black text-gray-900 flex items-center">
                                        <Clock className="h-6 w-6 mr-3 text-orange-500" />
                                        Latest Business Pulse
                                    </h3>
                                    <button
                                        onClick={() => { setActiveTab('orders'); fetchOrders(); }}
                                        className="text-sm font-bold text-orange-600 hover:bg-orange-50 px-4 py-2 rounded-xl transition-colors"
                                    >
                                        View Full Log
                                    </button>
                                </div>
                                <div className="divide-y divide-gray-50">
                                    {orders.slice(0, 6).map((order) => (
                                        <div key={order._id} className="p-6 hover:bg-gray-50 transition-all flex items-center justify-between group">
                                            <div className="flex items-center space-x-5">
                                                <div className={`p-3 rounded-2xl ${order.status === 'Confirmed' ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'} group-hover:scale-105 transition-transform`}>
                                                    <Package className="h-6 w-6" />
                                                </div>
                                                <div>
                                                    <p className="text-md font-black text-gray-900 capitalize">{order.type.replace('_', ' ')} Order</p>
                                                    <p className="text-xs font-bold text-gray-400 mt-0.5 tracking-wide">
                                                        #{order._id.slice(-6).toUpperCase()} • {order.user?.name || 'Guest'}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-lg font-black text-gray-900">₹{order.totalAmount}</p>
                                                <p className="text-xs font-bold text-gray-400 mt-0.5 uppercase">
                                                    {new Date(order.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                    {orders.length === 0 && (
                                        <div className="p-20 text-center">
                                            <Activity className="h-12 w-12 text-gray-200 mx-auto mb-4" />
                                            <p className="text-gray-400 font-bold">No recent business pulse detected.</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Quick Actions & Status (Right Column) */}
                            <div className="space-y-10">
                                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                                    <div className="px-8 py-6 border-b border-gray-50 bg-gray-50/30">
                                        <h3 className="text-xl font-black text-gray-900 flex items-center">
                                            <Plus className="h-5 w-5 mr-3 text-orange-500" />
                                            Task Shortcuts
                                        </h3>
                                    </div>
                                    <div className="p-8 space-y-4">
                                        <button
                                            onClick={() => { setActiveTab('menus'); openMenuModal(); }}
                                            className="w-full flex items-center justify-between p-5 rounded-2xl border border-gray-100 hover:border-orange-200 hover:bg-orange-50 transition-all group"
                                        >
                                            <div className="flex items-center text-left">
                                                <div className="p-3 bg-orange-100 text-orange-600 rounded-xl mr-4 group-hover:rotate-12 transition-transform">
                                                    <Utensils className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <span className="block font-black text-gray-900">Daily Menu</span>
                                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-tighter">Update today's meals</span>
                                                </div>
                                            </div>
                                            <ChevronRight className="h-5 w-5 text-gray-300 group-hover:text-orange-500 group-hover:translate-x-1 transition-all" />
                                        </button>

                                        <button
                                            onClick={() => { setActiveTab('plans'); openPlanModal(); }}
                                            className="w-full flex items-center justify-between p-5 rounded-2xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50 transition-all group"
                                        >
                                            <div className="flex items-center text-left">
                                                <div className="p-3 bg-blue-100 text-blue-600 rounded-xl mr-4 group-hover:rotate-12 transition-transform">
                                                    <Plus className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <span className="block font-black text-gray-900">New Offering</span>
                                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-tighter">Create meal plan</span>
                                                </div>
                                            </div>
                                            <ChevronRight className="h-5 w-5 text-gray-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                                        </button>

                                        <button
                                            onClick={() => setActiveTab('discounts')}
                                            className="w-full flex items-center justify-between p-5 rounded-2xl border border-gray-100 hover:border-purple-200 hover:bg-purple-50 transition-all group"
                                        >
                                            <div className="flex items-center text-left">
                                                <div className="p-3 bg-purple-100 text-purple-600 rounded-xl mr-4 group-hover:rotate-12 transition-transform">
                                                    <Tag className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <span className="block font-black text-gray-900">Promotions</span>
                                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-tighter">Manage coupons</span>
                                                </div>
                                            </div>
                                            <ChevronRight className="h-5 w-5 text-gray-300 group-hover:text-purple-500 group-hover:translate-x-1 transition-all" />
                                        </button>
                                    </div>
                                </div>

                            </div>
                        </div>
                    </div>
                )}

                {/* --- Orders Tab --- */}
                {activeTab === 'orders' && (
                    <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                        <div className="px-4 py-5 sm:px-6 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-4">
                            <h3 className="text-lg leading-6 font-medium text-gray-900">Recent Orders</h3>

                            {/* Filters */}
                            <div className="flex space-x-2">
                                <button
                                    onClick={() => setOrderFilter('all')}
                                    className={`px-3 py-1 text-xs font-medium rounded-full ${orderFilter === 'all' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                                >
                                    All
                                </button>
                                <button
                                    onClick={() => setOrderFilter('event')}
                                    className={`px-3 py-1 text-xs font-medium rounded-full ${orderFilter === 'event' ? 'bg-purple-100 text-purple-800 ring-1 ring-purple-500' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                                >
                                    Event
                                </button>
                                <button
                                    onClick={() => setOrderFilter('plans')}
                                    className={`px-3 py-1 text-xs font-medium rounded-full ${orderFilter === 'plans' ? 'bg-blue-100 text-blue-800 ring-1 ring-blue-500' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                                >
                                    Plans
                                </button>
                                <button
                                    onClick={() => setOrderFilter('single')}
                                    className={`px-3 py-1 text-xs font-medium rounded-full ${orderFilter === 'single' ? 'bg-green-100 text-green-800 ring-1 ring-green-500' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                                >
                                    Custom Tiffin
                                </button>
                            </div>

                            <button onClick={fetchOrders} className="text-sm text-orange-600 hover:text-orange-800">Refresh</button>
                        </div>
                        {loadingOrders ? (
                            <div className="text-center py-10">Loading orders...</div>
                        ) : filteredOrders.length === 0 ? (
                            <div className="text-center py-10 text-gray-500">No orders found.</div>
                        ) : (
                            <ul className="divide-y divide-gray-200">
                                {filteredOrders.map((order) => (
                                    <li key={order._id} className="p-4 hover:bg-gray-50 transition-colors">
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between mb-2">
                                                    <p className="text-sm font-medium text-orange-600 truncate">
                                                        Order #{order._id.slice(-6).toUpperCase()}
                                                    </p>
                                                    <div className="ml-2 flex-shrink-0 flex">
                                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                                            ${order.status === 'Confirmed' ? 'bg-green-100 text-green-800' :
                                                                order.status === 'Cancelled' ? 'bg-red-100 text-red-800' :
                                                                    order.status === 'Rejected' ? 'bg-orange-100 text-orange-800' :
                                                                        'bg-yellow-100 text-yellow-800'}`}>
                                                            {order.status}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex justify-between">
                                                    <div>
                                                        <p className="text-sm text-gray-900 font-medium">
                                                            {order.user ? order.user.name : 'Unknown User'}
                                                        </p>
                                                        <p className="text-sm text-gray-500">
                                                            Ordered: {new Date(order.createdAt).toLocaleDateString()} at {new Date(order.createdAt).toLocaleTimeString()}
                                                        </p>
                                                        {order.paymentDate && (
                                                            <p className="text-sm text-orange-600 font-medium">
                                                                Payment Date: {new Date(order.paymentDate).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
                                                            </p>
                                                        )}
                                                        <p className="text-sm text-gray-500 mt-1">
                                                            Type: <span className="font-medium capitalize">{order.type.replace('_', ' ')}</span>
                                                        </p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-sm font-bold text-gray-900">₹{order.totalAmount}</p>
                                                        <p className="text-xs text-gray-500">
                                                            Payment: {order.paymentStatus}
                                                        </p>
                                                        {(order.status === 'Cancelled' || order.status === 'Rejected') && (
                                                            <div className="mt-1 text-xs space-y-0.5">
                                                                <p className="text-red-600 font-medium">Fee: ₹{order.cancellationFee?.toFixed(0)}</p>
                                                                <p className="text-green-600 font-medium">Refund: ₹{order.refundAmount?.toFixed(0)}</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="mt-2 text-sm text-gray-600 bg-gray-50 p-2 rounded">
                                                    <p><strong>Items:</strong> {order.items.map(i => {
                                                        const dateStr = i.deliveryDate ? ` (${new Date(i.deliveryDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })})` : '';
                                                        return `${i.quantity}x ${i.name}${dateStr}`;
                                                    }).join(', ')}</p>
                                                    {/* Show menu items if available */}
                                                    {order.items.some(i => i.selectedItems) && (
                                                        <p className="mt-1 text-gray-700">
                                                            <strong>Details:</strong> {order.items
                                                                .filter(i => i.selectedItems)
                                                                .map(i => {
                                                                    const si = i.selectedItems;
                                                                    if (Array.isArray(si)) return si.map(s => s.name || s).join(', ');
                                                                    return si.name || '';
                                                                })
                                                                .filter(Boolean)
                                                                .join(' | ')}
                                                        </p>
                                                    )}
                                                    {order.deliveryAddress && (
                                                        <p className="mt-1">
                                                            <strong>Delivery Address:</strong> {order.deliveryAddress.street}, {order.deliveryAddress.city}, {order.deliveryAddress.zip}
                                                            {order.deliveryAddress.label && <span className="ml-2 text-xs bg-gray-200 px-1 rounded">{order.deliveryAddress.label}</span>}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Actions */}
                                            {order.status === 'Pending' && (
                                                <div className="ml-6 flex items-center space-x-3">
                                                    <button
                                                        onClick={() => handleUpdateOrderStatus(order._id, 'Confirmed')}
                                                        className="p-2 bg-green-100 text-green-600 rounded-full hover:bg-green-200 transition-colors"
                                                        title="Accept Order"
                                                    >
                                                        <Check className="h-5 w-5" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleUpdateOrderStatus(order._id, 'Rejected')}
                                                        className="p-2 bg-red-100 text-red-600 rounded-full hover:bg-red-200 transition-colors"
                                                        title="Reject Order"
                                                    >
                                                        <X className="h-5 w-5" />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                )}

                {/* --- Refunds Tab --- */}
                {activeTab === 'refunds' && (
                    <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                        <div className="px-4 py-5 sm:px-6 border-b border-gray-200 flex justify-between items-center bg-amber-50/30">
                            <h3 className="text-lg leading-6 font-medium text-gray-900 flex items-center">
                                <RefreshCw className="h-5 w-5 mr-3 text-amber-500" />
                                Processed Refunds
                            </h3>
                            <button onClick={fetchOrders} className="text-sm text-orange-600 hover:text-orange-800">Refresh</button>
                        </div>
                        {loadingOrders ? (
                            <div className="text-center py-10">Loading...</div>
                        ) : orders.filter(o => (parseFloat(o.refundAmount) || 0) > 0).length === 0 ? (
                            <div className="text-center py-10 text-gray-500">No refunds processed yet.</div>
                        ) : (
                            <ul className="divide-y divide-gray-200">
                                {orders.filter(o => (parseFloat(o.refundAmount) || 0) > 0).map((order) => (
                                    <li key={order._id} className="p-6 hover:bg-gray-50 transition-colors">
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center justify-between mb-4">
                                                    <div>
                                                        <p className="text-sm font-bold text-orange-600 uppercase tracking-widest mb-1">
                                                            Order #{order._id.slice(-6).toUpperCase()}
                                                        </p>
                                                        <h4 className="text-lg font-black text-gray-900">{order.user?.name || 'Unknown User'}</h4>
                                                        <p className="text-sm text-gray-500 font-medium italic">{order.user?.email}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="px-4 py-1 bg-red-50 text-red-600 text-xs font-black rounded-full border border-red-100 uppercase tracking-tighter">
                                                            Refund Processed
                                                        </span>
                                                        <p className="text-2xl font-black text-gray-900 mt-2">₹{order.refundAmount}</p>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                                    <div>
                                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Total Paid</p>
                                                        <p className="text-sm font-black text-gray-900">₹{order.totalAmount}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Deduction (Fee)</p>
                                                        <p className="text-sm font-black text-red-600">₹{order.cancellationFee || 0}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Order Type</p>
                                                        <p className="text-sm font-black text-gray-700 capitalize">{order.type.replace('_', ' ')}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Refund Date</p>
                                                        <p className="text-sm font-black text-gray-700">{new Date(order.updatedAt).toLocaleDateString()}</p>
                                                    </div>
                                                </div>
                                                <div className="mt-4 flex items-center text-xs text-gray-400 font-bold">
                                                    <Clock className="h-4 w-4 mr-2" />
                                                    Original Order Date: {new Date(order.createdAt).toLocaleDateString()}
                                                </div>
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                )}

                {/* --- Plans Tab --- */}
                {activeTab === 'plans' && (
                    <div>
                        <div className="flex justify-end mb-4">
                            <button
                                onClick={() => openPlanModal()}
                                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700"
                            >
                                <Plus className="h-5 w-5 mr-2" />
                                Add New Plan
                            </button>
                        </div>
                        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                            <ul className="divide-y divide-gray-200">
                                {plans.map((plan) => (
                                    <li key={plan._id} className="p-4 hover:bg-gray-50">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h3 className="text-lg font-medium text-gray-900">{plan.name}</h3>
                                                <p className="text-sm text-gray-500">{plan.description}</p>
                                                <p className="text-sm font-bold text-orange-600 mt-1">
                                                    ₹{plan.price} <span className="text-gray-400 font-normal">/ {plan.duration}</span>
                                                </p>
                                                <div className="mt-2 flex flex-wrap gap-2">
                                                    {plan.features.map((feature, idx) => (
                                                        <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                                            {feature}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="flex space-x-3">
                                                <button
                                                    onClick={() => openPlanModal(plan)}
                                                    className="text-blue-600 hover:text-blue-900"
                                                >
                                                    <Edit2 className="h-5 w-5" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeletePlan(plan._id)}
                                                    className="text-red-600 hover:text-red-900"
                                                >
                                                    <Trash2 className="h-5 w-5" />
                                                </button>
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                )}

                {/* --- Complaints Tab --- */}
                {activeTab === 'complaints' && (
                    <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                        <div className="px-4 py-5 sm:px-6 border-b border-gray-200 flex justify-between items-center">
                            <h3 className="text-lg leading-6 font-medium text-gray-900">User Complaints</h3>
                            <button onClick={fetchComplaints} className="text-sm text-orange-600 hover:text-orange-800">Refresh</button>
                        </div>
                        {loadingComplaints ? (
                            <div className="text-center py-10">Loading complaints...</div>
                        ) : complaints.length === 0 ? (
                            <div className="text-center py-10 text-gray-500">No complaints found.</div>
                        ) : (
                            <ul className="divide-y divide-gray-200">
                                {complaints.map((complaint) => (
                                    <li key={complaint._id} className="p-4 hover:bg-gray-50">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center justify-between mb-1">
                                                    <h4 className="text-sm font-bold text-gray-900">{complaint.subject}</h4>
                                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                                        ${complaint.status === 'Resolved' ? 'bg-green-100 text-green-800' :
                                                            complaint.status === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                                                                'bg-red-100 text-red-800'}`}>
                                                        {complaint.status}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-gray-600 mb-2">{complaint.description}</p>
                                                <div className="flex items-center text-xs text-gray-500 space-x-4">
                                                    <span>By: {complaint.user ? complaint.user.name : 'Unknown'}</span>
                                                    <span>{new Date(complaint.createdAt).toLocaleDateString()}</span>
                                                </div>
                                                {complaint.resolution && (
                                                    <div className="mt-3 bg-green-50 p-2 rounded border border-green-100">
                                                        <p className="text-xs font-bold text-green-800">Resolution:</p>
                                                        <p className="text-sm text-green-700">{complaint.resolution}</p>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="ml-4">
                                                <button
                                                    onClick={() => openReplyModal(complaint)}
                                                    className="text-orange-600 hover:text-orange-900 flex items-center text-sm font-medium"
                                                >
                                                    <MessageSquare className="h-4 w-4 mr-1" /> Reply
                                                </button>
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                )}

                {/* --- Discounts Tab --- */}
                {activeTab === 'discounts' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Create Coupon Form */}
                        <div className="md:col-span-1">
                            <div className="bg-white shadow sm:rounded-lg p-6">
                                <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Coupon</h3>
                                <form onSubmit={handleCreateCoupon} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Coupon Code</label>
                                        <input
                                            type="text"
                                            required
                                            value={couponFormData.code}
                                            onChange={(e) => setCouponFormData({ ...couponFormData, code: e.target.value.toUpperCase() })}
                                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                                            placeholder="e.g. SAVE10"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Discount Percentage (%)</label>
                                        <input
                                            type="number"
                                            required
                                            min="1"
                                            max="100"
                                            value={couponFormData.discountPercentage}
                                            onChange={(e) => setCouponFormData({ ...couponFormData, discountPercentage: e.target.value })}
                                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Expiry Date</label>
                                        <input
                                            type="date"
                                            required
                                            value={couponFormData.expiryDate}
                                            onChange={(e) => setCouponFormData({ ...couponFormData, expiryDate: e.target.value })}
                                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        className="w-full inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                                    >
                                        Create Coupon
                                    </button>
                                </form>
                            </div>
                        </div>

                        {/* Coupons List */}
                        <div className="md:col-span-2">
                            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                                <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
                                    <h3 className="text-lg leading-6 font-medium text-gray-900">Active Coupons</h3>
                                </div>
                                <ul className="divide-y divide-gray-200">
                                    {coupons.length === 0 ? (
                                        <li className="p-4 text-center text-gray-500">No coupons found.</li>
                                    ) : (
                                        coupons.map((coupon) => (
                                            <li key={coupon._id} className="p-4 hover:bg-gray-50 flex justify-between items-center">
                                                <div>
                                                    <div className="flex items-center">
                                                        <Tag className="h-5 w-5 text-orange-500 mr-2" />
                                                        <span className="text-lg font-bold text-gray-900">{coupon.code}</span>
                                                        <span className="ml-3 px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                                            {coupon.discountPercentage}% OFF
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-gray-500 mt-1">
                                                        Expires: {new Date(coupon.expiryDate).toLocaleDateString()}
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={() => handleDeleteCoupon(coupon._id)}
                                                    className="text-red-600 hover:text-red-900 p-2"
                                                    title="Delete Coupon"
                                                >
                                                    <Trash2 className="h-5 w-5" />
                                                </button>
                                            </li>
                                        ))
                                    )}
                                </ul>
                            </div>
                        </div>
                    </div>
                )
                }

                {/* --- Subscriptions Tab --- */}
                {
                    activeTab === 'subscriptions' && (
                        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                            <div className="px-4 py-5 sm:px-6 border-b border-gray-200 flex justify-between items-center">
                                <h3 className="text-lg leading-6 font-medium text-gray-900">Subscription Purchases</h3>
                                <button onClick={fetchSubscriptions} className="text-sm text-orange-600 hover:text-orange-800">Refresh</button>
                            </div>
                            {loadingSubscriptions ? (
                                <div className="text-center py-10">Loading subscriptions...</div>
                            ) : subscriptions.length === 0 ? (
                                <div className="text-center py-10 text-gray-500">No subscriptions found.</div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plan</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Meal Type</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Address</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Start Date</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">End Date</th>
                                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {subscriptions.map((sub) => (
                                                <tr key={sub._id}>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="text-sm font-medium text-gray-900">{sub.user ? sub.user.name : 'Unknown'}</div>
                                                        <div className="text-sm text-gray-500">{sub.user ? sub.user.email : ''}</div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="text-sm text-gray-900">{sub.plan ? sub.plan.name : 'Unknown Plan'}</div>
                                                        <div className="text-xs text-gray-500">{sub.plan ? sub.plan.duration : ''}</div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800 capitalize">
                                                            {sub.mealType === 'both' ? 'Lunch + Dinner' : sub.mealType}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 min-w-[200px]">
                                                        <div className="text-sm text-gray-900">
                                                            {(() => {
                                                                const { lunchAddress: l, dinnerAddress: d, mealType: type } = sub;
                                                                const isDual = l?.street && d?.street && (l.street !== d.street || l.city !== d.city);

                                                                if (type === 'both' && isDual) {
                                                                    return (
                                                                        <div className="flex flex-col gap-2 py-1">
                                                                            <CompactAddress address={l} label="L" />
                                                                            <div className="border-t border-gray-100 pt-1">
                                                                                <CompactAddress address={d} label="D" />
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                }

                                                                const label = type === 'both' ? 'LD' : (type === 'lunch' ? 'L' : 'D');
                                                                const addr = (type === 'dinner' ? d : l) || l || d;

                                                                return addr?.street ? (
                                                                    <div className="py-1">
                                                                        <CompactAddress address={addr} label={label} />
                                                                    </div>
                                                                ) : <span className="text-gray-400 text-xs italic">No address set</span>;
                                                            })()}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                                            ${sub.status === 'Active' ? 'bg-green-100 text-green-800' :
                                                                sub.status === 'Upgraded' ? 'bg-blue-100 text-blue-800' :
                                                                    'bg-red-100 text-red-800'}`}>
                                                            {sub.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                        {new Date(sub.startDate).toLocaleDateString()}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                        {new Date(sub.endDate).toLocaleDateString()}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                        {sub.status === 'Active' && (
                                                            <button
                                                                onClick={() => handleCancelSubscription(sub._id)}
                                                                className="text-red-600 hover:text-red-900"
                                                            >
                                                                Cancel
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                {/* --- Menu Management Tab --- */}
                {activeTab === 'menus' && (
                    <div className="space-y-6">
                        {/* Filters */}
                        <div className="bg-white shadow rounded-lg p-6 flex flex-col md:flex-row gap-4 items-end">
                            <div className="w-full md:w-1/3">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Select Date</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Calendar className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <input
                                        type="date"
                                        value={selectedDate}
                                        onChange={(e) => setSelectedDate(e.target.value)}
                                        className="pl-10 block w-full border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                                    />
                                </div>
                            </div>
                            <div className="w-full md:w-1/3">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Select Plan</label>
                                <select
                                    value={selectedPlanType}
                                    onChange={(e) => setSelectedPlanType(e.target.value)}
                                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                                >
                                    <option value="Basic">Basic Plan</option>
                                    <option value="Premium">Premium Plan</option>
                                    <option value="Exotic">Exotic Plan</option>
                                </select>
                            </div>
                            <div className="w-full md:w-1/3">
                                <button
                                    onClick={fetchMenu}
                                    className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-gray-800 hover:bg-gray-900"
                                >
                                    <RefreshCw className={`h-4 w-4 mr-2 ${loadingMenu ? 'animate-spin' : ''}`} /> Refresh Menu
                                </button>
                            </div>
                        </div>

                        {/* Menu Display */}
                        <div className="bg-white shadow rounded-lg overflow-hidden">
                            <div className="px-4 py-5 sm:px-6 border-b border-gray-200 flex justify-between items-center">
                                <h3 className="text-lg leading-6 font-medium text-gray-900">
                                    Menu for {new Date(selectedDate).toLocaleDateString()} ({selectedPlanType})
                                </h3>
                                {!dailyMenu && (
                                    <button
                                        onClick={openMenuModal}
                                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700"
                                    >
                                        <Plus className="h-4 w-4 mr-2" /> Add Menu
                                    </button>
                                )}
                            </div>

                            {loadingMenu ? (
                                <div className="text-center py-10">Loading menu...</div>
                            ) : !dailyMenu ? (
                                <div className="text-center py-10 text-gray-500">
                                    <Utensils className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                                    <p>No menu found for this date and plan.</p>
                                    <button onClick={openMenuModal} className="mt-2 text-orange-600 hover:text-orange-800 font-medium">
                                        Create Menu Now
                                    </button>
                                </div>
                            ) : (
                                <div className="p-6">
                                    <div className="flex justify-end space-x-3 mb-4">
                                        <button
                                            onClick={openMenuModal}
                                            className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                                        >
                                            <Edit2 className="h-4 w-4 mr-2 text-blue-500" /> Edit
                                        </button>
                                        <button
                                            onClick={handleDeleteMenu}
                                            className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50"
                                        >
                                            <Trash2 className="h-4 w-4 mr-2 text-red-500" /> Delete
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="bg-orange-50 rounded-lg p-5 border border-orange-100">
                                            <h4 className="text-lg font-bold text-orange-800 mb-3 flex items-center">
                                                <span className="bg-orange-200 p-1 rounded mr-2">☀️</span> Lunch
                                            </h4>
                                            <ul className="list-disc list-inside space-y-1 text-gray-700">
                                                {dailyMenu.items.lunch.map((item, idx) => (
                                                    <li key={idx}>{item}</li>
                                                ))}
                                            </ul>
                                        </div>
                                        <div className="bg-indigo-50 rounded-lg p-5 border border-indigo-100">
                                            <h4 className="text-lg font-bold text-indigo-800 mb-3 flex items-center">
                                                <span className="bg-indigo-200 p-1 rounded mr-2">🌙</span> Dinner
                                            </h4>
                                            <ul className="list-disc list-inside space-y-1 text-gray-700">
                                                {dailyMenu.items.dinner.map((item, idx) => (
                                                    <li key={idx}>{item}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                    {dailyMenu.isWeekendSpecial && (
                                        <div className="mt-4 bg-yellow-50 border-l-4 border-yellow-400 p-4">
                                            <div className="flex">
                                                <div className="flex-shrink-0">
                                                    <Tag className="h-5 w-5 text-yellow-400" />
                                                </div>
                                                <div className="ml-3">
                                                    <p className="text-sm text-yellow-700">
                                                        This is marked as a <strong>Weekend Special</strong> menu!
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* --- Menu Modal --- */}
                {isMenuModalOpen && (
                    <div className="fixed inset-0 z-[999] overflow-y-auto">
                        <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setIsMenuModalOpen(false)}></div>
                            <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
                            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                                <form onSubmit={handleMenuSubmit}>
                                    <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                                        <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                                            {dailyMenu ? 'Edit Menu' : 'Add New Menu'}
                                        </h3>
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700">Date</label>
                                                <input
                                                    type="date"
                                                    disabled={!!dailyMenu}
                                                    value={selectedDate}
                                                    onChange={(e) => setSelectedDate(e.target.value)}
                                                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm bg-gray-100 sm:text-sm"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700">Plan Type</label>
                                                <input
                                                    type="text"
                                                    disabled
                                                    value={selectedPlanType}
                                                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm bg-gray-100 sm:text-sm"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700">Lunch Items (comma separated)</label>
                                                <textarea
                                                    rows={3}
                                                    required
                                                    value={menuFormData.lunch}
                                                    onChange={(e) => setMenuFormData({ ...menuFormData, lunch: e.target.value })}
                                                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                                                    placeholder="e.g. Dal Makhani, Paneer Tikka, Rice, Roti"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700">Dinner Items (comma separated)</label>
                                                <textarea
                                                    rows={3}
                                                    required
                                                    value={menuFormData.dinner}
                                                    onChange={(e) => setMenuFormData({ ...menuFormData, dinner: e.target.value })}
                                                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                                                    placeholder="e.g. Mixed Veg, Chapati, Salad, Kheer"
                                                />
                                            </div>
                                            <div className="flex items-center">
                                                <input
                                                    id="isWeekendSpecial"
                                                    type="checkbox"
                                                    checked={menuFormData.isWeekendSpecial}
                                                    onChange={(e) => setMenuFormData({ ...menuFormData, isWeekendSpecial: e.target.checked })}
                                                    className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                                                />
                                                <label htmlFor="isWeekendSpecial" className="ml-2 block text-sm text-gray-900">
                                                    Mark as Weekend Special
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                                        <button
                                            type="submit"
                                            className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-orange-600 text-base font-medium text-white hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 sm:ml-3 sm:w-auto sm:text-sm"
                                        >
                                            Save Menu
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setIsMenuModalOpen(false)}
                                            className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- Plan Modal --- */}
                {isPlanModalOpen && (
                    <div className="fixed inset-0 z-[999] overflow-y-auto">
                        <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={closePlanModal}></div>
                            <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
                            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                                <form onSubmit={handlePlanSubmit}>
                                    <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                                        <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                                            {editingPlan ? 'Edit Plan' : 'Create New Plan'}
                                        </h3>
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700">Plan Name</label>
                                                <select
                                                    value={planFormData.name}
                                                    onChange={(e) => setPlanFormData({ ...planFormData, name: e.target.value })}
                                                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                                                >
                                                    <option value="Basic">Basic</option>
                                                    <option value="Premium">Premium</option>
                                                    <option value="Exotic">Exotic</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700">Price (₹)</label>
                                                <input
                                                    type="number"
                                                    required
                                                    value={planFormData.price}
                                                    onChange={(e) => setPlanFormData({ ...planFormData, price: e.target.value })}
                                                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700">Duration</label>
                                                <select
                                                    value={planFormData.duration}
                                                    onChange={(e) => setPlanFormData({ ...planFormData, duration: e.target.value })}
                                                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                                                >
                                                    <option value="monthly">Monthly</option>
                                                    <option value="yearly">Yearly</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700">Description</label>
                                                <input
                                                    type="text"
                                                    value={planFormData.description}
                                                    onChange={(e) => setPlanFormData({ ...planFormData, description: e.target.value })}
                                                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700">Features (comma separated)</label>
                                                <textarea
                                                    rows={3}
                                                    value={planFormData.features}
                                                    onChange={(e) => setPlanFormData({ ...planFormData, features: e.target.value })}
                                                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                                        <button
                                            type="submit"
                                            className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-orange-600 text-base font-medium text-white hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 sm:ml-3 sm:w-auto sm:text-sm"
                                        >
                                            Save
                                        </button>
                                        <button
                                            type="button"
                                            onClick={closePlanModal}
                                            className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- Reply Modal --- */}
                {isReplyModalOpen && (
                    <div className="fixed inset-0 z-[999] overflow-y-auto">
                        <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={closeReplyModal}></div>
                            <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
                            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                                <form onSubmit={handleReplySubmit}>
                                    <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                                        <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                                            Reply to Complaint
                                        </h3>
                                        <div className="space-y-4">
                                            <p className="text-sm text-gray-500">
                                                <strong>Subject:</strong> {selectedComplaint?.subject}
                                            </p>
                                            <p className="text-sm text-gray-500">
                                                <strong>Description:</strong> {selectedComplaint?.description}
                                            </p>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700">Resolution / Reply</label>
                                                <textarea
                                                    rows={4}
                                                    required
                                                    value={replyText}
                                                    onChange={(e) => setReplyText(e.target.value)}
                                                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                                                    placeholder="Enter your reply here..."
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                                        <button
                                            type="submit"
                                            className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-orange-600 text-base font-medium text-white hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 sm:ml-3 sm:w-auto sm:text-sm"
                                        >
                                            Send Reply
                                        </button>
                                        <button
                                            type="button"
                                            onClick={closeReplyModal}
                                            className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminDashboard;
