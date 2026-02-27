import React, { memo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { IconUsers } from '../../../components/Icons';
import { theme, RADIUS } from '../../../theme/theme';

function CircleCardComponent({ variant, circle, onOpenCircle, onJoinCircle }) {
    const handleOpen = useCallback(() => {
        onOpenCircle(circle);
    }, [onOpenCircle, circle]);

    const handleJoin = useCallback(() => {
        if (typeof onJoinCircle === 'function') {
            onJoinCircle(circle._id);
        }
    }, [onJoinCircle, circle?._id]);

    if (variant === 'joined') {
        return (
            <View style={styles.joinedCard}>
                <View style={styles.joinedLeft}>
                    <View style={styles.relativeAvatar}>
                        <Image source={{ uri: `https://ui-avatars.com/api/?name=${circle.name}&background=7c3aed&color=fff&rounded=true` }} style={styles.joinedAvatar} />
                        <View style={styles.onlineDot} />
                    </View>
                    <View>
                        <Text style={styles.joinedTitle}>{circle.name}</Text>
                        <Text style={styles.joinedMeta}>{circle.members} MEMBERS</Text>
                    </View>
                </View>
                <TouchableOpacity style={styles.openBtn} onPress={handleOpen}>
                    <Text style={styles.openBtnText}>OPEN</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.exploreCard}>
            <IconUsers size={96} color={theme.textPrimary} style={styles.exploreBgIcon} />
            <View style={styles.exploreTop}>
                <Image source={{ uri: `https://ui-avatars.com/api/?name=${circle.name}&background=random&rounded=true` }} style={styles.exploreAvatar} />
                <View style={styles.exploreMain}>
                    <View style={styles.exploreHeaderRow}>
                        <View>
                            <Text style={styles.exploreTitle}>{circle.name}</Text>
                            <Text style={styles.exploreCategory}>{circle.category}</Text>
                        </View>
                        <TouchableOpacity style={styles.joinBtn} onPress={handleJoin}>
                            <Text style={styles.joinBtnText}>JOIN</Text>
                        </TouchableOpacity>
                    </View>
                    <Text style={styles.exploreDescription}>{circle.desc}</Text>
                </View>
            </View>
            <View style={styles.exploreBottom}>
                <View style={styles.exploreAvatarGroup}>
                    <View style={styles.miniAvatar}><Text style={styles.miniAvatarText}>A</Text></View>
                    <View style={[styles.miniAvatar, styles.miniAvatarShiftOne]}><Text style={styles.miniAvatarText}>B</Text></View>
                    <View style={[styles.miniAvatar, styles.miniAvatarShiftTwo]}><Text style={styles.miniAvatarText}>C</Text></View>
                </View>
                <Text style={styles.exploreOnline}>+{circle.online} Online Now</Text>
                <View style={styles.exploreTopicWrap}>
                    <Text style={styles.exploreTopic}>🔥 {circle.topics?.[0]}</Text>
                </View>
            </View>
        </View>
    );
}

export default memo(CircleCardComponent);

const styles = StyleSheet.create({
    joinedCard: {
        backgroundColor: theme.surface,
        borderRadius: RADIUS.xl,
        padding: 16,
        marginBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: theme.borderMedium,
        shadowColor: theme.textPrimary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    joinedLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    relativeAvatar: {
        position: 'relative',
    },
    joinedAvatar: {
        width: 48,
        height: 48,
        borderRadius: RADIUS.full,
    },
    onlineDot: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 12,
        height: 12,
        borderRadius: RADIUS.full,
        backgroundColor: theme.success,
        borderWidth: 2,
        borderColor: theme.surface,
    },
    joinedTitle: {
        fontSize: 14,
        fontWeight: '800',
        color: theme.textPrimary,
        marginBottom: 2,
    },
    joinedMeta: {
        fontSize: 10,
        fontWeight: '800',
        color: theme.primary,
    },
    openBtn: {
        backgroundColor: theme.primaryLight,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: RADIUS.md,
    },
    openBtnText: {
        fontSize: 11,
        fontWeight: '900',
        color: theme.primary,
    },

    exploreCard: {
        backgroundColor: theme.surface,
        borderRadius: RADIUS.xl,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: theme.borderMedium,
        overflow: 'hidden',
        shadowColor: theme.textPrimary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    exploreBgIcon: {
        position: 'absolute',
        top: 16,
        right: 16,
        opacity: 0.03,
    },
    exploreTop: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 16,
    },
    exploreAvatar: {
        width: 56,
        height: 56,
        borderRadius: RADIUS.lg,
    },
    exploreMain: {
        flex: 1,
    },
    exploreHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    exploreTitle: {
        fontSize: 14,
        fontWeight: '800',
        color: theme.textPrimary,
    },
    exploreCategory: {
        fontSize: 10,
        fontWeight: '800',
        color: theme.textSecondary,
        backgroundColor: theme.border,
        alignSelf: 'flex-start',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: RADIUS.sm,
        marginTop: 4,
    },
    joinBtn: {
        backgroundColor: theme.darkCard,
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: RADIUS.sm,
    },
    joinBtnText: {
        fontSize: 10,
        fontWeight: '900',
        color: theme.surface,
    },
    exploreDescription: {
        fontSize: 12,
        color: theme.textSecondary,
        lineHeight: 18,
    },
    exploreBottom: {
        flexDirection: 'row',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: theme.border,
        paddingTop: 12,
    },
    exploreAvatarGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 8,
    },
    miniAvatar: {
        width: 24,
        height: 24,
        borderRadius: RADIUS.full,
        backgroundColor: theme.borderMedium,
        borderWidth: 2,
        borderColor: theme.surface,
        justifyContent: 'center',
        alignItems: 'center',
    },
    miniAvatarShiftOne: {
        marginLeft: -8,
        zIndex: -1,
    },
    miniAvatarShiftTwo: {
        marginLeft: -8,
        zIndex: -2,
    },
    miniAvatarText: {
        fontSize: 10,
        color: theme.textSecondary,
        fontWeight: '700',
    },
    exploreOnline: {
        fontSize: 10,
        fontWeight: '800',
        color: theme.textMuted,
    },
    exploreTopicWrap: {
        flex: 1,
        alignItems: 'flex-end',
    },
    exploreTopic: {
        fontSize: 10,
        fontWeight: '800',
        color: theme.primary,
        backgroundColor: theme.primaryLight,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: RADIUS.md,
    },
});
