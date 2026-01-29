import React, { createContext, useState, useCallback } from 'react';

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
    const [notification, setNotification] = useState(null);

    const showNotification = useCallback((message, type = 'info') => {
        const id = Date.now();
        setNotification({ id, message, type });

        // Auto-dismiss after 3 seconds
        setTimeout(() => {
            setNotification((current) => {
                if (current && current.id === id) {
                    return null;
                }
                return current;
            });
        }, 3000);
    }, []);

    const hideNotification = useCallback(() => {
        setNotification(null);
    }, []);

    return (
        <NotificationContext.Provider value={{ notification, showNotification, hideNotification }}>
            {children}
        </NotificationContext.Provider>
    );
};

export default NotificationContext;
