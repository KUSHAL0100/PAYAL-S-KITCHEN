import React, { useState, useEffect } from 'react';
import { MapPin, CheckCircle } from 'lucide-react';

const AddressSelector = ({
    user,
    selectedAddress,
    onAddressChange,
    // New props for dual address support
    dualAddressMode = false,
    useDualAddresses = false,
    onToggleDualAddress,
    lunchAddress,
    dinnerAddress,
    onLunchAddressChange,
    onDinnerAddressChange
}) => {
    const [selectedAddressIndex, setSelectedAddressIndex] = useState(-1);
    const [isCustomAddress, setIsCustomAddress] = useState(false);
    const [lunchAddressIndex, setLunchAddressIndex] = useState(-1);
    const [dinnerAddressIndex, setDinnerAddressIndex] = useState(-1);
    const [isCustomLunchAddress, setIsCustomLunchAddress] = useState(false);
    const [isCustomDinnerAddress, setIsCustomDinnerAddress] = useState(false);

    useEffect(() => {
        // Check if dual addresses are already set
        if (dualAddressMode && lunchAddress?.street && dinnerAddress?.street && typeof onToggleDualAddress === 'function') {
            onToggleDualAddress(true);
        }
    }, [dualAddressMode, lunchAddress, dinnerAddress]);

    useEffect(() => {
        if (!dualAddressMode || !useDualAddresses) {
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
        }
    }, [user, useDualAddresses]);

    const handleAddressSelection = (index) => {
        setSelectedAddressIndex(index);
        if (index === -1) {
            setIsCustomAddress(true);
            onAddressChange({ street: '', city: '', zip: '' });
        } else {
            setIsCustomAddress(false);
            onAddressChange({ ...user.addresses[index] });
        }
    };

    const handleLunchAddressSelection = (index) => {
        setLunchAddressIndex(index);
        if (index === -1) {
            setIsCustomLunchAddress(true);
            onLunchAddressChange({ street: '', city: '', zip: '' });
        } else {
            setIsCustomLunchAddress(false);
            onLunchAddressChange({ ...user.addresses[index] });
        }
    };

    const handleDinnerAddressSelection = (index) => {
        setDinnerAddressIndex(index);
        if (index === -1) {
            setIsCustomDinnerAddress(true);
            onDinnerAddressChange({ street: '', city: '', zip: '' });
        } else {
            setIsCustomDinnerAddress(false);
            onDinnerAddressChange({ ...user.addresses[index] });
        }
    };

    const handleCustomAddressChange = (e) => {
        onAddressChange({ ...selectedAddress, [e.target.name]: e.target.value });
    };

    const handleCustomLunchAddressChange = (e) => {
        onLunchAddressChange({ ...lunchAddress, [e.target.name]: e.target.value });
    };

    const handleCustomDinnerAddressChange = (e) => {
        onDinnerAddressChange({ ...dinnerAddress, [e.target.name]: e.target.value });
    };

    const handleToggleDualAddress = (enabled) => {
        if (onToggleDualAddress) {
            onToggleDualAddress(enabled);
        }
        if (!enabled && dualAddressMode) {
            // Switching back to single address - use lunch address as default if available
            if (onAddressChange && lunchAddress) {
                onAddressChange(lunchAddress);
                setIsCustomAddress(true);
                setSelectedAddressIndex(-1);
            }
        } else if (enabled && dualAddressMode) {
            // Initialize both addresses if not set
            if (!lunchAddress || !lunchAddress.street) {
                onLunchAddressChange({ street: '', city: '', zip: '' });
                setIsCustomLunchAddress(true);
            }
            if (!dinnerAddress || !dinnerAddress.street) {
                onDinnerAddressChange({ street: '', city: '', zip: '' });
                setIsCustomDinnerAddress(true);
            }
        }
    };

    const renderAddressInputs = (address, onChange, label = '') => (
        <div className="space-y-3">
            {label && (
                <h5 className="text-xs font-black text-gray-700 uppercase tracking-wider">{label}</h5>
            )}
            <input
                type="text"
                name="street"
                value={address?.street || ''}
                onChange={onChange}
                maxLength={80}
                className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                placeholder="Street Address"
                required
            />
            <div className="grid grid-cols-2 gap-3">
                <input
                    type="text"
                    name="city"
                    value={address?.city || ''}
                    onChange={onChange}
                    maxLength={30}
                    className="px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                    placeholder="City"
                    required
                />
                <input
                    type="text"
                    name="zip"
                    value={address?.zip || ''}
                    onChange={onChange}
                    maxLength={10}
                    className="px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                    placeholder="ZIP Code"
                    required
                />
            </div>
        </div>
    );

    return (
        <div className="space-y-4">
            <h4 className="text-sm font-black text-gray-900 flex items-center mb-3 uppercase tracking-wider">
                <MapPin className="h-4 w-4 mr-2 text-orange-600" />
                Delivery Address
            </h4>

            {/* Dual Address Toggle (only if dual mode enabled) */}
            {dualAddressMode && (
                <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl mb-4">
                    <label className="flex items-start cursor-pointer">
                        <input
                            type="checkbox"
                            checked={useDualAddresses}
                            onChange={(e) => handleToggleDualAddress(e.target.checked)}
                            className="mt-1 w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                        />
                        <div className="ml-3">
                            <span className="text-sm font-bold text-gray-900 block">
                                Use different addresses for lunch and dinner
                            </span>
                            <p className="mt-1 text-xs text-gray-600">
                                Enable this if you want meals delivered to different locations
                            </p>
                        </div>
                    </label>
                </div>
            )}

            {/* Single Address Mode */}
            {(!dualAddressMode || !useDualAddresses) && (
                <>
                    <div className="grid grid-cols-1 gap-2">
                        {user?.addresses?.map((addr, index) => (
                            <div
                                key={index}
                                onClick={() => handleAddressSelection(index)}
                                className={`relative cursor-pointer p-4 border-2 rounded-xl transition-all duration-200 ${selectedAddressIndex === index
                                    ? 'border-orange-500 bg-orange-50/50 shadow-md'
                                    : 'border-gray-100 hover:border-gray-200 bg-white'
                                    }`}
                            >
                                <p className="text-sm text-gray-700">
                                    {addr.street}, {addr.city}, {addr.zip}
                                </p>
                                {selectedAddressIndex === index && (
                                    <CheckCircle className="absolute top-3 right-3 h-5 w-5 text-orange-600" />
                                )}
                            </div>
                        ))}

                        {/* Custom Address Option */}
                        <div
                            onClick={() => handleAddressSelection(-1)}
                            className={`relative cursor-pointer p-4 border-2 rounded-xl transition-all duration-200 ${isCustomAddress
                                ? 'border-orange-500 bg-orange-50/50 shadow-md'
                                : 'border-gray-100 hover:border-gray-200 bg-white'
                                }`}
                        >
                            <p className="text-sm font-bold text-gray-700">+ Use Custom Address</p>
                            {isCustomAddress && (
                                <CheckCircle className="absolute top-3 right-3 h-5 w-5 text-orange-600" />
                            )}
                        </div>
                    </div>

                    {/* Custom Address Inputs */}
                    {isCustomAddress && (
                        <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
                            {renderAddressInputs(selectedAddress, handleCustomAddressChange)}
                        </div>
                    )}
                </>
            )}

            {/* Dual Address Mode */}
            {dualAddressMode && useDualAddresses && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Lunch Address */}
                    <div className="space-y-3 p-5 bg-orange-50/30 border-2 border-orange-200 rounded-2xl">
                        <h4 className="text-sm font-black text-orange-900 uppercase tracking-wider flex items-center">
                            <MapPin className="h-4 w-4 mr-2" />
                            Lunch Address
                        </h4>

                        {/* Saved Lunch Addresses */}
                        <div className="space-y-2">
                            {user?.addresses?.map((addr, index) => (
                                <div
                                    key={index}
                                    onClick={() => handleLunchAddressSelection(index)}
                                    className={`relative cursor-pointer p-3 border-2 rounded-lg transition-all duration-200 text-sm ${lunchAddressIndex === index
                                        ? 'border-orange-500 bg-white shadow-md'
                                        : 'border-orange-100 hover:border-orange-300 bg-white/50'
                                        }`}
                                >
                                    <p className="text-gray-700 text-xs">
                                        {addr.street}, {addr.city}
                                    </p>
                                    {lunchAddressIndex === index && (
                                        <CheckCircle className="absolute top-2 right-2 h-4 w-4 text-orange-600" />
                                    )}
                                </div>
                            ))}

                            <div
                                onClick={() => handleLunchAddressSelection(-1)}
                                className={`relative cursor-pointer p-3 border-2 rounded-lg transition-all duration-200 ${isCustomLunchAddress
                                    ? 'border-orange-500 bg-white shadow-md'
                                    : 'border-orange-100 hover:border-orange-300 bg-white/50'
                                    }`}
                            >
                                <p className="text-xs font-bold text-gray-700">+ Custom</p>
                                {isCustomLunchAddress && (
                                    <CheckCircle className="absolute top-2 right-2 h-4 w-4 text-orange-600" />
                                )}
                            </div>
                        </div>

                        {isCustomLunchAddress && (
                            <div className="mt-3 p-3 bg-white rounded-lg border border-orange-200">
                                {renderAddressInputs(lunchAddress, handleCustomLunchAddressChange)}
                            </div>
                        )}
                    </div>

                    {/* Dinner Address */}
                    <div className="space-y-3 p-5 bg-blue-50/30 border-2 border-blue-200 rounded-2xl">
                        <h4 className="text-sm font-black text-blue-900 uppercase tracking-wider flex items-center">
                            <MapPin className="h-4 w-4 mr-2" />
                            Dinner Address
                        </h4>

                        {/* Saved Dinner Addresses */}
                        <div className="space-y-2">
                            {user?.addresses?.map((addr, index) => (
                                <div
                                    key={index}
                                    onClick={() => handleDinnerAddressSelection(index)}
                                    className={`relative cursor-pointer p-3 border-2 rounded-lg transition-all duration-200 text-sm ${dinnerAddressIndex === index
                                        ? 'border-blue-500 bg-white shadow-md'
                                        : 'border-blue-100 hover:border-blue-300 bg-white/50'
                                        }`}
                                >
                                    <p className="text-gray-700 text-xs">
                                        {addr.street}, {addr.city}
                                    </p>
                                    {dinnerAddressIndex === index && (
                                        <CheckCircle className="absolute top-2 right-2 h-4 w-4 text-blue-600" />
                                    )}
                                </div>
                            ))}

                            <div
                                onClick={() => handleDinnerAddressSelection(-1)}
                                className={`relative cursor-pointer p-3 border-2 rounded-lg transition-all duration-200 ${isCustomDinnerAddress
                                    ? 'border-blue-500 bg-white shadow-md'
                                    : 'border-blue-100 hover:border-blue-300 bg-white/50'
                                    }`}
                            >
                                <p className="text-xs font-bold text-gray-700">+ Custom</p>
                                {isCustomDinnerAddress && (
                                    <CheckCircle className="absolute top-2 right-2 h-4 w-4 text-blue-600" />
                                )}
                            </div>
                        </div>

                        {isCustomDinnerAddress && (
                            <div className="mt-3 p-3 bg-white rounded-lg border border-blue-200">
                                {renderAddressInputs(dinnerAddress, handleCustomDinnerAddressChange)}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AddressSelector;
