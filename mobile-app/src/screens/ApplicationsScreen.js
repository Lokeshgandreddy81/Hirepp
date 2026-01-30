import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Header from '../components/Header';
import client from '../api/client';

export default function ApplicationsScreen({ navigation }) {
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(false);
    const [activeTab, setActiveTab] = useState('requests'); // 'requests' | 'chats'

    const fetchApplications = async () => {
        try {
            setError(false);
            const { data } = await client.get('/api/applications');
            setApplications(data || []);
        } catch (err) {
            console.error(err);
            setError(true);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchApplications();
    }, []);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchApplications();
    }, []);

    const handleStatusUpdate = async (id, status) => {
        try {
            await client.put(`/api/applications/${id}/status`, { status });
            // Optimistic update or refresh
            fetchApplications();
            // If accepted, maybe alert or just move to chats
        } catch (error) {
            alert("Failed to update status");
        }
    };

    // Filter Data
    const requests = applications.filter(app => app.status === 'pending');
    const chats = applications.filter(app => app.status === 'accepted');

    const renderRequestItem = ({ item }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <Text style={styles.jobTitle}>{item.job?.title || 'Unknown Job'}</Text>
                <Text style={styles.date}>{new Date(item.createdAt).toLocaleDateString()}</Text>
            </View>
            <Text style={styles.companyName}>
                {item.employer?.name || 'Unknown Employer'} • {item.job?.companyName || 'Unknown Company'}
            </Text>
            <View style={styles.divider} />
            <Text style={styles.applicantName}>Applicant: {item.worker?.firstName || 'Unknown'}</Text>

            <View style={styles.actionRow}>
                <TouchableOpacity
                    style={[styles.actionButton, styles.rejectButton]}
                    onPress={() => handleStatusUpdate(item._id, 'rejected')}
                >
                    <Text style={styles.rejectText}>Reject</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.actionButton, styles.acceptButton]}
                    onPress={() => handleStatusUpdate(item._id, 'accepted')}
                >
                    <Text style={styles.acceptText}>Accept</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderChatItem = ({ item }) => (
        <TouchableOpacity
            style={styles.chatCard}
            onPress={() => navigation.navigate('Chat', { applicationId: item._id, otherPartyName: item.job?.title })}
        >
            <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                    {(item.job?.title?.[0] || 'C').toUpperCase()}
                </Text>
            </View>
            <View style={styles.chatContent}>
                <View style={styles.chatHeader}>
                    <Text style={styles.chatTitle}>{item.job?.title || 'Job Chat'}</Text>
                    <Text style={styles.chatTime}>{new Date(item.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                </View>
                <Text style={styles.chatPreview} numberOfLines={1}>
                    {item.lastMessage || "Click to start chatting..."}
                </Text>
            </View>
        </TouchableOpacity>
    );

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <Header title="Applications" subtitle="Manage connections" />
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color="#7C3AED" />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <Header title="Applications" subtitle="Manage connections" />

            {/* Tabs */}
            <View style={styles.tabContainer}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'requests' && styles.activeTab]}
                    onPress={() => setActiveTab('requests')}
                >
                    <Text style={[styles.tabText, activeTab === 'requests' && styles.activeTabText]}>
                        Requests ({requests.length})
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'chats' && styles.activeTab]}
                    onPress={() => setActiveTab('chats')}
                >
                    <Text style={[styles.tabText, activeTab === 'chats' && styles.activeTabText]}>
                        Chats ({chats.length})
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Content */}
            <FlatList
                data={activeTab === 'requests' ? requests : chats}
                renderItem={activeTab === 'requests' ? renderRequestItem : renderChatItem}
                keyExtractor={item => item._id}
                contentContainerStyle={styles.listContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7C3AED" />}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Ionicons
                            name={activeTab === 'requests' ? "document-text-outline" : "chatbubbles-outline"}
                            size={64}
                            color="#C4B5FD"
                        />
                        <Text style={styles.emptyText}>
                            {activeTab === 'requests' ? "No pending requests" : "No active chats"}
                        </Text>
                    </View>
                }
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFB' },

    // Tabs
    tabContainer: {
        flexDirection: 'row',
        padding: 4,
        marginHorizontal: 16,
        marginVertical: 8,
        backgroundColor: '#E5E7EB',
        borderRadius: 12,
    },
    tab: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 10,
    },
    activeTab: {
        backgroundColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    tabText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6B7280',
    },
    activeTabText: {
        color: '#7C3AED',
    },

    listContent: { padding: 16 },

    // Request Card
    card: {
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
    jobTitle: { fontWeight: 'bold', fontSize: 16, color: '#1F2937' },
    date: { fontSize: 12, color: '#9CA3AF' },
    companyName: { color: '#6B7280', fontSize: 13, marginBottom: 12 },
    divider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 8 },
    applicantName: { fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 12 },

    actionRow: { flexDirection: 'row', gap: 12 },
    actionButton: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    rejectButton: { backgroundColor: '#FEE2E2' },
    acceptButton: { backgroundColor: '#7C3AED' },
    rejectText: { color: '#EF4444', fontWeight: 'bold' },
    acceptText: { color: '#fff', fontWeight: 'bold' },

    // Chat Card
    chatCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    avatarText: { fontSize: 20, fontWeight: 'bold', color: '#7C3AED' },
    chatContent: { flex: 1 },
    chatHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
    chatTitle: { fontSize: 16, fontWeight: 'bold', color: '#1F2937' },
    chatTime: { fontSize: 12, color: '#9CA3AF' },
    chatPreview: { fontSize: 14, color: '#6B7280' },

    // States
    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyState: { alignItems: 'center', marginTop: 60, gap: 16 },
    emptyText: { color: '#9CA3AF', fontSize: 16, fontWeight: '500' },
});
