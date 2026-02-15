import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

const API_URL = 'http://127.0.0.1:5000/api/menu';

/**
 * Fetches today's menu for a specific plan.
 */
export const useTodaysMenu = (planType) => {
    return useQuery({
        queryKey: ['menu', 'today', planType],
        queryFn: async () => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const { data } = await axios.get(`${API_URL}?date=${today.toISOString()}&planType=${planType}`);
            return data[0] || null;
        },
        staleTime: 10 * 60 * 1000, // 10 minutes
    });
};

/**
 * Fetches a range of menus for the weekly view.
 */
export const useWeeklyMenu = (planType, currentDate) => {
    return useQuery({
        queryKey: ['menu', 'weekly', planType, currentDate.getMonth(), currentDate.getFullYear()],
        queryFn: async () => {
            const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
            const endOfRange = new Date(startOfMonth);
            endOfRange.setDate(endOfRange.getDate() + 14);

            const { data } = await axios.get(
                `${API_URL}?startDate=${startOfMonth.toISOString()}&endDate=${endOfRange.toISOString()}&planType=${planType}`
            );

            // Process to get one of each weekday (0-6)
            const uniqueWeekdays = [];
            const targetOrder = [0, 1, 2, 3, 4, 5, 6];

            targetOrder.forEach(dayIndex => {
                const found = data.find(m => new Date(m.date).getDay() === dayIndex);
                if (found) uniqueWeekdays.push(found);
            });

            return uniqueWeekdays;
        },
        staleTime: 30 * 60 * 1000, // 30 minutes (menu doesn't change often)
    });
};

/**
 * Fetches menu for a specific date (for the order modal).
 */
export const useDateMenu = (planType, date, enabled) => {
    return useQuery({
        queryKey: ['menu', 'date', planType, date],
        queryFn: async () => {
            if (!date) return null;
            const selectedDate = new Date(date);
            selectedDate.setHours(0, 0, 0, 0);
            const { data } = await axios.get(
                `${API_URL}?date=${selectedDate.toISOString()}&planType=${planType}`
            );
            return data[0] || null;
        },
        enabled: !!enabled && !!date,
        staleTime: 5 * 60 * 1000,
    });
};
