import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { Menu, User, ShoppingCart, LogOut, ClipboardList, MessageSquare, CreditCard } from 'lucide-react';
import AuthContext from '../context/AuthContext';
import CartContext from '../context/CartContext';

const Navbar = () => {
    const { user, logout } = useContext(AuthContext);
    const { cartItems } = useContext(CartContext);

    const cartCount = cartItems.reduce((total, item) => total + item.quantity, 0);

    return (
        <nav className="sticky top-0 z-[100] w-full bg-white/70 backdrop-blur-xl border-b border-gray-100/50">
            <div className="max-w-7xl mx-auto px-6 lg:px-8">
                <div className="flex justify-between h-20">
                    <div className="flex items-center gap-12">
                        <Link to="/" className="flex-shrink-0 flex items-center group">
                            <div className="h-10 w-10 bg-orange-600 rounded-xl flex items-center justify-center mr-3 group-hover:rotate-12 transition-transform shadow-lg shadow-orange-200">
                                <span className="text-white font-black text-xl">P</span>
                            </div>
                            <span className="text-xl font-black text-gray-900 tracking-tight group-hover:text-orange-600 transition-colors">
                                Payal's <span className="text-orange-600">Kitchen</span>
                            </span>
                        </Link>

                        <div className="hidden lg:flex items-center gap-8">
                            {[
                                { name: 'Home', path: '/' },
                                { name: 'Menu', path: '/menu' },
                                { name: 'Plans', path: '/plans' },
                                { name: 'Event Catering', path: '/events' },
                                { name: 'Contact', path: '/complaints' },
                            ].map((item) => (
                                <Link
                                    key={item.name}
                                    to={item.path}
                                    className="text-xs font-black uppercase tracking-[0.2em] text-gray-500 hover:text-orange-600 transition-colors relative group py-2"
                                >
                                    {item.name}
                                    <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-orange-600 transition-all group-hover:w-full"></span>
                                </Link>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <Link to="/cart" className="relative h-10 w-10 flex items-center justify-center text-gray-400 hover:text-gray-900 transition-colors bg-gray-50 rounded-xl group">
                            <ShoppingCart className="h-5 w-5 group-hover:scale-110 transition-transform" />
                            {cartCount > 0 && (
                                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center bg-orange-600 text-[10px] font-black text-white rounded-lg shadow-lg shadow-orange-200">
                                    {cartCount}
                                </span>
                            )}
                        </Link>

                        {user ? (
                            <div className="flex items-center gap-2 pl-4 border-l border-gray-100">
                                <Link to="/profile" className="h-10 w-10 flex items-center justify-center text-gray-400 hover:text-gray-900 transition-colors hover:bg-gray-50 rounded-xl" title="Profile">
                                    <User className="h-5 w-5" />
                                </Link>
                                <Link to="/my-subscription" className="h-10 w-10 flex items-center justify-center text-gray-400 hover:text-gray-900 transition-colors hover:bg-gray-50 rounded-xl" title="Subscription">
                                    <CreditCard className="h-5 w-5" />
                                </Link>
                                <Link to="/orders" className="h-10 w-10 flex items-center justify-center text-gray-400 hover:text-gray-900 transition-colors hover:bg-gray-50 rounded-xl" title="Orders">
                                    <ClipboardList className="h-5 w-5" />
                                </Link>

                                <button
                                    onClick={logout}
                                    className="ml-2 h-10 w-10 flex items-center justify-center text-gray-400 hover:text-rose-600 transition-colors hover:bg-rose-50 rounded-xl"
                                    title="Logout"
                                >
                                    <LogOut className="h-5 w-5" />
                                </button>
                            </div>
                        ) : (
                            <Link
                                to="/login"
                                className="ml-4 px-6 py-2.5 bg-orange-600 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-orange-700 transition-all active:scale-95 shadow-lg shadow-orange-100"
                            >
                                Login
                            </Link>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
