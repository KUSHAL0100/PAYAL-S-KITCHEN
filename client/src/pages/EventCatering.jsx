import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { ShoppingCart, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import CartContext from '../context/CartContext';
import NotificationContext from '../context/NotificationContext';

const EventCatering = () => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedItems, setSelectedItems] = useState([]);
    const [guestCount, setGuestCount] = useState(20);
    const navigate = useNavigate();
    const { user } = useContext(AuthContext);
    const { addToCart } = useContext(CartContext);
    const { showNotification } = useContext(NotificationContext);

    useEffect(() => {
        const fetchItems = async () => {
            try {
                const res = await axios.get('http://127.0.0.1:5000/api/event-items');
                setItems(res.data);
                setLoading(false);
            } catch (error) {
                console.error('Error fetching event items:', error);
                setLoading(false);
                showNotification('Failed to load event items', 'error');
            }
        };
        fetchItems();
    }, []);

    const handleToggleItem = (item) => {
        if (selectedItems.find(i => i._id === item._id)) {
            setSelectedItems(selectedItems.filter(i => i._id !== item._id));
        } else {
            setSelectedItems([...selectedItems, item]);
        }
    };

    const calculateTotalPerPlate = () => {
        return selectedItems.reduce((total, item) => total + item.price, 0);
    };

    const calculateGrandTotal = () => {
        return (calculateTotalPerPlate() * guestCount);
    };

    const [eventDate, setEventDate] = useState('');

    const handleAddToCart = () => {
        if (!eventDate) {
            showNotification('Please select an event date.', 'error');
            return;
        }

        // 48-Hour Validation
        const now = new Date();
        const targetDate = new Date(eventDate);
        targetDate.setHours(0, 0, 0, 0); // Start of the event day

        const diffInHours = (targetDate - now) / 1000 / 60 / 60;

        if (diffInHours < 48) {
            showNotification('Event orders must be placed at least 48 hours in advance.', 'error');
            return;
        }

        if (guestCount < 20 || guestCount > 50) {
            showNotification('Guest count must be between 20 and 50.', 'error');
            return;
        }
        if (selectedItems.length === 0) {
            showNotification('Please select at least one item.', 'error');
            return;
        }

        const eventOrder = {
            id: `event_${Date.now()}`, // Unique ID for cart operations
            type: 'event',
            items: selectedItems,
            guestCount: parseInt(guestCount),
            pricePerPlate: calculateTotalPerPlate(),
            totalAmount: calculateGrandTotal(),
            deliveryDate: eventDate // Pass selected date
        };

        // Add to cart via Context
        addToCart(eventOrder);

        showNotification('Event order added to cart!', 'success');
        navigate('/cart');
    };

    const groupedItems = items.reduce((acc, item) => {
        if (!acc[item.category]) acc[item.category] = [];
        acc[item.category].push(item);
        return acc;
    }, {});

    if (loading) return <div className="text-center py-20">Loading menu...</div>;

    return (
        <div className="bg-gray-50 min-h-screen py-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-12">
                    <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">Event Catering</h2>
                    <p className="mt-4 text-xl text-gray-500">Customize your menu for your special occasion.</p>
                </div>

                <div className="flex flex-col lg:flex-row gap-8">
                    {/* Menu Selection */}
                    <div className="lg:w-2/3 space-y-8">
                        {Object.keys(groupedItems).map(category => (
                            <div key={category} className="bg-white rounded-lg shadow overflow-hidden">
                                <div className="bg-orange-600 px-6 py-4">
                                    <h3 className="text-lg font-bold text-white">{category}</h3>
                                </div>
                                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {groupedItems[category].map(item => (
                                        <div
                                            key={item._id}
                                            onClick={() => handleToggleItem(item)}
                                            className={`border rounded-lg p-4 cursor-pointer transition-all ${selectedItems.find(i => i._id === item._id)
                                                ? 'border-orange-500 bg-orange-50 ring-2 ring-orange-500'
                                                : 'border-gray-200 hover:border-orange-300'
                                                }`}
                                        >
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <h4 className="font-medium text-gray-900">{item.name}</h4>
                                                    <p className="text-sm text-gray-500 mt-1">{item.description}</p>
                                                </div>
                                                <span className="font-semibold text-gray-900">₹{item.price}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Summary Card */}
                    <div className="lg:w-1/3">
                        <div className="bg-white rounded-lg shadow p-6 sticky top-6">
                            <h3 className="text-lg font-bold text-gray-900 mb-4">Order Summary</h3>

                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Event Date
                                </label>
                                <input
                                    type="date"
                                    min={new Date().toISOString().split('T')[0]}
                                    value={eventDate}
                                    onChange={(e) => setEventDate(e.target.value)}
                                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500 sm:text-sm mb-4"
                                />

                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Guest Count (20 - 50)
                                </label>
                                <input
                                    type="number"
                                    min="20"
                                    max="50"
                                    value={guestCount}
                                    onChange={(e) => setGuestCount(e.target.value)}
                                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                                />
                            </div>

                            <div className="space-y-3 border-t border-gray-200 pt-4">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Selected Items:</span>
                                    <span className="font-medium">{selectedItems.length}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Price Per Plate:</span>
                                    <span className="font-medium">₹{calculateTotalPerPlate()}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Subtotal ({guestCount} guests):</span>
                                    <span className="font-medium">₹{calculateTotalPerPlate() * guestCount}</span>
                                </div>
                                <div className="flex justify-between text-lg font-bold border-t border-gray-200 pt-3">
                                    <span>Total:</span>
                                    <span className="text-orange-600">₹{calculateGrandTotal()}</span>
                                </div>
                            </div>

                            <button
                                onClick={handleAddToCart}
                                className="mt-6 w-full flex justify-center items-center px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-orange-600 hover:bg-orange-700"
                            >
                                <ShoppingCart className="h-5 w-5 mr-2" />
                                Add to Cart
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EventCatering;
