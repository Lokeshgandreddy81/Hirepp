import React, { useMemo, useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    KeyboardAvoidingView,
    Alert,
    ActivityIndicator,
    Switch,
    LayoutAnimation,
    Platform,
    UIManager,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import client from '../api/client';
import { logger } from '../utils/logger';

const SHIFT_OPTIONS = ['Day', 'Night', 'Flexible'];
const ROLE_TYPE_OPTIONS = [
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
const ROLE_TYPE_META = {
    Student: { icon: 'school-outline', hint: 'Internships, part-time and campus roles' },
    Fresher: { icon: 'rocket-outline', hint: 'Entry-level full-time opportunities' },
    'Delivery / Logistics': { icon: 'bicycle-outline', hint: 'Last-mile, warehouse and dispatch roles' },
    'Skilled Trades': { icon: 'construct-outline', hint: 'Plumber, electrician, carpenter and field trades' },
    'Construction / Civil': { icon: 'hammer-outline', hint: 'Site execution, civil and project work' },
    'Manufacturing / Factory': { icon: 'settings-outline', hint: 'Production, machine and quality operations' },
    'Retail / Hospitality': { icon: 'storefront-outline', hint: 'Frontline retail, food and guest services' },
    'Healthcare / Care': { icon: 'medical-outline', hint: 'Clinic, care and allied health support' },
    'Security / Facility': { icon: 'shield-outline', hint: 'Security, surveillance and facility upkeep' },
    'Software / Tech': { icon: 'code-slash-outline', hint: 'Engineering, product and QA roles' },
    'Finance / Admin': { icon: 'calculator-outline', hint: 'Accounts, MIS and office operations' },
    'Sales / Marketing': { icon: 'megaphone-outline', hint: 'Revenue, growth and outreach roles' },
    'Support / Service': { icon: 'headset-outline', hint: 'Customer service and operations support' },
    Other: { icon: 'grid-outline', hint: 'Any role not listed in the categories above' },
};
const ROLE_TYPE_CONFIG = {
    Student: {
        titles: ['Intern', 'Campus Trainee', 'Library Assistant', 'Lab Assistant', 'Part-time Associate'],
        skills: ['Communication', 'Basic computer use', 'Teamwork', 'Documentation', 'Problem solving'],
        licenses: [],
    },
    Fresher: {
        titles: ['Junior Associate', 'Trainee', 'Assistant', 'Data Entry Operator', 'Operations Executive'],
        skills: ['Customer handling', 'Basic computer use', 'Documentation', 'Time management', 'Follow-through'],
        licenses: [],
    },
    'Delivery / Logistics': {
        titles: ['Delivery Executive', 'Warehouse Associate', 'Inventory Assistant', 'Picker and Packer', 'Dispatch Coordinator', 'Fleet Associate'],
        skills: ['Delivery support', 'Inventory checks', 'Packing', 'Route knowledge', 'Scanner usage', 'Dispatch handling'],
        licenses: ['Two-wheeler license', 'Light motor vehicle license'],
    },
    'Skilled Trades': {
        titles: ['Plumber', 'Electrician', 'Carpenter', 'Welder', 'HVAC Technician', 'Refrigeration Technician'],
        skills: ['Troubleshooting', 'Repair work', 'Installation', 'Safety compliance', 'Tool handling'],
        licenses: ['Trade certification', 'Electrical license', 'Safety certification'],
    },
    'Construction / Civil': {
        titles: ['Site Supervisor', 'Civil Technician', 'Mason', 'Bar Bender', 'Scaffolding Technician', 'Survey Assistant'],
        skills: ['Blueprint reading', 'Site safety', 'Concrete work', 'Material estimation', 'Team coordination'],
        licenses: ['Safety pass', 'Trade certification'],
    },
    'Manufacturing / Factory': {
        titles: ['Machine Operator', 'Production Associate', 'Quality Inspector', 'Assembly Technician', 'Maintenance Technician'],
        skills: ['Machine handling', 'SOP compliance', 'Quality checks', 'Line discipline', '5S practices'],
        licenses: ['Forklift certification', 'Machine safety certification'],
    },
    'Retail / Hospitality': {
        titles: ['Retail Associate', 'Cashier', 'Store Supervisor', 'Steward', 'Barista', 'Kitchen Assistant'],
        skills: ['POS billing', 'Customer interaction', 'Stock handling', 'Upselling', 'Service etiquette'],
        licenses: ['Food safety certification'],
    },
    'Healthcare / Care': {
        titles: ['Nursing Assistant', 'Patient Care Assistant', 'Pharmacy Assistant', 'Lab Technician', 'Ward Assistant'],
        skills: ['Patient support', 'Hygiene protocol', 'Vitals support', 'Record handling', 'Empathy'],
        licenses: ['BLS certification', 'Nursing registration', 'Lab certification'],
    },
    'Security / Facility': {
        titles: ['Security Guard', 'CCTV Operator', 'Facility Executive', 'Housekeeping Supervisor', 'Maintenance Assistant'],
        skills: ['Access control', 'Incident reporting', 'Patrolling', 'Vendor coordination', 'Emergency response'],
        licenses: ['PSARA certification', 'Fire safety certification'],
    },
    'Software / Tech': {
        titles: ['Frontend Developer', 'Backend Developer', 'QA Engineer', 'DevOps Engineer', 'Support Engineer', 'Data Analyst'],
        skills: ['JavaScript', 'React', 'Node.js', 'Testing', 'SQL', 'API integration'],
        licenses: [],
    },
    'Finance / Admin': {
        titles: ['Account Assistant', 'MIS Executive', 'Back Office Executive', 'HR Coordinator', 'Office Administrator'],
        skills: ['Excel', 'Tally or ERP', 'Data validation', 'Payroll support', 'Documentation'],
        licenses: [],
    },
    'Sales / Marketing': {
        titles: ['Sales Executive', 'Field Sales Associate', 'Inside Sales Executive', 'Business Development Executive', 'Marketing Associate'],
        skills: ['Lead generation', 'Client communication', 'Follow-ups', 'CRM updates', 'Negotiation'],
        licenses: [],
    },
    'Support / Service': {
        titles: ['Customer Support Executive', 'Service Coordinator', 'Operations Associate', 'Helpdesk Executive', 'Process Associate'],
        skills: ['Customer handling', 'Escalation handling', 'Ticket resolution', 'Documentation', 'SLA adherence'],
        licenses: [],
    },
    Other: {
        titles: [],
        skills: [],
        licenses: [],
    },
};
const COMMON_SKILLS = [
    'Communication',
    'Customer handling',
    'Inventory checks',
    'Packing',
    'Quality checks',
    'Delivery support',
    'Machine handling',
    'POS billing',
    'Basic computer use',
    'Excel',
    'Team leadership',
    'Team coordination',
    'Safety compliance',
    'Problem solving',
];
const COMMON_LICENSES = [
    'Two-wheeler license',
    'Light motor vehicle license',
    'Commercial driving license',
    'Forklift certification',
    'Food safety certification',
    'PSARA certification',
    'Trade certification',
    'Electrical license',
];
const COMMON_SCREENING_QUESTIONS = [
    'Can you start within 7 days?',
    'Are you comfortable with the selected shift?',
    'Do you have direct experience in this role?',
];
const QUICK_LOCATION_OPTIONS = ['Hyderabad', 'Bengaluru', 'Mumbai', 'Delhi NCR', 'Chennai', 'Pune'];
const QUICK_LANGUAGE_OPTIONS = ['English', 'Hindi', 'Telugu', 'Tamil', 'Kannada'];
const QUICK_SALARY_PRESETS = [
    { label: '15k-20k', min: '15000', max: '20000' },
    { label: '20k-30k', min: '20000', max: '30000' },
    { label: '30k-45k', min: '30000', max: '45000' },
    { label: '45k-60k', min: '45000', max: '60000' },
];
const QUICK_EXPERIENCE_PRESETS = [
    { label: '0-1 yrs', min: '0', max: '1' },
    { label: '1-3 yrs', min: '1', max: '3' },
    { label: '3-5 yrs', min: '3', max: '5' },
    { label: '5+ yrs', min: '5', max: '8' },
];
const COMMON_COMPANY_OPTIONS = [
    'My Company',
    'Hiring Team',
    'Construction Firm',
    'Factory Unit',
    'Retail Outlet',
    'Clinic or Hospital',
    'Facility Management Team',
    'Local Business',
    'Startup Team',
    'Enterprise Team',
];
const GENERIC_ROLE_TITLES = [
    'Operations Associate',
    'Field Executive',
    'Support Associate',
    'Sales Associate',
    'Technician',
    'Supervisor',
    'Assistant',
];
const OPENING_OPTIONS = [1, 2, 3, 5, 10];
const STEP_TITLES = ['Role', 'Setup', 'Fit', 'Review'];
const PRIORITY_ROLE_TYPES = [
    'Fresher',
    'Delivery / Logistics',
    'Skilled Trades',
    'Retail / Hospitality',
    'Software / Tech',
    'Support / Service',
];

const parseCommaList = (value = '', maxItems = 50, maxLength = 120) => (
    String(value || '')
        .split(',')
        .map((item) => String(item || '').trim())
        .filter(Boolean)
        .map((item) => (item.length > maxLength ? item.slice(0, maxLength) : item))
        .slice(0, maxItems)
);

const parseLineList = (value = '', maxItems = 20, maxLength = 250) => (
    String(value || '')
        .split('\n')
        .map((item) => String(item || '').trim())
        .filter(Boolean)
        .map((item) => (item.length > maxLength ? item.slice(0, maxLength) : item))
        .slice(0, maxItems)
);

const toggleLineToken = (currentValue = '', token = '') => {
    const nextToken = String(token || '').trim();
    if (!nextToken) return String(currentValue || '');
    const existing = parseLineList(currentValue, 40, 250);
    const hasValue = existing.some((item) => normalizeText(item) === normalizeText(nextToken));
    if (hasValue) {
        return existing.filter((item) => normalizeText(item) !== normalizeText(nextToken)).join('\n');
    }
    return [...existing, nextToken].join('\n');
};

const appendCommaToken = (currentValue = '', token = '') => {
    const nextToken = String(token || '').trim();
    if (!nextToken) return String(currentValue || '');
    const existing = parseCommaList(currentValue);
    if (existing.includes(nextToken)) return String(currentValue || '');
    return [...existing, nextToken].join(', ');
};

const toggleCommaToken = (currentValue = '', token = '') => {
    const nextToken = String(token || '').trim();
    if (!nextToken) return String(currentValue || '');
    const existing = parseCommaList(currentValue);
    if (existing.includes(nextToken)) {
        return existing.filter((item) => item !== nextToken).join(', ');
    }
    return [...existing, nextToken].join(', ');
};

const parseSalaryRange = (salaryRange = '') => {
    const matches = String(salaryRange || '').match(/\d[\d,]*/g) || [];
    if (!matches.length) return { min: '', max: '' };
    const normalized = matches.map((token) => token.replace(/,/g, ''));
    if (normalized.length === 1) {
        return { min: normalized[0], max: '' };
    }
    return { min: normalized[0], max: normalized[1] };
};

const clampNonNegativeInt = (value) => {
    const normalized = String(value || '').replace(/[^\d]/g, '');
    if (!normalized) return null;
    const numeric = Number.parseInt(normalized, 10);
    if (!Number.isFinite(numeric) || numeric < 0) return null;
    return numeric;
};

const formatNumberWithCommas = (value) => {
    const numeric = clampNonNegativeInt(value);
    if (numeric === null) return '';
    return numeric.toLocaleString('en-IN');
};

const clampText = (value = '', maxLength = 120) => {
    const normalized = String(value || '').trim();
    if (!normalized) return '';
    return normalized.length > maxLength ? normalized.slice(0, maxLength) : normalized;
};

const normalizeText = (value = '') => String(value || '').trim().toLowerCase();

const focusChoices = (options = [], selected = [], limit = 6) => {
    const normalized = [...new Set((Array.isArray(options) ? options : []).filter(Boolean))];
    if (normalized.length <= limit) return normalized;
    const selectedSet = new Set((Array.isArray(selected) ? selected : [selected]).map(normalizeText).filter(Boolean));
    const selectedItems = normalized.filter((item) => selectedSet.has(normalizeText(item)));
    const topItems = normalized.slice(0, limit);
    return [...new Set([...selectedItems, ...topItems])];
};

const hasCsvToken = (csvValue = '', token = '') => (
    parseCommaList(csvValue, 80, 120).some((item) => normalizeText(item) === normalizeText(token))
);

const hasLineToken = (lineValue = '', token = '') => (
    parseLineList(lineValue, 80, 250).some((item) => normalizeText(item) === normalizeText(token))
);

const extractApiErrorMessage = (error, fallbackMessage = 'Please review the form and try again.') => {
    const payload = error?.response?.data || error?.originalError?.response?.data || {};
    const directMessage = String(payload?.message || '').trim();
    if (directMessage) return directMessage;

    const nestedMessage = String(payload?.error?.message || '').trim();
    if (nestedMessage) return nestedMessage;

    const details = Array.isArray(payload?.error?.details) ? payload.error.details : [];
    if (details.length > 0) {
        const first = details[0] || {};
        const path = String(first?.path || '').trim();
        const message = String(first?.message || '').trim();
        if (path && message) return `${path}: ${message}`;
        if (message) return message;
    }

    const genericMessage = String(error?.message || '').trim();
    if (genericMessage) return genericMessage;

    return fallbackMessage;
};

export default function PostJobScreen({ navigation, route }) {
    const insets = useSafeAreaInsets();
    const [stepIndex, setStepIndex] = useState(0);
    const [roleType, setRoleType] = useState('');
    const [title, setTitle] = useState('');
    const [companyName, setCompanyName] = useState('');
    const [location, setLocation] = useState('');
    const [showAllRoleTypes, setShowAllRoleTypes] = useState(false);
    const [showAllRoleTitles, setShowAllRoleTitles] = useState(false);
    const [showAllCompanies, setShowAllCompanies] = useState(false);
    const [showCustomRoleInput, setShowCustomRoleInput] = useState(false);
    const [showCustomCompanyInput, setShowCustomCompanyInput] = useState(false);
    const [showCustomLocationInput, setShowCustomLocationInput] = useState(false);
    const [showAllMustHaveSkills, setShowAllMustHaveSkills] = useState(false);
    const [showAllGoodToHaveSkills, setShowAllGoodToHaveSkills] = useState(false);
    const [showAllLicenses, setShowAllLicenses] = useState(false);
    const [showAllQuestions, setShowAllQuestions] = useState(false);
    const [showCustomSkillInput, setShowCustomSkillInput] = useState(false);
    const [showCustomLicenseInput, setShowCustomLicenseInput] = useState(false);
    const [showCustomQuestionInput, setShowCustomQuestionInput] = useState(false);
    const [customSkillInput, setCustomSkillInput] = useState('');
    const [customLicenseInput, setCustomLicenseInput] = useState('');
    const [customQuestionInput, setCustomQuestionInput] = useState('');
    const [remoteAllowed, setRemoteAllowed] = useState(false);
    const [shift, setShift] = useState('Flexible');
    const [salaryMin, setSalaryMin] = useState('');
    const [salaryMax, setSalaryMax] = useState('');
    const [salaryRangeFallback, setSalaryRangeFallback] = useState('');
    const [experienceMin, setExperienceMin] = useState('');
    const [experienceMax, setExperienceMax] = useState('');
    const [openings, setOpenings] = useState('');
    const [mustHaveSkills, setMustHaveSkills] = useState('');
    const [goodToHaveSkills, setGoodToHaveSkills] = useState('');
    const [languages, setLanguages] = useState('');
    const [mandatoryLicensesText, setMandatoryLicensesText] = useState('');
    const [screeningQuestionsText, setScreeningQuestionsText] = useState('');
    const [videoUrl, setVideoUrl] = useState(null);
    const [aiLoading, setAiLoading] = useState(false);
    const [aiQuestionsLoading, setAiQuestionsLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const roleTemplate = useMemo(() => ROLE_TYPE_CONFIG[roleType] || ROLE_TYPE_CONFIG.Other, [roleType]);
    const roleTitleOptions = useMemo(
        () => [...new Set([...(roleTemplate.titles || []), ...GENERIC_ROLE_TITLES])],
        [roleTemplate.titles]
    );
    const companyOptions = useMemo(
        () => [...new Set([String(companyName || '').trim(), ...COMMON_COMPANY_OPTIONS].filter(Boolean))],
        [companyName]
    );
    const selectedMustHaveSkills = useMemo(() => parseCommaList(mustHaveSkills, 40, 120), [mustHaveSkills]);
    const selectedGoodToHaveSkills = useMemo(() => parseCommaList(goodToHaveSkills, 40, 120), [goodToHaveSkills]);
    const selectedLanguages = useMemo(() => parseCommaList(languages, 20, 60), [languages]);
    const selectedLicenses = useMemo(() => parseCommaList(mandatoryLicensesText, 40, 120), [mandatoryLicensesText]);
    const selectedQuestions = useMemo(() => parseLineList(screeningQuestionsText, 40, 250), [screeningQuestionsText]);
    const currentStepTitle = STEP_TITLES[stepIndex] || STEP_TITLES[0];
    const visibleRoleTypeOptions = useMemo(
        () => (showAllRoleTypes ? ROLE_TYPE_OPTIONS : focusChoices([...PRIORITY_ROLE_TYPES, ...ROLE_TYPE_OPTIONS], [roleType], 6)),
        [roleType, showAllRoleTypes]
    );
    const visibleRoleTitleOptions = useMemo(
        () => (showAllRoleTitles ? roleTitleOptions : focusChoices(roleTitleOptions, [title], 6)),
        [roleTitleOptions, showAllRoleTitles, title]
    );
    const visibleCompanyOptions = useMemo(
        () => (showAllCompanies ? companyOptions : focusChoices(companyOptions, [companyName], 5)),
        [companyName, companyOptions, showAllCompanies]
    );
    const fitSkillOptions = useMemo(
        () => [...new Set([...(roleTemplate.skills || []), ...COMMON_SKILLS])],
        [roleTemplate.skills]
    );
    const visibleMustHaveSkills = useMemo(
        () => (showAllMustHaveSkills ? fitSkillOptions : focusChoices(fitSkillOptions, selectedMustHaveSkills, 8)),
        [fitSkillOptions, selectedMustHaveSkills, showAllMustHaveSkills]
    );
    const visibleGoodToHaveSkills = useMemo(
        () => (showAllGoodToHaveSkills ? fitSkillOptions : focusChoices(fitSkillOptions, selectedGoodToHaveSkills, 8)),
        [fitSkillOptions, selectedGoodToHaveSkills, showAllGoodToHaveSkills]
    );
    const licenseOptions = useMemo(
        () => [...new Set([...(roleTemplate.licenses || []), ...COMMON_LICENSES])],
        [roleTemplate.licenses]
    );
    const visibleLicenseOptions = useMemo(
        () => (showAllLicenses ? licenseOptions : focusChoices(licenseOptions, selectedLicenses, 6)),
        [licenseOptions, selectedLicenses, showAllLicenses]
    );
    const visibleQuestions = useMemo(
        () => (showAllQuestions ? COMMON_SCREENING_QUESTIONS : focusChoices(COMMON_SCREENING_QUESTIONS, selectedQuestions, 2)),
        [selectedQuestions, showAllQuestions]
    );

    useEffect(() => {
        if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
            UIManager.setLayoutAnimationEnabledExperimental(true);
        }
    }, []);

    useEffect(() => {
        if (route.params?.videoUrl) {
            setVideoUrl(route.params.videoUrl);
        }

        const rawJobData = route.params?.jobData;
        if (!rawJobData || typeof rawJobData !== 'object') {
            return;
        }

        const incomingTitle = String(rawJobData.title || '').trim();
        const incomingShift = String(rawJobData.shift || '').trim();
        const incomingSalaryRange = String(rawJobData.salaryRange || '').trim();
        const incomingRequirements = Array.isArray(rawJobData.requirements) ? rawJobData.requirements : [];

        if (incomingTitle) setTitle(incomingTitle);
        if (SHIFT_OPTIONS.includes(incomingShift)) setShift(incomingShift);
        if (incomingSalaryRange) {
            const parsed = parseSalaryRange(incomingSalaryRange);
            if (parsed.min) setSalaryMin(parsed.min);
            if (parsed.max) setSalaryMax(parsed.max);
            setSalaryRangeFallback(incomingSalaryRange);
        }
        if (incomingRequirements.length) {
            setMustHaveSkills(incomingRequirements.join(', '));
        }
    }, [route.params]);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const { data } = await client.get('/api/users/profile', {
                    __skipApiErrorHandler: true,
                    params: { role: 'employer' },
                });
                const profile = data?.profile || {};
                const profileCompany = String(profile.companyName || '').trim();

                if (profileCompany && !companyName) {
                    setCompanyName(profileCompany);
                }
            } catch (_error) {
                // Keep form available even when profile prefill is unavailable.
            }
        };
        fetchProfile();
    }, [companyName]);

    useEffect(() => {
        if (!roleType) return;
        if (!String(title || '').trim() && roleTemplate.titles.length > 0) {
            setTitle(roleTemplate.titles[0]);
        }
        if (!String(mustHaveSkills || '').trim() && roleTemplate.skills.length > 0) {
            setMustHaveSkills(roleTemplate.skills.join(', '));
        }
        if (!String(mandatoryLicensesText || '').trim() && roleTemplate.licenses.length > 0) {
            setMandatoryLicensesText(roleTemplate.licenses.join(', '));
        }
    }, [mandatoryLicensesText, mustHaveSkills, roleTemplate.licenses, roleTemplate.skills, roleTemplate.titles, roleType, title]);

    const computedSalaryRange = useMemo(() => {
        const normalizedMin = formatNumberWithCommas(salaryMin);
        const normalizedMax = formatNumberWithCommas(salaryMax);
        if (normalizedMin && normalizedMax) return `Rs ${normalizedMin} - Rs ${normalizedMax}`;
        if (normalizedMin) return `Rs ${normalizedMin}+`;
        if (normalizedMax) return `Up to Rs ${normalizedMax}`;
        return String(salaryRangeFallback || '').trim();
    }, [salaryMin, salaryMax, salaryRangeFallback]);

    const handleSuggestRequirements = async () => {
        const safeTitle = String(title || '').trim();
        if (!safeTitle) {
            Alert.alert('Add role title', 'Enter the role title first to generate skill suggestions.');
            return;
        }

        setAiLoading(true);
        try {
            const { data } = await client.post('/api/jobs/suggest', { jobTitle: safeTitle }, { __skipApiErrorHandler: true });
            const structured = data?.data && typeof data.data === 'object' ? data.data : {};
            const suggestions = Array.isArray(structured.requirements)
                ? structured.requirements
                : (Array.isArray(data?.suggestions)
                    ? data.suggestions
                    : String(data?.suggestions || '')
                        .split(',')
                        .map((entry) => entry.trim())
                        .filter(Boolean));
            const suggestedQuestions = Array.isArray(structured.screeningQuestions)
                ? structured.screeningQuestions.map((entry) => String(entry || '').trim()).filter(Boolean)
                : [];
            const suggestedShifts = Array.isArray(structured.shiftSuggestions)
                ? structured.shiftSuggestions.map((entry) => String(entry || '').trim())
                : [];
            const suggestedShift = suggestedShifts.find((entry) => SHIFT_OPTIONS.includes(entry));

            if (!suggestions.length && !suggestedQuestions.length) {
                Alert.alert('No suggestions yet', 'Try adding details manually for now.');
                return;
            }

            if (suggestions.length) {
                setMustHaveSkills(suggestions.slice(0, 12).join(', '));
            }
            if (suggestedQuestions.length) {
                setScreeningQuestionsText((prev) => {
                    const existing = parseLineList(prev, 40, 250);
                    const merged = [...new Set([...existing, ...suggestedQuestions])].slice(0, 20);
                    return merged.join('\n');
                });
            }
            if (suggestedShift) {
                setShift(suggestedShift);
            }
        } catch (_error) {
            Alert.alert('Suggestion unavailable', 'Could not generate job suggestions right now. You can continue manually.');
        } finally {
            setAiLoading(false);
        }
    };

    const handleSuggestQuestions = async () => {
        const safeTitle = String(title || '').trim();
        if (!safeTitle) {
            Alert.alert('Add role title', 'Enter the role title first to generate screening questions.');
            return;
        }

        setAiQuestionsLoading(true);
        try {
            const skillTokens = parseCommaList(mustHaveSkills, 12, 80);
            const { data } = await client.post('/api/features/ai/interview-questions', {
                jobTitle: safeTitle,
                skills: skillTokens,
            }, { __skipApiErrorHandler: true });

            const questions = Array.isArray(data?.questions)
                ? data.questions.map((entry) => String(entry || '').trim()).filter(Boolean)
                : String(data?.questions || '')
                    .split(',')
                    .map((entry) => entry.trim())
                    .filter(Boolean);
            if (!questions.length) {
                Alert.alert('No questions yet', 'Try adding screening questions manually for now.');
                return;
            }

            setScreeningQuestionsText((prev) => {
                const existing = parseLineList(prev, 40, 250);
                const merged = [...new Set([...existing, ...questions])].slice(0, 20);
                return merged.join('\n');
            });
        } catch (_error) {
            Alert.alert('Suggestion unavailable', 'Could not generate screening questions right now. You can continue manually.');
        } finally {
            setAiQuestionsLoading(false);
        }
    };

    const handleAddCustomSkill = () => {
        const token = clampText(customSkillInput, 80);
        if (!token) return;
        setMustHaveSkills((prev) => appendCommaToken(prev, token));
        setCustomSkillInput('');
    };

    const handleAddCustomLicense = () => {
        const token = clampText(customLicenseInput, 80);
        if (!token) return;
        setMandatoryLicensesText((prev) => appendCommaToken(prev, token));
        setCustomLicenseInput('');
    };

    const handleAddCustomQuestion = () => {
        const token = clampText(customQuestionInput, 200);
        if (!token) return;
        setScreeningQuestionsText((prev) => (prev ? `${prev}\n${token}` : token));
        setCustomQuestionInput('');
    };

    const validateStep = (index) => {
        const safeTitle = clampText(title, 120);
        const safeCompanyName = clampText(companyName, 120);
        const safeLocation = clampText(location, 120);
        const safeSalaryRange = clampText(computedSalaryRange, 120);

        if (index === 0) {
            if (!String(roleType || '').trim()) {
                Alert.alert('Select role type', 'Choose a role type to continue.');
                return false;
            }
            if (!safeTitle) {
                Alert.alert('Select role title', 'Pick a role title to continue.');
                return false;
            }
            if (!safeCompanyName) {
                Alert.alert('Select company name', 'Pick your organization to continue.');
                return false;
            }
            return true;
        }

        if (index === 1) {
            if (!safeLocation) {
                Alert.alert('Select location', 'Choose where this role is based.');
                return false;
            }
            if (!safeSalaryRange) {
                Alert.alert('Select salary range', 'Pick a salary band to continue.');
                return false;
            }
            return true;
        }

        if (index === 2) {
            if (selectedMustHaveSkills.length === 0) {
                Alert.alert('Select must-have skills', 'Choose at least one must-have skill.');
                return false;
            }
            return true;
        }

        return true;
    };

    const handleNextStep = () => {
        if (!validateStep(stepIndex)) return;
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setStepIndex((prev) => Math.min(prev + 1, STEP_TITLES.length - 1));
    };

    const handlePreviousStep = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setStepIndex((prev) => Math.max(prev - 1, 0));
    };

    const handlePostJob = async () => {
        const safeTitle = clampText(title, 120);
        const safeCompanyName = clampText(companyName, 120);
        const safeLocation = clampText(location, 120);
        const safeSalaryRange = clampText(computedSalaryRange, 120);
        const mustHave = parseCommaList(mustHaveSkills, 30, 120).map((item) => clampText(item, 120)).filter(Boolean);
        const goodToHave = parseCommaList(goodToHaveSkills, 20, 120)
            .map((item) => clampText(`Nice to have: ${item}`, 120))
            .filter(Boolean);
        const languageList = parseCommaList(languages, 10, 60);

        const minExpValue = clampNonNegativeInt(experienceMin);
        const maxExpValue = clampNonNegativeInt(experienceMax);
        const openingsValue = clampNonNegativeInt(openings);

        const metadataRequirements = [];
        if (minExpValue !== null || maxExpValue !== null) {
            const minLabel = minExpValue !== null ? String(minExpValue) : '0';
            const maxLabel = maxExpValue !== null ? String(maxExpValue) : 'plus';
            metadataRequirements.push(clampText(`Experience: ${minLabel}-${maxLabel} years`, 120));
        }
        if (languageList.length) {
            metadataRequirements.push(clampText(`Language: ${languageList.join(', ')}`, 120));
        }
        if (openingsValue !== null && openingsValue > 0) {
            metadataRequirements.push(clampText(`Openings: ${openingsValue}`, 120));
        }
        metadataRequirements.push(clampText(`Role type: ${roleType || 'Other'}`, 120));

        const requirements = [...mustHave, ...goodToHave, ...metadataRequirements]
            .map((item) => clampText(item, 120))
            .filter(Boolean)
            .slice(0, 50);
        const mandatoryLicenses = parseCommaList(mandatoryLicensesText, 20, 120)
            .map((item) => clampText(item, 120))
            .filter(Boolean);
        const screeningQuestions = parseLineList(screeningQuestionsText, 20, 250)
            .map((item) => clampText(item, 250))
            .filter(Boolean);

        if (!String(roleType || '').trim()) {
            Alert.alert('Select role type', 'Choose a role type first for better matching.');
            return;
        }
        if (!safeTitle || !safeCompanyName || !safeLocation) {
            Alert.alert('Missing basic info', 'Role title, company name and location are required.');
            return;
        }
        if (!safeSalaryRange) {
            Alert.alert('Missing salary', 'Add salary range so matching can rank candidates correctly.');
            return;
        }
        if (!mustHave.length) {
            Alert.alert('Missing must-have skills', 'Add at least one must-have skill for accurate matchmaking.');
            return;
        }
        if (minExpValue !== null && maxExpValue !== null && maxExpValue < minExpValue) {
            Alert.alert('Invalid experience range', 'Maximum experience must be greater than minimum experience.');
            return;
        }

        const minSalaryValue = clampNonNegativeInt(salaryMin);
        const maxSalaryValue = clampNonNegativeInt(salaryMax);

        const payload = {
            title: safeTitle,
            companyName: safeCompanyName,
            salaryRange: safeSalaryRange,
            location: safeLocation,
            requirements,
            screeningQuestions,
            shift,
            mandatoryLicenses,
            remoteAllowed: Boolean(remoteAllowed),
            ...(minSalaryValue !== null ? { minSalary: minSalaryValue } : {}),
            ...(maxSalaryValue !== null ? { maxSalary: maxSalaryValue } : {}),
        };

        setSaving(true);
        try {
            await client.post('/api/jobs', payload, {
                __skipApiErrorHandler: true,
                __allowWhenCircuitOpen: true,
            });
            Alert.alert('Job posted', 'Your job post is now live in My Jobs.', [
                { text: 'Open My Jobs', onPress: () => navigation.navigate('MainTab', { screen: 'My Jobs' }) },
            ]);
        } catch (error) {
            const reason = extractApiErrorMessage(error, 'Please review the form and try again.');
            logger.warn('Job post failed:', reason);
            Alert.alert('Could not post job', reason);
        } finally {
            setSaving(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                style={styles.container}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 12}
            >
                <View style={styles.header}>
                    <TouchableOpacity
                        onPress={() => {
                            if (navigation.canGoBack()) {
                                navigation.goBack();
                                return;
                            }
                            navigation.navigate('MainTab', { screen: 'My Jobs' });
                        }}
                        style={styles.backButton}
                        activeOpacity={0.85}
                    >
                        <Ionicons name="arrow-back" size={22} color="#ffffff" />
                    </TouchableOpacity>
                    <View style={styles.headerTextWrap}>
                        <Text style={styles.headerTitle}>Post Job</Text>
                        <Text style={styles.headerSubtitle}>Precise details = better candidate ranking</Text>
                    </View>
                </View>

                <ScrollView
                    contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 16) + 24 }]}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
                >
                    <View style={styles.noticeCard}>
                        <Ionicons name="checkmark-done-circle-outline" size={16} color="#6d28d9" />
                        <Text style={styles.noticeText}>
                            Choice-first flow: mostly tap to select. Typing is only optional when your option is not listed.
                        </Text>
                    </View>

                <View style={styles.stepHeader}>
                    <Text style={styles.stepMetaText}>Step {stepIndex + 1} of {STEP_TITLES.length}</Text>
                    <Text style={styles.stepTitle}>{currentStepTitle}</Text>
                    <View style={styles.stepPillRow}>
                        {STEP_TITLES.map((label, index) => {
                            const active = stepIndex === index;
                            const done = stepIndex > index;
                            return (
                                <View key={label} style={[styles.stepPill, active ? styles.stepPillActive : null, done ? styles.stepPillDone : null]}>
                                    <Text style={[styles.stepPillText, active || done ? styles.stepPillTextActive : null]}>
                                        {label}
                                    </Text>
                                </View>
                            );
                        })}
                    </View>
                </View>

                {stepIndex === 0 ? (
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Select Role & Organization</Text>
                        <Text style={styles.label}>Role Type *</Text>
                        <View style={styles.roleTypeGrid}>
                            {visibleRoleTypeOptions.map((item) => {
                                const selected = roleType === item;
                                const meta = ROLE_TYPE_META[item] || ROLE_TYPE_META.Other;
                                return (
                                    <TouchableOpacity
                                        key={item}
                                        style={[styles.roleTypeCard, selected ? styles.roleTypeCardActive : null]}
                                        onPress={() => {
                                            const roleChanged = normalizeText(roleType) !== normalizeText(item);
                                            setRoleType(item);
                                            setShowAllRoleTitles(false);
                                            setShowAllMustHaveSkills(false);
                                            setShowAllGoodToHaveSkills(false);
                                            setShowAllLicenses(false);
                                            const nextTemplate = ROLE_TYPE_CONFIG[item] || ROLE_TYPE_CONFIG.Other;
                                            if (roleChanged) {
                                                setTitle(String(nextTemplate.titles?.[0] || '').trim());
                                                setMustHaveSkills(Array.isArray(nextTemplate.skills) ? nextTemplate.skills.join(', ') : '');
                                                setGoodToHaveSkills('');
                                                setMandatoryLicensesText(
                                                    Array.isArray(nextTemplate.licenses) && nextTemplate.licenses.length > 0
                                                        ? nextTemplate.licenses.join(', ')
                                                        : ''
                                                );
                                            } else if (!Array.isArray(nextTemplate.licenses) || nextTemplate.licenses.length === 0) {
                                                setMandatoryLicensesText('');
                                            } else if (!String(mandatoryLicensesText || '').trim()) {
                                                setMandatoryLicensesText(nextTemplate.licenses.join(', '));
                                            }
                                        }}
                                        activeOpacity={0.85}
                                    >
                                        <View style={[styles.roleTypeIconWrap, selected ? styles.roleTypeIconWrapActive : null]}>
                                            <Ionicons name={meta.icon} size={16} color={selected ? '#6d28d9' : '#475569'} />
                                        </View>
                                        <View style={styles.roleTypeTextWrap}>
                                            <Text style={[styles.roleTypeName, selected ? styles.roleTypeNameActive : null]}>{item}</Text>
                                            <Text style={[styles.roleTypeHint, selected ? styles.roleTypeHintActive : null]}>{meta.hint}</Text>
                                        </View>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                        {ROLE_TYPE_OPTIONS.length > visibleRoleTypeOptions.length ? (
                            <TouchableOpacity style={styles.linkButton} onPress={() => setShowAllRoleTypes(true)} activeOpacity={0.82}>
                                <Text style={styles.linkButtonText}>Show all role categories</Text>
                            </TouchableOpacity>
                        ) : null}
                        {showAllRoleTypes ? (
                            <TouchableOpacity style={styles.linkButton} onPress={() => setShowAllRoleTypes(false)} activeOpacity={0.82}>
                                <Text style={styles.linkButtonText}>Show fewer categories</Text>
                            </TouchableOpacity>
                        ) : null}
                        {roleType ? (
                            <View style={styles.selectedRoleBanner}>
                                <Text style={styles.selectedRoleTitle}>{roleType} selected</Text>
                                <Text style={styles.selectedRoleHint}>Pick one role title and continue. You can add extras later.</Text>
                            </View>
                        ) : null}

                        <Text style={styles.label}>Role Title *</Text>
                        <View style={styles.inlineChips}>
                            {visibleRoleTitleOptions.map((roleTitle) => {
                                const selected = normalizeText(title) === normalizeText(roleTitle);
                                return (
                                    <TouchableOpacity
                                        key={roleTitle}
                                        style={[styles.inlineChip, selected ? styles.inlineChipActive : null]}
                                        onPress={() => {
                                            setTitle(roleTitle);
                                            setShowCustomRoleInput(false);
                                        }}
                                        activeOpacity={0.82}
                                    >
                                        <Text style={[styles.inlineChipText, selected ? styles.inlineChipTextActive : null]}>{roleTitle}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                        {roleTitleOptions.length > visibleRoleTitleOptions.length ? (
                            <TouchableOpacity style={styles.linkButton} onPress={() => setShowAllRoleTitles(true)} activeOpacity={0.82}>
                                <Text style={styles.linkButtonText}>Show more role titles</Text>
                            </TouchableOpacity>
                        ) : null}
                        {showAllRoleTitles ? (
                            <TouchableOpacity style={styles.linkButton} onPress={() => setShowAllRoleTitles(false)} activeOpacity={0.82}>
                                <Text style={styles.linkButtonText}>Show fewer role titles</Text>
                            </TouchableOpacity>
                        ) : null}
                        <TouchableOpacity
                            style={styles.linkButton}
                            onPress={() => setShowCustomRoleInput((prev) => !prev)}
                            activeOpacity={0.82}
                        >
                            <Text style={styles.linkButtonText}>{showCustomRoleInput ? 'Hide custom role' : 'Can’t find role? Add custom'}</Text>
                        </TouchableOpacity>
                        {showCustomRoleInput ? (
                            <TextInput
                                style={styles.input}
                                placeholder="Type custom role title"
                                placeholderTextColor="#94a3b8"
                                value={title}
                                onChangeText={setTitle}
                            />
                        ) : null}

                        <Text style={styles.label}>Company / Organization *</Text>
                        <View style={styles.inlineChips}>
                            {visibleCompanyOptions.map((item) => {
                                const selected = normalizeText(companyName) === normalizeText(item);
                                return (
                                    <TouchableOpacity
                                        key={item}
                                        style={[styles.inlineChip, selected ? styles.inlineChipActive : null]}
                                        onPress={() => {
                                            setCompanyName(item);
                                            setShowCustomCompanyInput(false);
                                        }}
                                        activeOpacity={0.82}
                                    >
                                        <Text style={[styles.inlineChipText, selected ? styles.inlineChipTextActive : null]}>{item}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                        {companyOptions.length > visibleCompanyOptions.length ? (
                            <TouchableOpacity style={styles.linkButton} onPress={() => setShowAllCompanies(true)} activeOpacity={0.82}>
                                <Text style={styles.linkButtonText}>Show more organizations</Text>
                            </TouchableOpacity>
                        ) : null}
                        {showAllCompanies ? (
                            <TouchableOpacity style={styles.linkButton} onPress={() => setShowAllCompanies(false)} activeOpacity={0.82}>
                                <Text style={styles.linkButtonText}>Show fewer organizations</Text>
                            </TouchableOpacity>
                        ) : null}
                        <TouchableOpacity
                            style={styles.linkButton}
                            onPress={() => setShowCustomCompanyInput((prev) => !prev)}
                            activeOpacity={0.82}
                        >
                            <Text style={styles.linkButtonText}>{showCustomCompanyInput ? 'Hide custom company' : 'Use custom company name'}</Text>
                        </TouchableOpacity>
                        {showCustomCompanyInput ? (
                            <TextInput
                                style={styles.input}
                                placeholder="Type company name"
                                placeholderTextColor="#94a3b8"
                                value={companyName}
                                onChangeText={setCompanyName}
                            />
                        ) : null}
                    </View>
                ) : null}

                {stepIndex === 1 ? (
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Select Work Setup</Text>
                        <Text style={styles.label}>Location *</Text>
                        <View style={styles.inlineChips}>
                            {QUICK_LOCATION_OPTIONS.map((city) => {
                                const selected = normalizeText(location) === normalizeText(city);
                                return (
                                    <TouchableOpacity
                                        key={city}
                                        style={[styles.inlineChip, selected ? styles.inlineChipActive : null]}
                                        onPress={() => {
                                            setLocation(city);
                                            setShowCustomLocationInput(false);
                                        }}
                                        activeOpacity={0.82}
                                    >
                                        <Text style={[styles.inlineChipText, selected ? styles.inlineChipTextActive : null]}>
                                            {city}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                        <TouchableOpacity
                            style={styles.linkButton}
                            onPress={() => setShowCustomLocationInput((prev) => !prev)}
                            activeOpacity={0.82}
                        >
                            <Text style={styles.linkButtonText}>{showCustomLocationInput ? 'Hide custom location' : 'Use custom location'}</Text>
                        </TouchableOpacity>
                        {showCustomLocationInput ? (
                            <TextInput
                                style={styles.input}
                                placeholder="Type city / area"
                                placeholderTextColor="#94a3b8"
                                value={location}
                                onChangeText={setLocation}
                            />
                        ) : null}

                        <Text style={styles.label}>Shift *</Text>
                        <View style={styles.chipWrap}>
                            {SHIFT_OPTIONS.map((item) => {
                                const selected = shift === item;
                                return (
                                    <TouchableOpacity
                                        key={item}
                                        style={[styles.choiceChip, selected && styles.choiceChipActive]}
                                        onPress={() => setShift(item)}
                                        activeOpacity={0.85}
                                    >
                                        <Text style={[styles.choiceChipText, selected && styles.choiceChipTextActive]}>{item}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        <Text style={styles.label}>Openings (Optional)</Text>
                        <View style={styles.inlineChips}>
                            {OPENING_OPTIONS.map((count) => {
                                const selected = String(openings) === String(count);
                                return (
                                    <TouchableOpacity
                                        key={String(count)}
                                        style={[styles.inlineChip, selected ? styles.inlineChipActive : null]}
                                        onPress={() => setOpenings(String(count))}
                                        activeOpacity={0.82}
                                    >
                                        <Text style={[styles.inlineChipText, selected ? styles.inlineChipTextActive : null]}>{count}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        <View style={styles.switchRow}>
                            <View style={styles.switchTextWrap}>
                                <Text style={styles.switchTitle}>Remote Allowed</Text>
                                <Text style={styles.switchHint}>Enable only if this role can be done remotely.</Text>
                            </View>
                            <Switch
                                value={remoteAllowed}
                                onValueChange={setRemoteAllowed}
                                trackColor={{ false: '#d1d5db', true: '#c4b5fd' }}
                                thumbColor={remoteAllowed ? '#7c3aed' : '#f8fafc'}
                            />
                        </View>

                        <Text style={styles.label}>Salary Band *</Text>
                        <View style={styles.inlineChips}>
                            {QUICK_SALARY_PRESETS.map((preset) => {
                                const selected = normalizeText(salaryMin) === normalizeText(preset.min) && normalizeText(salaryMax) === normalizeText(preset.max);
                                return (
                                    <TouchableOpacity
                                        key={preset.label}
                                        style={[styles.inlineChip, selected ? styles.inlineChipActive : null]}
                                        onPress={() => {
                                            setSalaryMin(preset.min);
                                            setSalaryMax(preset.max);
                                        }}
                                        activeOpacity={0.82}
                                    >
                                        <Text style={[styles.inlineChipText, selected ? styles.inlineChipTextActive : null]}>{preset.label}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                        <Text style={styles.rangePreviewLabel}>Selected Salary Range</Text>
                        <View style={styles.rangePreview}>
                            <Text style={styles.rangePreviewText}>{computedSalaryRange || 'Not set yet'}</Text>
                        </View>

                        <Text style={styles.label}>Experience Range *</Text>
                        <View style={styles.inlineChips}>
                            {QUICK_EXPERIENCE_PRESETS.map((preset) => {
                                const selected = normalizeText(experienceMin) === normalizeText(preset.min) && normalizeText(experienceMax) === normalizeText(preset.max);
                                return (
                                    <TouchableOpacity
                                        key={preset.label}
                                        style={[styles.inlineChip, selected ? styles.inlineChipActive : null]}
                                        onPress={() => {
                                            setExperienceMin(preset.min);
                                            setExperienceMax(preset.max);
                                        }}
                                        activeOpacity={0.82}
                                    >
                                        <Text style={[styles.inlineChipText, selected ? styles.inlineChipTextActive : null]}>{preset.label}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        <Text style={styles.label}>Preferred Languages (Optional)</Text>
                        <View style={styles.inlineChips}>
                            {QUICK_LANGUAGE_OPTIONS.map((item) => {
                                const selected = hasCsvToken(languages, item);
                                return (
                                    <TouchableOpacity
                                        key={item}
                                        style={[styles.inlineChip, selected ? styles.inlineChipActive : null]}
                                        onPress={() => setLanguages((prev) => toggleCommaToken(prev, item))}
                                        activeOpacity={0.82}
                                    >
                                        <Text style={[styles.inlineChipText, selected ? styles.inlineChipTextActive : null]}>{item}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>
                ) : null}

                {stepIndex === 2 ? (
                    <View style={styles.card}>
                        <View style={styles.cardTitleRow}>
                            <Text style={styles.cardTitle}>Candidate Fit Choices</Text>
                            <View style={styles.aiActionsRow}>
                                <TouchableOpacity
                                    style={styles.aiButton}
                                    onPress={handleSuggestRequirements}
                                    activeOpacity={0.85}
                                    disabled={aiLoading}
                                >
                                    <Ionicons name="sparkles" size={15} color="#4f46e5" />
                                    <Text style={styles.aiButtonText}>{aiLoading ? 'Thinking' : 'AI Skills'}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.aiButton}
                                    onPress={handleSuggestQuestions}
                                    activeOpacity={0.85}
                                    disabled={aiQuestionsLoading}
                                >
                                    <Ionicons name="help-buoy-outline" size={15} color="#4f46e5" />
                                    <Text style={styles.aiButtonText}>{aiQuestionsLoading ? 'Thinking' : 'AI Questions'}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        <Text style={styles.label}>Must-have Skills *</Text>
                        <View style={styles.inlineChips}>
                            {visibleMustHaveSkills.map((skill) => {
                                const selected = hasCsvToken(mustHaveSkills, skill);
                                return (
                                    <TouchableOpacity
                                        key={skill}
                                        style={[styles.inlineChip, selected ? styles.inlineChipActive : null]}
                                        onPress={() => setMustHaveSkills((prev) => toggleCommaToken(prev, skill))}
                                        activeOpacity={0.82}
                                    >
                                        <Text style={[styles.inlineChipText, selected ? styles.inlineChipTextActive : null]}>{skill}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                        {fitSkillOptions.length > visibleMustHaveSkills.length ? (
                            <TouchableOpacity style={styles.linkButton} onPress={() => setShowAllMustHaveSkills(true)} activeOpacity={0.82}>
                                <Text style={styles.linkButtonText}>Show more must-have skills</Text>
                            </TouchableOpacity>
                        ) : null}
                        {showAllMustHaveSkills ? (
                            <TouchableOpacity style={styles.linkButton} onPress={() => setShowAllMustHaveSkills(false)} activeOpacity={0.82}>
                                <Text style={styles.linkButtonText}>Show fewer must-have skills</Text>
                            </TouchableOpacity>
                        ) : null}
                        <TouchableOpacity
                            style={styles.linkButton}
                            onPress={() => setShowCustomSkillInput((prev) => !prev)}
                            activeOpacity={0.82}
                        >
                            <Text style={styles.linkButtonText}>{showCustomSkillInput ? 'Hide custom skill' : 'Add custom skill'}</Text>
                        </TouchableOpacity>
                        {showCustomSkillInput ? (
                            <View style={styles.customInputRow}>
                                <TextInput
                                    style={[styles.input, styles.customInlineInput]}
                                    placeholder="Type custom skill"
                                    placeholderTextColor="#94a3b8"
                                    value={customSkillInput}
                                    onChangeText={setCustomSkillInput}
                                />
                                <TouchableOpacity style={styles.addButton} onPress={handleAddCustomSkill} activeOpacity={0.85}>
                                    <Text style={styles.addButtonText}>Add</Text>
                                </TouchableOpacity>
                            </View>
                        ) : null}

                        <Text style={styles.label}>Good-to-have Skills</Text>
                        <View style={styles.inlineChips}>
                            {visibleGoodToHaveSkills.map((skill) => {
                                const selected = hasCsvToken(goodToHaveSkills, skill);
                                return (
                                    <TouchableOpacity
                                        key={`good-${skill}`}
                                        style={[styles.inlineChip, selected ? styles.inlineChipActive : null]}
                                        onPress={() => setGoodToHaveSkills((prev) => toggleCommaToken(prev, skill))}
                                        activeOpacity={0.82}
                                    >
                                        <Text style={[styles.inlineChipText, selected ? styles.inlineChipTextActive : null]}>{skill}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                        {fitSkillOptions.length > visibleGoodToHaveSkills.length ? (
                            <TouchableOpacity style={styles.linkButton} onPress={() => setShowAllGoodToHaveSkills(true)} activeOpacity={0.82}>
                                <Text style={styles.linkButtonText}>Show more optional skills</Text>
                            </TouchableOpacity>
                        ) : null}
                        {showAllGoodToHaveSkills ? (
                            <TouchableOpacity style={styles.linkButton} onPress={() => setShowAllGoodToHaveSkills(false)} activeOpacity={0.82}>
                                <Text style={styles.linkButtonText}>Show fewer optional skills</Text>
                            </TouchableOpacity>
                        ) : null}

                        <Text style={styles.label}>Mandatory Licenses / Certifications</Text>
                        <View style={styles.inlineChips}>
                            {visibleLicenseOptions.map((license) => {
                                const selected = hasCsvToken(mandatoryLicensesText, license);
                                return (
                                    <TouchableOpacity
                                        key={license}
                                        style={[styles.inlineChip, selected ? styles.inlineChipActive : null]}
                                        onPress={() => setMandatoryLicensesText((prev) => toggleCommaToken(prev, license))}
                                        activeOpacity={0.82}
                                    >
                                        <Text style={[styles.inlineChipText, selected ? styles.inlineChipTextActive : null]}>{license}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                        {licenseOptions.length > visibleLicenseOptions.length ? (
                            <TouchableOpacity style={styles.linkButton} onPress={() => setShowAllLicenses(true)} activeOpacity={0.82}>
                                <Text style={styles.linkButtonText}>Show more licenses</Text>
                            </TouchableOpacity>
                        ) : null}
                        {showAllLicenses ? (
                            <TouchableOpacity style={styles.linkButton} onPress={() => setShowAllLicenses(false)} activeOpacity={0.82}>
                                <Text style={styles.linkButtonText}>Show fewer licenses</Text>
                            </TouchableOpacity>
                        ) : null}
                        <TouchableOpacity
                            style={styles.linkButton}
                            onPress={() => setShowCustomLicenseInput((prev) => !prev)}
                            activeOpacity={0.82}
                        >
                            <Text style={styles.linkButtonText}>{showCustomLicenseInput ? 'Hide custom license' : 'Add custom license'}</Text>
                        </TouchableOpacity>
                        {showCustomLicenseInput ? (
                            <View style={styles.customInputRow}>
                                <TextInput
                                    style={[styles.input, styles.customInlineInput]}
                                    placeholder="Type custom license"
                                    placeholderTextColor="#94a3b8"
                                    value={customLicenseInput}
                                    onChangeText={setCustomLicenseInput}
                                />
                                <TouchableOpacity style={styles.addButton} onPress={handleAddCustomLicense} activeOpacity={0.85}>
                                    <Text style={styles.addButtonText}>Add</Text>
                                </TouchableOpacity>
                            </View>
                        ) : null}

                        <Text style={styles.label}>Screening Questions (Optional)</Text>
                        <View style={styles.inlineChips}>
                            {visibleQuestions.map((question) => {
                                const selected = hasLineToken(screeningQuestionsText, question);
                                return (
                                    <TouchableOpacity
                                        key={question}
                                        style={[styles.inlineChip, selected ? styles.inlineChipActive : null]}
                                        onPress={() => setScreeningQuestionsText((prev) => toggleLineToken(prev, question))}
                                        activeOpacity={0.82}
                                    >
                                        <Text style={[styles.inlineChipText, selected ? styles.inlineChipTextActive : null]}>{question}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                        {COMMON_SCREENING_QUESTIONS.length > visibleQuestions.length ? (
                            <TouchableOpacity style={styles.linkButton} onPress={() => setShowAllQuestions(true)} activeOpacity={0.82}>
                                <Text style={styles.linkButtonText}>Show all default questions</Text>
                            </TouchableOpacity>
                        ) : null}
                        {showAllQuestions ? (
                            <TouchableOpacity style={styles.linkButton} onPress={() => setShowAllQuestions(false)} activeOpacity={0.82}>
                                <Text style={styles.linkButtonText}>Show fewer questions</Text>
                            </TouchableOpacity>
                        ) : null}
                        <TouchableOpacity
                            style={styles.linkButton}
                            onPress={() => setShowCustomQuestionInput((prev) => !prev)}
                            activeOpacity={0.82}
                        >
                            <Text style={styles.linkButtonText}>{showCustomQuestionInput ? 'Hide custom question' : 'Add custom question'}</Text>
                        </TouchableOpacity>
                        {showCustomQuestionInput ? (
                            <View style={styles.customInputRow}>
                                <TextInput
                                    style={[styles.input, styles.customInlineInput]}
                                    placeholder="Type custom question"
                                    placeholderTextColor="#94a3b8"
                                    value={customQuestionInput}
                                    onChangeText={setCustomQuestionInput}
                                />
                                <TouchableOpacity style={styles.addButton} onPress={handleAddCustomQuestion} activeOpacity={0.85}>
                                    <Text style={styles.addButtonText}>Add</Text>
                                </TouchableOpacity>
                            </View>
                        ) : null}
                    </View>
                ) : null}

                {stepIndex === 3 ? (
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Review Before Publish</Text>
                        <View style={styles.summaryRow}>
                            <Text style={styles.summaryLabel}>Role</Text>
                            <Text style={styles.summaryValue}>{title || 'Not selected'}</Text>
                        </View>
                        <View style={styles.summaryRow}>
                            <Text style={styles.summaryLabel}>Company</Text>
                            <Text style={styles.summaryValue}>{companyName || 'Not selected'}</Text>
                        </View>
                        <View style={styles.summaryRow}>
                            <Text style={styles.summaryLabel}>Location</Text>
                            <Text style={styles.summaryValue}>{location || 'Not selected'}</Text>
                        </View>
                        <View style={styles.summaryRow}>
                            <Text style={styles.summaryLabel}>Salary</Text>
                            <Text style={styles.summaryValue}>{computedSalaryRange || 'Not selected'}</Text>
                        </View>
                        <View style={styles.summaryRow}>
                            <Text style={styles.summaryLabel}>Experience</Text>
                            <Text style={styles.summaryValue}>
                                {experienceMin || experienceMax ? `${experienceMin || 0}-${experienceMax || 'plus'} years` : 'Not selected'}
                            </Text>
                        </View>
                        <View style={styles.summaryBlock}>
                            <Text style={styles.summaryLabel}>Must-have Skills</Text>
                            <Text style={styles.summaryValue}>{selectedMustHaveSkills.join(', ') || 'None selected'}</Text>
                        </View>
                        <View style={styles.summaryBlock}>
                            <Text style={styles.summaryLabel}>Licenses</Text>
                            <Text style={styles.summaryValue}>{selectedLicenses.join(', ') || 'None selected'}</Text>
                        </View>
                        <View style={styles.summaryBlock}>
                            <Text style={styles.summaryLabel}>Questions</Text>
                            <Text style={styles.summaryValue}>{selectedQuestions.join(' | ') || 'None selected'}</Text>
                        </View>
                    </View>
                ) : null}

                {videoUrl ? (
                    <View style={styles.videoCard}>
                        <Ionicons name="videocam" size={18} color="#ffffff" />
                        <Text style={styles.videoText}>Video introduction attached for this post</Text>
                    </View>
                ) : null}

                    <View style={styles.stepFooter}>
                        {stepIndex > 0 ? (
                            <TouchableOpacity style={styles.secondaryButton} onPress={handlePreviousStep} activeOpacity={0.85}>
                                <Text style={styles.secondaryButtonText}>Back</Text>
                            </TouchableOpacity>
                        ) : <View style={styles.secondaryButtonPlaceholder} />}

                        {stepIndex < STEP_TITLES.length - 1 ? (
                            <TouchableOpacity style={styles.primaryStepButton} onPress={handleNextStep} activeOpacity={0.9}>
                                <Text style={styles.primaryStepButtonText}>Next</Text>
                            </TouchableOpacity>
                        ) : (
                            <TouchableOpacity
                                style={[styles.postButton, saving && styles.postButtonDisabled, styles.primaryStepButton]}
                                onPress={handlePostJob}
                                disabled={saving}
                                activeOpacity={0.9}
                            >
                                {saving ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.postButtonText}>Publish Job</Text>}
                            </TouchableOpacity>
                        )}
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#eef2f8',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#7c3aed',
        paddingHorizontal: 16,
        paddingBottom: 16,
        paddingTop: 10,
        borderBottomLeftRadius: 18,
        borderBottomRightRadius: 18,
        shadowColor: '#5b21b6',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.22,
        shadowRadius: 14,
        elevation: 7,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    headerTextWrap: {
        flex: 1,
    },
    headerTitle: {
        fontSize: 22,
        lineHeight: 28,
        fontWeight: '800',
        color: '#ffffff',
        marginBottom: 3,
        letterSpacing: 0.2,
    },
    headerSubtitle: {
        fontSize: 12,
        lineHeight: 18,
        color: 'rgba(255,255,255,0.88)',
        fontWeight: '600',
    },
    content: {
        paddingHorizontal: 16,
        paddingTop: 18,
        paddingBottom: 56,
    },
    noticeCard: {
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#ddd6fe',
        backgroundColor: '#faf8ff',
        paddingHorizontal: 14,
        paddingVertical: 12,
        marginBottom: 14,
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
        shadowColor: '#7c3aed',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 2,
    },
    noticeText: {
        flex: 1,
        color: '#5b21b6',
        fontSize: 12,
        lineHeight: 18,
        fontWeight: '600',
    },
    stepHeader: {
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#ddd6fe',
        backgroundColor: '#ffffff',
        paddingHorizontal: 14,
        paddingVertical: 12,
        marginBottom: 14,
        shadowColor: '#5b21b6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 2,
    },
    stepMetaText: {
        fontSize: 10,
        color: '#7c3aed',
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        marginBottom: 4,
    },
    stepTitle: {
        fontSize: 18,
        lineHeight: 24,
        color: '#0f172a',
        fontWeight: '800',
        marginBottom: 10,
    },
    stepPillRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
    },
    stepPill: {
        borderRadius: 999,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        backgroundColor: '#f8fafc',
        paddingHorizontal: 11,
        paddingVertical: 6,
    },
    stepPillActive: {
        borderColor: '#7c3aed',
        backgroundColor: '#ede9fe',
    },
    stepPillDone: {
        borderColor: '#a78bfa',
        backgroundColor: '#f5f3ff',
    },
    stepPillText: {
        fontSize: 11,
        color: '#64748b',
        fontWeight: '700',
        letterSpacing: 0.2,
    },
    stepPillTextActive: {
        color: '#5b21b6',
    },
    card: {
        backgroundColor: '#ffffff',
        borderRadius: 18,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        paddingHorizontal: 15,
        paddingVertical: 14,
        marginBottom: 14,
        shadowColor: '#334155',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 2,
    },
    cardTitle: {
        fontSize: 17,
        lineHeight: 22,
        color: '#0f172a',
        fontWeight: '800',
        marginBottom: 12,
    },
    cardTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
        gap: 8,
    },
    label: {
        fontSize: 12,
        color: '#334155',
        fontWeight: '700',
        marginBottom: 8,
        marginTop: 2,
        letterSpacing: 0.2,
    },
    helperText: {
        marginBottom: 8,
        color: '#64748b',
        fontSize: 12,
        lineHeight: 18,
    },
    input: {
        borderWidth: 1,
        borderColor: '#d6deeb',
        borderRadius: 12,
        backgroundColor: '#f8fafc',
        paddingHorizontal: 12,
        paddingVertical: 11,
        fontSize: 14,
        color: '#0f172a',
        fontWeight: '600',
        marginBottom: 14,
    },
    textArea: {
        minHeight: 88,
        textAlignVertical: 'top',
    },
    textAreaSmall: {
        minHeight: 72,
        textAlignVertical: 'top',
    },
    textAreaTall: {
        minHeight: 104,
        textAlignVertical: 'top',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    flex1: {
        flex: 1,
    },
    rowGapRight: {
        marginRight: 10,
    },
    switchRow: {
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#dbe4f0',
        backgroundColor: '#f9fbff',
        paddingHorizontal: 12,
        paddingVertical: 11,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 14,
    },
    switchTextWrap: {
        flex: 1,
        marginRight: 10,
    },
    switchTitle: {
        fontSize: 13,
        color: '#1e293b',
        fontWeight: '700',
        marginBottom: 2,
    },
    switchHint: {
        fontSize: 11,
        color: '#64748b',
    },
    chipWrap: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 10,
    },
    roleTypeGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginBottom: 12,
        gap: 8,
    },
    roleTypeCard: {
        width: '48%',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        backgroundColor: '#fbfcff',
        paddingHorizontal: 11,
        paddingVertical: 11,
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
        shadowColor: '#475569',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 1,
    },
    roleTypeCardActive: {
        borderColor: '#7c3aed',
        backgroundColor: '#f5f3ff',
        shadowColor: '#7c3aed',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.14,
        shadowRadius: 10,
        elevation: 3,
    },
    roleTypeIconWrap: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: '#e2e8f0',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 2,
    },
    roleTypeIconWrapActive: {
        backgroundColor: '#ddd6fe',
    },
    roleTypeTextWrap: {
        flex: 1,
    },
    roleTypeName: {
        fontSize: 13,
        fontWeight: '800',
        color: '#1e293b',
        marginBottom: 3,
    },
    roleTypeNameActive: {
        color: '#5b21b6',
    },
    roleTypeHint: {
        fontSize: 11,
        lineHeight: 15,
        color: '#64748b',
        fontWeight: '600',
    },
    roleTypeHintActive: {
        color: '#6d28d9',
    },
    selectedRoleBanner: {
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#ddd6fe',
        backgroundColor: '#faf5ff',
        paddingHorizontal: 12,
        paddingVertical: 10,
        marginBottom: 12,
    },
    selectedRoleTitle: {
        fontSize: 12,
        fontWeight: '800',
        color: '#5b21b6',
        marginBottom: 2,
    },
    selectedRoleHint: {
        fontSize: 11,
        color: '#6b21a8',
        fontWeight: '600',
        lineHeight: 16,
    },
    choiceChip: {
        borderRadius: 999,
        borderWidth: 1,
        borderColor: '#cbd5e1',
        backgroundColor: '#ffffff',
        paddingHorizontal: 13,
        paddingVertical: 8,
    },
    choiceChipActive: {
        borderColor: '#7c3aed',
        backgroundColor: '#f5f3ff',
        shadowColor: '#7c3aed',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 6,
        elevation: 1,
    },
    choiceChipText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#475569',
    },
    choiceChipTextActive: {
        color: '#6d28d9',
    },
    rangePreviewLabel: {
        fontSize: 10,
        color: '#64748b',
        fontWeight: '700',
        textTransform: 'uppercase',
        marginBottom: 6,
        letterSpacing: 0.7,
    },
    rangePreview: {
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#dbe4f0',
        backgroundColor: '#f9fbff',
        paddingHorizontal: 12,
        paddingVertical: 11,
        marginBottom: 14,
    },
    rangePreviewText: {
        color: '#1e293b',
        fontSize: 13,
        fontWeight: '700',
    },
    aiButton: {
        borderRadius: 999,
        borderWidth: 1,
        borderColor: '#c7d2fe',
        backgroundColor: '#eef2ff',
        paddingHorizontal: 12,
        paddingVertical: 6,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    aiActionsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'flex-end',
        gap: 8,
    },
    aiButtonText: {
        color: '#4338ca',
        fontSize: 12,
        fontWeight: '800',
    },
    inlineChips: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 10,
    },
    inlineChip: {
        borderRadius: 999,
        borderWidth: 1,
        borderColor: '#dbe4f0',
        backgroundColor: '#f8fafc',
        paddingHorizontal: 11,
        paddingVertical: 7,
    },
    inlineChipActive: {
        borderColor: '#7c3aed',
        backgroundColor: '#f5f3ff',
        shadowColor: '#7c3aed',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 6,
        elevation: 1,
    },
    inlineChipText: {
        fontSize: 12,
        color: '#475569',
        fontWeight: '700',
    },
    inlineChipTextActive: {
        color: '#6d28d9',
    },
    linkButton: {
        paddingVertical: 5,
        marginBottom: 10,
    },
    linkButtonText: {
        fontSize: 12,
        color: '#6d28d9',
        fontWeight: '700',
    },
    customInputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 14,
    },
    customInlineInput: {
        flex: 1,
        marginBottom: 0,
    },
    addButton: {
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#7c3aed',
        backgroundColor: '#f5f3ff',
        paddingHorizontal: 13,
        paddingVertical: 11,
        alignItems: 'center',
        justifyContent: 'center',
    },
    addButtonText: {
        fontSize: 12,
        color: '#6d28d9',
        fontWeight: '800',
    },
    summaryRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
        paddingBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#eef2f7',
        gap: 10,
    },
    summaryBlock: {
        marginTop: 10,
        paddingTop: 2,
    },
    summaryLabel: {
        fontSize: 11,
        color: '#64748b',
        fontWeight: '800',
        textTransform: 'uppercase',
        marginBottom: 6,
        letterSpacing: 0.7,
    },
    summaryValue: {
        flex: 1,
        color: '#0f172a',
        fontSize: 13,
        fontWeight: '700',
        lineHeight: 18,
    },
    videoCard: {
        borderRadius: 14,
        backgroundColor: '#059669',
        paddingHorizontal: 13,
        paddingVertical: 11,
        marginBottom: 14,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        shadowColor: '#059669',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 3,
    },
    videoText: {
        color: '#ffffff',
        fontSize: 13,
        fontWeight: '700',
    },
    stepFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginTop: 4,
        marginBottom: 6,
    },
    secondaryButton: {
        flex: 1,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#d5deeb',
        backgroundColor: '#f9fbff',
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    secondaryButtonPlaceholder: {
        flex: 1,
    },
    secondaryButtonText: {
        color: '#334155',
        fontSize: 14,
        fontWeight: '800',
    },
    primaryStepButton: {
        flex: 1,
        borderRadius: 14,
        backgroundColor: '#6d28d9',
        paddingVertical: 15,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#6d28d9',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 6,
    },
    primaryStepButtonText: {
        color: '#ffffff',
        fontSize: 15,
        fontWeight: '800',
    },
    postButton: {
        borderRadius: 14,
        backgroundColor: '#6d28d9',
        paddingVertical: 15,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 2,
        shadowColor: '#6d28d9',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 6,
    },
    postButtonDisabled: {
        opacity: 0.7,
    },
    postButtonText: {
        color: '#ffffff',
        fontSize: 15,
        fontWeight: '800',
    },
});
