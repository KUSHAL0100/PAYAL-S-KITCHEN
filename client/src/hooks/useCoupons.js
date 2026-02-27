import { useQuery, useMutation } from '@tanstack/react-query';
import api from '../lib/api';

/**
 * Fetches all active coupons.
 */
export const useActiveCoupons = () => {
    return useQuery({
        queryKey: ['coupons', 'active'],
        queryFn: async () => {
            const { data } = await api.get('/api/coupons/active');
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
            const { data } = await api.post('/api/coupons/validate', { code });
            return data;
        },
    });
};
