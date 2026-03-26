import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from '../api/client';

interface User {
    id: number;
    username: string;
    nombre_artistico?: string;
    email: string;
    foto_perfil: string | null;
    tipo_usuario: string;
    sales_count?: number;
    stripe_account_id?: string;
    mp_account_id?: string;
    paypal_email?: string;
    usdt_address?: string;
    wallet_balance?: number;
}

interface AuthState {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (token: string, userData: User) => Promise<void>;
    logout: () => Promise<void>;
    checkSession: () => Promise<string | null>;
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    isAuthenticated: false,
    isLoading: true, // Empezamos en loading mientras revisa el Keychain/AsyncStorage

    login: async (token: string, userData: User) => {
        try {
            await AsyncStorage.setItem('access_token', token);
            set({ user: userData, isAuthenticated: true, isLoading: false });
        } catch (e) {
            console.error("Error guardando token", e);
        }
    },

    logout: async () => {
        try {
            await AsyncStorage.removeItem('access_token');
            set({ user: null, isAuthenticated: false });
        } catch (e) {
            console.error("Error borrando token", e);
        }
    },

    checkSession: async () => {
        set({ isLoading: true });
        try {
            const token = await AsyncStorage.getItem('access_token');
            if (token) {
                // En lugar de validarlo a ciegas, intentamos traer los datos actualizados de la API.
                // Si el token expira o es inválido, el interceptor de Axios tirará error y borrará el token
                const response = await apiClient.get('/users/me', {
                    headers: { Authorization: `Bearer ${token}` }
                });

                set({ user: response.data, isAuthenticated: true, isLoading: false });
                return token;
            }
        } catch (e) {
            console.error("Error verificando o renovando sesión", e);
            // El interceptor borra el token real si es 401, aquí solo limpiamos el estado:
            await AsyncStorage.removeItem('access_token');
        }

        set({ user: null, isAuthenticated: false, isLoading: false });
        return null;
    }
}));
