import React, { memo, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, Image, TextInput, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { IconAward, IconCheck, IconSend } from '../../../components/Icons';
import FeedActionsBar from './FeedActionsBar';
import VoicePost from './VoicePost';
import GalleryPost from './GalleryPost';
import BountyPost from './BountyPost';
import { theme, RADIUS } from '../../../theme/theme';

function FeedPostCardComponent({
    post,
    isLiked,
    likeCount,
    commentList,
    isCommentOpen,
    commentInputValue,
    currentUserAvatar,
    onToggleLike,
    onToggleComment,
    onToggleVouch,
    onCommentInputChange,
    onSubmitComment,
}) {
    const isBounty = post?.type === 'bounty';
    const commentsCount = (Array.isArray(commentList) ? commentList.length : 0) + Number(post?.comments || 0);

    const handleCommentChange = useCallback((text) => {
        onCommentInputChange(post._id, text);
    }, [onCommentInputChange, post?._id]);

    const handleSubmitComment = useCallback(() => {
        onSubmitComment(post._id);
    }, [onSubmitComment, post?._id]);

    const postTypeBody = useMemo(() => {
        if (post?.type === 'voice') {
            return <VoicePost duration={post.duration} />;
        }
        if (post?.type === 'gallery') {
            return <GalleryPost post={post} />;
        }
        if (post?.type === 'bounty') {
            return <BountyPost reward={post.reward} />;
        }
        return null;
    }, [post]);

    return (
        <View style={[styles.card, isBounty && styles.bountyCard]}>
            {isBounty ? (
                <>
                    <LinearGradient
                        colors={[theme.primary, theme.indigo]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={StyleSheet.absoluteFillObject}
                    />
                    <View style={styles.bountyAwardBg}>
                        <IconAward size={64} color="rgba(255,255,255,0.1)" />
                    </View>
                </>
            ) : null}

            <View style={styles.headerRow}>
                <Image source={{ uri: post.avatar }} style={styles.avatar} />
                <View style={styles.headerTextBlock}>
                    <View style={styles.authorRow}>
                        <Text style={[styles.author, isBounty && styles.authorBounty]}>{post.author}</Text>
                        {(post.karma > 1000 || isBounty) ? (
                            <IconCheck size={14} color={isBounty ? theme.surface : theme.indigo} />
                        ) : null}
                    </View>
                    <Text style={[styles.meta, isBounty && styles.metaBounty]}>
                        {String(post.role || 'Member').toUpperCase()}
                        {' • '}
                        {String(post.time || 'Just now').toUpperCase()}
                    </Text>
                </View>
                <View style={styles.karmaBadge}>
                    <Text style={styles.karmaBadgeText}>+{post.karma || 0} KARMA</Text>
                </View>
            </View>

            <Text style={[styles.bodyText, isBounty && styles.bodyTextBounty]}>{post.text}</Text>

            {postTypeBody}

            <FeedActionsBar
                postId={post._id}
                likeCount={likeCount}
                commentCount={commentsCount}
                vouched={Boolean(post.vouched)}
                isLiked={isLiked}
                isBounty={isBounty}
                onToggleLike={onToggleLike}
                onToggleComment={onToggleComment}
                onToggleVouch={onToggleVouch}
            />

            {isCommentOpen ? (
                <View style={styles.commentSection}>
                    {(commentList || []).map((comment, index) => (
                        <View key={`${post._id}-comment-${index}`} style={styles.commentRow}>
                            <Image source={{ uri: currentUserAvatar }} style={styles.commentAvatar} />
                            <View style={styles.commentBubble}>
                                <Text style={styles.commentBubbleText}>{comment}</Text>
                            </View>
                        </View>
                    ))}

                    <View style={styles.commentInputRow}>
                        <Image source={{ uri: currentUserAvatar }} style={styles.commentAvatar} />
                        <TextInput
                            style={styles.commentInput}
                            value={commentInputValue}
                            onChangeText={handleCommentChange}
                            onSubmitEditing={handleSubmitComment}
                            placeholder="Add a comment..."
                            placeholderTextColor={theme.textMuted}
                            returnKeyType="send"
                        />
                        <TouchableOpacity style={styles.commentSendButton} onPress={handleSubmitComment} activeOpacity={0.85}>
                            <IconSend size={14} color={theme.surface} />
                        </TouchableOpacity>
                    </View>
                </View>
            ) : null}
        </View>
    );
}

export default memo(FeedPostCardComponent);

const styles = StyleSheet.create({
    card: {
        borderRadius: RADIUS.xl,
        borderWidth: 1,
        borderColor: theme.border,
        backgroundColor: theme.surface,
        padding: 16,
        marginBottom: 12,
        shadowColor: theme.textPrimary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
        overflow: 'hidden',
    },
    bountyCard: {
        backgroundColor: theme.primary,
        borderColor: theme.primaryDark,
    },
    bountyAwardBg: {
        position: 'absolute',
        top: -10,
        right: -10,
        opacity: 0.2,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatar: {
        width: 42,
        height: 42,
        borderRadius: RADIUS.full,
        borderWidth: 1,
        borderColor: theme.border,
        marginRight: 10,
    },
    headerTextBlock: {
        flex: 1,
    },
    authorRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginBottom: 2,
    },
    author: {
        color: theme.textPrimary,
        fontSize: 14,
        fontWeight: '900',
    },
    authorBounty: {
        color: theme.surface,
    },
    meta: {
        color: theme.textMuted,
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.2,
    },
    metaBounty: {
        color: 'rgba(255,255,255,0.72)',
    },
    karmaBadge: {
        borderRadius: RADIUS.full,
        backgroundColor: theme.primaryLight,
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    karmaBadgeText: {
        color: theme.primary,
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 0.2,
    },
    bodyText: {
        marginTop: 12,
        color: theme.textSecondary,
        fontSize: 14,
        lineHeight: 20,
        fontWeight: '500',
    },
    bodyTextBounty: {
        color: 'rgba(255,255,255,0.92)',
    },
    commentSection: {
        marginTop: 10,
        borderTopWidth: 1,
        borderTopColor: theme.border,
        paddingTop: 10,
        gap: 8,
    },
    commentRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
    },
    commentAvatar: {
        width: 24,
        height: 24,
        borderRadius: RADIUS.full,
    },
    commentBubble: {
        flex: 1,
        borderRadius: RADIUS.md,
        backgroundColor: theme.background,
        paddingHorizontal: 10,
        paddingVertical: 8,
    },
    commentBubbleText: {
        color: theme.textPrimary,
        fontSize: 12,
        lineHeight: 16,
    },
    commentInputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    commentInput: {
        flex: 1,
        minHeight: 36,
        borderRadius: RADIUS.full,
        backgroundColor: theme.border,
        paddingHorizontal: 12,
        color: theme.textPrimary,
        fontSize: 12,
    },
    commentSendButton: {
        width: 32,
        height: 32,
        borderRadius: RADIUS.full,
        backgroundColor: theme.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
