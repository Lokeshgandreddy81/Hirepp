import React, { memo, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { theme, RADIUS } from '../../../theme/theme';

function getExpiryStyle(days) {
    if (days <= 2) {
        return {
            badge: styles.expiryUrgent,
            text: styles.expiryUrgentText,
            label: 'EXPIRES SOON',
        };
    }

    if (days <= 5) {
        return {
            badge: styles.expirySoon,
            text: styles.expirySoonText,
            label: `${days}d left`,
        };
    }

    return {
        badge: styles.expiryNormal,
        text: styles.expiryNormalText,
        label: `${days}d left`,
    };
}

function BountyCardComponent({ bounty, isReferred, onReferPress }) {
    const expiryStyle = useMemo(
        () => getExpiryStyle(bounty.expiresInDays),
        [bounty.expiresInDays]
    );

    const referButtonStyle = useMemo(
        () => [styles.referButton, isReferred && styles.referButtonDone],
        [isReferred]
    );

    const referButtonTextStyle = useMemo(
        () => [styles.referButtonText, isReferred && styles.referButtonTextDone],
        [isReferred]
    );

    const handleRefer = useCallback(() => {
        if (!isReferred) {
            onReferPress(bounty);
        }
    }, [isReferred, onReferPress, bounty]);

    return (
        <View style={styles.card}>
            <View style={styles.topRow}>
                <View style={styles.leftTopRow}>
                    <View style={[styles.logo, { backgroundColor: bounty.logoBg || theme.primary }]}>
                        <Text style={styles.logoText}>{bounty.logoLetter}</Text>
                    </View>
                    <View>
                        <Text style={styles.companyText}>{bounty.company}</Text>
                        <View style={styles.categoryBadge}>
                            <Text style={styles.categoryBadgeText}>{bounty.category}</Text>
                        </View>
                    </View>
                </View>
                <View style={[styles.expiryBadge, expiryStyle.badge]}>
                    <Text style={[styles.expiryBadgeText, expiryStyle.text]}>{expiryStyle.label}</Text>
                </View>
            </View>

            <Text style={styles.roleText}>{bounty.role}</Text>

            <View style={styles.bottomRow}>
                <View>
                    <Text style={styles.bonusText}>{bounty.bonus}</Text>
                    <Text style={styles.metaText}>{bounty.referrals} referred · {bounty.totalPot} pot</Text>
                </View>
                <TouchableOpacity
                    style={referButtonStyle}
                    onPress={handleRefer}
                    disabled={isReferred}
                >
                    <Text style={referButtonTextStyle}>{isReferred ? 'REFERRED ✓' : 'REFER A PEER'}</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

export default memo(BountyCardComponent);

const styles = StyleSheet.create({
    card: {
        backgroundColor: theme.surface,
        borderRadius: RADIUS.xl,
        padding: 20,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: theme.borderMedium,
        shadowColor: theme.textPrimary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    topRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    leftTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
        marginRight: 8,
    },
    logo: {
        width: 44,
        height: 44,
        borderRadius: RADIUS.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    logoText: {
        fontSize: 18,
        fontWeight: '900',
        color: theme.surface,
    },
    companyText: {
        fontSize: 13,
        fontWeight: '900',
        color: theme.textPrimary,
    },
    categoryBadge: {
        alignSelf: 'flex-start',
        marginTop: 4,
        backgroundColor: theme.border,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: RADIUS.sm,
    },
    categoryBadgeText: {
        fontSize: 10,
        fontWeight: '800',
        color: theme.textSecondary,
    },
    expiryBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: RADIUS.sm,
    },
    expiryBadgeText: {
        fontSize: 10,
        fontWeight: '800',
    },
    expiryUrgent: {
        backgroundColor: theme.error,
    },
    expiryUrgentText: {
        color: theme.surface,
    },
    expirySoon: {
        backgroundColor: theme.primaryLight,
    },
    expirySoonText: {
        color: theme.primaryDark,
    },
    expiryNormal: {
        backgroundColor: theme.success,
    },
    expiryNormalText: {
        color: theme.surface,
    },
    roleText: {
        fontSize: 15,
        fontWeight: '900',
        color: theme.textPrimary,
        marginBottom: 10,
    },
    bottomRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    bonusText: {
        fontSize: 22,
        fontWeight: '900',
        color: theme.primary,
    },
    metaText: {
        fontSize: 10,
        color: theme.textMuted,
        fontWeight: '600',
    },
    referButton: {
        backgroundColor: theme.darkCard,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: RADIUS.md,
        marginLeft: 12,
    },
    referButtonDone: {
        backgroundColor: theme.primaryLight,
    },
    referButtonText: {
        fontSize: 10,
        fontWeight: '900',
        color: theme.surface,
    },
    referButtonTextDone: {
        color: theme.primary,
    },
});
