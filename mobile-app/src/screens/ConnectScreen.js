import React, { useCallback, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
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
import { CONNECT_TABS, CURRENT_USER, useConnectData } from './connect/useConnectData';
import { theme, RADIUS } from '../theme/theme';
import { trackEvent } from '../services/analytics';

export default function ConnectScreen() {
    const insets = useSafeAreaInsets();
    const navigation = useNavigation();

    const {
        userInfo,
        activeTab,
        setActiveTab,
        showMyProfile,
        setShowMyProfile,
        feedTabProps,
        pulseTabProps,
        circlesTabProps,
        academyTabProps,
        bountiesTabProps,
        circleDetailProps,
        referralModalProps,
        pulseToast,
        bountyToast,
    } = useConnectData();

    const containerStyle = useMemo(() => [styles.container, { paddingTop: insets.top }], [insets.top]);

    const openNotifications = useCallback(() => {
        navigation.navigate('Notifications');
    }, [navigation]);

    const openProfile = useCallback(() => {
        setShowMyProfile(true);
    }, [setShowMyProfile]);

    const closeProfile = useCallback(() => {
        setShowMyProfile(false);
    }, [setShowMyProfile]);

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

    const tabContent = useMemo(() => {
        switch (activeTab.toLowerCase()) {
        case 'feed':
            return <FeedTab {...feedTabProps} contentContainerStyle={styles.tabContent} />;
        case 'pulse':
            return <PulseTab {...pulseTabProps} contentContainerStyle={styles.tabContent} />;
        case 'circles':
            return <CirclesTab {...circlesTabProps} contentContainerStyle={styles.tabContent} />;
        case 'academy':
            return <AcademyTab {...academyTabProps} contentContainerStyle={styles.tabContent} />;
        case 'bounties':
            return <BountiesTab {...bountiesTabProps} contentContainerStyle={styles.tabContent} />;
        default:
            return <FeedTab {...feedTabProps} contentContainerStyle={styles.tabContent} />;
        }
    }, [activeTab, feedTabProps, pulseTabProps, circlesTabProps, academyTabProps, bountiesTabProps]);

    return (
        <View style={containerStyle}>
            <ConnectHeader
                avatar={CURRENT_USER.avatar}
                onNotificationsPress={openNotifications}
                onProfilePress={openProfile}
            />

            <ConnectTabBar tabs={CONNECT_TABS} activeTab={activeTab} onTabPress={handleTabPress} />

            <View style={styles.mainContent}>{tabContent}</View>

            <CircleDetailView {...circleDetailProps} insetsTop={insets.top} />

            <ReferModal {...referralModalProps} />

            <MyProfileModal
                visible={showMyProfile}
                insetsTop={insets.top}
                userInfo={userInfo}
                avatar={CURRENT_USER.avatar}
                onClose={closeProfile}
            />

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
        backgroundColor: theme.background,
    },
    mainContent: {
        flex: 1,
    },
    tabContent: {
        padding: 16,
        paddingBottom: 24,
    },
    toastContainer: {
        position: 'absolute',
        bottom: 90,
        alignSelf: 'center',
        backgroundColor: theme.darkCard,
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: RADIUS.full,
        shadowColor: theme.textPrimary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 20,
    },
    toastText: {
        color: theme.surface,
        fontSize: 12,
        fontWeight: '700',
    },
});
