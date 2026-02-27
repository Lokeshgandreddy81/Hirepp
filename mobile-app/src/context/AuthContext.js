import React, { createContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { wipeSensitiveCache } from '../utils/cacheManager';
import { getPrimaryRoleFromUser } from '../utils/roleMode';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [userToken, setUserToken] = useState(null);
    const [userInfo, setUserInfo] = useState(null);
    const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);

    const login = async (data) => {
        setIsLoading(true);
        try {
            const normalizedUser = {
                ...data,
                primaryRole: getPrimaryRoleFromUser(data),
            };
            await SecureStore.setItemAsync('userInfo', JSON.stringify(normalizedUser));
            await SecureStore.setItemAsync('hasCompletedOnboarding', 'true');
            setHasCompletedOnboarding(true);
            setUserInfo(normalizedUser);
            setUserToken(normalizedUser.token);
        } catch (e) {
            console.error('Login error', e);
        }
        setIsLoading(false);
    };

    const updateUserInfo = async (updates = {}) => {
        try {
            const merged = {
                ...(userInfo || {}),
                ...updates,
            };
            merged.primaryRole = getPrimaryRoleFromUser(merged);

            await SecureStore.setItemAsync('userInfo', JSON.stringify(merged));
            setUserInfo(merged);
            if (merged.token) {
                setUserToken(merged.token);
            }
            return merged;
        } catch (e) {
            console.error('updateUserInfo error', e);
            throw e;
        }
    };

    const logout = async () => {
        setIsLoading(true);
        try {
            await SecureStore.deleteItemAsync('userInfo');
            await wipeSensitiveCache();
            setUserInfo(null);
            setUserToken(null);
        } catch (e) {
            console.error('Logout error', e);
        }
        setIsLoading(false);
    };

    const isLoggedIn = async () => {
        try {
            setIsLoading(true);
            let userInfoStr = await SecureStore.getItemAsync('userInfo');
            if (userInfoStr) {
                let user = JSON.parse(userInfoStr);
                user = { ...user, primaryRole: getPrimaryRoleFromUser(user) };
                await SecureStore.setItemAsync('userInfo', JSON.stringify(user));
                setUserInfo(user);
                setUserToken(user.token);
            }
            let onboardingStr = await SecureStore.getItemAsync('hasCompletedOnboarding');
            if (onboardingStr === 'true') {
                setHasCompletedOnboarding(true);
            }
        } catch (e) {
            console.error('isLoggedIn error', e);
        }
        setIsLoading(false);
    };

    useEffect(() => {
        isLoggedIn();
    }, []);

    const completeOnboarding = async () => {
        await SecureStore.setItemAsync('hasCompletedOnboarding', 'true');
        setHasCompletedOnboarding(true);
    };

    return (
        <AuthContext.Provider value={{ login, logout, updateUserInfo, isLoading, userToken, userInfo, hasCompletedOnboarding, completeOnboarding }}>
            {children}
        </AuthContext.Provider>
    );
};
