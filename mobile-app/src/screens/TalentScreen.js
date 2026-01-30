import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    FlatList,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    Image,
    ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import client from '../api/client';
import Header from '../components/Header';

export default function TalentScreen() {
    const navigation = useNavigation();
    const [jobs, setJobs] = useState([]);
    const [selectedJobId, setSelectedJobId] = useState(null);
    const [matches, setMatches] = useState([]);
    const [loadingJobs, setLoadingJobs] = useState(true);
    const [loadingMatches, setLoadingMatches] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    // 1. Fetch Employer's Jobs to know what to match against
    const fetchJobs = async () => {
        try {
            const response = await client.get('/api/jobs/my-jobs');
            // Backend returns { success: true, count: N, data: [] }
            // So we need response.data.data
            const jobsList = response.data?.data || [];

            if (jobsList && jobsList.length > 0) {
                setJobs(jobsList);
                // If no job selected yet, select the first one
                if (!selectedJobId) {
                    setSelectedJobId(jobsList[0]._id);
                }
            } else {
                setJobs([]);
            }
        } catch (error) {
            console.error("Fetch Jobs Error:", error);
        } finally {
            setLoadingJobs(false);
        }
    };

    // 2. Fetch Matches for the Selected Job
    const fetchMatches = async (jobId) => {
        if (!jobId) return;

        setLoadingMatches(true);
        try {
            const { data } = await client.get(`/api/matches/employer/${jobId}`);
            setMatches(data || []);
        } catch (error) {
            console.error("Fetch Matches Error:", error);
            setMatches([]);
        } finally {
            setLoadingMatches(false);
        }
    };

    // Initial Load
    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            fetchJobs();
        });
        return unsubscribe;
    }, [navigation]);

    // When selectedJobId changes, fetch matches
    useEffect(() => {
        if (selectedJobId) {
            fetchMatches(selectedJobId);
        }
    }, [selectedJobId]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchJobs();
        if (selectedJobId) await fetchMatches(selectedJobId);
        setRefreshing(false);
    }, [selectedJobId]);

    const renderJobPill = ({ item }) => (
        <TouchableOpacity
            style={[styles.jobPill, selectedJobId === item._id && styles.activeJobPill]}
            onPress={() => setSelectedJobId(item._id)}
        >
            <Text style={[styles.jobPillText, selectedJobId === item._id && styles.activeJobPillText]}>
                {item.title}
            </Text>
        </TouchableOpacity>
    );

    const renderCandidateCard = ({ item }) => {
        const { worker, matchScore, labels, tier } = item;
        const profile = worker.roleProfiles?.[0] || {}; // Fallback if multiple logic isn't perfect

        return (
            <TouchableOpacity
                style={styles.card}
            // Navigate to Worker Detail (Future Task)
            // onPress={() => navigation.navigate('CandidateDetail', { workerId: worker._id })}
            >
                <View style={styles.cardHeader}>
                    <View style={styles.avatarContainer}>
                        <Text style={styles.avatarText}>
                            {worker.user?.name?.charAt(0) || worker.firstName?.charAt(0) || 'U'}
                        </Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={styles.candidateName}>
                            {worker.user?.name || worker.firstName}
                        </Text>
                        <Text style={styles.candidateRole}>{profile.roleName || 'Candidate'}</Text>
                    </View>
                    <View style={[styles.scoreBadge, matchScore > 85 ? styles.highScore : styles.midScore]}>
                        <Text style={styles.scoreText}>{matchScore}% Match</Text>
                    </View>
                </View>

                <View style={styles.detailsRow}>
                    <View style={styles.detailItem}>
                        <Ionicons name="location-outline" size={14} color="#6B7280" />
                        <Text style={styles.detailText}>{worker.city}</Text>
                    </View>
                    <View style={styles.detailItem}>
                        <Ionicons name="briefcase-outline" size={14} color="#6B7280" />
                        <Text style={styles.detailText}>{profile.experienceInRole || 0} Yrs</Text>
                    </View>
                    <View style={styles.detailItem}>
                        <Ionicons name="cash-outline" size={14} color="#6B7280" />
                        <Text style={styles.detailText}>₹{profile.expectedSalary?.toLocaleString()}</Text>
                    </View>
                </View>

                {labels && labels.length > 0 && (
                    <View style={styles.tagsContainer}>
                        {labels.map((label, index) => (
                            <View key={index} style={styles.tag}>
                                <Text style={styles.tagText}>{label}</Text>
                            </View>
                        ))}
                    </View>
                )}

                <View style={styles.cardFooter}>
                    <Text style={styles.tierText}>{tier}</Text>
                    <TouchableOpacity style={styles.chatButton}>
                        <Text style={styles.chatButtonText}>Chat</Text>
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        );
    };

    if (loadingJobs) {
        return (
            <SafeAreaView style={styles.container}>
                <Header title="Find Talent" subtitle="Loading jobs..." />
                <ActivityIndicator size="large" color="#7C3AED" style={{ marginTop: 50 }} />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <Header title="Find Talent" subtitle="Best candidates for your roles" />

            {/* Job Selector */}
            {jobs.length > 0 ? (
                <View style={styles.selectorContainer}>
                    <FlatList
                        data={jobs}
                        renderItem={renderJobPill}
                        keyExtractor={item => item._id}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
                    />
                </View>
            ) : (
                <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>Post a job to start seeing matches!</Text>
                </View>
            )}

            {/* Matches List */}
            {jobs.length > 0 && (
                loadingMatches ? (
                    <ActivityIndicator size="large" color="#7C3AED" style={{ marginTop: 40 }} />
                ) : (
                    <FlatList
                        data={matches}
                        renderItem={renderCandidateCard}
                        keyExtractor={(item, index) => item.worker._id + index} // index fallback
                        contentContainerStyle={styles.listContent}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                        ListEmptyComponent={
                            <View style={styles.emptyState}>
                                <Ionicons name="people-outline" size={64} color="#C4B5FD" />
                                <Text style={styles.emptyTitle}>No candidates found</Text>
                                <Text style={styles.emptyText}>We'll notify you when new talent joins.</Text>
                            </View>
                        }
                    />
                )
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFB' },
    selectorContainer: { marginVertical: 12 },
    jobPill: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#E5E7EB',
        marginRight: 8,
    },
    activeJobPill: {
        backgroundColor: '#7C3AED',
    },
    jobPillText: {
        color: '#4B5563',
        fontWeight: '600',
    },
    activeJobPillText: {
        color: '#fff',
    },
    listContent: { padding: 16 },
    card: {
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2
    },
    cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    avatarContainer: {
        width: 48, height: 48, borderRadius: 24, backgroundColor: '#DDD6FE',
        justifyContent: 'center', alignItems: 'center'
    },
    avatarText: { fontSize: 20, fontWeight: 'bold', color: '#7C3AED' },
    candidateName: { fontSize: 16, fontWeight: 'bold', color: '#111827' },
    candidateRole: { fontSize: 14, color: '#6B7280' },
    scoreBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    highScore: { backgroundColor: '#D1FAE5' },
    midScore: { backgroundColor: '#FEF3C7' },
    scoreText: { fontSize: 12, fontWeight: 'bold', color: '#059669' },
    detailsRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
    detailItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    detailText: { fontSize: 13, color: '#4B5563' },
    tagsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
    tag: { backgroundColor: '#F3F4F6', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    tagText: { fontSize: 11, color: '#4B5563' },
    cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTopWidth: 1, borderColor: '#F3F4F6' },
    tierText: { fontSize: 12, fontWeight: 'bold', color: '#7C3AED', fontStyle: 'italic' },
    chatButton: { backgroundColor: '#7C3AED', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20 },
    chatButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
    emptyState: { alignItems: 'center', marginTop: 60, padding: 20 },
    emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#4B5563', marginTop: 16 },
    emptyText: { color: '#6B7280', marginTop: 4, textAlign: 'center' }
});
