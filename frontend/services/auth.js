import api from './api';
import * as SecureStore from 'expo-secure-store';

const authService = {
    login: async (username, password) => {
        const formData = new FormData();
        formData.append('username', username);
        formData.append('password', password);

        const response = await api.post('/login/access-token', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });

        if (response.data.access_token) {
            await SecureStore.setItemAsync('access_token', response.data.access_token);
        }
        return response.data;
    },

    register: async (userData) => {
        const response = await api.post('/users/', userData);
        return response.data;
    },

    getMe: async () => {
        const response = await api.get('/users/me');
        return response.data;
    },

    logout: async () => {
        await SecureStore.deleteItemAsync('access_token');
    },

    getToken: async () => {
        return await SecureStore.getItemAsync('access_token');
    },

    followUser: async (userId) => {
        const response = await api.post(`/users/${userId}/follow`);
        return response.data; // { followers_count, following_count, is_following }
    },

    getUserStats: async (userId) => {
        const response = await api.get(`/users/${userId}/stats`);
        return response.data;
    }
};

export default authService;
