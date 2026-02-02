import React, { useContext } from 'react';
import NotificationContext from '../context/NotificationContext';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';

const Notification = () => {
    const { notification, hideNotification } = useContext(NotificationContext);

    if (!notification) return null;

    const { type, message } = notification;

    let bgColor = 'bg-blue-50';
    let textColor = 'text-blue-800';
    let icon = <Info className="h-5 w-5 text-blue-400" />;

    if (type === 'success') {
        bgColor = 'bg-green-50';
        textColor = 'text-green-800';
        icon = <CheckCircle className="h-5 w-5 text-green-400" />;
    } else if (type === 'error') {
        bgColor = 'bg-red-50';
        textColor = 'text-red-800';
        icon = <XCircle className="h-5 w-5 text-red-400" />;
    }

    return (
        <div className={`fixed top-4 right-4 z-[1000] w-full max-w-sm overflow-hidden rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 ${bgColor} transform transition-all duration-300 ease-in-out`}>
            <div className="p-4">
                <div className="flex items-start">
                    <div className="flex-shrink-0">
                        {icon}
                    </div>
                    <div className="ml-3 w-0 flex-1 pt-0.5">
                        <p className={`text-sm font-medium ${textColor}`}>
                            {message}
                        </p>
                    </div>
                    <div className="ml-4 flex flex-shrink-0">
                        <button
                            type="button"
                            className={`inline-flex rounded-md ${bgColor} ${textColor} hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
                            onClick={hideNotification}
                        >
                            <span className="sr-only">Close</span>
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Notification;
