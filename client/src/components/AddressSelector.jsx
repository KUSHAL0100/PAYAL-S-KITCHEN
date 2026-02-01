import React, { useState, useEffect } from 'react';
import { MapPin, CheckCircle } from 'lucide-react';

const AddressSelector = ({ user, selectedAddress, onAddressChange }) => {
    const [selectedAddressIndex, setSelectedAddressIndex] = useState(-1);
    const [isCustomAddress, setIsCustomAddress] = useState(false);

    useEffect(() => {
        if (user && user.addresses && user.addresses.length > 0) {
            // Find if current selectedAddress matches any saved address
            const index = user.addresses.findIndex(addr =>
                addr.street === selectedAddress.street &&
                addr.city === selectedAddress.city &&
                addr.zip === selectedAddress.zip
            );

            if (index !== -1) {
                setSelectedAddressIndex(index);
                setIsCustomAddress(false);
            } else if (selectedAddress.street || selectedAddress.city || selectedAddress.zip) {
                setSelectedAddressIndex(-1);
                setIsCustomAddress(true);
            } else {
                // Default to first saved address if no address is set yet
                setSelectedAddressIndex(0);
                setIsCustomAddress(false);
                onAddressChange(user.addresses[0]);
            }
        } else {
            setIsCustomAddress(true);
            setSelectedAddressIndex(-1);
        }
    }, [user]);

    const handleAddressSelection = (index) => {
        setSelectedAddressIndex(index);
        if (index === -1) {
            setIsCustomAddress(true);
            onAddressChange({ street: '', city: '', zip: '', country: 'India' });
        } else {
            setIsCustomAddress(false);
            onAddressChange({ ...user.addresses[index], country: 'India' });
        }
    };

    const handleCustomAddressChange = (e) => {
        onAddressChange({ ...selectedAddress, [e.target.name]: e.target.value });
    };

    return (
        <div className="space-y-4">
            <h4 className="text-sm font-black text-gray-900 flex items-center mb-3 uppercase tracking-wider">
                <MapPin className="h-4 w-4 mr-2 text-orange-600" />
                Delivery Address
            </h4>

            <div className="grid grid-cols-1 gap-2">
                {user?.addresses?.map((addr, index) => (
                    <div
                        key={index}
                        onClick={() => handleAddressSelection(index)}
                        className={`p-4 rounded-2xl border-2 cursor-pointer flex items-center transition-all duration-200 ${selectedAddressIndex === index
                                ? 'border-orange-500 bg-orange-50 shadow-md ring-1 ring-orange-500'
                                : 'border-gray-100 bg-white hover:border-gray-200'
                            }`}
                    >
                        <div className="flex-1">
                            <p className={`text-sm font-bold ${selectedAddressIndex === index ? 'text-orange-900' : 'text-gray-900'}`}>
                                {addr.label || `Address ${index + 1}`}
                            </p>
                            <p className="text-xs text-gray-500 truncate">{addr.street}, {addr.city}</p>
                        </div>
                        {selectedAddressIndex === index && (
                            <div className="bg-orange-600 text-white rounded-full p-1 shadow-lg">
                                <CheckCircle className="h-4 w-4" />
                            </div>
                        )}
                    </div>
                ))}

                <div
                    onClick={() => handleAddressSelection(-1)}
                    className={`p-4 rounded-2xl border-2 cursor-pointer flex items-center transition-all duration-200 ${selectedAddressIndex === -1
                            ? 'border-orange-500 bg-orange-50 shadow-md ring-1 ring-orange-500'
                            : 'border-gray-100 bg-white hover:border-gray-200'
                        }`}
                >
                    <div className="flex-1">
                        <p className={`text-sm font-bold ${selectedAddressIndex === -1 ? 'text-orange-900' : 'text-gray-900'}`}>
                            Use a different address
                        </p>
                    </div>
                    {selectedAddressIndex === -1 && (
                        <div className="bg-orange-600 text-white rounded-full p-1 shadow-lg">
                            <CheckCircle className="h-4 w-4" />
                        </div>
                    )}
                </div>
            </div>

            {isCustomAddress && (
                <div className="mt-4 space-y-3 animate-fadeIn">
                    <input
                        type="text"
                        name="street"
                        value={selectedAddress.street}
                        onChange={handleCustomAddressChange}
                        placeholder="Street Address"
                        className="block w-full border-gray-200 rounded-xl shadow-sm focus:ring-orange-500 focus:border-orange-500 sm:text-sm p-3 border font-medium bg-gray-50/50"
                    />
                    <div className="flex space-x-2">
                        <input
                            type="text"
                            name="city"
                            value={selectedAddress.city}
                            onChange={handleCustomAddressChange}
                            placeholder="City"
                            className="block w-full border-gray-200 rounded-xl shadow-sm focus:ring-orange-500 focus:border-orange-500 sm:text-sm p-3 border font-medium bg-gray-50/50"
                        />
                        <input
                            type="text"
                            name="zip"
                            value={selectedAddress.zip}
                            onChange={handleCustomAddressChange}
                            placeholder="ZIP"
                            className="block w-full border-gray-200 rounded-xl shadow-sm focus:ring-orange-500 focus:border-orange-500 sm:text-sm p-3 border font-medium bg-gray-50/50"
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default AddressSelector;
