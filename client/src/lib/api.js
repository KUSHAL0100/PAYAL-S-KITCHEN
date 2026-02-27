import axios from 'axios';

/**
 * Centralized Axios instance.
 * All API requests go through this, so the base URL
 * is configured in ONE place instead of 50+ files.
 * 
 * For deployment, change VITE_API_URL in .env
 * For local dev, it defaults to http://127.0.0.1:5000
 */
const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000',
});

// Automatically attach JWT token to every request
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Global response error handler
api.interceptors.response.use(
    (response) => response,
    (error) => {
        // If token is expired/invalid, auto-logout
        if (error.response?.status === 401) {
            const currentPath = window.location.pathname;
            // Don't redirect if already on login/register page
            if (currentPath !== '/login' && currentPath !== '/register') {
                localStorage.removeItem('token');
                // Optional: redirect to login
            }
        }
        return Promise.reject(error);
    }
);

export default api;
