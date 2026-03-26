import { Platform } from 'react-native';

// IP local desactivada (Servidor Vivo en Render)
// export const DEV_IP = '192.168.0.140';

export const AppConfig = {
    baseURL: `https://musicdy-backend.onrender.com/api/v1`,
    mediaURL: `https://musicdy-backend.onrender.com/`,

    /**
     * Procesa la ruta de DB para retornar enlace absoluto.
     */
    getFullMediaUrl: (path?: string | null): string => {
        if (!path) return '';
        if (path.startsWith('http')) return path;
        const cleanPath = path.startsWith('/') ? path.substring(1) : path;
        return `${AppConfig.mediaURL}${cleanPath}`;
    }
};
