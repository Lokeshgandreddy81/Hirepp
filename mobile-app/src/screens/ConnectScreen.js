import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing, Alert, Modal, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FeedTab from './connect/feed/FeedTab';
import PulseTab from './connect/pulse/PulseTab';
import CirclesTab from './connect/circles/CirclesTab';
import AcademyTab from './connect/academy/AcademyTab';
import BountiesTab from './connect/bounties/BountiesTab';
import CircleDetailView from './connect/circles/CircleDetailView';
import ConnectHeader from './connect/ConnectHeader';
import ConnectTabBar from './connect/ConnectTabBar';
import ReferModal from './connect/ReferModal';
import MyProfileModal from './connect/MyProfileModal';
import ContactInfoView from '../components/contact/ContactInfoView';
import { CONNECT_TABS, useConnectData } from './connect/useConnectData';
import { theme, RADIUS, SHADOWS, SPACING } from '../theme/theme';
import { connectPalette } from './connect/connectPalette';
import { trackEvent } from '../services/analytics';
import { MOTION } from '../theme/motion';
import { useAppStore } from '../store/AppStore';

export default function ConnectScreen() {
    const insets = useSafeAreaInsets();
    const navigation = useNavigation();
    const route = useRoute();
    const { notificationsCount = 0 } = useAppStore();

    const {
        userInfo = null,
        activeTab = 'Feed',
        setActiveTab = () => {},
        showMyProfile = false,
        setShowMyProfile = () => {},
        resettingConnectData = false,
        clearConnectHistory = async () => ({ ok: false }),
        feedProfileVisible = false,
        feedProfileLoading = false,
        feedProfileData = null,
        closeFeedProfile = () => {},
        feedTabProps = {},
        pulseTabProps = {},
        circlesTabProps = {},
        academyTabProps = {},
        bountiesTabProps = {},
        circleDetailProps = {},
        referralModalProps = {},
        pulseToast,
        bountyToast,
    } = useConnectData() || {};

    const tabFade = useRef(new Animated.Value(1)).current;
    const tabSlide = useRef(new Animated.Value(0)).current;
    const isFeedTab = String(activeTab || '').toLowerCase() === 'feed';
    const containerStyle = useMemo(
        () => [styles.container, { paddingTop: insets.top }, isFeedTab ? styles.containerFeed : null],
        [insets.top, isFeedTab]
    );
    const currentUserAvatar = useMemo(() => {
        const displayName = String(userInfo?.name || 'You').trim() || 'You';
        return String(
            userInfo?.avatar
            || userInfo?.profilePicture
            || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=d1d5db&color=111111&rounded=true`
        );
    }, [userInfo?.avatar, userInfo?.name, userInfo?.profilePicture]);

    const openNotifications = useCallback(() => {
        navigation.navigate('Notifications');
    }, [navigation]);

    const openProfile = useCallback(() => {
        setShowMyProfile(true);
    }, [setShowMyProfile]);

    const closeProfile = useCallback(() => {
        setShowMyProfile(false);
    }, [setShowMyProfile]);

    const handleClearConnectHistory = useCallback(() => {
        if (resettingConnectData) return;
        Alert.alert(
            'Clear Connect Data?',
            'This will remove past Connect data and refresh all Connect tabs.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Clear',
                    style: 'destructive',
                    onPress: async () => {
                        const result = await clearConnectHistory();
                        if (result?.ok) {
                            return;
                        }
                        Alert.alert('Clear failed', String(result?.message || 'Could not clear Connect data right now.'));
                    },
                },
            ]
        );
    }, [clearConnectHistory, resettingConnectData]);

    const handleEditProfile = useCallback(() => {
        setShowMyProfile(false);
        const routeNames = navigation.getState?.()?.routeNames || [];
        if (routeNames.includes('Profiles')) {
            navigation.navigate('Profiles');
            return;
        }
        navigation.navigate('Settings');
    }, [navigation, setShowMyProfile]);

    const handleOpenSettings = useCallback(() => {
        setShowMyProfile(false);
        navigation.navigate('Settings');
    }, [navigation, setShowMyProfile]);

    const handleTabPress = useCallback((nextTab) => {
        const normalizedTab = String(nextTab || '').toLowerCase();
        if (normalizedTab === String(activeTab || '').toLowerCase()) {
            return;
        }
        setActiveTab(nextTab);
        trackEvent('TAB_SWITCH', {
            scope: 'connect',
            tab: normalizedTab,
        });
    }, [activeTab, setActiveTab]);

    const handleOpenPostJobForm = useCallback(() => {
        navigation.navigate('PostJob');
    }, [navigation]);

    const tabContent = useMemo(() => {
        switch (String(activeTab || 'Feed').toLowerCase()) {
        case 'feed':
            return <FeedTab {...feedTabProps} contentContainerStyle={styles.tabContent} onOpenPostJobForm={handleOpenPostJobForm} />;
        case 'pulse':
            return <PulseTab {...pulseTabProps} contentContainerStyle={styles.tabContent} />;
        case 'circles':
            return (
                <CirclesTab
                    {...circlesTabProps}
                    communityFabTrigger={route.params?.communityFabTrigger}
                    contentContainerStyle={styles.tabContent}
                />
            );
        case 'academy':
            return <AcademyTab {...academyTabProps} contentContainerStyle={styles.tabContent} />;
        case 'bounties':
            return <BountiesTab {...bountiesTabProps} contentContainerStyle={styles.tabContent} />;
        default:
            return <FeedTab {...feedTabProps} contentContainerStyle={styles.tabContent} onOpenPostJobForm={handleOpenPostJobForm} />;
        }
    }, [
        activeTab,
        feedTabProps,
        pulseTabProps,
        circlesTabProps,
        academyTabProps,
        bountiesTabProps,
        route.params?.communityFabTrigger,
        handleOpenPostJobForm,
    ]);

    useEffect(() => {
        navigation.setParams({
            connectActiveTab: activeTab,
        });
    }, [activeTab, navigation]);

    useEffect(() => {
        tabFade.setValue(0.72);
        tabSlide.setValue(6);
        Animated.parallel([
            Animated.timing(tabFade, {
                toValue: 1,
                duration: MOTION.tabTransitionMs,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
            }),
            Animated.timing(tabSlide, {
                toValue: 0,
                duration: MOTION.tabTransitionMs,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
            }),
        ]).start();
    }, [activeTab, tabFade, tabSlide]);

    return (
        <View style={containerStyle}>
            {!isFeedTab ? <View pointerEvents="none" style={styles.backdropOrbTop} /> : null}
            {!isFeedTab ? <View pointerEvents="none" style={styles.backdropOrbBottom} /> : null}

            <ConnectHeader
                avatar={currentUserAvatar}
                onNotificationsPress={openNotifications}
                onProfilePress={openProfile}
                onResetPress={handleClearConnectHistory}
                resetBusy={resettingConnectData}
                notificationsCount={notificationsCount}
                activeTab={activeTab}
            />

            <ConnectTabBar tabs={CONNECT_TABS} activeTab={activeTab} onTabPress={handleTabPress} />

            <Animated.View style={[styles.mainContent, { opacity: tabFade, transform: [{ translateY: tabSlide }] }]}>
                <View style={[styles.contentSheet, isFeedTab && styles.contentSheetFeed]}>
                    {tabContent}
                </View>
            </Animated.View>

            <CircleDetailView {...circleDetailProps} insetsTop={insets.top} />

            <ReferModal {...referralModalProps} />

            <MyProfileModal
                visible={showMyProfile}
                insetsTop={insets.top}
                userInfo={userInfo}
                avatar={currentUserAvatar}
                onClose={closeProfile}
                onEditProfile={handleEditProfile}
                onOpenSettings={handleOpenSettings}
            />

            <Modal
                visible={Boolean(feedProfileVisible)}
                animationType="slide"
                presentationStyle="fullScreen"
                onRequestClose={closeFeedProfile}
            >
                <View style={styles.profileOverlayShell}>
                    <View style={[styles.profileOverlayHeader, { paddingTop: insets.top + 10 }]}>
                        <TouchableOpacity style={styles.profileOverlayBackBtn} onPress={closeFeedProfile}>
                            <Text style={styles.profileOverlayBackIcon}>‹</Text>
                        </TouchableOpacity>
                        <Text style={styles.profileOverlayTitle}>
                            {String(feedProfileData?.mode || '').toLowerCase() === 'employer' ? 'Employer Profile' : 'Candidate Profile'}
                        </Text>
                    </View>

                    {feedProfileLoading ? (
                        <View style={styles.profileLoadingWrap}>
                            <ActivityIndicator size="small" color="#111111" />
                            <Text style={styles.profileLoadingText}>Loading profile...</Text>
                        </View>
                    ) : (
                        <ContactInfoView
                            hideHeader
                            presentation="modal"
                            mode={String(feedProfileData?.mode || '').toLowerCase() === 'employer' ? 'employer' : 'candidate'}
                            title={String(feedProfileData?.mode || '').toLowerCase() === 'employer' ? 'Employer Profile' : 'Candidate Profile'}
                            data={feedProfileData || {}}
                            onBack={closeFeedProfile}
                        />
                    )}
                </View>
            </Modal>

            {pulseToast ? (
                <View style={styles.toastContainer} pointerEvents="none">
                    <Text style={styles.toastText}>{pulseToast}</Text>
                </View>
            ) : null}

            {bountyToast ? (
                <View style={styles.toastContainer} pointerEvents="none">
                    <Text style={styles.toastText}>{bountyToast}</Text>
                </View>
            ) : null}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: connectPalette.page,
    },
    containerFeed: {
        backgroundColor: '#f4edff',
    },
    backdropOrbTop: {
        position: 'absolute',
        top: 24,
        right: -58,
        width: 180,
        height: 180,
        borderRadius: 999,
        backgroundColor: '#ede9fe',
        opacity: 0.45,
        zIndex: 0,
    },
    backdropOrbBottom: {
        position: 'absolute',
        bottom: 50,
        left: -72,
        width: 210,
        height: 210,
        borderRadius: 999,
        backgroundColor: '#dbeafe',
        opacity: 0.3,
        zIndex: 0,
    },
    mainContent: {
        flex: 1,
        zIndex: 1,
    },
    contentSheet: {
        flex: 1,
        marginHorizontal: 8,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        backgroundColor: connectPalette.surfaceSoft,
        overflow: 'hidden',
        ...SHADOWS.sm,
    },
    contentSheetFeed: {
        backgroundColor: '#ffffff',
        borderColor: 'transparent',
        borderWidth: 0,
        marginHorizontal: 0,
        borderTopLeftRadius: 0,
        borderTopRightRadius: 0,
        shadowOpacity: 0,
        shadowRadius: 0,
        elevation: 0,
    },
    tabContent: {
        paddingHorizontal: 10,
        paddingTop: 10,
        paddingBottom: 26,
    },
    profileOverlayShell: {
        flex: 1,
        backgroundColor: '#ffffff',
    },
    profileOverlayHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ffffff',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e5e5',
        paddingHorizontal: 14,
        paddingBottom: 10,
    },
    profileOverlayBackBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 8,
    },
    profileOverlayBackIcon: {
        color: '#111111',
        fontSize: 28,
        lineHeight: 28,
        fontWeight: '700',
    },
    profileOverlayTitle: {
        color: '#111111',
        fontSize: 18,
        fontWeight: '800',
    },
    profileLoadingWrap: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
    },
    profileLoadingText: {
        color: '#6b6b6b',
        fontSize: 13,
        fontWeight: '600',
    },
    toastContainer: {
        position: 'absolute',
        bottom: 90,
        alignSelf: 'center',
        backgroundColor: connectPalette.dark,
        paddingHorizontal: SPACING.lg - 2,
        paddingVertical: SPACING.smd,
        borderRadius: RADIUS.full,
        ...SHADOWS.lg,
        elevation: 20,
    },
    toastText: {
        color: theme.surface,
        fontSize: 12,
        fontWeight: '700',
    },
});
