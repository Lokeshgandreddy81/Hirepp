import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Image,
    KeyboardAvoidingView,
    LayoutAnimation,
    Platform,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    UIManager,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Localization from 'expo-localization';
import client from '../api/client';
import { AuthContext } from '../context/AuthContext';

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const WORKER_SKILL_SUGGESTIONS = [
    'Customer support',
    'Warehouse safety',
    'POS billing',
    'Inventory',
    'Driving',
    'Food handling',
    'Electrical troubleshooting',
    'Pipe fitting',
    'Welding basics',
    'Machine handling',
];
const WORKER_ROLE_TYPES = [
    'Student',
    'Fresher',
    'Delivery / Logistics',
    'Skilled Trades',
    'Construction / Civil',
    'Manufacturing / Factory',
    'Retail / Hospitality',
    'Healthcare / Care',
    'Security / Facility',
    'Software / Tech',
    'Finance / Admin',
    'Sales / Marketing',
    'Support / Service',
    'Other',
];
const PRIORITY_WORKER_ROLE_TYPES = [
    'Fresher',
    'Delivery / Logistics',
    'Skilled Trades',
    'Retail / Hospitality',
    'Software / Tech',
    'Support / Service',
];
const WORKER_ROLE_TEMPLATES = {
    Student: {
        roleNames: ['Intern', 'Campus Trainee', 'Lab Assistant', 'Part-time Associate'],
        skills: ['Communication', 'Basic computer use', 'Teamwork', 'Documentation'],
    },
    Fresher: {
        roleNames: ['Junior Associate', 'Trainee', 'Assistant', 'Data Entry Operator'],
        skills: ['Documentation', 'Customer handling', 'Problem solving', 'Follow-through'],
    },
    'Delivery / Logistics': {
        roleNames: ['Delivery Executive', 'Warehouse Associate', 'Inventory Assistant', 'Dispatch Coordinator', 'Fleet Associate'],
        skills: ['Delivery support', 'Inventory checks', 'Packing', 'Route knowledge', 'Scanner usage'],
    },
    'Skilled Trades': {
        roleNames: ['Plumber', 'Electrician', 'Carpenter', 'Welder', 'HVAC Technician'],
        skills: ['Troubleshooting', 'Repair work', 'Installation', 'Safety compliance', 'Tool handling'],
    },
    'Construction / Civil': {
        roleNames: ['Site Supervisor', 'Civil Technician', 'Mason', 'Bar Bender', 'Survey Assistant'],
        skills: ['Blueprint reading', 'Site safety', 'Concrete work', 'Material planning'],
    },
    'Manufacturing / Factory': {
        roleNames: ['Machine Operator', 'Production Associate', 'Quality Inspector', 'Assembly Technician'],
        skills: ['Machine handling', 'Quality checks', 'SOP compliance', 'Line discipline'],
    },
    'Retail / Hospitality': {
        roleNames: ['Retail Associate', 'Cashier', 'Store Supervisor', 'Steward', 'Barista'],
        skills: ['POS billing', 'Customer interaction', 'Stock handling', 'Service etiquette'],
    },
    'Healthcare / Care': {
        roleNames: ['Nursing Assistant', 'Patient Care Assistant', 'Pharmacy Assistant', 'Lab Technician'],
        skills: ['Patient support', 'Hygiene protocol', 'Record handling', 'Vitals support'],
    },
    'Security / Facility': {
        roleNames: ['Security Guard', 'CCTV Operator', 'Facility Executive', 'Housekeeping Supervisor'],
        skills: ['Access control', 'Incident reporting', 'Patrolling', 'Emergency response'],
    },
    'Software / Tech': {
        roleNames: ['Frontend Developer', 'Backend Developer', 'QA Engineer', 'DevOps Engineer', 'Data Analyst'],
        skills: ['JavaScript', 'React', 'Node.js', 'Testing', 'SQL'],
    },
    'Finance / Admin': {
        roleNames: ['Account Assistant', 'MIS Executive', 'Back Office Executive', 'Office Administrator'],
        skills: ['Excel', 'Data validation', 'Documentation', 'Payroll support'],
    },
    'Sales / Marketing': {
        roleNames: ['Sales Executive', 'Field Sales Associate', 'Inside Sales Executive', 'Marketing Associate'],
        skills: ['Lead generation', 'Client communication', 'Negotiation', 'CRM updates'],
    },
    'Support / Service': {
        roleNames: ['Customer Support Executive', 'Service Coordinator', 'Operations Associate', 'Helpdesk Executive'],
        skills: ['Ticket handling', 'Escalation handling', 'Communication', 'SLA adherence'],
    },
    Other: {
        roleNames: [],
        skills: [],
    },
};
const EXPERIENCE_OPTIONS = [0, 1, 2, 3, 5, 8, 10];
const WORKER_CITY_OPTIONS = ['Hyderabad', 'Bengaluru', 'Mumbai', 'Delhi NCR', 'Chennai', 'Pune'];
const WORKER_LANGUAGE_OPTIONS = ['English', 'Hindi', 'Telugu', 'Tamil', 'Kannada'];
const WORKER_SALARY_OPTIONS = [15000, 20000, 25000, 30000, 40000, 50000, 65000];
const PRIORITY_WORKER_CITIES = ['Hyderabad', 'Bengaluru', 'Mumbai', 'Delhi NCR'];
const PRIORITY_WORKER_LANGUAGES = ['English', 'Hindi', 'Telugu'];
const PRIORITY_WORKER_SALARY_OPTIONS = [20000, 25000, 30000, 40000];
const EMPLOYER_INDUSTRY_OPTIONS = [
    'Logistics',
    'Construction',
    'Manufacturing',
    'Retail',
    'Hospitality',
    'Healthcare',
    'Security Services',
    'Technology',
    'Finance',
    'Staffing',
];
const EMPLOYER_LOCATION_OPTIONS = ['Hyderabad', 'Bengaluru', 'Mumbai', 'Delhi NCR', 'Chennai', 'Pune', 'Remote / Pan India'];
const AVAILABILITY_OPTIONS = [
    { label: 'Immediate', value: 0 },
    { label: '15 days', value: 15 },
    { label: '30 days', value: 30 },
];
const SHIFT_OPTIONS = ['Day', 'Night', 'Flexible'];

const splitName = (fullName = '') => {
    const segments = String(fullName || '').trim().split(/\s+/).filter(Boolean);
    if (!segments.length) return { firstName: '', lastName: '' };
    return {
        firstName: segments[0],
        lastName: segments.slice(1).join(' '),
    };
};

const normalizeSkills = (value = '') => (
    String(value || '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 25)
);

const normalizeToken = (value = '') => String(value || '').trim().toLowerCase();

const buildTypeaheadSuggestions = (query = '', options = [], limit = 6) => {
    const normalizedQuery = normalizeToken(query);
    const safeOptions = [...new Set((Array.isArray(options) ? options : []).map((item) => String(item || '').trim()).filter(Boolean))];
    if (!safeOptions.length) return [];
    if (!normalizedQuery) return safeOptions.slice(0, limit);

    const startsWith = safeOptions.filter((item) => normalizeToken(item).startsWith(normalizedQuery));
    const contains = safeOptions.filter((item) => {
        const normalized = normalizeToken(item);
        return normalized.includes(normalizedQuery) && !startsWith.includes(item);
    });
    return [...startsWith, ...contains].slice(0, limit);
};

const focusChoices = (options = [], selected = [], limit = 6) => {
    const normalized = [...new Set((Array.isArray(options) ? options : []).filter(Boolean))];
    if (normalized.length <= limit) return normalized;
    const selectedSet = new Set((Array.isArray(selected) ? selected : [selected]).map(normalizeToken).filter(Boolean));
    const selectedItems = normalized.filter((item) => selectedSet.has(normalizeToken(item)));
    const topItems = normalized.slice(0, limit);
    return [...new Set([...selectedItems, ...topItems])];
};

const inferRoleCategory = (roleName = '') => {
    const normalizedRole = normalizeToken(roleName);
    if (!normalizedRole) return '';
    return WORKER_ROLE_TYPES.find((category) => (
        (WORKER_ROLE_TEMPLATES[category]?.roleNames || []).some((item) => normalizeToken(item) === normalizedRole)
    )) || '';
};

const toggleSkillToken = (currentSkillsText = '', skill = '') => {
    const token = String(skill || '').trim();
    if (!token) return currentSkillsText;
    const existing = normalizeSkills(currentSkillsText);
    const exists = existing.some((item) => normalizeToken(item) === normalizeToken(token));
    const next = exists
        ? existing.filter((item) => normalizeToken(item) !== normalizeToken(token))
        : [...existing, token];
    return next.join(', ');
};

const mapLanguageToLabel = (value = '') => {
    const normalized = normalizeToken(value);
    if (!normalized) return 'English';
    if (normalized === 'en') return 'English';
    if (normalized === 'hi') return 'Hindi';
    if (normalized === 'te') return 'Telugu';
    if (normalized === 'ta') return 'Tamil';
    if (normalized === 'kn') return 'Kannada';
    return String(value || '').trim();
};

const readCompletionStep = (completion = {}, stepId = '') => {
    const steps = Array.isArray(completion?.steps) ? completion.steps : [];
    return steps.find((step) => String(step.id || '') === stepId) || null;
};

const Pill = ({ label, active, onPress }) => (
    <TouchableOpacity
        style={[styles.pill, active && styles.pillActive]}
        onPress={onPress}
        activeOpacity={0.85}
    >
        <Text style={[styles.pillLabel, active && styles.pillLabelActive]}>{label}</Text>
    </TouchableOpacity>
);

const TypeaheadInput = ({
    value = '',
    onChangeText,
    placeholder = '',
    suggestions = [],
    onSelectSuggestion,
    keyboardType = 'default',
    autoCapitalize = 'words',
    textContentType,
    returnKeyType = 'done',
}) => {
    const [isFocused, setIsFocused] = useState(false);
    const safeSuggestions = Array.isArray(suggestions) ? suggestions.filter(Boolean) : [];
    const showSuggestions = isFocused && safeSuggestions.length > 0;

    return (
        <View style={styles.typeaheadWrap}>
            <View style={[styles.inputShell, isFocused && styles.inputShellFocused]}>
                <TextInput
                    value={value}
                    onChangeText={onChangeText}
                    style={styles.inputField}
                    placeholder={placeholder}
                    placeholderTextColor="#64748b"
                    keyboardType={keyboardType}
                    autoCapitalize={autoCapitalize}
                    autoCorrect={false}
                    textContentType={textContentType}
                    returnKeyType={returnKeyType}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setTimeout(() => setIsFocused(false), 120)}
                />
                <Ionicons
                    name={showSuggestions ? 'chevron-up' : 'chevron-down'}
                    size={15}
                    color="#6b7280"
                    style={styles.inputChevron}
                />
            </View>

            {showSuggestions ? (
                <View style={styles.typeaheadMenu}>
                    {safeSuggestions.map((item) => (
                        <TouchableOpacity
                            key={`suggestion-${item}`}
                            style={styles.typeaheadOption}
                            activeOpacity={0.8}
                            onPress={() => {
                                onSelectSuggestion?.(item);
                                setIsFocused(false);
                            }}
                        >
                            <Ionicons name="sparkles-outline" size={13} color="#7c3aed" />
                            <Text style={styles.typeaheadOptionText}>{item}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            ) : null}
        </View>
    );
};

const DropdownField = ({
    placeholder = 'Select an option',
    valueLabel = '',
    selectedValue = '',
    options = [],
    onSelect,
}) => {
    const [open, setOpen] = useState(false);
    const safeOptions = Array.isArray(options) ? options.filter(Boolean) : [];

    return (
        <View style={styles.dropdownWrap}>
            <TouchableOpacity
                style={[styles.dropdownTrigger, open && styles.dropdownTriggerOpen]}
                activeOpacity={0.85}
                onPress={() => setOpen((prev) => !prev)}
            >
                <Text
                    style={[
                        styles.dropdownTriggerText,
                        !String(valueLabel || '').trim() && styles.dropdownPlaceholderText,
                    ]}
                    numberOfLines={1}
                >
                    {String(valueLabel || '').trim() || placeholder}
                </Text>
                <Text style={styles.dropdownChevron}>{open ? '▲' : '▼'}</Text>
            </TouchableOpacity>

            {open ? (
                <View style={styles.dropdownMenu}>
                    {safeOptions.map((option) => {
                        const optionLabel = String(option?.label || option?.value || '').trim();
                        const optionValue = option?.value;
                        const active = normalizeToken(optionValue) === normalizeToken(selectedValue);
                        return (
                            <TouchableOpacity
                                key={`dropdown-option-${optionLabel}-${String(optionValue || '')}`}
                                style={[styles.dropdownOption, active && styles.dropdownOptionActive]}
                                activeOpacity={0.82}
                                onPress={() => {
                                    setOpen(false);
                                    onSelect?.(optionValue);
                                }}
                            >
                                <Text style={[styles.dropdownOptionText, active && styles.dropdownOptionTextActive]}>
                                    {optionLabel}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            ) : null}
        </View>
    );
};

export default function ProfileSetupWizardScreen({ onCompleted }) {
    const insets = useSafeAreaInsets();
    const { userInfo, updateUserInfo } = useContext(AuthContext);
    const [bootLoading, setBootLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [aiAssistLoading, setAiAssistLoading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [errorText, setErrorText] = useState('');
    const [completion, setCompletion] = useState(null);
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [showAllRoleTypes, setShowAllRoleTypes] = useState(false);
    const [showAllRoleTitles, setShowAllRoleTitles] = useState(false);
    const [showAllSkills, setShowAllSkills] = useState(false);
    const [showAllCities, setShowAllCities] = useState(false);
    const [showAllLanguages, setShowAllLanguages] = useState(false);
    const [showAllSalaryBands, setShowAllSalaryBands] = useState(false);
    const [showAllEmployerLocations, setShowAllEmployerLocations] = useState(false);
    const [showAllIndustries, setShowAllIndustries] = useState(false);
    const [showCustomRoleInput, setShowCustomRoleInput] = useState(false);
    const [showCustomCityInput, setShowCustomCityInput] = useState(false);
    const [showCustomLanguageInput, setShowCustomLanguageInput] = useState(false);
    const [showCustomSalaryInput, setShowCustomSalaryInput] = useState(false);
    const [showCustomSkillInput, setShowCustomSkillInput] = useState(false);
    const [showCustomEmployerLocationInput, setShowCustomEmployerLocationInput] = useState(false);
    const [showCustomIndustryInput, setShowCustomIndustryInput] = useState(false);
    const [customSkillInput, setCustomSkillInput] = useState('');
    const [form, setForm] = useState({
        avatarUrl: '',
        fullName: '',
        city: '',
        language: 'English',
        skillsText: '',
        experienceInRole: 0,
        expectedSalary: '',
        preferredShift: 'Flexible',
        availabilityWindowDays: 0,
        openToRelocation: false,
        openToNightShift: false,
        roleName: '',
        roleCategory: '',
        companyName: '',
        companyDescription: '',
        industry: '',
        contactPerson: '',
        companyLocation: '',
    });

    const isEmployer = useMemo(() => {
        const activeRole = String(userInfo?.activeRole || userInfo?.primaryRole || '').toLowerCase();
        return activeRole === 'employer' || activeRole === 'recruiter';
    }, [userInfo?.activeRole, userInfo?.primaryRole]);

    const workerTemplate = useMemo(
        () => WORKER_ROLE_TEMPLATES[form.roleCategory] || WORKER_ROLE_TEMPLATES.Other,
        [form.roleCategory]
    );
    const selectedWorkerSkills = useMemo(() => normalizeSkills(form.skillsText), [form.skillsText]);
    const workerRoleTypeOptions = useMemo(
        () => [...new Set([...PRIORITY_WORKER_ROLE_TYPES, ...WORKER_ROLE_TYPES])],
        []
    );
    const workerRoleTitleOptions = useMemo(
        () => [...new Set([...(workerTemplate.roleNames || []), ...(WORKER_ROLE_TEMPLATES.Other.roleNames || [])])],
        [workerTemplate.roleNames]
    );
    const workerSkillOptions = useMemo(
        () => [...new Set([...(workerTemplate.skills || []), ...WORKER_SKILL_SUGGESTIONS])],
        [workerTemplate.skills]
    );
    const visibleWorkerRoleTypes = useMemo(
        () => (showAllRoleTypes ? WORKER_ROLE_TYPES : focusChoices(workerRoleTypeOptions, [form.roleCategory], 6)),
        [form.roleCategory, showAllRoleTypes, workerRoleTypeOptions]
    );
    const visibleWorkerRoleTitles = useMemo(
        () => (showAllRoleTitles ? workerRoleTitleOptions : focusChoices(workerRoleTitleOptions, [form.roleName], 5)),
        [form.roleName, showAllRoleTitles, workerRoleTitleOptions]
    );
    const visibleWorkerSkills = useMemo(
        () => (showAllSkills ? workerSkillOptions : focusChoices(workerSkillOptions, selectedWorkerSkills, 8)),
        [selectedWorkerSkills, showAllSkills, workerSkillOptions]
    );
    const visibleWorkerCities = useMemo(
        () => (showAllCities ? WORKER_CITY_OPTIONS : focusChoices([...PRIORITY_WORKER_CITIES, ...WORKER_CITY_OPTIONS], [form.city], 4)),
        [form.city, showAllCities]
    );
    const visibleWorkerLanguages = useMemo(
        () => (showAllLanguages ? WORKER_LANGUAGE_OPTIONS : focusChoices([...PRIORITY_WORKER_LANGUAGES, ...WORKER_LANGUAGE_OPTIONS], [form.language], 3)),
        [form.language, showAllLanguages]
    );
    const visibleWorkerSalaryOptions = useMemo(
        () => (showAllSalaryBands ? WORKER_SALARY_OPTIONS : focusChoices([...PRIORITY_WORKER_SALARY_OPTIONS, ...WORKER_SALARY_OPTIONS], [Number(form.expectedSalary || 0)], 4)),
        [form.expectedSalary, showAllSalaryBands]
    );
    const workerCityTypeaheadOptions = useMemo(
        () => buildTypeaheadSuggestions(form.city, WORKER_CITY_OPTIONS, 8),
        [form.city]
    );
    const workerLanguageTypeaheadOptions = useMemo(
        () => buildTypeaheadSuggestions(form.language, WORKER_LANGUAGE_OPTIONS, 6),
        [form.language]
    );
    const workerRoleTitleTypeaheadOptions = useMemo(
        () => buildTypeaheadSuggestions(form.roleName, workerRoleTitleOptions, 8),
        [form.roleName, workerRoleTitleOptions]
    );
    const workerSkillTypeaheadOptions = useMemo(
        () => buildTypeaheadSuggestions(customSkillInput, workerSkillOptions, 8),
        [customSkillInput, workerSkillOptions]
    );
    const workerRoleTypeDropdownOptions = useMemo(
        () => WORKER_ROLE_TYPES.map((item) => ({ label: item, value: item })),
        []
    );
    const workerExperienceDropdownOptions = useMemo(
        () => EXPERIENCE_OPTIONS.map((option) => ({
            label: `${option} year${option === 1 ? '' : 's'}`,
            value: option,
        })),
        []
    );
    const workerSalaryDropdownOptions = useMemo(
        () => WORKER_SALARY_OPTIONS.map((option) => ({
            label: `₹${Number(option || 0).toLocaleString('en-IN')} / month`,
            value: option,
        })),
        []
    );
    const workerShiftDropdownOptions = useMemo(
        () => SHIFT_OPTIONS.map((item) => ({ label: item, value: item })),
        []
    );
    const employerLocationOptions = useMemo(
        () => [...new Set([String(form.companyLocation || '').trim(), ...EMPLOYER_LOCATION_OPTIONS].filter(Boolean))],
        [form.companyLocation]
    );
    const visibleEmployerLocations = useMemo(
        () => (showAllEmployerLocations ? employerLocationOptions : focusChoices(employerLocationOptions, [form.companyLocation], 4)),
        [employerLocationOptions, form.companyLocation, showAllEmployerLocations]
    );
    const visibleIndustryOptions = useMemo(
        () => (showAllIndustries ? EMPLOYER_INDUSTRY_OPTIONS : focusChoices(EMPLOYER_INDUSTRY_OPTIONS, [form.industry], 5)),
        [form.industry, showAllIndustries]
    );
    const employerLocationTypeaheadOptions = useMemo(
        () => buildTypeaheadSuggestions(form.companyLocation, employerLocationOptions, 8),
        [employerLocationOptions, form.companyLocation]
    );
    const employerIndustryTypeaheadOptions = useMemo(
        () => buildTypeaheadSuggestions(form.industry, EMPLOYER_INDUSTRY_OPTIONS, 7),
        [form.industry]
    );

    const verificationComplete = Boolean(readCompletionStep(completion, 'verified_contact')?.complete);

    const steps = useMemo(() => {
        if (isEmployer) {
            return [
                { id: 'company_name', title: 'Company name' },
                { id: 'company_logo', title: 'Company logo' },
                { id: 'company_description', title: 'Description' },
                { id: 'industry', title: 'Industry' },
                { id: 'contact_person', title: 'Contact info' },
                { id: 'verified_contact', title: 'Verification' },
            ];
        }

        return [
            { id: 'profile_picture', title: 'Profile picture' },
            { id: 'basic_info', title: 'Basic info' },
            { id: 'work_info', title: 'Work info' },
            { id: 'availability', title: 'Availability' },
        ];
    }, [isEmployer]);

    const currentStep = steps[currentStepIndex] || steps[0];

    const refreshCompletion = useCallback(async () => {
        const { data } = await client.get('/api/users/profile-completion', {
            params: {
                role: isEmployer ? 'employer' : 'worker',
            },
        });
        const nextCompletion = data?.completion || null;
        if (nextCompletion) {
            setCompletion(nextCompletion);
            const nextMissing = Array.isArray(nextCompletion?.missingRequiredFields)
                ? nextCompletion.missingRequiredFields[0]
                : null;
            if (nextMissing) {
                const index = steps.findIndex((step) => step.id === nextMissing || step.id === 'basic_info' && nextMissing === 'full_name');
                if (index >= 0) {
                    setCurrentStepIndex(index);
                }
            }
        }
        return nextCompletion;
    }, [isEmployer, steps]);

    const bootstrap = useCallback(async () => {
        setBootLoading(true);
        setErrorText('');
        try {
            const [profileRes, completionRes] = await Promise.all([
                client.get('/api/users/profile', {
                    params: {
                        role: isEmployer ? 'employer' : 'worker',
                    },
                }).catch(() => ({ data: {} })),
                client.get('/api/users/profile-completion', {
                    params: {
                        role: isEmployer ? 'employer' : 'worker',
                    },
                }).catch(() => ({ data: {} })),
            ]);

            const profile = profileRes?.data?.profile || {};
            const roleProfile = Array.isArray(profile?.roleProfiles) ? (profile.roleProfiles[0] || {}) : {};
            const employerName = String(profile?.contactPerson || userInfo?.name || '').trim();
            const localeRegion = String(Localization.region || '').trim();

            setForm({
                avatarUrl: String(profile?.avatar || profile?.logoUrl || '').trim(),
                fullName: String(
                    [profile?.firstName, profile?.lastName].filter(Boolean).join(' ')
                    || userInfo?.name
                    || ''
                ).trim(),
                city: String(profile?.city || userInfo?.city || '').trim(),
                language: mapLanguageToLabel(String(profile?.language || userInfo?.languageCode || 'English').trim()),
                skillsText: Array.isArray(roleProfile?.skills) ? roleProfile.skills.join(', ') : '',
                experienceInRole: Number(roleProfile?.experienceInRole || profile?.totalExperience || 0) || 0,
                expectedSalary: String(roleProfile?.expectedSalary || ''),
                preferredShift: SHIFT_OPTIONS.includes(String(profile?.preferredShift || ''))
                    ? String(profile.preferredShift)
                    : 'Flexible',
                availabilityWindowDays: [0, 15, 30].includes(Number(profile?.availabilityWindowDays))
                    ? Number(profile.availabilityWindowDays)
                    : 0,
                openToRelocation: Boolean(profile?.openToRelocation),
                openToNightShift: Boolean(profile?.openToNightShift),
                roleName: String(roleProfile?.roleName || '').trim(),
                roleCategory: inferRoleCategory(String(roleProfile?.roleName || '').trim()),
                companyName: String(profile?.companyName || '').trim(),
                companyDescription: String(profile?.description || '').trim(),
                industry: String(profile?.industry || '').trim(),
                contactPerson: employerName,
                companyLocation: String(profile?.location || userInfo?.city || localeRegion || '').trim(),
            });

            const incomingCompletion = completionRes?.data?.completion || profileRes?.data?.profileCompletion || null;
            setCompletion(incomingCompletion);
        } catch (error) {
            setErrorText(error?.response?.data?.message || 'Could not load profile setup.');
        } finally {
            setBootLoading(false);
        }
    }, [isEmployer, userInfo?.city, userInfo?.languageCode, userInfo?.name]);

    useEffect(() => {
        bootstrap();
    }, [bootstrap]);

    useEffect(() => {
        if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
            UIManager.setLayoutAnimationEnabledExperimental(true);
        }
    }, []);

    const uploadAvatar = useCallback(async (uri, mimeType = 'image/jpeg') => {
        const fileName = uri.split('/').pop() || `avatar-${Date.now()}.jpg`;
        const payload = new FormData();
        payload.append('avatar', {
            uri,
            name: fileName,
            type: mimeType,
        });

        setUploadingAvatar(true);
        setUploadProgress(0);
        try {
            const { data } = await client.post('/api/settings/avatar', payload, {
                headers: { 'Content-Type': 'multipart/form-data' },
                onUploadProgress: (event) => {
                    if (!event?.total) return;
                    const pct = Math.round((event.loaded / event.total) * 100);
                    setUploadProgress(Math.max(0, Math.min(100, pct)));
                },
            });
            const avatarUrl = String(data?.avatarUrl || uri).trim();
            const nextCompletion = data?.profileCompletion || completion;
            setForm((prev) => ({ ...prev, avatarUrl }));
            if (nextCompletion) {
                setCompletion(nextCompletion);
            }
            await updateUserInfo?.({ avatar: avatarUrl });
            return avatarUrl;
        } finally {
            setUploadingAvatar(false);
            setUploadProgress(0);
        }
    }, [completion, updateUserInfo]);

    const pickAvatar = useCallback(async () => {
        setErrorText('');
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission?.granted) {
            setErrorText('Photo permission is required to upload a profile image.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.7,
        });
        if (result.canceled || !result.assets?.length) return;

        const asset = result.assets[0];
        if (Number(asset?.fileSize || 0) > MAX_AVATAR_BYTES) {
            setErrorText('Image must be 5MB or less.');
            return;
        }

        try {
            await uploadAvatar(asset.uri, asset.mimeType || 'image/jpeg');
        } catch (error) {
            setErrorText(error?.response?.data?.message || 'Avatar upload failed.');
        }
    }, [uploadAvatar]);

    const persistProfile = useCallback(async (payload) => {
        const { data } = await client.put('/api/users/profile', payload);
        const nextCompletion = data?.profileCompletion || null;
        if (nextCompletion) setCompletion(nextCompletion);
        return nextCompletion;
    }, []);

    const handleAiProfileAssist = useCallback(async () => {
        const roleName = String(form.roleName || '').trim();
        const roleCategory = String(form.roleCategory || '').trim();
        if (!roleCategory && !roleName) {
            setErrorText('Select role type/title first, then use AI assist.');
            return;
        }

        setErrorText('');
        setAiAssistLoading(true);
        try {
            const { data } = await client.post('/api/features/ai/profile-suggestions', {
                roleName,
                roleCategory,
                context: isEmployer ? 'employer_profile' : 'worker_profile',
            }, {
                __skipApiErrorHandler: true,
                __allowWhenCircuitOpen: true,
            });

            const aiSkills = Array.isArray(data?.skills)
                ? data.skills
                    .map((entry) => String(entry || '').trim())
                    .filter(Boolean)
                    .slice(0, 12)
                : [];
            const salaryHint = Number(data?.salaryHint || 0);
            const preferredShift = SHIFT_OPTIONS.includes(String(data?.preferredShift || ''))
                ? String(data.preferredShift)
                : null;

            setForm((prev) => {
                const existingSkills = normalizeSkills(prev.skillsText);
                const mergedSkills = [...new Set([...existingSkills, ...aiSkills])].slice(0, 25);
                return {
                    ...prev,
                    skillsText: mergedSkills.join(', '),
                    expectedSalary: Number.isFinite(salaryHint) && salaryHint > 0
                        ? String(Math.round(salaryHint))
                        : prev.expectedSalary,
                    preferredShift: preferredShift || prev.preferredShift,
                };
            });
        } catch (_error) {
            setErrorText('AI suggestions unavailable right now. Continue manually.');
        } finally {
            setAiAssistLoading(false);
        }
    }, [form.roleCategory, form.roleName, isEmployer]);

    const validateCurrentStep = useCallback(() => {
        if (!currentStep) return 'Invalid step.';
        if (isEmployer) {
            if (currentStep.id === 'company_name' && !String(form.companyName || '').trim()) return 'Company name is required.';
            if (currentStep.id === 'company_logo' && !String(form.avatarUrl || '').trim()) return 'Company logo is required.';
            if (currentStep.id === 'company_description' && !String(form.companyDescription || '').trim()) return 'Company description is required.';
            if (currentStep.id === 'industry' && !String(form.industry || '').trim()) return 'Industry is required.';
            if (currentStep.id === 'contact_person' && !String(form.contactPerson || '').trim()) return 'Contact person is required.';
            if (currentStep.id === 'verified_contact' && !verificationComplete) return 'Verify email/phone before continuing.';
            return '';
        }

        if (currentStep.id === 'profile_picture' && !String(form.avatarUrl || '').trim()) return 'Profile picture is required.';
        if (currentStep.id === 'basic_info') {
            if (!String(form.fullName || '').trim()) return 'Full name is required.';
            if (!String(form.city || '').trim()) return 'City is required.';
        }
        if (currentStep.id === 'work_info') {
            const skills = normalizeSkills(form.skillsText);
            const experienceValue = Number(form.experienceInRole);
            if (!String(form.roleCategory || '').trim()) return 'Select role type.';
            if (!String(form.roleName || '').trim()) return 'Role is required.';
            if (!skills.length) return 'At least one skill is required.';
            if (!Number.isFinite(experienceValue) || experienceValue < 0) return 'Experience level is required.';
            if (Number(form.expectedSalary || 0) <= 0) return 'Expected salary is required.';
        }
        return '';
    }, [currentStep, form, isEmployer, verificationComplete]);

    const saveStep = useCallback(async () => {
        if (!currentStep) return null;
        if (isEmployer) {
            if (currentStep.id === 'company_name') {
                return persistProfile({
                    companyName: String(form.companyName || '').trim(),
                    location: String(form.companyLocation || '').trim(),
                });
            }
            if (currentStep.id === 'company_description') {
                return persistProfile({ description: String(form.companyDescription || '').trim() });
            }
            if (currentStep.id === 'industry') {
                return persistProfile({ industry: String(form.industry || '').trim() });
            }
            if (currentStep.id === 'contact_person') {
                return persistProfile({
                    contactPerson: String(form.contactPerson || '').trim(),
                    location: String(form.companyLocation || '').trim(),
                });
            }
            return refreshCompletion();
        }

        if (currentStep.id === 'basic_info') {
            const names = splitName(form.fullName);
            return persistProfile({
                firstName: names.firstName,
                lastName: names.lastName,
                city: String(form.city || '').trim(),
                language: String(form.language || 'English').trim(),
            });
        }

        if (currentStep.id === 'work_info') {
            const skills = normalizeSkills(form.skillsText);
            const expectedSalary = Number(form.expectedSalary || 0);
            return persistProfile({
                totalExperience: Number(form.experienceInRole || 0),
                preferredShift: String(form.preferredShift || 'Flexible'),
                roleProfiles: [
                    {
                        roleName: String(form.roleName || '').trim(),
                        experienceInRole: Number(form.experienceInRole || 0),
                        expectedSalary: Number.isFinite(expectedSalary) ? expectedSalary : 0,
                        skills,
                    },
                ],
            });
        }

        if (currentStep.id === 'availability') {
            return persistProfile({
                isAvailable: true,
                availabilityWindowDays: Number(form.availabilityWindowDays || 0),
                openToRelocation: Boolean(form.openToRelocation),
                openToNightShift: Boolean(form.openToNightShift),
            });
        }

        return refreshCompletion();
    }, [currentStep, form, isEmployer, persistProfile, refreshCompletion]);

    const finishIfReady = useCallback(async () => {
        const nextCompletion = await refreshCompletion();
        const canAccessApp = Boolean(nextCompletion?.actions?.canAccessApp);
        if (!canAccessApp) {
            const missing = Array.isArray(nextCompletion?.missingForAccess) ? nextCompletion.missingForAccess.join(', ') : '';
            setErrorText(missing ? `Complete required fields: ${missing.replace(/_/g, ' ')}` : 'Profile setup is incomplete.');
            return false;
        }
        await updateUserInfo?.({
            hasCompletedProfile: Boolean(nextCompletion?.meetsProfileCompleteThreshold),
            profileCompletion: nextCompletion,
        });
        onCompleted?.(nextCompletion);
        return true;
    }, [onCompleted, refreshCompletion, updateUserInfo]);

    const onNext = useCallback(async () => {
        if (saving || uploadingAvatar || aiAssistLoading) return;
        const validationError = validateCurrentStep();
        if (validationError) {
            setErrorText(validationError);
            return;
        }
        setErrorText('');
        setSaving(true);
        try {
            await saveStep();
            const isFinal = currentStepIndex >= (steps.length - 1);
            if (isFinal) {
                await finishIfReady();
                return;
            }
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setCurrentStepIndex((prev) => Math.min(prev + 1, steps.length - 1));
        } catch (error) {
            setErrorText(error?.response?.data?.message || 'Could not save this step.');
        } finally {
            setSaving(false);
        }
    }, [aiAssistLoading, currentStepIndex, finishIfReady, saveStep, saving, steps.length, uploadingAvatar, validateCurrentStep]);

    const onBack = useCallback(() => {
        if (currentStepIndex <= 0) return;
        setErrorText('');
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setCurrentStepIndex((prev) => Math.max(prev - 1, 0));
    }, [currentStepIndex]);

    const applyWorkerRoleCategorySelection = useCallback((nextRoleCategory) => {
        const item = String(nextRoleCategory || '').trim();
        if (!item) return;
        const nextTemplate = WORKER_ROLE_TEMPLATES[item] || WORKER_ROLE_TEMPLATES.Other;
        setShowCustomRoleInput(false);
        setShowAllRoleTitles(false);
        setShowAllSkills(false);
        setForm((prev) => {
            const currentRole = String(prev.roleName || '').trim();
            const templateRoleNames = Array.isArray(nextTemplate.roleNames) ? nextTemplate.roleNames : [];
            const keepRole = templateRoleNames.some((roleName) => normalizeToken(roleName) === normalizeToken(currentRole));
            const roleCategoryChanged = normalizeToken(prev.roleCategory) !== normalizeToken(item);
            const currentSkills = normalizeSkills(prev.skillsText);
            const templateSkills = Array.isArray(nextTemplate.skills) ? nextTemplate.skills : [];
            const keepSkills = currentSkills.some((skill) => templateSkills.some((templateSkill) => normalizeToken(templateSkill) === normalizeToken(skill)));
            return {
                ...prev,
                roleCategory: item,
                roleName: keepRole ? currentRole : String(templateRoleNames[0] || currentRole || ''),
                // Prevent stale skills leaking across role categories (e.g. Software -> Electrician).
                skillsText: roleCategoryChanged
                    ? String(templateSkills.join(', '))
                    : (keepSkills ? String(prev.skillsText || '').trim() : String(templateSkills.join(', '))),
            };
        });
    }, []);

    const applyWorkerSmartPreset = useCallback(() => {
        const roleCategory = String(form.roleCategory || '').trim();
        const template = WORKER_ROLE_TEMPLATES[roleCategory] || WORKER_ROLE_TEMPLATES.Other;
        const suggestedRole = String(template?.roleNames?.[0] || '').trim();
        const suggestedSkills = Array.isArray(template?.skills) ? template.skills.filter(Boolean) : [];
        const suggestedSalary = Number(WORKER_SALARY_OPTIONS?.[2] || 25000);

        setShowCustomRoleInput(false);
        setShowCustomSkillInput(false);
        setShowCustomSalaryInput(false);
        setForm((prev) => {
            const existingSkills = normalizeSkills(prev.skillsText);
            const mergedSkills = [...new Set([...existingSkills, ...suggestedSkills])].slice(0, 25);
            return {
                ...prev,
                roleName: String(prev.roleName || suggestedRole).trim(),
                skillsText: mergedSkills.join(', '),
                expectedSalary: String(Number(prev.expectedSalary || 0) > 0 ? prev.expectedSalary : suggestedSalary),
            };
        });
    }, [form.roleCategory]);

    const renderWorkerStep = () => {
        if (currentStep.id === 'profile_picture') {
            return (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Add your profile picture</Text>
                    <Text style={styles.sectionHint}>Required. Cropped square and compressed before upload.</Text>
                    <TouchableOpacity style={styles.avatarWrap} onPress={pickAvatar} activeOpacity={0.85}>
                        {form.avatarUrl ? (
                            <Image source={{ uri: form.avatarUrl }} style={styles.avatarImage} />
                        ) : (
                            <Text style={styles.avatarPlaceholder}>Upload</Text>
                        )}
                    </TouchableOpacity>
                    {uploadingAvatar ? (
                        <View style={styles.uploadState}>
                            <ActivityIndicator color="#4f46e5" />
                            <Text style={styles.uploadStateText}>Uploading {uploadProgress}%</Text>
                        </View>
                    ) : null}
                </View>
            );
        }

        if (currentStep.id === 'basic_info') {
            return (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Basic information</Text>
                    <View style={styles.hintCard}>
                        <Text style={styles.hintText}>Use quick choices. Type only if your city or language is not listed.</Text>
                    </View>
                    <TextInput
                        value={form.fullName}
                        onChangeText={(value) => setForm((prev) => ({ ...prev, fullName: value }))}
                        style={styles.input}
                        placeholder="Full name"
                        placeholderTextColor="#64748b"
                        textContentType="name"
                        autoCapitalize="words"
                        autoCorrect={false}
                    />
                    <Text style={styles.fieldLabel}>City</Text>
                    <View style={styles.rowWrap}>
                        {visibleWorkerCities.map((city) => (
                            <Pill
                                key={`city-${city}`}
                                label={city}
                                active={normalizeToken(form.city) === normalizeToken(city)}
                                onPress={() => {
                                    setShowCustomCityInput(false);
                                    setForm((prev) => ({ ...prev, city }));
                                }}
                            />
                        ))}
                    </View>
                    {WORKER_CITY_OPTIONS.length > visibleWorkerCities.length ? (
                        <TouchableOpacity
                            style={styles.helperAction}
                            onPress={() => setShowAllCities(true)}
                            activeOpacity={0.82}
                        >
                            <Text style={styles.helperActionText}>Show more cities</Text>
                        </TouchableOpacity>
                    ) : null}
                    {showAllCities ? (
                        <TouchableOpacity
                            style={styles.helperAction}
                            onPress={() => setShowAllCities(false)}
                            activeOpacity={0.82}
                        >
                            <Text style={styles.helperActionText}>Show fewer cities</Text>
                        </TouchableOpacity>
                    ) : null}
                    <TouchableOpacity
                        style={styles.helperAction}
                        onPress={() => setShowCustomCityInput((prev) => !prev)}
                        activeOpacity={0.82}
                    >
                        <Text style={styles.helperActionText}>
                            {showCustomCityInput ? 'Hide custom city' : 'City not listed? Add custom'}
                        </Text>
                    </TouchableOpacity>
                    {showCustomCityInput ? (
                        <TypeaheadInput
                            value={form.city}
                            onChangeText={(value) => setForm((prev) => ({ ...prev, city: value }))}
                            placeholder="Type city"
                            suggestions={workerCityTypeaheadOptions}
                            onSelectSuggestion={(value) => {
                                setForm((prev) => ({ ...prev, city: value }));
                                setShowCustomCityInput(false);
                            }}
                            textContentType="addressCity"
                        />
                    ) : null}

                    <Text style={styles.fieldLabel}>Language</Text>
                    <View style={styles.rowWrap}>
                        {visibleWorkerLanguages.map((language) => (
                            <Pill
                                key={`lang-${language}`}
                                label={language}
                                active={normalizeToken(form.language) === normalizeToken(language)}
                                onPress={() => {
                                    setShowCustomLanguageInput(false);
                                    setForm((prev) => ({ ...prev, language }));
                                }}
                            />
                        ))}
                    </View>
                    {WORKER_LANGUAGE_OPTIONS.length > visibleWorkerLanguages.length ? (
                        <TouchableOpacity
                            style={styles.helperAction}
                            onPress={() => setShowAllLanguages(true)}
                            activeOpacity={0.82}
                        >
                            <Text style={styles.helperActionText}>Show more languages</Text>
                        </TouchableOpacity>
                    ) : null}
                    {showAllLanguages ? (
                        <TouchableOpacity
                            style={styles.helperAction}
                            onPress={() => setShowAllLanguages(false)}
                            activeOpacity={0.82}
                        >
                            <Text style={styles.helperActionText}>Show fewer languages</Text>
                        </TouchableOpacity>
                    ) : null}
                    <TouchableOpacity
                        style={styles.helperAction}
                        onPress={() => setShowCustomLanguageInput((prev) => !prev)}
                        activeOpacity={0.82}
                    >
                        <Text style={styles.helperActionText}>
                            {showCustomLanguageInput ? 'Hide custom language' : 'Add custom language'}
                        </Text>
                    </TouchableOpacity>
                    {showCustomLanguageInput ? (
                        <TypeaheadInput
                            value={form.language}
                            onChangeText={(value) => setForm((prev) => ({ ...prev, language: value }))}
                            placeholder="Type language"
                            suggestions={workerLanguageTypeaheadOptions}
                            onSelectSuggestion={(value) => {
                                setForm((prev) => ({ ...prev, language: value }));
                                setShowCustomLanguageInput(false);
                            }}
                        />
                    ) : null}
                </View>
            );
        }

        if (currentStep.id === 'work_info') {
            return (
                <View style={styles.section}>
                    <View style={styles.sectionTitleRow}>
                        <Text style={styles.sectionTitle}>Work information</Text>
                        <View style={styles.assistActionsRow}>
                            <TouchableOpacity
                                style={styles.aiAssistButton}
                                activeOpacity={0.85}
                                onPress={handleAiProfileAssist}
                                disabled={aiAssistLoading}
                            >
                                <Text style={styles.aiAssistButtonText}>{aiAssistLoading ? 'Thinking...' : 'AI Assist'}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.autoFillButton}
                                activeOpacity={0.85}
                                onPress={applyWorkerSmartPreset}
                            >
                                <Text style={styles.autoFillButtonText}>Auto-fill</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                    <View style={styles.hintCard}>
                        <Text style={styles.hintText}>Pick core details first. Add optional custom inputs only when needed.</Text>
                    </View>
                    <Text style={styles.fieldLabel}>Role type</Text>
                    <DropdownField
                        placeholder="Select role type"
                        valueLabel={String(form.roleCategory || '').trim()}
                        selectedValue={String(form.roleCategory || '').trim()}
                        options={workerRoleTypeDropdownOptions}
                        onSelect={applyWorkerRoleCategorySelection}
                    />
                    <Text style={styles.dropdownHelperText}>Quick picks</Text>
                    <View style={styles.rowWrap}>
                        {visibleWorkerRoleTypes.map((item) => (
                            <Pill
                                key={`role-type-${item}`}
                                label={item}
                                active={String(form.roleCategory) === item}
                                onPress={() => applyWorkerRoleCategorySelection(item)}
                            />
                        ))}
                    </View>
                    {WORKER_ROLE_TYPES.length > visibleWorkerRoleTypes.length ? (
                        <TouchableOpacity
                            style={styles.helperAction}
                            onPress={() => setShowAllRoleTypes(true)}
                            activeOpacity={0.82}
                        >
                            <Text style={styles.helperActionText}>Show more role types</Text>
                        </TouchableOpacity>
                    ) : null}
                    {showAllRoleTypes ? (
                        <TouchableOpacity
                            style={styles.helperAction}
                            onPress={() => setShowAllRoleTypes(false)}
                            activeOpacity={0.82}
                        >
                            <Text style={styles.helperActionText}>Show fewer role types</Text>
                        </TouchableOpacity>
                    ) : null}
                    <Text style={styles.fieldLabel}>Role title</Text>
                    {Array.isArray(workerTemplate.roleNames) && workerTemplate.roleNames.length ? (
                        <View style={styles.rowWrap}>
                            {visibleWorkerRoleTitles.map((item) => (
                                <Pill
                                    key={`role-name-${item}`}
                                    label={item}
                                    active={String(form.roleName) === item}
                                    onPress={() => setForm((prev) => ({ ...prev, roleName: item }))}
                                />
                            ))}
                        </View>
                    ) : null}
                    {workerRoleTitleOptions.length > visibleWorkerRoleTitles.length ? (
                        <TouchableOpacity
                            style={styles.helperAction}
                            onPress={() => setShowAllRoleTitles(true)}
                            activeOpacity={0.82}
                        >
                            <Text style={styles.helperActionText}>Show more role titles</Text>
                        </TouchableOpacity>
                    ) : null}
                    {showAllRoleTitles ? (
                        <TouchableOpacity
                            style={styles.helperAction}
                            onPress={() => setShowAllRoleTitles(false)}
                            activeOpacity={0.82}
                        >
                            <Text style={styles.helperActionText}>Show fewer role titles</Text>
                        </TouchableOpacity>
                    ) : null}
                    <TouchableOpacity
                        style={styles.helperAction}
                        onPress={() => setShowCustomRoleInput((prev) => !prev)}
                        activeOpacity={0.82}
                    >
                        <Text style={styles.helperActionText}>
                            {showCustomRoleInput ? 'Hide custom role' : 'Role not listed? Add custom'}
                        </Text>
                    </TouchableOpacity>
                    {showCustomRoleInput ? (
                        <TypeaheadInput
                            value={form.roleName}
                            onChangeText={(value) => setForm((prev) => ({ ...prev, roleName: value }))}
                            placeholder="Type role title"
                            suggestions={workerRoleTitleTypeaheadOptions}
                            onSelectSuggestion={(value) => {
                                setForm((prev) => ({ ...prev, roleName: value }));
                                setShowCustomRoleInput(false);
                            }}
                        />
                    ) : null}

                    <Text style={styles.fieldLabel}>Skills</Text>
                    <Text style={styles.sectionHint}>Selected skills: {selectedWorkerSkills.length}</Text>
                    <View style={styles.rowWrap}>
                        {visibleWorkerSkills.map((item) => (
                            <Pill
                                key={item}
                                label={item}
                                active={selectedWorkerSkills.includes(item)}
                                onPress={() => setForm((prev) => ({ ...prev, skillsText: toggleSkillToken(prev.skillsText, item) }))}
                            />
                        ))}
                    </View>
                    {workerSkillOptions.length > visibleWorkerSkills.length ? (
                        <TouchableOpacity
                            style={styles.helperAction}
                            onPress={() => setShowAllSkills(true)}
                            activeOpacity={0.82}
                        >
                            <Text style={styles.helperActionText}>Show more skills</Text>
                        </TouchableOpacity>
                    ) : null}
                    {showAllSkills ? (
                        <TouchableOpacity
                            style={styles.helperAction}
                            onPress={() => setShowAllSkills(false)}
                            activeOpacity={0.82}
                        >
                            <Text style={styles.helperActionText}>Show fewer skills</Text>
                        </TouchableOpacity>
                    ) : null}
                    <TouchableOpacity
                        style={styles.helperAction}
                        onPress={() => setShowCustomSkillInput((prev) => !prev)}
                        activeOpacity={0.82}
                    >
                        <Text style={styles.helperActionText}>
                            {showCustomSkillInput ? 'Hide custom skill' : 'Add custom skill'}
                        </Text>
                    </TouchableOpacity>
                    {showCustomSkillInput ? (
                        <View style={styles.inlineRow}>
                            <View style={styles.inlineInputGrow}>
                                <TypeaheadInput
                                    value={customSkillInput}
                                    onChangeText={setCustomSkillInput}
                                    placeholder="Type skill"
                                    suggestions={workerSkillTypeaheadOptions}
                                    onSelectSuggestion={(value) => {
                                        setForm((prev) => ({ ...prev, skillsText: toggleSkillToken(prev.skillsText, value) }));
                                        setCustomSkillInput('');
                                    }}
                                    autoCapitalize="words"
                                />
                            </View>
                            <TouchableOpacity
                                style={styles.inlineAddBtn}
                                activeOpacity={0.85}
                                onPress={() => {
                                    const nextSkill = String(customSkillInput || '').trim();
                                    if (!nextSkill) return;
                                    setForm((prev) => ({ ...prev, skillsText: toggleSkillToken(prev.skillsText, nextSkill) }));
                                    setCustomSkillInput('');
                                }}
                            >
                                <Text style={styles.inlineAddBtnText}>Add</Text>
                            </TouchableOpacity>
                        </View>
                    ) : null}

                    <Text style={styles.fieldLabel}>Experience (years)</Text>
                    <DropdownField
                        placeholder="Select experience"
                        valueLabel={`${Number(form.experienceInRole || 0)} year${Number(form.experienceInRole || 0) === 1 ? '' : 's'}`}
                        selectedValue={String(form.experienceInRole || '')}
                        options={workerExperienceDropdownOptions}
                        onSelect={(value) => {
                            setForm((prev) => ({ ...prev, experienceInRole: Number(value || 0) }));
                        }}
                    />
                    <Text style={styles.dropdownHelperText}>Quick picks</Text>
                    <View style={styles.rowWrap}>
                        {EXPERIENCE_OPTIONS.map((option) => (
                            <Pill
                                key={`exp-${option}`}
                                label={`${option}`}
                                active={Number(form.experienceInRole) === option}
                                onPress={() => setForm((prev) => ({ ...prev, experienceInRole: option }))}
                            />
                        ))}
                    </View>

                    <Text style={styles.fieldLabel}>Expected monthly salary</Text>
                    <DropdownField
                        placeholder="Select expected salary"
                        valueLabel={Number(form.expectedSalary || 0) > 0 ? `₹${Number(form.expectedSalary || 0).toLocaleString('en-IN')} / month` : ''}
                        selectedValue={String(form.expectedSalary || '')}
                        options={workerSalaryDropdownOptions}
                        onSelect={(value) => {
                            setShowCustomSalaryInput(false);
                            setForm((prev) => ({ ...prev, expectedSalary: String(Number(value || 0)) }));
                        }}
                    />
                    <Text style={styles.dropdownHelperText}>Quick picks</Text>
                    <View style={styles.rowWrap}>
                        {visibleWorkerSalaryOptions.map((option) => (
                            <Pill
                                key={`sal-${option}`}
                                label={`₹${Math.round(option / 1000)}k`}
                                active={Number(form.expectedSalary || 0) === option}
                                onPress={() => {
                                    setShowCustomSalaryInput(false);
                                    setForm((prev) => ({ ...prev, expectedSalary: String(option) }));
                                }}
                            />
                        ))}
                    </View>
                    {WORKER_SALARY_OPTIONS.length > visibleWorkerSalaryOptions.length ? (
                        <TouchableOpacity
                            style={styles.helperAction}
                            onPress={() => setShowAllSalaryBands(true)}
                            activeOpacity={0.82}
                        >
                            <Text style={styles.helperActionText}>Show more salary bands</Text>
                        </TouchableOpacity>
                    ) : null}
                    {showAllSalaryBands ? (
                        <TouchableOpacity
                            style={styles.helperAction}
                            onPress={() => setShowAllSalaryBands(false)}
                            activeOpacity={0.82}
                        >
                            <Text style={styles.helperActionText}>Show fewer salary bands</Text>
                        </TouchableOpacity>
                    ) : null}
                    <TouchableOpacity
                        style={styles.helperAction}
                        onPress={() => setShowCustomSalaryInput((prev) => !prev)}
                        activeOpacity={0.82}
                    >
                        <Text style={styles.helperActionText}>
                            {showCustomSalaryInput ? 'Hide custom salary' : 'Set custom salary'}
                        </Text>
                    </TouchableOpacity>
                    {showCustomSalaryInput ? (
                        <TypeaheadInput
                            value={String(form.expectedSalary)}
                            onChangeText={(value) => setForm((prev) => ({ ...prev, expectedSalary: value.replace(/[^\d]/g, '') }))}
                            placeholder="Type salary"
                            suggestions={buildTypeaheadSuggestions(String(form.expectedSalary || ''), WORKER_SALARY_OPTIONS.map((option) => String(option)), 5)}
                            onSelectSuggestion={(value) => {
                                setForm((prev) => ({ ...prev, expectedSalary: String(value).replace(/[^\d]/g, '') }));
                                setShowCustomSalaryInput(false);
                            }}
                            keyboardType="number-pad"
                            autoCapitalize="none"
                        />
                    ) : null}
                    <Text style={styles.fieldLabel}>Shift preference</Text>
                    <DropdownField
                        placeholder="Select shift preference"
                        valueLabel={String(form.preferredShift || '').trim()}
                        selectedValue={String(form.preferredShift || '').trim()}
                        options={workerShiftDropdownOptions}
                        onSelect={(value) => {
                            const nextShift = SHIFT_OPTIONS.includes(String(value || '').trim())
                                ? String(value).trim()
                                : 'Flexible';
                            setForm((prev) => ({ ...prev, preferredShift: nextShift }));
                        }}
                    />
                    <Text style={styles.dropdownHelperText}>Quick picks</Text>
                    <View style={styles.rowWrap}>
                        {SHIFT_OPTIONS.map((item) => (
                            <Pill
                                key={item}
                                label={item}
                                active={String(form.preferredShift) === item}
                                onPress={() => setForm((prev) => ({ ...prev, preferredShift: item }))}
                            />
                        ))}
                    </View>
                </View>
            );
        }

        if (currentStep.id === 'availability') {
            return (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Availability</Text>
                    <Text style={styles.fieldLabel}>Joining window</Text>
                    <View style={styles.rowWrap}>
                        {AVAILABILITY_OPTIONS.map((option) => (
                            <Pill
                                key={`availability-${option.value}`}
                                label={option.label}
                                active={Number(form.availabilityWindowDays) === option.value}
                                onPress={() => setForm((prev) => ({ ...prev, availabilityWindowDays: option.value }))}
                            />
                        ))}
                    </View>
                    <View style={styles.switchRow}>
                        <Text style={styles.switchLabel}>Open to relocation</Text>
                        <Switch
                            value={Boolean(form.openToRelocation)}
                            onValueChange={(value) => setForm((prev) => ({ ...prev, openToRelocation: value }))}
                        />
                    </View>
                    <View style={styles.switchRow}>
                        <Text style={styles.switchLabel}>Open to night shift</Text>
                        <Switch
                            value={Boolean(form.openToNightShift)}
                            onValueChange={(value) => setForm((prev) => ({ ...prev, openToNightShift: value }))}
                        />
                    </View>
                </View>
            );
        }

        return null;
    };

    const renderEmployerStep = () => {
        if (currentStep.id === 'company_name') {
            return (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Company name</Text>
                    <Text style={styles.sectionHint}>Keep this short and clear. Use quick location picks below.</Text>
                    <TextInput
                        value={form.companyName}
                        onChangeText={(value) => setForm((prev) => ({ ...prev, companyName: value }))}
                        style={styles.input}
                        placeholder="Company name"
                    />
                    <Text style={styles.fieldLabel}>Location</Text>
                    <View style={styles.rowWrap}>
                        {visibleEmployerLocations.map((item) => (
                            <Pill
                                key={`company-location-${item}`}
                                label={item}
                                active={normalizeToken(form.companyLocation) === normalizeToken(item)}
                                onPress={() => {
                                    setShowCustomEmployerLocationInput(false);
                                    setForm((prev) => ({ ...prev, companyLocation: item }));
                                }}
                            />
                        ))}
                    </View>
                    {employerLocationOptions.length > visibleEmployerLocations.length ? (
                        <TouchableOpacity
                            style={styles.helperAction}
                            onPress={() => setShowAllEmployerLocations(true)}
                            activeOpacity={0.82}
                        >
                            <Text style={styles.helperActionText}>Show more locations</Text>
                        </TouchableOpacity>
                    ) : null}
                    {showAllEmployerLocations ? (
                        <TouchableOpacity
                            style={styles.helperAction}
                            onPress={() => setShowAllEmployerLocations(false)}
                            activeOpacity={0.82}
                        >
                            <Text style={styles.helperActionText}>Show fewer locations</Text>
                        </TouchableOpacity>
                    ) : null}
                    <TouchableOpacity
                        style={styles.helperAction}
                        onPress={() => setShowCustomEmployerLocationInput((prev) => !prev)}
                        activeOpacity={0.82}
                    >
                        <Text style={styles.helperActionText}>
                            {showCustomEmployerLocationInput ? 'Hide custom location' : 'Use custom location'}
                        </Text>
                    </TouchableOpacity>
                    {showCustomEmployerLocationInput ? (
                        <TypeaheadInput
                            value={form.companyLocation}
                            onChangeText={(value) => setForm((prev) => ({ ...prev, companyLocation: value }))}
                            placeholder="Type location"
                            suggestions={employerLocationTypeaheadOptions}
                            onSelectSuggestion={(value) => {
                                setForm((prev) => ({ ...prev, companyLocation: value }));
                                setShowCustomEmployerLocationInput(false);
                            }}
                            textContentType="addressCity"
                        />
                    ) : null}
                </View>
            );
        }
        if (currentStep.id === 'company_logo') {
            return (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Company logo</Text>
                    <TouchableOpacity style={styles.avatarWrap} onPress={pickAvatar} activeOpacity={0.85}>
                        {form.avatarUrl ? (
                            <Image source={{ uri: form.avatarUrl }} style={styles.avatarImage} />
                        ) : (
                            <Text style={styles.avatarPlaceholder}>Upload</Text>
                        )}
                    </TouchableOpacity>
                </View>
            );
        }
        if (currentStep.id === 'company_description') {
            return (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Company description</Text>
                    <TextInput
                        value={form.companyDescription}
                        onChangeText={(value) => setForm((prev) => ({ ...prev, companyDescription: value }))}
                        style={[styles.input, styles.multilineInput]}
                        placeholder="Describe your company"
                        multiline
                    />
                </View>
            );
        }
        if (currentStep.id === 'industry') {
            return (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Industry</Text>
                    <Text style={styles.sectionHint}>Select one industry. Add custom only if not listed.</Text>
                    <View style={styles.rowWrap}>
                        {visibleIndustryOptions.map((item) => (
                            <Pill
                                key={`industry-${item}`}
                                label={item}
                                active={normalizeToken(form.industry) === normalizeToken(item)}
                                onPress={() => {
                                    setShowCustomIndustryInput(false);
                                    setForm((prev) => ({ ...prev, industry: item }));
                                }}
                            />
                        ))}
                    </View>
                    {EMPLOYER_INDUSTRY_OPTIONS.length > visibleIndustryOptions.length ? (
                        <TouchableOpacity
                            style={styles.helperAction}
                            onPress={() => setShowAllIndustries(true)}
                            activeOpacity={0.82}
                        >
                            <Text style={styles.helperActionText}>Show more industries</Text>
                        </TouchableOpacity>
                    ) : null}
                    {showAllIndustries ? (
                        <TouchableOpacity
                            style={styles.helperAction}
                            onPress={() => setShowAllIndustries(false)}
                            activeOpacity={0.82}
                        >
                            <Text style={styles.helperActionText}>Show fewer industries</Text>
                        </TouchableOpacity>
                    ) : null}
                    <TouchableOpacity
                        style={styles.helperAction}
                        onPress={() => setShowCustomIndustryInput((prev) => !prev)}
                        activeOpacity={0.82}
                    >
                        <Text style={styles.helperActionText}>
                            {showCustomIndustryInput ? 'Hide custom industry' : 'Use custom industry'}
                        </Text>
                    </TouchableOpacity>
                    {showCustomIndustryInput ? (
                        <TypeaheadInput
                            value={form.industry}
                            onChangeText={(value) => setForm((prev) => ({ ...prev, industry: value }))}
                            placeholder="Type industry"
                            suggestions={employerIndustryTypeaheadOptions}
                            onSelectSuggestion={(value) => {
                                setForm((prev) => ({ ...prev, industry: value }));
                                setShowCustomIndustryInput(false);
                            }}
                        />
                    ) : null}
                </View>
            );
        }
        if (currentStep.id === 'contact_person') {
            return (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Contact person</Text>
                    <Text style={styles.sectionHint}>Who should candidates reach out to?</Text>
                    <TextInput
                        value={form.contactPerson}
                        onChangeText={(value) => setForm((prev) => ({ ...prev, contactPerson: value }))}
                        style={styles.input}
                        placeholder="Hiring contact name"
                    />
                    <Text style={styles.fieldLabel}>Confirm location</Text>
                    <View style={styles.rowWrap}>
                        {visibleEmployerLocations.map((item) => (
                            <Pill
                                key={`contact-location-${item}`}
                                label={item}
                                active={normalizeToken(form.companyLocation) === normalizeToken(item)}
                                onPress={() => {
                                    setShowCustomEmployerLocationInput(false);
                                    setForm((prev) => ({ ...prev, companyLocation: item }));
                                }}
                            />
                        ))}
                    </View>
                    <TouchableOpacity
                        style={styles.helperAction}
                        onPress={() => setShowCustomEmployerLocationInput((prev) => !prev)}
                        activeOpacity={0.82}
                    >
                        <Text style={styles.helperActionText}>
                            {showCustomEmployerLocationInput ? 'Hide custom location' : 'Use custom location'}
                        </Text>
                    </TouchableOpacity>
                    {showCustomEmployerLocationInput ? (
                        <TypeaheadInput
                            value={form.companyLocation}
                            onChangeText={(value) => setForm((prev) => ({ ...prev, companyLocation: value }))}
                            placeholder="Type company location"
                            suggestions={employerLocationTypeaheadOptions}
                            onSelectSuggestion={(value) => {
                                setForm((prev) => ({ ...prev, companyLocation: value }));
                                setShowCustomEmployerLocationInput(false);
                            }}
                            textContentType="addressCity"
                        />
                    ) : null}
                </View>
            );
        }

        return (
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Verification</Text>
                <Text style={styles.sectionHint}>
                    Verify email or phone in settings to unlock posting.
                </Text>
                <View style={styles.interviewStatusBox}>
                    <Text style={styles.interviewStatusText}>
                        {verificationComplete ? 'Verified' : 'Verification pending'}
                    </Text>
                </View>
            </View>
        );
    };

    if (bootLoading) {
        return (
            <View style={[styles.loaderContainer, { paddingTop: insets.top + 20 }]}>
                <ActivityIndicator color="#4f46e5" />
                <Text style={styles.loaderText}>Loading profile setup...</Text>
            </View>
        );
    }

    const percent = Number(completion?.percent || 0);
    const stepLabel = `${currentStepIndex + 1} / ${steps.length}`;

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 12}
        >
            <ScrollView
                contentContainerStyle={[styles.content, { paddingTop: insets.top + 20, paddingBottom: Math.max(insets.bottom, 20) + 24 }]}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
            >
                <Text style={styles.headerTitle}>Complete your profile</Text>
                <Text style={styles.headerSubtitle}>
                    {isEmployer ? 'Complete details to start posting jobs faster.' : 'Complete profile to get 2x more interviews.'}
                </Text>
                <Text style={styles.progressMeta}>Step {stepLabel} • {percent}% complete</Text>
                <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: `${Math.max(0, Math.min(100, percent))}%` }]} />
                </View>

                <View style={styles.stepPillRow}>
                    {steps.map((step, index) => (
                        <TouchableOpacity
                            key={step.id}
                            activeOpacity={0.82}
                            onPress={() => {
                                if (index <= currentStepIndex) {
                                    setCurrentStepIndex(index);
                                }
                            }}
                            style={styles.stepDotTap}
                        >
                            <View style={[
                                styles.stepDot,
                                index <= currentStepIndex && styles.stepDotActive,
                                Boolean(readCompletionStep(completion, step.id)?.complete) && styles.stepDotDone,
                            ]}
                            />
                        </TouchableOpacity>
                    ))}
                </View>

                <Text style={styles.stepTitle}>{currentStep?.title}</Text>
                {isEmployer ? renderEmployerStep() : renderWorkerStep()}

                {errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}

                <View style={styles.footerRow}>
                    <TouchableOpacity
                        style={[styles.backBtn, currentStepIndex <= 0 && styles.backBtnDisabled]}
                        disabled={currentStepIndex <= 0 || saving}
                        onPress={onBack}
                    >
                        <Text style={styles.backBtnText}>Back</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.nextBtn, (saving || uploadingAvatar || aiAssistLoading) && styles.nextBtnDisabled]}
                        disabled={saving || uploadingAvatar || aiAssistLoading}
                        onPress={onNext}
                    >
                        {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.nextBtnText}>{currentStepIndex >= steps.length - 1 ? 'Finish' : 'Next'}</Text>}
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#eef2f8',
    },
    content: {
        paddingHorizontal: 18,
    },
    loaderContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f8fafc',
    },
    loaderText: {
        marginTop: 10,
        color: '#475569',
        fontWeight: '600',
    },
    headerTitle: {
        fontSize: 27,
        lineHeight: 33,
        fontWeight: '800',
        color: '#0f172a',
        letterSpacing: 0.2,
    },
    headerSubtitle: {
        marginTop: 7,
        color: '#475569',
        fontWeight: '600',
        lineHeight: 19,
    },
    progressMeta: {
        marginTop: 20,
        fontSize: 11,
        color: '#64748b',
        fontWeight: '700',
        letterSpacing: 0.8,
        textTransform: 'uppercase',
    },
    progressTrack: {
        marginTop: 8,
        height: 9,
        borderRadius: 999,
        backgroundColor: '#e2e8f0',
        overflow: 'hidden',
    },
    progressFill: {
        height: 9,
        borderRadius: 999,
        backgroundColor: '#7c3aed',
    },
    stepPillRow: {
        marginTop: 18,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    stepDot: {
        width: 9,
        height: 9,
        borderRadius: 9,
        backgroundColor: '#cbd5e1',
    },
    stepDotActive: {
        backgroundColor: '#7c3aed',
        width: 20,
        borderRadius: 999,
    },
    stepDotDone: {
        backgroundColor: '#6d28d9',
    },
    stepDotTap: {
        paddingVertical: 2,
        paddingHorizontal: 1,
    },
    stepTitle: {
        marginTop: 18,
        fontSize: 22,
        lineHeight: 28,
        fontWeight: '800',
        color: '#111827',
    },
    section: {
        marginTop: 18,
        backgroundColor: '#ffffff',
        borderRadius: 18,
        paddingHorizontal: 15,
        paddingVertical: 14,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        shadowColor: '#334155',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.07,
        shadowRadius: 12,
        elevation: 2,
    },
    sectionTitle: {
        fontSize: 18,
        lineHeight: 23,
        fontWeight: '800',
        color: '#0f172a',
    },
    sectionTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
    },
    assistActionsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    aiAssistButton: {
        borderRadius: 999,
        borderWidth: 1,
        borderColor: '#ddd6fe',
        backgroundColor: '#f5f3ff',
        paddingHorizontal: 11,
        paddingVertical: 6,
    },
    aiAssistButtonText: {
        fontSize: 11,
        fontWeight: '800',
        color: '#6d28d9',
    },
    autoFillButton: {
        borderRadius: 999,
        borderWidth: 1,
        borderColor: '#7c3aed',
        backgroundColor: '#7c3aed',
        paddingHorizontal: 11,
        paddingVertical: 6,
    },
    autoFillButtonText: {
        fontSize: 11,
        fontWeight: '800',
        color: '#ffffff',
    },
    sectionHint: {
        marginTop: 5,
        color: '#64748b',
        fontWeight: '600',
        fontSize: 12,
        lineHeight: 17,
    },
    hintCard: {
        marginTop: 11,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e9d5ff',
        backgroundColor: '#faf5ff',
        paddingHorizontal: 11,
        paddingVertical: 9,
    },
    hintText: {
        color: '#6b21a8',
        fontWeight: '700',
        fontSize: 12,
        lineHeight: 17,
    },
    input: {
        marginTop: 11,
        backgroundColor: '#f8fafc',
        borderWidth: 1,
        borderColor: '#d6dfec',
        borderRadius: 14,
        paddingHorizontal: 12,
        paddingVertical: 11,
        color: '#0f172a',
        fontWeight: '600',
    },
    typeaheadWrap: {
        marginTop: 11,
    },
    inputShell: {
        minHeight: 46,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#d6dfec',
        backgroundColor: '#f8fafc',
        paddingHorizontal: 12,
        flexDirection: 'row',
        alignItems: 'center',
    },
    inputShellFocused: {
        borderColor: '#a78bfa',
        backgroundColor: '#f5f3ff',
    },
    inputField: {
        flex: 1,
        color: '#0f172a',
        fontWeight: '600',
        paddingVertical: 11,
    },
    inputChevron: {
        marginLeft: 8,
    },
    typeaheadMenu: {
        marginTop: 6,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e9d5ff',
        backgroundColor: '#ffffff',
        overflow: 'hidden',
    },
    typeaheadOption: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 11,
        paddingVertical: 9,
        borderBottomWidth: 1,
        borderBottomColor: '#f3e8ff',
    },
    typeaheadOptionText: {
        color: '#111827',
        fontWeight: '600',
        fontSize: 13,
    },
    multilineInput: {
        minHeight: 96,
        textAlignVertical: 'top',
    },
    fieldLabel: {
        marginTop: 12,
        color: '#334155',
        fontWeight: '700',
        fontSize: 12,
        letterSpacing: 0.2,
    },
    dropdownWrap: {
        marginTop: 8,
    },
    dropdownTrigger: {
        minHeight: 46,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#d6dfec',
        backgroundColor: '#f8fafc',
        paddingHorizontal: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    dropdownTriggerOpen: {
        borderColor: '#818cf8',
        backgroundColor: '#eef2ff',
    },
    dropdownTriggerText: {
        flex: 1,
        color: '#0f172a',
        fontWeight: '700',
        fontSize: 13,
        paddingRight: 8,
    },
    dropdownPlaceholderText: {
        color: '#64748b',
        fontWeight: '600',
    },
    dropdownChevron: {
        color: '#475569',
        fontSize: 12,
        fontWeight: '900',
    },
    dropdownMenu: {
        marginTop: 8,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#d6dfec',
        backgroundColor: '#ffffff',
        overflow: 'hidden',
    },
    dropdownOption: {
        paddingHorizontal: 12,
        paddingVertical: 11,
        borderBottomWidth: 1,
        borderBottomColor: '#edf2f7',
    },
    dropdownOptionActive: {
        backgroundColor: '#eef2ff',
    },
    dropdownOptionText: {
        color: '#1e293b',
        fontWeight: '600',
        fontSize: 13,
    },
    dropdownOptionTextActive: {
        color: '#3730a3',
        fontWeight: '800',
    },
    dropdownHelperText: {
        marginTop: 8,
        color: '#64748b',
        fontWeight: '700',
        fontSize: 11,
        letterSpacing: 0.2,
        textTransform: 'uppercase',
    },
    rowWrap: {
        marginTop: 9,
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 9,
    },
    helperAction: {
        marginTop: 9,
        marginBottom: 3,
    },
    helperActionText: {
        color: '#4338ca',
        fontWeight: '800',
        fontSize: 12,
    },
    inlineRow: {
        marginTop: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    inlineInput: {
        flex: 1,
        marginTop: 0,
    },
    inlineInputGrow: {
        flex: 1,
    },
    inlineAddBtn: {
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#7c3aed',
        backgroundColor: '#f5f3ff',
        paddingHorizontal: 13,
        paddingVertical: 11,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#7c3aed',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 6,
        elevation: 1,
    },
    inlineAddBtnText: {
        color: '#6d28d9',
        fontWeight: '800',
        fontSize: 12,
    },
    pill: {
        paddingHorizontal: 13,
        paddingVertical: 9,
        borderRadius: 999,
        backgroundColor: '#f8fafc',
        borderWidth: 1,
        borderColor: '#dbe4f0',
    },
    pillActive: {
        backgroundColor: '#7c3aed',
        borderColor: '#7c3aed',
        shadowColor: '#7c3aed',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
        elevation: 1,
    },
    pillLabel: {
        color: '#334155',
        fontWeight: '700',
        fontSize: 12,
    },
    pillLabelActive: {
        color: '#ffffff',
    },
    avatarWrap: {
        marginTop: 14,
        width: 116,
        height: 116,
        borderRadius: 58,
        borderWidth: 2,
        borderColor: '#7c3aed',
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        backgroundColor: '#f5f3ff',
        alignSelf: 'center',
        shadowColor: '#7c3aed',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.14,
        shadowRadius: 8,
        elevation: 2,
    },
    avatarImage: {
        width: 116,
        height: 116,
        borderRadius: 58,
    },
    avatarPlaceholder: {
        color: '#6d28d9',
        fontWeight: '800',
    },
    uploadState: {
        marginTop: 10,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
    },
    uploadStateText: {
        color: '#334155',
        fontWeight: '600',
    },
    switchRow: {
        marginTop: 12,
        paddingHorizontal: 2,
        paddingVertical: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    switchLabel: {
        color: '#1e293b',
        fontWeight: '700',
    },
    interviewStatusBox: {
        marginTop: 12,
        borderRadius: 14,
        paddingVertical: 11,
        paddingHorizontal: 13,
        backgroundColor: '#f5f3ff',
    },
    interviewStatusText: {
        color: '#6d28d9',
        fontWeight: '700',
    },
    secondaryBtn: {
        marginTop: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#7c3aed',
        paddingVertical: 11,
        alignItems: 'center',
    },
    secondaryBtnText: {
        color: '#6d28d9',
        fontWeight: '800',
    },
    errorText: {
        marginTop: 12,
        color: '#dc2626',
        fontWeight: '700',
        lineHeight: 18,
    },
    footerRow: {
        marginTop: 26,
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
    },
    backBtn: {
        flex: 1,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#d3dbe8',
        paddingVertical: 13,
        alignItems: 'center',
        backgroundColor: '#f8fafc',
    },
    backBtnDisabled: {
        opacity: 0.45,
    },
    backBtnText: {
        color: '#334155',
        fontWeight: '700',
        fontSize: 14,
    },
    nextBtn: {
        flex: 1.3,
        borderRadius: 14,
        paddingVertical: 13,
        alignItems: 'center',
        backgroundColor: '#7c3aed',
        shadowColor: '#7c3aed',
        shadowOffset: { width: 0, height: 7 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
        elevation: 5,
    },
    nextBtnDisabled: {
        opacity: 0.65,
    },
    nextBtnText: {
        color: '#ffffff',
        fontWeight: '800',
    },
});
