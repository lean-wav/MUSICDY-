import api from './api';

const feedService = {
    getFeed: async (limit = 10, skip = 0) => {
        const response = await api.get(`/feed/recommendations?limit=${limit}&skip=${skip}`);
        return response.data;
    },

    uploadPost: async (postData, fileUri, coverUri = null) => {
        const formData = new FormData();

        // Append fields
        Object.keys(postData).forEach(key => {
            formData.append(key, postData[key]);
        });

        // Append Audio File
        let filename = fileUri.split('/').pop();
        let match = /\.(\w+)$/.exec(filename);
        let type = match ? `audio/${match[1]}` : `audio/mpeg`;

        formData.append('archivo', { uri: fileUri, name: filename, type });

        return await api.post('/posts/', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
    },
};

export default feedService;
