import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import AuthContext from '../context/AuthContext';
import NotificationContext from '../context/NotificationContext';
import { Link } from 'react-router-dom';
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

            const { data } = await axios.put('http://127.0.0.1:5000/api/auth/profile', payload, config);

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
        <div className="min-h-screen bg-gray-50/50 py-16 px-4">
            <div className="max-w-4xl mx-auto">
                <div className="mb-12">
                    <h2 className="text-4xl font-black text-gray-900 tracking-tight mb-2">My Profile</h2>
                    <p className="text-gray-500 font-medium tracking-wide uppercase text-xs">Manage your personal identity and delivery details</p>
                </div>

                <div className="flex flex-col lg:flex-row gap-8">
                    {/* Left Sidebar - Summary */}
                    <div className="lg:w-1/3 flex flex-col gap-6">
                        <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm text-center">
                            <div className="h-24 w-24 bg-orange-100 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
                                <User className="h-12 w-12 text-orange-600" />
                            </div>
                            <h3 className="text-xl font-black text-gray-900 leading-tight mb-1">{formData.name}</h3>
                            <p className="text-sm font-bold text-gray-400">{formData.email}</p>

                            <div className="mt-8 pt-8 border-t border-gray-50 grid grid-cols-2 gap-4">
                                <div>
                                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Orders</div>
                                    <div className="text-lg font-black text-gray-900">12</div>
                                </div>
                                <div className="border-l border-gray-50">
                                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Status</div>
                                    <div className="text-lg font-black text-teal-600">Active</div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-orange-600 p-8 rounded-[2.5rem] shadow-xl shadow-orange-100 text-white relative overflow-hidden group">
                            <div className="absolute top-0 right-0 -mr-8 -mt-8 h-32 w-32 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
                            <h4 className="text-xl font-black leading-tight mb-2">Need Help?</h4>
                            <p className="text-orange-100/80 text-sm font-medium mb-6">Our support team is always here for you.</p>
                            <Link to="/complaints" className="w-full py-3 bg-white text-orange-600 font-black rounded-2xl active:scale-95 transition-all text-center block">Contact Us</Link>
                        </div>
                    </div>

                    {/* Right Side - Forms */}
                    <div className="lg:w-2/3 space-y-8">
                        <form onSubmit={handleSubmit} className="space-y-8">
                            {/* Personal Info Card */}
                            <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm relative isolate">
                                <h4 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-8 flex items-center gap-3">
                                    <span className="h-1.5 w-1.5 bg-orange-500 rounded-full"></span>
                                    Personal Information
                                </h4>

                                <div className="space-y-6">
                                    <div className="grid sm:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Full Name</label>
                                            <div className="relative group">
                                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                    <User className="h-4 w-4 text-gray-300 group-focus-within:text-orange-500 transition-colors" />
                                                </div>
                                                <input
                                                    type="text"
                                                    name="name"
                                                    value={formData.name}
                                                    onChange={handleChange}
                                                    className="block w-full pl-11 pr-4 py-3.5 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-orange-500/20 focus:bg-white text-sm font-black text-gray-900 transition-all"
                                                    placeholder="John Doe"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Phone Number</label>
                                            <div className="relative group">
                                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                    <Phone className="h-4 w-4 text-gray-300 group-focus-within:text-orange-500 transition-colors" />
                                                </div>
                                                <input
                                                    type="text"
                                                    name="phone"
                                                    value={formData.phone}
                                                    onChange={handleChange}
                                                    className="block w-full pl-11 pr-4 py-3.5 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-orange-500/20 focus:bg-white text-sm font-black text-gray-900 transition-all"
                                                    placeholder="+91 9876543210"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Email Address</label>
                                        <div className="relative group">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                <Mail className="h-4 w-4 text-gray-300 group-focus-within:text-orange-500 transition-colors" />
                                            </div>
                                            <input
                                                type="email"
                                                name="email"
                                                value={formData.email}
                                                onChange={handleChange}
                                                className="block w-full pl-11 pr-4 py-3.5 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-orange-500/20 focus:bg-white text-sm font-black text-gray-900 transition-all opacity-70 cursor-not-allowed"
                                                placeholder="john@example.com"
                                                readOnly
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Addresses Card */}
                            <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
                                <div className="flex justify-between items-center mb-8">
                                    <h4 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-3">
                                        <span className="h-1.5 w-1.5 bg-orange-500 rounded-full"></span>
                                        Saved Addresses
                                    </h4>
                                    <button
                                        type="button"
                                        onClick={addAddress}
                                        className="h-10 w-10 flex items-center justify-center bg-orange-50 text-orange-600 rounded-xl hover:bg-orange-600 hover:text-white transition-all shadow-sm"
                                    >
                                        <Plus className="h-5 w-5" />
                                    </button>
                                </div>

                                {formData.addresses.length === 0 ? (
                                    <div className="text-center py-10 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
                                        <MapPin className="h-8 w-8 text-gray-300 mx-auto mb-3" />
                                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">No addresses saved</p>
                                    </div>
                                ) : (
                                    <div className="grid gap-6">
                                        {formData.addresses.map((addr, index) => (
                                            <div key={index} className="bg-gray-50/50 p-6 rounded-2xl border border-gray-100 relative group transition-all hover:bg-white hover:shadow-md">
                                                <button
                                                    type="button"
                                                    onClick={() => removeAddress(index)}
                                                    className="absolute top-4 right-4 h-8 w-8 flex items-center justify-center bg-white text-gray-300 hover:text-rose-500 rounded-xl shadow-sm border border-gray-100 transition-all opacity-0 group-hover:opacity-100"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>

                                                <div className="grid grid-cols-1 sm:grid-cols-6 gap-6">
                                                    <div className="sm:col-span-2 space-y-2">
                                                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Label</label>
                                                        <input
                                                            type="text"
                                                            value={addr.label}
                                                            onChange={(e) => handleAddressChange(index, 'label', e.target.value)}
                                                            maxLength={50}
                                                            className="w-full px-4 py-2 bg-white border border-gray-100 rounded-xl text-xs font-black text-gray-900 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500/50 outline-none transition-all"
                                                            placeholder="Home, Office..."
                                                        />
                                                    </div>
                                                    <div className="sm:col-span-4 space-y-2">
                                                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Street Address</label>
                                                        <input
                                                            type="text"
                                                            value={addr.street}
                                                            onChange={(e) => handleAddressChange(index, 'street', e.target.value)}
                                                            maxLength={70}
                                                            className="w-full px-4 py-2 bg-white border border-gray-100 rounded-xl text-xs font-black text-gray-900 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500/50 outline-none transition-all"
                                                            placeholder="123 Main St"
                                                        />
                                                    </div>
                                                    <div className="sm:col-span-3 space-y-2">
                                                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">City</label>
                                                        <input
                                                            type="text"
                                                            value={addr.city}
                                                            onChange={(e) => handleAddressChange(index, 'city', e.target.value)}
                                                            maxLength={30}
                                                            className="w-full px-4 py-2 bg-white border border-gray-100 rounded-xl text-xs font-black text-gray-900 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500/50 outline-none transition-all"
                                                            placeholder="City Name"
                                                        />
                                                    </div>
                                                    <div className="sm:col-span-3 space-y-2">
                                                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">ZIP Code</label>
                                                        <input
                                                            type="text"
                                                            value={addr.zip}
                                                            onChange={(e) => handleAddressChange(index, 'zip', e.target.value)}
                                                            maxLength={10}
                                                            className="w-full px-4 py-2 bg-white border border-gray-100 rounded-xl text-xs font-black text-gray-900 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500/50 outline-none transition-all"
                                                            placeholder="000000"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Password Change Card */}
                            <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
                                <h4 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-8 flex items-center gap-3">
                                    <span className="h-1.5 w-1.5 bg-orange-500 rounded-full"></span>
                                    Security Update
                                </h4>

                                <div className="grid sm:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">New Password</label>
                                        <div className="relative group">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                <Lock className="h-4 w-4 text-gray-300 group-focus-within:text-orange-500 transition-colors" />
                                            </div>
                                            <input
                                                type="password"
                                                name="password"
                                                value={formData.password}
                                                onChange={handleChange}
                                                className="block w-full pl-11 pr-4 py-3.5 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-orange-500/20 focus:bg-white text-sm font-black text-gray-900 transition-all"
                                                placeholder="••••••••"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Confirm Password</label>
                                        <div className="relative group">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                <Lock className="h-4 w-4 text-gray-300 group-focus-within:text-orange-500 transition-colors" />
                                            </div>
                                            <input
                                                type="password"
                                                name="confirmPassword"
                                                value={formData.confirmPassword}
                                                onChange={handleChange}
                                                className="block w-full pl-11 pr-4 py-3.5 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-orange-500/20 focus:bg-white text-sm font-black text-gray-900 transition-all"
                                                placeholder="••••••••"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end pt-4">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="px-12 py-4 bg-orange-600 text-white font-black rounded-[1.5rem] shadow-xl shadow-orange-100 hover:bg-orange-700 active:scale-95 transition-all flex items-center gap-3 disabled:opacity-50"
                                >
                                    {loading ? (
                                        <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    ) : (
                                        <Save className="h-5 w-5" />
                                    )}
                                    {loading ? 'Saving Changes...' : 'Save Profile'}
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
