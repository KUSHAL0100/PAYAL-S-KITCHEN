import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

const fetchOrderStats = async () => {
    const { data } = await api.get('/api/orders/my-stats');
    return data;
};

const fetchMyOrders = async () => {
    const { data } = await api.get('/api/orders/myorders');
    return data;
};

const cancelOrderFn = async (orderId) => {
    const { data } = await api.put(`/api/orders/${orderId}/cancel`);
    return data;
};

/**
 * Custom hook to fetch user order statistics.
 */
export const useOrderStats = (userId) => {
    return useQuery({
        queryKey: ['orderStats', userId],
        queryFn: fetchOrderStats,
        staleTime: 5 * 60 * 1000,
        enabled: !!userId,
    });
};

/**
 * Custom hook to fetch user's own orders.
 */
export const useMyOrders = () => {
    return useQuery({
        queryKey: ['myOrders'],
        queryFn: fetchMyOrders,
        staleTime: 60 * 1000,
    });
};

/**
 * Custom hook to cancel an order.
 */
export const useCancelOrder = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: cancelOrderFn,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['myOrders'] });
            queryClient.invalidateQueries({ queryKey: ['orderStats'] });
        },
    });
};
