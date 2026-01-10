import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

// Screens
import ConnectScreen from '../screens/ConnectScreen';
import ProfilesScreen from '../screens/ProfilesScreen';
import ApplicationsScreen from '../screens/ApplicationsScreen';
import JobsScreen from '../screens/JobsScreen';
import SettingsScreen from '../screens/SettingsScreen';

const Tab = createBottomTabNavigator();

export default function MainTabNavigator() {
    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarIcon: ({ focused, color, size }) => {
                    let iconName;

                    if (route.name === 'Connect') {
                        iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
                    } else if (route.name === 'Profiles') {
                        iconName = focused ? 'people' : 'people-outline';
                    } else if (route.name === 'Applications') {
                        iconName = focused ? 'document-text' : 'document-text-outline';
                    } else if (route.name === 'Jobs') {
                        iconName = focused ? 'briefcase' : 'briefcase-outline';
                    } else if (route.name === 'Settings') {
                        iconName = focused ? 'settings' : 'settings-outline';
                    }

                    return <Ionicons name={iconName} size={size} color={color} />;
                },
                tabBarActiveTintColor: '#7C3AED', // Purple
                tabBarInactiveTintColor: 'gray',
                tabBarStyle: {
                    paddingBottom: 5,
                    paddingTop: 5,
                    height: 60
                }
            })}
        >
            <Tab.Screen name="Connect" component={ConnectScreen} />
            <Tab.Screen name="Profiles" component={ProfilesScreen} />
            <Tab.Screen name="Applications" component={ApplicationsScreen} />
            <Tab.Screen name="Jobs" component={JobsScreen} />
            <Tab.Screen name="Settings" component={SettingsScreen} />
        </Tab.Navigator>
    );
}
