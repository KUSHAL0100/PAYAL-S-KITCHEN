import React from 'react';

const Footer = () => {
    return (
        <footer className="bg-gray-800 text-white py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center">
                    <div>
                        <h3 className="text-lg font-bold">Payal's Kitchen</h3>
                        <p className="text-sm text-gray-400">Delicious tiffin service delivered to your door.</p>
                    </div>
                    <div className="text-sm text-gray-400">
                        &copy; {new Date().getFullYear()} Payal's Kitchen. All rights reserved.
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
