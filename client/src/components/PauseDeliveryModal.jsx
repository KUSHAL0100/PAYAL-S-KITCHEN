import React, { useState, useMemo } from 'react';
import axios from 'axios';
import { X, Calendar, AlertCircle, Info, Clock, CheckCircle2 } from 'lucide-react';
import { useNotification } from '../context/NotificationContext';

const PauseDeliveryModal = ({ isOpen, onClose, subscription, onSuccess }) => {
    const { showNotification } = useNotification();
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [loading, setLoading] = useState(false);

    const pauseDays = useMemo(() => {
        if (!startDate || !endDate) return 0;
        const s = new Date(startDate);
        const e = new Date(endDate);
        if (e < s) return 0;
        const diff = Math.abs(e - s);
        return Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1;
    }, [startDate, endDate]);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (pauseDays <= 0) {
            showNotification('End date must be after or same as start date', 'warning');
            return;
        }

        setLoading(true);
        try {
            const config = {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
            };

            await axios.post('http://127.0.0.1:5000/api/delivery-pauses', {
                subscriptionId: subscription._id,
                startDate,
                endDate
            }, config);

            showNotification(`Delivery paused for ${pauseDays} days successfully`, 'success');
            onSuccess();
            onClose();
        } catch (error) {
            console.error('Error pausing delivery:', error);
            showNotification(error.response?.data?.message || 'Failed to pause delivery', 'error');
        } finally {
            setLoading(false);
        }
    };

    const tomorrowDate = new Date();
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    const tomorrowStr = tomorrowDate.toISOString().split('T')[0];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl shadow-orange-500/20 overflow-hidden animate-in slide-in-from-bottom-8 duration-500">
                {/* Header */}
                <div className="relative p-8 bg-gradient-to-br from-orange-50 to-white border-b border-orange-100">
                    <button
                        onClick={onClose}
                        className="absolute top-6 right-6 p-2 rounded-full hover:bg-white hover:shadow-md transition-all text-gray-400 hover:text-orange-600"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    <div className="flex items-center gap-4">
                        <div className="p-4 bg-orange-500 text-white rounded-2xl shadow-lg shadow-orange-200">
                            <Clock className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-gray-900 tracking-tight">Pause Delivery</h3>
                            <p className="text-sm font-bold text-gray-400">Schedule a break for your tiffin</p>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-8">
                    {/* Date Inputs */}
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Start Date</label>
                            <div className="relative group">
                                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-orange-500 transition-colors" />
                                <input
                                    type="date"
                                    required
                                    value={startDate}
                                    min={tomorrowStr}
                                    max={subscription.endDate ? new Date(subscription.endDate).toISOString().split('T')[0] : ''}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="w-full pl-11 pr-4 py-4 bg-gray-50 border-none rounded-2xl focus:ring-4 focus:ring-orange-500/10 font-bold text-gray-700 transition-all cursor-pointer"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">End Date</label>
                            <div className="relative group">
                                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-orange-500 transition-colors" />
                                <input
                                    type="date"
                                    required
                                    value={endDate}
                                    min={startDate || tomorrowStr}
                                    max={subscription.endDate ? new Date(subscription.endDate).toISOString().split('T')[0] : ''}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="w-full pl-11 pr-4 py-4 bg-gray-50 border-none rounded-2xl focus:ring-4 focus:ring-orange-500/10 font-bold text-gray-700 transition-all cursor-pointer"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Summary Info */}
                    {pauseDays > 0 && (
                        <div className="bg-orange-50 rounded-3xl p-6 border border-orange-100 flex items-center justify-between animate-in zoom-in duration-300">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-white rounded-2xl text-orange-600 shadow-sm">
                                    <CheckCircle2 className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-xs font-black text-orange-400 uppercase tracking-widest">Total Period</p>
                                    <h4 className="text-xl font-black text-orange-900">{pauseDays} {pauseDays === 1 ? 'Day' : 'Days'} Paused</h4>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest">Resumes On</p>
                                <p className="font-bold text-gray-700">
                                    {new Date(new Date(endDate).getTime() + 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Policy Disclaimer */}
                    <div className="space-y-3 bg-blue-50/50 p-5 rounded-3xl border border-blue-50">
                        <div className="flex gap-3">
                            <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                            <div className="space-y-1">
                                <p className="text-xs font-bold text-blue-900">Subscription Policy</p>
                                <p className="text-[10px] font-medium text-blue-700/80 leading-relaxed">
                                    Pausing excludes delivery for selected dates. As per our policy, no refunds or credit extensions are provided for paused days.
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                            <p className="text-[10px] font-bold text-amber-700/80 uppercase tracking-wider leading-relaxed">
                                Modification: Allowed only before the start date.
                            </p>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-4 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-4 text-sm font-black text-gray-400 hover:text-gray-600 border-2 border-transparent hover:border-gray-100 rounded-3xl transition-all"
                        >
                            Nevermind
                        </button>
                        <button
                            type="submit"
                            disabled={loading || pauseDays <= 0}
                            className={`flex-2 px-10 py-4 bg-orange-600 text-white rounded-3xl text-sm font-black shadow-xl shadow-orange-500/30 hover:bg-orange-700 hover:-translate-y-1 active:scale-95 transition-all disabled:opacity-50 disabled:translate-y-0 disabled:shadow-none`}
                        >
                            {loading ? 'Processing...' : 'Schedule Pause'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default PauseDeliveryModal;
