import api from './api';

const analyticsService = {
    trackPlay: async (postId) => {
        try {
            await api.post(`/analytics/track/play/${postId}`);
        } catch (e) {
            console.log("Analytics error (play)", e);
        }
    },

    trackProfileView: async (userId) => {
        try {
            await api.post(`/analytics/track/profile/${userId}`);
        } catch (e) {
            console.log("Analytics error (profile)", e);
        }
    }
};

export default analyticsService;
