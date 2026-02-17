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

    const updateQuantity = (id, quantity) => {
        if (quantity < 1) return { success: true };
        if (quantity > 19) {
            return { success: false, message: 'Maximum 19 persons allowed per order slot.' };
        }
        setCartItems((prevItems) =>
            prevItems.map((item) => {
                if (item.id === id) {
                    const price = item.price || 0;
                    return {
                        ...item,
                        quantity,
                        totalAmount: price * quantity
                    };
                }
                return item;
            })
        );
        return { success: true };
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
