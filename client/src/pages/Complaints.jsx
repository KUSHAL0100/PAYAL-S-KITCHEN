import React, { useEffect, useState, useContext } from 'react';
import axios from 'axios';
import AuthContext from '../context/AuthContext';
import NotificationContext from '../context/NotificationContext';
import { MessageSquare, Send, Clock, CheckCircle, AlertCircle, Phone, Mail, MapPin } from 'lucide-react';

const Complaints = () => {
    const [complaints, setComplaints] = useState([]);
    const [subject, setSubject] = useState('');
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(true);
    const { user } = useContext(AuthContext);
    const { showNotification } = useContext(NotificationContext);

    useEffect(() => {
        const fetchComplaints = async () => {
            try {
                const config = {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('token')}`,
                    },
                };
                const res = await axios.get('http://127.0.0.1:5000/api/complaints/my', config);
                setComplaints(res.data);
                setLoading(false);
            } catch (error) {
                console.error('Error fetching complaints:', error);
                setLoading(false);
                showNotification('Failed to fetch support history', 'error');
            }
        };

        if (user) {
            fetchComplaints();
        }
    }, [user]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const config = {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                },
            };
            const res = await axios.post(
                'http://127.0.0.1:5000/api/complaints',
                { subject, description },
                config
            );
            setComplaints([res.data, ...complaints]);
            setSubject('');
            setDescription('');
            showNotification('Support request sent successfully', 'success');
        } catch (error) {
            console.error('Error submitting complaint:', error);
            showNotification('Failed to send request', 'error');
        }
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="h-12 w-12 border-4 border-orange-600/20 border-t-orange-600 rounded-full animate-spin"></div>
        </div>
    );

    return (
        <div className="min-h-screen bg-white relative isolate overflow-hidden">
            {/* Background Decorative Elements */}
            <div className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80" aria-hidden="true">
                <div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] opacity-20 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"></div>
            </div>

            <div className="max-w-7xl mx-auto px-6 lg:px-8 py-24 sm:py-32">
                <div className="grid lg:grid-cols-2 gap-16 items-start">
                    {/* Left Side: Info & Existing Tickets */}
                    <div className="space-y-12">
                        <div>
                            <h2 className="text-4xl font-black text-gray-900 tracking-tight mb-4">Contact & <span className="text-orange-600">Support</span></h2>
                            <p className="text-lg text-gray-500 font-medium max-w-lg">Have a question or feedback? Our team is here to ensure your kitchen experience is perfect.</p>
                        </div>

                        {/* Contact Quick Info */}
                        <div className="grid sm:grid-cols-2 gap-6">
                            {[
                                { icon: Phone, title: "Call Us", detail: "+91 98765 43210", color: "bg-blue-50 text-blue-600" },
                                { icon: Mail, title: "Email Us", detail: "support@payalskitchen.com", color: "bg-purple-50 text-purple-600" }
                            ].map((item, i) => (
                                <div key={i} className="p-6 bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                                    <div className={`h-10 w-10 ${item.color} rounded-xl flex items-center justify-center mb-4 text-sm`}>
                                        <item.icon className="h-6 w-6" />
                                    </div>
                                    <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">{item.title}</h4>
                                    <p className="font-black text-gray-900">{item.detail}</p>
                                </div>
                            ))}
                        </div>

                        {/* Support History */}
                        <div className="space-y-6">
                            <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-3">
                                <span className="h-1.5 w-1.5 bg-orange-500 rounded-full"></span>
                                Support History
                            </h3>

                            {complaints.length === 0 ? (
                                <div className="p-12 text-center bg-gray-50/50 rounded-[2.5rem] border border-dashed border-gray-200">
                                    <MessageSquare className="h-10 w-10 text-gray-300 mx-auto mb-4" />
                                    <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">No support tickets found</p>
                                </div>
                            ) : (
                                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-4 custom-scrollbar">
                                    {complaints.map((complaint) => (
                                        <div key={complaint._id} className="group bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-md transition-all">
                                            <div className="flex items-start justify-between mb-4">
                                                <div>
                                                    <h4 className="font-black text-gray-900 group-hover:text-orange-600 transition-colors">{complaint.subject}</h4>
                                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">
                                                        Ticket #{complaint._id.slice(-6).toUpperCase()} • {new Date(complaint.createdAt).toLocaleDateString()}
                                                    </p>
                                                </div>
                                                <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${complaint.status === 'Resolved'
                                                    ? 'bg-teal-50 text-teal-600'
                                                    : 'bg-amber-50 text-amber-600'
                                                    }`}>
                                                    {complaint.status}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed mb-4">{complaint.description}</p>

                                            {complaint.resolution && (
                                                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex gap-3">
                                                    <CheckCircle className="h-5 w-5 text-teal-500 shrink-0 mt-0.5" />
                                                    <p className="text-xs text-gray-600 leading-relaxed"><span className="font-black text-gray-900">Response:</span> {complaint.resolution}</p>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Side: New Ticket Form */}
                    <div className="space-y-12">
                        <div>
                            <h2 className="text-4xl font-black text-gray-900 tracking-tight mb-4">Send a <span className="text-orange-600">Message</span></h2>
                            <p className="text-lg text-gray-500 font-medium max-w-lg">We usually respond within a few hours to ensure your issue is resolved.</p>
                        </div>

                        <div className="bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-xl shadow-orange-100/10 sticky top-32">
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Subject</label>
                                    <input
                                        type="text"
                                        required
                                        value={subject}
                                        onChange={(e) => setSubject(e.target.value)}
                                        className="block w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-orange-500/20 focus:bg-white text-sm font-black text-gray-900 transition-all placeholder:text-gray-300"
                                        placeholder="Order issue, Suggestion, etc."
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Message Description</label>
                                    <textarea
                                        required
                                        rows={6}
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        className="block w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-orange-500/20 focus:bg-white text-sm font-black text-gray-900 transition-all placeholder:text-gray-300 resize-none"
                                        placeholder="Describe your request in detail..."
                                    />
                                </div>

                                <button
                                    type="submit"
                                    className="w-full py-4 bg-orange-600 text-white font-black rounded-[2rem] shadow-xl shadow-orange-100 hover:bg-orange-700 active:scale-[0.98] transition-all flex items-center justify-center gap-3 group"
                                >
                                    <span>Submit Request</span>
                                    <Send className="h-4 w-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                                </button>
                            </form>


                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Gradient */}
            <div className="absolute inset-x-0 top-[calc(100%-13rem)] -z-10 transform-gpu overflow-hidden blur-3xl sm:top-[calc(100%-30rem)]" aria-hidden="true">
                <div className="relative left-[calc(50%+3rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] opacity-20 sm:left-[calc(50%+36rem)] sm:w-[72.1875rem]"></div>
            </div>
        </div>
    );
};

export default Complaints;
