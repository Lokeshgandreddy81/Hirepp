import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';

export default function RoleSelectionScreen({ navigation }) {
    // Check for existing session
    React.useEffect(() => {
        const checkLogin = async () => {
            try {
                const userInfo = await SecureStore.getItemAsync('userInfo');
                if (userInfo) {
                    navigation.replace('MainTab');
                }
            } catch (e) {
                console.error("Auto-login check failed", e);
            }
        };
        checkLogin();
    }, []);

    const handleRoleSelect = async (role) => {
        // We can store the selected role in SecureStore or just pass it as param
        if (role === 'candidate') {
            await SecureStore.setItemAsync('selectedRole', 'candidate');
        } else {
            await SecureStore.setItemAsync('selectedRole', 'recruiter');
        }
        // Navigate to Login/Signup flow
        // For now, let's assume we go to a "Welcome" or directly to Login which links to Signup
        navigation.navigate('Login');
    };

    return (
        <SafeAreaView style={styles.container}>
            <Text style={styles.title}>Welcome to HireApp</Text>
            <Text style={styles.subtitle}>Choose your role to get started</Text>

            <View style={styles.cardContainer}>
                {/* Job Seeker Card */}
                <TouchableOpacity
                    style={styles.card}
                    onPress={() => handleRoleSelect('candidate')}
                >
                    <View style={[styles.iconContainer, { backgroundColor: '#EEF2FF' }]}>
                        <Ionicons name="person" size={32} color="#4F46E5" />
                    </View>
                    <Text style={styles.cardTitle}>Job Seeker</Text>
                    <Text style={styles.cardDesc}>I'm looking for a job</Text>
                </TouchableOpacity>

                {/* Employer Card */}
                <TouchableOpacity
                    style={styles.card}
                    onPress={() => handleRoleSelect('recruiter')}
                >
                    <View style={[styles.iconContainer, { backgroundColor: '#F0FDF4' }]}>
                        <Ionicons name="briefcase" size={32} color="#16A34A" />
                    </View>
                    <Text style={styles.cardTitle}>Employer</Text>
                    <Text style={styles.cardDesc}>I'm hiring talent</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        padding: 24,
        justifyContent: 'center',
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#111827',
        textAlign: 'center',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: '#6B7280',
        textAlign: 'center',
        marginBottom: 48,
    },
    cardContainer: {
        gap: 16,
    },
    card: {
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 16,
        padding: 24,
        alignItems: 'center',
        backgroundColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    iconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1F2937',
        marginBottom: 4,
    },
    cardDesc: {
        fontSize: 14,
        color: '#6B7280',
    },
});
