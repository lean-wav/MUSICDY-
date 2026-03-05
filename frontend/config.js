// Replace with your local IP address
const IP_ADDRESS = '192.168.1.75'; // Detected current IP
const PORT = '8000';

export const BASE_URL = `http://${IP_ADDRESS}:${PORT}/api/v1`;
export const WS_URL = `ws://${IP_ADDRESS}:${PORT}/api/v1/ws`;
export const MEDIA_URL = `http://${IP_ADDRESS}:${PORT}`;

export default {
    BASE_URL,
    WS_URL,
    MEDIA_URL,
};
