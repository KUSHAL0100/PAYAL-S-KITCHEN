import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';

/**
 * Fetches today's menu for a specific plan.
 */
export const useTodaysMenu = (planType) => {
    return useQuery({
        queryKey: ['menu', 'today', planType],
        queryFn: async () => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const { data } = await api.get(`/api/menu?date=${today.toISOString()}&planType=${planType}`);
            return data[0] || null;
        },
        staleTime: 10 * 60 * 1000,
    });
};

/**
 * Fetches a range of menus for the weekly view.
 */
export const useWeeklyMenu = (planType, currentDate) => {
    const startOfWeek = new Date(currentDate);
    startOfWeek.setHours(0, 0, 0, 0);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day;
    startOfWeek.setDate(diff);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    return useQuery({
        queryKey: ['menu', 'weekly', planType, startOfWeek.toISOString()],
        queryFn: async () => {
            const { data } = await api.get(
                `/api/menu?startDate=${startOfWeek.toISOString()}&endDate=${endOfWeek.toISOString()}&planType=${planType}`
            );

            const uniqueWeekdays = [];
            const targetOrder = [0, 1, 2, 3, 4, 5, 6];

            targetOrder.forEach(dayIndex => {
                const found = data.find(m => new Date(m.date).getDay() === dayIndex);
                if (found) uniqueWeekdays.push(found);
            });

            return uniqueWeekdays;
        },
        staleTime: 30 * 60 * 1000,
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
            const { data } = await api.get(
                `/api/menu?date=${selectedDate.toISOString()}&planType=${planType}`
            );
            return data[0] || null;
        },
        enabled: !!enabled && !!date,
        staleTime: 5 * 60 * 1000,
    });
};
