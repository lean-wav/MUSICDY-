import api from './api';

const paymentService = {
    createCheckout: async (beatId, provider = 'stripe') => {
        const response = await api.post(`/payments/checkout/${beatId}?provider=${provider}`);
        return response.data; // { url: "..." }
    },

    onboardUser: async () => {
        const response = await api.post('/payments/onboard');
        return response.data; // { url: "..." }
    }
};

export default paymentService;
