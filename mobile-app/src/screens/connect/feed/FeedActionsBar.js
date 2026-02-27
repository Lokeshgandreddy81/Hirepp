import React, { memo, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { IconCheck } from '../../../components/Icons';
import { theme } from '../../../theme/theme';

function FeedActionsBarComponent({
    postId,
    likeCount,
    commentCount,
    vouched,
    isLiked,
    isBounty,
    onToggleLike,
    onToggleComment,
    onToggleVouch,
}) {
    const handleLike = useCallback(() => {
        onToggleLike(postId);
    }, [onToggleLike, postId]);

    const handleComment = useCallback(() => {
        onToggleComment(postId);
    }, [onToggleComment, postId]);

    const handleVouch = useCallback(() => {
        onToggleVouch(postId);
    }, [onToggleVouch, postId]);

    return (
        <View style={[styles.container, isBounty && styles.containerBounty]}>
            <TouchableOpacity style={styles.actionButton} onPress={handleLike} activeOpacity={0.8}>
                <Text style={[styles.actionText, isLiked && styles.actionTextLiked, isBounty && styles.actionTextBounty]}>
                    {'👍 '}
                    {likeCount}
                </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} onPress={handleComment} activeOpacity={0.8}>
                <Text style={[styles.actionText, isBounty && styles.actionTextBounty]}>
                    {'💬 '}
                    {commentCount}
                </Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={[
                    styles.vouchButton,
                    vouched && styles.vouchButtonActive,
                    isBounty && !vouched && styles.vouchButtonBounty,
                ]}
                onPress={handleVouch}
                activeOpacity={0.85}
            >
                {vouched ? <IconCheck size={14} color={theme.surface} /> : null}
                <Text
                    style={[
                        styles.vouchText,
                        vouched && styles.vouchTextActive,
                        isBounty && !vouched && styles.vouchTextBounty,
                    ]}
                >
                    {isBounty ? 'REFER & EARN' : (vouched ? 'VOUCHED' : 'VOUCH')}
                </Text>
            </TouchableOpacity>
        </View>
    );
}

export default memo(FeedActionsBarComponent);

const styles = StyleSheet.create({
    container: {
        marginTop: 4,
        borderTopWidth: 1,
        borderTopColor: theme.border,
        paddingTop: 10,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    containerBounty: {
        borderTopColor: 'rgba(255,255,255,0.2)',
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    actionText: {
        color: theme.textSecondary,
        fontSize: 12,
        fontWeight: '800',
    },
    actionTextLiked: {
        color: theme.primary,
    },
    actionTextBounty: {
        color: theme.surface,
    },
    vouchButton: {
        marginLeft: 'auto',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        borderWidth: 1,
        borderColor: 'transparent',
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: theme.background,
    },
    vouchButtonActive: {
        borderColor: theme.primary,
        backgroundColor: theme.primary,
    },
    vouchButtonBounty: {
        borderColor: theme.surface,
        backgroundColor: 'rgba(255,255,255,0.12)',
    },
    vouchText: {
        color: theme.primary,
        fontSize: 11,
        fontWeight: '900',
        letterSpacing: 0.4,
    },
    vouchTextActive: {
        color: theme.surface,
    },
    vouchTextBounty: {
        color: theme.surface,
    },
});
