import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Calendar, Package, MapPin, Phone, User, Utensils,
    AlertCircle, Search, Filter, ChevronRight, CheckCircle2,
    Truck, Clock, Star, Info, TrendingUp, X
} from 'lucide-react';
import AddressBlock from '../../components/AddressBlock';

const DeliveryDetailModal = ({ item, isOpen, onClose }) => {
    if (!isOpen || !item) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-gray-900/40 backdrop-blur-[2px] animate-in fade-in duration-300"
                onClick={onClose}
            ></div>
            <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl relative z-10 overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[85vh]">
                {/* Header Section */}
                <div className={`p-6 md:p-7 text-white relative overflow-hidden flex-shrink-0
                    ${item.mealType === 'event' ? 'bg-gray-900' : 'bg-gradient-to-br from-blue-600 to-indigo-700'}`}>
                    <button
                        onClick={(e) => { e.stopPropagation(); onClose(); }}
                        className="absolute top-5 right-5 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-all active:scale-90 z-20"
                    >
                        <X className="h-5 w-5" />
                    </button>

                    <div className="relative z-10 pr-10">
                        <span className="px-2 py-0.5 bg-white/20 rounded-lg text-[9px] font-black uppercase tracking-widest mb-2 inline-block">
                            {item.type || 'Delivery Detail'}
                        </span>
                        <h2 className="text-xl md:text-2xl font-black tracking-tight uppercase italic break-words leading-tight">{item.customerName}</h2>
                        <div className="flex flex-wrap items-center gap-4 mt-3 opacity-80 text-[10px] md:text-[11px] font-bold">
                            <span className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> {item.phone || 'N/A'}</span>
                        </div>
                    </div>
                </div>

                {/* Content Section */}
                <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto border-b border-gray-100">
                    {/* Address Block */}
                    <div className="space-y-3">
                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-blue-500" /> Delivery Location
                        </h4>
                        <div className="p-5 bg-gray-50 rounded-2xl border border-gray-100 italic font-medium text-gray-700 leading-relaxed break-words">
                            <AddressBlock
                                mealType={item.mealType}
                                lunchAddress={item.lunchAddress || item.address}
                                dinnerAddress={item.dinnerAddress || item.address}
                            />
                        </div>
                    </div>

                    {/* Quantity & Status Block */}
                    <div className={`grid gap-4 ${item.type === 'Subscription' ? 'grid-cols-1' : 'grid-cols-2'}`}>
                        {item.type !== 'Subscription' && (
                            <div className="p-5 bg-blue-50 rounded-2xl border border-blue-100">
                                <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-1">Total Persons</p>
                                <h4 className="text-2xl font-black text-blue-700">{item.quantity || 1} Persons</h4>
                            </div>
                        )}
                        <div className="p-5 bg-indigo-50 rounded-2xl border border-indigo-100">
                            <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-1">Schedule</p>
                            <h4 className="text-2xl font-black text-indigo-700">{item.deliveryTime}</h4>
                        </div>
                        <div className="p-5 bg-orange-50 rounded-2xl border border-orange-100">
                            <p className="text-[9px] font-black text-orange-400 uppercase tracking-widest mb-1">Status</p>
                            <h4 className="text-2xl font-black text-orange-700 capitalize">Confirmed</h4>
                        </div>
                    </div>

                    {/* Manifest Itemized List */}
                    <div className="space-y-4">
                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                            <Utensils className="h-4 w-4 text-orange-500" />
                            Product Breakdown <span className="text-gray-300">|</span> <span className="text-gray-600">{item.items?.length || 0} Items</span>
                        </h4>
                        <div className="grid gap-2">
                            {(item.items || []).map((it, idx) => (
                                <div key={idx} className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-xl hover:border-blue-200 transition-colors">
                                    <span className="text-sm font-bold text-gray-700 uppercase">{it}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer Controls */}
                <div className="p-5 bg-gray-50 flex items-center justify-end flex-shrink-0">
                    <button
                        onClick={(e) => { e.stopPropagation(); onClose(); }}
                        className="px-10 py-3.5 bg-gray-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:shadow-xl active:scale-95 transition-all w-full sm:w-auto"
                    >
                        Close Details
                    </button>
                </div>
            </div>
        </div>
    );
};

const DeliveryScheduleTab = () => {
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [schedule, setSchedule] = useState({ Basic: [], Premium: [], Exotic: [], Events: [] });
    const [loading, setLoading] = useState(false);
    const dateInputRef = React.useRef(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Details Modal State
    const [detailsItem, setDetailsItem] = useState(null);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);

    const openDetails = (item) => {
        setDetailsItem(item);
        setIsDetailsOpen(true);
    };

    const closeDetails = () => {
        setIsDetailsOpen(false);
        setTimeout(() => setDetailsItem(null), 300);
    };

    const fetchSchedule = React.useCallback(async () => {
        setLoading(true);
        try {
            const config = {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
            };
            const res = await axios.get(`http://127.0.0.1:5000/api/admin/delivery-schedule?date=${selectedDate}`, config);
            setSchedule(res.data || { Basic: [], Premium: [], Exotic: [], Events: [] });
        } catch (error) {
            console.error('Error fetching schedule:', error);
        } finally {
            setLoading(false);
        }
    }, [selectedDate]);

    useEffect(() => {
        fetchSchedule();
    }, [fetchSchedule]);


    const filterItems = (items) => {
        if (!searchTerm) return items;
        const term = searchTerm.toLowerCase();
        return items.filter(item =>
            item.customerName.toLowerCase().includes(term) ||
            (item.phone && item.phone.includes(term)) ||
            (item.items && Array.isArray(item.items) && item.items.some(i => typeof i === 'string' && i.toLowerCase().includes(term)))
        );
    };

    const calculateTotalUnits = (items) => (items || []).reduce((acc, curr) => acc + (parseInt(curr.quantity) || 1), 0);
    const totalDeliveries = ['Basic', 'Premium', 'Exotic', 'Events'].reduce((acc, type) => acc + calculateTotalUnits(schedule[type]), 0);

    const stats = [
        { label: 'Total Dispatch', value: totalDeliveries, icon: Truck, color: 'text-gray-900', iconColor: 'text-blue-500' },
        { label: 'Events', value: schedule.Events?.length || 0, icon: Calendar, color: 'text-orange-600', iconColor: 'text-orange-500' },
        { label: 'Basic', value: schedule.Basic?.length || 0, color: 'text-gray-700' },
        { label: 'Premium', value: schedule.Premium?.length || 0, color: 'text-orange-500' },
        { label: 'Exotic', value: schedule.Exotic?.length || 0, color: 'text-purple-600' },
    ];

    const eventItems = filterItems(schedule.Events || []);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* --- Stats Quick Summary --- */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {stats.map((stat, i) => (
                    <div key={i} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-center">
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">{stat.label}</p>
                        <div className="flex items-center gap-2">
                            <h3 className={`text-2xl font-black ${stat.color}`}>{stat.value}</h3>
                            {stat.icon && <stat.icon className={`h-3.5 w-3.5 ${stat.iconColor}`} />}
                        </div>
                    </div>
                ))}
            </div>

            {/* --- Control Header --- */}
            <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="flex items-center gap-4">
                    <div className="p-4 bg-gray-900 text-white rounded-2xl shadow-xl">
                        <Calendar className="h-6 w-6" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-gray-900 tracking-tight uppercase">
                            Dispatch <span className="text-orange-600">Central</span>
                        </h2>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                            Active Manifest for <span className="text-orange-600">{new Date(selectedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        </p>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row items-stretch gap-3 w-full md:w-auto relative group">
                    <div
                        className="relative flex-1 md:flex-initial cursor-pointer z-10"
                        onClick={() => dateInputRef.current?.showPicker()}
                    >
                        <div className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-orange-600 transition-transform pointer-events-none z-20">
                            <Calendar />
                        </div>
                        {/* Hidden input kept for value binding, but interaction is handled by parent click via showPicker */}
                        <input
                            ref={dateInputRef}
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="absolute inset-0 opacity-0 w-full h-full pointer-events-none z-0"
                            tabIndex={-1}
                        />
                        <div className="pl-14 pr-8 py-2.5 bg-orange-50/40 border-[1.5px] border-orange-100/50 group-hover:border-orange-200 group-hover:bg-orange-50 rounded-xl transition-all shadow-sm z-10 relative pointer-events-none">
                            <p className="text-[7px] font-black text-orange-400 uppercase tracking-widest leading-none mb-1">Select Date</p>
                            <h4 className="text-xs font-black text-gray-900 leading-none capitalize">
                                {new Date(selectedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </h4>
                        </div>
                    </div>
                    <button
                        onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
                        className="px-5 bg-gray-900 text-white text-[9px] font-black rounded-xl shadow-lg hover:bg-orange-600 active:scale-95 transition-all uppercase tracking-widest z-20 relative"
                    >
                        Today
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-24 bg-white rounded-[3rem] border border-gray-100 shadow-sm relative overflow-hidden">
                    <div className="relative z-10 flex flex-col items-center">
                        <div className="relative mb-8">
                            <Truck className="h-20 w-20 text-orange-600 animate-bounce" />
                            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-16 h-2 bg-gray-100 rounded-full blur-[2px]"></div>
                        </div>
                        <p className="text-sm font-black text-gray-900 uppercase tracking-[0.4em] animate-pulse">Syncing Manifest...</p>
                        <p className="mt-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Optimizing delivery lanes</p>
                    </div>
                </div>
            ) : (
                <div className="space-y-8">
                    {/* --- EVENT SPOTLIGHT SECTION --- */}
                    {eventItems.length > 0 && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between px-2">
                                <h3 className="text-base font-black text-gray-900 tracking-tight flex items-center gap-2">
                                    <Star className="h-4 w-4 text-orange-500 fill-orange-500" />
                                    Event Spotlight
                                </h3>
                                <span className="px-3 py-1 bg-orange-100 text-orange-600 rounded-full text-[9px] font-black uppercase tracking-widest">
                                    {eventItems.length} Bookings
                                </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                {eventItems.map((item, idx) => (
                                    <div key={idx}
                                        onClick={() => openDetails(item)}
                                        className="bg-gray-900 rounded-2xl p-5 text-white shadow-xl relative overflow-hidden group hover:bg-gray-800 transition-all cursor-pointer ring-1 ring-white/10 hover:ring-orange-500/50"
                                    >
                                        <div className="relative z-10">
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="p-2 bg-white/10 rounded-xl flex items-center gap-2">
                                                    <Clock className="h-4 w-4 text-orange-400" />
                                                    <span className="text-xs font-black">{item.deliveryTime}</span>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[8px] font-black text-orange-400 uppercase tracking-widest">Total Persons</p>
                                                    <h4 className="text-lg font-black italic">{item.quantity}</h4>
                                                </div>
                                            </div>

                                            <div className="mb-4 flex justify-between items-end">
                                                <div>
                                                    <h3 className="text-base font-black tracking-tight uppercase">{item.customerName}</h3>
                                                    <p className="text-[10px] font-bold text-gray-400 flex items-center gap-1.5">
                                                        <Phone className="h-2.5 w-2.5" /> {item.phone || 'N/A'}
                                                    </p>
                                                </div>
                                                <button className="px-3 py-1.5 bg-orange-600 text-white text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-orange-500 transition-colors shadow-lg shadow-orange-500/20">
                                                    Details
                                                </button>
                                            </div>

                                            <div className="p-3 bg-white/5 rounded-xl border border-white/5 mb-4 group-hover:bg-white/10 transition-all">
                                                <AddressBlock
                                                    mealType={item.mealType}
                                                    lunchAddress={item.lunchAddress || item.address}
                                                    dinnerAddress={item.dinnerAddress || item.address}
                                                    variant="dark"
                                                />
                                            </div>

                                            <div className="flex flex-wrap gap-1.5">
                                                {(item.items || []).map((food, fidx) => (
                                                    <span key={fidx} className="px-2 py-1 bg-orange-500/20 text-orange-300 rounded-md text-[9px] font-black">
                                                        {food}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* --- TIFFIN LANES SECTION --- */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 px-2">
                            <div className="w-6 h-0.5 bg-gray-200 rounded-full"></div>
                            <h3 className="text-base font-black text-gray-900 tracking-tight">Dispatch Lanes</h3>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {['Basic', 'Premium', 'Exotic'].map((planType) => {
                                const items = filterItems(schedule[planType] || []);

                                return (
                                    <div key={planType} className="flex flex-col gap-4">
                                        {/* Lane Header */}
                                        <div className={`relative p-5 rounded-2xl border-b-[6px] shadow-sm transition-all
                                            ${planType === 'Basic' ? 'bg-white text-gray-900 border-gray-100' : ''}
                                            ${planType === 'Premium' ? 'bg-orange-500 text-white border-orange-600' : ''}
                                            ${planType === 'Exotic' ? 'bg-purple-600 text-white border-purple-700' : ''}
                                        `}>
                                            <div className="flex justify-between items-center">
                                                <h3 className="text-lg font-black tracking-tight uppercase italic">{planType}</h3>
                                                <div className="bg-white/20 px-3 py-1.5 rounded-xl border border-white/10">
                                                    <span className="font-black text-lg">{items.length}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Lane Items */}
                                        <div className="space-y-3">
                                            {items.length === 0 ? (
                                                <div className="bg-gray-50/50 border border-dashed border-gray-200 rounded-2xl p-10 text-center select-none">
                                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">No entries</p>
                                                </div>
                                            ) : (
                                                items.map((item, idx) => (
                                                    <div key={idx}
                                                        onClick={() => openDetails(item)}
                                                        className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm hover:shadow-lg transition-all relative group overflow-hidden cursor-pointer"
                                                    >
                                                        {/* Status Indicator Bar */}
                                                        <div className={`absolute top-4 left-0 w-1 h-8 rounded-r-full group-hover:h-12 transition-all
                                                            ${planType === 'Basic' ? 'bg-gray-400' : ''}
                                                            ${planType === 'Premium' ? 'bg-orange-500' : ''}
                                                            ${planType === 'Exotic' ? 'bg-purple-500' : ''}
                                                        `}></div>

                                                        <div className="flex items-start gap-3 mb-3 pl-2">
                                                            <div className="p-2.5 bg-gray-50 rounded-xl group-hover:bg-gray-900 group-hover:text-white transition-colors">
                                                                <User className="h-4 w-4" />
                                                            </div>
                                                            <div className="pr-2 flex-1 min-w-0">
                                                                <h4 className="font-black text-gray-900 text-sm leading-tight uppercase tracking-tight truncate">{item.customerName}</h4>
                                                                <p className="text-[10px] font-bold text-gray-400 flex items-center gap-1 mt-0.5 truncate">
                                                                    <Phone className="h-2.5 w-2.5" /> {item.phone || 'N/A'}
                                                                </p>
                                                            </div>
                                                            {/* Quantity Badge */}
                                                            <div className="bg-gray-100 px-2 py-1 rounded-lg">
                                                                <span className="text-[10px] font-black text-gray-600">x{item.quantity || 1}</span>
                                                            </div>
                                                        </div>

                                                        {/* Address Section */}
                                                        <div className="p-3 bg-gray-50 rounded-xl border border-gray-50 group-hover:bg-white transition-all mb-3 text-xs text-gray-600">
                                                            <AddressBlock
                                                                mealType={item.mealType}
                                                                lunchAddress={item.lunchAddress || item.address}
                                                                dinnerAddress={item.dinnerAddress || item.address}
                                                            />
                                                        </div>

                                                        {/* Items Tags */}
                                                        <div className="flex flex-wrap gap-1.5 mb-3">
                                                            {(item.items || []).slice(0, 3).map((food, fidx) => (
                                                                <span key={fidx} className="bg-white border border-gray-100 text-gray-600 px-2 py-0.5 rounded-md text-[9px] font-bold group-hover:border-gray-300 transition-all">
                                                                    {food}
                                                                </span>
                                                            ))}
                                                            {(item.items || []).length > 3 && (
                                                                <span className="text-[9px] font-black text-gray-400 px-1 py-1">+{(item.items || []).length - 3} more</span>
                                                            )}
                                                        </div>

                                                        <div className="pt-3 border-t border-gray-50 flex items-center justify-between">
                                                            <div className="flex items-center gap-2">
                                                                <div className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest
                                                                    ${item.mealType === 'lunch' ? 'bg-yellow-100 text-yellow-700' : ''}
                                                                    ${item.mealType === 'dinner' ? 'bg-indigo-100 text-indigo-700' : ''}
                                                                    ${item.mealType === 'both' ? 'bg-green-100 text-green-700' : ''}
                                                                    ${item.mealType === 'event' ? 'bg-gray-200 text-gray-700' : 'bg-gray-100 text-gray-600'}
                                                                `}>
                                                                    {item.mealType || 'Standard'}
                                                                </div>
                                                                <span className="text-[9px] font-black text-gray-400 flex items-center gap-1">
                                                                    <Clock className="h-3 w-3" /> {item.deliveryTime}
                                                                </span>
                                                            </div>
                                                            <button
                                                                className="text-[9px] font-black text-blue-600 uppercase hover:underline opacity-0 group-hover:opacity-100 transition-opacity"
                                                            >
                                                                View
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* Render Details Modal */}
            <DeliveryDetailModal
                item={detailsItem}
                isOpen={isDetailsOpen}
                onClose={closeDetails}
            />
        </div>
    );
};

export default DeliveryScheduleTab;
