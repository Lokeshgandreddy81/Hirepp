import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

import { AnimatedCard } from './AnimatedCard';
import { IconBookmark, IconBookmarkFilled, IconShare } from './Icons';
import { getTierColor, getDisplayScorePercent, buildMatchReasons, isMatchTier } from '../utils/matchUi';

const JobCard = ({
    item,
    onPress,
    onShare,
    onToggleSave,
    isSaved,
    onReport,
    isHistory,
    isReported,
    showMatchInsights,
    onReasonPress,
}) => {
    const tier = String(item?.tier || '').toUpperCase();
    const shouldShowTier = showMatchInsights && isMatchTier(tier);
    const scorePercent = getDisplayScorePercent(item);
    const reasons = shouldShowTier
        ? buildMatchReasons({
            explainability: item?.explainability || {},
            distanceKm: item?.distanceKm,
            max: 3,
        })
        : [];

    return (
        <AnimatedCard
            style={[
                styles.card,
                isHistory && styles.cardHistory,
                isReported && styles.cardReported,
            ]}
            onPress={() => onPress?.(item)}
            onLongPress={() => onReport?.(item)}
        >
            {isReported ? (
                <View style={styles.reportedBadge}>
                    <Text style={styles.reportedBadgeText}>Reported</Text>
                </View>
            ) : null}

            <View style={styles.actionButtonsContainerAbsolute}>
                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => onShare?.(item)}
                    activeOpacity={0.7}
                    hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
                >
                    <IconShare size={20} color="#94a3b8" />
                </TouchableOpacity>
                {!isHistory ? (
                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => onToggleSave?.(item?._id)}
                        activeOpacity={0.7}
                        hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
                    >
                        {isSaved ? (
                            <IconBookmarkFilled size={20} color="#9333ea" />
                        ) : (
                            <IconBookmark size={20} color="#94a3b8" />
                        )}
                    </TouchableOpacity>
                ) : null}
            </View>

            <View style={styles.cardHeader}>
                <Text style={styles.jobTitle} numberOfLines={1}>{item?.title || 'Untitled Job'}</Text>
                <Text style={styles.companyName}>{item?.companyName || 'Unknown Company'}</Text>
            </View>

            <View style={styles.metaRow}>
                <Text style={styles.salaryText}>{item?.salaryRange || 'Unspecified'}</Text>
                {showMatchInsights ? (
                    <View style={styles.scorePill}>
                        <Text style={styles.scorePillText}>{scorePercent}% match</Text>
                    </View>
                ) : null}
            </View>

            {shouldShowTier ? (
                <View style={[styles.tierBadge, { backgroundColor: getTierColor(tier) }]}>
                    <Text style={styles.tierBadgeText}>{tier}</Text>
                </View>
            ) : null}

            <View style={styles.tagsContainer}>
                {(item?.requirements || []).slice(0, 3).map((req, index) => (
                    <View key={`${item?._id || 'job'}-req-${index}`} style={styles.skillTag}>
                        <Text style={styles.skillTagText}>{req}</Text>
                    </View>
                ))}
            </View>

            {shouldShowTier && reasons.length > 0 ? (
                <View style={styles.reasonsContainer}>
                    {reasons.map((reason) => (
                        <TouchableOpacity
                            key={`${item?._id || 'job'}-reason-${reason.id}`}
                            style={styles.reasonRow}
                            onPress={() => onReasonPress?.(item, reason)}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.reasonText}>• {reason.label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            ) : null}

            <View style={styles.cardFooter}>
                <Text style={styles.locationText}>📍 {item?.location || 'Unknown'}</Text>
                <Text style={styles.postedTimeText}>Posted {item?.postedTime || 'Recently'}</Text>
            </View>

            {isHistory ? (
                <TouchableOpacity style={styles.reApplyBtn} onPress={() => onPress?.(item)}>
                    <Text style={styles.reApplyBtnText}>Re-Apply</Text>
                </TouchableOpacity>
            ) : null}
        </AnimatedCard>
    );
};

export default memo(JobCard);

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#ffffff',
        borderRadius: 20,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
        position: 'relative',
        overflow: 'hidden',
    },
    cardHistory: { opacity: 0.72 },
    cardReported: { opacity: 0.6 },
    reportedBadge: {
        position: 'absolute',
        top: 0,
        left: 0,
        backgroundColor: '#fee2e2',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderBottomRightRadius: 8,
    },
    reportedBadgeText: { fontSize: 9, fontWeight: '900', color: '#ef4444' },
    actionButtonsContainerAbsolute: {
        position: 'absolute',
        top: 12,
        right: 12,
        zIndex: 10,
        flexDirection: 'row',
        gap: 8,
    },
    actionButton: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: 4,
    },
    cardHeader: {
        marginBottom: 8,
        paddingRight: 64,
    },
    jobTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1e293b',
    },
    companyName: {
        fontSize: 14,
        fontWeight: '500',
        color: '#64748b',
    },
    metaRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
        paddingRight: 48,
    },
    salaryText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#334155',
    },
    scorePill: {
        backgroundColor: '#eef2ff',
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderWidth: 1,
        borderColor: '#c7d2fe',
    },
    scorePillText: {
        color: '#3730a3',
        fontSize: 11,
        fontWeight: '700',
    },
    tierBadge: {
        alignSelf: 'flex-start',
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 4,
        marginBottom: 8,
    },
    tierBadgeText: {
        color: '#ffffff',
        fontSize: 11,
        fontWeight: '800',
    },
    tagsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginVertical: 10,
    },
    skillTag: {
        backgroundColor: '#f1f5f9',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    skillTagText: {
        fontSize: 12,
        color: '#475569',
    },
    reasonsContainer: {
        marginBottom: 8,
    },
    reasonRow: {
        paddingVertical: 2,
    },
    reasonText: {
        fontSize: 12,
        color: '#1e293b',
        fontWeight: '600',
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: '#f8fafc',
        paddingTop: 12,
        marginTop: 4,
    },
    locationText: {
        fontSize: 14,
        color: '#64748b',
    },
    postedTimeText: {
        fontSize: 11,
        color: '#94a3b8',
        fontWeight: '600',
    },
    reApplyBtn: {
        marginTop: 10,
        backgroundColor: '#faf5ff',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 10,
        alignSelf: 'flex-start',
        borderWidth: 1,
        borderColor: '#e9d5ff',
    },
    reApplyBtnText: { fontSize: 12, fontWeight: '700', color: '#9333ea' },
});
