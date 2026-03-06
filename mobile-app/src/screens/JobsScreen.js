import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Alert,
    Animated,
    FlatList,
    Modal,
    Platform,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorageLib from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

import client from '../api/client';
import EmptyState from '../components/EmptyState';
import JobCard from '../components/JobCard';
import SkeletonLoader from '../components/SkeletonLoader';
import NudgeToast from '../components/NudgeToast';
import { FEATURE_MATCH_UI_V1 } from '../config';
import { useRefreshOnFocus } from '../hooks/useRefreshOnFocus';
import { trackEvent } from '../services/analytics';
import { useAppStore } from '../store/AppStore';
import { logValidationError } from '../utils/apiValidator';
import { logger } from '../utils/logger';
import { AuthContext } from '../context/AuthContext';
import { RADIUS, SHADOWS, SPACING, theme } from '../theme/theme';
import {
    getDisplayScorePercent,
    getNormalizedScore,
    MATCH_TIERS,
    sortRecommendedJobsByTierAndScore,
} from '../utils/matchUi';

const FILTERS = ['All', 'High Match', 'Nearby', 'New'];
const DISMISSED_KEY = '@hire_dismissed_jobs';
const CACHE_KEY = '@cached_jobs';
const FETCH_DEBOUNCE_MS = 250;
const MAX_MATCH_API_CALLS_PER_LOAD = 3;
const FORCE_EMPTY_FIND_WORK_FEED = false;
const IS_EXPO_GO = (
    Constants.executionEnvironment === 'storeClient'
    || Constants.appOwnership === 'expo'
);

let hasShownMatchBannerThisSession = false;
const SEEDED_ROLE_PROFILE_TITLES = new Set([
    'general worker',
    'worker',
    'job seeker',
    'candidate',
    'profile',
]);

const extractSalaryNumber = (salaryStr) => {
    if (!salaryStr) return 0;
    const cleaned = String(salaryStr).replace(/[₹,\s]/g, '');
    const match = cleaned.match(/\d+/);
    return match ? parseInt(match[0], 10) : 0;
};

const toPostedEpoch = (createdAt) => {
    const parsed = Date.parse(createdAt || '');
    return Number.isFinite(parsed) ? parsed : 0;
};

const toPostedLabel = (createdAt) => {
    if (!createdAt) return 'Just now';
    const parsed = Date.parse(createdAt);
    if (!Number.isFinite(parsed)) return 'Just now';

    const deltaMs = Date.now() - parsed;
    const hourMs = 60 * 60 * 1000;
    if (deltaMs < hourMs) return 'Just now';
    if (deltaMs < 24 * hourMs) return `${Math.max(1, Math.round(deltaMs / hourMs))}h ago`;
    return new Date(parsed).toLocaleDateString();
};

const getReadableError = (error, fallbackMessage) => {
    if (error?.response?.data?.message) return error.response.data.message;
    if (error?.message === 'No internet connection') return 'No internet connection. Please check your network and try again.';
    if (error?.message === 'Network Error') return 'Unable to reach the server. Please try again.';
    if (error?.code === 'ECONNABORTED') return 'Request timed out. Please retry.';
    return fallbackMessage;
};

const isProfileRoleGateError = (error) => {
    const status = Number(error?.response?.status || 0);
    const message = String(error?.response?.data?.message || error?.message || '').toLowerCase();
    return status === 403 && (
        message.includes('worker profile requires at least one role profile')
        || message.includes('profile_incomplete_role')
        || message.includes('employer profile incomplete')
    );
};

const isMeaningfulRoleProfile = (roleProfile = {}) => {
    const roleName = String(roleProfile?.roleName || '').trim().toLowerCase();
    if (!roleName) return false;
    if (SEEDED_ROLE_PROFILE_TITLES.has(roleName)) return false;

    const skills = Array.isArray(roleProfile?.skills) ? roleProfile.skills.filter(Boolean) : [];
    const hasExperience = Number(roleProfile?.experienceInRole) > 0;
    const hasExpectedSalary = Number(roleProfile?.expectedSalary) > 0;

    return Boolean(roleName && (skills.length > 0 || hasExperience || hasExpectedSalary || roleName.length > 2));
};

const formatDistanceLabel = (rawDistance, fallbackLocation) => {
    const numeric = Number(rawDistance);
    if (Number.isFinite(numeric) && numeric > 0) {
        if (numeric < 1) {
            return `${Math.round(numeric * 1000)}m away`;
        }
        return `${numeric.toFixed(1)}km away`;
    }
    const locationText = String(fallbackLocation || '').trim();
    if (!locationText || locationText.toLowerCase().includes('remote')) {
        return 'Remote friendly';
    }
    return `Near ${locationText}`;
};

const toJobTimestamp = (job) => {
    const candidateEpochs = [
        Number(job?.createdAtEpoch),
        Date.parse(job?.job?.createdAt || ''),
        Date.parse(job?.createdAt || ''),
    ].filter((value) => Number.isFinite(value) && value > 0);
    return candidateEpochs.length ? candidateEpochs[0] : 0;
};

const isRecentJob = (job, maxAgeMs) => {
    const epoch = toJobTimestamp(job);
    if (epoch > 0) {
        return (Date.now() - epoch) <= maxAgeMs;
    }

    const postedText = String(job?.postedTime || '').toLowerCase().trim();
    if (postedText === 'just now') return true;

    const hoursMatch = postedText.match(/(\d+)\s*h\s*ago/);
    if (hoursMatch) {
        return Number(hoursMatch[1]) <= Math.round(maxAgeMs / (60 * 60 * 1000));
    }
    return false;
};

const isNearbyJob = (job, radiusKm, referenceCity = '') => {
    const locationBlob = `${job?.distanceLabel || ''} ${job?.location || ''}`.toLowerCase();
    if (locationBlob.includes('remote')) return false;

    const rawDistance = Number(job?.job?.distanceKm ?? job?.distanceKm ?? job?.distance);
    if (Number.isFinite(rawDistance) && rawDistance > 0) {
        return rawDistance <= radiusKm;
    }

    const normalizedReferenceCity = String(referenceCity || '').trim().toLowerCase();
    if (!normalizedReferenceCity) return false;
    return String(job?.location || '').toLowerCase().includes(normalizedReferenceCity);
};

const isHighMatchJob = (job) => {
    const score = getDisplayScorePercent(job);
    if (score >= 80) return true;

    const tier = String(job?.tier || '').toUpperCase();
    return tier === MATCH_TIERS.STRONG || tier === MATCH_TIERS.GOOD;
};

const tierFromProbability = (value) => {
    const normalized = Number(value);
    if (!Number.isFinite(normalized)) return '';
    if (normalized >= 0.82) return MATCH_TIERS.STRONG;
    if (normalized >= 0.7) return MATCH_TIERS.GOOD;
    if (normalized >= 0.62) return MATCH_TIERS.POSSIBLE;
    return '';
};

const inferredRatioFromTier = (tierValue) => {
    const normalizedTier = String(tierValue || '').toUpperCase();
    if (normalizedTier === MATCH_TIERS.STRONG) return 0.9;
    if (normalizedTier === MATCH_TIERS.GOOD) return 0.78;
    if (normalizedTier === MATCH_TIERS.POSSIBLE) return 0.65;
    return 0;
};

const buildJobsCacheKey = ({ userId = '', roleProfileId = '' } = {}) => {
    const safeUserId = String(userId || '').trim() || 'anonymous';
    const safeRoleProfileId = String(roleProfileId || '').trim() || 'none';
    return `${CACHE_KEY}:${safeUserId}:${safeRoleProfileId}`;
};

const normalizeJobToken = (value) => String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');

const buildJobRowSignature = (job = {}) => {
    const requirements = Array.isArray(job?.requirements)
        ? job.requirements.map((item) => normalizeJobToken(item)).filter(Boolean).sort().join('|')
        : '';
    return [
        normalizeJobToken(job?._id),
        normalizeJobToken(job?.title),
        normalizeJobToken(job?.companyName),
        normalizeJobToken(job?.location),
        normalizeJobToken(job?.salaryRange),
        requirements,
    ].join('::');
};

const dedupeJobRows = (rows = []) => {
    const sourceRows = Array.isArray(rows) ? rows : [];
    const seenKeys = new Set();
    const deduped = [];

    sourceRows.forEach((row) => {
        const signature = buildJobRowSignature(row);
        if (!signature) return;
        if (seenKeys.has(signature)) return;
        seenKeys.add(signature);
        deduped.push(row);
    });

    return deduped;
};

export default function JobsScreen() {
    const navigation = useNavigation();
    const route = useRoute();
    const insets = useSafeAreaInsets();
    const { featureFlags, role: appRole } = useAppStore();
    const { userInfo } = React.useContext(AuthContext);

    const listRef = useRef(null);
    const fetchDebounceRef = useRef(null);
    const matchApiCallsRef = useRef(0);
    const retentionPingRef = useRef({ jobsNear: false, dailyMatch: false });
    const jobsRef = useRef([]);
    const hasLoadedOnceRef = useRef(false);
    const fetchInFlightRef = useRef(false);
    const pendingFetchRef = useRef(false);
    const fetchRequestIdRef = useRef(0);
    const contentOpacity = useRef(new Animated.Value(0.9)).current;

    const [activeFilter, setActiveFilter] = useState('All');
    const [userRole, setUserRole] = useState('candidate');
    const [jobs, setJobs] = useState([]);
    const [dismissedJobs, setDismissedJobs] = useState([]);
    const [reportedJobIds, setReportedJobIds] = useState(new Set());
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    const [usingRecommendedFeed, setUsingRecommendedFeed] = useState(false);
    const [showRecommendedFallback, setShowRecommendedFallback] = useState(false);
    const [showMatchBanner, setShowMatchBanner] = useState(false);
    const [recommendedCount, setRecommendedCount] = useState(0);

    const [currentWorkerUserId, setCurrentWorkerUserId] = useState('');
    const [currentWorkerProfileId, setCurrentWorkerProfileId] = useState('');
    const [userBaseCity, setUserBaseCity] = useState('');

    const [filterModalVisible, setFilterModalVisible] = useState(false);
    const [locationFilter, setLocationFilter] = useState('');
    const [minSalaryFilter, setMinSalaryFilter] = useState('');
    const [minMatchFilter, setMinMatchFilter] = useState(0);

    const [appliedLocation, setAppliedLocation] = useState('');
    const [appliedMinSalary, setAppliedMinSalary] = useState(0);
    const [appliedMinMatch, setAppliedMinMatch] = useState(0);
    const [nudgeToast, setNudgeToast] = useState(null);
    const [showInactiveBanner, setShowInactiveBanner] = useState(false);
    const [searchRadiusKm, setSearchRadiusKm] = useState(25);
    const [isMatchProfileMissing, setIsMatchProfileMissing] = useState(false);

    const matchOptions = [
        { label: 'All', value: 0 },
        { label: '75%+', value: 75 },
        { label: '90%+', value: 90 },
    ];

    const activeFilterCount = [appliedLocation, appliedMinSalary > 0, appliedMinMatch > 0].filter(Boolean).length;
    const isMatchUiEnabled = featureFlags?.FEATURE_MATCH_UI_V1 ?? FEATURE_MATCH_UI_V1;

    const shouldRenderMatchInsights = isMatchUiEnabled
        && userRole !== 'employer'
        && usingRecommendedFeed
        && !showRecommendedFallback;
    const isFindWorkLockedEmpty = FORCE_EMPTY_FIND_WORK_FEED && userRole !== 'employer';

    const formatJobRow = useCallback((item, source = 'generic') => {
        const job = item?.job || item || {};
        let normalizedScore = getNormalizedScore(item);
        const inferredTier = String(item?.tier || '').toUpperCase();
        if (normalizedScore <= 0) {
            if (inferredTier === MATCH_TIERS.STRONG) normalizedScore = 0.9;
            if (inferredTier === MATCH_TIERS.GOOD) normalizedScore = 0.78;
            if (inferredTier === MATCH_TIERS.POSSIBLE) normalizedScore = 0.65;
        }
        const fallbackKey = [
            source,
            String(job?.title || 'untitled'),
            String(job?.companyName || 'company'),
            String(job?.location || 'location'),
        ].join('-').replace(/\s+/g, '-').toLowerCase();

        return {
            _id: String(job._id || item?._id || fallbackKey),
            title: String(job.title || 'Untitled Job'),
            companyName: String(job.companyName || 'Looking for Someone'),
            location: String(job.location || 'Remote'),
            salaryRange: String(job.salaryRange || 'Unspecified'),
            matchScore: Math.round(normalizedScore * 100),
            matchProbability: normalizedScore,
            finalScore: normalizedScore,
            tier: String(item?.tier || '').toUpperCase(),
            postedTime: toPostedLabel(job.createdAt),
            createdAtEpoch: toPostedEpoch(job.createdAt),
            requirements: Array.isArray(job.requirements) && job.requirements.length
                ? job.requirements
                : ['Requirements not specified'],
            fitReason: String(item?.whyYouFit || ''),
            explainability: item?.explainability || {},
            matchModelVersionUsed: item?.matchModelVersionUsed || null,
            source,
            urgentHiring: Boolean(job?.urgentHiring || item?.urgentHiring),
            activelyHiring: job?.activelyHiring !== false,
            distanceLabel: formatDistanceLabel(job?.distanceKm ?? item?.distanceKm ?? item?.distance, job?.location),
            hiredCount: Number(
                job?.totalHires
                ?? job?.hiredCount
                ?? job?.stats?.hiredCount
                ?? item?.hiredCount
                ?? 0,
            ),
            responseTimeLabel: String(job?.responseTimeLabel || item?.responseTimeLabel || 'Responds fast'),
            job: job,
        };
    }, []);

    const resolveWorkerContext = useCallback(async () => {
        let userInfo = {};

        try {
            const userInfoString = await SecureStore.getItemAsync('userInfo');
            userInfo = JSON.parse(userInfoString || '{}');
        } catch (error) {
            logger.warn('Failed to parse userInfo', error?.message || error);
        }

        const normalizedRole = String(
            appRole
            || userInfo?.activeRole
            || userInfo?.primaryRole
            || userInfo?.role
            || ''
        ).toLowerCase();
        const isEmployerRole = normalizedRole === 'employer' || normalizedRole === 'recruiter';
        setUserRole(isEmployerRole ? 'employer' : 'candidate');

        const userId = String(userInfo?._id || '');
        let workerProfileId = String(userInfo?.workerProfileId || '');
        let resolvedWorkerProfile = null;

        if (!workerProfileId) {
            workerProfileId = String(await AsyncStorageLib.getItem('@worker_profile_id') || '').trim();
        }

        if (!isEmployerRole) {
            try {
                const { data } = await client.get('/api/users/profile', {
                    __skipApiErrorHandler: true,
                    __allowWhenCircuitOpen: true,
                    timeout: 4500,
                    params: { role: 'worker' },
                });
                resolvedWorkerProfile = data?.profile || null;
                workerProfileId = String(resolvedWorkerProfile?._id || workerProfileId || '');
                if (workerProfileId) {
                    await AsyncStorageLib.setItem('@worker_profile_id', workerProfileId);
                }
            } catch (error) {
                logger.warn('Worker profile lookup failed, using userId fallback for recommendations.', error?.message || error);
            }
        }

        const roleProfiles = Array.isArray(resolvedWorkerProfile?.roleProfiles)
            ? resolvedWorkerProfile.roleProfiles
            : [];
        const meaningfulRoleProfiles = roleProfiles.filter(isMeaningfulRoleProfile);
        const activeRoleProfile = meaningfulRoleProfiles.find((profile) => Boolean(profile?.activeProfile))
            || meaningfulRoleProfiles[0]
            || null;
        const activeRoleProfileId = String(activeRoleProfile?.profileId || '').trim();
        const hasRoleProfiles = meaningfulRoleProfiles.length > 0;

        return {
            userId,
            workerProfileId,
            activeRoleProfileId,
            hasRoleProfiles,
            city: String(
                resolvedWorkerProfile?.city
                || userInfo?.acquisitionCity
                || userInfo?.city
                || appliedLocation
                || ''
            ).trim(),
            isEmployerRole,
        };
    }, [appliedLocation, appRole]);

    const fetchGenericJobs = useCallback(async ({ searchRadiusKm }) => {
        const { data } = await client.get('/api/jobs', {
            __skipApiErrorHandler: true,
            __allowWhenCircuitOpen: true,
            timeout: 6000,
            params: { radiusKm: searchRadiusKm }
        });
        const rows = Array.isArray(data)
            ? data
            : (Array.isArray(data?.data) ? data.data : []);

        return dedupeJobRows(rows
            .map((row) => formatJobRow(row, 'generic')))
            .sort((left, right) => getNormalizedScore(right) - getNormalizedScore(left));
    }, [formatJobRow]);

    const fetchRecommendedJobs = useCallback(async ({ workerId, city, searchRadiusKm }) => {
        if (!workerId) return [];
        if (matchApiCallsRef.current >= MAX_MATCH_API_CALLS_PER_LOAD) {
            logger.warn('Skipping recommended fetch: match API call budget exhausted for this load.');
            return [];
        }

        matchApiCallsRef.current += 1;

        // Keep recommended feed broad-first for stability; strict preference filtering
        // is applied by client-side filters and detail scoring.
        const params = { workerId, preferences: false };
        if (city) params.city = city;
        if (searchRadiusKm) params.radiusKm = searchRadiusKm;

        const { data } = await client.get('/api/jobs/recommended', {
            __skipApiErrorHandler: true,
            __allowWhenCircuitOpen: true,
            timeout: 6000,
            params,
        });
        const rows = (
            Array.isArray(data?.recommendedJobs)
                ? data.recommendedJobs
                : (Array.isArray(data?.data?.recommendedJobs)
                    ? data.data.recommendedJobs
                    : (Array.isArray(data?.matches)
                        ? data.matches
                        : (Array.isArray(data?.data)
                            ? data.data
                            : (Array.isArray(data) ? data : []))))
        );
        const normalized = sortRecommendedJobsByTierAndScore(
            dedupeJobRows(rows.map((row) => formatJobRow(row, 'recommended')))
        );

        const strongAndGood = normalized.filter((row) => row.tier === MATCH_TIERS.STRONG || row.tier === MATCH_TIERS.GOOD);
        const possible = normalized.filter((row) => row.tier === MATCH_TIERS.POSSIBLE);
        return [...strongAndGood, ...possible].slice(0, 20);
    }, [formatJobRow]);

    const fetchCandidateMatchJobs = useCallback(async ({ searchRadiusKm }) => {
        const { data } = await client.get('/api/matches/candidate', {
            __skipApiErrorHandler: true,
            __allowWhenCircuitOpen: true,
            timeout: 6000,
            params: { radiusKm: searchRadiusKm },
        });

        const rows = Array.isArray(data)
            ? data
            : (Array.isArray(data?.matches)
                ? data.matches
                : (Array.isArray(data?.data) ? data.data : []));
        return sortRecommendedJobsByTierAndScore(
            dedupeJobRows(rows.map((row) => formatJobRow(row, 'candidate_match')))
        ).slice(0, 20);
    }, [formatJobRow]);

    const enrichJobsWithMatchScores = useCallback(async ({ rows, workerRefId }) => {
        if (!Array.isArray(rows) || rows.length === 0 || !workerRefId) {
            return Array.isArray(rows) ? rows : [];
        }

        const limitedRows = rows.slice(0, 8);
        const enrichedRows = await Promise.all(
            limitedRows.map(async (row) => {
                const jobId = String(row?.job?._id || row?._id || '').trim();
                if (!jobId) return row;

                try {
                    const { data } = await client.get('/api/matches/probability', {
                        __skipApiErrorHandler: true,
                        __allowWhenCircuitOpen: true,
                        timeout: 3500,
                        params: {
                            workerId: workerRefId,
                            jobId,
                        },
                    });

                    const probabilityValue = Number(data?.matchProbability);
                    if (!Number.isFinite(probabilityValue)) return row;

                    const normalizedProbability = Math.max(0, Math.min(1, probabilityValue));
                    return {
                        ...row,
                        matchScore: Math.round(normalizedProbability * 100),
                        matchProbability: normalizedProbability,
                        finalScore: normalizedProbability,
                        tier: String(row?.tier || data?.tier || tierFromProbability(normalizedProbability)).toUpperCase(),
                        explainability: data?.explainability || row?.explainability || {},
                    };
                } catch (_error) {
                    return row;
                }
            })
        );

        return enrichedRows;
    }, []);

    const fetchJobs = useCallback(async ({ isRefresh = false } = {}) => {
        if (fetchInFlightRef.current) {
            pendingFetchRef.current = true;
            if (isRefresh) {
                setIsRefreshing(false);
            }
            return;
        }

        const requestId = fetchRequestIdRef.current + 1;
        fetchRequestIdRef.current = requestId;
        fetchInFlightRef.current = true;
        if (!isRefresh && !hasLoadedOnceRef.current && jobsRef.current.length === 0) {
            setIsLoading(true);
        }
        setErrorMsg('');
        matchApiCallsRef.current = 0;

        try {
            const {
                userId,
                workerProfileId,
                activeRoleProfileId,
                hasRoleProfiles,
                city,
                isEmployerRole,
            } = await resolveWorkerContext();
            if (requestId !== fetchRequestIdRef.current) return;

            setCurrentWorkerUserId(userId);
            setCurrentWorkerProfileId(workerProfileId);
            setUserBaseCity(String(city || '').trim());
            const jobsCacheKey = buildJobsCacheKey({ userId, roleProfileId: activeRoleProfileId });
            const shouldUseMatchFeed = !isEmployerRole;
            if (!shouldUseMatchFeed) {
                setIsMatchProfileMissing(false);
            }

            if (FORCE_EMPTY_FIND_WORK_FEED && !isEmployerRole) {
                setUsingRecommendedFeed(false);
                setShowRecommendedFallback(false);
                setRecommendedCount(0);
                setJobs([]);
                setErrorMsg('');
                try {
                    const allKeys = await AsyncStorageLib.getAllKeys();
                    const matchKeys = allKeys.filter((key) => key === CACHE_KEY || key.startsWith(`${CACHE_KEY}:`));
                    if (matchKeys.length > 0) {
                        await AsyncStorageLib.multiRemove(matchKeys);
                    }
                } catch (cacheClearError) {
                    logger.warn('Could not clear cached jobs while forcing empty feed', cacheClearError?.message || cacheClearError);
                }
                return;
            }

            if (shouldUseMatchFeed && !hasRoleProfiles) {
                setIsMatchProfileMissing(true);
                setUsingRecommendedFeed(false);
                setShowRecommendedFallback(false);
                setRecommendedCount(0);
                setJobs([]);
                setErrorMsg('');
                try {
                    const allKeys = await AsyncStorageLib.getAllKeys();
                    const matchKeys = allKeys.filter((key) => key === CACHE_KEY || key.startsWith(`${CACHE_KEY}:`));
                    if (matchKeys.length > 0) {
                        await AsyncStorageLib.multiRemove(matchKeys);
                    }
                } catch (cacheClearError) {
                    logger.warn('Could not clear cached jobs after profile removal', cacheClearError?.message || cacheClearError);
                }
                return;
            }
            if (shouldUseMatchFeed && hasRoleProfiles) {
                setIsMatchProfileMissing(false);
            }

            try {
                const cachedJobs = await AsyncStorageLib.getItem(jobsCacheKey);
                if (requestId !== fetchRequestIdRef.current) return;
                if (cachedJobs) {
                    const parsed = JSON.parse(cachedJobs);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        const hasScores = parsed.some((row) => getDisplayScorePercent(row) > 0);
                        if (isEmployerRole || hasScores) {
                            setJobs(parsed);
                        }
                    }
                }
            } catch (cacheReadError) {
                logger.warn('Error loading cached jobs', cacheReadError?.message || cacheReadError);
            }
            let nextJobs = [];
            let isRecommended = false;

            const genericFallbackPromise = (shouldUseMatchFeed && hasRoleProfiles)
                ? fetchGenericJobs({ searchRadiusKm }).catch(() => [])
                : null;

            if (shouldUseMatchFeed) {
                try {
                    const recommendedRows = await fetchRecommendedJobs({
                        workerId: workerProfileId || userId,
                        city,
                        searchRadiusKm,
                    });
                    if (requestId !== fetchRequestIdRef.current) return;
                    if (recommendedRows.length > 0) {
                        nextJobs = recommendedRows;
                        isRecommended = true;
                        setRecommendedCount(recommendedRows.length);

                        if (!retentionPingRef.current.dailyMatch) {
                            retentionPingRef.current.dailyMatch = true;
                            if (!IS_EXPO_GO) {
                                import('../services/NotificationService')
                                    .then(({ triggerLocalNotification }) => triggerLocalNotification('daily_match_alert', { count: recommendedRows.length }))
                                    .catch(() => { });
                            }
                        }

                        const topJob = recommendedRows[0];
                        trackEvent('MATCH_RECOMMENDATION_VIEWED', {
                            workerId: workerProfileId || userId,
                            jobId: String(topJob?._id || ''),
                            finalScore: Number(getNormalizedScore(topJob).toFixed(4)),
                            tier: String(topJob?.tier || ''),
                            source: String(route.params?.source || 'jobs_screen'),
                        });
                    }
                } catch (_recommendedError) {
                    // Continue to fallback sources.
                }
            }

            if (!nextJobs.length && shouldUseMatchFeed) {
                const [candidateMatchRows, genericRows] = await Promise.all([
                    fetchCandidateMatchJobs({ searchRadiusKm }).catch(() => []),
                    genericFallbackPromise || Promise.resolve([]),
                ]);
                if (requestId !== fetchRequestIdRef.current) return;

                if (candidateMatchRows.length > 0) {
                    nextJobs = candidateMatchRows;
                    isRecommended = true;
                    setRecommendedCount(candidateMatchRows.length);
                } else if (genericRows.length > 0) {
                    nextJobs = genericRows;
                    isRecommended = false;
                }
            }

            if (!nextJobs.length && !shouldUseMatchFeed) {
                nextJobs = await fetchGenericJobs({ searchRadiusKm });
                if (requestId !== fetchRequestIdRef.current) return;
            }

            if (shouldUseMatchFeed && nextJobs.length > 0) {
                const needsScoreEnrichment = nextJobs.some((row) => getDisplayScorePercent(row) <= 0);
                const workerRefId = String(workerProfileId || userId || '').trim();
                if (needsScoreEnrichment && workerRefId) {
                    nextJobs = await enrichJobsWithMatchScores({
                        rows: nextJobs,
                        workerRefId,
                    });
                    if (requestId !== fetchRequestIdRef.current) return;
                }
                nextJobs = nextJobs.map((row) => {
                    if (getDisplayScorePercent(row) > 0) return row;
                    const inferredRatio = inferredRatioFromTier(row?.tier)
                        || (String(row?.source || '').toLowerCase().includes('generic') ? 0.58 : 0.62);
                    return {
                        ...row,
                        matchScore: Math.round(inferredRatio * 100),
                        matchProbability: inferredRatio,
                        finalScore: inferredRatio,
                        tier: String(row?.tier || tierFromProbability(inferredRatio)).toUpperCase(),
                    };
                });
            }

            const finalRows = sortRecommendedJobsByTierAndScore(dedupeJobRows(nextJobs)).slice(0, 20);

            setUsingRecommendedFeed(isRecommended);
            setShowRecommendedFallback(Boolean(shouldUseMatchFeed && !isRecommended));
            if (!isRecommended) setRecommendedCount(0);

            setJobs(finalRows);

            try {
                await AsyncStorageLib.setItem(jobsCacheKey, JSON.stringify(finalRows));
            } catch (cacheWriteError) {
                logger.warn('Error saving cached jobs', cacheWriteError?.message || cacheWriteError);
            }
        } catch (error) {
            if (requestId !== fetchRequestIdRef.current) return;
            if (isProfileRoleGateError(error)) {
                setIsMatchProfileMissing(true);
                setJobs([]);
                setErrorMsg('');
                try {
                    const allKeys = await AsyncStorageLib.getAllKeys();
                    const matchKeys = allKeys.filter((key) => key === CACHE_KEY || key.startsWith(`${CACHE_KEY}:`));
                    if (matchKeys.length > 0) {
                        await AsyncStorageLib.multiRemove(matchKeys);
                    }
                } catch (cacheClearError) {
                    logger.warn('Could not clear cached jobs on profile gate error', cacheClearError?.message || cacheClearError);
                }
                return;
            }
            if (error?.name === 'ApiValidationError') {
                logValidationError(error, '/api/jobs');
            }
            setErrorMsg('');
        } finally {
            if (requestId === fetchRequestIdRef.current) {
                fetchInFlightRef.current = false;
                if (isRefresh) {
                    setIsRefreshing(false);
                }
                if (!isRefresh) {
                    setIsLoading(false);
                    hasLoadedOnceRef.current = true;
                }
                if (pendingFetchRef.current) {
                    pendingFetchRef.current = false;
                    setTimeout(() => {
                        fetchJobs({ isRefresh: false });
                    }, 0);
                }
            }
        }
    }, [
        fetchGenericJobs,
        fetchCandidateMatchJobs,
        enrichJobsWithMatchScores,
        fetchRecommendedJobs,
        resolveWorkerContext,
        searchRadiusKm,
        route.params?.source,
    ]);

    const scheduleFetchJobs = useCallback(() => {
        if (fetchDebounceRef.current) {
            clearTimeout(fetchDebounceRef.current);
        }
        fetchDebounceRef.current = setTimeout(() => fetchJobs(), FETCH_DEBOUNCE_MS);
    }, [fetchJobs]);

    const handleRefresh = useCallback(() => {
        if (isRefreshing) return;
        setIsRefreshing(true);
        fetchJobs({ isRefresh: true });
    }, [fetchJobs, isRefreshing]);

    const handleRetry = useCallback(() => {
        fetchJobs();
    }, [fetchJobs]);

    const loadDismissed = useCallback(async () => {
        try {
            const raw = await AsyncStorageLib.getItem(DISMISSED_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) setDismissedJobs(parsed);
            }
        } catch (error) {
            logger.warn('Dismissed jobs cache read failed', error?.message || error);
        }
    }, []);

    useEffect(() => {
        jobsRef.current = jobs;
    }, [jobs]);

    useRefreshOnFocus(scheduleFetchJobs, 'jobs');

    useEffect(() => {
        loadDismissed();
        scheduleFetchJobs();

        return () => {
            if (fetchDebounceRef.current) {
                clearTimeout(fetchDebounceRef.current);
            }
        };
    }, [loadDismissed, scheduleFetchJobs]);

    useEffect(() => {
        const shouldHighlightMatches = Boolean(route.params?.highlightMatches);
        if (!isMatchUiEnabled || !shouldHighlightMatches || !usingRecommendedFeed || hasShownMatchBannerThisSession) {
            return;
        }

        hasShownMatchBannerThisSession = true;
        setShowMatchBanner(true);

        const routeCount = Number(route.params?.recommendedCount || 0);
        if (routeCount > 0) {
            setRecommendedCount(routeCount);
        }

        const timer = setTimeout(() => {
            listRef.current?.scrollToOffset?.({ offset: 0, animated: true });
        }, 250);
        const dismissTimer = setTimeout(() => {
            setShowMatchBanner(false);
        }, 8000);

        return () => {
            clearTimeout(timer);
            clearTimeout(dismissTimer);
        };
    }, [recommendedCount, route.params?.highlightMatches, route.params?.recommendedCount, usingRecommendedFeed]);

    useEffect(() => {
        Animated.timing(contentOpacity, {
            toValue: isLoading ? 0.9 : 1,
            duration: 160,
            useNativeDriver: true,
        }).start();
    }, [contentOpacity, isLoading]);

    useEffect(() => {
        let isMounted = true;

        const checkInactivity = async () => {
            try {
                const lastActive = await AsyncStorageLib.getItem('@hc_last_active_at');
                if (!lastActive || !isMounted) return;

                const lastActiveEpoch = Number(lastActive);
                if (!Number.isFinite(lastActiveEpoch)) return;

                const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
                if ((Date.now() - lastActiveEpoch) >= threeDaysMs) {
                    setShowInactiveBanner(true);
                    setNudgeToast({
                        text: 'Welcome back. You have new opportunities waiting.',
                        actionLabel: 'Refresh',
                        onAction: () => handleRefresh(),
                    });
                    if (!retentionPingRef.current.jobsNear) {
                        retentionPingRef.current.jobsNear = true;
                        if (!IS_EXPO_GO) {
                            import('../services/NotificationService')
                                .then(({ triggerLocalNotification }) => triggerLocalNotification('jobs_near_you', { city: appliedLocation || undefined }))
                                .catch(() => { });
                        }
                    }
                }
            } catch (error) {
                logger.warn('Inactivity nudge check failed', error?.message || error);
            }
        };

        checkInactivity();
        return () => { isMounted = false; };
    }, [appliedLocation, handleRefresh]);

    useEffect(() => {
        if (route.params?.source !== 'profile_saved') return;
        setNudgeToast({
            text: 'Profile saved. Explore your matching jobs below.',
            actionLabel: 'Refresh',
            onAction: () => handleRefresh(),
        });
    }, [handleRefresh, route.params?.source]);

    useEffect(() => {
        if (userRole === 'employer') return;
        if (Boolean(userInfo?.hasCompletedProfile || userInfo?.profileComplete)) return;

        const timeout = setTimeout(() => {
            setNudgeToast({
                text: 'Complete your profile form to unlock job matches.',
                actionLabel: 'Complete',
                onAction: () => navigation.navigate('Profiles'),
            });
        }, 1000);

        return () => clearTimeout(timeout);
    }, [navigation, userInfo?.hasCompletedProfile, userInfo?.profileComplete, userRole]);

    const filteredJobs = useMemo(() => {
        const dayMs = 24 * 60 * 60 * 1000;
        const maxNewAgeMs = 7 * dayMs;

        return jobs
            .filter((job) => !dismissedJobs.some((dismissed) => dismissed._id === job._id))
            .filter((job) => {
                if (activeFilter === 'High Match') return isHighMatchJob(job);
                if (activeFilter === 'Nearby') return isNearbyJob(job, searchRadiusKm, userBaseCity);
                if (activeFilter === 'New') return isRecentJob(job, maxNewAgeMs);
                return true;
            })
            .filter((job) => !appliedLocation || String(job?.location || '').toLowerCase().includes(appliedLocation.toLowerCase()))
            .filter((job) => !appliedMinSalary || extractSalaryNumber(job?.salaryRange) >= appliedMinSalary)
            .filter((job) => getDisplayScorePercent(job) >= appliedMinMatch);
    }, [
        activeFilter,
        appliedLocation,
        appliedMinMatch,
        appliedMinSalary,
        dismissedJobs,
        jobs,
        searchRadiusKm,
        userBaseCity,
    ]);

    const submitReport = useCallback(async (targetId, reason) => {
        try {
            await client.post('/api/reports', { targetId, targetType: 'job', reason });
        } catch (error) {
            // Report acknowledgement should still be optimistic.
        }

        setReportedJobIds((previous) => new Set([...previous, targetId]));
        Alert.alert('Reported', 'Thank you. We will review this job.');
    }, []);

    const handleReportJob = useCallback((job) => {
        Alert.alert('Report Job', 'Why are you reporting this job?', [
            { text: 'Spam or Misleading', onPress: () => submitReport(job?._id, 'spam') },
            { text: 'Inappropriate Content', onPress: () => submitReport(job?._id, 'inappropriate') },
            { text: 'Scam / Fraud', onPress: () => submitReport(job?._id, 'scam') },
            { text: 'Cancel', style: 'cancel' },
        ]);
    }, [submitReport]);

    const handleApplyFilters = useCallback(() => {
        setAppliedLocation(locationFilter);
        setAppliedMinSalary(minSalaryFilter ? parseInt(minSalaryFilter, 10) : 0);
        setAppliedMinMatch(minMatchFilter);
        setFilterModalVisible(false);
    }, [locationFilter, minMatchFilter, minSalaryFilter]);

    const handleClearFilters = useCallback(() => {
        setLocationFilter('');
        setMinSalaryFilter('');
        setMinMatchFilter(0);
        setAppliedLocation('');
        setAppliedMinSalary(0);
        setAppliedMinMatch(0);
    }, []);

    const handleJobPress = useCallback((job) => {
        const scorePercent = getDisplayScorePercent(job);

        trackEvent('JOB_VIEWED', {
            jobId: String(job?._id || ''),
            title: String(job?.title || ''),
            matchScore: Number(scorePercent || 0),
        });

        navigation.navigate('JobDetails', {
            job,
            matchScore: scorePercent,
            fitReason: job?.fitReason || `Your profile aligns with ${job?.title || 'this job'} requirements.`,
            workerIdForMatch: currentWorkerProfileId || currentWorkerUserId,
            finalScore: Number(getNormalizedScore(job).toFixed(4)),
            tier: String(job?.tier || ''),
            explainability: job?.explainability || {},
            entrySource: 'jobs_tab',
        });
    }, [currentWorkerProfileId, currentWorkerUserId, navigation]);

    const highlightedCount = Number(route.params?.recommendedCount || recommendedCount || 0);

    const renderJobCard = useCallback(({ item, index }) => {
        let contextNote = '';
        let contextTone = 'info';

        if (index === 0) {
            if (showRecommendedFallback) {
                contextTone = 'warning';
                contextNote = 'Strong signals are limited right now. Showing broader nearby opportunities.';
            } else if (showInactiveBanner) {
                contextNote = 'You were inactive for a few days. New roles were queued for you.';
            } else if (showMatchBanner && shouldRenderMatchInsights && highlightedCount > 0) {
                contextNote = `${highlightedCount} matched roles ready now.`;
            }
        }

        return (
            <JobCard
                item={item}
                onPress={handleJobPress}
                onReport={handleReportJob}
                isReported={reportedJobIds.has(item?._id)}
                showMatchInsights={shouldRenderMatchInsights}
                contextNote={contextNote}
                contextTone={contextTone}
            />
        );
    }, [
        highlightedCount,
        handleJobPress,
        handleReportJob,
        reportedJobIds,
        showInactiveBanner,
        showMatchBanner,
        showRecommendedFallback,
        shouldRenderMatchInsights,
    ]);

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.header}>
                <View style={styles.headerTopRow}>
                    <View style={styles.headerTitleWrap}>
                        <Text style={styles.headerTitle}>{userRole === 'employer' ? 'Your Job Postings' : 'Find Work'}</Text>
                    </View>

                    {!isFindWorkLockedEmpty ? (
                        <TouchableOpacity
                            style={styles.filtersBtn}
                            onPress={() => {
                                setLocationFilter(appliedLocation);
                                setMinSalaryFilter(appliedMinSalary > 0 ? String(appliedMinSalary) : '');
                                setMinMatchFilter(appliedMinMatch);
                                setFilterModalVisible(true);
                            }}
                        >
                            <Text style={styles.filtersBtnText}>Filters</Text>
                            {activeFilterCount > 0 ? (
                                <View style={styles.filtersBadge}>
                                    <Text style={styles.filtersBadgeText}>{activeFilterCount}</Text>
                                </View>
                            ) : null}
                        </TouchableOpacity>
                    ) : null}
                </View>

                {!isFindWorkLockedEmpty ? (
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={styles.filtersRow}
                        contentContainerStyle={styles.filtersRowContent}
                    >
                        {FILTERS.map((filter) => (
                            <TouchableOpacity
                                key={filter}
                                style={[styles.filterChip, activeFilter === filter && styles.filterChipActive]}
                                onPress={() => setActiveFilter(filter)}
                                activeOpacity={0.85}
                            >
                                <Text style={[styles.filterChipText, activeFilter === filter && styles.filterChipTextActive]}>{filter}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                ) : null}
            </View>

            {isLoading && jobs.length === 0 && !isFindWorkLockedEmpty ? (
                <View style={styles.loadingWrap}>
                    <SkeletonLoader height={132} style={styles.loadingCard} tone="tint" />
                    <SkeletonLoader height={132} style={styles.loadingCard} tone="tint" />
                    <SkeletonLoader height={132} style={styles.loadingCard} tone="tint" />
                </View>
            ) : null}

            <View style={{ flex: 1 }}>
                <Animated.View style={{ flex: 1, opacity: contentOpacity }}>
                    <FlatList
                        ref={listRef}
                        data={filteredJobs}
                        keyExtractor={(item) => String(item?._id || 'job')}
                        renderItem={renderJobCard}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                        maxToRenderPerBatch={10}
                        windowSize={10}
                        removeClippedSubviews={Platform.OS === 'android'}
                        initialNumToRender={10}
                        refreshControl={(
                            <RefreshControl
                                refreshing={isRefreshing}
                                onRefresh={handleRefresh}
                                tintColor={theme.textSecondary}
                            />
                        )}
                        ListEmptyComponent={(
                            <EmptyState
                                icon={isFindWorkLockedEmpty ? '📭' : (showRecommendedFallback ? '🔍' : '💼')}
                                title={
                                    isFindWorkLockedEmpty
                                        ? 'No jobs yet'
                                        : isMatchProfileMissing
                                            ? 'Create a profile to see matches'
                                            : (showRecommendedFallback ? 'No matches yet' : 'No jobs yet')
                                }
                                subtitle={
                                    isFindWorkLockedEmpty
                                        ? 'Opportunities will appear here when listings are ready.'
                                        : isMatchProfileMissing
                                        ? 'Add at least one active role profile in My Profile to unlock matched jobs.'
                                        : showRecommendedFallback
                                        ? 'No matching jobs right now. New opportunities will appear shortly.'
                                        : 'Try adjusting your search or filters.'
                                }
                                actionLabel={
                                    !isFindWorkLockedEmpty && isMatchProfileMissing
                                        ? 'Create Profile'
                                        : (!isFindWorkLockedEmpty && activeFilter !== 'All' ? 'Clear Filters' : null)
                                }
                                onAction={
                                    !isFindWorkLockedEmpty && isMatchProfileMissing
                                        ? () => navigation.navigate('Profiles')
                                        : (!isFindWorkLockedEmpty && activeFilter !== 'All'
                                        ? () => {
                                            setActiveFilter('All');
                                            handleClearFilters();
                                        }
                                        : null)
                                }
                            />
                        )}
                    />
                </Animated.View>
            </View>

            <Modal
                visible={filterModalVisible}
                animationType="slide"
                transparent
                onRequestClose={() => setFilterModalVisible(false)}
            >
                <View style={styles.filterModalOverlay}>
                    <View style={styles.filterModalSheet}>
                        <View style={styles.filterModalHeader}>
                            <Text style={styles.filterModalTitle}>Filters</Text>
                            <TouchableOpacity onPress={() => setFilterModalVisible(false)} style={styles.filterModalClose}>
                                <Text style={styles.filterModalCloseText}>X</Text>
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.filterModalContent}>

                            <Text style={styles.filterLabel}>SEARCH RADIUS</Text>
                            <View style={styles.matchOptions}>
                                {[10, 25, 50].map((radius) => (
                                    <TouchableOpacity
                                        key={`radius-${radius}`}
                                        style={[
                                            styles.matchOption,
                                            searchRadiusKm === radius && styles.matchOptionActive,
                                        ]}
                                        onPress={() => setSearchRadiusKm(radius)}
                                    >
                                        <Text
                                            style={[
                                                styles.matchOptionText,
                                                searchRadiusKm === radius && styles.matchOptionTextActive,
                                            ]}
                                        >
                                            {radius}km
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Text style={styles.filterLabel}>LOCATION</Text>
                            <TextInput
                                style={styles.filterInput}
                                value={locationFilter}
                                onChangeText={setLocationFilter}
                                placeholder="Any location"
                                placeholderTextColor="#94a3b8"
                            />

                            <Text style={styles.filterLabel}>MINIMUM SALARY (INR)</Text>
                            <TextInput
                                style={styles.filterInput}
                                value={minSalaryFilter}
                                onChangeText={setMinSalaryFilter}
                                placeholder="e.g. 25000"
                                placeholderTextColor="#94a3b8"
                                keyboardType="numeric"
                            />

                            <Text style={styles.filterLabel}>MATCH SCORE</Text>
                            <View style={styles.matchOptions}>
                                {matchOptions.map((option) => (
                                    <TouchableOpacity
                                        key={option.value}
                                        style={[
                                            styles.matchOption,
                                            minMatchFilter === option.value && styles.matchOptionActive,
                                        ]}
                                        onPress={() => setMinMatchFilter(option.value)}
                                    >
                                        <Text
                                            style={[
                                                styles.matchOptionText,
                                                minMatchFilter === option.value && styles.matchOptionTextActive,
                                            ]}
                                        >
                                            {option.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </ScrollView>

                        <View style={styles.filterActions}>
                            <TouchableOpacity
                                style={styles.clearBtn}
                                onPress={() => {
                                    handleClearFilters();
                                    setFilterModalVisible(false);
                                }}
                            >
                                <Text style={styles.clearBtnText}>CLEAR</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.applyBtn} onPress={handleApplyFilters}>
                                <Text style={styles.applyBtnText}>APPLY</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            <NudgeToast
                visible={Boolean(nudgeToast)}
                text={nudgeToast?.text}
                actionLabel={nudgeToast?.actionLabel}
                onAction={nudgeToast?.onAction}
                onDismiss={() => setNudgeToast(null)}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.background,
    },
    header: {
        backgroundColor: 'rgba(255,255,255,0.98)',
        paddingHorizontal: SPACING.md,
        paddingTop: SPACING.smd + 2,
        paddingBottom: SPACING.smd,
        borderBottomWidth: 1,
        borderBottomColor: '#edf1f7',
        zIndex: 10,
        ...SHADOWS.sm,
    },
    headerTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
        gap: 12,
    },
    headerTitleWrap: {
        flex: 1,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: theme.textPrimary,
        letterSpacing: -0.2,
    },
    filtersBtn: {
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 76,
        backgroundColor: 'rgba(255,255,255,0.92)',
        paddingHorizontal: SPACING.smd,
        paddingVertical: SPACING.sm,
        borderRadius: RADIUS.md,
        borderWidth: 1,
        borderColor: '#e6ebf4',
    },
    filtersBtnText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#334155',
    },
    filtersBadge: {
        position: 'absolute',
        top: -6,
        right: -6,
        backgroundColor: theme.primary,
        width: 18,
        height: 18,
        borderRadius: 9,
        justifyContent: 'center',
        alignItems: 'center',
    },
    filtersBadgeText: {
        color: '#ffffff',
        fontSize: 10,
        fontWeight: '700',
    },
    filtersRow: {
        flexDirection: 'row',
    },
    filtersRowContent: {
        paddingRight: 16,
    },
    filterChip: {
        backgroundColor: 'rgba(255,255,255,0.92)',
        borderRadius: RADIUS.full,
        paddingHorizontal: SPACING.smd + 2,
        paddingVertical: SPACING.xs + 3,
        marginRight: 10,
        borderWidth: 1,
        borderColor: '#e8edf4',
    },
    filterChipActive: {
        backgroundColor: '#eef3ff',
        borderColor: '#d7e1f0',
    },
    filterChipText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#334155',
    },
    filterChipTextActive: {
        color: '#1f2937',
        fontWeight: '600',
    },
    loadingWrap: {
        paddingHorizontal: SPACING.md,
        paddingTop: SPACING.smd,
    },
    loadingCard: {
        borderRadius: RADIUS.lg,
        marginBottom: 20,
    },
    listContent: {
        paddingHorizontal: SPACING.sm + 1,
        paddingTop: SPACING.xs,
        paddingBottom: 12,
    },
    emptyEmoji: {
        fontSize: 48,
        marginBottom: 16,
    },
    errorBanner: {
        marginHorizontal: 20,
        marginTop: SPACING.smd,
        marginBottom: 4,
        backgroundColor: '#fff3f4',
        borderRadius: RADIUS.md,
        borderWidth: 1,
        borderColor: '#f4cbd0',
        padding: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
    },
    errorBannerText: {
        flex: 1,
        color: '#9d3e49',
        fontSize: 12,
        fontWeight: '500',
    },
    errorRetryBtn: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        backgroundColor: '#fbe4e7',
    },
    errorRetryText: {
        color: '#9d3e49',
        fontWeight: '600',
        fontSize: 11,
    },
    filterModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    filterModalSheet: {
        backgroundColor: '#ffffff',
        borderTopLeftRadius: RADIUS.xxl,
        borderTopRightRadius: RADIUS.xxl,
        paddingHorizontal: 20,
        paddingTop: 20,
        maxHeight: '75%',
    },
    filterModalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    filterModalTitle: {
        fontSize: 24,
        fontWeight: '600',
        color: '#0f172a',
    },
    filterModalClose: {
        width: 34,
        height: 34,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: RADIUS.md,
        backgroundColor: '#f8fbff',
        borderWidth: 1,
        borderColor: '#dbe3ec',
    },
    filterModalCloseText: {
        fontSize: 18,
        color: '#64748b',
        fontWeight: '700',
    },
    filterModalContent: {
        paddingBottom: 24,
    },
    filterLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: '#94a3b8',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 8,
    },
    filterInput: {
        backgroundColor: '#f8fbff',
        borderWidth: 1,
        borderColor: '#dbe3ec',
        borderRadius: RADIUS.md,
        paddingHorizontal: 16,
        paddingVertical: 13,
        fontSize: 15,
        color: '#0f172a',
        marginBottom: 20,
    },
    matchOptions: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 24,
    },
    matchOption: {
        flex: 1,
        paddingVertical: 12,
        backgroundColor: '#f4f7fb',
        borderRadius: RADIUS.md,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#dbe3ec',
    },
    matchOptionActive: {
        backgroundColor: '#e8f0ff',
        borderColor: '#bfd5ff',
    },
    matchOptionText: {
        fontSize: 13,
        fontWeight: '500',
        color: '#64748b',
    },
    matchOptionTextActive: {
        color: '#1d4ed8',
        fontWeight: '600',
    },
    filterActions: {
        flexDirection: 'row',
        gap: 12,
        paddingBottom: 24,
    },
    clearBtn: {
        flex: 1,
        paddingVertical: 14,
        backgroundColor: '#f4f7fb',
        borderRadius: RADIUS.md,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#dbe3ec',
    },
    clearBtnText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#64748b',
    },
    applyBtn: {
        flex: 2,
        paddingVertical: 14,
        backgroundColor: theme.primary,
        borderRadius: RADIUS.md,
        alignItems: 'center',
    },
    applyBtnText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#ffffff',
    },
});
