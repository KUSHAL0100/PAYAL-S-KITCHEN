import { useQuery, useMutation } from '@tanstack/react-query';
import axios from 'axios';

const API_URL = 'http://127.0.0.1:5000/api/coupons';

const getAuthHeader = () => ({
    headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
    },
});

/**
 * Fetches all active coupons.
 */
export const useActiveCoupons = () => {
    return useQuery({
        queryKey: ['coupons', 'active'],
        queryFn: async () => {
            const { data } = await axios.get(`${API_URL}/active`, getAuthHeader());
            return data;
        },
        staleTime: 10 * 60 * 1000,
    });
};

/**
 * Validates a coupon code.
 */
export const useValidateCoupon = () => {
    return useMutation({
        mutationFn: async (code) => {
            const { data } = await axios.post(
                `${API_URL}/validate`,
                { code },
                getAuthHeader()
            );
            return data;
        },
    });
};
