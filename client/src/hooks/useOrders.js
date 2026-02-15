import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

const fetchOrderStats = async () => {
    const config = {
        headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
    };
    const { data } = await axios.get('http://127.0.0.1:5000/api/orders/my-stats', config);
    return data;
};

const fetchMyOrders = async () => {
    const config = {
        headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
    };
    const { data } = await axios.get('http://127.0.0.1:5000/api/orders/myorders', config);
    return data;
};

const cancelOrder = async (orderId) => {
    const config = {
        headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
    };
    const { data } = await axios.put(`http://127.0.0.1:5000/api/orders/${orderId}/cancel`, {}, config);
    return data;
};

/**
 * Custom hook to fetch user order statistics.
 */
export const useOrderStats = () => {
    return useQuery({
        queryKey: ['orderStats'],
        queryFn: fetchOrderStats,
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
};

/**
 * Custom hook to fetch user's own orders.
 */
export const useMyOrders = () => {
    return useQuery({
        queryKey: ['myOrders'],
        queryFn: fetchMyOrders,
        staleTime: 60 * 1000, // 1 minute
    });
};

/**
 * Custom hook to cancel an order.
 */
export const useCancelOrder = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: cancelOrder,
        onSuccess: () => {
            // Invalidate and refetch orders and stats to keep UI in sync
            queryClient.invalidateQueries({ queryKey: ['myOrders'] });
            queryClient.invalidateQueries({ queryKey: ['orderStats'] });
        },
    });
};
