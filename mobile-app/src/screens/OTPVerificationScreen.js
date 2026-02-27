import React, { useState, useRef, useEffect } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    KeyboardAvoidingView, Platform, Alert, Animated
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import client from '../api/client';

const OTP_LENGTH = 6;
const RESEND_COOLDOWN = 30;

export default function OTPVerificationScreen({ route, navigation }) {
    const insets = useSafeAreaInsets();
    const { email = 'user@example.com' } = route.params || {};

    const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(''));
    const [isVerifying, setIsVerifying] = useState(false);
    const [resendTimer, setResendTimer] = useState(RESEND_COOLDOWN);
    const [canResend, setCanResend] = useState(false);
    const [errorText, setErrorText] = useState('');

    const inputRefs = useRef(Array.from({ length: OTP_LENGTH }, () => React.createRef()));
    const shakeAnim = useRef(new Animated.Value(0)).current;
    const timerRef = useRef(null);

    useEffect(() => {
        startCountdown();
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, []);

    const startCountdown = () => {
        setResendTimer(RESEND_COOLDOWN);
        setCanResend(false);
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
            setResendTimer(prev => {
                if (prev <= 1) {
                    clearInterval(timerRef.current);
                    setCanResend(true);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    const shakeInputs = () => {
        shakeAnim.setValue(0);
        Animated.sequence([
            Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
        ]).start();
    };

    const handleDigit = (text, index) => {
        const digit = text.replace(/[^0-9]/g, '').slice(-1);
        const next = [...otp];
        next[index] = digit;
        setOtp(next);
        setErrorText('');

        if (digit && index < OTP_LENGTH - 1) {
            inputRefs.current[index + 1]?.current?.focus();
        }
    };

    const handleKeyPress = (e, index) => {
        if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
            inputRefs.current[index - 1]?.current?.focus();
        }
    };

    const handleVerify = async () => {
        const code = otp.join('');
        if (code.length < OTP_LENGTH) {
            setErrorText('Please enter all 6 digits');
            shakeInputs();
            return;
        }

        setIsVerifying(true);
        try {
            await client.post('/api/auth/verify-otp', { email, otp: code });
            Alert.alert('Verified!', 'Your email has been verified successfully.', [
                { text: 'Continue', onPress: () => navigation.navigate('Login') }
            ]);
        } catch (err) {
            setErrorText('Invalid code. Please try again.');
            shakeInputs();
        } finally {
            setIsVerifying(false);
        }
    };

    const handleResend = async () => {
        if (!canResend) return;
        try {
            await client.post('/api/auth/resend-otp', { email });
            setOtp(Array(OTP_LENGTH).fill(''));
            inputRefs.current[0]?.current?.focus();
            setErrorText('');
            startCountdown();
            Alert.alert('Code Sent', 'A new verification code has been sent.');
        } catch (e) {
            Alert.alert('Error', 'Could not resend code. Please try again.');
        }
    };

    const isComplete = otp.every(d => d !== '');

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={[styles.container, { paddingTop: insets.top }]}
        >
            {/* Header */}
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                <Text style={styles.backArrow}>‹</Text>
            </TouchableOpacity>

            <View style={styles.content}>
                <Text style={styles.emoji}>📬</Text>
                <Text style={styles.title}>Verify Your Email</Text>
                <Text style={styles.subtitle}>
                    We sent a 6-digit code to{'\n'}
                    <Text style={styles.emailHighlight}>{email}</Text>
                </Text>

                {/* OTP Boxes */}
                <Animated.View style={[styles.otpRow, { transform: [{ translateX: shakeAnim }] }]}>
                    {otp.map((digit, i) => (
                        <TextInput
                            key={i}
                            ref={inputRefs.current[i]}
                            style={[styles.otpBox, digit && styles.otpBoxFilled, errorText && styles.otpBoxError]}
                            value={digit}
                            onChangeText={text => handleDigit(text, i)}
                            onKeyPress={e => handleKeyPress(e, i)}
                            keyboardType="number-pad"
                            maxLength={1}
                            textAlign="center"
                            selectTextOnFocus
                        />
                    ))}
                </Animated.View>

                {/* Error Text */}
                {!!errorText && <Text style={styles.errorText}>{errorText}</Text>}

                {/* Verify Button */}
                <TouchableOpacity
                    style={[styles.verifyBtn, !isComplete && styles.verifyBtnDisabled]}
                    onPress={handleVerify}
                    disabled={!isComplete || isVerifying}
                    activeOpacity={0.85}
                >
                    <Text style={styles.verifyBtnText}>
                        {isVerifying ? 'Verifying...' : 'Verify'}
                    </Text>
                </TouchableOpacity>

                {/* Resend */}
                <View style={styles.resendRow}>
                    <Text style={styles.resendLabel}>Didn't get a code? </Text>
                    {canResend ? (
                        <TouchableOpacity onPress={handleResend}>
                            <Text style={styles.resendLink}>Resend Code</Text>
                        </TouchableOpacity>
                    ) : (
                        <Text style={styles.resendCountdown}>Resend in {resendTimer}s</Text>
                    )}
                </View>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    backBtn: { paddingHorizontal: 20, paddingVertical: 16 },
    backArrow: { fontSize: 32, color: '#0f172a', fontWeight: '300', lineHeight: 36 },
    content: { flex: 1, paddingHorizontal: 32, paddingTop: 24, alignItems: 'center' },
    emoji: { fontSize: 56, marginBottom: 16 },
    title: { fontSize: 28, fontWeight: '900', color: '#0f172a', marginBottom: 12, textAlign: 'center' },
    subtitle: { fontSize: 15, color: '#64748b', textAlign: 'center', lineHeight: 22, marginBottom: 40 },
    emailHighlight: { color: '#9333ea', fontWeight: '700' },
    otpRow: { flexDirection: 'row', gap: 10, marginBottom: 16, justifyContent: 'center' },
    otpBox: {
        width: 44, height: 56, borderRadius: 12,
        borderWidth: 2, borderColor: '#e2e8f0',
        backgroundColor: '#f8fafc', fontSize: 22, fontWeight: '900', color: '#0f172a',
    },
    otpBoxFilled: { borderColor: '#9333ea', backgroundColor: '#faf5ff' },
    otpBoxError: { borderColor: '#ef4444', backgroundColor: '#fff1f2' },
    errorText: { fontSize: 13, color: '#ef4444', fontWeight: '600', marginBottom: 16, textAlign: 'center' },
    verifyBtn: {
        width: '100%', paddingVertical: 16, backgroundColor: '#9333ea',
        borderRadius: 14, alignItems: 'center', marginTop: 8, marginBottom: 20,
        shadowColor: '#9333ea', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
    },
    verifyBtnDisabled: { backgroundColor: '#c084fc', shadowOpacity: 0.1 },
    verifyBtnText: { color: '#fff', fontSize: 16, fontWeight: '900', letterSpacing: 0.5 },
    resendRow: { flexDirection: 'row', alignItems: 'center' },
    resendLabel: { fontSize: 14, color: '#64748b' },
    resendLink: { fontSize: 14, fontWeight: '700', color: '#9333ea' },
    resendCountdown: { fontSize: 14, color: '#94a3b8', fontWeight: '600' },
});
