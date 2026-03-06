import React, { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
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
import * as ImagePicker from 'expo-image-picker';

export default function BasicProfileSetupScreen({ navigation, route }) {
    const insets = useSafeAreaInsets();

    // Extracted from RegisterScreen routing
    const {
        selectedRole,
        authMode,
        email,
        phoneNumber,
        password
    } = route?.params || {};

    const [fullName, setFullName] = useState('');
    const [bio, setBio] = useState('');
    const [avatarUri, setAvatarUri] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const canSubmit = String(fullName || '').trim().length > 0;
    const normalizedRole = String(selectedRole || 'worker').toLowerCase();
    const roleLabel = normalizedRole === 'hybrid'
        ? 'Hybrid Setup'
        : (normalizedRole === 'employer' ? 'Recruiter Setup' : 'Job Seeker Setup');
    const bioCount = String(bio || '').trim().length;

    const avatarFallback = 'https://ui-avatars.com/api/?name=User&background=e9ddff&color=4c1d95&rounded=true&size=256';

    const handleBack = useCallback(() => {
        if (navigation.canGoBack()) navigation.goBack();
    }, [navigation]);

    const pickAvatar = useCallback(async () => {
        try {
            const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (permission?.status !== 'granted') {
                Alert.alert('Permission needed', 'Allow gallery access to choose profile photo.');
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.85,
            });
            if (result?.canceled) return;
            const uri = String(result?.assets?.[0]?.uri || '').trim();
            if (uri) setAvatarUri(uri);
        } catch (_error) {
            Alert.alert('Photo unavailable', 'Could not pick profile photo right now.');
        }
    }, []);

    const handleContinue = useCallback(() => {
        if (submitting || !canSubmit) return;
        setSubmitting(true);
        setTimeout(() => {
            setSubmitting(false);
            navigation.navigate('AccountSetupDetails', {
                selectedRole,
                authMode,
                email,
                phoneNumber,
                password,
                name: String(fullName || '').trim(),
                bio: String(bio || '').trim(),
                avatarUri,
            });
        }, 300);
    }, [submitting, canSubmit, navigation, selectedRole, authMode, email, phoneNumber, password, fullName, bio, avatarUri]);

    return (
        <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={styles.bgOrbTop} />
            <View style={styles.bgOrbBottom} />
            <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={[styles.content, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 26 }]}
            >
                <TouchableOpacity style={styles.backBtn} activeOpacity={0.82} onPress={handleBack}>
                    <Ionicons name="chevron-back" size={18} color="#7c3aed" />
                    <Text style={styles.backText}>Back</Text>
                </TouchableOpacity>

                <View style={styles.heroCard}>
                    <View style={styles.stepPill}>
                        <Ionicons name="sparkles-outline" size={14} color="#6d28d9" />
                        <Text style={styles.stepPillText}>Step 1 of 2</Text>
                    </View>
                    <Text style={styles.title}>Build your profile</Text>
                    <Text style={styles.subtitle}>Set your identity once, we handle the rest across the app.</Text>
                    <View style={styles.roleChip}>
                        <Text style={styles.roleChipText}>{roleLabel}</Text>
                    </View>
                </View>

                <View style={styles.avatarSection}>
                    <View style={styles.avatarRing}>
                        <Image source={{ uri: avatarUri || avatarFallback }} style={styles.avatarImage} />
                        <TouchableOpacity style={styles.cameraFab} onPress={pickAvatar} activeOpacity={0.85}>
                            <Ionicons name="camera" size={17} color="#ffffff" />
                        </TouchableOpacity>
                    </View>
                    <Text style={styles.avatarTitle}>Profile Picture</Text>
                    <Text style={styles.avatarHint}>Add a photo so people recognize you</Text>
                </View>

                <View style={styles.formCard}>
                    <View style={styles.fieldBlock}>
                        <Text style={styles.fieldLabel}>Full Name</Text>
                        <View style={styles.inputShell}>
                            <Ionicons name="person-outline" size={16} color="#7c3aed" style={styles.fieldIcon} />
                            <TextInput
                                value={fullName}
                                onChangeText={setFullName}
                                style={styles.input}
                                placeholder="E.g. John Doe"
                                placeholderTextColor="#a6abc0"
                                autoCapitalize="words"
                            />
                        </View>
                    </View>

                    <View style={[styles.fieldBlock, { marginTop: 18 }]}>
                        <View style={styles.labelRow}>
                            <Text style={styles.fieldLabel}>About Me (Bio)</Text>
                            <Text style={styles.fieldMeta}>{bioCount}/180</Text>
                        </View>
                        <View style={[styles.inputShell, styles.inputShellMultiline]}>
                            <TextInput
                                value={bio}
                                onChangeText={setBio}
                                style={[styles.input, styles.inputMultiline]}
                                placeholder="Write a short description about yourself..."
                                placeholderTextColor="#a6abc0"
                                multiline
                                textAlignVertical="top"
                                maxLength={180}
                            />
                        </View>
                    </View>
                </View>

                <TouchableOpacity
                    style={[styles.submitWrap, (!canSubmit || submitting) && styles.submitWrapDisabled]}
                    activeOpacity={0.9}
                    onPress={handleContinue}
                    disabled={!canSubmit || submitting}
                >
                    <LinearGradient
                        colors={['#7c3aed', '#5b21b6']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.submitGradient}
                    >
                        {submitting ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.submitText}>Continue</Text>}
                    </LinearGradient>
                </TouchableOpacity>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f7f4ff',
    },
    bgOrbTop: {
        position: 'absolute',
        top: -120,
        right: -80,
        width: 260,
        height: 260,
        borderRadius: 130,
        backgroundColor: 'rgba(167,139,250,0.18)',
    },
    bgOrbBottom: {
        position: 'absolute',
        left: -90,
        bottom: -120,
        width: 240,
        height: 240,
        borderRadius: 120,
        backgroundColor: 'rgba(196,181,253,0.18)',
    },
    content: {
        flexGrow: 1,
        paddingHorizontal: 18,
    },
    backBtn: {
        minHeight: 42,
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        marginBottom: 8,
    },
    backText: {
        color: '#7c3aed',
        fontSize: 13,
        fontWeight: '700',
    },
    heroCard: {
        marginTop: 4,
        marginBottom: 16,
        borderRadius: 22,
        borderWidth: 1,
        borderColor: '#e7ddff',
        backgroundColor: 'rgba(255,255,255,0.92)',
        paddingHorizontal: 16,
        paddingVertical: 16,
        shadowColor: '#6d28d9',
        shadowOpacity: 0.08,
        shadowOffset: { width: 0, height: 10 },
        shadowRadius: 16,
        elevation: 2,
    },
    stepPill: {
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 5,
        backgroundColor: '#efe7ff',
        marginBottom: 10,
    },
    stepPillText: {
        color: '#5b21b6',
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 0.2,
    },
    title: {
        fontSize: 29,
        lineHeight: 33,
        fontWeight: '800',
        letterSpacing: -0.6,
        color: '#1f1446',
    },
    subtitle: {
        marginTop: 4,
        color: '#7b7e92',
        fontSize: 13,
        lineHeight: 18,
        fontWeight: '600',
    },
    roleChip: {
        marginTop: 12,
        alignSelf: 'flex-start',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#d7c8ff',
        backgroundColor: '#f5f0ff',
        paddingHorizontal: 10,
        paddingVertical: 6,
    },
    roleChipText: {
        color: '#6d28d9',
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 0.2,
    },
    avatarSection: {
        marginTop: 4,
        alignItems: 'center',
        marginBottom: 20,
    },
    avatarRing: {
        width: 132,
        height: 132,
        borderRadius: 66,
        borderWidth: 2.5,
        borderColor: '#b794ff',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f8f3ff',
        position: 'relative',
    },
    avatarImage: {
        width: 122,
        height: 122,
        borderRadius: 61,
    },
    cameraFab: {
        position: 'absolute',
        right: -4,
        bottom: 4,
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#7c3aed',
        borderWidth: 2,
        borderColor: '#f6f3ff',
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarTitle: {
        marginTop: 10,
        color: '#22154a',
        fontSize: 18,
        fontWeight: '800',
        letterSpacing: -0.1,
    },
    avatarHint: {
        marginTop: 2,
        color: '#8a8ea5',
        fontSize: 13,
        fontWeight: '600',
    },
    formCard: {
        borderRadius: 22,
        borderWidth: 1,
        borderColor: '#e2d6ff',
        backgroundColor: 'rgba(255,255,255,0.95)',
        paddingHorizontal: 16,
        paddingVertical: 18,
        shadowColor: '#5b21b6',
        shadowOpacity: 0.09,
        shadowOffset: { width: 0, height: 10 },
        shadowRadius: 24,
        elevation: 2,
    },
    fieldBlock: {
        marginTop: 0,
    },
    fieldLabel: {
        color: '#32225f',
        fontSize: 13,
        fontWeight: '800',
        marginBottom: 7,
        letterSpacing: 0.2,
    },
    labelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    fieldMeta: {
        color: '#7c3aed',
        fontSize: 11,
        fontWeight: '700',
    },
    inputShell: {
        minHeight: 50,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#ddd2f7',
        backgroundColor: '#fbf9ff',
        paddingHorizontal: 12,
        flexDirection: 'row',
        alignItems: 'center',
    },
    fieldIcon: {
        marginRight: 8,
    },
    inputShellMultiline: {
        minHeight: 120,
        alignItems: 'flex-start',
        paddingVertical: 12,
    },
    input: {
        flex: 1,
        color: '#1f133f',
        fontSize: 14,
        fontWeight: '600',
        minHeight: 48,
    },
    inputMultiline: {
        minHeight: 90,
    },
    submitWrap: {
        marginTop: 24,
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: '#7c3aed',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.26,
        shadowRadius: 14,
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
        color: '#ffffff',
        fontSize: 16,
        lineHeight: 20,
        fontWeight: '800',
        letterSpacing: -0.1,
    },
});
