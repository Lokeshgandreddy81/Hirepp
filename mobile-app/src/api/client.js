import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Alert } from 'react-native';
import { triggerHaptic } from '../utils/haptics';

import { BASE_URL, DEMO_MODE } from '../config';
import { navigate } from '../navigation/navigationRef';
import { logger } from '../utils/logger';
import { getMockApiResponse } from '../demo/mockApi';

const isSecureBaseUrl = /^https:\/\//i.test(BASE_URL);
const isTrustedLocalBaseUrl = /^http:\/\/((localhost|127\.0\.0\.1|10\.0\.2\.2)|(192\.168\.\d+\.\d+)|(10\.\d+\.\d+\.\d+)|(172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+))(:\d+)?(\/|$)/i.test(BASE_URL);
const FALLBACK_BASE_URL = 'https://api.hirecircle.in';
const resolvedBaseUrl = (isSecureBaseUrl || isTrustedLocalBaseUrl) ? BASE_URL : FALLBACK_BASE_URL;

if (resolvedBaseUrl !== BASE_URL) {
    logger.error('SecurityError: Invalid API base URL detected. Falling back to secure production URL.');
}

const client = axios.create({
    baseURL: resolvedBaseUrl,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 10000, // 10 seconds timeout
    ...(DEMO_MODE ? {
        adapter: async (config) => getMockApiResponse(config),
    } : {}),
});

// Add a request interceptor to attach the Token
client.interceptors.request.use(
    async (config) => {
        if (DEMO_MODE) {
            return config;
        }
        try {
            const userInfoString = await SecureStore.getItemAsync('userInfo');
            if (userInfoString) {
                const userInfo = JSON.parse(userInfoString);
                if (userInfo && userInfo.token) {
                    config.headers.Authorization = `Bearer ${userInfo.token}`;
                }
            }
        } catch (error) {
            logger.error('Error retrieving token from SecureStore:', error);
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Add a response interceptor to handle token expiration (401/403) and 500 Server Errors
client.interceptors.response.use(
    (response) => {
        return response;
    },
    async (error) => {
        if (DEMO_MODE) {
            return Promise.reject(error);
        }
        const config = error.config || {};

        // Initialize retry attempts array
        if (!config.retryCount) {
            config.retryCount = 0;
            config.maxRetries = 2;
        }

        if (error.response) {
            // Unauthenticated intercept logic
            if (error.response.status === 401) {
                try {
                    await SecureStore.deleteItemAsync('userInfo');
                    navigate('Login');
                } catch (e) {
                    logger.error('Error clearing SecureStore on 401:', e);
                }
                return Promise.reject(error);
            }

            // Server Error boundary popup
            if (error.response.status >= 500) {
                if (config.retryCount < config.maxRetries) {
                    config.retryCount += 1;
                    logger.log(`Server 500 Retry [Attempt ${config.retryCount}]`);
                    return new Promise((resolve) => setTimeout(() => resolve(client(config)), 1000 * config.retryCount));
                }

                Alert.alert(
                    'Server Connectivity Issue',
                    'We are currently experiencing technical difficulties connecting to our internal servers. Please try again in to a few minutes.',
                    [{ text: "OK" }]
                );
            }
        } else if (error.request) {
            // Network failure without a response (offline mode interceptor buffer)
            logger.warn('Network Error Intercepted:', error.message);

            // Retry Network Timeouts once or twice before failing
            if (config.retryCount < config.maxRetries) {
                config.retryCount += 1;
                logger.log(`Offline/Network Retry [Attempt ${config.retryCount}]`);
                return new Promise((resolve) => setTimeout(() => resolve(client(config)), 1000 * config.retryCount));
            }
            return Promise.reject(new Error('No internet connection'));
        }

        return Promise.reject(error);
    }
);

export default client;
