import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

import { BASE_URL } from '../config';

const client = axios.create({
    baseURL: BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 10000, // 10 seconds timeout
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
