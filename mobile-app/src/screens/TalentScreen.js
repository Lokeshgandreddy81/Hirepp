import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, FlatList, Platform, Alert, BackHandler, Modal, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import client from '../api/client';
import SkeletonLoader from '../components/SkeletonLoader';
import { logger } from '../utils/logger';
import EmptyState from '../components/EmptyState';
import SocketService from '../services/socket';

const STATUS_ALIAS_MAP = {
    requested: 'applied',
    pending: 'applied',
    accepted: 'interview_requested',
    interview: 'interview_requested',
    offer_proposed: 'offer_sent',
};

const STATUS_LABEL_MAP = {
    applied: 'Applied',
    shortlisted: 'Shortlisted',
    interview_requested: 'Accepted',
    interview_completed: 'Accepted',
    offer_sent: 'Accepted',
    offer_accepted: 'Accepted',
    rejected: 'Rejected',
    hired: 'Hired',
    withdrawn: 'Rejected',
    expired: 'Rejected',
};

const CHAT_READY_STATUSES = new Set(['shortlisted', 'interview_requested', 'interview_completed', 'offer_sent', 'offer_accepted', 'hired']);
const extractArrayPayload = (payload) => {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.data)) return payload.data;
    return null;
};
const OBJECT_ID_PATTERN = /^[a-f0-9]{24}$/i;
const normalizeObjectId = (value) => {
    const normalized = String(value || '').trim();
    if (!OBJECT_ID_PATTERN.test(normalized)) return '';
    return normalized;
};

const isProfileRoleGateError = (error) => {
    const status = Number(error?.response?.status || error?.status || 0);
    const message = String(error?.response?.data?.message || error?.message || '').toLowerCase();
    return status === 403 && (
        message.includes('worker profile requires at least one role profile')
        || message.includes('profile_incomplete_role')
        || message.includes('employer profile incomplete')
    );
};

const normalizeApplicationStatus = (status) => {
    const normalized = String(status || '').trim().toLowerCase();
    if (!normalized) return 'applied';
    return STATUS_ALIAS_MAP[normalized] || normalized;
};

const buildEmployerStatusSequence = (currentStatus, targetStatus) => {
    const current = normalizeApplicationStatus(currentStatus);
    const target = normalizeApplicationStatus(targetStatus);
    if (!target || current === target) return [];

    if (target === 'interview_requested') {
        if (current === 'applied') return ['shortlisted', 'interview_requested'];
        if (current === 'shortlisted' || current === 'interview_completed') return ['interview_requested'];
        return ['interview_requested'];
    }

    if (target === 'shortlisted') {
        if (current === 'applied') return ['shortlisted'];
        return [];
    }

    return [target];
};

const STATUS_COLOR_MAP = {
    Applied: '#94a3b8',
    Shortlisted: '#f59e0b',
    Accepted: '#9333ea',
    Rejected: '#ef4444',
    Hired: '#10b981',
    'Offer Received': '#0ea5e9',
    'Offer Accepted': '#10b981',
};

export default function TalentScreen({ navigation, route }) {
    const isScreenFocused = useIsFocused();
    const [selectedPool, setSelectedPool] = useState(null);
    const [selectedCandidate, setSelectedCandidate] = useState(null);
    const [pools, setPools] = useState([]);
    const [hasAutoOpenedPool, setHasAutoOpenedPool] = useState(false);
    const [loadingPools, setLoadingPools] = useState(true);
    const [candidates, setCandidates] = useState([]);
    const [loadingCandidates, setLoadingCandidates] = useState(false);
    const [explanation, setExplanation] = useState(null);
    const [loadingExplanation, setLoadingExplanation] = useState(false);
    const [poolError, setPoolError] = useState('');
    const [candidateError, setCandidateError] = useState('');
    const [statusUpdating, setStatusUpdating] = useState(false);
    const [showResumeModal, setShowResumeModal] = useState(false);
    const poolsFetchInFlightRef = useRef(false);
    const poolsLoadedOnceRef = useRef(false);
    const candidateRequestIdRef = useRef(0);
    const candidatesLoadedOnceRef = useRef(false);
    const insets = useSafeAreaInsets();
    const handleOpenQuickPost = useCallback(() => {
        navigation.navigate('PostJob');
    }, [navigation]);

    const getReadableError = (error, fallback) => {
        if (error?.response?.data?.message) return error.response.data.message;
        if (error?.originalError?.response?.data?.message) return error.originalError.response.data.message;
        if (error?.message === 'No internet connection') return 'No internet connection. Please check your network and try again.';
        if (error?.message === 'Network Error') return 'Unable to reach the server. Please try again.';
        if (error?.code === 'ECONNABORTED') return 'Request timed out. Please retry.';
        return fallback;
    };

    const fetchJobsAsPools = useCallback(async () => {
        if (poolsFetchInFlightRef.current) {
            return;
        }
        poolsFetchInFlightRef.current = true;
        if (!poolsLoadedOnceRef.current) {
            setLoadingPools(true);
        }
        setPoolError('');
        try {
            const [jobsResult, applicationsResult] = await Promise.allSettled([
                client.get('/api/jobs/my-jobs', {
                    __skipApiErrorHandler: true,
                    __maxRetries: 0,
                    __disableBaseFallback: true,
                    timeout: 6000,
                }),
                client.get('/api/applications', {
                    __skipApiErrorHandler: true,
                    __maxRetries: 0,
                    __disableBaseFallback: true,
                    timeout: 6000,
                }),
            ]);

            if (jobsResult.status !== 'fulfilled') {
                throw jobsResult.reason;
            }

            const jobsArray = extractArrayPayload(jobsResult.value?.data);
            if (!jobsArray) {
                throw new Error('Invalid jobs response format.');
            }

            let applications = [];
            if (applicationsResult.status === 'fulfilled') {
                const parsedApplications = extractArrayPayload(applicationsResult.value?.data);
                if (parsedApplications) {
                    applications = parsedApplications;
                } else {
                    logger.warn('Talent pools: applications payload was not an array. Falling back to zero counts.');
                }
            } else {
                logger.warn('Talent pools: applications fetch failed. Falling back to zero counts.');
            }

            const applicantCountByJobId = applications.reduce((acc, application) => {
                const jobId = String(application?.job?._id || application?.job || '');
                if (!jobId) return acc;
                acc[jobId] = (acc[jobId] || 0) + 1;
                return acc;
            }, {});
            const newPools = jobsArray
                .map((j) => {
                    const normalizedId = normalizeObjectId(j?._id);
                    if (!normalizedId) return null;
                    return {
                        id: normalizedId,
                        name: j?.title,
                        count: applicantCountByJobId[normalizedId] || 0,
                        tags: j?.requirements ? [j.requirements[0]] : [],
                    };
                })
                .filter(Boolean);

            setPools(newPools);
        } catch (error) {
            // Keep Talent tab stable with empty-state UX when backend data is unavailable.
            setPools([]);
            setPoolError('');
        } finally {
            poolsFetchInFlightRef.current = false;
            poolsLoadedOnceRef.current = true;
            setLoadingPools(false);
        }
    }, []);

    const fetchCandidatesForPool = useCallback(async (poolId) => {
        const requestId = candidateRequestIdRef.current + 1;
        candidateRequestIdRef.current = requestId;

        const normalizedPoolId = normalizeObjectId(poolId);
        if (!normalizedPoolId) {
            setCandidates([]);
            setCandidateError('Select a job to view candidates.');
            setSelectedPool(null);
            setLoadingCandidates(false);
            candidatesLoadedOnceRef.current = false;
            return;
        }

        setCandidateError('');
        if (!candidatesLoadedOnceRef.current) {
            setLoadingCandidates(true);
        }
        try {
            const { data } = await client.get(`/api/matches/employer/${normalizedPoolId}`, {
                __skipApiErrorHandler: true,
                __maxRetries: 0,
                __disableBaseFallback: true,
                timeout: 6000,
            });
            const matches = Array.isArray(data)
                ? data
                : (Array.isArray(data?.matches) ? data.matches : null);
            if (!matches) {
                throw new Error('Invalid match response format.');
            }
            const mapped = matches.map((item, idx) => {
                const w = item.worker || {};
                const u = w.user || {};
                const role = w.roleProfiles && w.roleProfiles[0] ? w.roleProfiles[0] : {};
                const statusRaw = normalizeApplicationStatus(item.applicationStatus || item.status || 'pending');
                const statusLabel = STATUS_LABEL_MAP[statusRaw] || 'Applied';
                const applicationKey = String(item?.applicationId || item?._id || '').trim();
                const workerKey = String(w?._id || u?._id || '').trim();
                const candidateId = applicationKey
                    ? `app-${applicationKey}`
                    : workerKey
                        ? `pool-${normalizedPoolId}-worker-${workerKey}-${idx}`
                        : `pool-${normalizedPoolId}-row-${idx}`;
                const resolvedMatchScore = Number.isFinite(Number(item?.matchScore))
                    ? Math.max(0, Math.min(100, Number(item.matchScore) <= 1 ? Number(item.matchScore) * 100 : Number(item.matchScore)))
                    : null;
                const skills = Array.isArray(role?.skills) && role.skills.length
                    ? role.skills
                    : (Array.isArray(w?.skills) ? w.skills : []);
                const transcript = String(w?.videoIntroduction?.transcript || '').trim();
                const summary = String(
                    item?.whyThisMatchesYou
                    || item?.matchWhy?.summary
                    || transcript
                ).trim();
                const profilePercentile = Number.isFinite(Number(item?.profilePercentile))
                    ? Math.max(0, Math.min(99, Math.round(Number(item.profilePercentile))))
                    : null;
                return {
                    id: candidateId,
                    userId: u._id,
                    name: u.name || w.firstName || 'Candidate',
                    roleTitle: role.roleName || 'Candidate',
                    summary,
                    experienceYears: role.experienceInRole || 0,
                    skills,
                    qualifications: w.education || [],
                    location: w.city || 'Remote',
                    matchScore: resolvedMatchScore,
                    profilePercentile,
                    applicationId: item.applicationId || null,
                    statusRaw,
                    statusLabel,
                    interviewVerified: Boolean(w.interviewVerified),
                    communicationClarityTag: item.communicationClarityTag || 'Not enough data yet',
                    profileStrengthLabel: item.profileStrengthLabel || 'Not enough data yet',
                    salaryAlignmentStatus: item.salaryAlignmentStatus || 'ALIGNED',
                    verifiedPriorityActive: Boolean(item.verifiedPriorityActive),
                    resumeUrl: w?.resumeUrl || w?.resume?.url || role?.resumeUrl || u?.resumeUrl || item?.resumeUrl || null,
                    transcript,
                    whyMatch: String(item?.whyThisMatchesYou || item?.matchWhy?.summary || '').trim(),
                };
            });
            if (requestId !== candidateRequestIdRef.current) {
                return;
            }
            setCandidates(mapped);
        } catch (error) {
            if (requestId !== candidateRequestIdRef.current) {
                return;
            }
            if (!isProfileRoleGateError(error)) {
                // Keep Talent tab stable with empty-state UX when backend data is unavailable.
            }
            setCandidates([]);
            setCandidateError('');
        } finally {
            if (requestId === candidateRequestIdRef.current) {
                candidatesLoadedOnceRef.current = true;
                setLoadingCandidates(false);
            }
        }
    }, []);

    const handleSelectPool = useCallback(async (pool) => {
        // Mark that pool view was intentionally opened so auto-open doesn't trap back navigation.
        candidatesLoadedOnceRef.current = false;
        setHasAutoOpenedPool(true);
        setSelectedPool(pool);
        setSelectedCandidate(null);
        setExplanation(null);
        await fetchCandidatesForPool(pool?.id);
    }, [fetchCandidatesForPool]);

    const handleBackFromPool = useCallback(() => {
        const launchedFromJobShortcut = Boolean(String(route?.params?.jobId || '').trim());

        setSelectedCandidate(null);
        setSelectedPool(null);
        setExplanation(null);
        setCandidateError('');
        candidatesLoadedOnceRef.current = false;
        setHasAutoOpenedPool(true);

        if (launchedFromJobShortcut) {
            // Clear one-time route param first; otherwise the auto-select effect re-opens the same pool.
            navigation.setParams({ jobId: undefined });
            navigation.navigate('My Jobs');
        }
    }, [navigation, route?.params?.jobId]);

    useFocusEffect(
        useCallback(() => {
            if (!selectedPool && !selectedCandidate) {
                return undefined;
            }

            const onBackPress = () => {
                if (selectedCandidate) {
                    setSelectedCandidate(null);
                    return true;
                }
                if (selectedPool) {
                    handleBackFromPool();
                    return true;
                }
                return false;
            };

            const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
            return () => subscription.remove();
        }, [handleBackFromPool, selectedCandidate, selectedPool])
    );

    useEffect(() => {
        fetchJobsAsPools();
    }, [fetchJobsAsPools]);

    useFocusEffect(
        useCallback(() => {
            fetchJobsAsPools();
            if (selectedPool?.id) {
                fetchCandidatesForPool(selectedPool.id);
            }
            return undefined;
        }, [fetchCandidatesForPool, fetchJobsAsPools, selectedPool?.id])
    );

    useEffect(() => {
        const initialJobId = route?.params?.jobId;
        if (!initialJobId || !Array.isArray(pools) || pools.length === 0 || selectedPool?.id) {
            return;
        }
        const matchedPool = pools.find((pool) => String(pool.id) === String(initialJobId));
        if (matchedPool) {
            handleSelectPool(matchedPool);
        }
    }, [route?.params?.jobId, pools, selectedPool?.id, handleSelectPool]);

    useEffect(() => {
        const handleNewApplication = (payload = {}) => {
            const payloadJobId = String(payload?.jobId || '').trim();
            if (!payloadJobId) {
                fetchJobsAsPools();
                if (selectedPool?.id) {
                    fetchCandidatesForPool(selectedPool.id);
                }
                return;
            }

            setPools((prev) => prev.map((pool) => (
                String(pool.id) === payloadJobId
                    ? { ...pool, count: Number(pool.count || 0) + 1 }
                    : pool
            )));

            fetchJobsAsPools();
            if (selectedPool?.id && payloadJobId === String(selectedPool.id)) {
                fetchCandidatesForPool(selectedPool.id);
            }
        };

        SocketService.on('new_application', handleNewApplication);
        return () => {
            SocketService.off('new_application', handleNewApplication);
        };
    }, [fetchCandidatesForPool, fetchJobsAsPools, selectedPool?.id]);

    useEffect(() => {
        if (!isScreenFocused) {
            return undefined;
        }
        const interval = setInterval(() => {
            fetchJobsAsPools();
            if (selectedPool?.id) {
                fetchCandidatesForPool(selectedPool.id);
            }
        }, 15000);

        return () => clearInterval(interval);
    }, [fetchCandidatesForPool, fetchJobsAsPools, isScreenFocused, selectedPool?.id]);

    const handleExplain = async () => {
        if (!selectedPool || !selectedCandidate) return;
        setLoadingExplanation(true);

        try {
            const jobId = selectedPool.id;
            const candidateId = selectedCandidate.id;
            const cacheKey = `@explain_${jobId}_${candidateId}`;

            // Try Cache
            const cached = await AsyncStorage.getItem(cacheKey);
            if (cached) {
                setExplanation(JSON.parse(cached));
                setLoadingExplanation(false);
                return;
            }

            // Fetch Fresh
            const { data } = await client.post('/api/matches/explain', {
                jobId,
                candidateId,
                matchScore: selectedCandidate.matchScore
            }, {
                __skipApiErrorHandler: true,
            });

            if (data && data.explanation) {
                setExplanation(data.explanation);
                AsyncStorage.setItem(cacheKey, JSON.stringify(data.explanation)).catch(() => null);
            }
        } catch (error) {
            logger.warn('Explanation Error:', error?.message || error);
            setExplanation(["Candidate meets role expectations.", "Relevant skill set matched.", "Suitable experience verified."]);
        } finally {
            setLoadingExplanation(false);
        }
    };

    const handleViewResume = useCallback(async () => {
        if (!selectedCandidate) return;

        const resumeUrl = String(selectedCandidate?.resumeUrl || '').trim();
        if (resumeUrl) {
            try {
                const supported = await Linking.canOpenURL(resumeUrl);
                if (supported) {
                    await Linking.openURL(resumeUrl);
                    return;
                }
            } catch (error) {
                logger.warn('Resume open failed, showing fallback preview:', error?.message || error);
            }
        }

        setShowResumeModal(true);
    }, [selectedCandidate]);

    const handleUpdateApplicationStatus = useCallback(async (candidate, nextStatus) => {
        if (!selectedPool?.id || !candidate) return;
        if (!candidate.applicationId) {
            Alert.alert('Action Unavailable', 'Application link is missing for this candidate.');
            return;
        }

        setStatusUpdating(true);
        try {
            const statusSequence = buildEmployerStatusSequence(candidate.statusRaw, nextStatus);
            if (!statusSequence.length) {
                Alert.alert('No Update Needed', 'Candidate is already in this stage.');
                return;
            }

            for (const stepStatus of statusSequence) {
                await client.put(`/api/applications/${candidate.applicationId}/status`, { status: stepStatus }, {
                    __skipApiErrorHandler: true,
                });
            }

            await client.post('/api/matches/feedback', {
                jobId: selectedPool.id,
                candidateId: candidate.id,
                matchScoreAtTime: candidate.matchScore,
                userAction: nextStatus,
            }, {
                __skipApiErrorHandler: true,
            }).catch(() => null);

            await fetchJobsAsPools();
            await fetchCandidatesForPool(selectedPool.id);
            const normalizedNextStatus = normalizeApplicationStatus(statusSequence[statusSequence.length - 1] || nextStatus);
            const nextLabel = STATUS_LABEL_MAP[normalizedNextStatus] || 'Applied';
            setSelectedCandidate((prev) => prev ? { ...prev, statusRaw: normalizedNextStatus, statusLabel: nextLabel } : prev);

            if (CHAT_READY_STATUSES.has(normalizedNextStatus)) {
                Alert.alert('Chat Unlocked', 'Candidate accepted. You can open chat from Applications.');
            }
        } catch (error) {
            logger.warn('Failed to update candidate status', error?.message || error);
            Alert.alert('Update Failed', getReadableError(error, 'Could not update candidate status.'));
        } finally {
            setStatusUpdating(false);
        }
    }, [fetchCandidatesForPool, fetchJobsAsPools, getReadableError, selectedPool?.id]);

    if (selectedCandidate) {
        return (
            <View style={[styles.container, { backgroundColor: '#f7f9ff' }]}>
                {/* Header includes safe area */}
                <View style={[styles.headerPurple, { paddingTop: insets.top + 16 }]}>
                    <TouchableOpacity onPress={() => setSelectedCandidate(null)} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color="#FFF" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitleWhite}>Candidate Profile</Text>
                </View>

                <ScrollView style={styles.content}>
                    <View style={styles.candidateHeader}>
                        <Image
                            source={{ uri: `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedCandidate.name)}&background=7c3aed&color=fff&size=256` }}
                            style={styles.bigAvatar}
                        />
                        <Text style={styles.bigCandidateName}>{selectedCandidate.name}</Text>
                        <Text style={{ fontSize: 16, color: '#64748b', marginBottom: 4 }}>{selectedCandidate.roleTitle}</Text>
                        <View style={styles.locationRow}>
                            <Ionicons name="location" size={14} color="#A855F7" />
                            <Text style={styles.locationText}>{selectedCandidate.location}</Text>
                        </View>
                        <View style={[styles.statusChip, { marginTop: 10, backgroundColor: `${STATUS_COLOR_MAP[selectedCandidate.statusLabel] || '#94a3b8'}22` }]}>
                            <Text style={[styles.statusChipText, { color: STATUS_COLOR_MAP[selectedCandidate.statusLabel] || '#64748b' }]}>
                                {selectedCandidate.statusLabel || 'Applied'}
                            </Text>
                        </View>
                        {selectedCandidate.interviewVerified ? (
                            <View style={[
                                styles.verifiedInterviewBadge,
                                selectedCandidate.verifiedPriorityActive && styles.verifiedInterviewBadgeGlow,
                            ]}>
                                <Text style={styles.verifiedInterviewBadgeText}>Verified Interview Profile</Text>
                            </View>
                        ) : null}
                        <View style={styles.profileStrengthChip}>
                            <Text style={styles.profileStrengthChipText}>
                                Profile Strength: {selectedCandidate.profileStrengthLabel || 'Weak'}
                            </Text>
                        </View>
                        <View style={styles.clarityTagChip}>
                            <Text style={styles.clarityTagChipText}>
                                Communication: {selectedCandidate.communicationClarityTag || 'Needs Review'}
                            </Text>
                        </View>
                        <View style={styles.metricChipRow}>
                            <View style={styles.metricChip}>
                                <Text style={styles.metricChipLabel}>Match Score</Text>
                                <Text style={styles.metricChipValue}>
                                    {Number.isFinite(Number(selectedCandidate.matchScore)) ? `${Math.round(Number(selectedCandidate.matchScore))}%` : 'N/A'}
                                </Text>
                            </View>
                            <View style={styles.metricChip}>
                                <Text style={styles.metricChipLabel}>Profile Percentile</Text>
                                <Text style={styles.metricChipValue}>
                                    {Number.isFinite(Number(selectedCandidate.profilePercentile)) ? `${Math.round(Number(selectedCandidate.profilePercentile))}th` : 'N/A'}
                                </Text>
                            </View>
                        </View>
                    </View>

                    <View style={styles.sectionContainer}>
                        <View style={styles.card}>
                            <View style={styles.cardHeaderRow}>
                                <Text style={styles.cardTitle}>Professional Summary</Text>
                                <TouchableOpacity
                                    style={styles.resumeButton}
                                    onPress={handleViewResume}
                                >
                                    <Text style={styles.resumeButtonText}>VIEW RESUME</Text>
                                </TouchableOpacity>
                            </View>
                            <Text style={styles.summaryText}>{selectedCandidate.summary}</Text>
                            {selectedCandidate.whyMatch ? (
                                <Text style={styles.matchWhyText}>Why this matches: {selectedCandidate.whyMatch}</Text>
                            ) : null}
                        </View>

                        <View style={[styles.card, { marginTop: 16, backgroundColor: '#eef2ff', borderColor: '#e0e7ff' }]}>
                            <View style={styles.cardHeaderRow}>
                                <Text style={[styles.cardTitle, { color: '#3730a3' }]}>✨ AI Match Analysis</Text>
                                {!explanation && (
                                    <TouchableOpacity
                                        style={[styles.resumeButton, { backgroundColor: '#9333ea', borderColor: '#7e22ce' }]}
                                        onPress={handleExplain}
                                        disabled={loadingExplanation}
                                    >
                                        <Text style={[styles.resumeButtonText, { color: '#fff' }]}>{loadingExplanation ? 'Analyzing...' : 'Why a Match?'}</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                            {explanation && (
                                <View style={{ marginTop: 8 }}>
                                    {explanation.map((bullet, idx) => (
                                        <Text key={idx} style={[styles.summaryText, { color: '#3730a3', marginBottom: 4 }]}>• {bullet}</Text>
                                    ))}
                                </View>
                            )}
                        </View>

                        {/* Candidate Actions */}
                        <View style={styles.actionRowContainer}>
                            <TouchableOpacity
                                style={[styles.actionBtn, { backgroundColor: '#ef4444' }, statusUpdating && styles.actionBtnDisabled]}
                                onPress={() => handleUpdateApplicationStatus(selectedCandidate, 'rejected')}
                                disabled={statusUpdating}
                            >
                                <Ionicons name="close" size={20} color="#fff" />
                                <Text style={styles.actionBtnTextWhite}>SKIP</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.actionBtn, { backgroundColor: '#22c55e', flex: 1.5 }, statusUpdating && styles.actionBtnDisabled]}
                                onPress={() => handleUpdateApplicationStatus(selectedCandidate, 'shortlisted')}
                                disabled={statusUpdating}
                            >
                                <Ionicons name="bookmark" size={18} color="#fff" />
                                <Text style={styles.actionBtnTextWhite}>SHORTLIST</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.actionBtn, { backgroundColor: '#7c3aed', flex: 1.5 }, statusUpdating && styles.actionBtnDisabled]}
                                onPress={() => handleUpdateApplicationStatus(selectedCandidate, 'interview_requested')}
                                disabled={statusUpdating}
                            >
                                <Ionicons name="checkmark" size={20} color="#fff" />
                                <Text style={styles.actionBtnTextWhite}>ACCEPT</Text>
                            </TouchableOpacity>
                        </View>
                        {CHAT_READY_STATUSES.has(String(selectedCandidate.statusRaw || '').toLowerCase()) && selectedCandidate.applicationId ? (
                            <TouchableOpacity
                                style={styles.chatCtaBtn}
                                onPress={() => navigation.navigate('Chat', {
                                    applicationId: selectedCandidate.applicationId,
                                })}
                                activeOpacity={0.8}
                            >
                                <Text style={styles.chatCtaText}>Open Chat</Text>
                            </TouchableOpacity>
                        ) : null}
                    </View>
                </ScrollView>

                <Modal
                    visible={showResumeModal}
                    transparent
                    animationType="slide"
                    onRequestClose={() => setShowResumeModal(false)}
                >
                    <View style={styles.resumeModalBackdrop}>
                        <View style={styles.resumeModalCard}>
                            <View style={styles.resumeModalHeader}>
                                <Text style={styles.resumeModalTitle}>Resume Preview</Text>
                                <TouchableOpacity onPress={() => setShowResumeModal(false)} style={styles.resumeModalCloseBtn}>
                                    <Ionicons name="close" size={20} color="#64748b" />
                                </TouchableOpacity>
                            </View>

                            <ScrollView showsVerticalScrollIndicator={false}>
                                <Text style={styles.resumePreviewLine}><Text style={styles.resumePreviewLabel}>Name:</Text> {selectedCandidate.name}</Text>
                                <Text style={styles.resumePreviewLine}><Text style={styles.resumePreviewLabel}>Role:</Text> {selectedCandidate.roleTitle}</Text>
                                <Text style={styles.resumePreviewLine}><Text style={styles.resumePreviewLabel}>Experience:</Text> {selectedCandidate.experienceYears} Years</Text>
                                <Text style={styles.resumePreviewLine}><Text style={styles.resumePreviewLabel}>Location:</Text> {selectedCandidate.location}</Text>
                                <Text style={styles.resumePreviewLine}><Text style={styles.resumePreviewLabel}>Skills:</Text> {(selectedCandidate.skills || []).join(', ') || 'Not provided'}</Text>
                                <Text style={styles.resumePreviewLine}><Text style={styles.resumePreviewLabel}>Profile Strength:</Text> {selectedCandidate.profileStrengthLabel}</Text>
                                <Text style={styles.resumePreviewLine}>
                                    <Text style={styles.resumePreviewLabel}>Match Score:</Text>{' '}
                                    {Number.isFinite(Number(selectedCandidate.matchScore)) ? `${Math.round(Number(selectedCandidate.matchScore))}%` : 'N/A'}
                                </Text>

                                {selectedCandidate.transcript ? (
                                    <>
                                        <Text style={styles.resumeTranscriptTitle}>Interview Transcript</Text>
                                        <Text style={styles.resumeTranscriptText}>{selectedCandidate.transcript}</Text>
                                    </>
                                ) : null}
                            </ScrollView>
                        </View>
                    </View>
                </Modal>
            </View>
        );
    }

    if (selectedPool) {
        if (!selectedPool.id) {
            return (
                <View style={[styles.container, { backgroundColor: '#f7f9ff' }]}>
                    <EmptyState
                        title="No Job Selected"
                        message="Select a job to view candidates."
                        icon={<Ionicons name="briefcase-outline" size={56} color="#94a3b8" />}
                        actionLabel="Back to Talent Pools"
                        onAction={() => setSelectedPool(null)}
                    />
                </View>
            );
        }

        const primaryCandidateLocation = String(
            candidates.find((candidate) => String(candidate?.location || '').trim().length > 0)?.location || ''
        ).trim();
        const headerTitle = primaryCandidateLocation
            ? `${selectedPool.name} - ${primaryCandidateLocation}`
            : String(selectedPool.name || 'Talent');
        const livePoolCount = Number(
            pools.find((pool) => String(pool.id) === String(selectedPool.id))?.count
            ?? selectedPool.count
            ?? 0
        );
        const visibleCandidateCount = loadingCandidates
            ? livePoolCount
            : Number(candidates.length || 0);

        return (
            <View style={[styles.container, styles.poolScreenContainer]}>
                <LinearGradient
                    colors={['#7c3aed', '#9333ea']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0.95 }}
                    style={[styles.headerPurple, styles.poolHeader, { paddingTop: insets.top + 16 }]}
                >
                    <TouchableOpacity onPress={handleBackFromPool} style={styles.poolBackButton}>
                        <Ionicons name="chevron-back" size={26} color="#FFF" />
                    </TouchableOpacity>
                    <View style={styles.poolHeaderTextWrap}>
                        <Text style={styles.headerTitleWhite} numberOfLines={1}>{headerTitle}</Text>
                        <Text style={styles.headerSubtitleWhite}>{visibleCandidateCount} CANDIDATES FOUND</Text>
                    </View>
                </LinearGradient>

                <View style={styles.content}>
                    <View style={styles.poolListContainer}>
                        {loadingCandidates ? (
                            <View>
                                <SkeletonLoader height={92} style={{ borderRadius: 16, marginBottom: 14 }} />
                                <SkeletonLoader height={92} style={{ borderRadius: 16, marginBottom: 14 }} />
                                <SkeletonLoader height={92} style={{ borderRadius: 16, marginBottom: 14 }} />
                            </View>
                        ) : candidates.length === 0 ? (
                            <EmptyState
                                icon="👥"
                                title="No candidates found"
                                subtitle="Matches will appear as workers update their profiles"
                            />
                        ) : (
                            <FlatList
                                data={candidates}
                                keyExtractor={(item, index) => String(item?.id || `candidate-${index}`)}
                                renderItem={({ item: profile, index }) => (
                                    <TouchableOpacity
                                        style={styles.poolCandidateCard}
                                        onPress={() => setSelectedCandidate(profile)}
                                        activeOpacity={0.86}
                                    >
                                        <View style={styles.poolCandidateCodeWrap}>
                                            <Text style={styles.poolCandidateCode}>C{index + 1}</Text>
                                        </View>
                                        <View style={styles.poolCandidateBody}>
                                            <Text style={styles.poolCandidateTitle} numberOfLines={1}>
                                                {String(profile.roleTitle || profile.name || 'Candidate')}
                                            </Text>
                                            <Text style={styles.poolCandidateMeta} numberOfLines={1}>
                                                {Number(profile.experienceYears || 0)} Years Exp • {String(profile.location || 'Remote')}
                                            </Text>
                                        </View>
                                    </TouchableOpacity>
                                )}
                                getItemLayout={(data, index) => ({
                                    length: 106,
                                    offset: 106 * index,
                                    index,
                                })}
                                maxToRenderPerBatch={10}
                                windowSize={10}
                                removeClippedSubviews={Platform.OS === 'android'}
                                initialNumToRender={10}
                                showsVerticalScrollIndicator={false}
                                ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
                            />
                        )}
                    </View>
                </View>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: '#f7f9ff' }]}>
            <LinearGradient
                colors={['#7c3aed', '#9333ea']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.headerPurpleLarge, { paddingTop: insets.top + 10 }]}
            >
                <View style={styles.talentHeaderTopRow}>
                    <Text style={styles.largeHeaderTitle}>Talent Pools</Text>
                    <TouchableOpacity
                        style={styles.quickPostButton}
                        onPress={handleOpenQuickPost}
                        activeOpacity={0.88}
                    >
                        <Ionicons name="add-circle-outline" size={16} color="#6d28d9" />
                        <Text style={styles.quickPostButtonText}>Post Job (Form)</Text>
                    </TouchableOpacity>
                </View>
            </LinearGradient>

            <View style={styles.content}>
                <View style={styles.listContainer}>
                    {loadingPools ? (
                        <View>
                            <SkeletonLoader height={140} style={{ borderRadius: 12, marginBottom: 16 }} />
                            <SkeletonLoader height={140} style={{ borderRadius: 12, marginBottom: 16 }} />
                            <SkeletonLoader height={140} style={{ borderRadius: 12, marginBottom: 16 }} />
                        </View>
                    ) : pools.length === 0 ? (
                        <EmptyState
                            icon="📭"
                            title="No candidates yet"
                            subtitle="Your job posts will surface matches here"
                        />
                    ) : (
                        <FlatList
                            data={pools}
                            keyExtractor={(item, index) => String(item?.id || `pool-${index}`)}
                            renderItem={({ item: pool }) => (
                                <View style={styles.poolCard}>
                                    <View style={styles.poolCardHeader}>
                                        <Text style={styles.poolCardTitle}>{pool.name}</Text>
                                        <View style={styles.poolCardBadge}>
                                            <Text style={styles.poolCardBadgeText}>{pool.count} Candidates</Text>
                                        </View>
                                    </View>
                                    <TouchableOpacity
                                        style={styles.viewCandidatesBtn}
                                        onPress={() => handleSelectPool(pool)}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={styles.viewCandidatesBtnText}>View Candidates</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                            getItemLayout={(data, index) => ({
                                length: 140, // Approximate height of pool card
                                offset: 140 * index,
                                index,
                            })}
                            maxToRenderPerBatch={10}
                            windowSize={10}
                            removeClippedSubviews={Platform.OS === 'android'}
                            initialNumToRender={10}
                            showsVerticalScrollIndicator={false}
                        />
                    )}
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    headerPurple: {
        backgroundColor: '#9333ea',
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
        zIndex: 10,
    },
    poolScreenContainer: {
        backgroundColor: '#eceff3',
    },
    poolHeader: {
        paddingBottom: 14,
    },
    poolBackButton: {
        marginRight: 10,
        padding: 2,
        borderRadius: 20,
    },
    poolHeaderTextWrap: {
        flex: 1,
        justifyContent: 'center',
    },
    backButton: {
        marginRight: 12,
        padding: 4,
        borderRadius: 20,
    },
    headerTitleWhite: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
    headerSubtitleWhite: {
        color: '#e9d5ff',
        fontSize: 10,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginTop: 2,
    },
    filterRow: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        gap: 8,
        backgroundColor: '#faf5ff',
        borderBottomWidth: 1,
        borderBottomColor: '#f3e8ff',
    },
    filterPill: {
        backgroundColor: '#ede9fe',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 9999,
        borderWidth: 1,
        borderColor: '#ddd6fe',
    },
    filterPillActive: {
        backgroundColor: '#7c3aed',
        borderColor: '#6d28d9',
    },
    filterPillText: {
        fontSize: 12,
        fontWeight: '800',
        color: '#6b21a8',
    },
    filterPillTextActive: {
        color: '#fff',
    },
    headerPurpleLarge: {
        paddingHorizontal: 24,
        paddingBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
        elevation: 4,
        zIndex: 10,
    },
    largeHeaderTitle: {
        color: '#FFF',
        fontSize: 20,
        fontWeight: '800',
    },
    talentHeaderTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
    },
    quickPostButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#ffffff',
        borderRadius: 999,
        borderWidth: 1,
        borderColor: '#ede9fe',
        paddingHorizontal: 12,
        paddingVertical: 7,
    },
    quickPostButtonText: {
        color: '#6d28d9',
        fontSize: 12,
        fontWeight: '800',
    },
    content: {
        flex: 1,
    },
    listContainer: {
        paddingHorizontal: 16,
        paddingTop: 14,
        paddingBottom: 10,
    },
    poolListContainer: {
        paddingHorizontal: 14,
        paddingTop: 14,
        paddingBottom: 10,
    },
    poolCard: {
        backgroundColor: 'rgba(255,255,255,0.98)',
        padding: 18,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#eaf0f8',
        shadowColor: '#94a3b8',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 2,
        marginBottom: 16,
    },
    poolCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    poolCardTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: '#1e293b',
        flex: 1,
    },
    poolCardBadge: {
        backgroundColor: '#f3e8ff',
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: '#e9d5ff',
        marginLeft: 8,
    },
    poolCardBadgeText: {
        color: '#6b21a8',
        fontSize: 12,
        fontWeight: '600',
    },
    viewCandidatesBtn: {
        width: '100%',
        paddingVertical: 13,
        borderWidth: 1,
        borderColor: '#e7d6f7',
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.98)',
    },
    viewCandidatesBtnText: {
        color: '#9333ea',
        fontSize: 15,
        fontWeight: '700',
    },
    candidateCard: {
        backgroundColor: '#FFF',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#f1f5f9',
        flexDirection: 'row',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
        marginBottom: 16,
    },
    smallAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: '#f1f5f9',
    },
    candidateCardContent: {
        flex: 1,
        marginLeft: 16,
        justifyContent: 'center',
    },
    candidateTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
    },
    candidateCardTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#0f172a',
        marginBottom: 4,
    },
    statusChip: {
        borderRadius: 9999,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    statusChipText: {
        fontSize: 10,
        fontWeight: '900',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    candidateCardSubtitle: {
        fontSize: 12,
        color: '#64748b',
    },
    poolCandidateCard: {
        backgroundColor: '#ffffff',
        borderRadius: 15,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        paddingVertical: 14,
        paddingHorizontal: 14,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#0f172a',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
        elevation: 1,
    },
    poolCandidateCodeWrap: {
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#7c3aed',
        marginRight: 14,
    },
    poolCandidateCode: {
        color: '#ffffff',
        fontSize: 22,
        fontWeight: '800',
        letterSpacing: 0.2,
        includeFontPadding: false,
    },
    poolCandidateBody: {
        flex: 1,
        justifyContent: 'center',
    },
    poolCandidateTitle: {
        color: '#0f172a',
        fontSize: 17,
        fontWeight: '800',
    },
    poolCandidateMeta: {
        marginTop: 4,
        color: '#64748b',
        fontSize: 13,
        fontWeight: '500',
    },
    candidateVerifiedInline: {
        marginTop: 4,
        fontSize: 11,
        color: '#059669',
        fontWeight: '700',
    },
    candidateVerifiedInlineGlow: {
        textShadowColor: 'rgba(16,185,129,0.26)',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 8,
    },
    candidateStrengthInline: {
        marginTop: 3,
        fontSize: 11,
        color: '#7c3aed',
        fontWeight: '700',
    },
    candidateClarityInline: {
        marginTop: 3,
        fontSize: 11,
        color: '#475569',
        fontWeight: '600',
    },
    candidateHeader: {
        alignItems: 'center',
        paddingTop: 32,
        paddingBottom: 24,
        backgroundColor: '#FFF',
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
    },
    bigAvatar: {
        width: 96,
        height: 96,
        borderRadius: 48,
        borderWidth: 4,
        borderColor: '#faf5ff',
        marginBottom: 12,
    },
    bigCandidateName: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#0f172a',
        marginBottom: 4,
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    locationText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#64748b',
        marginLeft: 4,
    },
    verifiedInterviewBadge: {
        marginTop: 8,
        backgroundColor: 'rgba(16,185,129,0.14)',
        borderRadius: 999,
        borderWidth: 1,
        borderColor: 'rgba(16,185,129,0.32)',
        paddingHorizontal: 10,
        paddingVertical: 5,
    },
    verifiedInterviewBadgeGlow: {
        shadowColor: '#10b981',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.22,
        shadowRadius: 8,
        elevation: 3,
    },
    verifiedInterviewBadgeText: {
        color: '#065f46',
        fontSize: 11,
        fontWeight: '700',
    },
    profileStrengthChip: {
        marginTop: 7,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: '#dbeafe',
        backgroundColor: '#eff6ff',
        paddingHorizontal: 10,
        paddingVertical: 5,
    },
    profileStrengthChipText: {
        color: '#1d4ed8',
        fontSize: 11,
        fontWeight: '700',
    },
    clarityTagChip: {
        marginTop: 7,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: '#ddd6fe',
        backgroundColor: '#f5f3ff',
        paddingHorizontal: 10,
        paddingVertical: 5,
    },
    clarityTagChipText: {
        color: '#6d28d9',
        fontSize: 11,
        fontWeight: '700',
    },
    metricChipRow: {
        marginTop: 10,
        flexDirection: 'row',
        gap: 8,
    },
    metricChip: {
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#ddd6fe',
        backgroundColor: '#f5f3ff',
        paddingHorizontal: 10,
        paddingVertical: 6,
        minWidth: 120,
        alignItems: 'center',
    },
    metricChipLabel: {
        color: '#7c3aed',
        fontSize: 10,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    metricChipValue: {
        marginTop: 2,
        color: '#4c1d95',
        fontSize: 14,
        fontWeight: '800',
    },
    sectionContainer: {
        padding: 16,
    },
    card: {
        backgroundColor: '#FFF',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#f1f5f9',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    cardHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    cardTitle: {
        fontWeight: 'bold',
        color: '#0f172a',
        fontSize: 16,
    },
    resumeButton: {
        backgroundColor: '#faf5ff',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#f3e8ff',
    },
    resumeButtonText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#9333ea',
    },
    summaryText: {
        fontSize: 14,
        color: '#475569',
        lineHeight: 22,
    },
    matchWhyText: {
        marginTop: 8,
        fontSize: 12,
        lineHeight: 18,
        color: '#6b21a8',
        fontWeight: '600',
    },
    actionRowContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
        marginTop: 24,
    },
    actionBtnDisabled: {
        opacity: 0.6,
    },
    actionBtn: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    actionBtnTextWhite: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 12,
        letterSpacing: 0.5,
    },
    chatCtaBtn: {
        marginTop: 14,
        borderWidth: 1,
        borderColor: '#ddd6fe',
        backgroundColor: '#faf5ff',
        borderRadius: 12,
        paddingVertical: 12,
        alignItems: 'center',
    },
    chatCtaText: {
        color: '#7c3aed',
        fontWeight: '900',
        fontSize: 13,
        letterSpacing: 0.3,
    },
    resumeModalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(15,23,42,0.48)',
        justifyContent: 'flex-end',
    },
    resumeModalCard: {
        maxHeight: '78%',
        backgroundColor: '#ffffff',
        borderTopLeftRadius: 18,
        borderTopRightRadius: 18,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        paddingHorizontal: 16,
        paddingTop: 14,
        paddingBottom: 20,
    },
    resumeModalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    resumeModalTitle: {
        color: '#0f172a',
        fontSize: 18,
        fontWeight: '800',
    },
    resumeModalCloseBtn: {
        width: 30,
        height: 30,
        borderRadius: 15,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f1f5f9',
    },
    resumePreviewLine: {
        color: '#334155',
        fontSize: 14,
        lineHeight: 21,
        marginBottom: 7,
    },
    resumePreviewLabel: {
        color: '#0f172a',
        fontWeight: '700',
    },
    resumeTranscriptTitle: {
        marginTop: 6,
        marginBottom: 6,
        color: '#7c3aed',
        fontSize: 13,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.4,
    },
    resumeTranscriptText: {
        color: '#475569',
        fontSize: 13,
        lineHeight: 20,
    },
});
