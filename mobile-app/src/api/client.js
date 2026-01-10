import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

// Hardcoded IP as per user request (Mac Local IP)
export const BASE_URL = 'http://192.168.31.52:5001';

const client = axios.create({
    baseURL: BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add a request interceptor to attach the Token
client.interceptors.request.use(
    async (config) => {
        try {
            const userInfoString = await SecureStore.getItemAsync('userInfo');
            if (userInfoString) {
                const userInfo = JSON.parse(userInfoString);
                if (userInfo && userInfo.token) {
                    config.headers.Authorization = `Bearer ${userInfo.token}`;
                }
            }
        } catch (error) {
            console.error('Error retrieving token from SecureStore:', error);
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export default client;
