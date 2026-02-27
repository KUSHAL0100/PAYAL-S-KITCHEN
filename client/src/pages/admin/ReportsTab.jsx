import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, BarChart, Bar
} from 'recharts';
import {
    TrendingUp, Users, Package, CreditCard, Activity,
    ArrowUpRight, ArrowDownRight, Printer, Download, CalendarDays,
    FileText, ClipboardList, UserCheck, AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const API_BASE = '/api/admin/reports';

const getAuthConfig = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
});

// ─── Reusable CSV Download Utility ───
const downloadCSV = (headers, rows, filename) => {
    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}_${new Date().toLocaleDateString().replace(/\//g, '-')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

// Animation variants
const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const itemVariants = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } };

// ─── Sub-Report Components ───

const SegmentationCard = React.memo(({ distribution }) => {
    const TYPE_COLORS = {
        'SINGLE': '#F59E0B',
        'EVENT': '#8B5CF6',
        'SUBSCRIPTION PURCHASE': '#3B82F6',
        'SUBSCRIPTION UPGRADE': '#10B981',
    };
    const COLORS = ['#F59E0B', '#3B82F6', '#8B5CF6', '#10B981', '#F43F5E'];

    const total = distribution.reduce((acc, curr) => acc + curr.value, 0);

    return (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.03)] flex flex-col relative overflow-hidden">
            <div className="absolute -bottom-10 -right-10 w-48 h-48 bg-indigo-50/50 rounded-full blur-3xl -z-10"></div>
            <h3 className="text-xl font-black text-gray-900 mb-8 flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-indigo-100 to-indigo-50 border border-indigo-100 rounded-xl shadow-sm"><Package className="h-5 w-5 text-indigo-600" /></div>
                Order Segmentation
            </h3>
            <div className="flex-grow flex flex-col justify-center">
                <div className="h-56 w-full -mt-4 relative">
                    {/* Centered Total Indicator */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center z-0 pt-2">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Total</p>
                        <p className="text-2xl font-black text-gray-900 leading-tight">{total}</p>
                    </div>

                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={distribution}
                                cx="50%"
                                cy="50%"
                                innerRadius={70}
                                outerRadius={90}
                                paddingAngle={8}
                                dataKey="value"
                                stroke="none"
                                cornerRadius={12}
                                isAnimationActive={false}
                            >
                                {distribution.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={TYPE_COLORS[entry.name] || COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{
                                    borderRadius: '16px',
                                    border: 'none',
                                    boxShadow: '0 10px 30px rgb(0 0 0 / 0.1)',
                                    fontSize: '10px',
                                    fontWeight: '900',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em',
                                    padding: '8px 12px'
                                }}
                                itemStyle={{ padding: '2px 0' }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                <div className="mt-8 grid grid-cols-1 gap-3">
                    {distribution.slice(0, 4).map((item, index) => (
                        <div key={index} className="flex items-center justify-between p-4 bg-gray-50/80 hover:bg-white hover:shadow-md border border-gray-100 rounded-2xl transition-all group overflow-hidden relative">
                            <div className="absolute inset-y-0 left-0 w-1 group-hover:w-2 transition-all" style={{ background: TYPE_COLORS[item.name] || COLORS[index % COLORS.length] }}></div>
                            <div className="flex items-center gap-3 pl-2">
                                <div className="h-2 w-2 rounded-full shadow-sm" style={{ background: TYPE_COLORS[item.name] || COLORS[index % COLORS.length] }}></div>
                                <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">{item.name}</span>
                            </div>
                            <div className="flex flex-col items-end">
                                <span className="text-sm font-black text-gray-900">{item.value}</span>
                                <span className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter">{Math.round((item.value / total) * 100)}% of total</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </motion.div>
    );
});

const DayWiseSalesReport = () => {
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [shouldFetch, setShouldFetch] = useState(false);
    const [validationError, setValidationError] = useState('');

    const { data, isLoading, isError } = useQuery({
        queryKey: ['dayWiseSales', startDate, endDate],
        queryFn: async () => {
            const res = await api.get(`${API_BASE}/day-wise`, { ...getAuthConfig(), params: { startDate, endDate } });
            return res.data.data;
        },
        enabled: shouldFetch && !!startDate && !!endDate,
        retry: 1
    });

    const handleGenerate = () => {
        setValidationError('');
        if (!startDate || !endDate) {
            setValidationError('Please select both From Date and To Date.');
            return;
        }

        const start = new Date(startDate);
        const end = new Date(endDate);
        const today = new Date();
        today.setHours(23, 59, 59, 999);

        if (start > today || end > today) {
            setValidationError('Dates cannot be in the future.');
            return;
        }
        if (start > end) {
            setValidationError('Invalid Range: From Date cannot be later than To Date.');
            return;
        }
        setShouldFetch(true);
    };

    const maxDate = new Date().toISOString().split('T')[0];

    const { totals, maxRevenue } = useMemo(() => {
        if (!data || data.length === 0) return { totals: null, maxRevenue: 0 };
        const maxRev = Math.max(...data.map(d => d.totalRevenue));
        const sums = data.reduce((acc, row) => ({
            singleOrders: acc.singleOrders + row.singleOrders,
            eventOrders: acc.eventOrders + row.eventOrders,
            subscriptionOrders: acc.subscriptionOrders + row.subscriptionOrders,
            totalOrders: acc.totalOrders + row.totalOrders,
            totalRevenue: acc.totalRevenue + row.totalRevenue,
            totalDiscount: acc.totalDiscount + row.totalDiscount
        }), { singleOrders: 0, eventOrders: 0, subscriptionOrders: 0, totalOrders: 0, totalRevenue: 0, totalDiscount: 0 });
        return { totals: sums, maxRevenue: maxRev };
    }, [data]);

    const handleDownload = () => {
        if (!data || data.length === 0) return alert('No data to download');
        const headers = ['Date', 'Single Orders', 'Event Orders', 'Subscription Orders', 'Total Orders', 'Discount (₹)', 'Revenue (₹)'];
        const rows = data.map(row => [
            new Date(row.date).toLocaleDateString('en-IN'), row.singleOrders, row.eventOrders, row.subscriptionOrders,
            row.totalOrders, row.totalDiscount, row.totalRevenue
        ]);
        downloadCSV(headers, rows, 'Day_Wise_Sales');
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-end gap-5 p-6 bg-gradient-to-br from-white to-gray-50/50 rounded-3xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-xl">
                <div className="flex-1 min-w-[180px]">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 pl-1">From Date</label>
                    <input type="date" value={startDate} max={maxDate} onChange={e => { setStartDate(e.target.value); setShouldFetch(false); setValidationError(''); }}
                        className="w-full px-5 py-3.5 rounded-2xl border border-gray-200 text-sm font-bold text-gray-800 bg-white shadow-sm focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 outline-none transition-all" />
                </div>
                <div className="flex-1 min-w-[180px]">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 pl-1">To Date</label>
                    <input type="date" value={endDate} max={maxDate} onChange={e => { setEndDate(e.target.value); setShouldFetch(false); setValidationError(''); }}
                        className="w-full px-5 py-3.5 rounded-2xl border border-gray-200 text-sm font-bold text-gray-800 bg-white shadow-sm focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 outline-none transition-all" />
                </div>
                <button onClick={handleGenerate}
                    className="px-8 py-3.5 bg-gradient-to-r from-orange-600 to-orange-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:from-orange-500 hover:to-orange-400 transition-all shadow-[0_8px_20px_rgba(249,115,22,0.3)] active:scale-95">
                    Generate Report
                </button>
            </div>

            {validationError && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-4 bg-rose-50 text-rose-600 rounded-2xl border border-rose-100 font-bold text-sm shadow-sm flex items-center gap-3">
                    <span className="bg-rose-100 p-1.5 rounded-full"><AlertTriangle className="h-4 w-4 text-rose-600" /></span>
                    {validationError}
                </motion.div>
            )}

            {isLoading && <div className="text-center py-16"><Activity className="animate-spin text-orange-500 h-10 w-10 mx-auto" /><p className="text-gray-400 mt-4 font-bold text-xs tracking-widest uppercase">Analyzing Data...</p></div>}
            {isError && <div className="text-center py-12 text-red-500 font-bold bg-red-50 rounded-3xl border border-red-100">Failed to load report. Please try again.</div>}

            {data && data.length > 0 && (
                <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
                    <div className="overflow-x-auto max-h-[500px] overflow-y-auto no-scrollbar">
                        <table className="w-full text-left border-collapse">
                            <thead className="sticky top-0 z-20 bg-white/90 backdrop-blur-md shadow-[0_4px_20px_rgb(0,0,0,0.03)] border-b border-gray-100">
                                <tr>
                                    <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] whitespace-nowrap">Date</th>
                                    <th className="px-5 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] text-center whitespace-nowrap">Single</th>
                                    <th className="px-5 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] text-center whitespace-nowrap">Event</th>
                                    <th className="px-5 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] text-center whitespace-nowrap">Subscription</th>
                                    <th className="px-5 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] text-center whitespace-nowrap">Total Orders</th>
                                    <th className="px-6 py-5 text-[10px] font-black text-emerald-600/70 uppercase tracking-[0.15em] text-right whitespace-nowrap">Revenue</th>
                                </tr>
                            </thead>
                            <motion.tbody variants={containerVariants} initial="hidden" animate="show" className="divide-y divide-gray-50/50">
                                {data.map((row, i) => {
                                    const percent = maxRevenue > 0 ? (row.totalRevenue / maxRevenue) * 100 : 0;
                                    return (
                                        <motion.tr variants={itemVariants} key={i} className="hover:bg-orange-50/20 hover:scale-[1.01] transition-all duration-300 relative group">
                                            <td className="px-6 py-5 text-sm font-bold text-gray-800">{new Date(row.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                                            <td className="px-5 py-5 text-sm font-bold text-gray-500 text-center">{row.singleOrders}</td>
                                            <td className="px-5 py-5 text-sm font-bold text-gray-500 text-center">{row.eventOrders}</td>
                                            <td className="px-5 py-5 text-sm font-bold text-gray-500 text-center">{row.subscriptionOrders}</td>
                                            <td className="px-5 py-5 text-center"><span className="bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-black px-4 py-1.5 rounded-full shadow-sm group-hover:bg-indigo-100 transition-colors">{row.totalOrders}</span></td>
                                            <td className="px-6 py-5 relative min-w-[150px]">
                                                {/* Background spark bar */}
                                                <div className="absolute top-2 bottom-2 right-2 bg-emerald-50 rounded-lg -z-10 transition-all duration-1000" style={{ width: `calc(${percent}% - 16px)` }} />
                                                <div className="flex items-center justify-end gap-3 z-10">
                                                    <span className="text-[10px] font-black text-emerald-400 bg-white/50 backdrop-blur-sm px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">{Math.round(percent)}%</span>
                                                    <span className="text-sm font-black text-emerald-600">₹{row.totalRevenue.toLocaleString('en-IN')}</span>
                                                </div>
                                            </td>
                                        </motion.tr>
                                    );
                                })}
                                {totals && (
                                    <tr className="bg-gray-950 text-white font-black hover:bg-black transition-colors">
                                        <td className="px-6 py-6 text-xs uppercase tracking-widest text-gray-300 rounded-bl-3xl">Grand Total</td>
                                        <td className="px-5 py-6 text-sm text-center text-gray-300">{totals.singleOrders}</td>
                                        <td className="px-5 py-6 text-sm text-center text-gray-300">{totals.eventOrders}</td>
                                        <td className="px-5 py-6 text-sm text-center text-gray-300">{totals.subscriptionOrders}</td>
                                        <td className="px-5 py-6 text-sm text-center"><span className="bg-indigo-500/20 text-indigo-300 px-4 py-2 rounded-full ring-1 ring-indigo-500/30">{totals.totalOrders}</span></td>
                                        <td className="px-6 py-6 text-base text-emerald-400 text-right rounded-br-3xl">₹{totals.totalRevenue.toLocaleString('en-IN')}</td>
                                    </tr>
                                )}
                            </motion.tbody>
                        </table>
                    </div>
                    <div className="p-5 bg-gray-50 flex justify-center border-t border-gray-100">
                        <button onClick={handleDownload} className="flex items-center gap-2 text-[10px] font-black text-gray-500 hover:text-indigo-600 uppercase tracking-[0.2em] transition-colors cursor-pointer bg-white px-5 py-2.5 rounded-full border border-gray-200 shadow-sm hover:shadow-md hover:-translate-y-0.5">
                            <Download className="h-3.5 w-3.5" /> Export to CSV
                        </button>
                    </div>
                </div>
            )}

            {data && data.length === 0 && (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-20 bg-gradient-to-b from-gray-50 to-white rounded-3xl border border-dashed border-gray-200 shadow-sm relative overflow-hidden">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-orange-100/50 rounded-full blur-3xl -z-10 animate-pulse" />
                    <div className="bg-white h-20 w-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl border border-gray-100 shadow-orange-100/50">
                        <FileText className="h-8 w-8 text-orange-400 rotate-12" />
                    </div>
                    <p className="text-gray-900 font-black text-2xl tracking-tight">No intelligence found</p>
                    <p className="text-gray-400 font-bold text-sm mt-2 max-w-sm mx-auto">We couldn't find any actionable data for the selected date range. Try expanding your search.</p>
                </motion.div>
            )}
        </div>
    );
};

const OrderBillsReport = () => {
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [type, setType] = useState('all');
    const [shouldFetch, setShouldFetch] = useState(false);
    const [validationError, setValidationError] = useState('');

    const { data, isLoading, isError } = useQuery({
        queryKey: ['orderBills', startDate, endDate, type],
        queryFn: async () => {
            const res = await api.get(`${API_BASE}/order-bills`, { ...getAuthConfig(), params: { startDate, endDate, type } });
            return res.data.data;
        },
        enabled: shouldFetch && !!startDate && !!endDate,
        retry: 1
    });

    const handleGenerate = () => {
        setValidationError('');
        if (!startDate || !endDate) {
            setValidationError('Please select both From Date and To Date.');
            return;
        }

        const start = new Date(startDate);
        const end = new Date(endDate);
        const today = new Date();
        today.setHours(23, 59, 59, 999);

        if (start > today || end > today) {
            setValidationError('Dates cannot be in the future.');
            return;
        }
        if (start > end) {
            setValidationError('Invalid Range: From Date cannot be later than To Date.');
            return;
        }
        setShouldFetch(true);
    };

    const maxDate = new Date().toISOString().split('T')[0];

    const handleDownload = () => {
        if (!data || data.length === 0) return alert('No data to download');
        const headers = ['Order ID', 'Customer', 'Email', 'Type', 'Items', 'Base Price (₹)', 'Discount (₹)', 'Total (₹)', 'Cancel Fee (20%)', 'Refund (80%)', 'Payment', 'Status', 'Date'];
        const rows = data.map(order => [
            '#' + String(order._id).slice(-6).toUpperCase(), order.customerName, order.customerEmail, order.type.replace('_', ' '),
            order.items.map(i => `${i.quantity}x ${i.name}`).join('; '), order.price, order.discountAmount, order.totalAmount,
            order.cancellationFee, order.refundAmount, order.paymentStatus, order.status, new Date(order.createdAt).toLocaleDateString('en-IN')
        ]);
        downloadCSV(headers, rows, 'Order_Bills');
    };

    const typeOptions = [{ value: 'all', label: 'All Types' }, { value: 'single', label: 'Single Order' }, { value: 'event', label: 'Event Order' }, { value: 'subscription_purchase', label: 'Subscription' }];

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-end gap-5 p-6 bg-gradient-to-br from-white to-gray-50/50 rounded-3xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-xl">
                <div className="flex-1 min-w-[150px]">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 pl-1">From Date</label>
                    <input type="date" value={startDate} max={maxDate} onChange={e => { setStartDate(e.target.value); setShouldFetch(false); setValidationError(''); }}
                        className="w-full px-5 py-3.5 rounded-2xl border border-gray-200 text-sm font-bold text-gray-800 bg-white shadow-sm focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 outline-none transition-all" />
                </div>
                <div className="flex-1 min-w-[150px]">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 pl-1">To Date</label>
                    <input type="date" value={endDate} max={maxDate} onChange={e => { setEndDate(e.target.value); setShouldFetch(false); setValidationError(''); }}
                        className="w-full px-5 py-3.5 rounded-2xl border border-gray-200 text-sm font-bold text-gray-800 bg-white shadow-sm focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 outline-none transition-all" />
                </div>
                <div className="flex-1 min-w-[160px]">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 pl-1">Order Type</label>
                    <select value={type} onChange={e => { setType(e.target.value); setShouldFetch(false); setValidationError(''); }}
                        className="w-full px-5 py-3.5 rounded-2xl border border-gray-200 text-sm font-bold text-gray-800 bg-white shadow-sm focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 outline-none transition-all appearance-none cursor-pointer">
                        {typeOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                </div>
                <button onClick={handleGenerate}
                    className="px-8 py-3.5 bg-gradient-to-r from-orange-600 to-orange-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:from-orange-500 hover:to-orange-400 transition-all shadow-[0_8px_20px_rgba(249,115,22,0.3)] active:scale-95">
                    Generate Report
                </button>
            </div>

            {validationError && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-4 bg-rose-50 text-rose-600 rounded-2xl border border-rose-100 font-bold text-sm shadow-sm flex items-center gap-3">
                    <span className="bg-rose-100 p-1.5 rounded-full"><AlertTriangle className="h-4 w-4 text-rose-600" /></span>
                    {validationError}
                </motion.div>
            )}

            {isLoading && <div className="text-center py-16"><Activity className="animate-spin text-orange-500 h-10 w-10 mx-auto" /><p className="text-gray-400 mt-4 font-bold text-xs tracking-widest uppercase">Fetching Orders...</p></div>}
            {isError && <div className="text-center py-12 text-red-500 font-bold bg-red-50 rounded-3xl border border-red-100">Failed to load report. Please try again.</div>}

            {data && data.length > 0 && (
                <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
                    <div className="overflow-x-auto max-h-[600px] overflow-y-auto no-scrollbar">
                        <table className="w-full text-left border-collapse">
                            <thead className="sticky top-0 z-20 bg-white/90 backdrop-blur-md shadow-[0_4px_20px_rgb(0,0,0,0.03)] border-b border-gray-100">
                                <tr className="text-[10px] font-black text-gray-400 uppercase tracking-[0.1em]">
                                    <th className="px-5 py-5 whitespace-nowrap">Order ID</th>
                                    <th className="px-5 py-5 whitespace-nowrap">Customer</th>
                                    <th className="px-5 py-5 whitespace-nowrap">Type</th>
                                    <th className="px-5 py-5 min-w-[150px] whitespace-nowrap">Items</th>
                                    <th className="px-5 py-5 text-right whitespace-nowrap">Total</th>
                                    <th className="px-5 py-5 text-right whitespace-nowrap">Cancel Fee</th>
                                    <th className="px-5 py-5 text-right whitespace-nowrap">Refund</th>
                                    <th className="px-5 py-5 whitespace-nowrap">Status</th>
                                    <th className="px-5 py-5 whitespace-nowrap">Date</th>
                                </tr>
                            </thead>
                            <motion.tbody variants={containerVariants} initial="hidden" animate="show" className="divide-y divide-gray-50/50">
                                {data.map((order) => (
                                    <motion.tr variants={itemVariants} key={order._id} className="hover:bg-orange-50/20 hover:scale-[1.01] transition-all duration-300 group">
                                        <td className="px-5 py-5">
                                            <span className="font-mono text-[10px] font-black text-indigo-700 bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-lg group-hover:bg-indigo-100 transition-colors">
                                                #{String(order._id).slice(-6).toUpperCase()}
                                            </span>
                                        </td>
                                        <td className="px-5 py-5 min-w-[140px]">
                                            <div className="text-sm font-black text-gray-900 group-hover:text-orange-600 transition-colors">{order.customerName}</div>
                                            <div className="text-[10px] text-gray-400 font-medium">{order.customerEmail}</div>
                                        </td>
                                        <td className="px-5 py-5">
                                            <span className={`text-[9px] font-black px-3 py-1.5 rounded-full border uppercase tracking-wider shadow-sm ${order.type === 'single' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                                order.type === 'event' ? 'bg-purple-50 text-purple-700 border-purple-100' :
                                                    'bg-blue-50 text-blue-700 border-blue-100'
                                                }`}>{order.type.replace('_', ' ')}</span>
                                        </td>
                                        <td className="px-5 py-5">
                                            <div className="space-y-1.5">
                                                {order.items.map((item, idx) => (
                                                    <div key={idx} className="text-xs text-gray-600 font-medium bg-gray-50/50 px-2 py-1 rounded inline-block mr-1 border border-gray-100 shadow-sm">
                                                        <span className="font-black text-gray-900">{item.quantity}×</span> {item.name}
                                                    </div>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-5 py-5 text-sm font-black text-gray-900 text-right whitespace-nowrap">₹{order.totalAmount}</td>
                                        <td className="px-5 py-5 text-sm font-bold text-right whitespace-nowrap">{order.cancellationFee > 0 ? <span className="text-rose-600 bg-rose-50 px-2.5 py-1 rounded border border-rose-100">₹{order.cancellationFee}</span> : <span className="text-gray-300">—</span>}</td>
                                        <td className="px-5 py-5 text-sm font-bold text-right whitespace-nowrap">{order.refundAmount > 0 ? <span className="text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-100">₹{order.refundAmount}</span> : <span className="text-gray-300">—</span>}</td>
                                        <td className="px-5 py-5">
                                            <span className={`text-[9px] font-black px-3 py-1.5 rounded-full border tracking-wider uppercase shadow-sm ${order.paymentStatus === 'Paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                                order.paymentStatus === 'Refunded' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                                                    'bg-gray-50 text-gray-600 border-gray-200'
                                                }`}>{order.paymentStatus}</span>
                                        </td>
                                        <td className="px-5 py-5 text-xs font-bold text-gray-500 whitespace-nowrap">{new Date(order.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                                    </motion.tr>
                                ))}
                            </motion.tbody>
                        </table>
                    </div>
                    <div className="p-5 bg-gray-50 flex justify-between items-center border-t border-gray-100">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-2">Total {data.length} records</span>
                        <button onClick={handleDownload} className="flex items-center gap-2 text-[10px] font-black text-gray-500 hover:text-indigo-600 uppercase tracking-[0.2em] transition-colors cursor-pointer bg-white px-5 py-2.5 rounded-full border border-gray-200 shadow-sm hover:shadow-md hover:-translate-y-0.5">
                            <Download className="h-3.5 w-3.5" /> Export to CSV
                        </button>
                    </div>
                </div>
            )}

            {data && data.length === 0 && (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-20 bg-gradient-to-b from-gray-50 to-white rounded-3xl border border-dashed border-gray-200 shadow-sm relative overflow-hidden">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-indigo-100/40 rounded-full blur-3xl -z-10 animate-pulse" />
                    <div className="bg-white h-20 w-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl border border-gray-100 shadow-indigo-100/50">
                        <ClipboardList className="h-8 w-8 text-indigo-400" />
                    </div>
                    <p className="text-gray-900 font-black text-2xl tracking-tight">No orders matched</p>
                    <p className="text-gray-400 font-bold text-sm mt-2 max-w-sm mx-auto">We couldn't find any orders matching your filters. Try checking a different date or type.</p>
                </motion.div>
            )}
        </div>
    );
};

const SubscriptionReport = () => {
    const [status, setStatus] = useState('all');
    const [shouldFetch, setShouldFetch] = useState(false);

    const { data, isLoading, isError } = useQuery({
        queryKey: ['subscriptionReport', status],
        queryFn: async () => {
            const res = await api.get(`${API_BASE}/subscriptions`, { ...getAuthConfig(), params: { status } });
            return res.data.data;
        }, enabled: shouldFetch, retry: 1
    });

    const handleGenerate = () => setShouldFetch(true);

    const handleDownload = () => {
        if (!data || data.length === 0) return alert('No data to download');
        const headers = ['Customer', 'Email', 'Plan', 'Duration', 'Meal Type', 'Start Date', 'End Date', 'Status', 'Amount Paid (₹)'];
        const rows = data.map(sub => [
            sub.customerName, sub.customerEmail, sub.planName, sub.planDuration, sub.mealType,
            new Date(sub.startDate).toLocaleDateString('en-IN'), new Date(sub.endDate).toLocaleDateString('en-IN'),
            sub.status, sub.amountPaid
        ]);
        downloadCSV(headers, rows, 'Subscription_Summary');
    };

    const statusOptions = ['all', 'Active', 'Cancelled', 'Expired', 'Upgraded'];

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-end gap-5 p-6 bg-gradient-to-br from-white to-gray-50/50 rounded-3xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-xl">
                <div className="flex-1 min-w-[200px]">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 pl-1">Status Filter</label>
                    <select value={status} onChange={e => { setStatus(e.target.value); setShouldFetch(false); }}
                        className="w-full px-5 py-3.5 rounded-2xl border border-gray-200 text-sm font-bold text-gray-800 bg-white shadow-sm focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 outline-none transition-all appearance-none cursor-pointer">
                        {statusOptions.map(opt => <option key={opt} value={opt}>{opt === 'all' ? 'All Statuses' : opt}</option>)}
                    </select>
                </div>
                <button onClick={handleGenerate}
                    className="px-8 py-3.5 bg-gradient-to-r from-orange-600 to-orange-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:from-orange-500 hover:to-orange-400 transition-all shadow-[0_8px_20px_rgba(249,115,22,0.3)] active:scale-95">
                    Generate Report
                </button>
            </div>

            {isLoading && <div className="text-center py-16"><Activity className="animate-spin text-orange-500 h-10 w-10 mx-auto" /><p className="text-gray-400 mt-4 font-bold text-xs tracking-widest uppercase">Fetching Records...</p></div>}
            {isError && <div className="text-center py-12 text-red-500 font-bold bg-red-50 rounded-3xl border border-red-100">Failed to load report.</div>}

            {data && data.length > 0 && (
                <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
                    <div className="overflow-x-auto max-h-[600px] overflow-y-auto no-scrollbar">
                        <table className="w-full text-left border-collapse">
                            <thead className="sticky top-0 z-20 bg-white/90 backdrop-blur-md shadow-[0_4px_20px_rgb(0,0,0,0.03)] border-b border-gray-100">
                                <tr className="text-[10px] font-black text-gray-400 uppercase tracking-[0.1em]">
                                    <th className="px-6 py-5 whitespace-nowrap">Customer</th>
                                    <th className="px-5 py-5 whitespace-nowrap">Plan</th>
                                    <th className="px-5 py-5 whitespace-nowrap">Duration</th>
                                    <th className="px-5 py-5 whitespace-nowrap">Meal Type</th>
                                    <th className="px-5 py-5 whitespace-nowrap">Start - End</th>
                                    <th className="px-5 py-5 whitespace-nowrap">Status</th>
                                    <th className="px-6 py-5 text-right whitespace-nowrap">Amount Paid</th>
                                </tr>
                            </thead>
                            <motion.tbody variants={containerVariants} initial="hidden" animate="show" className="divide-y divide-gray-50/50">
                                {data.map((sub) => (
                                    <motion.tr variants={itemVariants} key={sub._id} className="hover:bg-orange-50/20 hover:scale-[1.01] transition-all duration-300 group">
                                        <td className="px-6 py-5 min-w-[160px]">
                                            <div className="text-sm font-black text-gray-900 group-hover:text-amber-600 transition-colors">{sub.customerName}</div>
                                            <div className="text-[10px] text-gray-400 font-medium">{sub.customerEmail}</div>
                                        </td>
                                        <td className="px-5 py-5 text-sm font-bold text-gray-700 whitespace-nowrap">{sub.planName}</td>
                                        <td className="px-5 py-5 text-[10px] font-black text-gray-600 uppercase tracking-widest bg-gray-50/50 rounded-lg border border-gray-100/50 shadow-sm inline-block mt-2">{sub.planDuration}</td>
                                        <td className="px-5 py-5">
                                            <span className="text-[9px] font-black px-3 py-1.5 rounded-full bg-violet-50 text-violet-700 border border-violet-100 shadow-sm uppercase">{sub.mealType}</span>
                                        </td>
                                        <td className="px-5 py-5 text-[11px] font-bold text-gray-500 whitespace-nowrap leading-tight">
                                            {new Date(sub.startDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} <br />
                                            <span className="text-gray-300">to</span> {new Date(sub.endDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                        </td>
                                        <td className="px-5 py-5">
                                            <span className={`text-[9px] font-black px-3 py-1.5 rounded-full border tracking-wider uppercase shadow-sm ${sub.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                                sub.status === 'Cancelled' ? 'bg-rose-50 text-rose-700 border-rose-100' :
                                                    sub.status === 'Expired' ? 'bg-gray-50 text-gray-600 border-gray-200' :
                                                        'bg-blue-50 text-blue-700 border-blue-100'
                                                }`}>{sub.status}</span>
                                        </td>
                                        <td className="px-6 py-5 text-sm font-black text-gray-900 text-right">₹{sub.amountPaid.toLocaleString('en-IN')}</td>
                                    </motion.tr>
                                ))}
                            </motion.tbody>
                        </table>
                    </div>
                    <div className="p-5 bg-gray-50 flex justify-between items-center border-t border-gray-100">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-2">Total {data.length} records</span>
                        <button onClick={handleDownload} className="flex items-center gap-2 text-[10px] font-black text-gray-500 hover:text-indigo-600 uppercase tracking-[0.2em] transition-colors cursor-pointer bg-white px-5 py-2.5 rounded-full border border-gray-200 shadow-sm hover:shadow-md hover:-translate-y-0.5">
                            <Download className="h-3.5 w-3.5" /> Export to CSV
                        </button>
                    </div>
                </div>
            )}
            {data && data.length === 0 && (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-20 bg-gradient-to-b from-gray-50 to-white rounded-3xl border border-dashed border-gray-200 shadow-sm relative overflow-hidden">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-emerald-100/40 rounded-full blur-3xl -z-10 animate-pulse" />
                    <div className="bg-white h-20 w-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl border border-gray-100 shadow-emerald-100/50">
                        <UserCheck className="h-8 w-8 text-emerald-400" />
                    </div>
                    <p className="text-gray-900 font-black text-2xl tracking-tight">No subscriptions found</p>
                    <p className="text-gray-400 font-bold text-sm mt-2 max-w-sm mx-auto">We couldn't find any subscriptions matching this status filter.</p>
                </motion.div>
            )}
        </div>
    );
};

// ─── Main Reports Tab ───

const REPORT_TABS = [
    { id: 'day-wise', label: 'Day-Wise Sales', icon: CalendarDays },
    { id: 'order-bills', label: 'Order Bills', icon: ClipboardList },
    { id: 'subscriptions', label: 'Subscriptions', icon: UserCheck },
];

const ReportsTab = () => {
    const [activeReport, setActiveReport] = useState('day-wise');

    const fetchReports = async () => {
        const res = await api.get(`${API_BASE}/summary`, getAuthConfig());
        return res.data.data;
    };

    const { data, isLoading, isError, error } = useQuery({
        queryKey: ['adminReports'],
        queryFn: fetchReports,
        retry: 1,
        staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    });
    const COLORS = ['#F59E0B', '#3B82F6', '#8B5CF6', '#10B981', '#F43F5E'];

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-96 gap-4">
                <Activity className="animate-spin text-orange-500 h-10 w-10" />
                <p className="text-gray-400 font-bold uppercase tracking-widest text-xs animate-pulse">Initializing Dashboard...</p>
            </div>
        );
    }
    if (isError) {
        return (
            <div className="p-20 text-center bg-white rounded-[3rem] border border-red-100 shadow-xl">
                <div className="bg-red-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"><Activity className="text-red-500 h-10 w-10" /></div>
                <h3 className="text-2xl font-black text-gray-900">Analysis Failed</h3>
                <button onClick={() => window.location.reload()} className="mt-8 px-8 py-3 bg-gray-950 text-white rounded-2xl font-black text-xs uppercase tracking-widest">Retry Analysis</button>
            </div>
        );
    }
    if (!data || !data.stats) return <div className="p-10 text-center text-gray-400">No report data available yet.</div>;

    const { stats, revenueTrends = [], distribution = [] } = data;
    const kpiData = [
        { label: 'Total Revenue', value: `₹${stats.totalRevenue || 0}`, icon: TrendingUp, bg: 'bg-emerald-500/10', text: 'text-emerald-600', trend: '+12.5%' },
        { label: 'Total Orders', value: stats.totalOrders || 0, icon: Package, bg: 'bg-indigo-500/10', text: 'text-indigo-600', trend: '+5.2%' },
        { label: 'Active Users', value: stats.totalUsers || 0, icon: Users, bg: 'bg-violet-500/10', text: 'text-violet-600', trend: '+8.1%' },
        { label: 'Subscriptions', value: stats.activeSubscriptions || 0, icon: CreditCard, bg: 'bg-orange-500/10', text: 'text-orange-600', trend: '+15.3%' },
    ];

    return (
        <div className="space-y-12 pb-24 font-sans max-w-7xl mx-auto">
            {/* Header section with gradient text */}
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.03)] gap-6">
                <div>
                    <h2 className="text-4xl font-black tracking-tight bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent">Intelligence</h2>
                    <p className="text-gray-400 font-bold text-[10px] uppercase tracking-[0.25em] mt-2 bg-gradient-to-r from-orange-500 to-rose-500 bg-clip-text text-transparent">Dynamic Business Analytics Dashboard</p>
                </div>
                <button onClick={() => window.print()} className="group flex items-center gap-3 px-8 py-3.5 bg-gray-950 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all shadow-[0_8px_20px_rgba(0,0,0,0.15)] active:scale-95">
                    <Printer className="h-4 w-4 group-hover:text-orange-400 transition-colors" /> Save PDF Report
                </button>
            </motion.div>

            {/* Premium KPI grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {kpiData.map((kpi, index) => (
                    <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1, type: "spring" }} key={kpi.label}
                        className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.03)] hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] hover:-translate-y-2 transition-all duration-300 relative overflow-hidden group">
                        <div className="absolute -right-8 -top-8 w-32 h-32 bg-gray-50 rounded-full blur-3xl group-hover:bg-orange-50 transition-colors duration-500 -z-10"></div>
                        <div className="flex items-start justify-between">
                            <div className={`p-4 rounded-2xl ${kpi.bg} ${kpi.text} group-hover:scale-110 transition-transform duration-300 backdrop-blur-sm`}>
                                <kpi.icon className="h-7 w-7" />
                            </div>
                            <div className={`flex items-center gap-1 text-[10px] font-black ${kpi.trend.startsWith('+') ? 'text-emerald-500 bg-emerald-50' : 'text-rose-500 bg-rose-50'} px-3 py-1.5 rounded-full border border-white/50 shadow-sm`}>
                                {kpi.trend.startsWith('+') ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />} {kpi.trend}
                            </div>
                        </div>
                        <div className="mt-8">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">{kpi.label}</p>
                            <h3 className="text-4xl font-black text-gray-900 mt-2 tracking-tighter">{kpi.value}</h3>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Charts section with cleaner aesthetics */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="lg:col-span-2 bg-white p-10 rounded-[3rem] border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.03)] relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-orange-50/50 rounded-full blur-3xl -z-10"></div>
                    <h3 className="text-xl font-black text-gray-900 mb-10 flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-orange-100 to-orange-50 border border-orange-100 rounded-xl shadow-sm"><TrendingUp className="h-5 w-5 text-orange-600" /></div>
                        Revenue Trajectory
                    </h3>
                    <div className="h-[350px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={revenueTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11, fontWeight: '800' }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11, fontWeight: '800' }} tickFormatter={(val) => `₹${val / 1000}k`} />
                                <Tooltip
                                    cursor={{ fill: '#F8FAFC' }}
                                    contentStyle={{
                                        borderRadius: '16px',
                                        border: 'none',
                                        boxShadow: '0 10px 30px rgb(0 0 0 / 0.1)',
                                        padding: '10px 14px',
                                        fontSize: '11px',
                                        fontWeight: '900',
                                        color: '#1e293b'
                                    }}
                                    itemStyle={{ color: '#f59e0b', padding: '0' }}
                                />
                                <Bar dataKey="revenue" fill="#f59e0b" radius={[6, 6, 6, 6]} barSize={40} animationDuration={1500}>
                                    {revenueTrends.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={index === revenueTrends.length - 1 ? '#ea580c' : '#fcd34d'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>

                <SegmentationCard distribution={distribution} />
            </div>

            {/* Dynamic Reports Tables container */}
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white rounded-[3rem] border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.03)] overflow-hidden">
                <div className="px-10 pt-10 pb-0 border-b border-gray-100 flex flex-col items-center sm:items-start sm:flex-row sm:justify-between gap-6">
                    <h3 className="text-2xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-rose-500 mb-2 flex items-center gap-3">
                        <FileText className="h-7 w-7 text-orange-600" /> Detailed Reports
                    </h3>
                    <div className="flex gap-2 overflow-x-auto pb-0 no-scrollbar">
                        {REPORT_TABS.map(tab => (
                            <button key={tab.id} onClick={() => setActiveReport(tab.id)}
                                className={`flex items-center gap-2 px-6 py-4 rounded-t-2xl font-black text-xs uppercase tracking-widest transition-all whitespace-nowrap border-b-2 relative ${activeReport === tab.id
                                    ? 'text-orange-600 border-orange-600 bg-orange-50/50'
                                    : 'text-gray-400 border-transparent hover:text-gray-800 hover:bg-gray-50'
                                    }`}>
                                <tab.icon className={`h-4 w-4 ${activeReport === tab.id ? 'text-orange-600' : 'text-gray-400'}`} /> {tab.label}
                                {activeReport === tab.id && <motion.div layoutId="activeTab" className="absolute -bottom-[2px] left-0 right-0 h-[2px] bg-orange-600" />}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="p-8 md:p-10 bg-gray-50/30">
                    <AnimatePresence mode="wait">
                        <motion.div key={activeReport} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                            {activeReport === 'day-wise' && <DayWiseSalesReport />}
                            {activeReport === 'order-bills' && <OrderBillsReport />}
                            {activeReport === 'subscriptions' && <SubscriptionReport />}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </motion.div>
        </div>
    );
};

export default ReportsTab;
