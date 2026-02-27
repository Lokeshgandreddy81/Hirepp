import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import client from '../api/client';
import SkeletonLoader from '../components/SkeletonLoader';
import EmptyState from '../components/EmptyState';
import { logger } from '../utils/logger';

export default function NotificationsScreen({ navigation }) {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchNotifications();
    }, []);

    const fetchNotifications = async () => {
        try {
            setLoading(true);
            setError('');
            const { data } = await client.get('/api/notifications');
            setNotifications(data.notifications || []);
        } catch (error) {
            setError('Could not load notifications');
            logger.error('Failed to fetch notifications:', error);
        } finally {
            setLoading(false);
        }
    };

    const markAsRead = async (id) => {
        try {
            await client.put(`/api/notifications/${id}/read`);
            setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
        } catch (error) {
            logger.error('Failed to mark read:', error);
        }
    };

    const markAllRead = async () => {
        try {
            await client.put('/api/notifications');
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        } catch (error) {
            logger.error('Failed to mark all read:', error);
        }
    };

    const handlePress = (item) => {
        if (!item.isRead) markAsRead(item._id);

        if (item.type === 'application_received' && item.relatedData?.jobId) {
            navigation.navigate('EmployerDashboard'); // Simple redirect for MVP
        } else if (item.type === 'status_update') {
            navigation.navigate('Applications'); // Redirect applicant
        } else if (item.type === 'message_received' && item.relatedData?.chatId) {
            navigation.navigate('Chat', { chatId: item.relatedData.chatId });
        }
    };

    const getIcon = (type) => {
        switch (type) {
            case 'match_found': return { name: 'sparkles', color: '#a855f7' };
            case 'application_received': return { name: 'document-text', color: '#3b82f6' };
            case 'message_received': return { name: 'chatbubble', color: '#22c55e' };
            case 'status_update': return { name: 'information-circle', color: '#f59e0b' };
            default: return { name: 'notifications', color: '#64748b' };
        }
    };

    const renderItem = ({ item }) => {
        const iconConfig = getIcon(item.type);
        return (
            <TouchableOpacity
                style={[styles.notifCard, !item.isRead && styles.notifCardUnread]}
                onPress={() => handlePress(item)}
                activeOpacity={0.7}
            >
                <View style={[styles.iconBox, { backgroundColor: iconConfig.color + '20' }]}>
                    <Ionicons name={iconConfig.name} size={20} color={iconConfig.color} />
                </View>
                <View style={styles.notifContent}>
                    <View style={styles.titleRow}>
                        <Text style={[styles.notifTitle, !item.isRead && styles.textUnread]}>
                            {item.title}
                        </Text>
                        <Text style={styles.notifTime}>
                            {new Date(item.createdAt).toLocaleDateString()}
                        </Text>
                    </View>
                    <Text style={[styles.notifMessage, !item.isRead && styles.textUnread]} numberOfLines={2}>
                        {item.message}
                    </Text>
                </View>
                {!item.isRead && <View style={styles.unreadDot} />}
            </TouchableOpacity>
        );
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container} edges={['top']}>
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Notifications</Text>
                </View>
                <View style={{ padding: 16 }}>
                    <SkeletonLoader height={80} style={{ borderRadius: 12, marginBottom: 12 }} />
                    <SkeletonLoader height={80} style={{ borderRadius: 12, marginBottom: 12 }} />
                    <SkeletonLoader height={80} style={{ borderRadius: 12, marginBottom: 12 }} />
                    <SkeletonLoader height={80} style={{ borderRadius: 12, marginBottom: 12 }} />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Notifications</Text>
                {notifications.some(n => !n.isRead) && (
                    <TouchableOpacity onPress={markAllRead}>
                        <Text style={styles.markAllText}>Mark all read</Text>
                    </TouchableOpacity>
                )}
            </View>

            {error ? (
                <EmptyState
                    title="Could Not Load Notifications"
                    message={error}
                    icon={<Ionicons name="warning-outline" size={48} color="#94a3b8" />}
                    actionLabel="Retry"
                    onAction={fetchNotifications}
                />
            ) : notifications.length === 0 ? (
                <View style={styles.emptyState}>
                    <Ionicons name="notifications-off-outline" size={48} color="#cbd5e1" />
                    <Text style={styles.emptyText}>No notifications yet.</Text>
                </View>
            ) : (
                <FlatList
                    data={notifications}
                    keyExtractor={item => item._id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    removeClippedSubviews={Platform.OS === 'android'}
                    maxToRenderPerBatch={10}
                    windowSize={10}
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#0f172a',
    },
    markAllText: {
        color: '#7c3aed',
        fontSize: 14,
        fontWeight: '600',
    },
    listContent: {
        paddingVertical: 12,
    },
    notifCard: {
        flexDirection: 'row',
        padding: 16,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
        alignItems: 'center',
    },
    notifCardUnread: {
        backgroundColor: '#faf5ff',
    },
    iconBox: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    notifContent: {
        flex: 1,
    },
    titleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 4,
    },
    notifTitle: {
        fontSize: 16,
        color: '#334155',
        fontWeight: '500',
        flex: 1,
        marginRight: 8,
    },
    textUnread: {
        color: '#0f172a',
        fontWeight: 'bold',
    },
    notifTime: {
        fontSize: 12,
        color: '#94a3b8',
    },
    notifMessage: {
        fontSize: 14,
        color: '#64748b',
        lineHeight: 20,
    },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#9333ea',
        marginLeft: 12,
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingBottom: '20%',
    },
    emptyText: {
        marginTop: 16,
        color: '#94a3b8',
        fontSize: 16,
    }
});
