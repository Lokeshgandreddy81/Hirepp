import React, { memo, useCallback, useMemo, useRef } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { IconCheck } from '../../../components/Icons';
import FeedActionsBar from './FeedActionsBar';
import VoicePost from './VoicePost';
import GalleryPost from './GalleryPost';
import VideoPost from './VideoPost';
import BountyPost from './BountyPost';
import { RADIUS, SPACING } from '../../../theme/theme';

function FeedPostCardComponent({
    post,
    isLiked,
    isSaved,
    likeCount,
    commentList,
    onToggleLike,
    onLikeFromGesture,
    onToggleSave,
    onToggleComment,
    onToggleVouch,
    onReport,
    onOpenAuthorProfile,
}) {
    const safePost = (post && typeof post === 'object') ? post : {};
    const safePostId = String(safePost?._id || '').trim();
    const isBounty = safePost?.type === 'bounty';
    const commentsCount = (Array.isArray(commentList) ? commentList.length : 0) + Number(safePost?.comments || 0);
    const vouchCount = Number(safePost?.vouchCount || 0);
    const totalEngagement = Number(likeCount || 0) + commentsCount + vouchCount;
    const calculatedViews = Number(
        safePost?.viewCount
        ?? safePost?.views
        ?? safePost?.impressions
        ?? (totalEngagement * 12 + 64)
    );
    const viewCount = Number.isFinite(calculatedViews) ? Math.max(0, Math.round(calculatedViews)) : 0;
    const avatarUri = String(safePost?.avatar || '').trim()
        || `https://ui-avatars.com/api/?name=${encodeURIComponent(String(safePost?.author || 'Member'))}&background=d1d5db&color=111111&rounded=true`;

    const handleOpenAuthorProfile = useCallback(() => {
        onOpenAuthorProfile?.(safePost);
    }, [onOpenAuthorProfile, safePost]);
    const lastTapAtRef = useRef(0);

    const handleContentTapLike = useCallback(() => {
        if (!safePostId) return;
        const now = Date.now();
        const isDoubleTap = (now - lastTapAtRef.current) < 280;
        lastTapAtRef.current = now;
        onLikeFromGesture?.(safePostId, {
            forceLike: true,
            source: isDoubleTap ? 'double_tap' : 'single_tap',
        });
    }, [onLikeFromGesture, safePostId]);

    const postTypeBody = useMemo(() => {
        if (safePost?.type === 'voice') {
            return <VoicePost duration={safePost.duration} mediaUrl={safePost.mediaUrl} />;
        }
        if (safePost?.type === 'gallery') {
            return <GalleryPost post={safePost} />;
        }
        if (safePost?.type === 'video') {
            return <VideoPost mediaUrl={safePost.mediaUrl} />;
        }
        if (safePost?.type === 'bounty') {
            return <BountyPost reward={safePost.reward} />;
        }
        return null;
    }, [safePost]);
    const hasMediaBody = Boolean(postTypeBody);

    return (
        <View style={styles.card}>
            <View style={styles.headerRow}>
                <TouchableOpacity
                    style={styles.headerProfileButton}
                    activeOpacity={0.82}
                    onPress={handleOpenAuthorProfile}
                >
                    <Image source={{ uri: avatarUri }} style={styles.avatar} />
                    <View style={styles.headerTextBlock}>
                        <View style={styles.authorRow}>
                            <Text style={styles.author}>{safePost.author}</Text>
                            {safePost.karma > 1000 ? (
                                <IconCheck size={13} color="#111111" />
                            ) : null}
                            {isBounty ? (
                                <View style={styles.postTypeBadge}>
                                    <Text style={styles.postTypeBadgeText}>Bounty</Text>
                                </View>
                            ) : null}
                        </View>
                        <Text style={styles.meta}>{String(safePost.role || 'Member')}</Text>
                    </View>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.moreButton}
                    activeOpacity={0.8}
                    onPress={() => onReport?.(safePost)}
                >
                    <Text style={styles.moreButtonText}>•••</Text>
                </TouchableOpacity>
            </View>

            {!hasMediaBody && safePost.text ? (
                <TouchableOpacity
                    activeOpacity={0.96}
                    onPress={handleContentTapLike}
                    disabled={!safePostId}
                >
                    <Text style={styles.captionText}>
                        <Text style={styles.captionAuthor}>{safePost.author}</Text>
                        {' '}
                        {safePost.text}
                    </Text>
                </TouchableOpacity>
            ) : null}

            {hasMediaBody ? (
                <TouchableOpacity
                    style={styles.mediaWrapper}
                    activeOpacity={0.96}
                    onPress={handleContentTapLike}
                    disabled={!safePostId}
                >
                    {postTypeBody}
                </TouchableOpacity>
            ) : null}

            <FeedActionsBar
                postId={safePostId}
                likeCount={likeCount}
                commentCount={commentsCount}
                vouchCount={vouchCount}
                viewCount={viewCount}
                vouched={Boolean(safePost.vouched)}
                isLiked={isLiked}
                isSaved={isSaved}
                isBounty={isBounty}
                isJobPost={Boolean(safePost.isJobPost)}
                post={safePost}
                onToggleLike={onToggleLike}
                onToggleSave={onToggleSave}
                onToggleComment={onToggleComment}
                onToggleVouch={onToggleVouch}
            />

            {hasMediaBody && safePost.text ? (
                <TouchableOpacity
                    activeOpacity={0.96}
                    onPress={handleContentTapLike}
                    disabled={!safePostId}
                >
                    <Text style={[styles.captionText, styles.captionAfterMedia]}>
                        <Text style={styles.captionAuthor}>{safePost.author}</Text>
                        {' '}
                        {safePost.text}
                    </Text>
                </TouchableOpacity>
            ) : null}

            <TouchableOpacity activeOpacity={0.82} onPress={() => onToggleComment?.(safePostId)}>
                <Text style={styles.timestampText}>
                    {String(safePost.time || 'Just now').toUpperCase()}
                </Text>
            </TouchableOpacity>
        </View>
    );
}

export default memo(FeedPostCardComponent);

const styles = StyleSheet.create({
    card: {
        borderWidth: 1,
        borderColor: '#ede9fe',
        backgroundColor: '#ffffff',
        borderRadius: 14,
        paddingHorizontal: SPACING.md,
        paddingTop: 12,
        paddingBottom: 10,
        marginHorizontal: 10,
        marginBottom: 12,
        shadowColor: 'transparent',
        elevation: 0,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerProfileButton: {
        flex: 1,
        minWidth: 0,
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatar: {
        width: 36,
        height: 36,
        borderRadius: RADIUS.full,
        borderWidth: 1,
        borderColor: '#ddd6fe',
        marginRight: 10,
        backgroundColor: '#ede9fe',
    },
    headerTextBlock: {
        flex: 1,
    },
    authorRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    author: {
        color: '#111111',
        fontSize: 13.5,
        fontWeight: '700',
    },
    meta: {
        color: '#6b7280',
        fontSize: 11,
        fontWeight: '500',
    },
    postTypeBadge: {
        borderRadius: RADIUS.full,
        borderWidth: 0,
        borderColor: 'transparent',
        backgroundColor: '#f3e8ff',
        paddingHorizontal: 6,
        paddingVertical: 1,
    },
    postTypeBadgeText: {
        color: '#111111',
        fontSize: 10,
        fontWeight: '700',
    },
    moreButton: {
        width: 32,
        height: 32,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 8,
    },
    moreButtonText: {
        color: '#111111',
        fontSize: 15,
        fontWeight: '900',
    },
    captionText: {
        marginTop: 6,
        color: '#111111',
        fontSize: 12.5,
        lineHeight: 19.5,
        fontWeight: '500',
    },
    captionAfterMedia: {
        marginTop: 4,
    },
    mediaWrapper: {
        marginTop: 8,
    },
    captionAuthor: {
        fontWeight: '700',
        color: '#111111',
    },
    timestampText: {
        marginTop: 4,
        color: '#9ca3af',
        fontSize: 9.5,
        fontWeight: '700',
        letterSpacing: 0.2,
    },
});
