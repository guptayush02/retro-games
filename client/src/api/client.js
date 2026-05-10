import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import { useGuestStore } from '../store/guestStore';

const API_URL = import.meta.env.VITE_API_URL || '';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    const guestToken = useGuestStore.getState().guestToken;

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    } else if (guestToken) {
      config.headers['x-guest-token'] = guestToken;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

export default api;
