import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ActivityIndicator
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import client from '../api/client';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export default function LoginScreen({ navigation }) {
    const [activeTab, setActiveTab] = useState('email'); // 'email' or 'phone'
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    // Auto-login check
    useEffect(() => {
        const checkLogin = async () => {
            try {
                const userInfo = await SecureStore.getItemAsync('userInfo');
                if (userInfo) {
                    navigation.replace('MainTab');
                }
            } catch (e) {
                console.error(e);
            }
        };
        checkLogin();
    }, []);

    const handleLogin = async () => {
        if (activeTab === 'phone') {
            Alert.alert('Notice', 'Phone login is not yet connected to the backend. Please use Email.');
            return;
        }

        if (!email || !password) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }

        setLoading(true);
        try {
            const { data } = await client.post('/api/users/login', { email, password });

            // Check if user is verified
            if (data.isVerified === false) {
                setLoading(false);
                // Navigate to the Verification Wall
                navigation.navigate('VerificationRequired', { email });
                return;
            }

            // Store complete user info securely
            await SecureStore.setItemAsync('userInfo', JSON.stringify(data));

            navigation.replace('MainTab');
        } catch (error) {
            const msg = error.response?.data?.message || 'Login failed';
            Alert.alert('Login Error', msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                {/* Back Button */}
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#374151" />
                    <Text style={styles.backText}>Back</Text>
                </TouchableOpacity>

                <View style={styles.header}>
                    <Text style={styles.title}>Welcome!</Text>
                    <Text style={styles.subtitle}>Sign in to your Job Seeker account</Text>
                </View>

                {/* Custom Tab Switcher */}
                <View style={styles.tabContainer}>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'phone' && styles.activeTab]}
                        onPress={() => setActiveTab('phone')}
                    >
                        <Text style={[styles.tabText, activeTab === 'phone' && styles.activeTabText]}>Phone</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'email' && styles.activeTab]}
                        onPress={() => setActiveTab('email')}
                    >
                        <Text style={[styles.tabText, activeTab === 'email' && styles.activeTabText]}>Email</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.form}>
                    {activeTab === 'email' ? (
                        <>
                            <Text style={styles.label}>Email Address</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="user@example.com"
                                value={email}
                                onChangeText={setEmail}
                                autoCapitalize="none"
                                keyboardType="email-address"
                            />
                        </>
                    ) : (
                        <>
                            <Text style={styles.label}>Phone Number</Text>
                            <View style={styles.phoneRow}>
                                <TextInput
                                    style={[styles.input, styles.countryCode]}
                                    value="+91"
                                    editable={false}
                                />
                                <TextInput
                                    style={[styles.input, styles.phoneInput]}
                                    placeholder="98765 43210"
                                    value={phone}
                                    onChangeText={setPhone}
                                    keyboardType="phone-pad"
                                />
                            </View>
                        </>
                    )}

                    <Text style={styles.label}>Password</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="••••••••"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                    />

                    <View style={styles.forgotPasswordContainer}>
                        <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
                            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                        style={styles.button}
                        onPress={handleLogin}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#FFF" />
                        ) : (
                            <Text style={styles.buttonText}>Sign In</Text>
                        )}
                    </TouchableOpacity>

                    <View style={styles.footer}>
                        <Text style={styles.footerText}>Don't have an account? </Text>
                        <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                            <Text style={styles.link}>Sign Up</Text>
                        </TouchableOpacity>
                    </View>
                </View>
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
    },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20
    },
    backText: {
        marginLeft: 4,
        fontSize: 16,
        color: '#374151'
    },
    header: {
        marginBottom: 32
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: '#6B7280',
    },
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: '#F3F4F6',
        borderRadius: 25,
        padding: 4,
        marginBottom: 24
    },
    tab: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        borderRadius: 20,
    },
    activeTab: {
        backgroundColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    tabText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6B7280'
    },
    activeTabText: {
        color: '#111827'
    },
    form: {
        gap: 16,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 8,
    },
    input: {
        borderWidth: 1,
        borderColor: '#D1D5DB',
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        backgroundColor: '#F9FAFB',
    },
    phoneRow: {
        flexDirection: 'row',
        gap: 12
    },
    countryCode: {
        width: 80,
        textAlign: 'center',
        backgroundColor: '#E5E7EB'
    },
    phoneInput: {
        flex: 1
    },
    forgotPasswordContainer: {
        alignItems: 'flex-end',
        marginBottom: 8
    },
    forgotPasswordText: {
        color: '#6B7280',
        fontSize: 14,
        fontWeight: '500'
    },
    button: {
        backgroundColor: '#4F46E5',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        shadowColor: '#4F46E5',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 20
    },
    footerText: {
        color: '#6B7280'
    },
    link: {
        color: '#4F46E5',
        fontWeight: 'bold'
    }
});
