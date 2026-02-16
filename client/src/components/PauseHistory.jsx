import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
    Calendar, XCircle, Clock, History,
    ArrowRight, CheckCircle2, AlertCircle, Trash2
} from 'lucide-react';
import { useNotification } from '../context/NotificationContext';

const PauseHistory = ({ refreshTrigger }) => {
    const { showNotification } = useNotification();
    const [pauses, setPauses] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchPauses = async () => {
        setLoading(true);
        try {
            const config = {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
            };
            const res = await axios.get('http://127.0.0.1:5000/api/delivery-pauses', config);
            setPauses(res.data);
        } catch (error) {
            console.error('Error fetching pauses:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPauses();
    }, [refreshTrigger]);

    const handleCancelPause = async (pauseId) => {
        if (!window.confirm('Are you sure you want to cancel this pause request? Delivery will resume for these dates.')) return;

        try {
            const config = {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
            };
            await axios.put(`http://127.0.0.1:5000/api/delivery-pauses/${pauseId}/cancel`, {}, config);
            showNotification('Pause cancelled successfully', 'success');
            fetchPauses();
        } catch (error) {
            console.error('Error cancelling pause:', error);
            showNotification(error.response?.data?.message || 'Failed to cancel pause', 'error');
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center py-12">
                <div className="w-8 h-8 border-2 border-orange-100 rounded-full animate-spin border-t-orange-500"></div>
            </div>
        );
    }

    if (pauses.length === 0) return null;

    return (
        <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden mt-12 animate-in fade-in slide-in-from-bottom-6 duration-700">
            {/* Header */}
            <div className="px-8 py-6 border-b border-gray-50 flex items-center justify-between bg-gray-50/30">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-white rounded-2xl shadow-sm text-gray-400">
                        <History className="h-5 w-5" />
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-gray-900 tracking-tight">Pause Log</h3>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Historical requests</p>
                    </div>
                </div>
                <span className="bg-gray-100 text-gray-500 px-3 py-1 rounded-full text-[10px] font-black">{pauses.length} Records</span>
            </div>

            <div className="divide-y divide-gray-50">
                {pauses.map((pause, idx) => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);

                    const startDate = new Date(pause.startDate);
                    startDate.setHours(0, 0, 0, 0);

                    const endDate = new Date(pause.endDate);
                    endDate.setHours(0, 0, 0, 0);

                    const isActive = pause.status === 'Active';
                    const isCompleted = isActive && today > endDate;
                    const isCancellable = isActive && today < startDate;

                    return (
                        <div key={pause._id} className="p-8 hover:bg-gray-50/50 transition-all group">
                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                                <div className="flex items-center gap-6">
                                    {/* Number Circle */}
                                    <div className={`hidden sm:flex h-12 w-12 rounded-2xl items-center justify-center font-black text-lg transition-all
                                        ${isActive && !isCompleted ? 'bg-orange-100 text-orange-600 rotate-3' : 'bg-gray-100 text-gray-400'}
                                    `}>
                                        {pauses.length - idx}
                                    </div>

                                    <div>
                                        <div className="flex items-center gap-4 mb-2">
                                            <div className="flex items-center bg-white border border-gray-100 px-4 py-2 rounded-2xl shadow-sm gap-3">
                                                <Calendar className="w-4 h-4 text-gray-400" />
                                                <span className="text-sm font-black text-gray-700">
                                                    {new Date(pause.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                </span>
                                                <ArrowRight className="w-3 h-3 text-gray-300" />
                                                <span className="text-sm font-black text-gray-700">
                                                    {new Date(pause.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                </span>
                                            </div>

                                            <span className={`px-4 py-1.5 text-[9px] rounded-full font-black uppercase tracking-widest flex items-center gap-1.5
                                                ${isCompleted
                                                    ? 'bg-gray-100 text-gray-500 shadow-sm'
                                                    : isActive
                                                        ? 'bg-green-100 text-green-700 shadow-sm shadow-green-100'
                                                        : 'bg-rose-50 text-rose-400 opacity-60'
                                                }`}>
                                                {isActive && !isCompleted ? <CheckCircle2 className="w-3 h-3" /> : isCompleted ? <CheckCircle2 className="w-3 h-3 text-gray-400" /> : <XCircle className="w-3 h-3" />}
                                                {isCompleted ? 'Completed' : pause.status}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <p className="text-xs font-bold text-gray-400 flex items-center">
                                                <Clock className="w-3 h-3 mr-1" /> {pause.pauseDays} Days Off
                                            </p>
                                            <span className="w-1 h-1 bg-gray-200 rounded-full"></span>
                                            <p className="text-xs font-bold text-gray-400">
                                                Requested {new Date(pause.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {isCancellable ? (
                                    <button
                                        onClick={() => handleCancelPause(pause._id)}
                                        className="flex items-center justify-center gap-2 px-6 py-3 bg-white border-2 border-rose-50 text-rose-600 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-rose-600 hover:text-white hover:border-rose-600 hover:-translate-y-1 transition-all duration-300"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        Revoke Request
                                    </button>
                                ) : isActive && !isCompleted && (
                                    <div className="px-6 py-3 bg-orange-50 text-orange-600 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border border-orange-100">
                                        <AlertCircle className="w-4 h-4" />
                                        Locked - In Progress
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default PauseHistory;
