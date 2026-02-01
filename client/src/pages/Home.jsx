import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Clock, ShieldCheck, Truck } from 'lucide-react';

const Home = () => {
    return (
        <div className="bg-white overflow-hidden">
            {/* Hero Section */}
            <div className="relative isolate pt-14">
                {/* Background Mesh Gradient Effect */}
                <div className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80" aria-hidden="true">
                    <div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] opacity-20 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"></div>
                </div>

                <div className="max-w-7xl mx-auto px-6 lg:px-8 py-20 sm:py-32 flex flex-col lg:flex-row items-center gap-16">
                    <div className="lg:w-1/2 text-center lg:text-left transition-all duration-700 animate-in fade-in slide-in-from-left-8">
                        <div className="inline-flex items-center px-4 py-1.5 rounded-full border border-orange-200 bg-orange-50 text-orange-700 text-xs font-black uppercase tracking-widest mb-8">
                            <span className="relative flex h-2 w-2 mr-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
                            </span>
                            Now Serving in Your Neighborhood
                        </div>

                        <h1 className="text-5xl lg:text-7xl font-black text-gray-900 leading-[1.1] tracking-tight mb-8">
                            Fresh, Homemade <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-red-600">Tiffin Delivered</span>
                        </h1>

                        <p className="text-lg lg:text-xl text-gray-600 leading-relaxed mb-10 max-w-2xl mx-auto lg:mx-0">
                            Experience the soul-warming taste of home-cooked meals. Healthy, hygienic, and crafted with love, delivered straight to your door.
                        </p>

                        <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                            <Link
                                to="/plans"
                                className="group relative w-full sm:w-auto inline-flex items-center justify-center px-10 py-4 font-black text-white bg-gray-900 rounded-2xl overflow-hidden transition-all duration-300 hover:bg-orange-600 hover:scale-105 active:scale-95 shadow-xl hover:shadow-orange-200"
                            >
                                Get Started
                                <ArrowRight className="ml-3 h-5 w-5 transition-transform group-hover:translate-x-1" />
                            </Link>

                            <Link
                                to="/menu"
                                className="w-full sm:w-auto inline-flex items-center justify-center px-10 py-4 font-black text-gray-900 bg-white border-2 border-gray-100 rounded-2xl transition-all duration-300 hover:border-orange-500 hover:text-orange-600 hover:scale-105 active:scale-95"
                            >
                                Explore Menu
                            </Link>
                        </div>

                        <div className="mt-12 flex items-center justify-center lg:justify-start gap-8 opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
                            <div className="text-center">
                                <div className="text-2xl font-black text-gray-900">5k+</div>
                                <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Members</div>
                            </div>
                            <div className="w-px h-8 bg-gray-200"></div>
                            <div className="text-center">
                                <div className="text-2xl font-black text-gray-900">4.9/5</div>
                                <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Rating</div>
                            </div>
                            <div className="w-px h-8 bg-gray-200"></div>
                            <div className="text-center">
                                <div className="text-2xl font-black text-gray-900">10k+</div>
                                <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Deliveries</div>
                            </div>
                        </div>
                    </div>

                    <div className="lg:w-1/2 relative transition-all duration-1000 animate-in fade-in zoom-in-95 delay-300">
                        <div className="absolute -inset-4 bg-gradient-to-r from-orange-500 to-red-500 rounded-[3rem] blur-2xl opacity-20 animate-pulse"></div>
                        <div className="relative bg-white p-4 rounded-[2.5rem] shadow-2xl border border-gray-100 transform hover:-rotate-2 transition-transform duration-500">
                            <img
                                className="w-full h-auto rounded-[1.8rem] object-cover"
                                src="https://images.unsplash.com/photo-1546069901-ba9599a7e63c?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80"
                                alt="Delicious Tiffin"
                            />
                            {/* Floating Card */}
                            <div className="absolute -bottom-6 -left-6 bg-white p-6 rounded-3xl shadow-xl border border-gray-100 animate-bounce-slow">
                                <div className="flex items-center gap-4">
                                    <div className="h-12 w-12 bg-orange-100 rounded-2xl flex items-center justify-center">
                                        <Clock className="h-6 w-6 text-orange-600" />
                                    </div>
                                    <div>
                                        <div className="text-xs font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Estimated Time</div>
                                        <div className="text-lg font-black text-gray-900">30-45 Mins</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom Mesh Gradient */}
                <div className="absolute inset-x-0 top-[calc(100%-13rem)] -z-10 transform-gpu overflow-hidden blur-3xl sm:top-[calc(100%-30rem)]" aria-hidden="true">
                    <div className="relative left-[calc(50%+3rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] opacity-20 sm:left-[calc(50%+36rem)] sm:w-[72.1875rem]"></div>
                </div>
            </div>

            {/* Features Section */}
            <div className="py-24 sm:py-32 bg-gray-50/50 relative overflow-hidden">
                <div className="max-w-7xl mx-auto px-6 lg:px-8">
                    <div className="mx-auto max-w-2xl text-center mb-16">
                        <h2 className="text-base font-black text-orange-600 uppercase tracking-[0.3em] mb-4">Our Commitment</h2>
                        <p className="text-4xl font-black tracking-tight text-gray-900 sm:text-5xl">A better way to eat every day</p>
                    </div>

                    <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
                        <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-3">
                            {[
                                {
                                    name: 'Hygienic & Healthy',
                                    description: 'We follow strict health protocols to ensure every bite is safe, nutritious, and balanced.',
                                    icon: ShieldCheck,
                                    color: 'bg-teal-500'
                                },
                                {
                                    name: 'On-Time Delivery',
                                    description: 'Your time is precious. We guarantee fresh meals at your doorstep exactly when you need them.',
                                    icon: Clock,
                                    color: 'bg-orange-500'
                                },
                                {
                                    name: 'Eco-Friendly Packing',
                                    description: 'Sustainable, high-quality packaging that keeps your food hot and our planet happy.',
                                    icon: Truck,
                                    color: 'bg-blue-500'
                                }
                            ].map((feature) => (
                                <div key={feature.name} className="relative group p-8 bg-white rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
                                    <dt className="flex flex-col gap-y-6">
                                        <div className={`h-14 w-14 rounded-2xl flex items-center justify-center text-white ${feature.color} shadow-lg shadow-inherit ring-4 ring-white`}>
                                            <feature.icon className="h-7 w-7" aria-hidden="true" />
                                        </div>
                                        <p className="text-xl font-black text-gray-900 leading-none">{feature.name}</p>
                                    </dt>
                                    <dd className="mt-4 text-base leading-7 text-gray-600">
                                        {feature.description}
                                    </dd>
                                </div>
                            ))}
                        </dl>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Home;
