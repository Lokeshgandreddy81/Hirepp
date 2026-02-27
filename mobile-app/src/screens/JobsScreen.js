import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Alert,
    FlatList,
    Modal,
    Platform,
    ScrollView,
    Share,
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

import client from '../api/client';
import EmptyState from '../components/EmptyState';
import JobCard from '../components/JobCard';
import SkeletonLoader from '../components/SkeletonLoader';
import { DEMO_MODE, FEATURE_MATCH_UI_V1 } from '../config';
import { useRefreshOnFocus } from '../hooks/useRefreshOnFocus';
import { trackEvent } from '../services/analytics';
import { useAppStore } from '../store/AppStore';
import { logValidationError, validateJobsResponse } from '../utils/apiValidator';
import { logger } from '../utils/logger';
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
const DEFAULT_TIER_FILTERS = [MATCH_TIERS.STRONG, MATCH_TIERS.GOOD];
const ALL_TIERS = [MATCH_TIERS.STRONG, MATCH_TIERS.GOOD, MATCH_TIERS.POSSIBLE];

let hasShownMatchBannerThisSession = false;

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

export default function JobsScreen() {
    const navigation = useNavigation();
    const route = useRoute();
    const insets = useSafeAreaInsets();
    const { featureFlags } = useAppStore();

    const listRef = useRef(null);
    const fetchDebounceRef = useRef(null);
    const matchApiCallsRef = useRef(0);

    const [activeFilter, setActiveFilter] = useState('All');
    const [userRole, setUserRole] = useState('candidate');
    const [jobs, setJobs] = useState([]);
    const [savedJobIds, setSavedJobIds] = useState(new Set());
    const [dismissedJobs, setDismissedJobs] = useState([]);
    const [reportedJobIds, setReportedJobIds] = useState(new Set());
    const [isLoading, setIsLoading] = useState(!DEMO_MODE);
    const [errorMsg, setErrorMsg] = useState('');

    const [usingRecommendedFeed, setUsingRecommendedFeed] = useState(false);
    const [showRecommendedFallback, setShowRecommendedFallback] = useState(false);
    const [showMatchBanner, setShowMatchBanner] = useState(false);
    const [recommendedCount, setRecommendedCount] = useState(0);
    const [selectedTierFilters, setSelectedTierFilters] = useState(DEFAULT_TIER_FILTERS);

    const [currentWorkerUserId, setCurrentWorkerUserId] = useState('');
    const [currentWorkerProfileId, setCurrentWorkerProfileId] = useState('');

    const [filterModalVisible, setFilterModalVisible] = useState(false);
    const [locationFilter, setLocationFilter] = useState('');
    const [minSalaryFilter, setMinSalaryFilter] = useState('');
    const [minMatchFilter, setMinMatchFilter] = useState(0);

    const [appliedLocation, setAppliedLocation] = useState('');
    const [appliedMinSalary, setAppliedMinSalary] = useState(0);
    const [appliedMinMatch, setAppliedMinMatch] = useState(0);

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

    const formatJobRow = useCallback((item, source = 'generic') => {
        const job = item?.job || item || {};
        const normalizedScore = getNormalizedScore(item);

        return {
            _id: String(job._id || item?._id || `${source}-${Math.random()}`),
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
            job: job,
        };
    }, []);

    const resolveWorkerContext = useCallback(async () => {
        let userInfo = {};

        try {
            const userInfoString = await SecureStore.getItemAsync('userInfo');
            userInfo = JSON.parse(userInfoString || '{}');
        } catch (error) {
            logger.error('Failed to parse userInfo', error);
        }

        const normalizedRole = String(userInfo?.role || userInfo?.primaryRole || '').toLowerCase();
        const isEmployerRole = normalizedRole === 'employer' || normalizedRole === 'recruiter';
        setUserRole(isEmployerRole ? 'employer' : 'candidate');

        const userId = String(userInfo?._id || '');
        let workerProfileId = String(currentWorkerProfileId || userInfo?.workerProfileId || '');

        if (!workerProfileId && !isEmployerRole) {
            try {
                const { data } = await client.get('/api/users/profile');
                workerProfileId = String(data?.profile?._id || '');
            } catch (error) {
                logger.warn('Worker profile lookup failed, using userId fallback for recommendations.', error?.message || error);
            }
        }

        return {
            userId,
            workerProfileId,
            city: String(userInfo?.acquisitionCity || userInfo?.city || appliedLocation || '').trim(),
            isEmployerRole,
        };
    }, [appliedLocation, currentWorkerProfileId]);

    const fetchGenericJobs = useCallback(async () => {
        const { data } = await client.get('/api/matches/candidate');
        const matches = validateJobsResponse(data);

        return matches
            .map((row) => formatJobRow(row, 'generic'))
            .sort((left, right) => getNormalizedScore(right) - getNormalizedScore(left));
    }, [formatJobRow]);

    const fetchRecommendedJobs = useCallback(async ({ workerId, city }) => {
        if (!workerId) return [];
        if (matchApiCallsRef.current >= MAX_MATCH_API_CALLS_PER_LOAD) {
            logger.warn('Skipping recommended fetch: match API call budget exhausted for this load.');
            return [];
        }

        matchApiCallsRef.current += 1;

        const params = { workerId };
        if (city) params.city = city;

        const { data } = await client.get('/api/jobs/recommended', { params });
        const rows = Array.isArray(data?.recommendedJobs) ? data.recommendedJobs : [];
        const normalized = sortRecommendedJobsByTierAndScore(rows.map((row) => formatJobRow(row, 'recommended')));

        const strongAndGood = normalized.filter((row) => row.tier === MATCH_TIERS.STRONG || row.tier === MATCH_TIERS.GOOD);
        const possible = normalized.filter((row) => row.tier === MATCH_TIERS.POSSIBLE);
        return [...strongAndGood, ...possible].slice(0, 20);
    }, [formatJobRow]);

    const fetchJobs = useCallback(async () => {
        if (!DEMO_MODE) setIsLoading(true);
        setErrorMsg('');
        matchApiCallsRef.current = 0;

        try {
            try {
                const cachedJobs = await AsyncStorageLib.getItem(CACHE_KEY);
                if (cachedJobs) {
                    const parsed = JSON.parse(cachedJobs);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        setJobs(parsed);
                    }
                }
            } catch (cacheReadError) {
                logger.error('Error loading cached jobs', cacheReadError);
            }

            const { userId, workerProfileId, city, isEmployerRole } = await resolveWorkerContext();
            setCurrentWorkerUserId(userId);
            setCurrentWorkerProfileId(workerProfileId);

            const shouldUseMatchUi = isMatchUiEnabled && !isEmployerRole;
            let nextJobs = [];
            let isRecommended = false;

            if (shouldUseMatchUi) {
                try {
                    const recommendedRows = await fetchRecommendedJobs({ workerId: workerProfileId || userId, city });
                    if (recommendedRows.length > 0) {
                        nextJobs = recommendedRows;
                        isRecommended = true;
                        setRecommendedCount(recommendedRows.length);

                        const topJob = recommendedRows[0];
                        trackEvent('MATCH_RECOMMENDATION_VIEWED', {
                            workerId: workerProfileId || userId,
                            jobId: String(topJob?._id || ''),
                            finalScore: Number(getNormalizedScore(topJob).toFixed(4)),
                            tier: String(topJob?.tier || ''),
                            source: String(route.params?.source || 'jobs_screen'),
                        });
                    }
                } catch (recommendedError) {
                    logger.error('Recommended jobs fetch failed. Falling back to generic listing.', recommendedError);
                }
            }

            if (!nextJobs.length) {
                nextJobs = await fetchGenericJobs();
            }

            setUsingRecommendedFeed(isRecommended);
            setShowRecommendedFallback(Boolean(shouldUseMatchUi && !isRecommended));
            if (!isRecommended) setRecommendedCount(0);

            setJobs(nextJobs);

            try {
                await AsyncStorageLib.setItem(CACHE_KEY, JSON.stringify(nextJobs));
            } catch (cacheWriteError) {
                logger.error('Error saving cached jobs', cacheWriteError);
            }
        } catch (error) {
            if (error?.name === 'ApiValidationError') {
                logValidationError(error, '/api/matches/candidate');
            } else {
                logger.error('Failed to fetch jobs', error);
            }
            setErrorMsg(getReadableError(error, 'Could not load jobs right now. Please try again.'));
        } finally {
            if (!DEMO_MODE) setIsLoading(false);
        }
    }, [fetchGenericJobs, fetchRecommendedJobs, resolveWorkerContext, route.params?.source]);

    const scheduleFetchJobs = useCallback(() => {
        if (fetchDebounceRef.current) {
            clearTimeout(fetchDebounceRef.current);
        }
        fetchDebounceRef.current = setTimeout(fetchJobs, FETCH_DEBOUNCE_MS);
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

    const toggleTierFilter = useCallback((tier) => {
        if (tier === 'ALL') {
            setSelectedTierFilters(ALL_TIERS);
            return;
        }

        setSelectedTierFilters((previous) => {
            const next = new Set(previous);
            if (next.has(tier)) {
                next.delete(tier);
            } else {
                next.add(tier);
            }

            if (next.size === 0) {
                return DEFAULT_TIER_FILTERS;
            }

            return Array.from(next);
        });
    }, []);

    const filteredJobs = useMemo(() => {
        const dayMs = 24 * 60 * 60 * 1000;

        return jobs
            .filter((job) => !dismissedJobs.some((dismissed) => dismissed._id === job._id))
            .filter((job) => {
                if (activeFilter === 'High Match') return getDisplayScorePercent(job) > 80;
                if (activeFilter === 'Nearby') return !String(job?.location || '').toLowerCase().includes('remote');
                if (activeFilter === 'New') {
                    if (!job.createdAtEpoch) return true;
                    return Date.now() - job.createdAtEpoch <= (3 * dayMs);
                }
                return true;
            })
            .filter((job) => !appliedLocation || String(job?.location || '').toLowerCase().includes(appliedLocation.toLowerCase()))
            .filter((job) => !appliedMinSalary || extractSalaryNumber(job?.salaryRange) >= appliedMinSalary)
            .filter((job) => getDisplayScorePercent(job) >= appliedMinMatch)
            .filter((job) => {
                if (!shouldRenderMatchInsights) return true;
                return selectedTierFilters.includes(String(job?.tier || '').toUpperCase());
            });
    }, [
        activeFilter,
        appliedLocation,
        appliedMinMatch,
        appliedMinSalary,
        dismissedJobs,
        jobs,
        selectedTierFilters,
        shouldRenderMatchInsights,
    ]);

    const toggleSaveJob = useCallback((id) => {
        setSavedJobIds((previous) => {
            const next = new Set(previous);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    }, []);

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

    const handleShareJob = useCallback(async (job) => {
        try {
            await Share.share({
                message: `${job?.title || 'Job'} at ${job?.companyName || 'Company'} — ${job?.location || 'Remote'}\nSalary: ${job?.salaryRange || 'Unspecified'}\n\nApply on HireApp`,
                title: job?.title || 'Job Opportunity',
            });
        } catch (error) {
            logger.error('Error sharing job', error);
        }
    }, []);

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

    const handleReasonPress = useCallback((job, reason) => {
        trackEvent('MATCH_REASON_CLICKED', {
            workerId: currentWorkerProfileId || currentWorkerUserId,
            jobId: String(job?._id || ''),
            finalScore: Number(getNormalizedScore(job).toFixed(4)),
            tier: String(job?.tier || ''),
            reasonId: String(reason?.id || ''),
            reasonLabel: String(reason?.label || ''),
        });
    }, [currentWorkerProfileId, currentWorkerUserId]);

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
        });
    }, [currentWorkerProfileId, currentWorkerUserId, navigation]);

    const renderJobCard = useCallback(({ item }) => (
        <JobCard
            item={item}
            onPress={handleJobPress}
            onShare={handleShareJob}
            onToggleSave={toggleSaveJob}
            isSaved={savedJobIds.has(item?._id)}
            onReport={handleReportJob}
            isHistory={false}
            isReported={reportedJobIds.has(item?._id)}
            showMatchInsights={shouldRenderMatchInsights}
            onReasonPress={handleReasonPress}
        />
    ), [
        handleJobPress,
        handleReasonPress,
        handleReportJob,
        handleShareJob,
        reportedJobIds,
        savedJobIds,
        shouldRenderMatchInsights,
        toggleSaveJob,
    ]);

    const bannerCount = Number(route.params?.recommendedCount || recommendedCount || 0);

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}> 
            <View style={styles.header}>
                <View style={styles.headerTopRow}>
                    <Text style={styles.headerTitle}>{userRole === 'employer' ? 'Your Job Postings' : 'Jobs for You'}</Text>

                    <TouchableOpacity
                        style={styles.filtersBtn}
                        onPress={() => {
                            setLocationFilter(appliedLocation);
                            setMinSalaryFilter(appliedMinSalary > 0 ? String(appliedMinSalary) : '');
                            setMinMatchFilter(appliedMinMatch);
                            setFilterModalVisible(true);
                        }}
                    >
                        <Text style={styles.filtersBtnIcon}>⚙️</Text>
                        <Text style={styles.filtersBtnText}>Filters</Text>
                        {activeFilterCount > 0 ? (
                            <View style={styles.filtersBadge}>
                                <Text style={styles.filtersBadgeText}>{activeFilterCount}</Text>
                            </View>
                        ) : null}
                    </TouchableOpacity>
                </View>

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

                {shouldRenderMatchInsights ? (
                    <View style={styles.tierChipsRow}>
                        {ALL_TIERS.map((tier) => (
                            <TouchableOpacity
                                key={tier}
                                style={[
                                    styles.tierChip,
                                    selectedTierFilters.includes(tier) && styles.tierChipActive,
                                ]}
                                onPress={() => toggleTierFilter(tier)}
                                activeOpacity={0.85}
                            >
                                <Text
                                    style={[
                                        styles.tierChipText,
                                        selectedTierFilters.includes(tier) && styles.tierChipTextActive,
                                    ]}
                                >
                                    {tier}
                                </Text>
                            </TouchableOpacity>
                        ))}
                        <TouchableOpacity
                            style={[
                                styles.tierChip,
                                selectedTierFilters.length === ALL_TIERS.length && styles.tierChipActive,
                            ]}
                            onPress={() => toggleTierFilter('ALL')}
                            activeOpacity={0.85}
                        >
                            <Text
                                style={[
                                    styles.tierChipText,
                                    selectedTierFilters.length === ALL_TIERS.length && styles.tierChipTextActive,
                                ]}
                            >
                                ALL
                            </Text>
                        </TouchableOpacity>
                    </View>
                ) : null}

                {showMatchBanner && shouldRenderMatchInsights ? (
                    <View style={styles.matchBanner}>
                        <Text style={styles.matchBannerTitle}>Jobs just for you</Text>
                        <Text style={styles.matchBannerSubtitle}>{bannerCount || recommendedCount || 0} matched roles based on your profile</Text>
                    </View>
                ) : null}

                {showRecommendedFallback ? (
                    <View style={styles.fallbackBanner}>
                        <Text style={styles.fallbackBannerText}>No close matches found — here are all jobs near you</Text>
                    </View>
                ) : null}
            </View>

            {isLoading && jobs.length === 0 ? (
                <View style={styles.loadingWrap}>
                    <SkeletonLoader height={140} style={styles.loadingCard} />
                    <SkeletonLoader height={140} style={styles.loadingCard} />
                    <SkeletonLoader height={140} style={styles.loadingCard} />
                </View>
            ) : null}

            {!isLoading && errorMsg && filteredJobs.length === 0 ? (
                <EmptyState
                    icon={<Text style={styles.emptyEmoji}>⚠️</Text>}
                    title="Could Not Load Jobs"
                    message={errorMsg}
                    actionLabel="Retry"
                    onAction={fetchJobs}
                />
            ) : (
                <>
                    {errorMsg && filteredJobs.length > 0 ? (
                        <View style={styles.errorBanner}>
                            <Text style={styles.errorBannerText}>{errorMsg}</Text>
                            <TouchableOpacity onPress={fetchJobs} style={styles.errorRetryBtn}>
                                <Text style={styles.errorRetryText}>Retry</Text>
                            </TouchableOpacity>
                        </View>
                    ) : null}

                    <FlatList
                        ref={listRef}
                        data={filteredJobs}
                        keyExtractor={(item, index) => `${item?._id || 'job'}-${index}`}
                        renderItem={renderJobCard}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                        maxToRenderPerBatch={10}
                        windowSize={10}
                        removeClippedSubviews={Platform.OS === 'android'}
                        initialNumToRender={10}
                        ListEmptyComponent={
                            <EmptyState
                                icon={<Text style={styles.emptyEmoji}>🔍</Text>}
                                title={showRecommendedFallback ? 'No close matches found' : 'No Jobs Found'}
                                message={
                                    showRecommendedFallback
                                        ? 'No close matches found — here are all jobs near you'
                                        : 'Try adjusting your search or filter.'
                                }
                                actionLabel={activeFilter !== 'All' ? 'Clear Filters' : null}
                                onAction={
                                    activeFilter !== 'All'
                                        ? () => {
                                            setActiveFilter('All');
                                            handleClearFilters();
                                        }
                                        : null
                                }
                            />
                        }
                    />
                </>
            )}

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
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    header: {
        backgroundColor: '#ffffff',
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
        zIndex: 10,
    },
    headerTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#0f172a',
    },
    filtersBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#faf5ff',
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#e9d5ff',
        gap: 4,
    },
    filtersBtnIcon: {
        fontSize: 14,
    },
    filtersBtnText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#7e22ce',
    },
    filtersBadge: {
        backgroundColor: '#9333ea',
        width: 18,
        height: 18,
        borderRadius: 9,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 2,
    },
    filtersBadgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '900',
    },
    filtersRow: {
        flexDirection: 'row',
    },
    filtersRowContent: {
        paddingRight: 16,
    },
    filterChip: {
        backgroundColor: '#f1f5f9',
        borderRadius: 9999,
        paddingHorizontal: 16,
        paddingVertical: 6,
        marginRight: 8,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    filterChipActive: {
        backgroundColor: '#faf5ff',
        borderColor: '#d8b4fe',
    },
    filterChipText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#475569',
    },
    filterChipTextActive: {
        color: '#6d28d9',
        fontWeight: '700',
    },
    tierChipsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 10,
    },
    tierChip: {
        borderRadius: 999,
        borderWidth: 1,
        borderColor: '#cbd5e1',
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: '#ffffff',
    },
    tierChipActive: {
        borderColor: '#1d4ed8',
        backgroundColor: '#dbeafe',
    },
    tierChipText: {
        fontSize: 12,
        color: '#334155',
        fontWeight: '700',
    },
    tierChipTextActive: {
        color: '#1d4ed8',
    },
    matchBanner: {
        marginTop: 12,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#bbf7d0',
        backgroundColor: '#ecfdf5',
        padding: 12,
    },
    matchBannerTitle: {
        color: '#065f46',
        fontSize: 14,
        fontWeight: '800',
    },
    matchBannerSubtitle: {
        marginTop: 4,
        color: '#047857',
        fontSize: 12,
        fontWeight: '600',
    },
    fallbackBanner: {
        marginTop: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#fde68a',
        backgroundColor: '#fffbeb',
        padding: 10,
    },
    fallbackBannerText: {
        color: '#92400e',
        fontSize: 12,
        fontWeight: '700',
    },
    loadingWrap: {
        paddingHorizontal: 16,
        paddingTop: 16,
    },
    loadingCard: {
        borderRadius: 12,
        marginBottom: 16,
    },
    listContent: {
        padding: 16,
        paddingBottom: 32,
    },
    emptyEmoji: {
        fontSize: 48,
        marginBottom: 16,
    },
    errorBanner: {
        marginHorizontal: 16,
        marginTop: 12,
        marginBottom: 4,
        backgroundColor: '#fef2f2',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#fecaca',
        padding: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
    },
    errorBannerText: {
        flex: 1,
        color: '#b91c1c',
        fontSize: 12,
        fontWeight: '600',
    },
    errorRetryBtn: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        backgroundColor: '#fee2e2',
    },
    errorRetryText: {
        color: '#b91c1c',
        fontWeight: '800',
        fontSize: 11,
    },
    filterModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    filterModalSheet: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 24,
        paddingTop: 24,
        maxHeight: '75%',
    },
    filterModalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    filterModalTitle: {
        fontSize: 18,
        fontWeight: '900',
        color: '#0f172a',
    },
    filterModalClose: {
        padding: 8,
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
        fontSize: 10,
        fontWeight: '900',
        color: '#94a3b8',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 8,
    },
    filterInput: {
        backgroundColor: '#f8fafc',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 12,
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
        backgroundColor: '#f1f5f9',
        borderRadius: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'transparent',
    },
    matchOptionActive: {
        backgroundColor: '#faf5ff',
        borderColor: '#e9d5ff',
    },
    matchOptionText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#64748b',
    },
    matchOptionTextActive: {
        color: '#7e22ce',
    },
    filterActions: {
        flexDirection: 'row',
        gap: 12,
        paddingBottom: 24,
    },
    clearBtn: {
        flex: 1,
        paddingVertical: 14,
        backgroundColor: '#f1f5f9',
        borderRadius: 12,
        alignItems: 'center',
    },
    clearBtnText: {
        fontSize: 14,
        fontWeight: '900',
        color: '#64748b',
        letterSpacing: 0.5,
    },
    applyBtn: {
        flex: 2,
        paddingVertical: 14,
        backgroundColor: '#9333ea',
        borderRadius: 12,
        alignItems: 'center',
    },
    applyBtnText: {
        fontSize: 14,
        fontWeight: '900',
        color: '#fff',
        letterSpacing: 0.5,
    },
});
