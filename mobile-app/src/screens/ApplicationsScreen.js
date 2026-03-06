import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    View,
    Text,
    FlatList,
    StyleSheet,
    TouchableOpacity,
    Image,
    Alert,
    Platform,
    Modal,
    Pressable,
    TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import EmptyState from '../components/EmptyState';
import SkeletonLoader from '../components/SkeletonLoader';
import CelebrationConfetti from '../components/CelebrationConfetti';
import client from '../api/client';
import { validateApplicationsResponse } from '../utils/apiValidator';
import { useAppStore } from '../store/AppStore';

const STATUS_ALIAS_MAP = {
    requested: 'applied',
    pending: 'applied',
    apply: 'applied',
    interview: 'interview_requested',
    accepted: 'offer_accepted',
    offer_proposed: 'offer_sent',
    shortlisted_by_employer: 'shortlisted',
    interview_scheduled: 'interview_requested',
    offered: 'offer_sent',
    hired_candidate: 'hired',
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
    archived: 'Archived',
    withdrawn: 'Rejected',
    expired: 'Rejected',
    offer_declined: 'Rejected',
};

const FILTER_STATUS_GROUPS = {
    All: null,
    Applied: new Set(['applied']),
    Shortlisted: new Set(['shortlisted']),
    Accepted: new Set([
        'accepted',
        'interview_requested',
        'interview_completed',
        'offer_sent',
        'offer_accepted',
    ]),
    Rejected: new Set(['rejected', 'withdrawn', 'expired', 'offer_declined']),
    Hired: new Set(['hired']),
    Archived: new Set(['archived']),
};

const CHAT_READY_STATUSES = new Set(['interview_requested', 'interview_completed', 'offer_sent', 'offer_accepted', 'hired']);
const FILTER_OPTIONS = ['All', 'Applied', 'Shortlisted', 'Accepted', 'Rejected', 'Hired', 'Archived'];

const normalizeStatus = (status) => {
    const normalized = String(status || '').trim().toLowerCase();
    if (!normalized) return 'applied';
    return STATUS_ALIAS_MAP[normalized] || normalized;
};

const mapStatusLabel = (status) => STATUS_LABEL_MAP[normalizeStatus(status)] || 'Applied';

const normalizeSearchText = (value) => (
    String(value || '')
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s]/gu, ' ')
        .replace(/\s+/g, ' ')
        .trim()
);

const normalizeObjectIdLike = (value) => {
    if (!value) return '';

    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (/^[a-f0-9]{24}$/i.test(trimmed)) return trimmed;
        return '';
    }

    if (typeof value === 'object') {
        const direct = String(value?._id || value?.id || value?.$oid || '').trim();
        if (/^[a-f0-9]{24}$/i.test(direct)) return direct;

        const hexFromToString = typeof value?.toString === 'function' ? String(value.toString()).trim() : '';
        if (/^[a-f0-9]{24}$/i.test(hexFromToString)) return hexFromToString;

        const rawBuffer = value?.buffer;
        if (rawBuffer && typeof rawBuffer === 'object') {
            const bytes = [];
            for (let i = 0; i < 12; i += 1) {
                const next = rawBuffer[i] ?? rawBuffer[String(i)];
                const parsed = Number(next);
                if (!Number.isInteger(parsed) || parsed < 0 || parsed > 255) {
                    return '';
                }
                bytes.push(parsed);
            }
            return bytes.map((byte) => byte.toString(16).padStart(2, '0')).join('');
        }
    }

    return '';
};

const formatTimeLabel = (value) => {
    if (!value) return 'Now';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Now';

    const now = new Date();
    const isToday = now.toDateString() === date.toDateString();
    if (isToday) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString();
};

const isProfileRoleGateError = (error) => {
    const status = Number(error?.response?.status || 0);
    return status === 403;
};

export default function ApplicationsScreen({ navigation }) {
    const insets = useSafeAreaInsets();
    const { role } = useAppStore();
    const normalizedRole = String(role || '').toLowerCase();
    const isEmployer = normalizedRole === 'employer' || normalizedRole === 'recruiter';

    const [applications, setApplications] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchDraft, setSearchDraft] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [selectedFilter, setSelectedFilter] = useState('All');
    const [showFilterModal, setShowFilterModal] = useState(false);
    const [showHireConfetti, setShowHireConfetti] = useState(false);
    const mountedRef = useRef(true);
    const hireCelebrationShownRef = useRef(false);
    const searchInputRef = useRef(null);
    const initialLoadCompletedRef = useRef(false);
    const applicationsRef = useRef([]);
    const fetchRequestIdRef = useRef(0);

    const mapApplicationItem = useCallback((item) => {
        const job = item?.job || {};
        const employer = item?.employer || {};
        const worker = item?.worker || {};

        const workerName = [worker?.firstName, worker?.lastName]
            .map((part) => String(part || '').trim())
            .filter(Boolean)
            .join(' ')
            || String(worker?.name || worker?.user?.name || worker?.displayName || 'Candidate').trim();
        const employerName = employer?.companyName || employer?.name || job?.companyName || 'Employer';

        const statusRaw = String(item?.status || '').toLowerCase();
        const statusCanonical = normalizeStatus(statusRaw);
        const statusLabel = mapStatusLabel(statusCanonical);
        const counterpartyName = isEmployer ? workerName : employerName;
        const counterpartyRole = isEmployer
            ? String(worker?.roleProfiles?.[0]?.roleName || worker?.currentRole || worker?.title || '').trim()
            : String(job?.title || item?.jobTitle || '').trim();
        const fallbackPreview = CHAT_READY_STATUSES.has(statusCanonical)
            ? 'Tap to open chat'
            : `Status: ${statusLabel}`;
        const searchText = [
            counterpartyName,
            counterpartyRole,
            job?.title,
            item?.jobTitle,
            employer?.companyName,
            employer?.name,
            worker?.name,
            worker?.firstName,
            worker?.lastName,
            workerName,
            item?.lastMessage,
            statusLabel,
            statusCanonical,
        ]
            .map((value) => String(value || '').trim())
            .filter(Boolean)
            .join(' ');
        const normalizedSearchText = normalizeSearchText(searchText);
        const statusTokens = new Set([
            statusCanonical,
            normalizeStatus(statusRaw),
            normalizeSearchText(statusLabel).replace(/\s+/g, '_'),
            normalizeSearchText(statusLabel),
        ].filter(Boolean));

        return {
            applicationId: normalizeObjectIdLike(item?._id) || normalizeObjectIdLike(item?.id) || '',
            counterpartyName,
            counterpartyRole,
            jobTitle: job?.title || item?.jobTitle || 'Untitled role',
            preview: String(item?.lastMessage || fallbackPreview),
            statusRaw,
            statusCanonical,
            statusLabel,
            timeLabel: formatTimeLabel(item?.updatedAt),
            avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(counterpartyName)}&background=7c3aed&color=fff`,
            isChatReady: CHAT_READY_STATUSES.has(statusCanonical),
            searchText: normalizedSearchText,
            statusTokens,
        };
    }, [isEmployer]);

    const fetchApplications = useCallback(async () => {
        const requestId = fetchRequestIdRef.current + 1;
        fetchRequestIdRef.current = requestId;
        try {
            if (!mountedRef.current) return;
            setError('');
            if (!initialLoadCompletedRef.current && applicationsRef.current.length === 0) {
                setIsLoading(true);
            }

            const { data } = await client.get('/api/applications', {
                __skipApiErrorHandler: true,
                __maxRetries: 0,
                __disableBaseFallback: true,
                timeout: 5500,
                params: {
                    // Load a bigger window so search/filter works across recent app history.
                    limit: 200,
                    includeArchived: true,
                },
            });
            const list = validateApplicationsResponse(data);
            const mapped = list.map(mapApplicationItem).filter((item) => item.applicationId);
            if (mountedRef.current && requestId === fetchRequestIdRef.current) {
                setApplications(mapped);
                if (!hireCelebrationShownRef.current && mapped.some((item) => item.statusCanonical === 'hired')) {
                    hireCelebrationShownRef.current = true;
                    setShowHireConfetti(true);
                }
            }
        } catch (e) {
            if (requestId !== fetchRequestIdRef.current) {
                return;
            }
            if (isProfileRoleGateError(e)) {
                if (mountedRef.current) {
                    setApplications([]);
                    setError('');
                }
                return;
            }
            if (mountedRef.current) {
                if (applicationsRef.current.length === 0) {
                    setApplications([]);
                }
                setError('');
            }
        } finally {
            if (mountedRef.current && requestId === fetchRequestIdRef.current) {
                setIsLoading(false);
                initialLoadCompletedRef.current = true;
            }
        }
    }, [mapApplicationItem]);

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
        };
    }, []);

    useEffect(() => {
        applicationsRef.current = applications;
    }, [applications]);

    useEffect(() => {
        if (!isSearchOpen) return;
        const handle = setTimeout(() => {
            searchInputRef.current?.focus?.();
        }, 60);
        return () => clearTimeout(handle);
    }, [isSearchOpen]);

    useFocusEffect(
        useCallback(() => {
            fetchApplications();
        }, [fetchApplications])
    );

    useEffect(() => {
        fetchApplications();
    }, [fetchApplications]);

    const visibleApplications = useMemo(() => {
        const query = normalizeSearchText(searchQuery);
        return applications.filter((item) => {
            const allowedStatuses = FILTER_STATUS_GROUPS[selectedFilter] || null;
            const itemStatusTokens = item?.statusTokens instanceof Set
                ? item.statusTokens
                : new Set([
                    normalizeStatus(item?.statusCanonical),
                    normalizeStatus(item?.statusRaw),
                ].filter(Boolean));
            const statusPass = !allowedStatuses
                || Array.from(itemStatusTokens).some((token) => allowedStatuses.has(token));
            if (!statusPass) return false;

            if (!query) return true;
            return String(item.searchText || '').includes(query);
        });
    }, [applications, searchQuery, selectedFilter]);
    const hasBlockingError = false;

    const openChat = useCallback((item) => {
        if (!item?.applicationId) {
            Alert.alert('Chat unavailable', 'Missing conversation reference. Please refresh and try again.');
            return;
        }
        navigation.navigate('Chat', { applicationId: item.applicationId });
    }, [navigation]);

    const handleSearchChange = useCallback((value) => {
        const nextValue = String(value || '');
        setSearchDraft(nextValue);
        setSearchQuery(nextValue.trim());
    }, []);

    const clearSearchAndFilters = useCallback(() => {
        setSearchDraft('');
        setSearchQuery('');
        setSelectedFilter('All');
    }, []);

    const clearSearchOnly = useCallback(() => {
        setSearchDraft('');
        setSearchQuery('');
    }, []);
    const openSearch = useCallback(() => {
        setIsSearchOpen(true);
    }, []);
    const closeSearch = useCallback(() => {
        setIsSearchOpen(false);
        setSearchDraft('');
        setSearchQuery('');
    }, []);

    const handleOpenApplication = useCallback((item) => {
        searchInputRef.current?.blur?.();
        openChat(item);
    }, [openChat]);

    const renderItem = ({ item }) => (
        <TouchableOpacity style={styles.row} activeOpacity={0.72} onPress={() => handleOpenApplication(item)}>
            <View style={styles.avatarWrap}>
                <Image source={{ uri: item.avatar }} style={styles.avatar} />
                <View style={styles.avatarStatusDot} />
            </View>

            <View style={styles.rowBody}>
                <View style={styles.rowTop}>
                    <Text style={styles.nameText} numberOfLines={1}>{item.counterpartyName}</Text>
                    <Text style={styles.timeText}>{item.timeLabel}</Text>
                </View>

                <Text style={styles.jobTitleText} numberOfLines={1}>{item.jobTitle}</Text>

                <View style={styles.rowBottom}>
                    <Text style={styles.previewText} numberOfLines={1}>{item.preview}</Text>
                    {item.isChatReady ? (
                        <View style={styles.readyBadge} />
                    ) : (
                        <Text style={styles.statusText}>{item.statusLabel}</Text>
                    )}
                </View>
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <CelebrationConfetti visible={showHireConfetti} onEnd={() => setShowHireConfetti(false)} />
            <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
                <View style={styles.headerTopRow}>
                    <Text style={styles.headerTitle}>Applications</Text>
                    <View style={styles.headerControls}>
                        {isSearchOpen ? (
                            <View style={styles.searchWrap}>
                                <Ionicons name="search" size={18} style={styles.searchIcon} />
                                <TextInput
                                    ref={searchInputRef}
                                    style={styles.searchInput}
                                    value={searchDraft}
                                    onChangeText={handleSearchChange}
                                    placeholder="Search chats"
                                    placeholderTextColor="#94a3b8"
                                    autoCorrect={false}
                                    autoCapitalize="none"
                                    returnKeyType="search"
                                    onSubmitEditing={() => setSearchQuery(String(searchDraft || '').trim())}
                                />
                                <TouchableOpacity
                                    style={styles.searchClearBtn}
                                    onPress={searchDraft ? clearSearchOnly : closeSearch}
                                    activeOpacity={0.8}
                                >
                                    <Ionicons name="close" size={14} color="#64748b" />
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <TouchableOpacity
                                style={styles.searchToggleBtn}
                                onPress={openSearch}
                                activeOpacity={0.85}
                                hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
                            >
                                <Ionicons name="search" size={18} color="#f8fafc" />
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity
                            style={[styles.filterBtn, selectedFilter !== 'All' && styles.filterBtnActive]}
                            onPress={() => setShowFilterModal(true)}
                            activeOpacity={0.8}
                            hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
                        >
                            <Ionicons
                                name="options-outline"
                                size={18}
                                color={selectedFilter !== 'All' ? '#ede9fe' : 'rgba(255,255,255,0.92)'}
                            />
                        </TouchableOpacity>
                    </View>
                </View>
                <Text style={styles.headerSubtitle}>
                    {selectedFilter === 'All' ? 'Active conversations with employers' : `Filter: ${selectedFilter}`}
                </Text>
            </View>

            {isLoading ? (
                <View style={styles.loaderWrap}>
                    <SkeletonLoader height={72} style={styles.skeleton} />
                    <SkeletonLoader height={72} style={styles.skeleton} />
                    <SkeletonLoader height={72} style={styles.skeleton} />
                    <SkeletonLoader height={72} style={styles.skeleton} />
                </View>
            ) : hasBlockingError ? (
                <EmptyState
                    icon="⚠️"
                    title="Couldn’t load data"
                    subtitle="Pull down to refresh."
                    actionLabel="Retry"
                    onAction={fetchApplications}
                />
            ) : (
                <FlatList
                    data={visibleApplications}
                    keyExtractor={(item) => item.applicationId}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="always"
                    keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
                    removeClippedSubviews={Platform.OS === 'android'}
                    maxToRenderPerBatch={12}
                    windowSize={10}
                    initialNumToRender={12}
                    ListEmptyComponent={
                        <EmptyState
                            icon={applications.length > 0 ? '🔎' : (isEmployer ? '📥' : '📋')}
                            title={applications.length > 0 ? 'No results' : (isEmployer ? 'No candidates yet' : 'No applications yet')}
                            subtitle={applications.length > 0
                                ? 'Try clearing search or filters.'
                                : (isEmployer
                                    ? 'Your job posts will surface matches here'
                                    : 'Apply to jobs to start conversations')}
                            actionLabel={applications.length > 0 ? 'Clear Filters' : (isEmployer ? 'Post a Need' : 'Browse Jobs')}
                            onAction={() => {
                                if (applications.length > 0) {
                                    clearSearchAndFilters();
                                    return;
                                }
                                navigation.navigate(isEmployer ? 'My Jobs' : 'Jobs');
                            }}
                        />
                    }
                />
            )}

            <Modal
                visible={showFilterModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowFilterModal(false)}
            >
                <Pressable
                    style={styles.filterOverlay}
                    onPress={() => setShowFilterModal(false)}
                >
                    <Pressable style={styles.filterSheet} onPress={(event) => event.stopPropagation()}>
                        <Text style={styles.filterSheetTitle}>Filter Applications</Text>
                        <TouchableOpacity
                            style={styles.clearFiltersAction}
                            onPress={() => {
                                clearSearchAndFilters();
                                setShowFilterModal(false);
                            }}
                            activeOpacity={0.75}
                        >
                            <Text style={styles.clearFiltersActionText}>Reset Search + Filters</Text>
                        </TouchableOpacity>
                        {FILTER_OPTIONS.map((option) => (
                            <TouchableOpacity
                                key={option}
                                style={styles.filterOption}
                                onPress={() => {
                                    setSelectedFilter(option);
                                    setShowFilterModal(false);
                                }}
                                activeOpacity={0.7}
                            >
                                <Text style={[styles.filterOptionText, selectedFilter === option && styles.filterOptionTextActive]}>
                                    {option}
                                </Text>
                                {selectedFilter === option ? (
                                    <Ionicons name="checkmark-circle" size={18} color="#7c3aed" />
                                ) : null}
                            </TouchableOpacity>
                        ))}
                    </Pressable>
                </Pressable>
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
        backgroundColor: '#7c3aed',
        paddingHorizontal: 16,
        paddingBottom: 10,
    },
    headerTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: '#ffffff',
    },
    headerControls: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 8,
    },
    searchToggleBtn: {
        width: 36,
        height: 36,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.22)',
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    searchWrap: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        backgroundColor: '#ffffff',
        borderRadius: 18,
        paddingHorizontal: 10,
        height: 38,
    },
    searchIcon: {
        color: '#64748b',
        opacity: 0.95,
    },
    searchInput: {
        flex: 1,
        marginLeft: 6,
        fontSize: 13,
        color: '#0f172a',
        paddingVertical: 0,
    },
    searchClearBtn: {
        marginLeft: 6,
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#f1f5f9',
        alignItems: 'center',
        justifyContent: 'center',
    },
    filterBtn: {
        width: 36,
        height: 36,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.22)',
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    filterBtnActive: {
        borderColor: '#ede9fe',
        backgroundColor: '#8b5cf6',
    },
    headerSubtitle: {
        marginTop: 4,
        fontSize: 11,
        color: '#e9d5ff',
        fontWeight: '500',
    },
    loaderWrap: {
        paddingHorizontal: 16,
        paddingTop: 10,
    },
    skeleton: {
        borderRadius: 12,
        marginBottom: 10,
    },
    listContent: {
        paddingTop: 4,
        paddingBottom: 24,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 13,
        borderBottomWidth: 1,
        borderBottomColor: '#eef2f7',
        backgroundColor: '#ffffff',
    },
    avatarWrap: {
        marginRight: 12,
        position: 'relative',
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    avatarStatusDot: {
        position: 'absolute',
        right: -1,
        bottom: -1,
        width: 12,
        height: 12,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: '#ffffff',
        backgroundColor: '#9333ea',
    },
    rowBody: {
        flex: 1,
        minHeight: 50,
        justifyContent: 'center',
    },
    rowTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    nameText: {
        flex: 1,
        fontSize: 14,
        fontWeight: '700',
        color: '#111827',
        marginRight: 8,
    },
    timeText: {
        fontSize: 12,
        color: '#94a3b8',
        fontWeight: '500',
    },
    jobTitleText: {
        marginTop: 2,
        fontSize: 12,
        color: '#7c3aed',
        fontWeight: '700',
    },
    rowBottom: {
        marginTop: 2,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    previewText: {
        flex: 1,
        fontSize: 12,
        color: '#64748b',
        marginRight: 8,
    },
    statusText: {
        fontSize: 11,
        color: '#94a3b8',
        fontWeight: '600',
    },
    readyBadge: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#9333ea',
    },
    filterOverlay: {
        flex: 1,
        backgroundColor: 'rgba(15,23,42,0.28)',
        justifyContent: 'flex-end',
    },
    filterSheet: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 18,
        borderTopRightRadius: 18,
        paddingHorizontal: 16,
        paddingTop: 14,
        paddingBottom: 24,
    },
    filterSheetTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#0f172a',
        marginBottom: 10,
    },
    clearFiltersAction: {
        alignSelf: 'flex-start',
        marginBottom: 8,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: '#ddd6fe',
        backgroundColor: '#f5f3ff',
        paddingHorizontal: 10,
        paddingVertical: 6,
    },
    clearFiltersActionText: {
        fontSize: 12,
        color: '#7c3aed',
        fontWeight: '700',
    },
    filterOption: {
        minHeight: 44,
        borderRadius: 10,
        paddingHorizontal: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    filterOptionText: {
        fontSize: 14,
        color: '#334155',
        fontWeight: '500',
    },
    filterOptionTextActive: {
        color: '#7c3aed',
        fontWeight: '700',
    },
});
