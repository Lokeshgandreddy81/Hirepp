import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import client from '../api/client';

export default function VerificationRequiredScreen({ route, navigation }) {
    const { email } = route.params || {}; // Get email from params to allow resending
    const [loading, setLoading] = useState(false);

    const handleResendVerification = async () => {
        if (!email) {
            Alert.alert('Error', 'Email address not found. Please log in again.');
            return;
        }

        setLoading(true);
        try {
            await client.post('/api/users/ resendverification', { email });
            Alert.alert('Email Sent', 'A new verification link has been sent to your email.');
        } catch (error) {
            Alert.alert('Error', 'Failed to resend verification email.');
        } finally {
            setLoading(false);
        }
    };

    const handleBackToLogin = () => {
        // Reset navigation stack to ensure user can't go back to this screen easily
        navigation.reset({
            index: 0,
            routes: [{ name: 'Login' }],
        });
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <Ionicons name="mail-unread-outline" size={80} color="#F59E0B" style={styles.icon} />
                <Text style={styles.title}>Verify Your Email</Text>
                <Text style={styles.subtitle}>
                    We need you to verify your email address before accessing the app. Please check your inbox for a link.
                </Text>

                <TouchableOpacity
                    style={styles.resendButton}
                    onPress={handleResendVerification}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#4F46E5" />
                    ) : (
                        <Text style={styles.resendButtonText}>Resend Verification Email</Text>
                    )}
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.backButton}
                    onPress={handleBackToLogin}
                >
                    <Text style={styles.backButtonText}>Back to Login</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        justifyContent: 'center',
    },
    content: {
        padding: 24,
        alignItems: 'center',
    },
    icon: {
        marginBottom: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 10,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: '#6B7280',
        textAlign: 'center',
        marginBottom: 30,
        lineHeight: 24,
    },
    resendButton: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#4F46E5',
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 24,
        width: '100%',
        alignItems: 'center',
        marginBottom: 16,
    },
    resendButtonText: {
        color: '#4F46E5',
        fontWeight: 'bold',
        fontSize: 16,
    },
    backButton: {
        padding: 10,
    },
    backButtonText: {
        color: '#6B7280',
        fontSize: 16,
    },
});
