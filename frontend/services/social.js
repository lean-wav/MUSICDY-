import api from './api';

const socialService = {
    toggleLike: async (postId) => {
        const response = await api.post(`/posts/${postId}/like`);
        return response.data; // { likes_count, comentarios_count, is_liked }
    },

    getComments: async (postId) => {
        const response = await api.get(`/posts/${postId}/comments`);
        return response.data;
    },

    addComment: async (postId, text) => {
        const response = await api.post(`/posts/${postId}/comments`, { texto: text });
        return response.data;
    },

    getStats: async (postId) => {
        const response = await api.get(`/posts/${postId}/stats`);
        return response.data;
    }
};

export default socialService;
