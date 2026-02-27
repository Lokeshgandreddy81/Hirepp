import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, ActivityIndicator, FlatList, Platform, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import client from '../api/client';
import SkeletonLoader from '../components/SkeletonLoader';
import { logger } from '../utils/logger';
import EmptyState from '../components/EmptyState';
import SocketService from '../services/socket';

const STATUS_LABEL_MAP = {
    requested: 'Applied',
    pending: 'Applied',
    shortlisted: 'Shortlisted',
    accepted: 'Accepted',
    rejected: 'Rejected',
    hired: 'Hired',
    offer_proposed: 'Offer Received',
    offer_accepted: 'Offer Accepted',
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

const FILTERS = ['All', 'Shortlisted', 'Accepted'];

export default function TalentScreen({ navigation, route }) {
    const [selectedPool, setSelectedPool] = useState(null);
    const [selectedCandidate, setSelectedCandidate] = useState(null);
    const [pools, setPools] = useState([]);
    const [loadingPools, setLoadingPools] = useState(true);
    const [candidates, setCandidates] = useState([]);
    const [loadingCandidates, setLoadingCandidates] = useState(false);
    const [explanation, setExplanation] = useState(null);
    const [loadingExplanation, setLoadingExplanation] = useState(false);
    const [poolError, setPoolError] = useState('');
    const [candidateError, setCandidateError] = useState('');
    const [statusUpdating, setStatusUpdating] = useState(false);
    const [activeFilter, setActiveFilter] = useState('All');
    const insets = useSafeAreaInsets();

    const getReadableError = (error, fallback) => {
        if (error?.response?.data?.message) return error.response.data.message;
        if (error?.message === 'No internet connection') return 'No internet connection. Please check your network and try again.';
        if (error?.message === 'Network Error') return 'Unable to reach the server. Please try again.';
        if (error?.code === 'ECONNABORTED') return 'Request timed out. Please retry.';
        return fallback;
    };

    const fetchJobsAsPools = useCallback(async () => {
        setLoadingPools(true);
        setPoolError('');
        try {
            // 1. Try Cache
            const cached = await AsyncStorage.getItem('@cached_pools');
            if (cached) {
                setPools(JSON.parse(cached));
            }
        } catch (e) { logger.error('Cache read err', e); }

        try {
            logger.log('🔍 Fetching jobs for People Nearby...');
            const [jobsRes, applicationsRes] = await Promise.all([
                client.get('/api/jobs/my-jobs'),
                client.get('/api/applications'),
            ]);
            const jobsData = jobsRes?.data;
            const jobsArray = Array.isArray(jobsData) ? jobsData : (jobsData?.data || []);
            const appsData = applicationsRes?.data;
            const applications = Array.isArray(appsData) ? appsData : (appsData?.data || []);
            const applicantCountByJobId = applications.reduce((acc, application) => {
                const jobId = String(application?.job?._id || application?.job || '');
                if (!jobId) return acc;
                acc[jobId] = (acc[jobId] || 0) + 1;
                return acc;
            }, {});
            logger.log('✅ People Nearby jobs mapped:', jobsArray.length);

            const newPools = jobsArray.map(j => ({
                id: j._id,
                name: j.title,
                count: applicantCountByJobId[String(j._id)] || 0,
                tags: j.requirements ? [j.requirements[0]] : []
            }));

            setPools(newPools);

            // 2. Save Cache
            AsyncStorage.setItem('@cached_pools', JSON.stringify(newPools)).catch(logger.error);

        } catch (error) {
            logger.error('Failed to fetch jobs for pools:', error);
            setPoolError(getReadableError(error, 'Could not load talent pools right now.'));
        } finally {
            setLoadingPools(false);
        }
    }, []);

    const fetchCandidatesForPool = useCallback(async (poolId) => {
        if (!poolId) {
            setCandidates([]);
            setCandidateError('Select a job to view candidates.');
            return;
        }

        setCandidateError('');
        setLoadingCandidates(true);
        try {
            // 1. Try Cache
            const cached = await AsyncStorage.getItem(`@cached_candidates_${poolId}`);
            if (cached) setCandidates(JSON.parse(cached));
        } catch (e) {
            logger.error('Candidate cache read err', e);
        }

        try {
            const { data } = await client.get(`/api/matches/employer/${poolId}`);
            const matches = Array.isArray(data) ? data : (Array.isArray(data?.matches) ? data.matches : []);
            const mapped = matches.map(item => {
                const w = item.worker || {};
                const u = w.user || {};
                const role = w.roleProfiles && w.roleProfiles[0] ? w.roleProfiles[0] : {};
                const rawStatus = String(item.applicationStatus || item.status || 'pending').toLowerCase();
                const statusLabel = STATUS_LABEL_MAP[rawStatus] || 'Applied';
                return {
                    id: w._id || Math.random().toString(),
                    userId: u._id,
                    name: u.name || w.firstName || 'Candidate',
                    roleTitle: role.roleName || 'Candidate',
                    summary: `Match Score: ${item.matchScore}%. Tier: ${item.tier}. \n\nLabels: ${(item.labels || []).join(', ')}`,
                    experienceYears: role.experienceInRole || 0,
                    skills: role.skills || w.skills || [],
                    qualifications: w.education || [],
                    location: w.city || 'Remote',
                    matchScore: item.matchScore || 0,
                    applicationId: item.applicationId || null,
                    statusRaw: rawStatus,
                    statusLabel,
                };
            });
            setCandidates(mapped);

            // 2. Save Cache
            AsyncStorage.setItem(`@cached_candidates_${poolId}`, JSON.stringify(mapped)).catch(logger.error);

        } catch (error) {
            logger.error('Failed to fetch matched candidates:', error);
            setCandidateError(getReadableError(error, 'Could not load candidates right now.'));
        } finally {
            setLoadingCandidates(false);
        }
    }, []);

    const handleSelectPool = useCallback(async (pool) => {
        setSelectedPool(pool);
        setSelectedCandidate(null);
        setExplanation(null);
        await fetchCandidatesForPool(pool?.id);
    }, [fetchCandidatesForPool]);

    useEffect(() => {
        fetchJobsAsPools();
    }, [fetchJobsAsPools]);

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
            if (selectedPool?.id && payload?.jobId && String(payload.jobId) === String(selectedPool.id)) {
                fetchCandidatesForPool(selectedPool.id);
            }
        };

        SocketService.on('new_application', handleNewApplication);
        return () => {
            SocketService.off('new_application');
        };
    }, [selectedPool?.id, fetchCandidatesForPool]);

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
            });

            if (data && data.explanation) {
                setExplanation(data.explanation);
                AsyncStorage.setItem(cacheKey, JSON.stringify(data.explanation)).catch(logger.error);
            }
        } catch (error) {
            logger.error('Explanation Error:', error);
            setExplanation(["Candidate meets role expectations.", "Relevant skill set matched.", "Suitable experience verified."]);
        } finally {
            setLoadingExplanation(false);
        }
    };

    const handleUpdateApplicationStatus = useCallback(async (candidate, nextStatus) => {
        if (!selectedPool?.id || !candidate) return;
        if (!candidate.applicationId) {
            Alert.alert('Action Unavailable', 'Application link is missing for this candidate.');
            return;
        }

        setStatusUpdating(true);
        try {
            await client.put(`/api/applications/${candidate.applicationId}/status`, { status: nextStatus });
            await client.post('/api/matches/feedback', {
                jobId: selectedPool.id,
                candidateId: candidate.id,
                matchScoreAtTime: candidate.matchScore,
                userAction: nextStatus,
            }).catch(() => null);

            await fetchCandidatesForPool(selectedPool.id);
            const nextLabel = STATUS_LABEL_MAP[nextStatus] || 'Applied';
            setSelectedCandidate((prev) => prev ? { ...prev, statusRaw: nextStatus, statusLabel: nextLabel } : prev);

            if (nextStatus === 'accepted') {
                Alert.alert('Chat Unlocked', 'Candidate accepted. You can open chat from Applications.');
            }
        } catch (error) {
            logger.error('Failed to update candidate status', error);
            Alert.alert('Update Failed', getReadableError(error, 'Could not update candidate status.'));
        } finally {
            setStatusUpdating(false);
        }
    }, [fetchCandidatesForPool, getReadableError, selectedPool?.id]);

    const filteredCandidates = useMemo(() => {
        if (activeFilter === 'All') return candidates;
        return candidates.filter((candidate) => candidate.statusLabel === activeFilter);
    }, [activeFilter, candidates]);

    if (selectedCandidate) {
        return (
            <View style={[styles.container, { backgroundColor: '#F8FAFC' }]}>
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
                        <Text style={{ fontSize: 16, color: '#64748b', marginBottom: 4 }}>{selectedCandidate.roleTitle} Expert</Text>
                        <View style={styles.locationRow}>
                            <Ionicons name="location" size={14} color="#A855F7" />
                            <Text style={styles.locationText}>{selectedCandidate.location}</Text>
                        </View>
                        <View style={[styles.statusChip, { marginTop: 10, backgroundColor: `${STATUS_COLOR_MAP[selectedCandidate.statusLabel] || '#94a3b8'}22` }]}>
                            <Text style={[styles.statusChipText, { color: STATUS_COLOR_MAP[selectedCandidate.statusLabel] || '#64748b' }]}>
                                {selectedCandidate.statusLabel || 'Applied'}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.sectionContainer}>
                        <View style={styles.card}>
                            <View style={styles.cardHeaderRow}>
                                <Text style={styles.cardTitle}>Professional Summary</Text>
                                <TouchableOpacity style={styles.resumeButton}>
                                    <Text style={styles.resumeButtonText}>VIEW RESUME</Text>
                                </TouchableOpacity>
                            </View>
                            <Text style={styles.summaryText}>{selectedCandidate.summary}</Text>
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
                                onPress={() => handleUpdateApplicationStatus(selectedCandidate, 'accepted')}
                                disabled={statusUpdating}
                            >
                                <Ionicons name="checkmark" size={20} color="#fff" />
                                <Text style={styles.actionBtnTextWhite}>ACCEPT</Text>
                            </TouchableOpacity>
                        </View>
                        {selectedCandidate.statusRaw === 'accepted' && selectedCandidate.applicationId ? (
                            <TouchableOpacity
                                style={styles.chatCtaBtn}
                                onPress={() => navigation.navigate('Chat', {
                                    applicationId: selectedCandidate.applicationId,
                                    otherPartyName: selectedCandidate.name,
                                    jobTitle: selectedPool?.name || 'Role',
                                    status: selectedCandidate.statusRaw,
                                })}
                                activeOpacity={0.8}
                            >
                                <Text style={styles.chatCtaText}>Open Chat</Text>
                            </TouchableOpacity>
                        ) : null}
                    </View>
                </ScrollView>
            </View>
        );
    }

    if (selectedPool) {
        if (!selectedPool.id) {
            return (
                <View style={[styles.container, { backgroundColor: '#F8FAFC' }]}>
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

        return (
            <View style={[styles.container, { backgroundColor: '#F8FAFC' }]}>
                <View style={[styles.headerPurple, { paddingTop: insets.top + 16 }]}>
                    <TouchableOpacity onPress={() => setSelectedPool(null)} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color="#FFF" />
                    </TouchableOpacity>
                    <View>
                        <Text style={styles.headerTitleWhite}>{selectedPool.name}</Text>
                        <Text style={styles.headerSubtitleWhite}>{candidates.length} CANDIDATES FOUND</Text>
                    </View>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
                    {FILTERS.map((filter) => (
                        <TouchableOpacity
                            key={filter}
                            style={[styles.filterPill, activeFilter === filter && styles.filterPillActive]}
                            onPress={() => setActiveFilter(filter)}
                        >
                            <Text style={[styles.filterPillText, activeFilter === filter && styles.filterPillTextActive]}>
                                {filter}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                <View style={styles.content}>
                    <View style={styles.listContainer}>
                        {loadingCandidates ? (
                            <View>
                                <SkeletonLoader height={100} style={{ borderRadius: 12, marginBottom: 16 }} />
                                <SkeletonLoader height={100} style={{ borderRadius: 12, marginBottom: 16 }} />
                                <SkeletonLoader height={100} style={{ borderRadius: 12, marginBottom: 16 }} />
                            </View>
                        ) : candidateError ? (
                            <EmptyState
                                title="Could Not Load Candidates"
                                message={candidateError}
                                icon={<Ionicons name="people-outline" size={56} color="#94a3b8" />}
                                actionLabel="Retry"
                                onAction={() => fetchCandidatesForPool(selectedPool.id)}
                            />
                        ) : filteredCandidates.length === 0 ? (
                            <EmptyState
                                title="No Candidates Matched Yet"
                                message="Candidates will appear here when new applications or matches arrive."
                                icon={<Ionicons name="people-outline" size={56} color="#94a3b8" />}
                                actionLabel="Refresh"
                                onAction={() => fetchCandidatesForPool(selectedPool.id)}
                            />
                        ) : (
                            <FlatList
                                data={filteredCandidates}
                                keyExtractor={(item) => item.id}
                                renderItem={({ item: profile }) => (
                                    <TouchableOpacity
                                        style={styles.candidateCard}
                                        onPress={() => setSelectedCandidate(profile)}
                                        activeOpacity={0.7}
                                    >
                                        <Image source={{ uri: `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name)}&background=7c3aed&color=fff` }} style={styles.smallAvatar} />
                                        <View style={styles.candidateCardContent}>
                                            <View style={styles.candidateTitleRow}>
                                                <Text style={styles.candidateCardTitle} numberOfLines={1}>{profile.name}</Text>
                                                <View style={[styles.statusChip, { backgroundColor: `${STATUS_COLOR_MAP[profile.statusLabel] || '#94a3b8'}22` }]}>
                                                    <Text style={[styles.statusChipText, { color: STATUS_COLOR_MAP[profile.statusLabel] || '#64748b' }]}>
                                                        {profile.statusLabel}
                                                    </Text>
                                                </View>
                                            </View>
                                            <Text style={styles.candidateCardSubtitle}>{profile.experienceYears} Years Exp • {profile.location}</Text>
                                            <Text style={{ color: '#7c3aed', fontSize: 12, marginTop: 4, fontWeight: 'bold' }}>{profile.matchScore}% Match</Text>
                                        </View>
                                    </TouchableOpacity>
                                )}
                                getItemLayout={(data, index) => ({
                                    length: 100, // Approximate height of candidate card
                                    offset: 100 * index,
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

    return (
        <View style={[styles.container, { backgroundColor: '#F8FAFC' }]}>
            <View style={[styles.headerPurpleLarge, { paddingTop: insets.top + 24 }]}>
                <Text style={styles.largeHeaderTitle}>People Nearby</Text>
                <Text style={styles.largeHeaderSubtitle}>Organize and track your candidate pipelines</Text>
            </View>

            <View style={styles.content}>
                <View style={styles.listContainer}>
                    {loadingPools ? (
                        <View>
                            <SkeletonLoader height={140} style={{ borderRadius: 12, marginBottom: 16 }} />
                            <SkeletonLoader height={140} style={{ borderRadius: 12, marginBottom: 16 }} />
                            <SkeletonLoader height={140} style={{ borderRadius: 12, marginBottom: 16 }} />
                        </View>
                    ) : poolError ? (
                        <EmptyState
                            title="Could Not Load Talent Pools"
                            message={poolError}
                            icon={<Ionicons name="briefcase-outline" size={56} color="#94a3b8" />}
                            actionLabel="Retry"
                            onAction={fetchJobsAsPools}
                        />
                    ) : pools.length === 0 ? (
                        <EmptyState
                            title="No Job Postings Found"
                            message="Post a job to start receiving candidate matches."
                            icon={<Ionicons name="briefcase-outline" size={56} color="#94a3b8" />}
                            actionLabel="Refresh"
                            onAction={fetchJobsAsPools}
                        />
                    ) : (
                        <FlatList
                            data={pools}
                            keyExtractor={(item) => item.id}
                            renderItem={({ item: pool }) => (
                                <View style={styles.poolCard}>
                                    <View style={styles.poolCardHeader}>
                                        <Text style={styles.poolCardTitle}>{pool.name}</Text>
                                        <View style={styles.poolCardBadge}>
                                            <Text style={styles.poolCardBadgeText}>{pool.count} Applicants</Text>
                                        </View>
                                    </View>
                                    <TouchableOpacity
                                        style={styles.viewCandidatesBtn}
                                        onPress={() => handleSelectPool(pool)}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={styles.viewCandidatesBtnText}>View Matched Candidates</Text>
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
        backgroundColor: '#9333ea',
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
        elevation: 4,
        zIndex: 10,
    },
    largeHeaderTitle: {
        color: '#FFF',
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    largeHeaderSubtitle: {
        color: '#e9d5ff',
        fontSize: 14,
    },
    content: {
        flex: 1,
    },
    listContainer: {
        padding: 16,
    },
    poolCard: {
        backgroundColor: '#FFF',
        padding: 20,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#f1f5f9',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
        marginBottom: 16,
    },
    poolCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    poolCardTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1e293b',
        flex: 1,
    },
    poolCardBadge: {
        backgroundColor: '#f3e8ff',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e9d5ff',
        marginLeft: 8,
    },
    poolCardBadgeText: {
        color: '#6b21a8',
        fontSize: 11,
        fontWeight: 'bold',
    },
    viewCandidatesBtn: {
        width: '100%',
        paddingVertical: 10,
        borderWidth: 1,
        borderColor: '#e9d5ff',
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFF',
    },
    viewCandidatesBtnText: {
        color: '#9333ea',
        fontSize: 14,
        fontWeight: 'bold',
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
});
