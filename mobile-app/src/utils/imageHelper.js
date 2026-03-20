import { API_BASE_URL } from '../config';

export const resolveImageUrl = (url) => {
    if (!url) return null;
    const raw = String(url).trim();
    if (raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('file://')) {
        return raw;
    }
    // Prepend API_BASE_URL without the trailing /api for standard storage and upload routes
    if (raw.startsWith('/api') || raw.startsWith('/uploads')) {
        const baseUrl = API_BASE_URL.replace(/\/api$/, '');
        return `${baseUrl}${raw}`;
    }
    return raw;
};
