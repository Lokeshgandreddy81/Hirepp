import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { IconBell } from '../../components/Icons';
import { RADIUS, SHADOWS, SPACING } from '../../theme/theme';
import { connectPalette } from './connectPalette';

function ConnectHeaderComponent({
    avatar,
    onNotificationsPress,
    onProfilePress,
    notificationsCount = 0,
    activeTab = 'Feed',
}) {
    const hasUnread = Number(notificationsCount || 0) > 0;
    const safeAlertsCount = Math.max(0, Number(notificationsCount || 0));
    const unreadLabel = Number(notificationsCount || 0) > 99 ? '99+' : String(Math.max(0, Number(notificationsCount || 0)));
    const activeTabLabel = String(activeTab || 'Feed').trim() || 'Feed';
    const isFeedTheme = activeTabLabel.toLowerCase() === 'feed';
    return (
        <View style={[styles.headerShell, isFeedTheme && styles.headerShellFeed]}>
            {!isFeedTheme ? <View style={styles.accentOrbOne} /> : null}
            {!isFeedTheme ? <View style={styles.accentOrbTwo} /> : null}

            <View style={styles.headerTopRow}>
                <View style={styles.headerLeft}>
                    {!isFeedTheme ? (
                        <View style={styles.logoBox}>
                            <Text style={styles.logoH}>H</Text>
                        </View>
                    ) : null}
                    <View style={styles.brandTextWrap}>
                        {isFeedTheme ? (
                            <Text style={styles.logoWordmark}>
                                <Text style={styles.logoWordmarkDark}>HIRE</Text>
                                <Text style={styles.logoWordmarkAccent}>CIRCLE</Text>
                            </Text>
                        ) : (
                            <Text style={styles.logoTitle}>HireCircle</Text>
                        )}
                        {!isFeedTheme ? <Text style={styles.logoSubtitle}>Explore: {activeTabLabel}</Text> : null}
                    </View>
                </View>
                <View style={styles.headerRight}>
                    <TouchableOpacity style={[styles.bellButton, isFeedTheme && styles.bellButtonFeed]} onPress={onNotificationsPress} activeOpacity={0.82}>
                        <IconBell size={18} color={isFeedTheme ? '#4c1d95' : connectPalette.darkSoft} />
                        {hasUnread ? (
                            Number(notificationsCount || 0) > 9 ? (
                                <View style={styles.bellCountBadge}>
                                    <Text style={styles.bellCountText}>{unreadLabel}</Text>
                                </View>
                            ) : (
                                <View style={styles.bellDot} />
                            )
                        ) : null}
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.avatarButton, isFeedTheme && styles.avatarButtonFeed]} onPress={onProfilePress} activeOpacity={0.85}>
                        <Image source={{ uri: avatar }} style={styles.avatarImage} />
                    </TouchableOpacity>
                </View>
            </View>

            {!isFeedTheme ? (
                <View style={styles.metaRow}>
                    <View style={[styles.metaPill, isFeedTheme && styles.metaPillFeed]}>
                        <Text style={[styles.metaPillText, isFeedTheme && styles.metaPillTextFeed]}>
                            Community live
                        </Text>
                    </View>
                    <View style={[styles.metaPillAlt, isFeedTheme && styles.metaPillAltFeed]}>
                        <Text style={[styles.metaPillAltText, isFeedTheme && styles.metaPillAltTextFeed]}>
                            {safeAlertsCount} alerts
                        </Text>
                    </View>
                </View>
            ) : null}
        </View>
    );
}

export default memo(ConnectHeaderComponent);

const styles = StyleSheet.create({
    headerShell: {
        overflow: 'hidden',
        paddingHorizontal: SPACING.md,
        paddingTop: SPACING.sm + 4,
        paddingBottom: SPACING.sm,
        backgroundColor: connectPalette.surface,
        borderBottomWidth: 0,
        borderBottomColor: 'transparent',
        position: 'relative',
        ...SHADOWS.sm,
    },
    headerShellFeed: {
        backgroundColor: '#f4edff',
        borderBottomWidth: 1,
        borderBottomColor: '#e7d7ff',
        shadowColor: '#7c3aed',
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 2,
    },
    accentOrbOne: {
        position: 'absolute',
        top: -42,
        right: -18,
        width: 110,
        height: 110,
        borderRadius: 999,
        backgroundColor: '#ede9fe',
        opacity: 0.78,
    },
    accentOrbTwo: {
        position: 'absolute',
        bottom: -55,
        left: -40,
        width: 120,
        height: 120,
        borderRadius: 999,
        backgroundColor: '#dbeafe',
        opacity: 0.45,
    },
    headerTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    brandTextWrap: {
        justifyContent: 'center',
    },
    logoBox: {
        width: 38,
        height: 38,
        borderRadius: 12,
        backgroundColor: connectPalette.accent,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
        borderWidth: 1,
        borderColor: '#a78bfa',
        ...SHADOWS.sm,
    },
    logoBoxFeed: {
        backgroundColor: '#111111',
        borderColor: '#111111',
    },
    logoH: {
        color: connectPalette.surface,
        fontSize: 17,
        fontWeight: '900',
    },
    logoTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: connectPalette.text,
        letterSpacing: -0.2,
    },
    logoWordmark: {
        fontSize: 24,
        lineHeight: 28,
        fontWeight: '900',
        letterSpacing: -0.8,
    },
    logoWordmarkDark: {
        color: '#121726',
    },
    logoWordmarkAccent: {
        color: '#8b3dff',
    },
    logoSubtitle: {
        marginTop: 1,
        fontSize: 12,
        fontWeight: '700',
        color: connectPalette.muted,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    bellButton: {
        width: 36,
        height: 36,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 18,
        backgroundColor: '#f8fafc',
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    bellButtonFeed: {
        backgroundColor: '#ede2ff',
        borderColor: '#d8c2ff',
    },
    bellDot: {
        position: 'absolute',
        top: 6,
        right: 6,
        width: 7,
        height: 7,
        borderRadius: RADIUS.full,
        backgroundColor: connectPalette.danger,
        borderWidth: 2,
        borderColor: connectPalette.surface,
    },
    bellCountBadge: {
        position: 'absolute',
        top: -3,
        right: -5,
        minWidth: 17,
        height: 17,
        borderRadius: 9,
        paddingHorizontal: 4,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: connectPalette.danger,
        borderWidth: 1,
        borderColor: connectPalette.surface,
    },
    bellCountText: {
        color: '#fff',
        fontSize: 9,
        fontWeight: '800',
        lineHeight: 10,
    },
    avatarButton: {
        marginLeft: 7,
        borderRadius: RADIUS.full,
        borderWidth: 2,
        borderColor: connectPalette.accentSoftAlt,
        width: 38,
        height: 38,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: connectPalette.surface,
        ...SHADOWS.sm,
    },
    avatarButtonFeed: {
        borderColor: '#bca2fb',
        backgroundColor: '#f8f4ff',
    },
    avatarImage: {
        width: 31,
        height: 31,
        borderRadius: RADIUS.full,
    },
    metaRow: {
        marginTop: 10,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    metaPill: {
        backgroundColor: '#eef2ff',
        borderRadius: 999,
        borderWidth: 1,
        borderColor: '#c7d2fe',
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    metaPillFeed: {
        backgroundColor: '#f3f4f6',
        borderColor: '#d1d5db',
    },
    metaPillText: {
        color: '#4338ca',
        fontSize: 11,
        fontWeight: '700',
    },
    metaPillTextFeed: {
        color: '#374151',
    },
    metaPillAlt: {
        backgroundColor: '#ecfeff',
        borderRadius: 999,
        borderWidth: 1,
        borderColor: '#bae6fd',
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    metaPillAltFeed: {
        backgroundColor: '#f3f4f6',
        borderColor: '#d1d5db',
    },
    metaPillAltText: {
        color: '#0f766e',
        fontSize: 11,
        fontWeight: '700',
    },
    metaPillAltTextFeed: {
        color: '#374151',
    },
});
