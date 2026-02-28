import React, { createContext, useState, useEffect } from 'react';

const CartContext = createContext();

export const CartProvider = ({ children }) => {
    const [cartItems, setCartItems] = useState(() => {
        try {
            const storedCart = localStorage.getItem('cart');
            return storedCart ? JSON.parse(storedCart) : [];
        } catch (error) {
            console.error("Failed to parse cart from localStorage:", error);
            return [];
        }
    });

    useEffect(() => {
        localStorage.setItem('cart', JSON.stringify(cartItems));
    }, [cartItems]);

    const addToCart = (item) => {
        let result = { success: true };

        setCartItems((prevItems) => {
            // Check if same item already exists (same type, plan, meal time, and date)
            const existingItemIndex = prevItems.findIndex((i) =>
                i.type === item.type &&
                i.planType === item.planType &&
                i.mealTime === item.mealTime &&
                i.deliveryDate === item.deliveryDate
            );

            // Calculate current quantity for this specific slot
            const currentQuantity = existingItemIndex !== -1 ? prevItems[existingItemIndex].quantity : 0;
            const newTotalQuantity = currentQuantity + item.quantity;

            // Enforce Maximum Limit of 19
            if (newTotalQuantity > 19) {
                result = {
                    success: false,
                    message: `Limit Exceeded: You can only order up to 19 tiffins per slot. You already have ${currentQuantity} in your cart.`
                };
                return prevItems;
            }

            if (existingItemIndex !== -1) {
                // Update existing item
                const updatedItems = [...prevItems];
                const existingItem = updatedItems[existingItemIndex];

                updatedItems[existingItemIndex] = {
                    ...existingItem,
                    quantity: newTotalQuantity,
                    totalAmount: existingItem.totalAmount + item.totalAmount
                };
                return updatedItems;
            } else {
                return [...prevItems, item];
            }
        });

        return result;
    };

    const removeFromCart = (id) => {
        setCartItems((prevItems) => prevItems.filter((item) => item.id !== id));
    };

    const updateQuantity = (id, newQty) => {
        let result = { success: true };

        setCartItems((prevItems) =>
            prevItems.map((item) => {
                if (item.id === id) {
                    if (item.type === 'event') {
                        if (newQty < 20) return item; // Minimum 20 for events
                        if (newQty > 50) {
                            result = { success: false, message: 'Maximum 50 guests allowed for event catering.' };
                            return item;
                        }
                        const price = item.pricePerPlate || 0;
                        return {
                            ...item,
                            guestCount: newQty,
                            totalAmount: price * newQty
                        };
                    } else {
                        if (newQty < 1) return item;
                        if (newQty > 19) {
                            result = { success: false, message: 'Maximum 19 persons allowed per order slot.' };
                            return item;
                        }
                        const price = item.price || 0;
                        return {
                            ...item,
                            quantity: newQty,
                            totalAmount: price * newQty
                        };
                    }
                }
                return item;
            })
        );
        return result;
    };

    const clearCart = () => {
        setCartItems([]);
    };

    const getCartTotal = () => {
        return cartItems.reduce((total, item) => {
            if (item.type === 'event' || item.type === 'single_tiffin') {
                return total + (item.totalAmount || 0);
            }
            return total + (item.price || 0) * (item.quantity || 1);
        }, 0);
    };

    return (
        <CartContext.Provider
            value={{
                cartItems,
                addToCart,
                removeFromCart,
                updateQuantity,
                clearCart,
                getCartTotal,
            }}
        >
            {children}
        </CartContext.Provider>
    );
};

export default CartContext;
