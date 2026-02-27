import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import client from '../api/client';
import { logger } from '../utils/logger';

// Configure notification handler
const isExpoGo = Constants.appOwnership === 'expo';
if (!isExpoGo) {
    Notifications.setNotificationHandler({
        handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: true,
        }),
    });
}

export const registerForPushNotifications = async () => {
    if (isExpoGo) return null;
    if (!Device.isDevice) return null; // won't work in simulator — handle gracefully

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }

    if (finalStatus !== 'granted') return null;

    const token = (await Notifications.getExpoPushTokenAsync()).data;

    // Register token with backend
    try {
        await client.post('/api/notifications/register-token', { token, platform: Platform.OS });
    } catch (e) {
        logger.warn('Push token registration failed:', e?.message);
    }

    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
        });
    }

    return token;
};
