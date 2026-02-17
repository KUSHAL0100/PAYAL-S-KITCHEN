import React, { useState, useContext, useMemo } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Star, ShoppingCart, Plus, Minus } from 'lucide-react';
import CartContext from '../context/CartContext';
import NotificationContext from '../context/NotificationContext';
import { useNavigate } from 'react-router-dom';
import { validateOrderTime } from '../utils/orderUtils';
import Modal from '../components/Modal';
import { useTodaysMenu, useWeeklyMenu, useDateMenu } from '../hooks/useMenu';

const Menu = () => {
    const [selectedPlan, setSelectedPlan] = useState('Basic');
    const [currentDate, setCurrentDate] = useState(new Date());

    // Single Tiffin Order State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [orderMealTime, setOrderMealTime] = useState('Lunch');
    const [orderQuantity, setOrderQuantity] = useState(1);
    const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);

    const { addToCart } = useContext(CartContext);
    const { showNotification } = useContext(NotificationContext);
    const navigate = useNavigate();

    // TanStack Query Hooks
    const { data: todaysMenu, isLoading: loadingToday } = useTodaysMenu(selectedPlan);
    const { data: weeklyMenu = [], isLoading: loadingWeekly } = useWeeklyMenu(selectedPlan, currentDate);
    const { data: selectedDateMenu, isLoading: loadingSelectedMenu } = useDateMenu(selectedPlan, orderDate, isModalOpen);

    const loading = loadingToday || loadingWeekly;

    const PLAN_PRICES = {
        'Basic': 120,
        'Premium': 150,
        'Exotic': 200
    };

    const handlePrevMonth = () => {
        const newDate = new Date(currentDate);
        newDate.setMonth(newDate.getMonth() - 1);
        setCurrentDate(newDate);
    };

    const handleNextMonth = () => {
        const newDate = new Date(currentDate);
        newDate.setMonth(newDate.getMonth() + 1);
        setCurrentDate(newDate);
    };

    const formatMonthYear = (date) => {
        return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    };

    const getDayName = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', { weekday: 'long' });
    };

    const getDayIndex = (dateString) => {
        return new Date(dateString).getDay();
    }

    const sortedMenu = weeklyMenu; // Already sorted in hook

    // Calculate total amount using useMemo to avoid duplication
    const totalOrderAmount = useMemo(() => {
        const price = PLAN_PRICES[selectedPlan];
        return (price * orderQuantity);
    }, [selectedPlan, orderQuantity]);

    const handleOrderNow = () => {
        setOrderDate(new Date().toISOString().split('T')[0]); // Reset to today
        setIsModalOpen(true);
    };

    const handleAddToCart = () => {
        // Validate order time using utility function
        const validation = validateOrderTime(orderDate, orderMealTime);

        if (!validation.isValid) {
            showNotification(validation.errorMessage, 'error');
            return;
        }

        // Use selected date's menu instead of today's menu
        if (!selectedDateMenu) {
            showNotification('Menu not available for selected date', 'error');
            return;
        }

        const price = PLAN_PRICES[selectedPlan];

        const orderItem = {
            id: `single_${Date.now()}`, // Unique ID
            type: 'single_tiffin',
            name: `${selectedPlan} Tiffin (${orderMealTime})`,
            planType: selectedPlan,
            mealTime: orderMealTime,
            quantity: parseInt(orderQuantity),
            price: price,
            totalAmount: (price * parseInt(orderQuantity)),
            menuItems: selectedDateMenu.items[orderMealTime.toLowerCase()],
            deliveryDate: orderDate // Pass selected date
        };

        const result = addToCart(orderItem);

        if (result && !result.success) {
            showNotification(result.message, 'error');
            return;
        }

        setIsModalOpen(false);
        showNotification('Tiffin added to cart!', 'success');
        navigate('/cart');
    };

    return (
        <div className="bg-white relative">
            {/* Header */}
            <div className="bg-orange-50 py-12">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
                        Weekly Menu
                    </h2>
                    <p className="mt-4 text-xl text-gray-500">
                        Fixed weekly menu for the entire month.
                    </p>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Plan Tabs */}
                <div className="flex justify-center mb-8">
                    <div className="flex space-x-4 bg-gray-100 p-1 rounded-lg">
                        {['Basic', 'Premium', 'Exotic'].map((plan) => (
                            <button
                                key={plan}
                                onClick={() => setSelectedPlan(plan)}
                                className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${selectedPlan === plan
                                    ? 'bg-white text-orange-600 shadow'
                                    : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                {plan}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Today's Special Highlight */}
                {todaysMenu && (
                    <div className="mb-12 bg-gradient-to-r from-orange-500 to-red-600 rounded-2xl shadow-xl overflow-hidden text-white relative">
                        <div className="px-6 py-8 sm:p-10 sm:pb-6">
                            <div className="flex flex-col md:flex-row items-center justify-between">
                                <div>
                                    <h3 className="text-2xl font-extrabold tracking-tight sm:text-3xl flex items-center">
                                        <Star className="h-8 w-8 text-yellow-300 mr-3" fill="currentColor" />
                                        Today's Menu ({getDayName(todaysMenu.date)})
                                    </h3>
                                    <p className="mt-2 text-lg text-orange-100">
                                        Freshly prepared for you today. Don't miss out!
                                    </p>
                                </div>
                                <div className="mt-4 md:mt-0 flex flex-col items-end space-y-2">
                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-white text-orange-800">
                                        {selectedPlan} Plan
                                    </span>
                                    <button
                                        onClick={handleOrderNow}
                                        className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-orange-700 bg-white hover:bg-orange-50 shadow-sm"
                                    >
                                        Order Now
                                    </button>
                                </div>
                            </div>
                            <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
                                <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
                                    <h4 className="font-bold text-yellow-200 uppercase tracking-wider text-sm">Lunch</h4>
                                    <p className="mt-2 text-white font-medium">{todaysMenu.items.lunch.join(', ')}</p>
                                </div>
                                <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
                                    <h4 className="font-bold text-yellow-200 uppercase tracking-wider text-sm">Dinner</h4>
                                    <p className="mt-2 text-white font-medium">{todaysMenu.items.dinner.join(', ')}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Month Navigation */}
                <div className="flex justify-between items-center mb-6">
                    <button
                        onClick={handlePrevMonth}
                        className="p-2 rounded-full hover:bg-gray-100 text-gray-600 flex items-center"
                    >
                        <ChevronLeft className="h-5 w-5 mr-1" /> Previous Month
                    </button>
                    <span className="text-lg font-medium text-gray-900 flex items-center">
                        <Calendar className="h-5 w-5 mr-2 text-orange-500" />
                        {formatMonthYear(currentDate)}
                    </span>
                    <button
                        onClick={handleNextMonth}
                        className="p-2 rounded-full hover:bg-gray-100 text-gray-600 flex items-center"
                    >
                        Next Month <ChevronRight className="h-5 w-5 ml-1" />
                    </button>
                </div>

                {/* Menu Grid */}
                {loading ? (
                    <div className="text-center py-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
                        <p className="mt-4 text-gray-500">Loading deliciousness...</p>
                    </div>
                ) : sortedMenu.length === 0 ? (
                    <div className="text-center py-20 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                        <p className="text-gray-500 text-lg">No menu available for this month yet.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {sortedMenu.map((dayMenu) => (
                            <div
                                key={dayMenu._id}
                                className={`rounded-lg shadow-lg overflow-hidden border ${dayMenu.isWeekendSpecial ? 'border-orange-200 bg-orange-50' : 'border-gray-200 bg-white'
                                    }`}
                            >
                                <div className="px-6 py-4 border-b border-gray-100">
                                    <h3 className="text-lg font-bold text-gray-900">
                                        {getDayName(dayMenu.date)}
                                    </h3>
                                    {dayMenu.isWeekendSpecial && (
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 mt-2">
                                            Weekend Special
                                        </span>
                                    )}
                                </div>
                                <div className="p-6 space-y-4">
                                    <div>
                                        <h4 className="text-sm font-semibold text-orange-600 uppercase tracking-wide">Lunch</h4>
                                        <p className="mt-1 text-gray-600">{dayMenu.items.lunch.join(', ')}</p>
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-semibold text-orange-600 uppercase tracking-wide">Dinner</h4>
                                        <p className="mt-1 text-gray-600">{dayMenu.items.dinner.join(', ')}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Order Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={`Order Tiffin (${selectedPlan})`}
                maxWidth="sm:max-w-md"
            >
                <div className="space-y-6">
                    {/* Date Selection */}
                    <div>
                        <label className="block text-xs font-black text-gray-400 mb-2 uppercase tracking-widest">Select Date</label>
                        <input
                            type="date"
                            value={orderDate}
                            min={new Date().toISOString().split('T')[0]}
                            onChange={(e) => setOrderDate(e.target.value)}
                            className="block w-full border-gray-200 rounded-2xl shadow-sm focus:ring-orange-500 focus:border-orange-500 sm:text-sm p-4 bg-gray-50/50 font-bold"
                        />
                    </div>

                    {/* Meal Time Selection */}
                    <div>
                        <label className="block text-xs font-black text-gray-400 mb-2 uppercase tracking-widest">Select Meal</label>
                        <div className="flex space-x-3">
                            {['Lunch', 'Dinner'].map(meal => (
                                <label
                                    key={meal}
                                    className={`flex-1 border-2 rounded-2xl p-4 cursor-pointer flex flex-col items-center justify-center transition-all duration-300 ${orderMealTime === meal ? 'border-orange-500 bg-orange-50/50 ring-1 ring-orange-500' : 'border-gray-100 bg-white hover:border-gray-200'}`}
                                >
                                    <input
                                        type="radio"
                                        name="mealTime"
                                        value={meal}
                                        checked={orderMealTime === meal}
                                        onChange={(e) => setOrderMealTime(e.target.value)}
                                        className="sr-only"
                                    />
                                    <span className={`text-sm font-black ${orderMealTime === meal ? 'text-orange-900' : 'text-gray-900'}`}>{meal}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Menu Preview */}
                    {loadingSelectedMenu ? (
                        <div className="text-center py-4 text-xs font-bold text-gray-400 animate-pulse uppercase tracking-widest">Fetching menu details...</div>
                    ) : selectedDateMenu ? (
                        <div className="bg-orange-50/50 border border-orange-100 rounded-2xl p-5 shadow-inner">
                            <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest mb-2">
                                Menu Preview ({new Date(orderDate).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' })})
                            </p>
                            <p className="text-sm text-gray-800 font-bold leading-relaxed">
                                {selectedDateMenu.items[orderMealTime.toLowerCase()].join(', ')}
                            </p>
                        </div>
                    ) : (
                        <div className="bg-red-50/50 border border-red-100 rounded-2xl p-5 shadow-inner">
                            <p className="text-sm text-red-700 font-bold">Menu not available for this date.</p>
                        </div>
                    )}

                    {/* Validation Error */}
                    {(() => {
                        const validation = validateOrderTime(orderDate, orderMealTime);
                        if (!validation.isValid) {
                            return (
                                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-2xl">
                                    <p className="text-xs text-red-700 font-bold">{validation.errorMessage}</p>
                                </div>
                            );
                        }
                        return null;
                    })()}

                    <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                        <label className="block text-xs font-black text-gray-500 mb-3 uppercase tracking-widest">Number of Persons</label>
                        <div className="grid grid-cols-5 gap-2">
                            {Array.from({ length: 19 }, (_, i) => i + 1).map(num => (
                                <button
                                    key={num}
                                    type="button"
                                    onClick={() => setOrderQuantity(num)}
                                    className={`py-2 rounded-lg text-sm font-black transition-all duration-200 ${orderQuantity === num
                                        ? 'bg-orange-600 text-white shadow-md transform scale-105'
                                        : 'bg-white text-gray-700 border border-gray-200 hover:border-orange-300 hover:bg-orange-50'
                                        }`}
                                >
                                    {num}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Price Summary */}
                    <div className="bg-gray-900 text-white p-6 rounded-3xl shadow-2xl">
                        <div className="flex justify-between items-center text-xs opacity-60 mb-2 font-bold uppercase tracking-widest">
                            <span>{orderQuantity} Tiffin x ₹{PLAN_PRICES[selectedPlan]}</span>
                            <span>+ Delivery Fee (in cart)</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-lg font-black uppercase tracking-tight">Total Payable</span>
                            <span className="text-3xl font-black text-orange-400">₹{totalOrderAmount}</span>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={handleAddToCart}
                        className="w-full inline-flex justify-center items-center rounded-2xl border border-transparent shadow-xl px-8 py-4 bg-orange-600 text-base font-black text-white hover:bg-orange-700 transition-all duration-300 transform active:scale-95"
                    >
                        <ShoppingCart className="h-5 w-5 mr-3" />
                        Add to Cart
                    </button>
                </div>
            </Modal >
        </div >
    );
};

export default Menu;
