import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, Dimensions
} from 'react-native';
import { logger } from '../utils/logger';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';

const { height } = Dimensions.get('window');

const ROLES = [
    {
        key: 'candidate',
        icon: '👥', // Roughly matching IconUsers
        label: 'I\'m a Job Seeker',
        description: 'Find jobs and get matched by AI.',
        theme: 'purple',
    },
    {
        key: 'recruiter',
        icon: '💼', // Roughly matching IconBriefcase
        label: 'I\'m an Employer',
        description: 'Post jobs and find top talent fast.',
        theme: 'fuchsia',
    },
];

export default function RoleSelectionScreen({ navigation }) {
    const insets = useSafeAreaInsets();
    const [selectedRole, setSelectedRole] = useState(null); // No default selection to force tap

    React.useEffect(() => {
        const checkLogin = async () => {
            try {
                const userInfo = await SecureStore.getItemAsync('userInfo');
                if (userInfo) {
                    navigation.replace('MainTab');
                }
            } catch (e) {
                logger.error('Auto-login check failed', e);
            }
        };
        checkLogin();
    }, []);

    const handleRoleSelect = async (roleKey) => {
        setSelectedRole(roleKey);
        await SecureStore.setItemAsync('selectedRole', roleKey);
        navigation.navigate('Login'); // Instantly navigate on tap, matching web
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 24 }]}>
            <View style={styles.content}>
                {/* Header */}
                <View style={styles.headerArea}>
                    <View style={styles.sparklesBox}>
                        <Text style={styles.sparklesIcon}>✨</Text>
                    </View>
                    <Text style={styles.title}>Hire App</Text>
                    <Text style={styles.subtitle}>Smart AI matching for everyone.</Text>
                </View>

                {/* Role Cards */}
                <View style={styles.cardsSection}>
                    {ROLES.map(role => {
                        const isFuchsia = role.theme === 'fuchsia';
                        return (
                            <TouchableOpacity
                                key={role.key}
                                style={[styles.roleCard, isFuchsia ? styles.roleCardFuchsia : styles.roleCardPurple]}
                                onPress={() => handleRoleSelect(role.key)}
                                activeOpacity={0.8}
                            >
                                {/* Simulated Background Circle for Hover effect in web is hard in RN, just keeping styling clean */}
                                <View style={styles.roleIconCircleWrapper}>
                                    <View style={[styles.roleIconCircle, isFuchsia ? styles.bgFuchsia100 : styles.bgPurple100]}>
                                        <Text style={styles.roleIcon}>{role.icon}</Text>
                                    </View>
                                </View>
                                <View style={styles.roleTextContainer}>
                                    <Text style={[styles.roleLabel, isFuchsia ? styles.textFuchsia700 : styles.textPurple700]}>
                                        {role.label}
                                    </Text>
                                    <Text style={styles.roleDesc}>{role.description}</Text>
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#ffffff',
        justifyContent: 'center',
    },
    content: {
        paddingHorizontal: 24,
    },
    // Header
    headerArea: {
        alignItems: 'center',
        marginBottom: 40,
    },
    sparklesBox: {
        backgroundColor: '#f3e8ff', // bg-purple-100
        padding: 12,
        borderRadius: 16,
        marginBottom: 16,
    },
    sparklesIcon: {
        fontSize: 32,
    },
    title: {
        color: '#0f172a', // text-slate-900
        fontSize: 30,
        fontWeight: '900',
        letterSpacing: -0.5,
        marginBottom: 8,
    },
    subtitle: {
        color: '#64748b', // text-slate-500
        fontSize: 16,
        fontWeight: '500',
    },

    // Cards
    cardsSection: {
        gap: 16,
    },
    roleCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ffffff',
        borderRadius: 16,
        borderWidth: 2,
        padding: 24,
        overflow: 'hidden',
    },
    roleCardPurple: {
        borderColor: '#f1f5f9', // Initial border-slate-100
        // Hover styles in React Native are handled via underlayColor or conditional styles, 
        // we'll keep the border static to match the inactive state, or slightly tint it.
    },
    roleCardFuchsia: {
        borderColor: '#f1f5f9',
    },
    roleIconCircleWrapper: {
        marginRight: 16,
    },
    roleIconCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    bgPurple100: { backgroundColor: '#f3e8ff' },
    bgFuchsia100: { backgroundColor: '#fae8ff' },
    roleIcon: {
        fontSize: 24,
    },
    roleTextContainer: {
        flex: 1,
    },
    roleLabel: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1e293b', // Base text-slate-800
        marginBottom: 4,
    },
    textPurple700: { color: '#7e22ce' }, // When "active" or equivalent
    textFuchsia700: { color: '#a21caf' },
    roleDesc: {
        color: '#64748b', // text-slate-500
        fontSize: 14,
    }
});
