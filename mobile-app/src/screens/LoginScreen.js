import React, { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform, Alert
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import client from '../api/client';
import { AuthContext } from '../context/AuthContext';

export default function LoginScreen({ navigation }) {
    const insets = useSafeAreaInsets();
    const { login } = React.useContext(AuthContext);
    const [inputMode, setInputMode] = useState('phone'); // 'phone' | 'email'
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [selectedRole, setSelectedRole] = useState('Available to Help');
    const [isEmployer, setIsEmployer] = useState(false);

    React.useEffect(() => {
        const getRole = async () => {
            const role = await SecureStore.getItemAsync('selectedRole');
            if (role === 'recruiter') {
                setSelectedRole('Looking for Someone');
                setIsEmployer(true);
            } else {
                setSelectedRole('Available to Help');
                setIsEmployer(false);
            }
        };
        getRole();
    }, []);

    const handleLogin = async () => {
        if (inputMode === 'email' && !email) {
            Alert.alert('Missing Info', 'Please enter your email address.');
            return;
        }
        if (inputMode === 'phone' && !phone) {
            Alert.alert('Missing Info', 'Please enter your phone number.');
            return;
        }
        if (!password) {
            Alert.alert('Missing Info', 'Please enter your password.');
            return;
        }

        setLoading(true);
        try {
            const loginEmail = inputMode === 'phone' ? `${phone}@example.com` : email;
            const { data } = await client.post('/api/users/login', {
                email: loginEmail,
                password
            });

            await SecureStore.setItemAsync('selectedRole', data.role);
            await login(data); // This updates AuthContext and triggers stack switch

            setLoading(false);
            // navigation.replace('MainTab') is now managed by App.js conditional stack
        } catch (error) {
            setLoading(false);
            const errorMsg = error.response?.data?.message || 'Login failed. Please check your credentials.';
            Alert.alert('Login Error', errorMsg);
        }
    };

    const themeColor = isEmployer ? styles.bgFuchsia : styles.bgPurple;
    const themeText = isEmployer ? styles.textFuchsia : styles.textPurple;

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView
                contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32 }]}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {/* Back Link */}
                <TouchableOpacity
                    style={styles.backBtn}
                    onPress={() => navigation.goBack()}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel="Go back to previous screen"
                >
                    <Text style={styles.backArrow}>← Back</Text>
                </TouchableOpacity>

                {/* Title */}
                <Text style={styles.title}>Welcome!</Text>
                <Text style={styles.subtitle}>Sign in to your {selectedRole} account</Text>

                {/* Phone / Email Toggle */}
                <View style={styles.toggle}>
                    {['phone', 'email'].map(mode => (
                        <TouchableOpacity
                            key={mode}
                            style={[styles.toggleTab, inputMode === mode && styles.toggleTabActive]}
                            onPress={() => setInputMode(mode)}
                            activeOpacity={0.8}
                            accessibilityRole="button"
                            accessibilityState={{ selected: inputMode === mode }}
                            accessibilityLabel={`Login via ${mode}`}
                        >
                            <Text style={[styles.toggleTabText, inputMode === mode && styles.toggleTabTextActive]}>
                                {mode.toUpperCase()}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Inputs */}
                <View style={styles.form}>
                    {inputMode === 'phone' ? (
                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>PHONE NUMBER</Text>
                            <View style={styles.phoneRow}>
                                <View style={styles.countryPrefix}>
                                    <Text style={styles.countryPrefixText}>+91</Text>
                                </View>
                                <TextInput
                                    style={[styles.inputField, { flex: 1, marginLeft: 8 }]}
                                    placeholder="98765 43210"
                                    placeholderTextColor="#94a3b8"
                                    value={phone}
                                    onChangeText={setPhone}
                                    keyboardType="phone-pad"
                                />
                            </View>
                        </View>
                    ) : (
                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>EMAIL ADDRESS</Text>
                            <TextInput
                                style={styles.inputField}
                                placeholder="user@example.com"
                                placeholderTextColor="#94a3b8"
                                value={email}
                                onChangeText={setEmail}
                                autoCapitalize="none"
                                keyboardType="email-address"
                            />
                        </View>
                    )}

                    {/* Password */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>PASSWORD</Text>
                        <TextInput
                            style={styles.inputField}
                            placeholder="••••••••"
                            placeholderTextColor="#94a3b8"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry={true}
                        />
                    </View>

                    {/* Forgot Password */}
                    <TouchableOpacity
                        style={styles.forgotRow}
                        onPress={() => navigation.navigate('ForgotPassword')}
                        activeOpacity={0.7}
                        accessibilityRole="button"
                        accessibilityLabel="Forgot your password? Click to reset"
                    >
                        <Text style={[styles.forgotText, themeText]}>Forgot password?</Text>
                    </TouchableOpacity>

                    {/* Sign In Button */}
                    <TouchableOpacity
                        style={[styles.signInBtn, themeColor]}
                        onPress={handleLogin}
                        disabled={loading}
                        activeOpacity={0.85}
                        accessibilityRole="button"
                        accessibilityLabel="Sign in securely to your account"
                        accessibilityState={{ disabled: loading }}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.signInBtnText}>Sign In</Text>
                        )}
                    </TouchableOpacity>

                    {/* Join Free */}
                    <View style={styles.footerRow}>
                        <Text style={styles.joinFreeBtnText}>Don't have an account? </Text>
                        <TouchableOpacity
                            onPress={() => navigation.navigate('Register')}
                            activeOpacity={0.8}
                        >
                            <Text style={[styles.joinFreeHighlight, themeText]}>Sign Up</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#ffffff',
    },
    scrollContent: {
        paddingHorizontal: 32,
        flexGrow: 1, // Push footer to bottom
    },

    // Back
    backBtn: {
        marginBottom: 32,
        alignSelf: 'flex-start',
        minHeight: 44,
        minWidth: 44,
        justifyContent: 'center',
    },
    backArrow: {
        color: '#94a3b8',
        fontSize: 14,
        fontWeight: 'bold',
    },

    // Title
    title: {
        color: '#0f172a',
        fontSize: 30,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    subtitle: {
        color: '#64748b',
        fontSize: 14,
        fontWeight: '500',
        marginBottom: 32,
    },

    // Toggle
    toggle: {
        flexDirection: 'row',
        backgroundColor: '#f1f5f9', // bg-slate-100
        borderRadius: 12,
        padding: 4,
        marginBottom: 24,
    },
    toggleTab: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
        borderRadius: 8,
    },
    toggleTabActive: {
        backgroundColor: '#ffffff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    toggleTabText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#64748b', // text-slate-500
    },
    toggleTabTextActive: {
        color: '#0f172a', // text-slate-900
    },

    // Form
    form: {
        gap: 16,
        flex: 1,
    },
    inputGroup: {
        gap: 6,
    },
    inputLabel: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#94a3b8',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    inputField: {
        backgroundColor: '#f8fafc', // bg-slate-50
        borderWidth: 1,
        borderColor: '#e2e8f0', // border-slate-200
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 14,
        color: '#0f172a',
        fontWeight: '500',
    },
    phoneRow: {
        flexDirection: 'row',
    },
    countryPrefix: {
        backgroundColor: '#f8fafc',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 12,
        paddingHorizontal: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    countryPrefixText: {
        color: '#64748b',
        fontSize: 14,
        fontWeight: 'bold',
    },
    forgotRow: {
        alignItems: 'flex-end',
        minHeight: 44,
        justifyContent: 'center',
    },
    forgotText: {
        fontSize: 12,
        fontWeight: 'bold',
    },
    signInBtn: {
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
        marginTop: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    signInBtnText: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: 'bold',
    },
    footerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 'auto',
        paddingTop: 32,
    },
    joinFreeBtnText: {
        color: '#94a3b8',
        fontSize: 12,
        fontWeight: '500',
    },
    joinFreeHighlight: {
        fontWeight: 'bold',
        fontSize: 12,
    },

    // Themes
    bgPurple: { backgroundColor: '#7c3aed' },
    bgFuchsia: { backgroundColor: '#d946ef' },
    textPurple: { color: '#7c3aed' },
    textFuchsia: { color: '#d946ef' },
});
