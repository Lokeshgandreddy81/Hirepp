import React, { useContext } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, TouchableOpacity, StyleSheet, Platform, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { triggerHaptic } from '../utils/haptics';

// Custom Icons
import {
    IconGlobe,
    IconUsers,
    IconMessageSquare,
    IconBriefcase,
    IconSettings,
    IconVideo
} from '../components/Icons';

// Screens
import ConnectScreen from '../screens/ConnectScreen';
import ProfilesScreen from '../screens/ProfilesScreen';
import ApplicationsScreen from '../screens/ApplicationsScreen';
import JobsScreen from '../screens/JobsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import EmployerDashboardScreen from '../screens/EmployerDashboardScreen';
import TalentScreen from '../screens/TalentScreen';
import { Ionicons } from '@expo/vector-icons';
import ErrorBoundary from '../components/ErrorBoundary';
import { AuthContext } from '../context/AuthContext';
import { getPrimaryRoleFromUser } from '../utils/roleMode';

const Tab = createBottomTabNavigator();

export default function MainTabNavigator({ navigation }) {
    const insets = useSafeAreaInsets();
    const { userInfo } = useContext(AuthContext);
    const primaryRole = getPrimaryRoleFromUser(userInfo);
    const isDemandMode = primaryRole === 'employer';

    const handleRecordClick = () => {
        navigation.navigate('SmartInterview');
    };

    const openModeSwitcher = () => {
        navigation.navigate('MainTab', {
            screen: 'Settings',
            params: { focusSwitchMode: true }
        });
    };

    const screenOptions = ({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused }) => {
            let IconComponent;
            let iconColor = focused ? '#9333ea' : '#94a3b8';

            if (route.name === 'Connect') {
                IconComponent = IconGlobe;
            } else if (route.name === 'Profiles' || route.name === 'Talent') {
                IconComponent = IconUsers;
            } else if (route.name === 'Applications') {
                IconComponent = IconMessageSquare;
            } else if (route.name === 'Jobs' || route.name === 'My Jobs') {
                IconComponent = IconBriefcase;
            } else if (route.name === 'Notifications') {
                return (
                    <View style={[styles.iconContainer, focused && styles.iconContainerFocused]}>
                        <Ionicons name="notifications" size={24} color={iconColor} />
                    </View>
                );
            } else if (route.name === 'Settings') {
                IconComponent = IconSettings;
            }

            return (
                <View style={[styles.iconContainer, focused && styles.iconContainerFocused]}>
                    <IconComponent size={24} color={iconColor} style={focused ? { fill: '#faf5ff' } : {}} />
                </View>
            );
        },
        tabBarActiveTintColor: '#9333ea',
        tabBarInactiveTintColor: '#94a3b8',
        tabBarLabelStyle: {
            fontSize: 10,
            fontWeight: '600',
            marginTop: -4,
            marginBottom: Platform.OS === 'android' ? 8 : 0,
        },
        tabBarStyle: {
            height: Platform.OS === 'ios' ? 88 : 68,
            paddingTop: 8,
            backgroundColor: '#ffffff',
            borderTopWidth: 1,
            borderTopColor: '#e2e8f0',
            elevation: 8,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.05,
            shadowRadius: 10,
        },
    });

    return (
        <View style={styles.container}>
            <Tab.Navigator
                screenOptions={screenOptions}
                screenListeners={{
                    tabPress: () => {
                        triggerHaptic.light();
                    }
                }}
            >
                {isDemandMode ? (
                    <>
                        <Tab.Screen name="Connect">
                            {props => <ErrorBoundary><ConnectScreen {...props} /></ErrorBoundary>}
                        </Tab.Screen>
                        <Tab.Screen
                            name="Talent"
                            options={{ tabBarLabel: 'People Nearby' }}
                        >
                            {props => <ErrorBoundary><TalentScreen {...props} /></ErrorBoundary>}
                        </Tab.Screen>
                        <Tab.Screen name="Applications" options={{ tabBarLabel: 'Apps' }}>
                            {props => <ErrorBoundary><ApplicationsScreen {...props} /></ErrorBoundary>}
                        </Tab.Screen>
                        <Tab.Screen
                            name="My Jobs"
                            options={{ tabBarLabel: 'My Posts' }}
                        >
                            {props => <ErrorBoundary><EmployerDashboardScreen {...props} /></ErrorBoundary>}
                        </Tab.Screen>
                        <Tab.Screen name="Settings">
                            {props => <ErrorBoundary><SettingsScreen {...props} /></ErrorBoundary>}
                        </Tab.Screen>
                    </>
                ) : (
                    <>
                        <Tab.Screen name="Connect">
                            {props => <ErrorBoundary><ConnectScreen {...props} /></ErrorBoundary>}
                        </Tab.Screen>
                        <Tab.Screen name="Profiles" options={{ tabBarLabel: 'Profile' }}>
                            {props => <ErrorBoundary><ProfilesScreen {...props} /></ErrorBoundary>}
                        </Tab.Screen>
                        <Tab.Screen name="Applications" options={{ tabBarLabel: 'Apps' }}>
                            {props => <ErrorBoundary><ApplicationsScreen {...props} /></ErrorBoundary>}
                        </Tab.Screen>
                        <Tab.Screen
                            name="Jobs"
                            component={JobsScreen}
                            options={{ tabBarLabel: 'Find Work' }}
                        />
                        <Tab.Screen name="Settings" component={SettingsScreen} />
                    </>
                )}
            </Tab.Navigator>

            <TouchableOpacity
                style={[styles.modeBadge, { top: insets.top + 8 }]}
                onPress={openModeSwitcher}
                activeOpacity={0.85}
            >
                <Text style={styles.modeBadgeText}>{isDemandMode ? 'Demand' : 'Supply'}</Text>
            </TouchableOpacity>

            <View style={styles.fabGroup}>
                <View style={styles.fabLabelBubble}>
                    <Text style={styles.fabLabelText}>
                        {isDemandMode ? 'Tell us what you need' : 'Tell us what you can do'}
                    </Text>
                </View>
                <TouchableOpacity
                    style={styles.fab}
                    onPress={handleRecordClick}
                    activeOpacity={0.8}
                >
                    <IconVideo size={24} color="#ffffff" />
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        position: 'relative',
    },
    iconContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 4,
        borderRadius: 16,
    },
    iconContainerFocused: {},
    modeBadge: {
        position: 'absolute',
        right: 16,
        backgroundColor: 'rgba(15,23,42,0.78)',
        borderRadius: 999,
        paddingHorizontal: 12,
        paddingVertical: 6,
        zIndex: 20,
    },
    modeBadgeText: {
        color: '#ffffff',
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.3,
    },
    fabGroup: {
        position: 'absolute',
        bottom: Platform.OS === 'ios' ? 108 : 88,
        right: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        zIndex: 15,
    },
    fabLabelBubble: {
        backgroundColor: '#0f172a',
        borderRadius: 999,
        paddingHorizontal: 12,
        paddingVertical: 8,
        maxWidth: 180,
    },
    fabLabelText: {
        color: '#ffffff',
        fontSize: 11,
        fontWeight: '700',
    },
    fab: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#9333ea',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#9333ea',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 8,
    },
});
