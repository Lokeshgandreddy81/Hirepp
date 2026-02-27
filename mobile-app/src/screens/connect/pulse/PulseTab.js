import React, { memo, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator, Animated, FlatList } from 'react-native';
import { IconMapPin, IconUsers } from '../../../components/Icons';
import { theme, RADIUS } from '../../../theme/theme';

const FALLBACK_GIGS = [
    { id: 1, title: 'Electrician Needed — Emergency', employer: 'Amir Khan', distance: '0.4 km', pay: '₹800', urgent: true, timePosted: '8 min ago', category: 'Trades' },
    { id: 2, title: 'AC Repair Assistant', employer: 'Sharma Cooling Co.', distance: '1.2 km', pay: '₹600', urgent: false, timePosted: '1h ago', category: 'Trades' },
    { id: 3, title: 'Delivery Run — Gachibowli Loop', employer: 'QuickMove Logistics', distance: '1.8 km', pay: '₹350', urgent: false, timePosted: '2h ago', category: 'Delivery' },
];

const FALLBACK_PROS = [
    { id: 1, name: 'Siva Kumar', role: 'Electrician', distance: '0.6 km', karma: 890, available: true, avatar: 'https://i.pravatar.cc/150?u=siva' },
    { id: 2, name: 'Priya R.', role: 'Tailor', distance: '1.1 km', karma: 420, available: true, avatar: 'https://i.pravatar.cc/150?u=priya' },
    { id: 3, name: 'Raju D.', role: 'Auto Driver', distance: '2.0 km', karma: 650, available: false, avatar: 'https://i.pravatar.cc/150?u=raju' },
];

const getCategoryTone = (label = '') => {
    const normalized = String(label).toLowerCase();
    if (normalized.includes('trade')) return { bg: theme.primaryLight, fg: theme.primaryDark };
    if (normalized.includes('delivery')) return { bg: theme.indigo, fg: theme.surface };
    if (normalized.includes('operation')) return { bg: theme.warning, fg: theme.surface };
    return { bg: theme.border, fg: theme.textSecondary };
};

const PulseGigCard = memo(function PulseGigCardComponent({
    gig,
    isApplied,
    onApplyGig,
}) {
    const tone = useMemo(() => getCategoryTone(gig.category), [gig.category]);
    const categoryBadgeStyle = useMemo(() => ({ backgroundColor: tone.bg }), [tone.bg]);
    const categoryBadgeTextStyle = useMemo(() => ({ color: tone.fg }), [tone.fg]);

    const applyBtnStyle = isApplied ? styles.applyBtnDone : styles.applyBtn;
    const applyTextStyle = isApplied ? styles.applyBtnTextDone : styles.applyBtnText;

    const handleApply = useCallback(() => {
        if (!isApplied) onApplyGig(gig);
    }, [isApplied, onApplyGig, gig]);

    return (
        <View style={styles.gigCard}>
            <View style={styles.gigTop}>
                <View style={styles.gigTopLeft}>
                    <View style={styles.titleRow}>
                        <Text style={styles.gigTitle}>{gig.title}</Text>
                        {gig.urgent ? (
                            <View style={styles.urgentBadge}>
                                <Text style={styles.urgentBadgeText}>URGENT</Text>
                            </View>
                        ) : null}
                    </View>
                    <Text style={styles.gigEmployer}>{gig.employer}</Text>
                </View>
                <View style={[styles.categoryBadge, categoryBadgeStyle]}>
                    <Text style={[styles.categoryBadgeText, categoryBadgeTextStyle]}>{gig.category}</Text>
                </View>
            </View>

            <View style={styles.gigBottom}>
                <Text style={styles.gigMeta}>📍 {gig.distance}  🕐 {gig.timePosted}</Text>
                <View style={styles.gigBottomRight}>
                    <Text style={styles.gigPay}>{gig.pay}</Text>
                    <TouchableOpacity style={applyBtnStyle} onPress={handleApply} disabled={isApplied}>
                        <Text style={applyTextStyle}>{isApplied ? 'SENT ✓' : 'APPLY NOW'}</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
});

const PulseProCard = memo(function PulseProCardComponent({
    pro,
    isRequested,
    onHirePro,
}) {
    const availabilityDotStyle = useMemo(() => ({
        backgroundColor: pro.available ? theme.success : theme.textMuted,
    }), [pro.available]);

    const hireBtnStyle = isRequested ? styles.hireBtnDone : styles.hireBtn;
    const hireBtnTextStyle = isRequested ? styles.hireBtnTextDone : styles.hireBtnText;

    const handleHire = useCallback(() => {
        if (!isRequested) onHirePro(pro);
    }, [isRequested, onHirePro, pro]);

    return (
        <View style={styles.proCard}>
            <View style={styles.proAvatarWrap}>
                <Image source={{ uri: pro.avatar }} style={styles.proAvatar} />
                <View style={[styles.availabilityDot, availabilityDotStyle]} />
            </View>
            <View style={styles.proMain}>
                <Text style={styles.proName}>{pro.name}</Text>
                <Text style={styles.proMeta}>{pro.role} · 📍 {pro.distance}</Text>
            </View>
            <View style={styles.karmaBadge}>
                <Text style={styles.karmaBadgeText}>{pro.karma} KARMA</Text>
            </View>
            {pro.available ? (
                <TouchableOpacity style={hireBtnStyle} onPress={handleHire} disabled={isRequested}>
                    <Text style={hireBtnTextStyle}>{isRequested ? 'SENT ✓' : 'HIRE'}</Text>
                </TouchableOpacity>
            ) : (
                <View style={styles.busyTag}>
                    <Text style={styles.busyTagText}>BUSY</Text>
                </View>
            )}
        </View>
    );
});

function PulseTabComponent({
    pulseItems,
    appliedGigIds,
    hiredProIds,
    radarRefreshing,
    pulseAnim,
    onRefreshRadar,
    onApplyGig,
    onHirePro,
    contentContainerStyle,
}) {
    const nearbyGigs = useMemo(() => {
        return pulseItems.length > 0 ? pulseItems : FALLBACK_GIGS;
    }, [pulseItems]);

    const nearbyPros = FALLBACK_PROS;

    const pulseScale = pulseAnim.interpolate({
        inputRange: [0.3, 1],
        outputRange: [0.9, 1.08],
    });
    const pulseRadarAnimatedStyle = useMemo(() => ({
        opacity: pulseAnim,
        transform: [{ scale: pulseScale }],
    }), [pulseAnim, pulseScale]);

    const keyExtractor = useCallback((item) => String(item.id), []);

    const renderGigItem = useCallback(({ item }) => {
        const isApplied = appliedGigIds.has(item.id);
        return (
            <PulseGigCard
                gig={item}
                isApplied={isApplied}
                onApplyGig={onApplyGig}
            />
        );
    }, [appliedGigIds, onApplyGig]);

    const listHeader = useMemo(() => (
        <>
            <View style={styles.pulseCard}>
                <View style={styles.pulseBgEffect} />
                <View style={styles.pulseContent}>
                    <Animated.View style={[styles.pulseRadarOuter, pulseRadarAnimatedStyle]}>
                        <View style={styles.pulseRadarInner} />
                    </Animated.View>
                    <Text style={styles.pulseTitle}>Live Radar</Text>
                    <Text style={styles.pulseSub}>{nearbyGigs.length} urgent gigs · {nearbyPros.length} pros within 2km</Text>
                    <TouchableOpacity
                        style={[styles.pulseBtn, radarRefreshing && styles.pulseBtnDisabled]}
                        onPress={onRefreshRadar}
                        disabled={radarRefreshing}
                        activeOpacity={0.85}
                    >
                        {radarRefreshing ? <ActivityIndicator size="small" color={theme.surface} style={styles.buttonLoader} /> : null}
                        <Text style={styles.pulseBtnText}>{radarRefreshing ? 'SCANNING...' : 'SEARCH LOCAL GIGS'}</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.sectionHeaderRow}>
                <IconMapPin size={16} color={theme.primary} />
                <Text style={styles.sectionTitle}>URGENT GIGS NEAR YOU</Text>
            </View>
        </>
    ), [nearbyGigs.length, nearbyPros.length, pulseRadarAnimatedStyle, radarRefreshing, onRefreshRadar]);

    const listFooter = useMemo(() => (
        <>
            <View style={[styles.sectionHeaderRow, styles.sectionHeaderMargin]}>
                <IconUsers size={16} color={theme.primary} />
                <Text style={styles.sectionTitle}>PROFESSIONALS ONLINE NEARBY</Text>
            </View>
            {nearbyPros.map((pro) => {
                const isRequested = hiredProIds.has(pro.id);
                return (
                    <PulseProCard key={pro.id} pro={pro} isRequested={isRequested} onHirePro={onHirePro} />
                );
            })}
            <View style={styles.bottomSpacer} />
        </>
    ), [nearbyPros, hiredProIds, onHirePro]);

    return (
        <FlatList
            data={nearbyGigs}
            keyExtractor={keyExtractor}
            renderItem={renderGigItem}
            ListHeaderComponent={listHeader}
            ListFooterComponent={listFooter}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={contentContainerStyle}
            removeClippedSubviews
            windowSize={10}
            maxToRenderPerBatch={8}
            initialNumToRender={8}
        />
    );
}

export default memo(PulseTabComponent);

const styles = StyleSheet.create({
    pulseCard: {
        backgroundColor: theme.darkCard,
        borderRadius: 40,
        overflow: 'hidden',
        minHeight: 300,
        marginBottom: 24,
    },
    pulseBgEffect: {
        position: 'absolute',
        top: -50,
        left: -50,
        right: -50,
        bottom: -50,
        backgroundColor: theme.primary,
        opacity: 0.15,
        borderRadius: RADIUS.full,
    },
    pulseContent: {
        position: 'relative',
        zIndex: 10,
        padding: 32,
        alignItems: 'center',
        justifyContent: 'center',
    },
    pulseRadarOuter: {
        width: 80,
        height: 80,
        borderRadius: RADIUS.full,
        backgroundColor: theme.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
        borderWidth: 4,
        borderColor: theme.primaryDark,
    },
    pulseRadarInner: {
        width: 12,
        height: 12,
        borderRadius: RADIUS.full,
        backgroundColor: theme.primaryLight,
    },
    pulseTitle: {
        fontSize: 24,
        fontWeight: '900',
        color: theme.surface,
        marginBottom: 8,
    },
    pulseSub: {
        fontSize: 12,
        color: theme.textMuted,
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 18,
        paddingHorizontal: 16,
    },
    pulseBtn: {
        backgroundColor: theme.primary,
        paddingHorizontal: 32,
        paddingVertical: 14,
        borderRadius: RADIUS.lg,
        flexDirection: 'row',
        alignItems: 'center',
    },
    pulseBtnDisabled: {
        opacity: 0.75,
    },
    buttonLoader: {
        marginRight: 8,
    },
    pulseBtnText: {
        fontSize: 14,
        fontWeight: '900',
        color: theme.surface,
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        gap: 8,
    },
    sectionHeaderMargin: {
        marginTop: 8,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: '900',
        color: theme.textPrimary,
        letterSpacing: 1,
    },
    gigCard: {
        backgroundColor: theme.surface,
        borderRadius: RADIUS.lg,
        padding: 14,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: theme.borderMedium,
    },
    gigTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    gigTopLeft: {
        flex: 1,
        marginRight: 8,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        marginBottom: 2,
    },
    gigTitle: {
        fontSize: 13,
        fontWeight: '900',
        color: theme.textPrimary,
        marginRight: 6,
    },
    gigEmployer: {
        fontSize: 10,
        fontWeight: '700',
        color: theme.textMuted,
        marginTop: 2,
    },
    urgentBadge: {
        backgroundColor: theme.error,
        borderRadius: RADIUS.full,
        paddingHorizontal: 6,
        paddingVertical: 2,
        marginLeft: 6,
    },
    urgentBadgeText: {
        fontSize: 9,
        fontWeight: '900',
        color: theme.surface,
    },
    categoryBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: RADIUS.sm,
    },
    categoryBadgeText: {
        fontSize: 9,
        fontWeight: '800',
    },
    gigBottom: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    gigMeta: {
        fontSize: 10,
        color: theme.textMuted,
        fontWeight: '600',
    },
    gigBottomRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    gigPay: {
        fontSize: 15,
        fontWeight: '900',
        color: theme.primary,
    },
    applyBtn: {
        backgroundColor: theme.darkCard,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: RADIUS.md,
    },
    applyBtnDone: {
        backgroundColor: theme.primaryLight,
    },
    applyBtnText: {
        fontSize: 10,
        fontWeight: '900',
        color: theme.surface,
    },
    applyBtnTextDone: {
        color: theme.primary,
    },
    proCard: {
        backgroundColor: theme.surface,
        borderRadius: RADIUS.lg,
        padding: 14,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: theme.borderMedium,
        flexDirection: 'row',
        alignItems: 'center',
    },
    proAvatarWrap: {
        position: 'relative',
        marginRight: 12,
    },
    proAvatar: {
        width: 48,
        height: 48,
        borderRadius: RADIUS.lg,
        backgroundColor: theme.borderMedium,
    },
    availabilityDot: {
        position: 'absolute',
        bottom: -1,
        right: -1,
        width: 14,
        height: 14,
        borderRadius: RADIUS.full,
        borderWidth: 2,
        borderColor: theme.surface,
    },
    proMain: {
        flex: 1,
    },
    proName: {
        fontSize: 14,
        fontWeight: '800',
        color: theme.textPrimary,
    },
    proMeta: {
        fontSize: 10,
        fontWeight: '600',
        color: theme.textMuted,
        marginTop: 2,
    },
    karmaBadge: {
        backgroundColor: theme.primaryLight,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: RADIUS.md,
    },
    karmaBadgeText: {
        fontSize: 10,
        fontWeight: '900',
        color: theme.primary,
    },
    hireBtn: {
        backgroundColor: theme.darkCard,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: RADIUS.md,
        marginLeft: 8,
    },
    hireBtnDone: {
        backgroundColor: theme.primaryLight,
    },
    hireBtnText: {
        fontSize: 10,
        fontWeight: '900',
        color: theme.surface,
    },
    hireBtnTextDone: {
        color: theme.primary,
    },
    busyTag: {
        backgroundColor: theme.border,
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderRadius: RADIUS.md,
        marginLeft: 8,
    },
    busyTagText: {
        fontSize: 10,
        fontWeight: '700',
        color: theme.textMuted,
    },
    bottomSpacer: {
        height: 32,
    },
});
