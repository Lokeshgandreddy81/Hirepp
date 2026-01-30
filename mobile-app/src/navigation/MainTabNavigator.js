import React, { useEffect, useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, View } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// Screens
import ConnectScreen from '../screens/ConnectScreen';
import ProfilesScreen from '../screens/ProfilesScreen';
import ApplicationsScreen from '../screens/ApplicationsScreen';
import JobsScreen from '../screens/JobsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import EmployerDashboardScreen from '../screens/EmployerDashboardScreen';
import TalentScreen from '../screens/TalentScreen';

const Tab = createBottomTabNavigator();

export default function MainTabNavigator() {
    const [userRole, setUserRole] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchRole = async () => {
            try {
                const userInfoStr = await SecureStore.getItemAsync('userInfo');
                if (userInfoStr) {
                    const user = JSON.parse(userInfoStr);
                    // Normalize role to lowercase to be safe
                    setUserRole(user.role ? user.role.toLowerCase() : 'candidate');
                }
            } catch (e) {
                console.error("Failed to fetch role", e);
            } finally {
                setLoading(false);
            }
        };
        fetchRole();
    }, []);

    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#7C3AED" />
            </View>
        );
    }

    // Tab Bar Config Helper
    const screenOptions = ({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
            let iconName;

            if (route.name === 'Connect') {
                iconName = focused ? 'globe' : 'globe-outline';
            } else if (route.name === 'Profiles') {
                iconName = focused ? 'person' : 'person-outline';
            } else if (route.name === 'Talent') {
                iconName = focused ? 'people' : 'people-outline';
            } else if (route.name === 'Applications') {
                // Image shows a chat/list icon for 'Apps'
                iconName = focused ? 'chatbubble-ellipses' : 'chatbubble-ellipses-outline';
            } else if (route.name === 'Jobs') {
                iconName = focused ? 'briefcase' : 'briefcase-outline';
            } else if (route.name === 'My Jobs') {
                iconName = focused ? 'briefcase' : 'briefcase-outline';
            } else if (route.name === 'Settings') {
                iconName = focused ? 'settings' : 'settings-outline';
            }

            return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#7C3AED',
        tabBarInactiveTintColor: 'gray',
        tabBarStyle: {
            paddingBottom: 5,
            paddingTop: 5,
            height: 60
        }
    });

    return (
        <Tab.Navigator screenOptions={screenOptions}>
            {userRole === 'employer' || userRole === 'recruiter' ? (
                // --- EMPLOYER TABS ---
                <>
                    <Tab.Screen name="Connect" component={ConnectScreen} />
                    <Tab.Screen name="Talent" component={TalentScreen} />
                    <Tab.Screen name="Applications" component={ApplicationsScreen} options={{ tabBarLabel: 'Apps' }} />
                    <Tab.Screen name="My Jobs" component={EmployerDashboardScreen} />
                    <Tab.Screen name="Settings" component={SettingsScreen} />
                </>
            ) : (
                // --- WORKER TABS ---
                <>
                    <Tab.Screen name="Connect" component={ConnectScreen} />
                    <Tab.Screen name="Profiles" component={ProfilesScreen} options={{ title: 'My Profile' }} />
                    <Tab.Screen name="Applications" component={ApplicationsScreen} />
                    <Tab.Screen name="Jobs" component={JobsScreen} />
                    <Tab.Screen name="Settings" component={SettingsScreen} />
                </>
            )}
        </Tab.Navigator>
    );
}
