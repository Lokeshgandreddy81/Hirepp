import React, { useCallback, useContext, useMemo, useState } from 'react';
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
import { AuthContext } from '../context/AuthContext';

const FUNCTIONAL_AREA_OPTIONS = [
    'Customer Support',
    'Sales',
    'Operations',
    'HR / Recruiter',
    'Engineering',
    'Design',
    'Marketing',
    'Finance',
    'Warehouse / Logistics',
    'Admin',
];
const CITY_OPTIONS = [
    'Bengaluru',
    'Hyderabad',
    'Chennai',
    'Mumbai',
    'Pune',
    'Delhi NCR',
    'Kolkata',
    'Remote',
];
const SALARY_OPTIONS = [
    'INR 0 - 5 LPA',
    'INR 5 - 8 LPA',
    'INR 8 - 12 LPA',
    'INR 12 - 20 LPA',
    'INR 20+ LPA',
];
const GENDER_OPTIONS = ['Male', 'Female', 'Other'];

const splitName = (fullName = '') => {
    const parts = String(fullName || '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) {
        return { firstName: '', lastName: '' };
    }
    return {
        firstName: parts[0],
        lastName: parts.slice(1).join(' '),
    };
};

const buildSuggestions = (query = '', options = [], limit = 6) => {
    const normalizedQuery = String(query || '').trim().toLowerCase();
    const safeOptions = Array.isArray(options) ? options.filter(Boolean) : [];
    if (!normalizedQuery) return safeOptions.slice(0, limit);
    const startsWith = safeOptions.filter((item) => String(item).toLowerCase().startsWith(normalizedQuery));
    const contains = safeOptions.filter((item) => (
        String(item).toLowerCase().includes(normalizedQuery) && !startsWith.includes(item)
    ));
    return [...startsWith, ...contains].slice(0, limit);
};

function TypeaheadField({
    label,
    value,
    onChangeText,
    placeholder,
    suggestions,
    onSelectSuggestion,
    keyboardType = 'default',
    autoCapitalize = 'words',
}) {
    const [isFocused, setIsFocused] = useState(false);
    const safeSuggestions = Array.isArray(suggestions) ? suggestions.filter(Boolean) : [];
    return (
        <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>{label}</Text>
            <View style={[styles.inputShell, isFocused && styles.inputShellFocused]}>
                <TextInput
                    value={value}
                    onChangeText={onChangeText}
                    style={styles.input}
                    placeholder={placeholder}
                    placeholderTextColor="#9aa0b5"
                    keyboardType={keyboardType}
                    autoCapitalize={autoCapitalize}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setTimeout(() => setIsFocused(false), 120)}
                />
                <Ionicons name={isFocused ? 'chevron-up' : 'chevron-down'} size={16} color="#7c3aed" />
            </View>

            {isFocused && safeSuggestions.length > 0 ? (
                <View style={styles.suggestionPanel}>
                    {safeSuggestions.map((item) => (
                        <TouchableOpacity
                            key={`${label}-${item}`}
                            activeOpacity={0.82}
                            style={styles.suggestionRow}
                            onPress={() => {
                                onSelectSuggestion?.(item);
                                setIsFocused(false);
                            }}
                        >
                            <Text style={styles.suggestionText}>{item}</Text>
                            <Ionicons name="arrow-forward" size={14} color="#7c3aed" />
                        </TouchableOpacity>
                    ))}
                </View>
            ) : null}
        </View>
    );
}

export default function AccountSetupDetailsScreen({ navigation, route }) {
    const insets = useSafeAreaInsets();
    const { updateUserInfo, completeOnboarding } = useContext(AuthContext);
    const passedRole = String(route?.params?.selectedRole || 'worker').toLowerCase();
    const selectedRole = ['employer', 'hybrid'].includes(passedRole) ? passedRole : 'worker';
    const authMode = String(route?.params?.authMode || 'phone').toLowerCase() === 'email' ? 'email' : 'phone';

    const seedName = String(route?.params?.name || '').trim();
    const nameParts = splitName(seedName);
    const bio = String(route?.params?.bio || '').trim();
    const avatarUri = String(route?.params?.avatarUri || '').trim();

    const [email, setEmail] = useState(String(route?.params?.email || '').trim());
    const [phoneNumber, setPhoneNumber] = useState(String(route?.params?.phoneNumber || '').trim());
    const [password, setPassword] = useState(String(route?.params?.password || '').trim());
    const [dateOfBirth, setDateOfBirth] = useState('');
    const [gender, setGender] = useState('Male');
    const [functionalArea, setFunctionalArea] = useState('');
    const [preferredCity, setPreferredCity] = useState('');
    const [expectedSalary, setExpectedSalary] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const normalizedRole = String(selectedRole || 'worker').toLowerCase();
    const roleLabel = normalizedRole === 'hybrid'
        ? 'Hybrid Profile'
        : (normalizedRole === 'employer' ? 'Recruiter Profile' : 'Job Seeker Profile');
    const avatarFallback = `https://ui-avatars.com/api/?name=${encodeURIComponent(seedName || 'User')}&background=e9ddff&color=4c1d95&rounded=true&size=256`;

    const functionalSuggestions = useMemo(
        () => buildSuggestions(functionalArea, FUNCTIONAL_AREA_OPTIONS),
        [functionalArea]
    );
    const citySuggestions = useMemo(
        () => buildSuggestions(preferredCity, CITY_OPTIONS),
        [preferredCity]
    );
    const salarySuggestions = useMemo(
        () => buildSuggestions(expectedSalary, SALARY_OPTIONS),
        [expectedSalary]
    );
    const topFunctionalPicks = useMemo(
        () => buildSuggestions(functionalArea, FUNCTIONAL_AREA_OPTIONS, 4),
        [functionalArea]
    );
    const topCityPicks = useMemo(
        () => buildSuggestions(preferredCity, CITY_OPTIONS, 4),
        [preferredCity]
    );
    const topSalaryPicks = useMemo(
        () => buildSuggestions(expectedSalary, SALARY_OPTIONS, 4),
        [expectedSalary]
    );



    const canSubmit = useMemo(() => {
        if (!String(password || '').trim()) return false;
        if (authMode === 'email' && !String(email || '').trim()) return false;
        if (authMode === 'phone' && !String(phoneNumber || '').trim()) return false;
        if (!String(functionalArea || '').trim()) return false;
        if (!String(preferredCity || '').trim()) return false;
        if (!String(expectedSalary || '').trim()) return false;
        return true;
    }, [authMode, email, expectedSalary, functionalArea, password, phoneNumber, preferredCity]);

    const handleBack = useCallback(() => {
        if (navigation.canGoBack()) navigation.goBack();
    }, [navigation]);



    const handleCompleteSetup = useCallback(async () => {
        if (submitting || !canSubmit) return;

        const safePassword = String(password || '').trim();
        const safeEmail = String(email || '').trim();
        const safePhone = String(phoneNumber || '').trim();
        if (safePassword.length < 6) {
            Alert.alert('Invalid password', 'Password should be at least 6 characters.');
            return;
        }
        if (authMode === 'email' && !safeEmail.includes('@')) {
            Alert.alert('Invalid email', 'Please enter a valid email address.');
            return;
        }
        if (authMode === 'phone' && safePhone.replace(/\D/g, '').length < 10) {
            Alert.alert('Invalid phone', 'Please enter a valid phone number.');
            return;
        }

        setSubmitting(true);
        try {
            const name = seedName;
            const isHybrid = selectedRole === 'hybrid';
            const mappedRole = selectedRole === 'employer' ? 'recruiter' : 'candidate';
            const mappedActiveRole = selectedRole === 'employer' ? 'employer' : 'worker';
            const rolesArr = isHybrid ? ['worker', 'employer'] : [mappedActiveRole];

            await updateUserInfo({
                name,
                firstName: nameParts.firstName,
                lastName: nameParts.lastName,
                accountMode: isHybrid ? 'hybrid' : mappedActiveRole,
                bio,
                email: authMode === 'email' ? safeEmail : '',
                phoneNumber: authMode === 'phone' ? safePhone : '',
                avatar: avatarUri,
                profilePicture: avatarUri,
                dateOfBirth: String(dateOfBirth || '').trim(),
                gender: String(gender || '').trim(),
                functionalArea: String(functionalArea || '').trim(),
                preferredCity: String(preferredCity || '').trim(),
                expectedSalary: String(expectedSalary || '').trim(),
                profileSetup: {
                    dateOfBirth: String(dateOfBirth || '').trim(),
                    gender: String(gender || '').trim(),
                    functionalArea: String(functionalArea || '').trim(),
                    preferredCity: String(preferredCity || '').trim(),
                    expectedSalary: String(expectedSalary || '').trim(),
                },
                role: mappedRole,
                activeRole: mappedActiveRole,
                primaryRole: mappedActiveRole,
                roles: rolesArr,
                hasSelectedRole: true,
                hasCompletedProfile: false,
                hasCompletedOnboarding: true,
            });
            await completeOnboarding?.();
        } catch (_error) {
            Alert.alert('Setup unavailable', 'Unable to complete account setup right now. Please try again.');
        } finally {
            setSubmitting(false);
        }
    }, [
        authMode,
        avatarUri,
        bio,
        canSubmit,
        completeOnboarding,
        dateOfBirth,
        email,
        expectedSalary,
        functionalArea,
        gender,
        nameParts.firstName,
        nameParts.lastName,
        password,
        phoneNumber,
        preferredCity,
        seedName,
        selectedRole,
        submitting,
        updateUserInfo,
    ]);

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
                        <Text style={styles.stepPillText}>Step 2 of 2</Text>
                    </View>

                    <View style={styles.heroIdentity}>
                        <Image source={{ uri: avatarUri || avatarFallback }} style={styles.heroAvatar} />
                        <View style={styles.heroIdentityTextWrap}>
                            <Text style={styles.heroName}>{seedName || 'Your Profile'}</Text>
                            <Text style={styles.heroRole}>{roleLabel}</Text>
                        </View>
                    </View>

                    <Text style={styles.title}>Complete your profile</Text>
                    <Text style={styles.subtitle}>Smart fields, quick picks, and instant-ready profile setup.</Text>
                </View>

                <View style={[styles.formCard, { marginTop: 24 }]}>
                    <View style={styles.sectionHeader}>
                        <Ionicons name="shield-checkmark-outline" size={15} color="#7c3aed" />
                        <Text style={styles.sectionHeaderText}>Account Details</Text>
                    </View>
                    {authMode === 'email' ? (
                        <View style={styles.fieldBlock}>
                            <Text style={styles.fieldLabel}>Email</Text>
                            <View style={styles.inputShell}>
                                <Ionicons name="mail-outline" size={16} color="#7c3aed" style={styles.fieldIcon} />
                                <TextInput
                                    value={email}
                                    onChangeText={setEmail}
                                    style={styles.input}
                                    placeholder="Enter your email"
                                    placeholderTextColor="#a6abc0"
                                    autoCapitalize="none"
                                    keyboardType="email-address"
                                />
                            </View>
                        </View>
                    ) : (
                        <View style={styles.fieldBlock}>
                            <Text style={styles.fieldLabel}>Phone Number</Text>
                            <View style={styles.phoneRow}>
                                <View style={styles.countryCodeWrap}>
                                    <Text style={styles.countryCodeText}>+91</Text>
                                </View>
                                <TextInput
                                    value={phoneNumber}
                                    onChangeText={setPhoneNumber}
                                    style={styles.phoneInput}
                                    placeholder="Enter your phone number"
                                    placeholderTextColor="#a6abc0"
                                    keyboardType="phone-pad"
                                />
                            </View>
                        </View>
                    )}

                    <View style={styles.fieldBlock}>
                        <Text style={styles.fieldLabel}>Password</Text>
                        <View style={styles.inputShell}>
                            <Ionicons name="lock-closed-outline" size={16} color="#7c3aed" style={styles.fieldIcon} />
                            <TextInput
                                value={password}
                                onChangeText={setPassword}
                                style={styles.input}
                                placeholder="Enter a strong login password"
                                placeholderTextColor="#a6abc0"
                                secureTextEntry
                                autoCapitalize="none"
                            />
                        </View>
                    </View>

                    <View style={styles.fieldBlock}>
                        <Text style={styles.fieldLabel}>My Date of Birth</Text>
                        <View style={styles.inputShell}>
                            <Ionicons name="calendar-outline" size={16} color="#7c3aed" style={styles.fieldIcon} />
                            <TextInput
                                value={dateOfBirth}
                                onChangeText={setDateOfBirth}
                                style={styles.input}
                                placeholder="DD / MM / YYYY"
                                placeholderTextColor="#a6abc0"
                                keyboardType="numbers-and-punctuation"
                            />
                        </View>
                    </View>

                    <View style={styles.fieldBlock}>
                        <Text style={styles.fieldLabel}>My Gender</Text>
                        <View style={styles.genderRow}>
                            {GENDER_OPTIONS.map((option) => {
                                const active = option.toLowerCase() === String(gender || '').toLowerCase();
                                return (
                                    <TouchableOpacity
                                        key={option}
                                        style={[styles.genderChip, active && styles.genderChipActive]}
                                        onPress={() => setGender(option)}
                                        activeOpacity={0.85}
                                    >
                                        <Text style={[styles.genderChipText, active && styles.genderChipTextActive]}>{option}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>

                    <View style={styles.sectionDivider} />
                    <Text style={styles.sectionTitle}>Job Preference</Text>

                    <TypeaheadField
                        label="Functional Areas"
                        value={functionalArea}
                        onChangeText={setFunctionalArea}
                        placeholder="Select job title / role"
                        suggestions={functionalSuggestions}
                        onSelectSuggestion={setFunctionalArea}
                    />
                    <View style={styles.quickRow}>
                        {topFunctionalPicks.map((item) => (
                            <TouchableOpacity key={`functional-${item}`} style={styles.quickChip} activeOpacity={0.85} onPress={() => setFunctionalArea(item)}>
                                <Text style={styles.quickChipText}>{item}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <TypeaheadField
                        label="Preferred City"
                        value={preferredCity}
                        onChangeText={setPreferredCity}
                        placeholder="Select city"
                        suggestions={citySuggestions}
                        onSelectSuggestion={setPreferredCity}
                    />
                    <View style={styles.quickRow}>
                        {topCityPicks.map((item) => (
                            <TouchableOpacity key={`city-${item}`} style={styles.quickChip} activeOpacity={0.85} onPress={() => setPreferredCity(item)}>
                                <Text style={styles.quickChipText}>{item}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <TypeaheadField
                        label="Expected Salary"
                        value={expectedSalary}
                        onChangeText={setExpectedSalary}
                        placeholder="INR 0 - 5 LPA"
                        suggestions={salarySuggestions}
                        onSelectSuggestion={setExpectedSalary}
                        autoCapitalize="none"
                    />
                    <View style={styles.quickRow}>
                        {topSalaryPicks.map((item) => (
                            <TouchableOpacity key={`salary-${item}`} style={styles.quickChip} activeOpacity={0.85} onPress={() => setExpectedSalary(item)}>
                                <Text style={styles.quickChipText}>{item}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                <TouchableOpacity
                    style={[styles.submitWrap, (!canSubmit || submitting) && styles.submitWrapDisabled]}
                    activeOpacity={0.9}
                    onPress={handleCompleteSetup}
                    disabled={!canSubmit || submitting}
                >
                    <LinearGradient
                        colors={['#7c3aed', '#5b21b6']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.submitGradient}
                    >
                        {submitting ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.submitText}>Create Account</Text>}
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
        marginBottom: -6,
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
    heroIdentity: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 10,
    },
    heroAvatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        borderWidth: 1.5,
        borderColor: '#d7c8ff',
        backgroundColor: '#f8f3ff',
    },
    heroIdentityTextWrap: {
        flex: 1,
    },
    heroName: {
        color: '#271453',
        fontSize: 14,
        fontWeight: '800',
        letterSpacing: -0.1,
    },
    heroRole: {
        marginTop: 2,
        color: '#7c3aed',
        fontSize: 11,
        fontWeight: '700',
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
    avatarSection: {
        marginTop: 14,
        alignItems: 'center',
        marginBottom: 16,
    },
    avatarRing: {
        width: 124,
        height: 124,
        borderRadius: 62,
        borderWidth: 2,
        borderColor: '#b794ff',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f8f3ff',
        position: 'relative',
    },
    avatarImage: {
        width: 116,
        height: 116,
        borderRadius: 58,
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
        fontSize: 19,
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
        paddingVertical: 16,
        shadowColor: '#5b21b6',
        shadowOpacity: 0.09,
        shadowOffset: { width: 0, height: 10 },
        shadowRadius: 24,
        elevation: 2,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 2,
        marginBottom: 4,
    },
    sectionHeaderText: {
        color: '#6b21a8',
        fontSize: 12,
        fontWeight: '800',
        letterSpacing: 0.2,
        textTransform: 'uppercase',
    },
    rowTwo: {
        flexDirection: 'row',
        gap: 10,
    },
    halfField: {
        flex: 1,
    },
    fieldBlock: {
        marginTop: 10,
    },
    fieldLabel: {
        color: '#32225f',
        fontSize: 13,
        fontWeight: '800',
        marginBottom: 7,
        letterSpacing: 0.2,
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
    inputShellFocused: {
        borderColor: '#8b5cf6',
        backgroundColor: '#f8f3ff',
    },
    input: {
        flex: 1,
        color: '#1f133f',
        fontSize: 14,
        fontWeight: '600',
        minHeight: 48,
    },
    phoneRow: {
        minHeight: 50,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#ddd2f7',
        backgroundColor: '#fbf9ff',
        flexDirection: 'row',
        alignItems: 'center',
        overflow: 'hidden',
    },
    countryCodeWrap: {
        width: 58,
        minHeight: 50,
        borderRightWidth: 1,
        borderRightColor: '#ddd2f7',
        alignItems: 'center',
        justifyContent: 'center',
    },
    countryCodeText: {
        color: '#5b21b6',
        fontSize: 14,
        fontWeight: '800',
    },
    phoneInput: {
        flex: 1,
        minHeight: 50,
        paddingHorizontal: 12,
        color: '#1f133f',
        fontSize: 14,
        fontWeight: '600',
    },
    genderRow: {
        flexDirection: 'row',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#ddd2f7',
        overflow: 'hidden',
    },
    genderChip: {
        flex: 1,
        minHeight: 44,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#ffffff',
        borderRightWidth: 1,
        borderRightColor: '#e9e2fb',
    },
    genderChipActive: {
        backgroundColor: '#7c3aed',
    },
    genderChipText: {
        color: '#5b21b6',
        fontSize: 14,
        fontWeight: '700',
    },
    genderChipTextActive: {
        color: '#ffffff',
    },
    sectionDivider: {
        marginTop: 16,
        height: 1,
        backgroundColor: '#efe9ff',
    },
    sectionTitle: {
        marginTop: 10,
        color: '#7c3aed',
        textAlign: 'center',
        fontSize: 21,
        lineHeight: 26,
        fontWeight: '800',
        letterSpacing: -0.2,
    },
    suggestionPanel: {
        marginTop: 6,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e9dfff',
        backgroundColor: '#f8f4ff',
        overflow: 'hidden',
    },
    suggestionRow: {
        minHeight: 40,
        paddingHorizontal: 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottomWidth: 1,
        borderBottomColor: '#efe9ff',
    },
    suggestionText: {
        color: '#3a2a6e',
        fontSize: 13,
        fontWeight: '600',
    },
    quickRow: {
        marginTop: 6,
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 6,
    },
    quickChip: {
        borderRadius: 999,
        borderWidth: 1,
        borderColor: '#dbcdfd',
        backgroundColor: '#f5efff',
        paddingHorizontal: 10,
        paddingVertical: 6,
    },
    quickChipText: {
        color: '#5b21b6',
        fontSize: 11,
        fontWeight: '700',
    },
    submitWrap: {
        marginTop: 14,
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
