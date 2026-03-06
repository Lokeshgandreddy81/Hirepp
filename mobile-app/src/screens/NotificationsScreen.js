import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Platform, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import client from '../api/client';
import SkeletonLoader from '../components/SkeletonLoader';
import EmptyState from '../components/EmptyState';
import { validateNotificationsResponse, logValidationError } from '../utils/apiValidator';
import { useAppStore } from '../store/AppStore';
import { logger } from '../utils/logger';

const OBJECT_ID_PATTERN = /^[a-f0-9]{24}$/i;
const normalizeObjectId = (value) => {
    if (!value) return '';
    if (typeof value === 'string') {
        const normalized = value.trim();
        return OBJECT_ID_PATTERN.test(normalized) ? normalized : '';
    }
    if (typeof value === 'object') {
        const nestedId = normalizeObjectId(value._id || value.id || value.$oid || '');
        if (nestedId) return nestedId;
    }
    return '';
};

export default function NotificationsScreen({ navigation }) {
    const { setNotificationsCount, activeChatId, role } = useAppStore();
    const normalizedRole = String(role || '').toLowerCase();
    const isEmployer = normalizedRole === 'employer' || normalizedRole === 'recruiter';
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [clearing, setClearing] = useState(false);
    const [error, setError] = useState('');

    const fetchNotifications = useCallback(async ({ showLoader = true } = {}) => {
        try {
            if (showLoader) {
                setLoading(true);
            } else {
                setRefreshing(true);
            }
            setError('');
            const { data } = await client.get('/api/notifications', { __skipApiErrorHandler: true });
            const validatedNotifications = validateNotificationsResponse(data);
            setNotifications(validatedNotifications);
            const unreadCount = Number(data?.unreadCount);
            if (Number.isFinite(unreadCount)) {
                setNotificationsCount(unreadCount);
            } else {
                setNotificationsCount(validatedNotifications.filter((item) => !item.isRead).length);
            }
        } catch (fetchError) {
            if (fetchError?.name === 'ApiValidationError') {
                logValidationError(fetchError, '/api/notifications');
            }
            setNotifications([]);
            setError('Could not load notifications. Please retry.');
        } finally {
            if (showLoader) {
                setLoading(false);
            } else {
                setRefreshing(false);
            }
        }
    }, [setNotificationsCount]);

    useEffect(() => {
        fetchNotifications({ showLoader: true });
    }, [fetchNotifications]);

    useFocusEffect(useCallback(() => {
        fetchNotifications({ showLoader: false });
    }, [fetchNotifications]));

    const markAsRead = async (id) => {
        try {
            const { data } = await client.put(`/api/notifications/${id}/read`, {}, { __skipApiErrorHandler: true });
            const unreadCount = Number(data?.unreadCount);
            setNotifications(prev => {
                const next = prev.map(n => n._id === id ? { ...n, isRead: true } : n);
                if (Number.isFinite(unreadCount)) {
                    setNotificationsCount(unreadCount);
                } else {
                    setNotificationsCount(next.filter((item) => !item.isRead).length);
                }
                return next;
            });
        } catch (error) {
            logger.warn('Failed to mark notification read:', error?.message || error);
        }
    };

    const markAllRead = async () => {
        try {
            const { data } = await client.put('/api/notifications', {}, { __skipApiErrorHandler: true });
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
            const unreadCount = Number(data?.unreadCount);
            setNotificationsCount(Number.isFinite(unreadCount) ? unreadCount : 0);
        } catch (error) {
            logger.warn('Failed to mark all notifications read:', error?.message || error);
        }
    };

    const clearAll = async () => {
        if (clearing) return;
        setClearing(true);
        // Optimistically clear the UI immediately.
        setNotifications([]);
        setNotificationsCount(0);
        try {
            await client.delete('/api/notifications', { __skipApiErrorHandler: true });
        } catch (error) {
            logger.warn('Failed to clear all notifications:', error?.message || error);
            // Even on failure, keep UI cleared — user intent was clear.
        } finally {
            setClearing(false);
        }
    };

    const handlePress = (item) => {
        if (!item.isRead) markAsRead(item._id);

        if (item.type === 'application_received' && item.relatedData?.jobId) {
            navigation.navigate('MainTab', { screen: isEmployer ? 'My Jobs' : 'Applications' });
        } else if (['status_update', 'application_accepted', 'offer_update', 'interview_schedule'].includes(item.type)) {
            navigation.navigate('MainTab', { screen: 'Applications' });
        } else if (item.type === 'message_received') {
            const applicationId = normalizeObjectId(
                item?.relatedData?.applicationId
                || item?.relatedData?.chatId
                || item?.applicationId
            );
            if (applicationId) {
                if (String(activeChatId) === String(applicationId)) {
                    return;
                }
                navigation.navigate('Chat', { applicationId });
            }
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
                <View style={styles.headerActions}>
                    {notifications.some(n => !n.isRead) && (
                        <TouchableOpacity onPress={markAllRead} style={styles.headerBtn}>
                            <Text style={styles.markAllText}>Mark all read</Text>
                        </TouchableOpacity>
                    )}
                    {notifications.length > 0 && (
                        <TouchableOpacity onPress={clearAll} disabled={clearing} style={styles.headerBtn}>
                            <Ionicons name="trash-outline" size={20} color={clearing ? '#cbd5e1' : '#ef4444'} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {error ? (
                <EmptyState
                    title="Couldn’t load data"
                    subtitle="Pull down to refresh."
                    icon="⚠️"
                    actionLabel="Retry"
                    onAction={fetchNotifications}
                />
            ) : notifications.length === 0 ? (
                <EmptyState
                    icon="🔔"
                    title="You’re all caught up"
                    subtitle="Notifications appear here when there’s activity"
                />
            ) : (
                <FlatList
                    data={notifications}
                    keyExtractor={(item, index) => String(item?._id || `notification-${index}`)}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={() => fetchNotifications({ showLoader: false })}
                            tintColor="#7c3aed"
                        />
                    }
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
