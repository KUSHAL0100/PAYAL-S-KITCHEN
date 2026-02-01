import { useState, useCallback } from 'react';
import axios from 'axios';

const useRazorpay = () => {
    const [loading, setLoading] = useState(false);

    const loadScript = useCallback(() => {
        return new Promise((resolve) => {
            const script = document.createElement('script');
            script.src = 'https://checkout.razorpay.com/v1/checkout.js';
            script.async = true;
            script.onload = () => resolve(true);
            script.onerror = () => resolve(false);
            document.body.appendChild(script);
        });
    }, []);

    const initPayment = useCallback(async ({
        amount,
        currency,
        orderId,
        metadata,
        user,
        description,
        onSuccess,
        onError,
        verifyUrl,
        showNotification
    }) => {
        setLoading(true);
        const res = await loadScript();

        if (!res) {
            showNotification('Razorpay SDK failed to load. Are you online?', 'error');
            setLoading(false);
            return;
        }

        const options = {
            key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_placeholder',
            amount: amount,
            currency: currency,
            name: "Payal's Kitchen",
            description: description,
            order_id: orderId,
            handler: async function (response) {
                try {
                    const verifyConfig = {
                        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
                    };

                    const verificationRes = await axios.post(verifyUrl, {
                        ...response,
                        ...metadata
                    }, verifyConfig);

                    onSuccess(verificationRes.data, response);
                } catch (error) {
                    console.error('Payment verification failed:', error);
                    onError(error);
                }
            },
            prefill: {
                name: user.name,
                email: user.email,
            },
            theme: {
                color: '#ea580c',
            },
        };

        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', function (response) {
            showNotification(response.error.description, 'error');
            if (onError) onError(response.error);
        });
        rzp.open();
        setLoading(false);
    }, [loadScript]);

    return { initPayment, loading };
};

export default useRazorpay;
