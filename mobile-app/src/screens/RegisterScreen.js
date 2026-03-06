import React, { useCallback, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

export default function RegisterScreen({ navigation, route }) {
    const insets = useSafeAreaInsets();
    const passedRole = String(route?.params?.selectedRole || 'worker').toLowerCase();
    const selectedRole = ['employer', 'hybrid'].includes(passedRole) ? passedRole : 'worker';

    const [authMode, setAuthMode] = useState('phone');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const subtitleText = useMemo(
        () => `Create your ${selectedRole === 'hybrid' ? 'Hybrid' : (selectedRole === 'employer' ? 'Employer' : 'Job Seeker')} account`,
        [selectedRole]
    );

    const canSubmit = useMemo(() => {
        if (!String(password || '').trim()) return false;
        if (!String(confirmPassword || '').trim()) return false;
        if (authMode === 'phone' && !String(phoneNumber || '').trim()) return false;
        if (authMode === 'email' && !String(email || '').trim()) return false;
        return true;
    }, [authMode, confirmPassword, email, password, phoneNumber]);

    const handleBack = useCallback(() => {
        if (navigation.canGoBack()) {
            navigation.goBack();
        }
    }, [navigation]);

    const openSignIn = useCallback(() => {
        navigation.navigate('Login', { selectedRole });
    }, [navigation, selectedRole]);

    const handleCreateAccount = useCallback(async () => {
        if (loading || !canSubmit) return;

        const safePassword = String(password || '').trim();
        const safeConfirmPassword = String(confirmPassword || '').trim();
        if (safePassword.length < 6) {
            Alert.alert('Invalid password', 'Password should be at least 6 characters.');
            return;
        }
        if (safePassword !== safeConfirmPassword) {
            Alert.alert('Password mismatch', 'Password and confirm password should match.');
            return;
        }

        setLoading(true);
        try {
            await new Promise((resolve) => setTimeout(resolve, 450));
            navigation.navigate('BasicProfileSetup', {
                selectedRole,
                authMode,
                email: authMode === 'email' ? String(email || '').trim() : '',
                phoneNumber: authMode === 'phone' ? String(phoneNumber || '').trim() : '',
                password: safePassword,
            });
        } catch (_error) {
            Alert.alert('Sign up unavailable', 'Unable to continue right now. Please try again.');
        } finally {
            setLoading(false);
        }
    }, [
        authMode,
        canSubmit,
        confirmPassword,
        email,
        loading,
        password,
        phoneNumber,
        navigation,
        selectedRole,
    ]);

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="always"
                contentContainerStyle={[
                    styles.scrollContent,
                    { paddingTop: insets.top + 10, paddingBottom: insets.bottom + 24 },
                ]}
            >
                <TouchableOpacity style={styles.backBtn} onPress={handleBack} activeOpacity={0.8}>
                    <Ionicons name="chevron-back" size={18} color="#94a3b8" />
                    <Text style={styles.backBtnText}>Back</Text>
                </TouchableOpacity>

                <View style={styles.headerBlock}>
                    <Text style={styles.title}>Create Account</Text>
                    <Text style={styles.subtitle}>{subtitleText}</Text>
                </View>

                <View style={styles.segmentWrap}>
                    <TouchableOpacity
                        style={[styles.segmentButton, authMode === 'phone' && styles.segmentButtonActive]}
                        activeOpacity={0.9}
                        onPress={() => setAuthMode('phone')}
                    >
                        <Text style={[styles.segmentText, authMode === 'phone' && styles.segmentTextActive]}>PHONE</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.segmentButton, authMode === 'email' && styles.segmentButtonActive]}
                        activeOpacity={0.9}
                        onPress={() => setAuthMode('email')}
                    >
                        <Text style={[styles.segmentText, authMode === 'email' && styles.segmentTextActive]}>EMAIL</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.formBlock}>
                    {authMode === 'phone' ? (
                        <View>
                            <Text style={styles.fieldLabel}>PHONE NUMBER</Text>
                            <View style={styles.phoneRow}>
                                <View style={styles.countryCodeWrap}>
                                    <Text style={styles.countryCodeText}>+91</Text>
                                </View>
                                <TextInput
                                    style={styles.phoneInput}
                                    value={phoneNumber}
                                    onChangeText={setPhoneNumber}
                                    keyboardType="phone-pad"
                                    placeholder="98765 43210"
                                    placeholderTextColor="#94a3b8"
                                    maxLength={15}
                                />
                            </View>
                        </View>
                    ) : (
                        <View>
                            <Text style={styles.fieldLabel}>EMAIL ADDRESS</Text>
                            <TextInput
                                style={styles.input}
                                value={email}
                                onChangeText={setEmail}
                                autoCapitalize="none"
                                keyboardType="email-address"
                                placeholder="user@example.com"
                                placeholderTextColor="#94a3b8"
                            />
                        </View>
                    )}

                    <View>
                        <Text style={styles.fieldLabel}>PASSWORD</Text>
                        <TextInput
                            style={styles.input}
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                            placeholder="At least 6 characters"
                            placeholderTextColor="#94a3b8"
                        />
                    </View>

                    <View>
                        <Text style={styles.fieldLabel}>CONFIRM PASSWORD</Text>
                        <TextInput
                            style={styles.input}
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                            secureTextEntry
                            placeholder="Re-enter password"
                            placeholderTextColor="#94a3b8"
                        />
                    </View>

                    <TouchableOpacity
                        style={[styles.submitWrap, (!canSubmit || loading) && styles.submitWrapDisabled]}
                        activeOpacity={0.9}
                        onPress={handleCreateAccount}
                        disabled={!canSubmit || loading}
                    >
                        <LinearGradient
                            colors={['#7c3aed', '#9333ea']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.submitGradient}
                        >
                            {loading ? (
                                <ActivityIndicator size="small" color="#ffffff" />
                            ) : (
                                <Text style={styles.submitText}>Create Account</Text>
                            )}
                        </LinearGradient>
                    </TouchableOpacity>
                </View>

                <View style={styles.footerRow}>
                    <Text style={styles.footerText}>Already have an account? </Text>
                    <TouchableOpacity activeOpacity={0.8} onPress={openSignIn}>
                        <Text style={styles.footerLink}>Sign In</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f4f5f7',
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 24,
    },
    backBtn: {
        minHeight: 44,
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginBottom: 22,
    },
    backBtnText: {
        fontSize: 13,
        lineHeight: 18,
        color: '#94a3b8',
        fontWeight: '600',
    },
    headerBlock: {
        marginBottom: 18,
    },
    title: {
        fontSize: 27,
        lineHeight: 32,
        fontWeight: '800',
        color: '#0f172a',
        letterSpacing: -0.2,
    },
    subtitle: {
        marginTop: 8,
        fontSize: 13,
        lineHeight: 18,
        fontWeight: '600',
        color: '#64748b',
    },
    segmentWrap: {
        flexDirection: 'row',
        backgroundColor: '#e2e8f0',
        borderRadius: 14,
        padding: 4,
        marginTop: 6,
    },
    segmentButton: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 46,
        borderRadius: 10,
    },
    segmentButtonActive: {
        backgroundColor: '#ffffff',
    },
    segmentText: {
        fontSize: 12,
        lineHeight: 16,
        fontWeight: '700',
        color: '#64748b',
    },
    segmentTextActive: {
        color: '#0f172a',
    },
    formBlock: {
        marginTop: 20,
        gap: 14,
    },
    fieldLabel: {
        marginBottom: 8,
        fontSize: 11,
        lineHeight: 14,
        fontWeight: '700',
        color: '#94a3b8',
        letterSpacing: 0.9,
    },
    phoneRow: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#d5dee8',
        backgroundColor: '#f3f6f9',
        minHeight: 54,
        overflow: 'hidden',
    },
    countryCodeWrap: {
        minWidth: 64,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 10,
        paddingVertical: 14,
        borderRightWidth: 1,
        borderRightColor: '#d5dee8',
        backgroundColor: '#f8fafc',
    },
    countryCodeText: {
        fontSize: 14,
        lineHeight: 18,
        fontWeight: '700',
        color: '#64748b',
    },
    phoneInput: {
        flex: 1,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 14,
        lineHeight: 19,
        fontWeight: '500',
        color: '#0f172a',
    },
    input: {
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#d5dee8',
        backgroundColor: '#f3f6f9',
        minHeight: 54,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 14,
        lineHeight: 19,
        fontWeight: '500',
        color: '#0f172a',
    },
    submitWrap: {
        marginTop: 10,
        borderRadius: 14,
        overflow: 'hidden',
        shadowColor: '#7c3aed',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.22,
        shadowRadius: 10,
        elevation: 4,
    },
    submitWrapDisabled: {
        opacity: 0.55,
    },
    submitGradient: {
        minHeight: 54,
        alignItems: 'center',
        justifyContent: 'center',
    },
    submitText: {
        fontSize: 17,
        lineHeight: 22,
        fontWeight: '800',
        color: '#ffffff',
    },
    footerRow: {
        marginTop: 24,
        marginBottom: 8,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    footerText: {
        fontSize: 12,
        lineHeight: 16,
        color: '#94a3b8',
        fontWeight: '600',
    },
    footerLink: {
        fontSize: 12,
        lineHeight: 16,
        color: '#7c3aed',
        fontWeight: '700',
    },
});
