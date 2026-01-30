import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { useNavigation } from '@react-navigation/native';
import client from '../api/client';
import Header from '../components/Header';

export default function JobsScreen() {
    const navigation = useNavigation();
    const [matches, setMatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(false);

    const checkRoleAndFetch = async () => {
        try {
            // For workers, this IS the screen.
            // Employer redirect is no longer needed as they have their own tab stack.
            await fetchMatches();
        } catch (e) {
            console.error(e);
            setError(true);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const fetchMatches = async () => {
        try {
            setError(false);
            const { data } = await client.get('/api/matches/candidate');
            setMatches(data || []);
        } catch (err) {
            console.error("Match Fetch Error:", err);
            setError(true);
        }
    };

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            // Re-check role and fetch when screen comes into focus
            setLoading(true);
            checkRoleAndFetch();
        });
        return unsubscribe;
    }, [navigation]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchMatches().then(() => setRefreshing(false));
    }, []);

    const renderMatchItem = ({ item }) => (
        <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('JobDetails', { jobId: item.job._id, matchScore: item.matchScore })}
        >
            <View style={styles.cardHeader}>
                <Text style={styles.jobTitle}>{item.job.title}</Text>
                <View style={[styles.scoreBadge, item.matchScore > 80 ? styles.highScore : styles.midScore]}>
                    <Text style={styles.scoreText}>{item.matchScore}% Match</Text>
                </View>
            </View>
            <Text style={styles.companyName}>{item.job.companyName}</Text>

            <View style={styles.detailsRow}>
                <View style={styles.detailItem}>
                    <Ionicons name="location-outline" size={14} color="#6B7280" />
                    <Text style={styles.detailText}>{item.job.location}</Text>
                </View>
                <View style={styles.detailItem}>
                    <Ionicons name="cash-outline" size={14} color="#6B7280" />
                    <Text style={styles.detailText}>{item.job.salaryRange}</Text>
                </View>
            </View>

            {item.labels && item.labels.length > 0 && (
                <View style={styles.tagsContainer}>
                    {item.labels.map((label, index) => (
                        <View key={index} style={styles.tag}>
                            <Text style={styles.tagText}>{label}</Text>
                        </View>
                    ))}
                </View>
            )}
        </TouchableOpacity>
    );

    // Render Logic
    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <Header title="Jobs" subtitle="Finding your best matches..." />
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color="#7C3AED" />
                    <Text style={styles.loadingText}>Analyzing profile...</Text>
                </View>
            </SafeAreaView>
        );
    }



    if (error) {
        return (
            <SafeAreaView style={styles.container}>
                <Header title="Jobs" subtitle="Explore opportunities" />
                <View style={styles.centerContainer}>
                    <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
                    <Text style={styles.errorText}>Could not load matches</Text>
                    <TouchableOpacity style={styles.retryButton} onPress={() => { setLoading(true); checkRoleAndFetch(); }}>
                        <Text style={styles.retryButtonText}>Retry</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <Header title="My Matches" subtitle="Jobs tailored for you" />
            <FlatList
                data={matches}
                renderItem={renderMatchItem}
                keyExtractor={(item) => item.job._id}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7C3AED" />
                }
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Ionicons name="search-outline" size={64} color="#C4B5FD" />
                        <Text style={styles.emptyTitle}>No matches found</Text>
                        <Text style={styles.emptyText}>Try updating your profile skills.</Text>
                    </View>
                }
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFB' },
    listContent: { padding: 16 },
    card: {
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 16,
        marginBottom: 16,
        shadowColor: '#7C3AED',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
    jobTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937', flex: 1, marginRight: 8 },
    companyName: { fontSize: 14, color: '#6B7280', marginBottom: 12 },

    scoreBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
    highScore: { backgroundColor: '#D1FAE5' },
    midScore: { backgroundColor: '#FEF3C7' },
    scoreText: { fontSize: 12, fontWeight: 'bold', color: '#059669' },

    detailsRow: { flexDirection: 'row', gap: 16, marginBottom: 12 },
    detailItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    detailText: { fontSize: 14, color: '#6B7280' },

    tagsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    tag: { backgroundColor: '#F3F4F6', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    tagText: { fontSize: 12, color: '#4B5563' },

    // States
    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    loadingText: { marginTop: 12, color: '#6B7280' },
    errorText: { marginTop: 12, marginBottom: 16, fontSize: 16, color: '#374151' },
    retryButton: { backgroundColor: '#7C3AED', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
    retryButtonText: { color: '#fff', fontWeight: 'bold' },
    emptyState: { alignItems: 'center', marginTop: 60, padding: 20 },
    emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#4B5563', marginTop: 16 },
    emptyText: { color: '#6B7280', marginTop: 4, textAlign: 'center' }
});
