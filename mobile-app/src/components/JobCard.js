import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { AnimatedCard } from './AnimatedCard';
import { getDisplayScorePercent, getTierDefaultRatio } from '../utils/matchUi';
import { RADIUS, SHADOWS, SPACING, theme } from '../theme/theme';

const JOB_ACCENT_DARK = '#6d28d9';
const JOB_ACCENT_BORDER = '#ddd6fe';
const JOB_ACCENT_TEXT = '#6d28d9';

const JobCard = ({
    item,
    onPress,
    onReport,
    isReported,
    showMatchInsights: _showMatchInsights,
}) => {
    const scorePercent = getDisplayScorePercent(item);
    const fallbackTierPercent = Math.round(getTierDefaultRatio(item?.tier) * 100);
    const resolvedScorePercent = scorePercent > 0 ? scorePercent : fallbackTierPercent;
    const shouldShowMatchBadge = Number.isFinite(resolvedScorePercent) && resolvedScorePercent > 0;
    const salaryLabel = String(item?.salaryRange || 'Salary not shared');
    const postedMeta = String(item?.postedTime || 'Just now');
    const postedLabel = postedMeta.toLowerCase().startsWith('posted') ? postedMeta : `Posted ${postedMeta}`;
    const locationLabel = String(item?.location || item?.distanceLabel || 'Location not shared');
    const skillTags = Array.isArray(item?.requirements)
        ? item.requirements
            .filter((entry) => typeof entry === 'string' && entry.trim().length > 0)
            .map((entry) => entry.trim())
            .slice(0, 3)
        : [];

    return (
        <AnimatedCard
            style={[
                styles.card,
                isReported && styles.cardReported,
            ]}
            onPress={() => onPress?.(item)}
            onLongPress={() => onReport?.(item)}
        >
            {shouldShowMatchBadge ? (
                <LinearGradient
                    colors={['#ede9fe', '#f5f3ff']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.matchCornerBadge}
                >
                    <Text style={styles.matchCornerText}>{resolvedScorePercent}% MATCH</Text>
                </LinearGradient>
            ) : null}

            {isReported ? (
                <View style={styles.reportedBadge}>
                    <Text style={styles.reportedBadgeText}>Reported</Text>
                </View>
            ) : null}

            <View style={[styles.contentWrap, shouldShowMatchBadge && styles.contentWrapWithBadge]}>
                <Text style={styles.jobTitle} numberOfLines={1}>{item?.title || 'Untitled Job'}</Text>
                <Text style={styles.companyName} numberOfLines={1}>{item?.companyName || 'Unknown Company'}</Text>

                {skillTags.length ? (
                    <View style={styles.skillsWrap}>
                        {skillTags.map((skill, index) => (
                            <View key={`${item?._id || item?.title || 'job'}-skill-${index}`} style={styles.skillChip}>
                                <Text style={styles.skillChipText} numberOfLines={1}>{skill}</Text>
                            </View>
                        ))}
                    </View>
                ) : null}
            </View>

            <View style={styles.divider} />

            <View style={styles.bottomRow}>
                <View style={styles.locationWrap}>
                    <Text style={styles.locationPin}>📍</Text>
                    <Text style={styles.locationText} numberOfLines={1}>
                        {locationLabel}
                    </Text>
                </View>

                <View style={styles.salaryMetaWrap}>
                    <Text style={styles.salaryText} numberOfLines={1}>{salaryLabel}</Text>
                    <Text style={styles.postedTimeText} numberOfLines={1}>{postedLabel}</Text>
                </View>
            </View>
        </AnimatedCard>
    );
};

export default memo(JobCard);

const styles = StyleSheet.create({
    card: {
        backgroundColor: 'rgba(255,255,255,0.99)',
        borderRadius: RADIUS.lg,
        paddingHorizontal: SPACING.sm + 1,
        paddingVertical: SPACING.sm,
        marginBottom: SPACING.xs + 1,
        borderWidth: 1,
        borderColor: '#e8edf4',
        ...SHADOWS.md,
        position: 'relative',
        overflow: 'visible',
    },
    cardReported: { opacity: 0.6 },
    matchCornerBadge: {
        position: 'absolute',
        top: -1,
        right: -1,
        borderTopRightRadius: RADIUS.lg,
        borderBottomLeftRadius: 10,
        borderWidth: 1,
        borderColor: JOB_ACCENT_BORDER,
        paddingHorizontal: 11,
        paddingVertical: 5,
        zIndex: 3,
        shadowColor: JOB_ACCENT_DARK,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 3,
    },
    matchCornerText: {
        fontSize: 11,
        fontWeight: '800',
        color: JOB_ACCENT_TEXT,
        letterSpacing: 0.2,
    },
    postedTimeText: {
        fontSize: 10,
        color: '#94a3b8',
        fontWeight: '600',
        marginTop: 2,
    },
    reportedBadge: {
        position: 'absolute',
        top: 8,
        left: 0,
        backgroundColor: '#fde7e9',
        paddingHorizontal: 7,
        paddingVertical: 3,
        borderBottomRightRadius: 8,
    },
    reportedBadgeText: { fontSize: 10, fontWeight: '600', color: '#b45359' },
    contentWrap: {
        paddingRight: 2,
    },
    contentWrapWithBadge: {
        paddingRight: 108,
    },
    jobTitle: {
        fontSize: 17,
        color: theme.textPrimary,
        fontWeight: '800',
        letterSpacing: -0.2,
    },
    companyName: {
        marginTop: 2,
        fontSize: 11,
        fontWeight: '700',
        color: '#586983',
    },
    skillsWrap: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginTop: 9,
        marginBottom: 2,
    },
    skillChip: {
        backgroundColor: '#eef2f7',
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 5,
        marginRight: 7,
        marginBottom: 7,
        borderWidth: 1,
        borderColor: '#e6ebf4',
    },
    skillChipText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#4f6079',
    },
    divider: {
        height: 1,
        backgroundColor: '#edf1f5',
        marginTop: 3,
        marginBottom: 8,
    },
    bottomRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap: 8,
    },
    locationWrap: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingRight: 6,
    },
    locationPin: {
        fontSize: 13,
        lineHeight: 16,
        marginRight: 5,
    },
    locationText: {
        fontSize: 12,
        color: '#5f7190',
        fontWeight: '600',
        flexShrink: 1,
    },
    salaryMetaWrap: {
        alignItems: 'flex-end',
        justifyContent: 'flex-end',
        minWidth: 120,
        maxWidth: '54%',
    },
    salaryText: {
        fontSize: 15,
        fontWeight: '800',
        color: '#1f2f4a',
        textAlign: 'right',
    },
});
