import React, { useCallback, useContext, useMemo, useState } from 'react';
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
import { AuthContext } from '../context/AuthContext';

export default function LoginScreen({ navigation, route }) {
    const insets = useSafeAreaInsets();
    const { updateUserInfo, completeOnboarding } = useContext(AuthContext);
    const rawSelectedRole = String(route?.params?.selectedRole || 'worker').toLowerCase();
    const selectedRole = ['worker', 'employer', 'hybrid'].includes(rawSelectedRole) ? rawSelectedRole : 'worker';
    const resolvedActiveRole = selectedRole === 'employer' ? 'employer' : 'worker';
    const resolvedRoles = selectedRole === 'hybrid' ? ['worker', 'employer'] : [resolvedActiveRole];

    const [authMode, setAuthMode] = useState('phone');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const subtitleText = useMemo(
        () => `Sign in to your ${selectedRole === 'employer' ? 'Employer' : (selectedRole === 'hybrid' ? 'Hybrid' : 'Job Seeker')} account`,
        [selectedRole]
    );

    const canSubmit = authMode === 'phone'
        ? Boolean(String(phoneNumber || '').trim() && String(password || '').trim())
        : Boolean(String(email || '').trim() && String(password || '').trim());

    const handleBack = useCallback(() => {
        if (navigation.canGoBack()) {
            navigation.goBack();
        }
    }, [navigation]);

    const handleSubmit = useCallback(async () => {
        if (loading || !canSubmit) return;
        setLoading(true);
        try {
            await new Promise((resolve) => setTimeout(resolve, 420));
            await updateUserInfo({
                accountMode: selectedRole === 'hybrid' ? 'hybrid' : resolvedActiveRole,
                role: resolvedActiveRole === 'employer' ? 'recruiter' : 'candidate',
                activeRole: resolvedActiveRole,
                primaryRole: resolvedActiveRole,
                roles: resolvedRoles,
                hasSelectedRole: true,
                hasCompletedProfile: false,
                hasCompletedOnboarding: true,
            });
            await completeOnboarding?.();
        } catch (_error) {
            Alert.alert('Sign in unavailable', 'Unable to continue right now. Please try again.');
        } finally {
            setLoading(false);
        }
    }, [canSubmit, completeOnboarding, loading, resolvedActiveRole, resolvedRoles, updateUserInfo]);

    const openForgotPassword = useCallback(() => {
        navigation.navigate('ForgotPassword', { selectedRole });
    }, [navigation, selectedRole]);

    const openSignUp = useCallback(() => {
        navigation.navigate('Register', { selectedRole });
    }, [navigation, selectedRole]);

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
                    <Text style={styles.title}>Welcome!</Text>
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
                            placeholder="••••••••"
                            placeholderTextColor="#94a3b8"
                        />
                    </View>

                    <TouchableOpacity style={styles.forgotTap} activeOpacity={0.8} onPress={openForgotPassword}>
                        <Text style={styles.forgotText}>Forgot password?</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.submitWrap, (!canSubmit || loading) && styles.submitWrapDisabled]}
                        activeOpacity={0.9}
                        onPress={handleSubmit}
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
                                <Text style={styles.submitText}>Sign In</Text>
                            )}
                        </LinearGradient>
                    </TouchableOpacity>
                </View>

                <View style={styles.footerRow}>
                    <Text style={styles.footerText}>Don't have an account? </Text>
                    <TouchableOpacity activeOpacity={0.8} onPress={openSignUp}>
                        <Text style={styles.footerLink}>Sign Up</Text>
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
        minHeight: 48,
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
        marginTop: 22,
        gap: 16,
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
        minWidth: 66,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 10,
        paddingVertical: 16,
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
    forgotTap: {
        alignSelf: 'flex-end',
        minHeight: 30,
        justifyContent: 'center',
    },
    forgotText: {
        fontSize: 13,
        lineHeight: 18,
        color: '#7c3aed',
        fontWeight: '700',
    },
    submitWrap: {
        marginTop: 8,
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
        marginTop: 'auto',
        paddingTop: 20,
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
