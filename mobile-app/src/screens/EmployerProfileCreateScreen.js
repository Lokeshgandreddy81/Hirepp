import React, { useCallback, useContext, useMemo, useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Alert,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import client from '../api/client';
import { AuthContext } from '../context/AuthContext';
import { logger } from '../utils/logger';

const INDUSTRY_OPTIONS = [
    'Logistics',
    'Retail',
    'Hospitality',
    'Healthcare',
    'Technology',
    'Finance',
    'Staffing',
];
const LOCATION_OPTIONS = ['Hyderabad', 'Bengaluru', 'Mumbai', 'Delhi NCR', 'Chennai', 'Pune', 'Remote / Pan India'];
const COMPANY_TYPE_OPTIONS = ['Startup', 'SME', 'Enterprise', 'Agency'];
const HIRING_SIZE_OPTIONS = ['1-5 hires', '6-20 hires', '20+ hires'];
const COMPANY_NAME_OPTIONS = ['Acme Logistics', 'Nova Staffing', 'Swift Retail', 'Prime Hospitality', 'Apex Talent Labs'];

const normalizeToken = (value = '') => String(value || '').trim().toLowerCase();

const buildUniqueOptions = (entries = []) => [...new Set((Array.isArray(entries) ? entries : [])
    .map((entry) => String(entry || '').trim())
    .filter(Boolean))];

const buildTypeaheadSuggestions = (query = '', options = [], limit = 6) => {
    const normalizedQuery = normalizeToken(query);
    const safeOptions = buildUniqueOptions(options);
    if (!safeOptions.length) return [];
    if (!normalizedQuery) return safeOptions.slice(0, limit);

    const startsWith = safeOptions.filter((item) => normalizeToken(item).startsWith(normalizedQuery));
    const contains = safeOptions.filter((item) => (
        normalizeToken(item).includes(normalizedQuery) && !startsWith.includes(item)
    ));
    return [...startsWith, ...contains].slice(0, limit);
};

const inferCompanyPreset = (companyName = '') => {
    const normalized = normalizeToken(companyName);
    if (normalized.includes('logistics') || normalized.includes('delivery')) {
        return {
            industry: 'Logistics',
            tagline: 'Fast, reliable operations hiring across shifts.',
            hiringSize: '6-20 hires',
        };
    }
    if (normalized.includes('tech') || normalized.includes('software')) {
        return {
            industry: 'Technology',
            tagline: 'Product-led team hiring high-ownership talent.',
            hiringSize: '1-5 hires',
        };
    }
    if (normalized.includes('health')) {
        return {
            industry: 'Healthcare',
            tagline: 'Patient-first team hiring trained professionals.',
            hiringSize: '6-20 hires',
        };
    }
    return {
        industry: 'Staffing',
        tagline: 'Growing team hiring quality candidates quickly.',
        hiringSize: '1-5 hires',
    };
};

const TypeaheadInput = ({
    value = '',
    onChangeText,
    placeholder = '',
    suggestions = [],
    onSelectSuggestion,
    autoCapitalize = 'words',
}) => {
    const [focused, setFocused] = useState(false);
    const safeSuggestions = Array.isArray(suggestions) ? suggestions.filter(Boolean) : [];
    const showSuggestions = focused && safeSuggestions.length > 0;

    return (
        <View style={styles.typeaheadWrap}>
            <View style={[styles.inputWrap, focused && styles.inputWrapFocused]}>
                <TextInput
                    style={styles.input}
                    value={value}
                    placeholder={placeholder}
                    placeholderTextColor="#94a3b8"
                    autoCorrect={false}
                    autoCapitalize={autoCapitalize}
                    onChangeText={onChangeText}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setTimeout(() => setFocused(false), 100)}
                />
                <Ionicons name={showSuggestions ? 'chevron-up' : 'chevron-down'} size={14} color="#94a3b8" />
            </View>
            {showSuggestions ? (
                <View style={styles.typeaheadMenu}>
                    {safeSuggestions.map((item) => (
                        <TouchableOpacity
                            key={`suggest-${item}`}
                            style={styles.typeaheadOption}
                            activeOpacity={0.85}
                            onPress={() => {
                                onSelectSuggestion?.(item);
                                setFocused(false);
                            }}
                        >
                            <Text style={styles.typeaheadOptionText}>{item}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            ) : null}
        </View>
    );
};

export default function EmployerProfileCreateScreen() {
    const { updateUserInfo } = useContext(AuthContext);
    const [companyName, setCompanyName] = useState('');
    const [tagline, setTagline] = useState('');
    const [industry, setIndustry] = useState('');
    const [location, setLocation] = useState('');
    const [companyType, setCompanyType] = useState(COMPANY_TYPE_OPTIONS[0]);
    const [hiringSize, setHiringSize] = useState(HIRING_SIZE_OPTIONS[0]);
    const [loading, setLoading] = useState(false);
    const [aiLoading, setAiLoading] = useState(false);
    const [assistMessage, setAssistMessage] = useState('');
    const [errors, setErrors] = useState({});

    const companyNameTypeaheadOptions = useMemo(() => buildUniqueOptions([
        ...COMPANY_NAME_OPTIONS,
        companyName,
    ]), [companyName]);
    const industryTypeaheadOptions = useMemo(() => buildUniqueOptions([
        ...INDUSTRY_OPTIONS,
        industry,
    ]), [industry]);
    const locationTypeaheadOptions = useMemo(() => buildUniqueOptions([
        ...LOCATION_OPTIONS,
        location,
    ]), [location]);

    const handleAutoFill = useCallback(() => {
        const preset = inferCompanyPreset(companyName);
        setIndustry((prev) => String(prev || preset.industry).trim());
        setTagline((prev) => String(prev || preset.tagline).trim());
        setLocation((prev) => String(prev || LOCATION_OPTIONS[0]).trim());
        setHiringSize((prev) => String(prev || preset.hiringSize).trim());
        setAssistMessage('Smart defaults applied. You can edit everything before saving.');
    }, [companyName]);

    const handleAiAssist = useCallback(async () => {
        const company = String(companyName || '').trim();
        if (!company) {
            handleAutoFill();
            setAssistMessage('Added starter values. Enter company name for stronger AI suggestions.');
            return;
        }

        setAiLoading(true);
        setAssistMessage('');
        try {
            const { data } = await client.post('/api/features/ai/profile-suggestions', {
                roleName: company,
                context: 'employer_profile',
            }, {
                __skipApiErrorHandler: true,
                __allowWhenCircuitOpen: true,
            });

            const nextIndustry = String(data?.industry || '').trim();
            const nextCity = String(data?.city || '').trim();
            const nextTagline = String(data?.summary || '').trim();

            setIndustry((prev) => nextIndustry || prev || inferCompanyPreset(company).industry);
            setLocation((prev) => nextCity || prev || LOCATION_OPTIONS[0]);
            setTagline((prev) => nextTagline || prev || inferCompanyPreset(company).tagline);
            setAssistMessage('AI suggestions applied. Review and complete setup.');
        } catch (_error) {
            handleAutoFill();
            setAssistMessage('Network AI unavailable. Applied smart local suggestions.');
        } finally {
            setAiLoading(false);
        }
    }, [companyName, handleAutoFill]);

    const handleSave = async () => {
        const nextErrors = {};
        if (!String(companyName || '').trim()) nextErrors.companyName = 'Company name is required.';
        if (!String(location || '').trim()) nextErrors.location = 'Location is required.';
        if (Object.keys(nextErrors).length > 0) {
            setErrors(nextErrors);
            return;
        }

        setErrors({});
        setLoading(true);
        try {
            const updateData = {
                companyName: String(companyName).trim(),
                industry: String(industry || tagline || '').trim(),
                location: String(location).trim(),
                companyType: String(companyType || '').trim(),
                hiringIntent: String(hiringSize || '').trim(),
                companyTagline: String(tagline || '').trim(),
            };

            await client.put('/api/users/profile', updateData, {
                __skipApiErrorHandler: true,
                __allowWhenCircuitOpen: true,
            });

            await updateUserInfo({
                hasCompletedProfile: true,
                profileComplete: true,
            });
            Alert.alert('Success', 'Recruiter profile updated.');
        } catch (error) {
            logger.error('Employer profile save error:', error);
            Alert.alert('Error', error?.response?.data?.message || 'Failed to save recruiter profile.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                <ScrollView
                    contentContainerStyle={styles.content}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.heroCard}>
                        <View style={styles.heroIcon}>
                            <Ionicons name="briefcase-outline" size={22} color="#6d28d9" />
                        </View>
                        <Text style={styles.title}>Recruiter Setup</Text>
                        <Text style={styles.subtitle}>Simple profile, stronger candidate quality.</Text>
                        <View style={styles.assistRow}>
                            <TouchableOpacity
                                style={styles.primaryAssistButton}
                                onPress={handleAiAssist}
                                activeOpacity={0.85}
                                disabled={aiLoading}
                            >
                                <Text style={styles.primaryAssistButtonText}>
                                    {aiLoading ? 'Thinking...' : 'AI Assist'}
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.secondaryAssistButton}
                                onPress={handleAutoFill}
                                activeOpacity={0.85}
                            >
                                <Text style={styles.secondaryAssistButtonText}>Auto-fill</Text>
                            </TouchableOpacity>
                        </View>
                        {String(assistMessage || '').trim() ? (
                            <Text style={styles.assistMessage}>{assistMessage}</Text>
                        ) : null}
                    </View>

                    <View style={styles.formCard}>
                        <Text style={styles.label}>Company Name *</Text>
                        <TypeaheadInput
                            value={companyName}
                            onChangeText={(value) => {
                                setCompanyName(value);
                                if (errors.companyName) setErrors((prev) => ({ ...prev, companyName: null }));
                            }}
                            placeholder="e.g. Acme Logistics"
                            suggestions={buildTypeaheadSuggestions(companyName, companyNameTypeaheadOptions, 5)}
                            onSelectSuggestion={(value) => {
                                setCompanyName(value);
                                if (errors.companyName) setErrors((prev) => ({ ...prev, companyName: null }));
                            }}
                        />
                        {errors.companyName ? <Text style={styles.errorText}>{errors.companyName}</Text> : null}

                        <Text style={styles.label}>Industry</Text>
                        <TypeaheadInput
                            value={industry}
                            onChangeText={setIndustry}
                            placeholder="Choose industry"
                            suggestions={buildTypeaheadSuggestions(industry, industryTypeaheadOptions, 6)}
                            onSelectSuggestion={setIndustry}
                        />
                        <View style={styles.pillsRow}>
                            {INDUSTRY_OPTIONS.map((item) => (
                                <TouchableOpacity
                                    key={item}
                                    style={[styles.pill, normalizeToken(industry) === normalizeToken(item) ? styles.pillActive : null]}
                                    onPress={() => setIndustry(item)}
                                    activeOpacity={0.85}
                                >
                                    <Text style={[styles.pillText, normalizeToken(industry) === normalizeToken(item) ? styles.pillTextActive : null]}>
                                        {item}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={styles.label}>Company Tagline</Text>
                        <View style={styles.inputWrap}>
                            <TextInput
                                style={styles.input}
                                placeholder="One-line value proposition"
                                placeholderTextColor="#94a3b8"
                                value={tagline}
                                onChangeText={setTagline}
                            />
                        </View>

                        <Text style={styles.label}>Hiring Location *</Text>
                        <TypeaheadInput
                            value={location}
                            onChangeText={(value) => {
                                setLocation(value);
                                if (errors.location) setErrors((prev) => ({ ...prev, location: null }));
                            }}
                            placeholder="City or remote"
                            suggestions={buildTypeaheadSuggestions(location, locationTypeaheadOptions, 6)}
                            onSelectSuggestion={(value) => {
                                setLocation(value);
                                if (errors.location) setErrors((prev) => ({ ...prev, location: null }));
                            }}
                        />
                        {errors.location ? <Text style={styles.errorText}>{errors.location}</Text> : null}

                        <Text style={styles.label}>Company Type</Text>
                        <View style={styles.pillsRow}>
                            {COMPANY_TYPE_OPTIONS.map((item) => (
                                <TouchableOpacity
                                    key={item}
                                    style={[styles.pill, companyType === item ? styles.pillActive : null]}
                                    onPress={() => setCompanyType(item)}
                                    activeOpacity={0.85}
                                >
                                    <Text style={[styles.pillText, companyType === item ? styles.pillTextActive : null]}>
                                        {item}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={styles.label}>Hiring Volume</Text>
                        <View style={styles.pillsRow}>
                            {HIRING_SIZE_OPTIONS.map((item) => (
                                <TouchableOpacity
                                    key={item}
                                    style={[styles.pill, hiringSize === item ? styles.pillActive : null]}
                                    onPress={() => setHiringSize(item)}
                                    activeOpacity={0.85}
                                >
                                    <Text style={[styles.pillText, hiringSize === item ? styles.pillTextActive : null]}>
                                        {item}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    <TouchableOpacity
                        style={[styles.saveButton, loading ? styles.saveButtonDisabled : null]}
                        onPress={handleSave}
                        disabled={loading}
                        activeOpacity={0.9}
                    >
                        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>Complete Setup</Text>}
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f7f2ff' },
    content: { padding: 18, paddingBottom: 28 },
    heroCard: {
        borderRadius: 18,
        borderWidth: 1,
        borderColor: '#e9d5ff',
        backgroundColor: '#ffffff',
        padding: 16,
        marginBottom: 14,
    },
    heroIcon: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: '#f3e8ff',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
    },
    title: { fontSize: 22, fontWeight: '800', color: '#1f2937', marginBottom: 4 },
    subtitle: { fontSize: 13, color: '#64748b', marginBottom: 12 },
    assistRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
    primaryAssistButton: {
        borderRadius: 10,
        backgroundColor: '#7c3aed',
        paddingHorizontal: 12,
        paddingVertical: 9,
    },
    primaryAssistButtonText: { color: '#ffffff', fontSize: 12, fontWeight: '800' },
    secondaryAssistButton: {
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#d8b4fe',
        backgroundColor: '#ffffff',
        paddingHorizontal: 12,
        paddingVertical: 9,
    },
    secondaryAssistButtonText: { color: '#6d28d9', fontSize: 12, fontWeight: '800' },
    assistMessage: { fontSize: 11, color: '#6d28d9', fontWeight: '600' },
    formCard: {
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#e9d5ff',
        backgroundColor: '#ffffff',
        padding: 14,
        marginBottom: 16,
    },
    label: {
        fontSize: 11,
        fontWeight: '800',
        color: '#6b7280',
        textTransform: 'uppercase',
        letterSpacing: 0.7,
        marginBottom: 8,
        marginTop: 8,
    },
    typeaheadWrap: { position: 'relative', zIndex: 20 },
    inputWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#ddd6fe',
        borderRadius: 12,
        paddingHorizontal: 14,
        backgroundColor: '#faf5ff',
        minHeight: 48,
    },
    inputWrapFocused: {
        borderColor: '#a78bfa',
        backgroundColor: '#ffffff',
    },
    input: {
        flex: 1,
        fontSize: 15,
        color: '#0f172a',
        paddingVertical: 12,
        fontWeight: '500',
    },
    typeaheadMenu: {
        position: 'absolute',
        top: 50,
        left: 0,
        right: 0,
        borderWidth: 1,
        borderColor: '#ddd6fe',
        borderRadius: 10,
        backgroundColor: '#ffffff',
        zIndex: 50,
        shadowColor: '#7c3aed',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
        elevation: 3,
    },
    typeaheadOption: { paddingHorizontal: 12, paddingVertical: 10 },
    typeaheadOptionText: { fontSize: 13, color: '#4c1d95', fontWeight: '600' },
    pillsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 8,
    },
    pill: {
        borderRadius: 999,
        borderWidth: 1,
        borderColor: '#ddd6fe',
        backgroundColor: '#ffffff',
        paddingHorizontal: 10,
        paddingVertical: 7,
    },
    pillActive: {
        borderColor: '#7c3aed',
        backgroundColor: '#f5f3ff',
    },
    pillText: { fontSize: 11, fontWeight: '700', color: '#475569' },
    pillTextActive: { color: '#6d28d9' },
    errorText: { color: '#dc2626', fontSize: 11, marginTop: 6 },
    saveButton: {
        backgroundColor: '#7c3aed',
        borderRadius: 12,
        minHeight: 50,
        alignItems: 'center',
        justifyContent: 'center',
    },
    saveButtonDisabled: { opacity: 0.7 },
    saveButtonText: { color: '#ffffff', fontSize: 15, fontWeight: '800' },
});
