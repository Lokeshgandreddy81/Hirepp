import React, { memo, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Animated, FlatList } from 'react-native';
import { IconMapPin, IconUsers } from '../../../components/Icons';
import { RADIUS, SHADOWS, SPACING } from '../../../theme/theme';
import { connectPalette, connectShadow } from '../connectPalette';
import SkeletonLoader from '../../../components/SkeletonLoader';

const getCategoryTone = (label = '') => {
    const normalized = String(label).toLowerCase();
    if (normalized.includes('trade')) return { bg: connectPalette.accentSoft, fg: connectPalette.accentDark };
    if (normalized.includes('delivery')) return { bg: connectPalette.accent, fg: connectPalette.surface };
    if (normalized.includes('operation')) return { bg: connectPalette.warning, fg: connectPalette.surface };
    return { bg: '#f1f3f8', fg: connectPalette.muted };
};

const PulseGigCard = memo(function PulseGigCardComponent({
    gig,
    canApply,
    isApplied,
    onApplyGig,
}) {
    const tone = useMemo(() => getCategoryTone(gig.category), [gig.category]);
    const categoryBadgeStyle = useMemo(() => ({ backgroundColor: tone.bg }), [tone.bg]);
    const categoryBadgeTextStyle = useMemo(() => ({ color: tone.fg }), [tone.fg]);

    const applyBtnStyle = isApplied ? styles.applyBtnDone : styles.applyBtn;
    const applyTextStyle = isApplied ? styles.applyBtnTextDone : styles.applyBtnText;

    const handleApply = useCallback(() => {
        if (!canApply || isApplied) return;
        onApplyGig(gig);
    }, [canApply, isApplied, onApplyGig, gig]);

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
                    <View style={styles.gigProofRow}>
                        <Text style={styles.gigProofText}>{Number(gig.engagementCount || gig.applicantsCount || 0)} active responses</Text>
                        <Text style={styles.gigProofDot}>•</Text>
                        <Text style={styles.gigProofText}>{gig.responseTime || 'Fast reply'}</Text>
                    </View>
                </View>
                <View style={[styles.categoryBadge, categoryBadgeStyle]}>
                    <Text style={[styles.categoryBadgeText, categoryBadgeTextStyle]}>{gig.category}</Text>
                </View>
            </View>

            <View style={styles.gigBottom}>
                <Text style={styles.gigMeta}>📍 {gig.distance}  🕐 {gig.timePosted}</Text>
                <View style={styles.gigBottomRight}>
                    <Text style={styles.gigPay}>{gig.pay}</Text>
                    {canApply ? (
                        <TouchableOpacity style={applyBtnStyle} onPress={handleApply} disabled={isApplied}>
                            <Text style={applyTextStyle}>{isApplied ? 'SENT ✓' : 'APPLY NOW'}</Text>
                        </TouchableOpacity>
                    ) : (
                        <View style={styles.updateBadge}>
                            <Text style={styles.updateBadgeText}>UPDATE</Text>
                        </View>
                    )}
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
    const safePro = (pro && typeof pro === 'object') ? pro : {};
    const proName = String(safePro.name || 'Professional').trim() || 'Professional';
    const proRole = String(safePro.role || 'Pro').trim() || 'Pro';
    const proDistance = String(safePro.distance || 'Nearby').trim() || 'Nearby';
    const proKarma = String(safePro.karma || '0').trim() || '0';
    const proAvatar = String(safePro.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(proName)}&background=8b3dff&color=fff&rounded=true`);

    const availabilityDotStyle = useMemo(() => ({
        backgroundColor: safePro.available ? connectPalette.success : connectPalette.subtle,
    }), [safePro.available]);

    const hireBtnStyle = isRequested ? styles.hireBtnDone : styles.hireBtn;
    const hireBtnTextStyle = isRequested ? styles.hireBtnTextDone : styles.hireBtnText;

    const handleHire = useCallback(() => {
        if (!isRequested) onHirePro(safePro);
    }, [isRequested, onHirePro, safePro]);

    return (
        <View style={styles.proCard}>
            <View style={styles.proAvatarWrap}>
                <Image source={{ uri: proAvatar }} style={styles.proAvatar} />
                <View style={[styles.availabilityDot, availabilityDotStyle]} />
            </View>
            <View style={styles.proMain}>
                <Text style={styles.proName}>{proName}</Text>
                <Text style={styles.proMeta}>{proRole} · 📍 {proDistance}</Text>
            </View>
            <View style={styles.karmaBadge}>
                <Text style={styles.karmaBadgeText}>{proKarma} KARMA</Text>
            </View>
            {safePro.available ? (
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
    nearbyPros,
    isEmployerRole,
    appliedGigIds,
    hiredProIds,
    radarRefreshing,
    pulseAnim,
    onRefreshRadar,
    onApplyGig,
    onHirePro,
    contentContainerStyle,
}) {
    const safePulseItems = useMemo(() => (
        Array.isArray(pulseItems)
            ? pulseItems.filter((item) => item && typeof item === 'object')
            : []
    ), [pulseItems]);
    const safeAppliedGigIds = appliedGigIds instanceof Set ? appliedGigIds : new Set();
    const safeHiredProIds = hiredProIds instanceof Set ? hiredProIds : new Set();
    const nearbyGigs = useMemo(() => safePulseItems, [safePulseItems]);
    const safeNearbyPros = useMemo(() => (
        Array.isArray(nearbyPros)
            ? nearbyPros.filter((item) => item && typeof item === 'object')
            : []
    ), [nearbyPros]);

    const pulseScale = pulseAnim.interpolate({
        inputRange: [0.3, 1],
        outputRange: [0.9, 1.08],
    });
    const pulseRadarAnimatedStyle = useMemo(() => ({
        opacity: pulseAnim,
        transform: [{ scale: pulseScale }],
    }), [pulseAnim, pulseScale]);

    const keyExtractor = useCallback((item, index) => String(item?.id || `pulse-${index}`), []);

    const renderGigItem = useCallback(({ item }) => {
        const safeItem = (item && typeof item === 'object') ? item : {};
        const actionId = String(safeItem.jobId || safeItem.id || '').trim();
        const canApply = Boolean(safeItem?.canApply) && Boolean(String(safeItem?.jobId || '').trim());
        const isApplied = canApply && safeAppliedGigIds.has(actionId);
        return (
            <PulseGigCard
                gig={safeItem}
                canApply={canApply}
                isApplied={isApplied}
                onApplyGig={onApplyGig}
            />
        );
    }, [safeAppliedGigIds, onApplyGig]);

    const listHeader = useMemo(() => (
        <>
            <View style={styles.pulseCard}>
                <View style={styles.pulseBgEffect} />
                <View style={styles.pulseContent}>
                    <Animated.View style={[styles.pulseRadarOuter, pulseRadarAnimatedStyle]}>
                        <View style={styles.pulseRadarInner} />
                    </Animated.View>
                    <Text style={styles.pulseTitle}>Live Radar</Text>
                    <Text style={styles.pulseSub}>{nearbyGigs.length} urgent gigs · {safeNearbyPros.length} pros within 2km</Text>
                    <View style={styles.trendingTag}>
                        <Text style={styles.trendingTagText}>Trending right now</Text>
                    </View>
                    <TouchableOpacity
                        style={[styles.pulseBtn, radarRefreshing && styles.pulseBtnDisabled]}
                        onPress={onRefreshRadar}
                        disabled={radarRefreshing}
                        activeOpacity={0.85}
                    >
                        {radarRefreshing ? <SkeletonLoader width={14} height={14} borderRadius={RADIUS.full} style={styles.buttonLoader} tone="tint" /> : null}
                        <Text style={styles.pulseBtnText}>{radarRefreshing ? 'SCANNING...' : 'SEARCH LOCAL GIGS'}</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.sectionHeaderRow}>
                <IconMapPin size={16} color={connectPalette.accent} />
                <Text style={styles.sectionTitle}>URGENT GIGS NEAR YOU</Text>
            </View>
        </>
    ), [nearbyGigs.length, safeNearbyPros.length, pulseRadarAnimatedStyle, radarRefreshing, onRefreshRadar]);

    const listFooter = useMemo(() => (
        <>
            {safeNearbyPros.length > 0 ? (
                <>
                    <View style={[styles.sectionHeaderRow, styles.sectionHeaderMargin]}>
                        <IconUsers size={16} color={connectPalette.accent} />
                        <Text style={styles.sectionTitle}>PROFESSIONALS READY TO HIRE</Text>
                    </View>
                    {safeNearbyPros.map((pro, index) => {
                        const proId = String(pro?.id || `pro-${index}`);
                        const isRequested = safeHiredProIds.has(proId);
                        return (
                            <PulseProCard key={proId} pro={pro} isRequested={isRequested} onHirePro={onHirePro} />
                        );
                    })}
                </>
            ) : isEmployerRole ? (
                <View style={styles.emptyStateCard}>
                    <Text style={styles.emptyStateTitle}>No candidates yet.</Text>
                    <Text style={styles.emptyStateSubtitle}>Post jobs and applicants will surface here with ranked match quality.</Text>
                </View>
            ) : null}
            <View style={styles.bottomSpacer} />
        </>
    ), [safeNearbyPros, safeHiredProIds, onHirePro, isEmployerRole]);

    return (
        <FlatList
            data={nearbyGigs}
            keyExtractor={keyExtractor}
            renderItem={renderGigItem}
            ListHeaderComponent={listHeader}
            ListFooterComponent={listFooter}
            ListEmptyComponent={(
                <View style={styles.emptyStateCard}>
                    <Text style={styles.emptyStateTitle}>No posts yet.</Text>
                    <Text style={styles.emptyStateSubtitle}>Pulse jobs will appear here when employers publish urgent needs.</Text>
                </View>
            )}
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
        backgroundColor: connectPalette.dark,
        borderRadius: 34,
        overflow: 'hidden',
        minHeight: 290,
        marginBottom: 24,
        ...SHADOWS.lg,
    },
    pulseBgEffect: {
        position: 'absolute',
        top: -50,
        left: -50,
        right: -50,
        bottom: -50,
        backgroundColor: connectPalette.accent,
        opacity: 0.22,
        borderRadius: RADIUS.full,
    },
    pulseContent: {
        position: 'relative',
        zIndex: 10,
        padding: SPACING.xl,
        alignItems: 'center',
        justifyContent: 'center',
    },
    pulseRadarOuter: {
        width: 80,
        height: 80,
        borderRadius: RADIUS.full,
        backgroundColor: connectPalette.accent,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
        borderWidth: 4,
        borderColor: '#5b23b0',
        ...SHADOWS.md,
    },
    pulseRadarInner: {
        width: 12,
        height: 12,
        borderRadius: RADIUS.full,
        backgroundColor: '#ccb0ff',
    },
    pulseTitle: {
        fontSize: 24,
        fontWeight: '800',
        color: connectPalette.surface,
        marginBottom: 8,
    },
    pulseSub: {
        fontSize: 12,
        color: '#bbc3dd',
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 18,
        paddingHorizontal: 16,
    },
    trendingTag: {
        borderRadius: RADIUS.full,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.25)',
        backgroundColor: 'rgba(255,255,255,0.12)',
        paddingHorizontal: 10,
        paddingVertical: 5,
        marginBottom: 12,
    },
    trendingTagText: {
        color: '#f8fafc',
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 0.35,
    },
    pulseBtn: {
        backgroundColor: connectPalette.accent,
        paddingHorizontal: SPACING.xl,
        paddingVertical: 14,
        borderRadius: RADIUS.lg,
        flexDirection: 'row',
        alignItems: 'center',
        ...SHADOWS.md,
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
        color: connectPalette.surface,
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
        fontWeight: '800',
        color: connectPalette.text,
        letterSpacing: 1,
    },
    gigCard: {
        backgroundColor: connectPalette.surface,
        borderRadius: RADIUS.lg,
        padding: 14,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: connectPalette.line,
        ...SHADOWS.md,
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
        fontWeight: '800',
        color: connectPalette.text,
        marginRight: 6,
    },
    gigEmployer: {
        fontSize: 10,
        fontWeight: '700',
        color: connectPalette.subtle,
        marginTop: 2,
    },
    gigProofRow: {
        marginTop: 4,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    gigProofText: {
        fontSize: 10,
        color: '#475569',
        fontWeight: '700',
    },
    gigProofDot: {
        fontSize: 10,
        color: '#94a3b8',
    },
    urgentBadge: {
        backgroundColor: connectPalette.danger,
        borderRadius: RADIUS.full,
        paddingHorizontal: 6,
        paddingVertical: 2,
        marginLeft: 6,
    },
    urgentBadgeText: {
        fontSize: 9,
        fontWeight: '900',
        color: connectPalette.surface,
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
        color: connectPalette.subtle,
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
        color: connectPalette.accentDark,
    },
    applyBtn: {
        backgroundColor: connectPalette.dark,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: RADIUS.md,
    },
    applyBtnDone: {
        backgroundColor: connectPalette.accentSoft,
    },
    applyBtnText: {
        fontSize: 10,
        fontWeight: '900',
        color: connectPalette.surface,
    },
    applyBtnTextDone: {
        color: connectPalette.accentDark,
    },
    updateBadge: {
        borderRadius: RADIUS.md,
        borderWidth: 1,
        borderColor: '#dbe7ff',
        backgroundColor: '#f8fbff',
        paddingHorizontal: 10,
        paddingVertical: 8,
    },
    updateBadgeText: {
        fontSize: 10,
        fontWeight: '800',
        color: '#64748b',
        letterSpacing: 0.3,
    },
    proCard: {
        backgroundColor: connectPalette.surface,
        borderRadius: RADIUS.lg,
        padding: 14,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: connectPalette.line,
        flexDirection: 'row',
        alignItems: 'center',
        ...connectShadow,
    },
    proAvatarWrap: {
        position: 'relative',
        marginRight: 12,
    },
    proAvatar: {
        width: 48,
        height: 48,
        borderRadius: RADIUS.lg,
        backgroundColor: connectPalette.lineStrong,
    },
    availabilityDot: {
        position: 'absolute',
        bottom: -1,
        right: -1,
        width: 14,
        height: 14,
        borderRadius: RADIUS.full,
        borderWidth: 2,
        borderColor: connectPalette.surface,
    },
    proMain: {
        flex: 1,
    },
    proName: {
        fontSize: 14,
        fontWeight: '800',
        color: connectPalette.text,
    },
    proMeta: {
        fontSize: 10,
        fontWeight: '600',
        color: connectPalette.subtle,
        marginTop: 2,
    },
    karmaBadge: {
        backgroundColor: connectPalette.accentSoft,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: RADIUS.md,
    },
    karmaBadgeText: {
        fontSize: 10,
        fontWeight: '900',
        color: connectPalette.accentDark,
    },
    hireBtn: {
        backgroundColor: connectPalette.dark,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: RADIUS.md,
        marginLeft: 8,
    },
    hireBtnDone: {
        backgroundColor: connectPalette.accentSoft,
    },
    hireBtnText: {
        fontSize: 10,
        fontWeight: '900',
        color: connectPalette.surface,
    },
    hireBtnTextDone: {
        color: connectPalette.accentDark,
    },
    busyTag: {
        backgroundColor: '#eef1f8',
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderRadius: RADIUS.md,
        marginLeft: 8,
    },
    busyTagText: {
        fontSize: 10,
        fontWeight: '700',
        color: connectPalette.subtle,
    },
    emptyStateCard: {
        marginTop: 14,
        borderRadius: RADIUS.lg,
        borderWidth: 1,
        borderColor: connectPalette.line,
        backgroundColor: connectPalette.surface,
        paddingVertical: 20,
        paddingHorizontal: 16,
    },
    emptyStateTitle: {
        fontSize: 15,
        fontWeight: '800',
        color: connectPalette.text,
        marginBottom: 6,
    },
    emptyStateSubtitle: {
        fontSize: 12,
        color: connectPalette.muted,
        lineHeight: 18,
    },
    bottomSpacer: {
        height: 32,
    },
});
