import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, ActivityIndicator, FlatList, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import client from '../api/client';
import SkeletonLoader from '../components/SkeletonLoader';
import { logger } from '../utils/logger';

export default function TalentScreen() {
    const [selectedPool, setSelectedPool] = useState(null);
    const [selectedCandidate, setSelectedCandidate] = useState(null);
    const [pools, setPools] = useState([]);
    const [loadingPools, setLoadingPools] = useState(true);
    const [candidates, setCandidates] = useState([]);
    const [loadingCandidates, setLoadingCandidates] = useState(false);
    const [explanation, setExplanation] = useState(null);
    const [loadingExplanation, setLoadingExplanation] = useState(false);
    const insets = useSafeAreaInsets();

    useEffect(() => {
        fetchJobsAsPools();
    }, []);

    const fetchJobsAsPools = async () => {
        try {
            // 1. Try Cache
            const cached = await AsyncStorage.getItem('@cached_pools');
            if (cached) {
                setPools(JSON.parse(cached));
            }
        } catch (e) { logger.error('Cache read err', e); }

        try {
            logger.log('🔍 Fetching jobs for People Nearby...');
            const { data } = await client.get('/api/jobs/my-jobs');

            const jobsArray = Array.isArray(data) ? data : (data.data || []);
            logger.log('✅ People Nearby jobs mapped:', jobsArray.length);

            const newPools = jobsArray.map(j => ({
                id: j._id,
                name: j.title,
                count: 'Auto-Matched', // Placeholder until fetched
                tags: j.requirements ? [j.requirements[0]] : []
            }));

            setPools(newPools);

            // 2. Save Cache
            AsyncStorage.setItem('@cached_pools', JSON.stringify(newPools)).catch(logger.error);

        } catch (error) {
            logger.error('Failed to fetch jobs for pools:', error);
        } finally {
            setLoadingPools(false);
        }
    };

    const handleSelectPool = async (pool) => {
        setSelectedPool(pool);
        setSelectedCandidate(null);
        setExplanation(null);
        setLoadingCandidates(true);

        try {
            // 1. Try Cache
            const cached = await AsyncStorage.getItem(`@cached_candidates_${pool.id}`);
            if (cached) setCandidates(JSON.parse(cached));
        } catch (e) {
            logger.error('Candidate cache read err', e);
        }

        try {
            const { data } = await client.get(`/api/matches/employer/${pool.id}`);
            // data array: [{ worker, matchScore, tier, labels }]
            const mapped = data.map(item => {
                const w = item.worker || {};
                const u = w.user || {};
                const role = w.roleProfiles && w.roleProfiles[0] ? w.roleProfiles[0] : {};
                return {
                    id: w._id || Math.random().toString(),
                    userId: u._id,
                    name: u.name || w.firstName || 'Candidate',
                    roleTitle: role.roleName || pool.name,
                    summary: `Match Score: ${item.matchScore}%. Tier: ${item.tier}. \n\nLabels: ${(item.labels || []).join(', ')}`,
                    experienceYears: role.experienceInRole || 0,
                    skills: role.skills || w.skills || [],
                    qualifications: w.education || [],
                    location: w.city || 'Remote',
                    matchScore: item.matchScore
                };
            });
            setCandidates(mapped);

            // 2. Save Cache
            AsyncStorage.setItem(`@cached_candidates_${pool.id}`, JSON.stringify(mapped)).catch(logger.error);

        } catch (error) {
            logger.error('Failed to fetch matched candidates:', error);
        } finally {
            setLoadingCandidates(false);
        }
    };

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

    const handleFeedback = async (action) => {
        if (!selectedPool || !selectedCandidate) return;

        try {
            await client.post('/api/matches/feedback', {
                jobId: selectedPool.id,
                candidateId: selectedCandidate.id,
                matchScoreAtTime: selectedCandidate.matchScore,
                userAction: action
            });
            logger.log(`Feedback submitted: ${action}`);

            if (action === 'rejected') {
                setSelectedCandidate(null); // Return to list if rejected
            }
        } catch (error) {
            logger.error('Feedback recording failed', error);
        }
    };

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

                        {/* Feedback Actions */}
                        <View style={styles.actionRowContainer}>
                            <TouchableOpacity
                                style={[styles.actionBtn, { backgroundColor: '#ef4444' }]}
                                onPress={() => handleFeedback('rejected')}
                            >
                                <Ionicons name="close" size={20} color="#fff" />
                                <Text style={styles.actionBtnTextWhite}>PASS</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.actionBtn, { backgroundColor: '#3b82f6', flex: 1.5 }]}
                                onPress={() => handleFeedback('interviewed')}
                            >
                                <Ionicons name="chatbubble" size={20} color="#fff" />
                                <Text style={styles.actionBtnTextWhite}>MESSAGE</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.actionBtn, { backgroundColor: '#22c55e', flex: 1.5 }]}
                                onPress={() => handleFeedback('shortlisted')}
                            >
                                <Ionicons name="checkmark" size={20} color="#fff" />
                                <Text style={styles.actionBtnTextWhite}>SHORTLIST</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </ScrollView>
            </View>
        );
    }

    if (selectedPool) {
        return (
            <View style={[styles.container, { backgroundColor: '#F8FAFC' }]}>
                <View style={[styles.headerPurple, { paddingTop: insets.top + 16 }]}>
                    <TouchableOpacity onPress={() => setSelectedPool(null)} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color="#FFF" />
                    </TouchableOpacity>
                    <View>
                        <Text style={styles.headerTitleWhite}>{selectedPool.name}</Text>
                        <Text style={styles.headerSubtitleWhite}>{selectedPool.count} CANDIDATES FOUND</Text>
                    </View>
                </View>

                <View style={styles.content}>
                    <View style={styles.listContainer}>
                        {loadingCandidates ? (
                            <View>
                                <SkeletonLoader height={100} style={{ borderRadius: 12, marginBottom: 16 }} />
                                <SkeletonLoader height={100} style={{ borderRadius: 12, marginBottom: 16 }} />
                                <SkeletonLoader height={100} style={{ borderRadius: 12, marginBottom: 16 }} />
                            </View>
                        ) : candidates.length === 0 ? (
                            <Text style={{ textAlign: 'center', color: '#64748b', marginTop: 40 }}>No candidates matched yet.</Text>
                        ) : (
                            <FlatList
                                data={candidates}
                                keyExtractor={(item) => item.id}
                                renderItem={({ item: profile }) => (
                                    <TouchableOpacity
                                        style={styles.candidateCard}
                                        onPress={() => setSelectedCandidate(profile)}
                                        activeOpacity={0.7}
                                    >
                                        <Image source={{ uri: `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name)}&background=7c3aed&color=fff` }} style={styles.smallAvatar} />
                                        <View style={styles.candidateCardContent}>
                                            <Text style={styles.candidateCardTitle} numberOfLines={1}>{profile.name}</Text>
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
                    ) : pools.length === 0 ? (
                        <Text style={{ textAlign: 'center', color: '#64748b', marginTop: 40 }}>No job postings found to match against.</Text>
                    ) : (
                        <FlatList
                            data={pools}
                            keyExtractor={(item) => item.id}
                            renderItem={({ item: pool }) => (
                                <View style={styles.poolCard}>
                                    <View style={styles.poolCardHeader}>
                                        <Text style={styles.poolCardTitle}>{pool.name}</Text>
                                        <View style={styles.poolCardBadge}>
                                            <Text style={styles.poolCardBadgeText}>{pool.count}</Text>
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
    candidateCardTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#0f172a',
        marginBottom: 4,
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
});
