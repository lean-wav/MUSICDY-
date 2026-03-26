import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppConfig } from './config';

export const apiClient = axios.create({
    baseURL: AppConfig.baseURL,
    timeout: 60000, // Augmented from 10s to 60s for media uploads
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
});

apiClient.interceptors.request.use(
    async (config) => {
        try {
            const token = await AsyncStorage.getItem('access_token');
            if (token && config.headers) {
                config.headers.Authorization = `Bearer ${token}`;
            }
        } catch (error) {
            console.error("Error leyendo acceso seguro de JWT:", error);
        }
        return config;
    },
    (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (error.response?.status === 401) {
            console.warn("🔒 Acceso Denegado: Token JWT Expirado o Inválido");
            // Import lazily to avoid circular dependency store→client→store
            const { useAuthStore } = await import('../store/useAuthStore');
            await useAuthStore.getState().logout();
        }
        return Promise.reject(error);
    }
);
