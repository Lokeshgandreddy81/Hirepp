import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    Modal, TextInput, KeyboardAvoidingView, Platform, Alert, Image, ActivityIndicator
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { logger } from '../utils/logger';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
    IconUsers, IconMapPin, IconBriefcase, IconCheck, IconGlobe, IconFile, IconX, IconMessageSquare, IconPlus
} from '../components/Icons';
import SkeletonLoader from '../components/SkeletonLoader';
import EmptyState from '../components/EmptyState';
import client from '../api/client';
import { useFocusEffect } from '@react-navigation/native';
import { validateProfileResponse, logValidationError } from '../utils/apiValidator';
import { useAppStore } from '../store/AppStore';
import { trackEvent } from '../services/analytics';
import { AuthContext } from '../context/AuthContext';
import {
    getCommonCityHints,
    getCommonLanguageHints,
    getRoleDefaults,
    inferRoleCategory,
    searchRoleTitles,
} from '../config/workerRoleCatalog';

const REQUEST_TIMEOUT_MS = 12000;
const WORKER_PROFILE_CACHE_KEY = '@cached_worker_profiles';
const JOBS_CACHE_PREFIX = '@cached_jobs';
const WORKER_PROFILE_ID_KEY = '@worker_profile_id';
const WORKER_PROFILE_VERSION_KEY = '@worker_profile_version';
const DISMISSED_JOBS_KEY = '@hire_dismissed_jobs';
const EXPLAIN_CACHE_PREFIX = '@explain_';
const CACHED_CANDIDATES_PREFIX = '@cached_candidates_';
const SHIFT_OPTIONS = ['Day', 'Night', 'Flexible'];
const AVAILABILITY_OPTIONS = [
    { label: 'Immediate', value: 0 },
    { label: 'In 15 days', value: 15 },
    { label: 'In 30 days', value: 30 },
];
const EXPERIENCE_SELECTOR_VALUES = Array.from({ length: 11 }, (_, index) => index);
const ROLE_AI_DEBOUNCE_MS = 600;
const COMMON_CITY_HINTS = getCommonCityHints();
const COMMON_LANGUAGE_HINTS = getCommonLanguageHints();
const SEEDED_GENERIC_ROLE_TITLES = new Set([
    'general worker',
    'worker',
    'job seeker',
    'candidate',
    'profile',
]);
const SEEDED_GENERIC_PROFILE_NAMES = new Set([
    'lokesh user',
    'qa user',
    'demo user',
    'test user',
    'user',
    'candidate',
    'profile',
]);
const NEUTRAL_ROLE_PROFILE_TITLE = 'General Worker';
const generateProfileId = () => `rp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const withRequestTimeout = (promise, timeoutMessage) => new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
        reject(new Error(timeoutMessage));
    }, REQUEST_TIMEOUT_MS);

    promise
        .then((response) => {
            clearTimeout(timeout);
            resolve(response);
        })
        .catch((error) => {
            clearTimeout(timeout);
            reject(error);
        });
});

const isProfileRoleGateError = (error) => {
    const status = Number(error?.response?.status || error?.status || 0);
    const message = String(error?.response?.data?.message || error?.message || '').toLowerCase();
    return status === 403 && (
        message.includes('worker profile requires at least one role profile')
        || message.includes('profile_incomplete_role')
        || message.includes('employer profile incomplete')
    );
};

const normalizeValue = (value) => String(value || '').trim().toLowerCase();
const normalizeToken = (value) => String(value || '').trim().toLowerCase();

const sanitizeProfileNamePrefill = (value = '') => {
    const cleaned = String(value || '').trim();
    if (!cleaned) return '';
    if (SEEDED_GENERIC_PROFILE_NAMES.has(normalizeToken(cleaned))) return '';
    return cleaned;
};

const resolveProfileDisplayName = ({
    firstName = '',
    lastName = '',
    fallbackName = '',
} = {}) => {
    const combined = `${String(firstName || '').trim()} ${String(lastName || '').trim()}`.trim();
    const safeCombined = sanitizeProfileNamePrefill(combined);
    if (safeCombined) return safeCombined;
    const safeFallback = sanitizeProfileNamePrefill(fallbackName);
    if (safeFallback) return safeFallback;
    return 'Profile';
};

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

const parseTokenArray = (candidate = [], limit = 12) => (
    Array.isArray(candidate)
        ? candidate
            .map((item) => String(item || '').trim())
            .filter(Boolean)
            .slice(0, limit)
        : (typeof candidate === 'string'
            ? candidate
                .split(/[\n,]/)
                .map((item) => String(item || '').trim())
                .filter(Boolean)
                .slice(0, limit)
            : [])
);

const pickFirstTokenArray = (candidates = [], limit = 12) => {
    for (const candidate of candidates) {
        const parsed = parseTokenArray(candidate, limit);
        if (parsed.length > 0) return parsed;
    }
    return [];
};

const pickFirstString = (candidates = []) => {
    for (const candidate of candidates) {
        const parsed = String(candidate || '').trim();
        if (parsed) return parsed;
    }
    return '';
};

const pickFirstPositiveNumber = (candidates = []) => {
    for (const candidate of candidates) {
        const parsed = Number(candidate);
        if (Number.isFinite(parsed) && parsed > 0) {
            return Math.round(parsed);
        }
    }
    return 0;
};

const mergeUniqueTokens = (currentValues = [], nextValues = [], limit = 20) => {
    const merged = [];
    [...(Array.isArray(currentValues) ? currentValues : []), ...(Array.isArray(nextValues) ? nextValues : [])]
        .forEach((item) => {
            const token = String(item || '').trim();
            if (!token) return;
            if (merged.some((entry) => normalizeToken(entry) === normalizeToken(token))) return;
            merged.push(token);
        });
    return merged.slice(0, limit);
};

const normalizeProfileIdLikeBackend = (value, fallbackSeed = '') => {
    const normalized = String(value || '').trim();
    if (normalized) return normalized.slice(0, 120);

    const seeded = String(fallbackSeed || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    if (seeded) return `legacy-${seeded}`.slice(0, 120);
    return '';
};

const resolveProfileIdForApi = (profileLike = {}, profileIndex = 0) => normalizeProfileIdLikeBackend(
    profileLike?.profileId || profileLike?._id || '',
    `${profileIndex}-${String(profileLike?.roleName || profileLike?.roleTitle || '').trim()}`
);

const isSeededGenericRoleProfile = (roleProfile = {}) => {
    const roleTitle = normalizeValue(roleProfile?.roleName || roleProfile?.roleTitle);
    return SEEDED_GENERIC_ROLE_TITLES.has(roleTitle);
};

const toEmptyProfileTemplate = ({ profileId = 'profile-default', fullName = 'Profile', avatar = null, interviewVerified = false, activeProfile = false } = {}) => ({
    _id: profileId,
    profileId,
    name: fullName,
    roleTitle: '',
    experienceYears: null,
    expectedSalary: null,
    skills: [],
    location: '',
    language: '',
    preferredShift: 'Flexible',
    isAvailable: true,
    availabilityWindowDays: 0,
    openToRelocation: false,
    openToNightShift: false,
    licenses: [],
    avatar: avatar || null,
    interviewVerified: Boolean(interviewVerified),
    activeProfile: Boolean(activeProfile),
    isDefault: Boolean(activeProfile),
    createdAt: new Date().toISOString(),
});

const hasMeaningfulProfileData = (profile = {}) => {
    const title = String(profile?.roleTitle || '').trim();
    const location = String(profile?.location || '').trim();
    const skills = Array.isArray(profile?.skills) ? profile.skills.filter(Boolean) : [];
    const experience = Number(profile?.experienceYears || 0);
    const expectedSalary = Number(profile?.expectedSalary || 0);
    const licenses = Array.isArray(profile?.licenses) ? profile.licenses.filter(Boolean) : [];

    return Boolean(
        title
        || location
        || skills.length > 0
        || licenses.length > 0
        || (Number.isFinite(expectedSalary) && expectedSalary > 0)
        || (Number.isFinite(experience) && experience > 0)
    );
};

const isSameProfileEntry = (source = {}, target = {}, sourceIndex = 0, targetIndex = 0) => {
    const sourceResolvedId = resolveProfileIdForApi(source, sourceIndex);
    const targetResolvedId = resolveProfileIdForApi(target, targetIndex);
    if (sourceResolvedId && targetResolvedId && sourceResolvedId === targetResolvedId) {
        return true;
    }

    const sourceRawId = normalizeProfileIdLikeBackend(source?.profileId || source?._id || '', '');
    const targetRawId = normalizeProfileIdLikeBackend(target?.profileId || target?._id || '', '');
    if (sourceRawId && targetRawId && sourceRawId === targetRawId) {
        return true;
    }

    const sourceCreatedAt = String(source?.createdAt || '').trim();
    const targetCreatedAt = String(target?.createdAt || '').trim();
    const sourceRole = normalizeValue(source?.roleTitle || source?.roleName || '');
    const targetRole = normalizeValue(target?.roleTitle || target?.roleName || '');
    if (sourceCreatedAt && sourceCreatedAt === targetCreatedAt && sourceRole && sourceRole === targetRole) {
        return true;
    }

    return sourceIndex === targetIndex && sourceRole && sourceRole === targetRole;
};

const buildRoleProfilesPayloadFromUiProfiles = (profiles = []) => {
    const meaningfulProfiles = (Array.isArray(profiles) ? profiles : []).filter(hasMeaningfulProfileData);
    const hasActiveProfile = meaningfulProfiles.some((item) => Boolean(item?.activeProfile));

    return meaningfulProfiles
        .map((item, itemIndex) => ({
            profileId: resolveProfileIdForApi(item, itemIndex),
            roleName: String(item?.roleTitle || item?.roleName || '').trim(),
            experienceInRole: Number.isFinite(Number(item?.experienceYears))
                ? Number(item.experienceYears)
                : 0,
            expectedSalary: Number.isFinite(Number(item?.expectedSalary))
                ? Number(item.expectedSalary)
                : 0,
            skills: Array.isArray(item?.skills) ? item.skills.filter(Boolean) : [],
            activeProfile: hasActiveProfile ? Boolean(item?.activeProfile) : itemIndex === 0,
            createdAt: item?.createdAt || new Date().toISOString(),
        }))
        .filter((item) => Boolean(item.roleName));
};

const buildNeutralRoleProfilesPayload = () => ([
    {
        profileId: normalizeProfileIdLikeBackend('legacy-general-worker', ''),
        roleName: NEUTRAL_ROLE_PROFILE_TITLE,
        experienceInRole: 0,
        expectedSalary: 0,
        skills: [],
        activeProfile: true,
        createdAt: new Date().toISOString(),
    },
]);

const TypeaheadInput = ({
    value = '',
    onChangeText,
    placeholder = '',
    suggestions = [],
    onSelectSuggestion,
    formatSuggestion,
    keyboardType = 'default',
    autoCapitalize = 'words',
    returnKeyType = 'done',
    onSubmitEditing,
    containerStyle,
}) => {
    const [isFocused, setIsFocused] = useState(false);
    const inputRef = useRef(null);
    const selectingSuggestionRef = useRef(false);
    const safeSuggestions = Array.isArray(suggestions) ? suggestions.filter(Boolean) : [];
    const showSuggestions = isFocused && safeSuggestions.length > 0;
    const resolveSuggestion = useCallback((item) => {
        if (typeof formatSuggestion === 'function') {
            const custom = formatSuggestion(item);
            if (custom && typeof custom === 'object') {
                return {
                    label: String(custom.label || custom.value || '').trim(),
                    value: String(custom.value || custom.label || '').trim(),
                    meta: String(custom.meta || '').trim(),
                };
            }
        }
        if (typeof item === 'object') {
            return {
                label: String(item.label || item.value || '').trim(),
                value: String(item.value || item.label || '').trim(),
                meta: String(item.meta || '').trim(),
            };
        }
        const label = String(item || '').trim();
        return { label, value: label, meta: '' };
    }, [formatSuggestion]);

    return (
        <View style={[styles.typeaheadWrap, containerStyle]}>
            <View style={[styles.typeaheadShell, isFocused && styles.typeaheadShellFocused]}>
                <TextInput
                    ref={inputRef}
                    value={value}
                    onChangeText={onChangeText}
                    style={styles.typeaheadInput}
                    placeholder={placeholder}
                    placeholderTextColor="#94a3b8"
                    keyboardType={keyboardType}
                    autoCapitalize={autoCapitalize}
                    autoCorrect={false}
                    returnKeyType={returnKeyType}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => {
                        setTimeout(() => {
                            if (selectingSuggestionRef.current) {
                                selectingSuggestionRef.current = false;
                                return;
                            }
                            setIsFocused(false);
                        }, 180);
                    }}
                    onSubmitEditing={onSubmitEditing}
                />
                <Text style={styles.typeaheadChevron}>{showSuggestions ? '▲' : '▼'}</Text>
            </View>

            {showSuggestions ? (
                <View style={styles.typeaheadList}>
                    {safeSuggestions.map((item, index) => {
                        const suggestion = resolveSuggestion(item);
                        if (!suggestion.value) return null;
                        return (
                            <TouchableOpacity
                                key={`typeahead-${suggestion.value}-${index}`}
                                style={styles.typeaheadItem}
                                activeOpacity={0.82}
                                onPressIn={() => {
                                    selectingSuggestionRef.current = true;
                                }}
                                onPress={() => {
                                    if (typeof onSelectSuggestion === 'function') {
                                        onSelectSuggestion(suggestion.value);
                                    } else {
                                        onChangeText?.(suggestion.value);
                                    }
                                    selectingSuggestionRef.current = false;
                                    setIsFocused(false);
                                    inputRef.current?.blur?.();
                                }}
                            >
                                <Text style={styles.typeaheadItemText}>{suggestion.label}</Text>
                                {suggestion.meta ? (
                                    <Text style={styles.typeaheadItemMeta}>{suggestion.meta}</Text>
                                ) : null}
                            </TouchableOpacity>
                        );
                    })}
                </View>
            ) : null}
        </View>
    );
};

export default function ProfilesScreen({ navigation }) {
    const insets = useSafeAreaInsets();
    const { user, role: appRole } = useAppStore();
    const { updateUserInfo } = React.useContext(AuthContext);
    const normalizedAppRole = String(appRole || '').toLowerCase();
    const role = normalizedAppRole === 'employer' || normalizedAppRole === 'recruiter' ? 'employer' : 'employee';
    const [profiles, setProfiles] = useState([]);
    const [suppressedProfileIds, setSuppressedProfileIds] = useState([]);
    const [pools, setPools] = useState([]);
    const [poolProfiles, setPoolProfiles] = useState([]);
    const [isModalVisible, setIsModalVisible] = useState(false);

    // Employer State
    const [selectedPool, setSelectedPool] = useState(null);
    const [selectedCandidate, setSelectedCandidate] = useState(null);

    // Employee State
    const [editingProfile, setEditingProfile] = useState(null);
    const [skillInput, setSkillInput] = useState('');
    const [licenseInput, setLicenseInput] = useState('');
    const [aiAssistLoading, setAiAssistLoading] = useState(false);
    const [formAssistMessage, setFormAssistMessage] = useState('');
    const [roleSuggestedSkills, setRoleSuggestedSkills] = useState([]);
    const [roleSuggestedLicenses, setRoleSuggestedLicenses] = useState([]);
    const [roleSuggestedSalary, setRoleSuggestedSalary] = useState(0);
    const [isCustomExperience, setIsCustomExperience] = useState(false);
    const [isCustomSalary, setIsCustomSalary] = useState(false);

    const [isLoading, setIsLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState('');
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const poolCandidatesRequestIdRef = useRef(0);
    const profileRequestIdRef = useRef(0);
    const poolsRequestIdRef = useRef(0);
    const roleAiCacheRef = useRef({});
    const roleAiDebounceRef = useRef(null);
    const roleAiRequestIdRef = useRef(0);
    const roleDefaultsAppliedKeyRef = useRef('');

    const patchEditingProfile = useCallback((partial = {}) => {
        setEditingProfile((prev) => (prev ? { ...prev, ...partial } : prev));
    }, []);

    const roleDefaults = useMemo(
        () => getRoleDefaults(String(editingProfile?.roleTitle || '').trim()),
        [editingProfile?.roleTitle]
    );

    const roleTitleTypeaheadOptions = useMemo(() => {
        const catalogSuggestions = searchRoleTitles(String(editingProfile?.roleTitle || '').trim(), 10).map((entry) => ({
            label: entry.title,
            value: entry.title,
            meta: entry.category ? `${entry.category} role` : '',
        }));
        const catalogTitles = new Set(catalogSuggestions.map((entry) => normalizeToken(entry.value)));
        const profileTitles = buildUniqueOptions([
            ...profiles.map((item) => item?.roleTitle),
            editingProfile?.roleTitle,
        ]).filter((title) => !catalogTitles.has(normalizeToken(title)));
        const profileSuggestions = profileTitles.slice(0, 4).map((title) => ({
            label: title,
            value: title,
            meta: 'Your existing role',
        }));
        return [...catalogSuggestions, ...profileSuggestions];
    }, [editingProfile?.roleTitle, profiles]);

    const cityTypeaheadOptions = useMemo(() => buildUniqueOptions([
        ...(Array.isArray(roleDefaults?.cityHints) ? roleDefaults.cityHints : []),
        ...COMMON_CITY_HINTS,
        ...profiles.map((item) => item?.location),
        editingProfile?.location,
    ]), [editingProfile?.location, profiles, roleDefaults?.cityHints]);

    const languageTypeaheadOptions = useMemo(() => buildUniqueOptions([
        ...(Array.isArray(roleDefaults?.languageHints) ? roleDefaults.languageHints : []),
        ...COMMON_LANGUAGE_HINTS,
        ...profiles.map((item) => item?.language),
        editingProfile?.language,
    ]), [editingProfile?.language, profiles, roleDefaults?.languageHints]);

    const skillTypeaheadOptions = useMemo(() => buildUniqueOptions([
        ...(Array.isArray(roleSuggestedSkills) ? roleSuggestedSkills : []),
        ...(Array.isArray(editingProfile?.skills) ? editingProfile.skills : []),
        skillInput,
    ]), [editingProfile?.skills, roleSuggestedSkills, skillInput]);

    const licenseTypeaheadOptions = useMemo(() => buildUniqueOptions([
        ...(Array.isArray(roleSuggestedLicenses) ? roleSuggestedLicenses : []),
        ...(Array.isArray(editingProfile?.licenses) ? editingProfile.licenses : []),
        licenseInput,
    ]), [editingProfile?.licenses, licenseInput, roleSuggestedLicenses]);

    const inferredRoleCategory = useMemo(
        () => inferRoleCategory(String(editingProfile?.roleTitle || '').trim()),
        [editingProfile?.roleTitle]
    );

    const effectiveSuggestedSalary = useMemo(
        () => Number(roleSuggestedSalary || roleDefaults?.suggestedSalary || 0),
        [roleDefaults?.suggestedSalary, roleSuggestedSalary]
    );

    useEffect(() => {
        let cancelled = false;

        const hydrateCachedProfiles = async () => {
            try {
                const raw = await AsyncStorage.getItem(WORKER_PROFILE_CACHE_KEY);
                if (!raw || cancelled) return;
                const parsed = JSON.parse(raw);
                if (!Array.isArray(parsed)) return;
                if (!parsed.some(hasMeaningfulProfileData)) return;
                setProfiles((previous) => (previous.length > 0 ? previous : parsed));
            } catch (_error) {
                // Best-effort cache hydration only.
            }
        };

        hydrateCachedProfiles();
        return () => {
            cancelled = true;
        };
    }, []);

    const mapProfilesFromApi = useCallback((profile) => {
        if (!profile) return [];
        const fullName = resolveProfileDisplayName({
            firstName: profile.firstName,
            lastName: profile.lastName,
            fallbackName: user?.name,
        });
        const roleProfiles = Array.isArray(profile.roleProfiles) ? profile.roleProfiles : [];
        if (roleProfiles.length === 0) {
            return [
                toEmptyProfileTemplate({
                    profileId: String(profile._id || 'profile-default'),
                    fullName,
                    avatar: profile.avatar || profile.logoUrl || null,
                    interviewVerified: profile.interviewVerified,
                    activeProfile: true,
                }),
            ];
        }
        const hasActiveProfile = roleProfiles.some((roleProfile) => Boolean(roleProfile?.activeProfile));
        const mappedProfiles = roleProfiles.map((rp, index) => {
            const profileId = resolveProfileIdForApi(
                { profileId: rp?.profileId, roleName: rp?.roleName, _id: rp?._id },
                index
            ) || String(profile._id || `profile-${index}`);
            if (suppressedProfileIds.includes(profileId)) {
                return null;
            }
            const isSeeded = isSeededGenericRoleProfile(rp, profile);
            if (isSeeded) {
                return toEmptyProfileTemplate({
                    profileId,
                    fullName,
                    avatar: profile.avatar || profile.logoUrl || null,
                    interviewVerified: profile.interviewVerified,
                    activeProfile: hasActiveProfile ? Boolean(rp?.activeProfile) : index === 0,
                });
            }

            return {
                _id: profileId,
                profileId,
                name: fullName,
                roleTitle: String(rp.roleName || rp.roleTitle || '').trim(),
                experienceYears: Number.isFinite(Number(rp.experienceInRole ?? rp.experienceYears))
                    ? Number(rp.experienceInRole ?? rp.experienceYears)
                    : null,
                expectedSalary: Number.isFinite(Number(rp.expectedSalary)) ? Number(rp.expectedSalary) : null,
                skills: Array.isArray(rp.skills) ? rp.skills.filter(Boolean) : [],
                location: String(profile.city || '').trim(),
                language: String(profile.language || '').trim(),
                preferredShift: SHIFT_OPTIONS.includes(String(profile.preferredShift || '').trim())
                    ? String(profile.preferredShift || '').trim()
                    : 'Flexible',
                isAvailable: profile?.isAvailable !== false,
                availabilityWindowDays: [0, 15, 30].includes(Number(profile?.availabilityWindowDays))
                    ? Number(profile.availabilityWindowDays)
                    : 0,
                openToRelocation: Boolean(profile?.openToRelocation),
                openToNightShift: Boolean(profile?.openToNightShift),
                licenses: Array.isArray(profile.licenses) ? profile.licenses.filter(Boolean) : [],
                avatar: profile.avatar || profile.logoUrl || null,
                interviewVerified: Boolean(profile.interviewVerified),
                activeProfile: hasActiveProfile ? Boolean(rp?.activeProfile) : index === 0,
                isDefault: hasActiveProfile ? Boolean(rp?.activeProfile) : index === 0,
                createdAt: rp?.createdAt || profile?.createdAt || null,
            };
        }).filter(Boolean).sort((left, right) => {
            const leftCreatedAt = Date.parse(left?.createdAt || '') || 0;
            const rightCreatedAt = Date.parse(right?.createdAt || '') || 0;
            if (rightCreatedAt !== leftCreatedAt) return rightCreatedAt - leftCreatedAt;
            if (left.activeProfile === right.activeProfile) return 0;
            return left.activeProfile ? -1 : 1;
        });
        return mappedProfiles;
    }, [suppressedProfileIds, user?.name]);

    const fetchProfileData = useCallback(async ({ preservePreviousOnIncomplete = true } = {}) => {
        const requestId = profileRequestIdRef.current + 1;
        profileRequestIdRef.current = requestId;
        setIsLoading(true);
        try {
            setErrorMsg('');
            const profileResponse = await withRequestTimeout(
                client.get('/api/users/profile', {
                    __skipApiErrorHandler: true,
                    __allowWhenCircuitOpen: true,
                    params: { role: 'worker' },
                }),
                'Profile request timed out',
            );
            if (requestId !== profileRequestIdRef.current) return;

            const validatedProfile = validateProfileResponse(profileResponse?.data);
            const workerProfileId = String(validatedProfile?._id || '').trim();
            if (workerProfileId) {
                AsyncStorage.setItem('@worker_profile_id', workerProfileId).catch(() => { });
            }
            const mappedProfiles = mapProfilesFromApi(validatedProfile);
            const hasExplicitRoleProfiles = Array.isArray(validatedProfile?.roleProfiles);
            let resolvedProfiles = mappedProfiles;
            setProfiles((previousProfiles) => {
                const previousHasMeaningfulData = previousProfiles.some(hasMeaningfulProfileData);
                const nextHasMeaningfulData = mappedProfiles.some(hasMeaningfulProfileData);

                // Preserve previous profiles only when server payload is incomplete.
                // If server explicitly returns roleProfiles (including empty), trust it.
                if (
                    preservePreviousOnIncomplete
                    && !nextHasMeaningfulData
                    && previousHasMeaningfulData
                    && !hasExplicitRoleProfiles
                ) {
                    resolvedProfiles = previousProfiles;
                    return previousProfiles;
                }
                resolvedProfiles = mappedProfiles;
                return mappedProfiles;
            });
            if (resolvedProfiles.some(hasMeaningfulProfileData)) {
                AsyncStorage.setItem(WORKER_PROFILE_CACHE_KEY, JSON.stringify(resolvedProfiles)).catch(() => { });
            } else {
                AsyncStorage.removeItem(WORKER_PROFILE_CACHE_KEY).catch(() => { });
            }
        } catch (e) {
            if (requestId !== profileRequestIdRef.current) return;
            if (e?.name === 'ApiValidationError') {
                logValidationError(e, '/api/users/profile');
            }
            if (isProfileRoleGateError(e)) {
                if (!preservePreviousOnIncomplete) {
                    setProfiles([]);
                    AsyncStorage.removeItem(WORKER_PROFILE_CACHE_KEY).catch(() => { });
                }
                setErrorMsg('');
                return;
            }
            if (!preservePreviousOnIncomplete) {
                setProfiles([]);
                AsyncStorage.removeItem(WORKER_PROFILE_CACHE_KEY).catch(() => { });
            }
            setErrorMsg('');
        } finally {
            if (requestId === profileRequestIdRef.current) {
                setIsLoading(false);
            }
        }
    }, [mapProfilesFromApi]);

    const fetchPools = useCallback(async () => {
        const requestId = poolsRequestIdRef.current + 1;
        poolsRequestIdRef.current = requestId;
        setIsLoading(true);
        try {
            setErrorMsg('');
            const { data } = await withRequestTimeout(
                client.get('/api/jobs/my-jobs', {
                    __skipApiErrorHandler: true,
                    __allowWhenCircuitOpen: true,
                }),
                'Talent pools request timed out',
            );
            if (requestId !== poolsRequestIdRef.current) return;
            const jobs = Array.isArray(data)
                ? data
                : (Array.isArray(data?.data) ? data.data : null);
            if (!jobs) {
                throw new Error('Invalid jobs response format.');
            }
            const mappedPools = jobs
                .map((job) => {
                    const id = String(job?._id || '').trim();
                    if (!id) return null;
                    return {
                        id,
                        name: job.title || 'Job Pool',
                        count: Number(job.applicantCount || 0),
                    };
                })
                .filter(Boolean);
            setPools(mappedPools);
        } catch (e) {
            if (requestId !== poolsRequestIdRef.current) return;
            if (isProfileRoleGateError(e)) {
                setPools([]);
                setErrorMsg('');
                return;
            }
            setPools([]);
            setErrorMsg('');
        } finally {
            if (requestId === poolsRequestIdRef.current) {
                setIsLoading(false);
            }
        }
    }, []);

    const fetchPoolCandidates = useCallback(async (jobId, { preserveSelection = true } = {}) => {
        const normalizedJobId = String(jobId || '').trim();
        if (!normalizedJobId) {
            setPoolProfiles([]);
            setSelectedCandidate(null);
            setErrorMsg('');
            setIsLoading(false);
            return;
        }

        const requestId = poolCandidatesRequestIdRef.current + 1;
        poolCandidatesRequestIdRef.current = requestId;
        setIsLoading(true);
        try {
            setErrorMsg('');
            const { data } = await withRequestTimeout(
                client.get(`/api/matches/employer/${normalizedJobId}`, {
                    __skipApiErrorHandler: true,
                    __allowWhenCircuitOpen: true,
                }),
                'Candidates request timed out',
            );
            if (requestId !== poolCandidatesRequestIdRef.current) return;
            const matches = Array.isArray(data)
                ? data
                : (Array.isArray(data?.matches) ? data.matches : null);
            if (!matches) {
                throw new Error('Invalid candidates response format.');
            }
            const mappedCandidates = matches.map((item, idx) => {
                const worker = item.worker || {};
                const firstRole = worker.roleProfiles && worker.roleProfiles[0] ? worker.roleProfiles[0] : {};
                const applicationKey = String(item?.applicationId || item?._id || '').trim();
                const workerKey = String(worker?._id || '').trim();
                const candidateId = applicationKey
                    ? `app-${applicationKey}`
                    : workerKey
                        ? `pool-${normalizedJobId}-worker-${workerKey}-${idx}`
                        : `pool-${normalizedJobId}-row-${idx}`;
                return {
                    id: candidateId,
                    name: String(worker?.user?.name || worker?.firstName || worker?.name || 'Candidate'),
                    roleTitle: firstRole.roleName || 'Candidate',
                    experienceYears: firstRole.experienceInRole || worker.totalExperience || 0,
                    location: worker.city || 'Remote',
                    summary: String(item?.whyThisMatchesYou || item?.matchWhy?.summary || '').trim(),
                    skills: firstRole.skills || [],
                };
            });
            setPoolProfiles(mappedCandidates);
            setSelectedCandidate((previous) => {
                if (!preserveSelection || !previous) return null;
                return mappedCandidates.find((candidate) => String(candidate.id) === String(previous.id)) || null;
            });
        } catch (e) {
            if (requestId !== poolCandidatesRequestIdRef.current) return;
            setErrorMsg('');
            setPoolProfiles([]);
        } finally {
            if (requestId === poolCandidatesRequestIdRef.current) {
                setIsLoading(false);
            }
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            const profileViewPayload = {
                source: 'profiles_screen',
                mode: role === 'employer' ? 'talent' : 'profile',
            };
            trackEvent('PROFILE_VIEWED', profileViewPayload);
        }, [role])
    );

    useFocusEffect(
        useCallback(() => {
            if (role === 'employee') {
                fetchProfileData();
            } else {
                if (selectedPool?.id) {
                    fetchPoolCandidates(selectedPool.id);
                } else {
                    fetchPools();
                }
            }
        }, [role, fetchProfileData, fetchPools, fetchPoolCandidates, selectedPool?.id])
    );

    const invalidateJobMatchCache = useCallback(async ({ deepClean = false } = {}) => {
        try {
            const allKeys = await AsyncStorage.getAllKeys();
            const matchKeys = allKeys.filter((key) => (
                key === JOBS_CACHE_PREFIX
                || key.startsWith(`${JOBS_CACHE_PREFIX}:`)
                || (deepClean && (
                    key === WORKER_PROFILE_CACHE_KEY
                    || key === WORKER_PROFILE_ID_KEY
                    || key === WORKER_PROFILE_VERSION_KEY
                    || key === DISMISSED_JOBS_KEY
                    || key.startsWith(EXPLAIN_CACHE_PREFIX)
                    || key.startsWith(CACHED_CANDIDATES_PREFIX)
                    || key.startsWith('@chat_history_')
                    || key.startsWith('@cached_')
                    || key === '@hc_last_active_at'
                ))
            ));
            if (matchKeys.length > 0) {
                await AsyncStorage.multiRemove(matchKeys);
            }
            await AsyncStorage.setItem(WORKER_PROFILE_VERSION_KEY, String(Date.now()));
        } catch (_error) {
            // Best-effort invalidation only.
        }
    }, []);

    const openEdit = (prof) => {
        const normalized = {
            ...prof,
            profileId: String(prof?.profileId || prof?._id || generateProfileId()),
            _id: String(prof?.profileId || prof?._id || generateProfileId()),
            skills: Array.isArray(prof?.skills) ? prof.skills : [],
            licenses: Array.isArray(prof?.licenses) ? prof.licenses : [],
            roleTitle: String(prof?.roleTitle || ''),
            name: String(prof?.name || ''),
            location: String(prof?.location || ''),
            language: String(prof?.language || ''),
            activeProfile: Boolean(prof?.activeProfile),
            createdAt: prof?.createdAt || new Date().toISOString(),
            isNew: false,
            preferredShift: SHIFT_OPTIONS.includes(String(prof?.preferredShift || '').trim())
                ? String(prof?.preferredShift || '').trim()
                : 'Flexible',
            isAvailable: prof?.isAvailable !== false,
            availabilityWindowDays: [0, 15, 30].includes(Number(prof?.availabilityWindowDays))
                ? Number(prof.availabilityWindowDays)
                : 0,
            openToRelocation: Boolean(prof?.openToRelocation),
            openToNightShift: Boolean(prof?.openToNightShift),
            experienceYears: Number.isFinite(Number(prof?.experienceYears)) ? Number(prof.experienceYears) : null,
            expectedSalary: Number.isFinite(Number(prof?.expectedSalary)) ? Number(prof.expectedSalary) : null,
        };
        const normalizedRoleTitle = String(normalized.roleTitle || '').trim();
        const roleDefaultsForEdit = getRoleDefaults(normalizedRoleTitle);
        const seededSalary = Number(roleDefaultsForEdit?.suggestedSalary || 0);
        const seededProfile = {
            ...normalized,
            location: String(normalized.location || '').trim(),
            language: String(normalized.language || '').trim(),
            expectedSalary: Number.isFinite(Number(normalized.expectedSalary)) && Number(normalized.expectedSalary) > 0
                ? Number(normalized.expectedSalary)
                : (seededSalary > 0 ? seededSalary : null),
        };

        setEditingProfile(seededProfile);
        setSkillInput('');
        setLicenseInput('');
        setAiAssistLoading(false);
        setFormAssistMessage('');
        setRoleSuggestedSkills(Array.isArray(roleDefaultsForEdit?.skills) ? roleDefaultsForEdit.skills : []);
        setRoleSuggestedLicenses(Array.isArray(roleDefaultsForEdit?.certifications) ? roleDefaultsForEdit.certifications : []);
        setRoleSuggestedSalary(seededSalary > 0 ? seededSalary : 0);
        setIsCustomExperience(Number(seededProfile.experienceYears || 0) > 10);
        setIsCustomSalary(
            Number(seededProfile.expectedSalary || 0) > 0
            && (
                seededSalary <= 0
                || Number(seededProfile.expectedSalary || 0) !== Number(seededSalary || 0)
            )
        );
        roleDefaultsAppliedKeyRef.current = normalizeToken(normalizedRoleTitle);
        setIsModalVisible(true);
    };

    const addSkillToken = useCallback((value) => {
        const token = String(value || '').trim();
        if (!token) return false;
        setEditingProfile((prev) => {
            const existing = Array.isArray(prev?.skills) ? prev.skills : [];
            if (existing.some((item) => normalizeToken(item) === normalizeToken(token))) return prev;
            return { ...prev, skills: [...existing, token] };
        });
        return true;
    }, []);

    const handleAddSkill = () => {
        const didAdd = addSkillToken(skillInput);
        if (!didAdd) return;
        setSkillInput('');
    };

    const handleRemoveSkill = (idx) => {
        setEditingProfile((prev) => ({
            ...prev,
            skills: (Array.isArray(prev?.skills) ? prev.skills : []).filter((_, i) => i !== idx),
        }));
    };

    const handleAddLicense = () => {
        const license = licenseInput.trim();
        if (!license) return;
        setEditingProfile((prev) => {
            const existing = Array.isArray(prev?.licenses) ? prev.licenses : [];
            if (existing.some((item) => normalizeToken(item) === normalizeToken(license))) return prev;
            return { ...prev, licenses: [...existing, license] };
        });
        setLicenseInput('');
    };

    const handleRemoveLicense = (idx) => {
        setEditingProfile((prev) => ({
            ...prev,
            licenses: (Array.isArray(prev?.licenses) ? prev.licenses : []).filter((_, i) => i !== idx),
        }));
    };

    const applyRoleDefaults = useCallback((roleTitle, options = {}) => {
        const {
            announce = false,
            applySalaryIfMissing = true,
        } = options;
        const normalizedRoleTitle = String(roleTitle || '').trim();
        if (!normalizedRoleTitle) return;

        const defaults = getRoleDefaults(normalizedRoleTitle);
        const nextSuggestedSalary = Number(defaults?.suggestedSalary || 0);
        setRoleSuggestedSkills(Array.isArray(defaults?.skills) ? defaults.skills : []);
        setRoleSuggestedLicenses(Array.isArray(defaults?.certifications) ? defaults.certifications : []);
        setRoleSuggestedSalary(nextSuggestedSalary > 0 ? nextSuggestedSalary : 0);

        setEditingProfile((prev) => {
            if (!prev) return prev;
            const existingSkills = Array.isArray(prev.skills) ? prev.skills : [];
            const existingLicenses = Array.isArray(prev.licenses) ? prev.licenses : [];
            const safeExperience = Number.isFinite(Number(prev.experienceYears))
                ? Number(prev.experienceYears)
                : null;
            const existingSalary = Number(prev.expectedSalary || 0);
            const shouldSeedSalary = applySalaryIfMissing
                && !isCustomSalary
                && (!Number.isFinite(existingSalary) || existingSalary <= 0)
                && nextSuggestedSalary > 0;

            return {
                ...prev,
                skills: mergeUniqueTokens(existingSkills, defaults?.skills || [], 25),
                licenses: mergeUniqueTokens(existingLicenses, defaults?.certifications || [], 25),
                location: String(prev.location || '').trim(),
                language: String(prev.language || '').trim(),
                preferredShift: SHIFT_OPTIONS.includes(String(prev.preferredShift || '').trim())
                    ? String(prev.preferredShift || '').trim()
                    : 'Flexible',
                experienceYears: safeExperience,
                expectedSalary: shouldSeedSalary ? nextSuggestedSalary : prev.expectedSalary,
            };
        });

        if (announce) {
            setFormAssistMessage('Role defaults applied. You can still edit every field.');
        }
    }, [isCustomSalary]);

    const runRoleAiAssist = useCallback(async (roleTitle, options = {}) => {
        const {
            auto = false,
            force = false,
        } = options;
        const normalizedRoleTitle = String(roleTitle || '').trim();
        if (!normalizedRoleTitle) return;
        const roleKey = normalizeToken(normalizedRoleTitle);
        const fallbackDefaults = getRoleDefaults(normalizedRoleTitle);

        const cached = roleAiCacheRef.current?.[roleKey];
        if (!force && cached) {
            setRoleSuggestedSkills(cached.skills);
            setRoleSuggestedLicenses(cached.certifications);
            setRoleSuggestedSalary(cached.suggestedSalary);
            setEditingProfile((prev) => {
                if (!prev) return prev;
                const existingSalary = Number(prev.expectedSalary || 0);
                const shouldSeedSalary = !isCustomSalary
                    && (!Number.isFinite(existingSalary) || existingSalary <= 0)
                    && Number(cached.suggestedSalary) > 0;
                return {
                    ...prev,
                    skills: mergeUniqueTokens(prev.skills, cached.skills, 25),
                    licenses: mergeUniqueTokens(prev.licenses, cached.certifications, 25),
                    location: String(prev.location || '').trim(),
                    language: String(prev.language || '').trim(),
                    preferredShift: SHIFT_OPTIONS.includes(String(prev.preferredShift || '').trim())
                        ? String(prev.preferredShift || '').trim()
                        : String(cached.preferredShift || 'Flexible').trim(),
                    expectedSalary: shouldSeedSalary ? Number(cached.suggestedSalary) : prev.expectedSalary,
                };
            });
            if (!auto) {
                setFormAssistMessage('Refreshed role suggestions.');
            }
            return;
        }

        const requestId = roleAiRequestIdRef.current + 1;
        roleAiRequestIdRef.current = requestId;
        setAiAssistLoading(true);
        if (!auto) setFormAssistMessage('');

        try {
            const roleCategory = inferRoleCategory(normalizedRoleTitle);
            const { data } = await client.post('/api/features/ai/profile-suggestions', {
                roleName: normalizedRoleTitle,
                roleCategory: roleCategory || undefined,
                context: 'worker_profile',
            }, {
                __skipApiErrorHandler: true,
                __allowWhenCircuitOpen: true,
            });

            if (requestId !== roleAiRequestIdRef.current) return;

            const responseRoot = (data && typeof data === 'object' && !Array.isArray(data)) ? data : {};
            const nestedPayload = [
                responseRoot?.data,
                responseRoot?.result,
                responseRoot?.suggestions,
                responseRoot?.payload,
            ].find((entry) => entry && typeof entry === 'object' && !Array.isArray(entry)) || responseRoot;

            const aiSkills = pickFirstTokenArray([
                nestedPayload?.skills,
                nestedPayload?.recommendedSkills,
                nestedPayload?.skillSuggestions,
                nestedPayload?.topSkills,
            ], 12);
            const aiCertifications = pickFirstTokenArray([
                nestedPayload?.certifications,
                nestedPayload?.licenses,
                nestedPayload?.licenseHints,
                nestedPayload?.recommendedCertifications,
                nestedPayload?.certificates,
            ], 12);
            const aiSuggestedSalary = pickFirstPositiveNumber([
                nestedPayload?.salaryHint,
                nestedPayload?.suggestedSalary,
                nestedPayload?.expectedSalary,
                nestedPayload?.salary,
            ]);
            const aiCity = pickFirstString([
                nestedPayload?.city,
                nestedPayload?.preferredCity,
                nestedPayload?.cityHint,
                nestedPayload?.location,
            ]);
            const aiLanguage = pickFirstString([
                nestedPayload?.language,
                nestedPayload?.primaryLanguage,
                nestedPayload?.languageHint,
            ]);
            const aiPreferredShift = pickFirstString([
                nestedPayload?.preferredShift,
                nestedPayload?.shift,
                nestedPayload?.workShift,
            ]);
            const normalizedAiShift = SHIFT_OPTIONS.find((shift) => normalizeToken(shift) === normalizeToken(aiPreferredShift)) || '';
            const payload = {
                skills: mergeUniqueTokens(fallbackDefaults.skills, aiSkills, 20),
                certifications: mergeUniqueTokens(fallbackDefaults.certifications, aiCertifications, 20),
                suggestedSalary: Number.isFinite(aiSuggestedSalary) && aiSuggestedSalary > 0
                    ? Math.round(aiSuggestedSalary)
                    : Number(fallbackDefaults.suggestedSalary || 0),
                city: String(aiCity || fallbackDefaults?.cityHints?.[0] || '').trim(),
                language: String(aiLanguage || fallbackDefaults?.languageHints?.[0] || '').trim(),
                preferredShift: normalizedAiShift
                    ? normalizedAiShift
                    : 'Flexible',
            };

            roleAiCacheRef.current[roleKey] = payload;
            setRoleSuggestedSkills(payload.skills);
            setRoleSuggestedLicenses(payload.certifications);
            setRoleSuggestedSalary(payload.suggestedSalary);

            setEditingProfile((prev) => {
                if (!prev) return prev;
                const existingSalary = Number(prev.expectedSalary || 0);
                const shouldSeedSalary = !isCustomSalary
                    && (!Number.isFinite(existingSalary) || existingSalary <= 0)
                    && Number(payload.suggestedSalary) > 0;
                return {
                    ...prev,
                    skills: mergeUniqueTokens(prev.skills, payload.skills, 25),
                    licenses: mergeUniqueTokens(prev.licenses, payload.certifications, 25),
                    location: String(prev.location || '').trim(),
                    language: String(prev.language || '').trim(),
                    preferredShift: SHIFT_OPTIONS.includes(String(prev.preferredShift || '').trim())
                        ? String(prev.preferredShift || '').trim()
                        : payload.preferredShift,
                    expectedSalary: shouldSeedSalary ? Number(payload.suggestedSalary) : prev.expectedSalary,
                };
            });

            if (!auto) {
                setFormAssistMessage('AI suggestions applied for this role.');
            }
        } catch (_error) {
            if (requestId !== roleAiRequestIdRef.current) return;
            setRoleSuggestedSkills(Array.isArray(fallbackDefaults?.skills) ? fallbackDefaults.skills : []);
            setRoleSuggestedLicenses(Array.isArray(fallbackDefaults?.certifications) ? fallbackDefaults.certifications : []);
            setRoleSuggestedSalary(Number(fallbackDefaults?.suggestedSalary || 0));
            if (!auto) {
                setFormAssistMessage('AI unavailable right now. Showing role-based local suggestions.');
            }
        } finally {
            if (requestId === roleAiRequestIdRef.current) {
                setAiAssistLoading(false);
            }
        }
    }, [isCustomSalary]);

    const applyWorkerSmartPreset = useCallback(() => {
        const roleTitle = String(editingProfile?.roleTitle || '').trim();
        if (!roleTitle) {
            setFormAssistMessage('Enter a role title first to apply defaults.');
            return;
        }
        applyRoleDefaults(roleTitle, { announce: true, applySalaryIfMissing: true });
    }, [applyRoleDefaults, editingProfile?.roleTitle]);

    const handleAiProfileAssist = useCallback(async () => {
        const roleTitle = String(editingProfile?.roleTitle || '').trim();
        if (!roleTitle) {
            setFormAssistMessage('Enter a role title first to refresh AI suggestions.');
            return;
        }
        await runRoleAiAssist(roleTitle, { auto: false, force: true });
    }, [editingProfile?.roleTitle, runRoleAiAssist]);

    useEffect(() => {
        if (!isModalVisible) return undefined;
        const roleTitle = String(editingProfile?.roleTitle || '').trim();
        if (roleTitle.length < 2) return undefined;
        const roleKey = normalizeToken(roleTitle);
        if (!roleKey) return undefined;

        if (roleDefaultsAppliedKeyRef.current !== roleKey) {
            applyRoleDefaults(roleTitle, { announce: false, applySalaryIfMissing: true });
            roleDefaultsAppliedKeyRef.current = roleKey;
        }

        if (roleAiDebounceRef.current) {
            clearTimeout(roleAiDebounceRef.current);
        }
        roleAiDebounceRef.current = setTimeout(() => {
            runRoleAiAssist(roleTitle, { auto: true, force: false });
        }, ROLE_AI_DEBOUNCE_MS);

        return () => {
            if (roleAiDebounceRef.current) {
                clearTimeout(roleAiDebounceRef.current);
            }
        };
    }, [applyRoleDefaults, editingProfile?.roleTitle, isModalVisible, runRoleAiAssist]);

    useEffect(() => {
        if (isModalVisible) return;
        roleDefaultsAppliedKeyRef.current = '';
        roleAiCacheRef.current = {};
        if (roleAiDebounceRef.current) {
            clearTimeout(roleAiDebounceRef.current);
            roleAiDebounceRef.current = null;
        }
    }, [isModalVisible]);

    const handleAvatarPress = useCallback(async () => {
        if (!editingProfile) return;

        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission needed', 'Allow photo access to upload avatar');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });

        if (result.canceled || !result.assets?.length) return;

        const asset = result.assets[0];
        const uri = asset.uri;
        if (!uri) return;

        setEditingProfile((prev) => (prev ? { ...prev, avatar: uri } : prev));
        setUploadingAvatar(true);

        try {
            const fileName = uri.split('/').pop() || `avatar-${Date.now()}.jpg`;
            const mimeType = asset.mimeType || 'image/jpeg';
            const formData = new FormData();
            formData.append('avatar', { uri, name: fileName, type: mimeType });

            const response = await client.post('/api/settings/avatar', formData, {
                __allowWhenCircuitOpen: true,
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            const nextAvatar = response?.data?.avatarUrl || uri;
            setEditingProfile((prev) => (prev ? { ...prev, avatar: nextAvatar } : prev));
            setProfiles((prev) => prev.map((profile) => (
                profile._id === editingProfile._id
                    ? { ...profile, avatar: nextAvatar }
                    : profile
            )));
        } catch (error) {
            Alert.alert('Upload failed', 'Please try again');
        } finally {
            setUploadingAvatar(false);
        }
    }, [editingProfile]);

    const handleSave = async () => {
        if (!editingProfile) return;

        const roleTitle = String(editingProfile.roleTitle || '').trim();
        const location = String(editingProfile.location || '').trim();

        if (!roleTitle) {
            Alert.alert('Missing Field', 'Role Title is required.');
            return;
        }
        if (!location) {
            Alert.alert('Missing Field', 'Location is required.');
            return;
        }

        const profileId = String(editingProfile.profileId || editingProfile._id || generateProfileId());
        const nameParts = String(editingProfile.name || '').trim().split(' ').filter(Boolean);
        const accountNameParts = sanitizeProfileNamePrefill(user?.name || '').split(' ').filter(Boolean);
        const firstName = nameParts[0] || accountNameParts[0] || 'Profile';
        const lastName = nameParts.length > 1
            ? nameParts.slice(1).join(' ')
            : accountNameParts.slice(1).join(' ');
        const safeExperience = Number.isFinite(Number(editingProfile.experienceYears))
            ? Number(editingProfile.experienceYears)
            : 0;
        const safeAvailability = [0, 15, 30].includes(Number(editingProfile.availabilityWindowDays))
            ? Number(editingProfile.availabilityWindowDays)
            : 0;
        const rawSkills = Array.isArray(editingProfile.skills) ? editingProfile.skills.filter(Boolean) : [];
        const skills = rawSkills.length > 0
            ? rawSkills
            : (roleTitle ? [roleTitle] : []);

        const payload = {
            profileId,
            roleName: roleTitle,
            experienceInRole: safeExperience,
            ...(Number.isFinite(Number(editingProfile.expectedSalary))
                ? { expectedSalary: Number(editingProfile.expectedSalary) }
                : {}),
            skills,
            activeProfile: Boolean(editingProfile.activeProfile),
            createdAt: editingProfile.createdAt || new Date().toISOString(),
            firstName,
            lastName,
            city: location,
            language: String(editingProfile.language || '').trim(),
            totalExperience: safeExperience,
            preferredShift: SHIFT_OPTIONS.includes(String(editingProfile.preferredShift || '').trim())
                ? String(editingProfile.preferredShift || '').trim()
                : 'Flexible',
            isAvailable: editingProfile.isAvailable !== false,
            availabilityWindowDays: safeAvailability,
            openToRelocation: Boolean(editingProfile.openToRelocation),
            openToNightShift: Boolean(editingProfile.openToNightShift),
            licenses: Array.isArray(editingProfile.licenses)
                ? editingProfile.licenses.filter(Boolean)
                : [],
        };

        try {
            if (editingProfile.isNew) {
                await client.post('/api/users/profiles', payload, {
                    __skipApiErrorHandler: true,
                    __allowWhenCircuitOpen: true,
                });
            } else {
                await client.put(`/api/users/profiles/${encodeURIComponent(profileId)}`, payload, {
                    __skipApiErrorHandler: true,
                    __allowWhenCircuitOpen: true,
                });
            }

            if (payload.activeProfile) {
                await client.post(`/api/users/profiles/${encodeURIComponent(profileId)}/activate`, {}, {
                    __skipApiErrorHandler: true,
                    __allowWhenCircuitOpen: true,
                }).catch(() => { });
            }

            await client.post('/api/users/profile/complete', {}, {
                __skipApiErrorHandler: true,
                __allowWhenCircuitOpen: true,
            }).catch(() => { });

            await updateUserInfo?.({
                hasCompletedProfile: true,
                profileComplete: true,
            });
            await invalidateJobMatchCache();
            await fetchProfileData();
        } catch (error) {
            Alert.alert('Save failed', error?.response?.data?.message || error?.message || 'Unable to save profile right now.');
            return;
        }

        setEditingProfile(null);
        setIsModalVisible(false);
        setAiAssistLoading(false);
        setFormAssistMessage('');
        Alert.alert(
            'Saved',
            'Profile updated successfully. Check your matching jobs now?',
            [
                { text: 'Later', style: 'cancel' },
                {
                    text: 'View Matches',
                    onPress: () => navigation.navigate('MainTab', {
                        screen: 'Jobs',
                        params: {
                            source: 'profile_saved',
                            highlightMatches: true,
                        },
                    }),
                },
            ]
        );
    };

    const handleSetActiveProfile = useCallback(async (profileId) => {
        if (!profileId) return;
        try {
            await client.post(`/api/users/profiles/${encodeURIComponent(profileId)}/activate`, {}, {
                __skipApiErrorHandler: true,
                __allowWhenCircuitOpen: true,
            });
            await invalidateJobMatchCache();
            await fetchProfileData();
        } catch (error) {
            Alert.alert('Action failed', error?.response?.data?.message || 'Unable to set active profile right now.');
        }
    }, [fetchProfileData, invalidateJobMatchCache]);

    const handleDeleteProfile = useCallback((profileEntry, profileIndex = 0) => {
        const candidateIds = Array.from(new Set([
            resolveProfileIdForApi(profileEntry, profileIndex),
            normalizeProfileIdLikeBackend(profileEntry?.profileId || '', ''),
            normalizeProfileIdLikeBackend(profileEntry?._id || '', ''),
        ].filter(Boolean)));
        if (!profileEntry && candidateIds.length === 0) return;

        Alert.alert(
            'Delete Profile',
            'This profile will be removed permanently.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        setSuppressedProfileIds((previous) => Array.from(new Set([
                            ...previous,
                            ...candidateIds,
                        ])));

                        const matchesDeleteTarget = (item, itemIndex = 0) => {
                            if (!item) return false;
                            if (candidateIds.includes(resolveProfileIdForApi(item, itemIndex))) return true;
                            return isSameProfileEntry(profileEntry || {}, item, profileIndex, itemIndex);
                        };

                        const remainingLocalProfiles = profiles.filter((item, itemIndex) => (
                            !matchesDeleteTarget(item, itemIndex)
                        ));
                        const hasMeaningfulProfiles = remainingLocalProfiles.some(hasMeaningfulProfileData);

                        const editingProfileTargetsDeleted = (
                            editingProfile
                            && matchesDeleteTarget(editingProfile, profileIndex)
                        );
                        if (editingProfileTargetsDeleted) {
                            setIsModalVisible(false);
                            setEditingProfile(null);
                            setAiAssistLoading(false);
                            setFormAssistMessage('');
                        }

                        setProfiles(remainingLocalProfiles);
                        setPools([]);
                        setPoolProfiles([]);
                        setSelectedPool(null);
                        setSelectedCandidate(null);
                        if (hasMeaningfulProfiles) {
                            AsyncStorage.setItem(WORKER_PROFILE_CACHE_KEY, JSON.stringify(remainingLocalProfiles)).catch(() => { });
                        } else {
                            AsyncStorage.removeItem(WORKER_PROFILE_CACHE_KEY).catch(() => { });
                        }

                        if (typeof updateUserInfo === 'function') {
                            await updateUserInfo({
                                hasCompletedProfile: hasMeaningfulProfiles,
                                profileComplete: hasMeaningfulProfiles,
                            }).catch(() => { });
                        }

                        try {
                            let mutationResponse = null;
                            let lastDeleteError = null;

                            for (const candidateId of candidateIds) {
                                try {
                                    mutationResponse = await client.delete(`/api/users/profiles/${encodeURIComponent(candidateId)}`, {
                                        __skipApiErrorHandler: true,
                                        __allowWhenCircuitOpen: true,
                                    });
                                    break;
                                } catch (deleteError) {
                                    lastDeleteError = deleteError;
                                    const status = Number(deleteError?.response?.status || 0);
                                    if (![400, 404, 405].includes(status)) {
                                        break;
                                    }
                                }
                            }

                            if (!mutationResponse) {
                                const roleProfilesPayload = buildRoleProfilesPayloadFromUiProfiles(remainingLocalProfiles);
                                try {
                                    mutationResponse = await client.put('/api/users/profile', {
                                        roleProfiles: roleProfilesPayload,
                                    }, {
                                        __skipApiErrorHandler: true,
                                        __allowWhenCircuitOpen: true,
                                    });
                                } catch (replaceError) {
                                    const needsNeutralFallback = roleProfilesPayload.length === 0 && isProfileRoleGateError(replaceError);
                                    if (needsNeutralFallback) {
                                        mutationResponse = await client.put('/api/users/profile', {
                                            roleProfiles: buildNeutralRoleProfilesPayload(),
                                        }, {
                                            __skipApiErrorHandler: true,
                                            __allowWhenCircuitOpen: true,
                                        });
                                    } else if (lastDeleteError) {
                                        throw lastDeleteError;
                                    } else {
                                        throw replaceError;
                                    }
                                }
                            }

                            const completion = mutationResponse?.data?.profileCompletion || null;
                            if (completion) {
                                const isComplete = Boolean(completion?.meetsProfileCompleteThreshold);
                                await updateUserInfo?.({
                                    hasCompletedProfile: isComplete,
                                    profileComplete: isComplete,
                                });
                            } else {
                                await updateUserInfo?.({
                                    hasCompletedProfile: hasMeaningfulProfiles,
                                    profileComplete: hasMeaningfulProfiles,
                                });
                            }

                            await invalidateJobMatchCache({ deepClean: true });
                            await fetchProfileData({ preservePreviousOnIncomplete: false });
                        } catch (error) {
                            logger.warn('Profile delete sync issue:', error?.message || error);
                            await invalidateJobMatchCache({ deepClean: true });
                            await fetchProfileData({ preservePreviousOnIncomplete: false }).catch(() => { });
                            Alert.alert('Delete failed', 'Profile was removed locally. Server sync may take a moment, please refresh once.');
                        }
                    },
                },
            ]
        );
    }, [editingProfile, fetchProfileData, invalidateJobMatchCache, profiles, updateUserInfo]);

    const goBackFromPool = () => setSelectedPool(null);
    const goBackFromCandidate = () => setSelectedCandidate(null);
    const handleOpenSmartInterview = useCallback(() => {
        navigation.navigate('SmartInterview');
    }, [navigation]);
    const handleCreateFirstProfile = useCallback(() => {
        const seed = profiles.find((profile) => Boolean(profile.activeProfile)) || profiles[0] || {};
        const profileId = generateProfileId();
        const hasExistingProfile = profiles.some(hasMeaningfulProfileData);
        setEditingProfile({
            _id: profileId,
            profileId,
            name: sanitizeProfileNamePrefill(seed?.name || user?.name || ''),
            roleTitle: '',
            experienceYears: null,
            expectedSalary: null,
            skills: [],
            location: '',
            language: '',
            preferredShift: 'Flexible',
            isAvailable: true,
            availabilityWindowDays: 0,
            openToRelocation: false,
            openToNightShift: false,
            licenses: [],
            avatar: seed?.avatar || null,
            interviewVerified: false,
            activeProfile: !hasExistingProfile,
            isDefault: !hasExistingProfile,
            createdAt: new Date().toISOString(),
            isNew: true,
        });
        setSkillInput('');
        setLicenseInput('');
        setAiAssistLoading(false);
        setFormAssistMessage('');
        setRoleSuggestedSkills([]);
        setRoleSuggestedLicenses([]);
        setRoleSuggestedSalary(0);
        setIsCustomExperience(false);
        setIsCustomSalary(false);
        roleDefaultsAppliedKeyRef.current = '';
        setIsModalVisible(true);
    }, [profiles, user?.name]);
    const handleOpenQuickProfileForm = useCallback(() => {
        handleCreateFirstProfile();
    }, [handleCreateFirstProfile]);

    const closeEditModal = useCallback(() => {
        setIsModalVisible(false);
        setAiAssistLoading(false);
        setFormAssistMessage('');
        setEditingProfile(null);
        setSkillInput('');
        setLicenseInput('');
        setRoleSuggestedSkills([]);
        setRoleSuggestedLicenses([]);
        setRoleSuggestedSalary(0);
        setIsCustomExperience(false);
        setIsCustomSalary(false);
    }, []);

    const submitProfileReport = useCallback(async (targetId, reason) => {
        try {
            await client.post('/api/reports', {
                targetId,
                targetType: 'profile',
                reason,
            });
        } catch (_error) {
            Alert.alert('Report failed', 'Could not submit report right now.');
            return;
        }

        Alert.alert('Report submitted', 'Thanks. Our safety team will review this profile.');
    }, []);

    const handleReportProfile = useCallback((targetId) => {
        if (!targetId) return;
        Alert.alert('Report profile', 'Choose a reason', [
            { text: 'Spam', onPress: () => submitProfileReport(targetId, 'spam') },
            { text: 'Misleading details', onPress: () => submitProfileReport(targetId, 'misleading') },
            { text: 'Unsafe behavior', onPress: () => submitProfileReport(targetId, 'unsafe') },
            { text: 'Cancel', style: 'cancel' },
        ]);
    }, [submitProfileReport]);

    // ── EMPLOYER VIEW ──────────────────────────────────────────────────────
    const renderEmployerFlow = () => {
        if (selectedCandidate) {
            return (
                <View style={styles.flex1}>
                    <View style={[styles.headerPurple, { paddingTop: insets.top + 16 }]}>
                        <TouchableOpacity style={styles.backBtnLight} onPress={goBackFromCandidate}>
                            <Text style={styles.backTextLight}>‹</Text>
                        </TouchableOpacity>
                        <Text style={styles.headerTitleLight}>Candidate Profile</Text>
                    </View>
                    <ScrollView style={styles.flex1} contentContainerStyle={{ paddingBottom: 40 }}>
                        <View style={styles.candidateHero}>
                            <Image
                                source={{ uri: `https://ui-avatars.com/api/?name=${selectedCandidate.roleTitle}&background=7c3aed&color=fff&size=128` }}
                                style={styles.candidateHeroImage}
                            />
                            <Text style={styles.candidateHeroTitle}>{selectedCandidate.roleTitle} Expert</Text>
                            <View style={styles.candidateHeroLocationRow}>
                                <IconMapPin size={14} color="#a855f7" />
                                <Text style={styles.candidateHeroLocation}>{selectedCandidate.location}</Text>
                            </View>
                            <TouchableOpacity
                                style={styles.reportProfileBtn}
                                onPress={() => handleReportProfile(selectedCandidate.id)}
                                activeOpacity={0.85}
                            >
                                <Text style={styles.reportProfileBtnText}>Report Profile</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.candyWrapper}>
                            <View style={styles.candyCard}>
                                <View style={styles.candyCardTop}>
                                    <Text style={styles.candyCardTitle}>Professional Summary</Text>
                                    <View style={styles.candyResumeBtn}>
                                        <Text style={styles.candyResumeText}>VIEW RESUME</Text>
                                    </View>
                                </View>
                                <Text style={styles.candySummaryText}>{selectedCandidate.summary}</Text>
                            </View>
                            <View style={styles.candyCard}>
                                <Text style={styles.candyCardTitle}>Experience & Skills</Text>
                                <View style={styles.candidateSkillRow}>
                                    <View style={styles.candidateExpBox}>
                                        <Text style={styles.candidateExpValue}>{selectedCandidate.experienceYears || 0}</Text>
                                        <Text style={styles.candidateExpLabel}>YEARS EXP</Text>
                                    </View>
                                    <View style={styles.candidateSkillsWrap}>
                                        {(selectedCandidate.skills || []).map((skill) => (
                                            <View key={skill} style={styles.candidateSkillChip}>
                                                <Text style={styles.candidateSkillText}>{skill}</Text>
                                            </View>
                                        ))}
                                        {(!selectedCandidate.skills || selectedCandidate.skills.length === 0) ? (
                                            <Text style={styles.candidateNoSkillsText}>No skills listed</Text>
                                        ) : null}
                                    </View>
                                </View>
                            </View>
                        </View>
                    </ScrollView>
                </View>
            );
        }

        if (selectedPool) {
            return (
                <View style={[styles.containerLight]}>
                    <View style={[styles.headerPurple, { paddingTop: insets.top + 16 }]}>
                        <TouchableOpacity style={styles.backBtnLight} onPress={goBackFromPool}>
                            <Text style={styles.backTextLight}>‹</Text>
                        </TouchableOpacity>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.headerTitleLight}>{selectedPool.name}</Text>
                            <Text style={styles.headerSubLight}>{selectedPool.count} CANDIDATES FOUND</Text>
                        </View>
                    </View>
                    {isLoading ? (
                        <View style={styles.pad16}>
                            <SkeletonLoader height={82} style={{ borderRadius: 16, marginBottom: 16 }} />
                            <SkeletonLoader height={82} style={{ borderRadius: 16, marginBottom: 16 }} />
                            <SkeletonLoader height={82} style={{ borderRadius: 16, marginBottom: 16 }} />
                        </View>
                    ) : poolProfiles.length === 0 ? (
                        <EmptyState
                            title="No Candidates Yet"
                            message="Candidates will appear here when matching is available for this job."
                            icon={<IconUsers size={56} color="#94a3b8" />}
                        />
                    ) : (
                        <ScrollView style={styles.flex1} contentContainerStyle={styles.pad16}>
                            {poolProfiles && poolProfiles.map((prof) => (
                                <TouchableOpacity
                                    key={prof.id}
                                    style={styles.poolCandCard}
                                    activeOpacity={0.8}
                                    onPress={() => setSelectedCandidate(prof)}
                                >
                                    <Image source={{ uri: `https://ui-avatars.com/api/?name=${encodeURIComponent(String(prof?.name || prof?.roleTitle || 'Candidate'))}&background=7c3aed&color=fff` }} style={styles.poolCandImg} />
                                    <View style={styles.flex1}>
                                        <Text style={styles.poolCandTitle} numberOfLines={1}>{prof?.name || 'Candidate'}</Text>
                                        <Text style={styles.poolCandMeta}>{prof?.roleTitle || 'Candidate'}</Text>
                                        <Text style={styles.poolCandMeta}>{prof?.experienceYears || 0} Years Exp • {prof?.location || 'Remote'}</Text>
                                    </View>
                                    <TouchableOpacity
                                        style={styles.poolReportBtn}
                                        onPress={() => handleReportProfile(prof.id)}
                                        activeOpacity={0.8}
                                    >
                                        <Text style={styles.poolReportBtnText}>Report</Text>
                                    </TouchableOpacity>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    )}
                </View>
            );
        }

        return (
            <View style={[styles.containerLight]}>
                <View style={[styles.headerPurple, { paddingTop: insets.top + 16, paddingBottom: 24, paddingHorizontal: 24 }]}>
                    <Text style={styles.employerTitle}>Talent Pools</Text>
                    <Text style={styles.employerSub}>Organize and track your candidate pipelines</Text>
                </View>
                {isLoading ? (
                    <View style={styles.pad16}>
                        <SkeletonLoader height={120} style={{ borderRadius: 16, marginBottom: 16 }} />
                        <SkeletonLoader height={120} style={{ borderRadius: 16, marginBottom: 16 }} />
                    </View>
                ) : pools.length === 0 ? (
                    <EmptyState
                        title="No Talent Pools Yet"
                        message="Create your first post to see matching talent."
                        icon={<IconBriefcase size={56} color="#94a3b8" />}
                    />
                ) : (
                    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                        {pools.map(pool => (
                            <View key={pool.id} style={styles.poolCardBox}>
                                <View style={styles.poolBoxTop}>
                                    <Text style={styles.poolBoxTitle}>{pool.name}</Text>
                                    <View style={styles.poolBoxBadge}>
                                        <Text style={styles.poolBoxBadgeText}>{pool.count} Candidates</Text>
                                    </View>
                                </View>
                                <TouchableOpacity
                                    style={styles.poolBoxBtn}
                                    activeOpacity={0.8}
                                    onPress={() => setSelectedPool(pool)}
                                >
                                    <Text style={styles.poolBoxBtnText}>View Candidates</Text>
                                </TouchableOpacity>
                            </View>
                        ))}
                        <View style={{ height: 40 }} />
                    </ScrollView>
                )}
            </View>
        );
    };

    // ── EMPLOYEE VIEW ──────────────────────────────────────────────────────

    const renderEmployeeView = () => {
        const meaningfulProfiles = profiles.filter(hasMeaningfulProfileData);

        return (
            <View style={styles.flex1}>
                <View style={[styles.employeeHeader, { paddingTop: insets.top + 16 }]}>
                    <View style={styles.employeeHeaderTopRow}>
                        <View style={styles.employeeTitleWrap}>
                            <Text style={styles.employeeTitle}>Profile Studio</Text>
                            <Text style={styles.employeeTitleHint}>Build cleaner profiles, get stronger matches</Text>
                        </View>
                        <View style={styles.createActionsRow}>
                            <TouchableOpacity style={styles.quickFormBtn} onPress={handleOpenQuickProfileForm} activeOpacity={0.85}>
                                <IconPlus size={13} color="#6d28d9" />
                                <Text style={styles.quickFormBtnText}>Create Profile</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                    <Text style={styles.employeeSub}>Manage your diverse skillsets and job-specific profiles.</Text>
                </View>

                {(isLoading && profiles.length === 0) ? (
                    <View style={styles.scrollContent}>
                        <SkeletonLoader height={84} style={{ borderRadius: 12, marginBottom: 12 }} />
                        <SkeletonLoader height={160} style={{ borderRadius: 24, marginBottom: 16 }} />
                        <SkeletonLoader height={160} style={{ borderRadius: 24, marginBottom: 16 }} />
                    </View>
                ) : meaningfulProfiles.length === 0 ? (
                    <View style={styles.scrollContent}>
                        <View style={styles.profileStarterCard}>
                            <View style={styles.profileStarterIconWrap}>
                                <IconUsers size={26} color="#7c3aed" />
                            </View>
                            <Text style={styles.profileStarterTitle}>Create your first profile</Text>
                            <Text style={styles.profileStarterText}>
                                Start with a clean profile form and add your details manually.
                            </Text>
                            <View style={styles.profileStarterActions}>
                                <TouchableOpacity style={styles.profileStarterButton} onPress={handleCreateFirstProfile} activeOpacity={0.85}>
                                    <Text style={styles.profileStarterButtonText}>Quick Form</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.profileStarterInterviewButton} onPress={handleOpenSmartInterview} activeOpacity={0.85}>
                                    <Text style={styles.profileStarterInterviewButtonText}>AI Interview</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                ) : (
                    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                        {meaningfulProfiles.map((prof, profileIndex) => (
                            <View key={prof._id} style={[styles.empProfileCard, prof.isDefault && styles.empProfileCardDefault]}>
                                <View style={styles.empProfTopRow}>
                                    <Text style={styles.empProfTitle}>{prof.roleTitle || ''}</Text>
                                    <View style={styles.empProfBadgeRow}>
                                        {prof.interviewVerified ? (
                                            <View style={styles.empProfVerifiedBadge}>
                                                <Text style={styles.empProfVerifiedText}>Verified Interview Profile</Text>
                                            </View>
                                        ) : null}
                                        {prof.isDefault && (
                                            <View style={styles.empProfDefaultBadge}>
                                                <Text style={styles.empProfDefaultText}>DEFAULT</Text>
                                            </View>
                                        )}
                                    </View>
                                </View>
                                {String(prof.summary || '').trim() ? (
                                    <Text style={styles.empProfSummary} numberOfLines={2}>
                                        {String(prof.summary || '').trim()}
                                    </Text>
                                ) : null}

                                <View style={styles.empProfSkillsRow}>
                                    {prof?.skills && prof.skills.slice(0, 4).map((s, idx) => (
                                        <View key={idx} style={styles.empProfSkillPill}>
                                            <Text style={styles.empProfSkillText}>{s}</Text>
                                        </View>
                                    ))}
                                </View>

                                <View style={styles.empProfFooter}>
                                    {(
                                        (Number.isFinite(Number(prof?.experienceYears)) && Number(prof.experienceYears) > 0)
                                        || String(prof?.location || '').trim()
                                    ) ? (
                                        <View style={styles.empProfLocRow}>
                                            <IconMapPin size={12} color="#94a3b8" />
                                            <Text style={styles.empProfLocText}>
                                                {[
                                                    (Number.isFinite(Number(prof?.experienceYears)) && Number(prof.experienceYears) > 0)
                                                        ? `${Number(prof.experienceYears)} Years Exp.`
                                                        : '',
                                                    String(prof?.location || '').trim(),
                                                ].filter(Boolean).join(' • ')}
                                            </Text>
                                        </View>
                                    ) : (
                                        <View style={styles.empProfLocRow} />
                                    )}
                                    <View style={styles.empProfActions}>
                                        {!prof.activeProfile ? (
                                            <TouchableOpacity style={styles.empProfSecondaryBtn} onPress={() => handleSetActiveProfile(prof.profileId || prof._id)}>
                                                <Text style={styles.empProfSecondaryText}>SET ACTIVE</Text>
                                            </TouchableOpacity>
                                        ) : null}
                                        <TouchableOpacity style={styles.empProfEditBtn} onPress={() => openEdit(prof)}>
                                            <Text style={styles.empProfEditText}>EDIT</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity style={styles.empProfDeleteBtn} onPress={() => handleDeleteProfile(prof, profileIndex)}>
                                            <Text style={styles.empProfDeleteText}>DELETE</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </View>
                        ))}
                        <View style={{ height: 40 }} />
                    </ScrollView>
                )}
            </View>
        );
    };

    return (
        <View style={styles.container}>
            {role === 'employee' ? renderEmployeeView() : renderEmployerFlow()}

            {/* Edit Profile Modal */}
            <Modal visible={isModalVisible} animationType="slide" transparent onRequestClose={closeEditModal}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
                    <View style={styles.modalSheet}>
                        <View style={styles.modalHeader}>
                            <View style={styles.modalHeaderCopy}>
                                <Text style={styles.modalEyebrow}>PROFILE STUDIO</Text>
                                <Text style={styles.modalTitle}>Polish Your Profile</Text>
                                <Text style={styles.modalSubtitle}>Make every field count for better-quality opportunities.</Text>
                            </View>
                            <TouchableOpacity onPress={closeEditModal} style={styles.modalCloseBtn} activeOpacity={0.85}>
                                <IconX size={20} color="#6b7280" />
                            </TouchableOpacity>
                        </View>

                        {editingProfile && (
                            <ScrollView
                                showsVerticalScrollIndicator={false}
                                contentContainerStyle={styles.modalScroll}
                                keyboardShouldPersistTaps="handled"
                                keyboardDismissMode="on-drag"
                            >
                                <View style={styles.avatarSection}>
                                    <View style={styles.avatarStage}>
                                        <View style={styles.avatarHalo} />
                                        <Image
                                            source={{ uri: editingProfile.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(editingProfile.name || editingProfile.roleTitle)}&background=9333ea&color=fff&size=128` }}
                                            style={styles.avatarPreview}
                                        />
                                        {uploadingAvatar ? (
                                            <View style={styles.avatarUploadingOverlay}>
                                                <ActivityIndicator color="#ffffff" size="small" />
                                            </View>
                                        ) : null}
                                    </View>
                                    <TouchableOpacity
                                        style={styles.changePhotoBtn}
                                        onPress={handleAvatarPress}
                                        activeOpacity={0.85}
                                    >
                                        <Text style={styles.changePhotoText}>Change Photo</Text>
                                    </TouchableOpacity>
                                </View>

                                <View style={styles.formSectionCard}>
                                    <Text style={styles.formSectionTitle}>Profile Basics</Text>
                                    <Text style={styles.formSectionSub}>Add only key details to improve matching quality.</Text>
                                    <View style={styles.formAssistActions}>
                                        <TouchableOpacity
                                            style={styles.formAssistPrimaryBtn}
                                            activeOpacity={0.85}
                                            onPress={handleAiProfileAssist}
                                            disabled={aiAssistLoading}
                                        >
                                            <Text style={styles.formAssistPrimaryBtnText}>
                                                {aiAssistLoading ? 'Refreshing...' : 'Refresh AI'}
                                            </Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={styles.formAssistSecondaryBtn}
                                            activeOpacity={0.85}
                                            onPress={applyWorkerSmartPreset}
                                        >
                                            <Text style={styles.formAssistSecondaryBtnText}>Role Defaults</Text>
                                        </TouchableOpacity>
                                    </View>
                                    {String(formAssistMessage || '').trim() ? (
                                        <Text style={styles.formAssistMessage}>{formAssistMessage}</Text>
                                    ) : null}

                                    <View style={styles.inputGroup}>
                                        <Text style={styles.inputLabel}>FULL NAME</Text>
                                        <TextInput
                                            style={styles.inputField}
                                            value={editingProfile.name || ''}
                                            onChangeText={(t) => patchEditingProfile({ name: t })}
                                            placeholder="Your full name"
                                            placeholderTextColor="#94a3b8"
                                        />
                                    </View>

                                    <View style={styles.inputGroup}>
                                        <Text style={styles.inputLabel}>ROLE TITLE</Text>
                                        <TypeaheadInput
                                            value={String(editingProfile.roleTitle || '')}
                                            onChangeText={(value) => patchEditingProfile({ roleTitle: value })}
                                            placeholder="Search role title"
                                            suggestions={roleTitleTypeaheadOptions}
                                            formatSuggestion={(item) => item}
                                            onSelectSuggestion={(value) => {
                                                const selectedRole = String(value || '').trim();
                                                patchEditingProfile({ roleTitle: selectedRole });
                                                if (!selectedRole) return;
                                                applyRoleDefaults(selectedRole, { announce: false, applySalaryIfMissing: true });
                                                roleDefaultsAppliedKeyRef.current = normalizeToken(selectedRole);
                                                runRoleAiAssist(selectedRole, { auto: true, force: false });
                                            }}
                                        />
                                        <View style={styles.inlineMetaRow}>
                                            <Text style={styles.inlineMetaText}>
                                                {inferredRoleCategory
                                                    ? `${inferredRoleCategory} role selected`
                                                    : 'Role-based skills and certifications will load automatically.'}
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={styles.inputGroup}>
                                        <Text style={styles.inputLabel}>CITY</Text>
                                        <TypeaheadInput
                                            value={String(editingProfile.location || '')}
                                            onChangeText={(value) => patchEditingProfile({ location: value })}
                                            placeholder="Your city"
                                            suggestions={buildTypeaheadSuggestions(
                                                editingProfile.location,
                                                cityTypeaheadOptions,
                                                8
                                            )}
                                            onSelectSuggestion={(value) => patchEditingProfile({ location: value })}
                                        />
                                        <Text style={styles.inputHelperText}>Type to pick or add your city.</Text>
                                    </View>

                                    <View style={styles.inputGroup}>
                                        <Text style={styles.inputLabel}>LANGUAGE</Text>
                                        <TypeaheadInput
                                            value={String(editingProfile.language || '')}
                                            onChangeText={(value) => patchEditingProfile({ language: value })}
                                            placeholder="Primary language"
                                            suggestions={buildTypeaheadSuggestions(
                                                editingProfile.language,
                                                languageTypeaheadOptions,
                                                6
                                            )}
                                            onSelectSuggestion={(value) => patchEditingProfile({ language: value })}
                                        />
                                        <Text style={styles.inputHelperText}>Use one primary language for matching.</Text>
                                    </View>

                                    <View style={styles.inputGroup}>
                                        <View style={styles.inputLabelRow}>
                                            <Text style={styles.inputLabel}>YEARS OF EXPERIENCE</Text>
                                            <TouchableOpacity
                                                style={styles.inlineTextActionBtn}
                                                activeOpacity={0.85}
                                                onPress={() => setIsCustomExperience((prev) => !prev)}
                                            >
                                                <Text style={styles.inlineTextActionText}>
                                                    {isCustomExperience ? 'Use 0-10' : 'Custom'}
                                                </Text>
                                            </TouchableOpacity>
                                        </View>
                                        {isCustomExperience ? (
                                            <TextInput
                                                style={styles.inputField}
                                                value={editingProfile.experienceYears === null || editingProfile.experienceYears === undefined ? '' : String(editingProfile.experienceYears)}
                                                keyboardType="number-pad"
                                                onChangeText={(t) => patchEditingProfile({
                                                    experienceYears: String(t || '').trim() === '' ? null : Math.max(0, (parseInt(t, 10) || 0)),
                                                })}
                                                placeholder="Enter experience"
                                                placeholderTextColor="#94a3b8"
                                            />
                                        ) : (
                                            <TypeaheadInput
                                                value={editingProfile.experienceYears === null || editingProfile.experienceYears === undefined ? '' : String(editingProfile.experienceYears)}
                                                onChangeText={(value) => {
                                                    const digits = String(value || '').replace(/[^\d]/g, '');
                                                    if (!digits) {
                                                        patchEditingProfile({ experienceYears: null });
                                                        return;
                                                    }
                                                    const clamped = Math.max(0, Math.min(10, parseInt(digits, 10) || 0));
                                                    patchEditingProfile({ experienceYears: clamped });
                                                }}
                                                placeholder="Select 0 to 10"
                                                suggestions={EXPERIENCE_SELECTOR_VALUES.map((item) => ({
                                                    label: `${item} year${item === 1 ? '' : 's'}`,
                                                    value: String(item),
                                                    meta: item === 10 ? 'Max quick select' : 'Quick select',
                                                }))}
                                                formatSuggestion={(item) => item}
                                                onSelectSuggestion={(value) => {
                                                    const nextValue = Math.max(0, Math.min(10, parseInt(String(value || ''), 10) || 0));
                                                    patchEditingProfile({ experienceYears: nextValue });
                                                }}
                                                keyboardType="number-pad"
                                                autoCapitalize="none"
                                            />
                                        )}
                                        <Text style={styles.inputHelperText}>
                                            {isCustomExperience
                                                ? 'Custom accepts any positive number.'
                                                : 'Quick selector supports 0 to 10 years.'}
                                        </Text>
                                    </View>

                                    <View style={styles.inputGroup}>
                                        <View style={styles.inputLabelRow}>
                                            <Text style={styles.inputLabel}>EXPECTED MONTHLY PAY</Text>
                                            <TouchableOpacity
                                                style={styles.inlineTextActionBtn}
                                                activeOpacity={0.85}
                                                onPress={() => setIsCustomSalary((prev) => !prev)}
                                            >
                                                <Text style={styles.inlineTextActionText}>
                                                    {isCustomSalary ? 'Use Suggested' : 'Custom'}
                                                </Text>
                                            </TouchableOpacity>
                                        </View>
                                        <View style={styles.salarySuggestionCard}>
                                            <View style={styles.salarySuggestionCopy}>
                                                <Text style={styles.salarySuggestionLabel}>Market suggestion</Text>
                                                <Text style={styles.salarySuggestionValue}>
                                                    {effectiveSuggestedSalary > 0
                                                        ? `₹${Number(effectiveSuggestedSalary).toLocaleString('en-IN')}`
                                                        : 'Unavailable'}
                                                </Text>
                                            </View>
                                            <TouchableOpacity
                                                style={[
                                                    styles.salarySuggestionButton,
                                                    effectiveSuggestedSalary <= 0 && styles.salarySuggestionButtonDisabled,
                                                ]}
                                                activeOpacity={0.85}
                                                disabled={effectiveSuggestedSalary <= 0}
                                                onPress={() => {
                                                    if (effectiveSuggestedSalary <= 0) return;
                                                    setIsCustomSalary(false);
                                                    patchEditingProfile({ expectedSalary: Number(effectiveSuggestedSalary) });
                                                }}
                                            >
                                                <Text style={styles.salarySuggestionButtonText}>Use</Text>
                                            </TouchableOpacity>
                                        </View>
                                        {isCustomSalary ? (
                                            <TextInput
                                                style={styles.inputField}
                                                value={editingProfile.expectedSalary === null || editingProfile.expectedSalary === undefined ? '' : String(editingProfile.expectedSalary)}
                                                keyboardType="number-pad"
                                                onChangeText={(t) => patchEditingProfile({
                                                    expectedSalary: String(t || '').trim() === '' ? null : Math.max(0, (parseInt(t, 10) || 0)),
                                                })}
                                                placeholder="Enter expected salary"
                                                placeholderTextColor="#94a3b8"
                                            />
                                        ) : (
                                            <View style={styles.readonlyValueShell}>
                                                <Text style={styles.readonlyValueText}>
                                                    {Number(editingProfile.expectedSalary || 0) > 0
                                                        ? `Selected: ₹${Number(editingProfile.expectedSalary).toLocaleString('en-IN')}`
                                                        : 'Tap Use to apply market suggestion'}
                                                </Text>
                                            </View>
                                        )}
                                    </View>

                                </View>

                                <View style={styles.formSectionCard}>
                                    <Text style={styles.formSectionTitle}>Availability & Preferences</Text>
                                    <Text style={styles.formSectionSub}>Tell employers when and where you can work.</Text>

                                    <View style={styles.inputGroup}>
                                        <Text style={styles.inputLabel}>PREFERRED SHIFT</Text>
                                        <View style={styles.quickChipsRow}>
                                            {SHIFT_OPTIONS.map((shift) => (
                                                <TouchableOpacity
                                                    key={shift}
                                                    style={[
                                                        styles.choiceChip,
                                                        editingProfile.preferredShift === shift ? styles.choiceChipActive : null,
                                                    ]}
                                                    onPress={() => patchEditingProfile({ preferredShift: shift })}
                                                    activeOpacity={0.85}
                                                >
                                                    <Text style={[styles.choiceChipText, editingProfile.preferredShift === shift ? styles.choiceChipTextActive : null]}>
                                                        {shift}
                                                    </Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    </View>

                                    <View style={styles.inputGroup}>
                                        <Text style={styles.inputLabel}>JOINING AVAILABILITY</Text>
                                        <View style={styles.quickChipsRow}>
                                            {AVAILABILITY_OPTIONS.map((option) => (
                                                <TouchableOpacity
                                                    key={option.value}
                                                    style={[
                                                        styles.choiceChip,
                                                        Number(editingProfile.availabilityWindowDays || 0) === option.value ? styles.choiceChipActive : null,
                                                    ]}
                                                    onPress={() => patchEditingProfile({ availabilityWindowDays: option.value })}
                                                    activeOpacity={0.85}
                                                >
                                                    <Text style={[
                                                        styles.choiceChipText,
                                                        Number(editingProfile.availabilityWindowDays || 0) === option.value ? styles.choiceChipTextActive : null,
                                                    ]}>
                                                        {option.label}
                                                    </Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    </View>

                                    <View style={styles.preferenceGrid}>
                                        <TouchableOpacity
                                            style={[styles.preferenceTile, editingProfile.isAvailable ? styles.preferenceTileActive : null]}
                                            onPress={() => setEditingProfile((prev) => (
                                                prev ? { ...prev, isAvailable: !prev.isAvailable } : prev
                                            ))}
                                            activeOpacity={0.85}
                                        >
                                            <View style={[styles.preferenceCheck, editingProfile.isAvailable ? styles.preferenceCheckActive : null]}>
                                                {editingProfile.isAvailable ? <IconCheck size={12} color="#ffffff" /> : null}
                                            </View>
                                            <Text style={styles.preferenceTitle}>Open to opportunities</Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            style={[styles.preferenceTile, editingProfile.openToRelocation ? styles.preferenceTileActive : null]}
                                            onPress={() => setEditingProfile((prev) => (
                                                prev ? { ...prev, openToRelocation: !prev.openToRelocation } : prev
                                            ))}
                                            activeOpacity={0.85}
                                        >
                                            <View style={[styles.preferenceCheck, editingProfile.openToRelocation ? styles.preferenceCheckActive : null]}>
                                                {editingProfile.openToRelocation ? <IconCheck size={12} color="#ffffff" /> : null}
                                            </View>
                                            <Text style={styles.preferenceTitle}>Open to relocation</Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            style={[styles.preferenceTile, editingProfile.openToNightShift ? styles.preferenceTileActive : null]}
                                            onPress={() => setEditingProfile((prev) => (
                                                prev ? { ...prev, openToNightShift: !prev.openToNightShift } : prev
                                            ))}
                                            activeOpacity={0.85}
                                        >
                                            <View style={[styles.preferenceCheck, editingProfile.openToNightShift ? styles.preferenceCheckActive : null]}>
                                                {editingProfile.openToNightShift ? <IconCheck size={12} color="#ffffff" /> : null}
                                            </View>
                                            <Text style={styles.preferenceTitle}>Open to night shifts</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                <View style={styles.formSectionCard}>
                                    <Text style={styles.formSectionTitle}>Skills & Certifications</Text>
                                    <Text style={styles.formSectionSub}>Add what you can do and what you're certified for.</Text>

                                    <View style={styles.inputGroup}>
                                        <Text style={styles.inputLabel}>SKILLS</Text>
                                        <View style={styles.skillsRow}>
                                            {(editingProfile.skills || []).map((s, idx) => (
                                                <TouchableOpacity key={`${s}-${idx}`} style={styles.skillChip} onPress={() => handleRemoveSkill(idx)}>
                                                    <Text style={styles.skillChipText}>{s}</Text>
                                                    <Text style={styles.skillChipX}> ✕</Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                        <View style={styles.skillInputRow}>
                                            <TypeaheadInput
                                                value={skillInput}
                                                onChangeText={setSkillInput}
                                                placeholder="Add skill"
                                                onSubmitEditing={handleAddSkill}
                                                returnKeyType="done"
                                                suggestions={buildTypeaheadSuggestions(skillInput, skillTypeaheadOptions, 8)}
                                                onSelectSuggestion={(value) => {
                                                    const didAdd = addSkillToken(value);
                                                    if (didAdd) setSkillInput('');
                                                }}
                                                containerStyle={styles.skillTypeahead}
                                            />
                                            <TouchableOpacity style={styles.addSkillBtn} onPress={handleAddSkill}>
                                                <Text style={styles.addSkillBtnText}>+</Text>
                                            </TouchableOpacity>
                                        </View>
                                        <View style={styles.suggestedSkillsRow}>
                                            {roleSuggestedSkills.map((skill) => (
                                                <TouchableOpacity
                                                    key={skill}
                                                    style={styles.suggestedSkillChip}
                                                    onPress={() => {
                                                        setEditingProfile((prev) => {
                                                            const existing = Array.isArray(prev?.skills) ? prev.skills : [];
                                                            if (existing.some((item) => normalizeToken(item) === normalizeToken(skill))) return prev;
                                                            return { ...prev, skills: [...existing, skill] };
                                                        });
                                                    }}
                                                >
                                                    <Text style={styles.suggestedSkillText}>{skill}</Text>
                                                </TouchableOpacity>
                                            ))}
                                            {roleSuggestedSkills.length === 0 ? (
                                                <Text style={styles.suggestedEmptyText}>Role suggestions will appear here.</Text>
                                            ) : null}
                                        </View>
                                    </View>

                                    <View style={styles.inputGroup}>
                                        <Text style={styles.inputLabel}>LICENSES / CERTIFICATIONS</Text>
                                        <View style={styles.skillsRow}>
                                            {(editingProfile.licenses || []).map((license, idx) => (
                                                <TouchableOpacity key={`${license}-${idx}`} style={styles.licenseChip} onPress={() => handleRemoveLicense(idx)}>
                                                    <Text style={styles.licenseChipText}>{license}</Text>
                                                    <Text style={styles.skillChipX}> ✕</Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                        <View style={styles.skillInputRow}>
                                            <TypeaheadInput
                                                value={licenseInput}
                                                onChangeText={setLicenseInput}
                                                placeholder="Add certification"
                                                onSubmitEditing={handleAddLicense}
                                                returnKeyType="done"
                                                suggestions={buildTypeaheadSuggestions(licenseInput, licenseTypeaheadOptions, 8)}
                                                onSelectSuggestion={(value) => {
                                                    const nextToken = String(value || '').trim();
                                                    if (!nextToken) return;
                                                    setEditingProfile((prev) => {
                                                        const existing = Array.isArray(prev?.licenses) ? prev.licenses : [];
                                                        if (existing.some((item) => normalizeToken(item) === normalizeToken(nextToken))) return prev;
                                                        return { ...prev, licenses: [...existing, nextToken] };
                                                    });
                                                    setLicenseInput('');
                                                }}
                                                containerStyle={styles.skillTypeahead}
                                            />
                                            <TouchableOpacity style={styles.addSkillBtn} onPress={handleAddLicense}>
                                                <Text style={styles.addSkillBtnText}>+</Text>
                                            </TouchableOpacity>
                                        </View>
                                        <View style={styles.suggestedSkillsRow}>
                                            {roleSuggestedLicenses.map((license) => (
                                                <TouchableOpacity
                                                    key={license}
                                                    style={styles.suggestedSkillChip}
                                                    onPress={() => {
                                                        setEditingProfile((prev) => {
                                                            const existing = Array.isArray(prev?.licenses) ? prev.licenses : [];
                                                            if (existing.some((item) => normalizeToken(item) === normalizeToken(license))) return prev;
                                                            return { ...prev, licenses: [...existing, license] };
                                                        });
                                                    }}
                                                >
                                                    <Text style={styles.suggestedSkillText}>{license}</Text>
                                                </TouchableOpacity>
                                            ))}
                                            {roleSuggestedLicenses.length === 0 ? (
                                                <Text style={styles.suggestedEmptyText}>Role certifications will appear here.</Text>
                                            ) : null}
                                        </View>
                                    </View>
                                </View>
                                <View style={styles.modalActions}>
                                    <TouchableOpacity style={styles.cancelBtn} onPress={closeEditModal}>
                                        <Text style={styles.cancelBtnText}>Cancel</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                                        <Text style={styles.saveBtnText}>Save Changes</Text>
                                    </TouchableOpacity>
                                </View>
                            </ScrollView>
                        )}
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    containerLight: { flex: 1, backgroundColor: '#f8fafc' },
    flex1: { flex: 1 },
    pad16: { padding: 16 },

    // Employer Views
    headerPurple: { backgroundColor: '#9333ea', paddingHorizontal: 16, paddingBottom: 16, flexDirection: 'row', alignItems: 'center' },
    backBtnLight: { padding: 4, marginRight: 12, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 20, width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
    backTextLight: { color: '#fff', fontSize: 24, lineHeight: 28, fontWeight: '300' },
    headerTitleLight: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
    headerSubLight: { fontSize: 10, color: '#e9d5ff', textTransform: 'uppercase', letterSpacing: 1, marginTop: 4, fontWeight: '700' },

    employerTitle: { fontSize: 24, fontWeight: '900', color: '#fff', marginBottom: 4 },
    employerSub: { fontSize: 14, color: '#e9d5ff' },

    candidateHero: { alignItems: 'center', paddingTop: 32, paddingBottom: 24, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
    candidateHeroImage: { width: 96, height: 96, borderRadius: 48, marginBottom: 12, borderWidth: 4, borderColor: '#faf5ff' },
    candidateHeroTitle: { fontSize: 24, fontWeight: 'bold', color: '#0f172a', marginBottom: 8 },
    candidateHeroLocationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    candidateHeroLocation: { fontSize: 14, color: '#64748b', fontWeight: '500' },
    reportProfileBtn: {
        marginTop: 12,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        backgroundColor: '#f8fafc',
        paddingHorizontal: 12,
        paddingVertical: 7,
    },
    reportProfileBtnText: { fontSize: 11, fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: 0.4 },

    candyWrapper: { padding: 16 },
    candyCard: { backgroundColor: '#fff', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#f1f5f9', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 1 },
    candyCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    candyCardTitle: { fontWeight: 'bold', color: '#0f172a', fontSize: 16 },
    candyResumeBtn: { backgroundColor: '#faf5ff', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: '#f3e8ff' },
    candyResumeText: { fontSize: 10, fontWeight: '900', color: '#7c3aed', letterSpacing: 0.5 },
    candySummaryText: { fontSize: 14, color: '#475569', lineHeight: 22 },
    candidateSkillRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 12 },
    candidateExpBox: { width: 88, backgroundColor: '#faf5ff', borderWidth: 1, borderColor: '#e9d5ff', borderRadius: 12, alignItems: 'center', paddingVertical: 10, marginRight: 10 },
    candidateExpValue: { fontSize: 26, lineHeight: 28, fontWeight: '900', color: '#7c3aed' },
    candidateExpLabel: { fontSize: 9, fontWeight: '900', color: '#7c3aed', letterSpacing: 1 },
    candidateSkillsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, flex: 1 },
    candidateSkillChip: { backgroundColor: '#f8fafc', borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: 8, paddingVertical: 5 },
    candidateSkillText: { fontSize: 10, fontWeight: '900', color: '#475569', textTransform: 'uppercase' },
    candidateNoSkillsText: { fontSize: 12, color: '#94a3b8', fontWeight: '600' },

    poolCandCard: { backgroundColor: '#fff', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#f1f5f9', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 1, flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
    poolCandImg: { width: 48, height: 48, borderRadius: 24, borderWidth: 1, borderColor: '#f1f5f9', marginRight: 16 },
    poolCandTitle: { fontWeight: 'bold', color: '#0f172a', fontSize: 16, marginBottom: 4 },
    poolCandMeta: { fontSize: 12, color: '#64748b', fontWeight: '500' },
    poolReportBtn: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        backgroundColor: '#f8fafc',
        marginLeft: 10,
    },
    poolReportBtnText: { fontSize: 11, fontWeight: '700', color: '#475569' },

    scrollContent: { padding: 16 },
    poolCardBox: { backgroundColor: '#fff', padding: 20, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 2, borderWidth: 1, borderColor: '#f1f5f9', marginBottom: 16 },
    poolBoxTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
    poolBoxTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e293b', flex: 1 },
    poolBoxBadge: { backgroundColor: '#f3e8ff', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#e9d5ff' },
    poolBoxBadgeText: { fontSize: 11, fontWeight: 'bold', color: '#6b21a8' },
    poolBoxBtn: { width: '100%', paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: '#e9d5ff', alignItems: 'center', backgroundColor: '#fff' },
    poolBoxBtnText: { fontSize: 14, fontWeight: 'bold', color: '#9333ea' },

    // Profile Completion Card
    completionCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#f3e8ff', shadowColor: '#9333ea', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 3 },
    completionTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    completionTitle: { fontSize: 14, fontWeight: '900', color: '#0f172a' },
    completionPct: { fontSize: 18, fontWeight: '900' },
    progressTrack: { height: 6, backgroundColor: '#f1f5f9', borderRadius: 3, overflow: 'hidden', marginBottom: 8 },
    progressFill: { height: '100%', borderRadius: 3 },
    completionHint: { fontSize: 12, color: '#64748b', fontWeight: '500' },
    completionHintBold: { fontWeight: '900', color: '#9333ea' },
    nudgeCard: {
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#fde68a',
        backgroundColor: '#fffbeb',
        padding: 14,
        marginBottom: 12,
    },
    nudgeCardAction: {
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#bfdbfe',
        backgroundColor: '#eff6ff',
        padding: 14,
        marginBottom: 12,
    },
    nudgeTitle: {
        fontSize: 13,
        fontWeight: '800',
        color: '#0f172a',
        marginBottom: 4,
    },
    nudgeText: {
        fontSize: 12,
        color: '#475569',
        lineHeight: 18,
    },
    responseLiftCard: {
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#ddd6fe',
        backgroundColor: '#f5f3ff',
        padding: 14,
        marginBottom: 12,
    },
    responseLiftTitle: {
        fontSize: 13,
        fontWeight: '900',
        color: '#6d28d9',
        marginBottom: 4,
    },
    responseLiftText: {
        fontSize: 12,
        color: '#5b21b6',
        lineHeight: 18,
        fontWeight: '500',
    },

    // Employee Views
    employeeHeader: {
        backgroundColor: '#f9f6ff',
        paddingHorizontal: 24,
        paddingBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#ede9fe',
        zIndex: 10,
    },
    employeeHeaderTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, gap: 10 },
    employeeTitleWrap: { flex: 1 },
    employeeTitle: { fontSize: 28, fontWeight: '800', color: '#0f172a' },
    employeeTitleHint: { marginTop: 2, fontSize: 12, color: '#6d28d9', fontWeight: '600' },
    createActionsRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    quickFormBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#c4b5fd',
        paddingHorizontal: 12,
        paddingVertical: 9,
        borderRadius: 999,
        shadowColor: '#7c3aed',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 2,
    },
    quickFormBtnText: { color: '#6d28d9', fontSize: 11, fontWeight: '800' },
    employeeSub: { fontSize: 13, color: '#64748b' },
    profileStarterCard: {
        borderRadius: 18,
        borderWidth: 1,
        borderColor: '#e9d5ff',
        backgroundColor: '#ffffff',
        paddingHorizontal: 18,
        paddingVertical: 24,
        alignItems: 'center',
        shadowColor: '#7c3aed',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 3,
    },
    profileStarterIconWrap: {
        width: 58,
        height: 58,
        borderRadius: 29,
        backgroundColor: '#f5f3ff',
        borderWidth: 1,
        borderColor: '#ddd6fe',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    profileStarterTitle: {
        fontSize: 20,
        fontWeight: '900',
        color: '#1e293b',
        marginBottom: 6,
    },
    profileStarterText: {
        fontSize: 13,
        color: '#64748b',
        lineHeight: 20,
        textAlign: 'center',
        marginBottom: 16,
    },
    profileStarterButton: {
        borderRadius: 12,
        backgroundColor: '#7c3aed',
        paddingHorizontal: 18,
        paddingVertical: 11,
    },
    profileStarterButtonText: {
        color: '#ffffff',
        fontSize: 13,
        fontWeight: '800',
        letterSpacing: 0.2,
    },
    profileStarterActions: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 2,
    },
    profileStarterInterviewButton: {
        borderRadius: 12,
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#d8b4fe',
        paddingHorizontal: 16,
        paddingVertical: 11,
    },
    profileStarterInterviewButtonText: {
        color: '#6d28d9',
        fontSize: 13,
        fontWeight: '800',
        letterSpacing: 0.2,
    },

    empProfileCard: { backgroundColor: '#fff', padding: 18, borderRadius: 18, borderWidth: 2, borderColor: 'transparent', shadowColor: '#0f172a', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2, marginBottom: 14 },
    empProfileCardDefault: { borderColor: '#7c3aed', shadowColor: '#7c3aed', shadowOpacity: 0.1, shadowRadius: 12, elevation: 4 },
    empProfTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
    empProfTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e293b', flex: 1 },
    empProfBadgeRow: { flexDirection: 'row', alignItems: 'center', marginLeft: 8, gap: 6 },
    empProfDefaultBadge: { backgroundColor: '#faf5ff', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: '#f3e8ff', marginLeft: 8 },
    empProfDefaultText: { fontSize: 10, fontWeight: '900', color: '#9333ea', letterSpacing: 1 },
    empProfVerifiedBadge: { backgroundColor: 'rgba(16,185,129,0.14)', borderColor: 'rgba(16,185,129,0.32)', borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
    empProfVerifiedText: { fontSize: 10, fontWeight: '800', color: '#065f46' },
    empProfSummary: { fontSize: 13, color: '#475569', lineHeight: 20, marginBottom: 14 },

    empProfSkillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
    empProfSkillPill: { backgroundColor: '#f8fafc', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: '#f1f5f9' },
    empProfSkillText: { fontSize: 10, fontWeight: '700', color: '#475569', textTransform: 'uppercase' },

    empProfFooter: { borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 13, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    empProfLocRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    empProfLocText: { fontSize: 11, fontWeight: '500', color: '#94a3b8' },
    empProfActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    empProfSecondaryBtn: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10, borderWidth: 1, borderColor: '#ddd6fe', backgroundColor: '#faf5ff' },
    empProfSecondaryText: { fontSize: 10, fontWeight: '800', color: '#6d28d9' },
    empProfEditBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: 'transparent' },
    empProfEditText: { fontSize: 12, fontWeight: 'bold', color: '#9333ea' },
    empProfDeleteBtn: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10, borderWidth: 1, borderColor: '#fecaca', backgroundColor: '#fef2f2' },
    empProfDeleteText: { fontSize: 10, fontWeight: '800', color: '#b91c1c' },

    // Edit Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    modalSheet: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingHorizontal: 24,
        paddingTop: 18,
        maxHeight: '92%',
        borderTopWidth: 1,
        borderTopColor: '#ede9fe',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 20,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: '#ddd6fe',
        backgroundColor: '#f8f5ff',
        paddingHorizontal: 14,
        paddingVertical: 12,
    },
    modalHeaderCopy: { flex: 1, paddingRight: 10 },
    modalEyebrow: {
        fontSize: 10,
        fontWeight: '900',
        color: '#7c3aed',
        letterSpacing: 1,
        textTransform: 'uppercase',
        marginBottom: 4,
    },
    modalTitle: { fontSize: 21, fontWeight: '900', color: '#0f172a' },
    modalSubtitle: { marginTop: 3, fontSize: 12, color: '#6366f1', fontWeight: '600', lineHeight: 17 },
    modalCloseBtn: {
        width: 34,
        height: 34,
        borderRadius: 17,
        borderWidth: 1,
        borderColor: '#d8b4fe',
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalScroll: { paddingBottom: 40 },
    formSectionCard: {
        borderWidth: 1,
        borderColor: '#e9e3ff',
        backgroundColor: '#ffffff',
        borderRadius: 18,
        padding: 14,
        marginBottom: 14,
        shadowColor: '#7c3aed',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
        elevation: 2,
    },
    formSectionTitle: {
        fontSize: 15,
        fontWeight: '900',
        color: '#312e81',
        marginBottom: 4,
    },
    formSectionSub: {
        fontSize: 12,
        color: '#6b7280',
        marginBottom: 14,
    },
    formAssistActions: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 10,
    },
    formAssistPrimaryBtn: {
        borderRadius: 10,
        backgroundColor: '#7c3aed',
        paddingHorizontal: 12,
        paddingVertical: 9,
    },
    formAssistPrimaryBtnText: {
        color: '#ffffff',
        fontSize: 12,
        fontWeight: '800',
    },
    formAssistSecondaryBtn: {
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#d8b4fe',
        backgroundColor: '#ffffff',
        paddingHorizontal: 12,
        paddingVertical: 9,
    },
    formAssistSecondaryBtnText: {
        color: '#6d28d9',
        fontSize: 12,
        fontWeight: '800',
    },
    formAssistMessage: {
        fontSize: 11,
        color: '#6d28d9',
        marginBottom: 10,
        fontWeight: '600',
    },

    // Avatar
    avatarSection: {
        alignItems: 'center',
        marginBottom: 20,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#ede9fe',
        backgroundColor: '#fcfbff',
        paddingVertical: 12,
    },
    avatarStage: {
        width: 96,
        height: 96,
        borderRadius: 48,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
    },
    avatarHalo: {
        position: 'absolute',
        width: 96,
        height: 96,
        borderRadius: 48,
        backgroundColor: 'rgba(167,139,250,0.24)',
    },
    avatarPreview: { width: 84, height: 84, borderRadius: 42, borderWidth: 3, borderColor: '#f3e8ff' },
    avatarUploadingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 10,
        borderRadius: 40,
        backgroundColor: 'rgba(15, 23, 42, 0.45)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    changePhotoBtn: { backgroundColor: '#faf5ff', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: '#d8b4fe' },
    changePhotoText: { color: '#7c3aed', fontSize: 13, fontWeight: '800' },

    inputGroup: { marginBottom: 16 },
    inputLabel: { fontSize: 10, fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
    inputField: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, fontWeight: '500', color: '#0f172a' },
    inputInline: { flex: 1 },
    rowInputs: { flexDirection: 'row', alignItems: 'flex-start' },
    typeaheadWrap: {
        position: 'relative',
    },
    typeaheadShell: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        backgroundColor: '#f8fafc',
        borderRadius: 12,
        paddingHorizontal: 14,
        minHeight: 48,
    },
    typeaheadShellFocused: {
        borderColor: '#a78bfa',
        backgroundColor: '#ffffff',
    },
    typeaheadInput: {
        flex: 1,
        fontSize: 15,
        color: '#0f172a',
        fontWeight: '500',
        paddingVertical: 12,
    },
    typeaheadChevron: {
        fontSize: 10,
        color: '#94a3b8',
        marginLeft: 8,
    },
    typeaheadList: {
        position: 'relative',
        marginTop: 6,
        borderWidth: 1,
        borderColor: '#ddd6fe',
        backgroundColor: '#ffffff',
        borderRadius: 10,
        paddingVertical: 4,
        shadowColor: '#7c3aed',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    typeaheadItem: {
        paddingHorizontal: 12,
        paddingVertical: 9,
    },
    typeaheadItemText: {
        fontSize: 13,
        color: '#4c1d95',
        fontWeight: '600',
    },
    typeaheadItemMeta: {
        marginTop: 2,
        fontSize: 11,
        color: '#64748b',
        fontWeight: '600',
    },
    inlineMetaRow: {
        marginTop: 8,
    },
    inlineMetaText: {
        fontSize: 11,
        color: '#6d28d9',
        fontWeight: '600',
    },
    inputHelperText: {
        marginTop: 6,
        fontSize: 11,
        color: '#64748b',
        fontWeight: '500',
    },
    inputLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    inlineTextActionBtn: {
        borderRadius: 999,
        borderWidth: 1,
        borderColor: '#ddd6fe',
        backgroundColor: '#faf5ff',
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    inlineTextActionText: {
        fontSize: 10,
        color: '#6d28d9',
        fontWeight: '800',
        textTransform: 'uppercase',
    },
    salarySuggestionCard: {
        borderWidth: 1,
        borderColor: '#ddd6fe',
        borderRadius: 12,
        backgroundColor: '#faf5ff',
        paddingHorizontal: 10,
        paddingVertical: 10,
        marginBottom: 8,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
    },
    salarySuggestionCopy: {
        flex: 1,
    },
    salarySuggestionLabel: {
        fontSize: 10,
        color: '#6d28d9',
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.3,
    },
    salarySuggestionValue: {
        marginTop: 2,
        fontSize: 15,
        color: '#312e81',
        fontWeight: '800',
    },
    salarySuggestionButton: {
        borderRadius: 10,
        backgroundColor: '#7c3aed',
        paddingHorizontal: 11,
        paddingVertical: 7,
    },
    salarySuggestionButtonDisabled: {
        opacity: 0.45,
    },
    salarySuggestionButtonText: {
        color: '#ffffff',
        fontSize: 11,
        fontWeight: '800',
        textTransform: 'uppercase',
    },
    readonlyValueShell: {
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        backgroundColor: '#f8fafc',
        minHeight: 48,
        paddingHorizontal: 12,
        justifyContent: 'center',
    },
    readonlyValueText: {
        color: '#334155',
        fontSize: 13,
        fontWeight: '600',
    },
    quickChipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    choiceChip: {
        borderRadius: 999,
        borderWidth: 1,
        borderColor: '#ddd6fe',
        backgroundColor: '#ffffff',
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    choiceChipActive: {
        borderColor: '#7c3aed',
        backgroundColor: '#f5f3ff',
    },
    choiceChipText: {
        fontSize: 11,
        color: '#475569',
        fontWeight: '700',
    },
    choiceChipTextActive: {
        color: '#6d28d9',
    },
    preferenceGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 2,
    },
    preferenceTile: {
        minWidth: '48%',
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 12,
        backgroundColor: '#ffffff',
        paddingHorizontal: 10,
        paddingVertical: 10,
    },
    preferenceTileActive: {
        borderColor: '#7c3aed',
        backgroundColor: '#f5f3ff',
    },
    preferenceCheck: {
        width: 18,
        height: 18,
        borderRadius: 9,
        borderWidth: 1,
        borderColor: '#cbd5e1',
        marginRight: 8,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#ffffff',
    },
    preferenceCheckActive: {
        borderColor: '#7c3aed',
        backgroundColor: '#7c3aed',
    },
    preferenceTitle: {
        fontSize: 11,
        fontWeight: '700',
        color: '#334155',
    },

    // Skills editor
    skillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
    skillChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f3e8ff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#e9d5ff' },
    skillChipText: { fontSize: 12, fontWeight: '700', color: '#7c3aed' },
    licenseChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#eff6ff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#bfdbfe' },
    licenseChipText: { fontSize: 12, fontWeight: '700', color: '#1d4ed8' },
    skillChipX: { fontSize: 10, color: '#a855f7' },
    skillInputRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
    skillTypeahead: { flex: 1 },
    suggestedSkillsRow: { marginTop: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    suggestedSkillChip: {
        borderRadius: 999,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        backgroundColor: '#ffffff',
        paddingHorizontal: 10,
        paddingVertical: 6,
    },
    suggestedSkillText: { fontSize: 11, color: '#475569', fontWeight: '700' },
    suggestedEmptyText: { fontSize: 11, color: '#64748b', fontWeight: '600' },
    addSkillBtn: { backgroundColor: '#9333ea', width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    addSkillBtnText: { color: '#fff', fontSize: 22, fontWeight: '300' },

    modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
    cancelBtn: { flex: 1, paddingVertical: 15, backgroundColor: '#f8fafc', borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
    cancelBtnText: { color: '#64748b', fontSize: 14, fontWeight: '800' },
    saveBtn: { flex: 2, paddingVertical: 15, backgroundColor: '#7c3aed', borderRadius: 12, alignItems: 'center', shadowColor: '#7c3aed', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.24, shadowRadius: 10, elevation: 4 },
    saveBtnText: { color: '#fff', fontSize: 14, fontWeight: '800' },
});
