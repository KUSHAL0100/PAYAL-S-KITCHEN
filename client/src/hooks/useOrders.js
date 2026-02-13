import { useQuery } from '@tanstack/react-query';
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
