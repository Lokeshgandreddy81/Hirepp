import React, { useState, useEffect, useContext } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ActivityIndicator,
    ScrollView
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import client from '../api/client';
import { AuthContext } from '../context/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export default function RegisterScreen({ navigation }) {
    const [activeTab, setActiveTab] = useState('email'); // 'email' or 'phone'
    const [role, setRole] = useState('candidate');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useContext(AuthContext);

    useEffect(() => {
        const getRole = async () => {
            const storedRole = await SecureStore.getItemAsync('selectedRole');
            if (storedRole) setRole(storedRole);
        };
        getRole();
    }, []);

    const handleRegister = async () => {
        if (activeTab === 'phone') {
            Alert.alert('Notice', 'Phone signup is not yet connected to the backend. Please use Email.');
            return;
        }

        if (!name || !email || !password) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }

        setLoading(true);
        try {
            const { data } = await client.post('/api/users/register', {
                name,
                email,
                password,
                role
            });

            // Let AuthContext handle the storage and state changes, which automatically navigates
            await login(data);
        } catch (error) {
            const msg = error.response?.data?.message || 'Registration failed';
            Alert.alert('Error', msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#374151" />
                </TouchableOpacity>

                <View style={styles.header}>
                    <Text style={styles.title}>Create Account</Text>
                    <Text style={styles.subtitle}>
                        Signing up as a <Text style={{ fontWeight: 'bold', color: '#4F46E5' }}>{role === 'candidate' ? 'Available to Help' : 'Looking for Someone'}</Text>
                    </Text>
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
                    <Text style={styles.label}>Full Name</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="John Doe"
                        value={name}
                        onChangeText={setName}
                    />

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

                    <TouchableOpacity
                        style={styles.button}
                        onPress={handleRegister}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#FFF" />
                        ) : (
                            <Text style={styles.buttonText}>Sign Up</Text>
                        )}
                    </TouchableOpacity>

                    <View style={styles.footer}>
                        <Text style={styles.footerText}>Already have an account? </Text>
                        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                            <Text style={styles.link}>Log In</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    scrollContent: {
        padding: 24
    },
    backButton: {
        marginBottom: 20
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
    button: {
        backgroundColor: '#4F46E5',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 16,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 24
    },
    footerText: {
        color: '#6B7280'
    },
    link: {
        color: '#4F46E5',
        fontWeight: 'bold'
    }
});
