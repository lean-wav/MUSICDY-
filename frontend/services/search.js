import api from './api';

const searchService = {
    search: async (query) => {
        try {
            const response = await api.get(`/search/?q=${query}`);
            return response.data;
        } catch (error) {
            console.error('Search error:', error);
            return [];
        }
    }
};

export default searchService;
