import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    View, Text, FlatList, StyleSheet, TouchableOpacity, Modal, Image,
    Animated, PanResponder, Dimensions, Alert, Platform
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import EmptyState from '../components/EmptyState';
import SkeletonLoader from '../components/SkeletonLoader';
import ContactInfoView from '../components/contact/ContactInfoView';
import client from '../api/client';
import { useFocusEffect } from '@react-navigation/native';
import { validateApplicationsResponse, logValidationError } from '../utils/apiValidator';
import { useAppStore } from '../store/AppStore';
import { trackEvent } from '../services/analytics';
import { DEMO_MODE } from '../config';

const { width } = Dimensions.get('window');

const FILTERS = ['All', 'Applied', 'Shortlisted', 'Accepted', 'Rejected', 'Hired', 'Archived'];
const STATUS_MAP = {
    requested: 'Applied',
    pending: 'Applied',
    shortlisted: 'Shortlisted',
    accepted: 'Accepted',
    rejected: 'Rejected',
    hired: 'Hired',
    offer_proposed: 'Offer Received',
    offer_accepted: 'Offer Accepted',
    interview: 'Interview',
    applied: 'Applied',
};
const STATUS_COLOR_MAP = {
    Applied: '#94a3b8',
    Shortlisted: '#f59e0b',
    Accepted: '#9333ea',
    Rejected: '#ef4444',
    Hired: '#10b981',
    Interview: '#9333ea',
    'Offer Received': '#0ea5e9',
    'Offer Accepted': '#10b981',
};

const PRODUCTS = [
    { name: 'Express Last-Mile', icon: '🚚', desc: 'Tech-enabled delivery for e-commerce and retail.' },
    { name: 'Cold Chain Pros', icon: '❄️', desc: 'Temperature-sensitive food and vaccine transport.' },
    { name: 'Heavy Hauling', icon: '🏗️', desc: 'Industrial equipment and raw material infrastructure.' },
    { name: 'Warehouse Smart', icon: '🏢', desc: 'AI-driven inventory and storage management.' }
];

const SwipeableRow = ({ children, onArchive }) => {
    const pan = useRef(new Animated.ValueXY()).current;
    const panResponder = useRef(
        PanResponder.create({
            onMoveShouldSetPanResponder: (evt, gestureState) => Math.abs(gestureState.dx) > 10,
            onPanResponderMove: Animated.event([null, { dx: pan.x }], { useNativeDriver: false }),
            onPanResponderRelease: (evt, gestureState) => {
                if (gestureState.dx < -80) {
                    Animated.timing(pan, { toValue: { x: -width, y: 0 }, duration: 250, useNativeDriver: false }).start(() => onArchive());
                } else {
                    Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start();
                }
            }
        })
    ).current;

    return (
        <View style={styles.swipeContainer}>
            <View style={styles.swipeBackground}>
                <Text style={styles.swipeText}>Archive</Text>
            </View>
            <Animated.View style={[styles.swipeForeground, { transform: [{ translateX: pan.x }] }]} {...panResponder.panHandlers}>
                {children}
            </Animated.View>
        </View>
    );
};

export default function ApplicationsScreen({ navigation }) {
    const insets = useSafeAreaInsets();
    const { role } = useAppStore();
    const isEmployer = role === 'employer';
    const [applications, setApplications] = useState([]);
    const [archivedApplications, setArchivedApplications] = useState([]);
    const [selectedFilter, setSelectedFilter] = useState('All');
    const [selectedContact, setSelectedContact] = useState(null);
    const [showVideoCall, setShowVideoCall] = useState(false);
    const [isLoading, setIsLoading] = useState(!DEMO_MODE);
    const [error, setError] = useState(null);
    const isEmployeeViewingEmployer = !isEmployer;

    const mapStatus = (status) => STATUS_MAP[String(status || '').toLowerCase()] || 'Applied';

    const fetchApplications = useCallback(async () => {
        try {
            setError(null);
            if (!DEMO_MODE) {
                setIsLoading(true);
            }
            if (isEmployer) {
                const [jobsRes, applicationsRes] = await Promise.all([
                    client.get('/api/jobs/my-jobs'),
                    client.get('/api/applications'),
                ]);
                const jobsData = jobsRes?.data;
                const jobs = Array.isArray(jobsData) ? jobsData : (jobsData?.data || []);
                const appList = validateApplicationsResponse(applicationsRes?.data);

                const applicantsByJobId = appList.reduce((acc, application) => {
                    const jobId = String(application?.job?._id || application?.job || '');
                    if (!jobId) return acc;
                    acc[jobId] = (acc[jobId] || 0) + 1;
                    return acc;
                }, {});

                const formattedJobs = jobs.map((job) => {
                    const jobId = String(job._id);
                    const applicantCount = applicantsByJobId[jobId] || 0;
                    return {
                        _id: jobId,
                        itemType: 'job',
                        jobId,
                        companyId: null,
                        companyName: job.companyName || 'Your Company',
                        applicantName: '',
                        rawStatus: 'pending',
                        jobTitle: job.title || 'Untitled Role',
                        status: 'Applied',
                        badgeText: `${applicantCount} Applicants`,
                        lastMessage: applicantCount > 0 ? 'Tap to review candidates in Talent.' : 'No applicants yet.',
                        time: job.updatedAt ? new Date(job.updatedAt).toLocaleDateString() : 'Now',
                        logo: `https://ui-avatars.com/api/?name=${encodeURIComponent(job.companyName || 'Company')}&background=7c3aed&color=fff`,
                        applicantCount,
                        matchScore: 0,
                    };
                });
                setApplications(formattedJobs);
                return;
            }

            const { data } = await client.get('/api/applications');
            const list = validateApplicationsResponse(data);
            const formatted = list.map((item) => {
                const job = item.job || {};
                const companyName = job.companyName || item.employer?.name || item.companyName || 'Looking for Someone';
                const applicantName = item.worker?.firstName
                    ? `${item.worker.firstName} ${item.worker.lastName || ''}`.trim()
                    : 'Applicant';
                return {
                    _id: item._id,
                    itemType: 'application',
                    jobId: job?._id || null,
                    companyId: item.employer?._id || null,
                    companyName,
                    applicantName,
                    rawStatus: String(item.status || '').toLowerCase(),
                    jobTitle: job.title || item.jobTitle || 'Untitled Role',
                    status: mapStatus(item.status),
                    badgeText: null,
                    lastMessage: item.lastMessage || 'Application updated.',
                    time: item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : 'Now',
                    logo: `https://ui-avatars.com/api/?name=${encodeURIComponent(companyName)}&background=7c3aed&color=fff`,
                    matchScore: item.matchScore || 0,
                };
            });
            setApplications(formatted);
        } catch (e) {
            if (e?.name === 'ApiValidationError') {
                logValidationError(e, '/api/applications');
            }
            setError('Could not load applications');
        } finally {
            if (!DEMO_MODE) {
                setIsLoading(false);
            }
        }
    }, [isEmployer]);

    useEffect(() => {
        fetchApplications();
    }, [fetchApplications]);

    useFocusEffect(
        useCallback(() => {
            fetchApplications();
        }, [fetchApplications])
    );

    const filteredApps = selectedFilter === 'Archived'
        ? archivedApplications
        : isEmployer
            ? applications
            : applications.filter(app => selectedFilter === 'All' || app.status === selectedFilter);

    const openContactInfo = (contact) => {
        const profilePayload = {
            source: 'applications_screen',
            targetType: isEmployeeViewingEmployer ? 'employer' : 'candidate',
            targetId: String(contact?.companyId || contact?._id || ''),
        };
        trackEvent('PROFILE_VIEWED', profilePayload);
        setSelectedContact(contact);
    };

    const handleArchive = (id) => {
        const item = applications.find(a => a._id === id);
        if (item) {
            setArchivedApplications(prev => [...prev, { ...item, archived: true }]);
        }
        setApplications(prev => prev.filter(a => a._id !== id));
    };

    const handleWithdraw = () => {
        Alert.alert(
            'Withdraw Application',
            'Are you sure? This cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Withdraw', style: 'destructive', onPress: () => {
                        setApplications(prev => prev.filter(a => a._id !== selectedContact._id));
                        setSelectedContact(null);
                    }
                }
            ]
        );
    };

    const handleOpenApplication = (item) => {
        if (isEmployer) {
            navigation.navigate('Talent', {
                jobId: item.jobId || item._id,
                jobTitle: item.jobTitle,
            });
            return;
        }
        const appliedPayload = {
            source: 'applications_screen',
            applicationId: String(item?._id || ''),
            jobId: String(item?.jobId || ''),
        };
        trackEvent('JOB_APPLIED', appliedPayload);
        navigation.navigate('Chat', { applicationId: item._id });
    };

    const handleOpenChat = (item) => {
        navigation.navigate('Chat', { applicationId: item._id });
    };

    const renderItem = ({ item }) => (
        <SwipeableRow onArchive={() => handleArchive(item._id)}>
            <View style={styles.row}>
                <TouchableOpacity style={styles.avatarWrap} onPress={() => openContactInfo(item)} activeOpacity={0.7}>
                    <Image source={{ uri: item.logo }} style={styles.avatarImage} />
                    <View style={styles.purpleDot} />
                </TouchableOpacity>

                <View style={styles.rowContent}>
                    <View style={styles.rowTop}>
                        <TouchableOpacity onPress={() => openContactInfo(item)} activeOpacity={0.7}>
                            <Text style={styles.companyName} numberOfLines={1}>{item.companyName}</Text>
                        </TouchableOpacity>
                        <Text style={styles.timeText}>{item.time}</Text>
                    </View>
                    <TouchableOpacity activeOpacity={0.7} onPress={() => handleOpenApplication(item)}>
                        <View style={styles.titleRow}>
                            <Text style={styles.jobTitle} numberOfLines={1}>{item.jobTitle}</Text>
                            <View style={[styles.statusBadge, { backgroundColor: `${STATUS_COLOR_MAP[item.status] || '#f1f5f9'}22` }]}>
                                <Text style={[styles.statusBadgeText, { color: STATUS_COLOR_MAP[item.status] || '#64748b' }]}>{item.badgeText || item.status}</Text>
                            </View>
                        </View>
                        <Text style={styles.lastMessage} numberOfLines={1}>{item.lastMessage}</Text>
                    </TouchableOpacity>
                    {item.itemType === 'application' && item.rawStatus === 'accepted' && (
                        <TouchableOpacity style={styles.openChatBtn} onPress={() => handleOpenChat(item)}>
                            <Text style={styles.openChatBtnText}>Open Chat</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        </SwipeableRow>
    );

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
                <Text style={styles.headerTitle}>Applications</Text>
                <Text style={styles.headerSubtitle}>Active conversations with employers</Text>

                {/* Horizontal Filters */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
                    {FILTERS.map(f => (
                        <TouchableOpacity key={f} onPress={() => setSelectedFilter(f)} style={[styles.filterPill, selectedFilter === f && styles.filterPillActive]}>
                            <Text style={[styles.filterText, selectedFilter === f && styles.filterTextActive]}>{f}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {isLoading ? (
                <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
                    <SkeletonLoader height={72} style={{ borderRadius: 12, marginBottom: 12 }} />
                    <SkeletonLoader height={72} style={{ borderRadius: 12, marginBottom: 12 }} />
                    <SkeletonLoader height={72} style={{ borderRadius: 12, marginBottom: 12 }} />
                    <SkeletonLoader height={72} style={{ borderRadius: 12, marginBottom: 12 }} />
                </View>
            ) : error ? (
                <EmptyState
                    icon={<View style={styles.emptyIconCircle}><Text style={styles.emptyEmoji}>⚠️</Text></View>}
                    title="Could Not Load Applications"
                    message={error}
                    actionLabel="Retry"
                    onAction={fetchApplications}
                />
            ) : (
                <FlatList
                    data={filteredApps}
                    keyExtractor={item => item._id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    removeClippedSubviews={Platform.OS === 'android'}
                    maxToRenderPerBatch={10}
                    windowSize={10}
                    initialNumToRender={12}
                    ListEmptyComponent={
                        <EmptyState
                            icon={<View style={styles.emptyIconCircle}><Text style={styles.emptyEmoji}>📬</Text></View>}
                            title="No Applications Found"
                            message="Try changing your filter or apply to new jobs."
                            actionLabel={selectedFilter !== 'All' ? "Clear Filters" : "Find Jobs"}
                            onAction={() => {
                                if (selectedFilter !== 'All') {
                                    setSelectedFilter('All');
                                } else {
                                    navigation.navigate(isEmployer ? 'My Jobs' : 'Jobs');
                                }
                            }}
                        />
                    }
                />
            )}

            {/* Contact Info Modal */}
            <Modal visible={!!selectedContact} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setSelectedContact(null)}>
                {selectedContact && (
                    <ContactInfoView
                        presentation="modal"
                        mode={isEmployeeViewingEmployer ? 'employer' : 'candidate'}
                        title={isEmployeeViewingEmployer ? 'Enterprise Hub' : 'Candidate Details'}
                        data={{
                            name: selectedContact.companyName,
                            avatar: selectedContact.logo,
                            headline: isEmployeeViewingEmployer ? 'Moving the world, one delivery at a time.' : selectedContact.jobTitle,
                            industryTag: isEmployeeViewingEmployer ? 'LOGISTICS & SUPPLY CHAIN' : 'CANDIDATE PROFILE',
                            products: PRODUCTS,
                            mission: 'We are building the backbone of modern commerce. By integrating AI with a massive fleet network, we ensure fair pay for partners and lightning-fast logistics for businesses.',
                            industry: 'Logistics & Supply Chain',
                            hq: 'Hyderabad, IN',
                            timeline: [
                                { year: '2023', event: 'Reached 10M successful deliveries nationwide' },
                                { year: '2021', event: 'Expanded cross-border logistics to SEA regions' },
                                { year: '2015', event: 'Founded in Hyderabad as a small bike-fleet' },
                            ],
                            contactInfo: {
                                partnership: 'partners@logitech.in',
                                support: '+91 1800 200 1234',
                                website: 'www.logitech.in',
                            },
                            summary: 'Experienced candidate with strong operational background and consistent delivery record.',
                            experienceYears: 3,
                            skills: ['React', 'Node', 'Ops', 'Logistics'],
                        }}
                        onBack={() => setSelectedContact(null)}
                        onVideoPress={() => setShowVideoCall(true)}
                        onPrimaryAction={isEmployeeViewingEmployer ? handleWithdraw : undefined}
                        primaryActionLabel={isEmployeeViewingEmployer ? 'Withdraw Application' : undefined}
                    />
                )}
            </Modal>

            <Modal visible={showVideoCall} transparent animationType="fade" onRequestClose={() => setShowVideoCall(false)}>
                <View style={styles.videoOverlay}>
                    <View style={styles.videoRemote}>
                        <Text style={styles.videoRemoteInitial}>
                            {(selectedContact?.companyName || 'U').charAt(0).toUpperCase()}
                        </Text>
                        <Text style={styles.videoConnecting}>Connecting...</Text>
                    </View>
                    <View style={styles.videoPip}>
                        <Image source={{ uri: selectedContact?.logo }} style={styles.videoPipImg} />
                    </View>
                    <View style={styles.videoTitleWrap}>
                        <Text style={styles.videoTitle}>{selectedContact?.companyName || 'Contact'}</Text>
                        <View style={styles.videoSecureChip}>
                            <Text style={styles.videoSecureText}>Secure Video Link</Text>
                        </View>
                    </View>
                    <View style={styles.videoControls}>
                        <TouchableOpacity style={styles.videoControlBtn}>
                            <Ionicons name="mic-off-outline" size={22} color="#fff" />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.videoEndBtn} onPress={() => setShowVideoCall(false)}>
                            <Ionicons name="call-outline" size={26} color="#fff" />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.videoControlBtn}>
                            <Ionicons name="videocam-outline" size={22} color="#fff" />
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    header: { backgroundColor: '#7c3aed', paddingHorizontal: 20, paddingBottom: 16, zIndex: 10 },
    headerTitle: { fontSize: 24, fontWeight: '900', color: '#fff', marginBottom: 4 },
    headerSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: '500', marginBottom: 16 },

    filterScroll: { paddingRight: 20, gap: 8 },
    filterPill: { backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    filterPillActive: { backgroundColor: '#fff', borderColor: '#fff' },
    filterText: { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.9)' },
    filterTextActive: { color: '#7c3aed' },

    listContent: { paddingBottom: 40, paddingTop: 8 },
    swipeContainer: { backgroundColor: '#fee2e2' },
    swipeBackground: { position: 'absolute', right: 24, top: 0, bottom: 0, justifyContent: 'center' },
    swipeText: { color: '#ef4444', fontWeight: '900', fontSize: 13, textTransform: 'uppercase', letterSpacing: 1 },
    swipeForeground: { backgroundColor: '#fff' },

    row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9', paddingHorizontal: 16, paddingVertical: 16 },
    avatarWrap: { position: 'relative', marginRight: 16 },
    avatarImage: { width: 48, height: 48, borderRadius: 24, borderWidth: 1, borderColor: '#f1f5f9' },
    purpleDot: { position: 'absolute', bottom: -2, right: -2, width: 14, height: 14, backgroundColor: '#7c3aed', borderRadius: 7, borderWidth: 2, borderColor: '#fff' },

    rowContent: { flex: 1, justifyContent: 'center' },
    rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
    companyName: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
    timeText: { fontSize: 10, color: '#94a3b8', fontWeight: '500' },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
    jobTitle: { fontSize: 12, fontWeight: '700', color: '#7c3aed', flexShrink: 1 },
    statusBadge: { backgroundColor: '#f1f5f9', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
    statusBadgeText: { fontSize: 9, fontWeight: '900', color: '#64748b', textTransform: 'uppercase' },
    lastMessage: { fontSize: 11, color: '#64748b', fontWeight: '500' },
    openChatBtn: {
        alignSelf: 'flex-start',
        marginTop: 8,
        backgroundColor: '#faf5ff',
        borderWidth: 1,
        borderColor: '#e9d5ff',
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 6,
    },
    openChatBtnText: {
        fontSize: 11,
        fontWeight: '800',
        color: '#7c3aed',
    },

    emptyIconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
    emptyEmoji: { fontSize: 40 },

    // Modal


    // Details Section





    videoOverlay: { flex: 1, backgroundColor: '#0f172a', justifyContent: 'center', alignItems: 'center' },
    videoRemote: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: '#111827' },
    videoRemoteInitial: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#1f2937', textAlign: 'center', textAlignVertical: 'center', color: 'rgba(255,255,255,0.5)', fontSize: 52, fontWeight: '900', lineHeight: 120 },
    videoConnecting: { color: '#94a3b8', fontSize: 12, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1, marginTop: 14 },
    videoPip: { position: 'absolute', top: 56, right: 16, width: 128, height: 176, borderRadius: 16, overflow: 'hidden', borderWidth: 2, borderColor: 'rgba(255,255,255,0.8)' },
    videoPipImg: { width: '100%', height: '100%', opacity: 0.9 },
    videoTitleWrap: { position: 'absolute', top: 62, alignItems: 'center' },
    videoTitle: { color: '#fff', fontSize: 22, fontWeight: '900' },
    videoSecureChip: { backgroundColor: 'rgba(124,58,237,0.35)', borderRadius: 999, borderWidth: 1, borderColor: 'rgba(124,58,237,0.65)', paddingHorizontal: 12, paddingVertical: 5, marginTop: 6 },
    videoSecureText: { color: '#ddd6fe', fontSize: 10, fontWeight: '900' },
    videoControls: { position: 'absolute', bottom: 48, flexDirection: 'row', alignItems: 'center', gap: 20 },
    videoControlBtn: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.14)', justifyContent: 'center', alignItems: 'center' },
    videoEndBtn: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#ef4444', justifyContent: 'center', alignItems: 'center' },
});
