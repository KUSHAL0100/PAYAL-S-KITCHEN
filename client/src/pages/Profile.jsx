import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import AuthContext from '../context/AuthContext';
import NotificationContext from '../context/NotificationContext';
import { User, Mail, Phone, MapPin, Lock, Save, Plus, Trash2 } from 'lucide-react';

const Profile = () => {
    const { user, setUser } = useContext(AuthContext);
    const { showNotification } = useContext(NotificationContext);
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: '',
        addresses: []
    });

    useEffect(() => {
        if (user) {
            setFormData({
                name: user.name || '',
                email: user.email || '',
                phone: user.phone || '',
                password: '',
                confirmPassword: '',
                addresses: user.addresses || []
            });
        }
    }, [user]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleAddressChange = (index, field, value) => {
        const newAddresses = [...formData.addresses];
        newAddresses[index][field] = value;
        setFormData({ ...formData, addresses: newAddresses });
    };

    const addAddress = () => {
        setFormData({
            ...formData,
            addresses: [...formData.addresses, { label: '', street: '', city: '', zip: '' }]
        });
    };

    const removeAddress = (index) => {
        const newAddresses = formData.addresses.filter((_, i) => i !== index);
        setFormData({ ...formData, addresses: newAddresses });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (formData.password !== formData.confirmPassword) {
            showNotification('Passwords do not match', 'error');
            return;
        }

        setLoading(true);
        try {
            const config = {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                },
            };

            const payload = {
                name: formData.name,
                email: formData.email,
                phone: formData.phone,
                addresses: formData.addresses
            };

            if (formData.password) {
                payload.password = formData.password;
            }

            const { data } = await axios.put('http://localhost:5000/api/auth/profile', payload, config);

            setUser(data);
            localStorage.setItem('user', JSON.stringify(data));
            showNotification('Profile updated successfully', 'success');
            setFormData(prev => ({ ...prev, password: '', confirmPassword: '' }));
        } catch (error) {
            console.error('Error updating profile:', error);
            showNotification(error.response?.data?.message || 'Failed to update profile', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
                <div className="bg-white shadow rounded-lg overflow-hidden">
                    <div className="px-4 py-5 sm:px-6 bg-orange-600">
                        <h3 className="text-lg leading-6 font-medium text-white flex items-center">
                            <User className="mr-2 h-5 w-5" />
                            My Profile
                        </h3>
                        <p className="mt-1 max-w-2xl text-sm text-orange-100">
                            Manage your personal information and addresses.
                        </p>
                    </div>
                    <div className="px-4 py-5 sm:p-6">
                        <form onSubmit={handleSubmit} className="space-y-8">
                            {/* Personal Info */}
                            <div>
                                <h4 className="text-lg font-medium text-gray-900 border-b pb-2 mb-4">Personal Information</h4>
                                <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                                    <div className="sm:col-span-3">
                                        <label className="block text-sm font-medium text-gray-700">Full Name</label>
                                        <div className="mt-1 relative rounded-md shadow-sm">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <User className="h-5 w-5 text-gray-400" />
                                            </div>
                                            <input
                                                type="text"
                                                name="name"
                                                value={formData.name}
                                                onChange={handleChange}
                                                className="focus:ring-orange-500 focus:border-orange-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
                                                placeholder="John Doe"
                                            />
                                        </div>
                                    </div>

                                    <div className="sm:col-span-3">
                                        <label className="block text-sm font-medium text-gray-700">Email Address</label>
                                        <div className="mt-1 relative rounded-md shadow-sm">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <Mail className="h-5 w-5 text-gray-400" />
                                            </div>
                                            <input
                                                type="email"
                                                name="email"
                                                value={formData.email}
                                                onChange={handleChange}
                                                className="focus:ring-orange-500 focus:border-orange-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
                                                placeholder="john@example.com"
                                            />
                                        </div>
                                    </div>

                                    <div className="sm:col-span-3">
                                        <label className="block text-sm font-medium text-gray-700">Phone Number</label>
                                        <div className="mt-1 relative rounded-md shadow-sm">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <Phone className="h-5 w-5 text-gray-400" />
                                            </div>
                                            <input
                                                type="text"
                                                name="phone"
                                                value={formData.phone}
                                                onChange={handleChange}
                                                className="focus:ring-orange-500 focus:border-orange-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
                                                placeholder="+91 9876543210"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Addresses */}
                            <div>
                                <div className="flex justify-between items-center border-b pb-2 mb-4">
                                    <h4 className="text-lg font-medium text-gray-900">Saved Addresses</h4>
                                    <button
                                        type="button"
                                        onClick={addAddress}
                                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-orange-700 bg-orange-100 hover:bg-orange-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                                    >
                                        <Plus className="mr-1 h-4 w-4" />
                                        Add Address
                                    </button>
                                </div>

                                {formData.addresses.length === 0 ? (
                                    <p className="text-gray-500 text-sm italic">No addresses saved yet. Add one for easier checkout.</p>
                                ) : (
                                    <div className="space-y-4">
                                        {formData.addresses.map((addr, index) => (
                                            <div key={index} className="bg-gray-50 p-4 rounded-lg border border-gray-200 relative">
                                                <button
                                                    type="button"
                                                    onClick={() => removeAddress(index)}
                                                    className="absolute top-2 right-2 text-gray-400 hover:text-red-500"
                                                >
                                                    <Trash2 className="h-5 w-5" />
                                                </button>
                                                <div className="grid grid-cols-1 gap-y-4 gap-x-4 sm:grid-cols-6">
                                                    <div className="sm:col-span-2">
                                                        <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider">Label</label>
                                                        <input
                                                            type="text"
                                                            value={addr.label}
                                                            onChange={(e) => handleAddressChange(index, 'label', e.target.value)}
                                                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                                                            placeholder="e.g. Home, Work"
                                                        />
                                                    </div>
                                                    <div className="sm:col-span-4">
                                                        <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider">Street Address</label>
                                                        <input
                                                            type="text"
                                                            value={addr.street}
                                                            onChange={(e) => handleAddressChange(index, 'street', e.target.value)}
                                                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                                                            placeholder="123 Main St"
                                                        />
                                                    </div>
                                                    <div className="sm:col-span-3">
                                                        <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider">City</label>
                                                        <input
                                                            type="text"
                                                            value={addr.city}
                                                            onChange={(e) => handleAddressChange(index, 'city', e.target.value)}
                                                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                                                            placeholder="Mumbai"
                                                        />
                                                    </div>
                                                    <div className="sm:col-span-3">
                                                        <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider">ZIP Code</label>
                                                        <input
                                                            type="text"
                                                            value={addr.zip}
                                                            onChange={(e) => handleAddressChange(index, 'zip', e.target.value)}
                                                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                                                            placeholder="400001"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Password Change */}
                            <div>
                                <h4 className="text-lg font-medium text-gray-900 border-b pb-2 mb-4">Change Password (Optional)</h4>
                                <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                                    <div className="sm:col-span-3">
                                        <label className="block text-sm font-medium text-gray-700">New Password</label>
                                        <div className="mt-1 relative rounded-md shadow-sm">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <Lock className="h-5 w-5 text-gray-400" />
                                            </div>
                                            <input
                                                type="password"
                                                name="password"
                                                value={formData.password}
                                                onChange={handleChange}
                                                className="focus:ring-orange-500 focus:border-orange-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
                                                placeholder="Leave blank to keep current"
                                            />
                                        </div>
                                    </div>

                                    <div className="sm:col-span-3">
                                        <label className="block text-sm font-medium text-gray-700">Confirm New Password</label>
                                        <div className="mt-1 relative rounded-md shadow-sm">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <Lock className="h-5 w-5 text-gray-400" />
                                            </div>
                                            <input
                                                type="password"
                                                name="confirmPassword"
                                                value={formData.confirmPassword}
                                                onChange={handleChange}
                                                className="focus:ring-orange-500 focus:border-orange-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
                                                placeholder="Confirm new password"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50"
                                >
                                    <Save className="mr-2 h-4 w-4" />
                                    {loading ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Profile;
