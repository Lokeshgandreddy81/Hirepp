import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { View, FlatList, ActivityIndicator, StyleSheet, Modal, Text, TouchableOpacity, ScrollView, TextInput, Image, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import FeedComposer from './FeedComposer';
import FeedPostCard from './FeedPostCard';
import EmptyState from '../../../components/EmptyState';
import { IconSend } from '../../../components/Icons';

const makeAvatarFromName = (name = 'Member') => (
    `https://ui-avatars.com/api/?name=${encodeURIComponent(String(name || 'Member'))}&background=d1d5db&color=111111&rounded=true`
);

const normalizeCommentEntries = (entries = []) => (
    (Array.isArray(entries) ? entries : [])
        .map((entry, index) => {
            if (typeof entry === 'string') {
                const text = String(entry || '').trim();
                if (!text) return null;
                return {
                    id: `comment-${index}`,
                    text,
                    author: 'Member',
                    time: '',
                };
            }
            if (!entry || typeof entry !== 'object') return null;
            const text = String(entry?.text || '').trim();
            if (!text) return null;
            const author = String(
                entry?.author
                || entry?.user?.name
                || entry?.authorName
                || 'Member'
            ).trim() || 'Member';
            const time = String(entry?.time || '').trim();
            return {
                id: String(entry?._id || entry?.id || `comment-${index}`),
                text,
                author,
                time,
            };
        })
        .filter(Boolean)
);

function FeedTabComponent({
    feedPosts,
    isEmployerRole,
    loadingFeed,
    feedPullRefreshing,
    loadingMoreFeed,
    composerOpen,
    composerMediaType,
    composerText,
    composerVisibility,
    composerMediaAssets,
    isVoiceRecording,
    postingFeed,
    likedPostIds,
    savedPostIds,
    likeCountMap,
    commentsByPostId,
    commentInputMap,
    currentUserId,
    currentUserAvatar,
    jobPreview,
    jobPreviewVisible,
    jobPreviewLoading,
    jobPreviewApplying,
    hasAppliedToPreviewJob,
    onRefreshFeed,
    onLoadMoreFeed,
    onMediaButtonClick,
    onInputAreaClick,
    onCancelComposer,
    onStopVoiceRecording,
    onRemoveComposerMedia,
    onPost,
    onComposerTextChange,
    onComposerVisibilityToggle,
    onComposerVisibilitySelect,
    onToggleLike,
    onToggleSavePost,
    onToggleVouch,
    onOpenComments,
    onCommentInputChange,
    onSubmitComment,
    onReportPost,
    onDeletePost,
    onOpenAuthorProfile,
    onCloseJobPreview,
    onApplyJobPreview,
    onOpenPostJobForm,
}) {
    const [commentModalPostId, setCommentModalPostId] = useState('');
    const [postActionPost, setPostActionPost] = useState(null);
    const [postActionBusy, setPostActionBusy] = useState(false);

    const safeFeedPosts = useMemo(() => (
        Array.isArray(feedPosts)
            ? feedPosts.filter((post) => post && typeof post === 'object')
            : []
    ), [feedPosts]);
    const safeLikedPostIds = likedPostIds instanceof Set ? likedPostIds : new Set();
    const safeSavedPostIds = savedPostIds instanceof Set ? savedPostIds : new Set();
    const safeLikeCountMap = likeCountMap && typeof likeCountMap === 'object' ? likeCountMap : {};
    const safeCommentsByPostId = commentsByPostId && typeof commentsByPostId === 'object' ? commentsByPostId : {};
    const safeCommentInputMap = commentInputMap && typeof commentInputMap === 'object' ? commentInputMap : {};
    const activeCommentPost = useMemo(
        () => safeFeedPosts.find((post) => String(post?._id || '') === String(commentModalPostId || '')) || null,
        [commentModalPostId, safeFeedPosts]
    );
    const activeCommentPostKey = String(activeCommentPost?._id || '').trim();
    const activeCommentInputValue = activeCommentPostKey ? (safeCommentInputMap[activeCommentPostKey] || '') : '';
    const activeCommentList = useMemo(() => {
        const baseEntries = normalizeCommentEntries(activeCommentPost?.commentEntries || []);
        const runtimeEntries = normalizeCommentEntries(
            activeCommentPostKey ? safeCommentsByPostId[activeCommentPostKey] : []
        );
        if (!runtimeEntries.length) {
            return baseEntries;
        }
        const dedupe = new Set();
        const merged = [...baseEntries, ...runtimeEntries].filter((entry) => {
            const key = `${String(entry?.id || '')}:${String(entry?.author || '')}:${String(entry?.text || '')}`;
            if (!key.trim()) return false;
            if (dedupe.has(key)) return false;
            dedupe.add(key);
            return true;
        });
        return merged;
    }, [activeCommentPost?.commentEntries, activeCommentPostKey, safeCommentsByPostId]);
    const safeCurrentUserAvatar = String(currentUserAvatar || '').trim() || makeAvatarFromName('You');
    const safeCurrentUserId = String(currentUserId || '').trim();
    const selectedPostId = String(postActionPost?._id || '').trim();
    const selectedPostAuthorId = String(
        postActionPost?.authorId?._id
        || postActionPost?.authorId
        || ''
    ).trim();
    const canDeleteSelectedPost = Boolean(
        selectedPostId
        && (selectedPostId.startsWith('local-') || (safeCurrentUserId && selectedPostAuthorId === safeCurrentUserId))
    );

    const handleOpenCommentsModal = useCallback((postId) => {
        const normalizedId = String(postId || '').trim();
        if (!normalizedId) return;
        setCommentModalPostId(normalizedId);
        onOpenComments?.(normalizedId);
    }, [onOpenComments]);

    const closeCommentsModal = useCallback(() => {
        setCommentModalPostId('');
    }, []);

    const openPostActions = useCallback((post) => {
        setPostActionPost((post && typeof post === 'object') ? post : null);
    }, []);

    const closePostActions = useCallback(() => {
        if (postActionBusy) return;
        setPostActionPost(null);
    }, [postActionBusy]);

    const submitReportReason = useCallback(async (reason) => {
        if (!postActionPost || postActionBusy) return;
        setPostActionBusy(true);
        const result = await onReportPost?.(postActionPost, reason);
        setPostActionBusy(false);
        setPostActionPost(null);
        if (result?.ok) {
            Alert.alert('Thanks', result?.queued ? 'Report queued and will sync shortly.' : 'Report submitted.');
            return;
        }
        Alert.alert('Report failed', result?.message || 'Could not submit report right now.');
    }, [onReportPost, postActionBusy, postActionPost]);

    const submitDeletePost = useCallback(async () => {
        if (!postActionPost || postActionBusy || !canDeleteSelectedPost) return;
        setPostActionBusy(true);
        const result = await onDeletePost?.(postActionPost);
        setPostActionBusy(false);
        setPostActionPost(null);
        if (!result?.ok && result?.message) {
            Alert.alert('Delete failed', result.message);
        }
    }, [canDeleteSelectedPost, onDeletePost, postActionBusy, postActionPost]);

    const handleCommentComposerChange = useCallback((text) => {
        if (!activeCommentPostKey) return;
        onCommentInputChange(activeCommentPostKey, text);
    }, [activeCommentPostKey, onCommentInputChange]);

    const handleSubmitCommentFromModal = useCallback(() => {
        if (!activeCommentPostKey) return;
        onSubmitComment(activeCommentPostKey);
    }, [activeCommentPostKey, onSubmitComment]);

    useEffect(() => {
        if (!commentModalPostId) return;
        if (activeCommentPost) return;
        setCommentModalPostId('');
    }, [activeCommentPost, commentModalPostId]);

    const keyExtractor = useCallback((item, index) => String(item?._id || `post-${index}`), []);

    const renderPostItem = useCallback(({ item }) => {
        const safeItem = (item && typeof item === 'object') ? item : {};
        const postId = String(safeItem._id || '').trim();
        return (
            <FeedPostCard
                post={safeItem}
                isLiked={safeLikedPostIds.has(postId)}
                isSaved={safeSavedPostIds.has(postId)}
                likeCount={Number(safeLikeCountMap[postId] ?? safeItem.likes ?? 0)}
                commentList={safeCommentsByPostId[postId] || []}
                isCommentOpen={false}
                commentInputValue={safeCommentInputMap[postId] || ''}
                currentUserAvatar={currentUserAvatar}
                onToggleLike={onToggleLike}
                onLikeFromGesture={onToggleLike}
                onToggleSave={onToggleSavePost}
                onToggleComment={handleOpenCommentsModal}
                onToggleVouch={onToggleVouch}
                onCommentInputChange={onCommentInputChange}
                onSubmitComment={onSubmitComment}
                onReport={openPostActions}
                onOpenAuthorProfile={onOpenAuthorProfile}
            />
        );
    }, [
        safeLikedPostIds,
        safeSavedPostIds,
        safeLikeCountMap,
        safeCommentsByPostId,
        safeCommentInputMap,
        currentUserAvatar,
        onToggleLike,
        onToggleSavePost,
        handleOpenCommentsModal,
        onToggleVouch,
        onCommentInputChange,
        onSubmitComment,
        openPostActions,
        onOpenAuthorProfile,
    ]);

    const listHeader = useMemo(() => (
        <FeedComposer
            composerOpen={composerOpen}
            composerMediaType={composerMediaType}
            composerText={composerText}
            composerVisibility={composerVisibility}
            composerMediaAssets={composerMediaAssets}
            isVoiceRecording={isVoiceRecording}
            isPosting={postingFeed}
            currentUserAvatar={currentUserAvatar}
            onInputAreaClick={onInputAreaClick}
            onMediaButtonClick={onMediaButtonClick}
            onCancelComposer={onCancelComposer}
            onStopVoiceRecording={onStopVoiceRecording}
            onRemoveComposerMedia={onRemoveComposerMedia}
            onPost={onPost}
            onComposerTextChange={onComposerTextChange}
            onComposerVisibilityToggle={onComposerVisibilityToggle}
            onComposerVisibilitySelect={onComposerVisibilitySelect}
            isEmployerRole={isEmployerRole}
            onOpenPostJobForm={onOpenPostJobForm}
        />
    ), [
        composerOpen,
        composerMediaType,
        composerText,
        composerVisibility,
        composerMediaAssets,
        isVoiceRecording,
        postingFeed,
        currentUserAvatar,
        onInputAreaClick,
        onMediaButtonClick,
        onCancelComposer,
        onStopVoiceRecording,
        onRemoveComposerMedia,
        onPost,
        onComposerTextChange,
        onComposerVisibilityToggle,
        onComposerVisibilitySelect,
        isEmployerRole,
        onOpenPostJobForm,
    ]);

    const listFooter = useMemo(() => {
        if (loadingMoreFeed && safeFeedPosts.length >= 6) {
            return (
                <View style={styles.footerLoading}>
                    <ActivityIndicator color="#5b48f2" />
                </View>
            );
        }
        return <View style={styles.footerSpacer} />;
    }, [loadingMoreFeed, safeFeedPosts.length]);

    const listEmpty = useMemo(() => {
        if (loadingFeed && !feedPullRefreshing) {
            return (
                <View style={styles.listLoadingWrap}>
                    <ActivityIndicator size="small" color="#5b48f2" />
                    <Text style={styles.listLoadingText}>Loading posts...</Text>
                </View>
            );
        }
        return (
            <EmptyState
                icon={null}
                title="No posts yet"
                subtitle="Be the first to share your work today"
                action={{ label: 'Create Post', onPress: onInputAreaClick }}
            />
        );
    }, [feedPullRefreshing, loadingFeed, onInputAreaClick]);

    return (
        <View style={styles.container}>
            <FlatList
                data={safeFeedPosts}
                keyExtractor={keyExtractor}
                renderItem={renderPostItem}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.content}
                refreshing={Boolean(feedPullRefreshing)}
                onRefresh={onRefreshFeed}
                onEndReached={onLoadMoreFeed}
                onEndReachedThreshold={0.3}
                ListHeaderComponent={listHeader}
                ListEmptyComponent={listEmpty}
                ListFooterComponent={listFooter}
                removeClippedSubviews
                windowSize={10}
                maxToRenderPerBatch={8}
                initialNumToRender={6}
            />

            <Modal
                visible={Boolean(postActionPost)}
                transparent
                animationType="fade"
                onRequestClose={closePostActions}
            >
                <TouchableOpacity style={styles.postActionOverlay} activeOpacity={1} onPress={closePostActions}>
                    <TouchableOpacity style={styles.postActionSheet} activeOpacity={1} onPress={() => {}}>
                        <View style={styles.postActionHandle} />
                        <Text style={styles.postActionTitle}>Post Actions</Text>
                        <Text style={styles.postActionSubtitle} numberOfLines={2}>
                            {String(postActionPost?.text || '').trim() || 'Choose what you want to do with this post.'}
                        </Text>

                        <TouchableOpacity
                            style={styles.postActionItem}
                            activeOpacity={0.85}
                            disabled={postActionBusy}
                            onPress={() => submitReportReason('spam')}
                        >
                            <Ionicons name="alert-circle-outline" size={18} color="#111111" />
                            <Text style={styles.postActionItemText}>Report as Spam</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.postActionItem}
                            activeOpacity={0.85}
                            disabled={postActionBusy}
                            onPress={() => submitReportReason('harassment')}
                        >
                            <Ionicons name="shield-outline" size={18} color="#111111" />
                            <Text style={styles.postActionItemText}>Report as Harassment</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.postActionItem}
                            activeOpacity={0.85}
                            disabled={postActionBusy}
                            onPress={() => submitReportReason('misleading')}
                        >
                            <Ionicons name="warning-outline" size={18} color="#111111" />
                            <Text style={styles.postActionItemText}>Report as Misleading</Text>
                        </TouchableOpacity>

                        {canDeleteSelectedPost ? (
                            <TouchableOpacity
                                style={[styles.postActionItem, styles.postActionItemDanger]}
                                activeOpacity={0.85}
                                disabled={postActionBusy}
                                onPress={submitDeletePost}
                            >
                                <Ionicons name="trash-outline" size={18} color="#dc2626" />
                                <Text style={styles.postActionItemDangerText}>Delete Post</Text>
                            </TouchableOpacity>
                        ) : null}

                        <TouchableOpacity
                            style={styles.postActionCancel}
                            activeOpacity={0.85}
                            disabled={postActionBusy}
                            onPress={closePostActions}
                        >
                            <Text style={styles.postActionCancelText}>{postActionBusy ? 'Working...' : 'Cancel'}</Text>
                        </TouchableOpacity>
                    </TouchableOpacity>
                </TouchableOpacity>
            </Modal>

            <Modal
                visible={Boolean(commentModalPostId)}
                transparent
                animationType="slide"
                onRequestClose={closeCommentsModal}
            >
                <View style={styles.commentsOverlay}>
                    <View style={styles.commentsSheet}>
                        <View style={styles.commentsHandle} />

                        <View style={styles.commentsHeaderRow}>
                            <Text style={styles.commentsTitle}>Comments</Text>
                            <TouchableOpacity style={styles.commentsCloseBtn} onPress={closeCommentsModal} activeOpacity={0.85}>
                                <Text style={styles.commentsCloseText}>×</Text>
                            </TouchableOpacity>
                        </View>

                        {activeCommentPost ? (
                            <>
                                <View style={styles.commentsPostMeta}>
                                    <Text style={styles.commentsPostAuthor}>{activeCommentPost.author || 'Member'}</Text>
                                    <Text style={styles.commentsPostText} numberOfLines={2}>
                                        {String(activeCommentPost.text || '').trim() || 'Post'}
                                    </Text>
                                </View>

                                <ScrollView
                                    style={styles.commentsScroll}
                                    contentContainerStyle={styles.commentsScrollContent}
                                    showsVerticalScrollIndicator={false}
                                >
                                    {activeCommentList.length > 0 ? (
                                        activeCommentList.map((comment, index) => (
                                            <View key={String(comment?.id || `comment-row-${index}`)} style={styles.commentRow}>
                                                <Image
                                                    source={{ uri: makeAvatarFromName(String(comment?.author || 'Member')) }}
                                                    style={styles.commentAvatar}
                                                />
                                                <View style={styles.commentBubble}>
                                                    <Text style={styles.commentText}>
                                                        <Text style={styles.commentAuthor}>{String(comment?.author || 'Member')}</Text>
                                                        {' '}
                                                        {String(comment?.text || '')}
                                                    </Text>
                                                    <Text style={styles.commentTime}>{String(comment?.time || 'Just now')}</Text>
                                                </View>
                                            </View>
                                        ))
                                    ) : (
                                        <Text style={styles.commentsEmptyText}>No comments yet. Be the first to comment.</Text>
                                    )}
                                </ScrollView>

                                <View style={styles.commentComposerRow}>
                                    <Image source={{ uri: safeCurrentUserAvatar }} style={styles.commentComposerAvatar} />
                                    <TextInput
                                        style={styles.commentComposerInput}
                                        value={activeCommentInputValue}
                                        onChangeText={handleCommentComposerChange}
                                        onSubmitEditing={handleSubmitCommentFromModal}
                                        placeholder="Add a comment..."
                                        placeholderTextColor="#8e8e8e"
                                        returnKeyType="send"
                                    />
                                    <TouchableOpacity
                                        style={styles.commentComposerSendBtn}
                                        onPress={handleSubmitCommentFromModal}
                                        activeOpacity={0.85}
                                    >
                                        <IconSend size={14} color="#ffffff" />
                                    </TouchableOpacity>
                                </View>
                            </>
                        ) : (
                            <View style={styles.commentsLoadingWrap}>
                                <ActivityIndicator size="small" color="#111111" />
                                <Text style={styles.commentsLoadingText}>Loading comments...</Text>
                            </View>
                        )}
                    </View>
                </View>
            </Modal>

            <Modal
                visible={Boolean(jobPreviewVisible)}
                transparent
                animationType="slide"
                onRequestClose={onCloseJobPreview}
            >
                <View style={styles.previewOverlay}>
                    <View style={styles.previewSheet}>
                        {jobPreviewLoading ? (
                            <View style={styles.previewLoadingWrap}>
                                <ActivityIndicator size="small" color="#111111" />
                                <Text style={styles.previewLoadingText}>Loading job details...</Text>
                            </View>
                        ) : (
                            <ScrollView showsVerticalScrollIndicator={false}>
                                <Text style={styles.previewTitle}>{jobPreview?.title || 'Open Role'}</Text>
                                <Text style={styles.previewCompany}>{jobPreview?.companyName || 'Employer'}</Text>
                                <View style={styles.previewMetaRow}>
                                    <Text style={styles.previewMetaChip}>{jobPreview?.location || 'Location N/A'}</Text>
                                    <Text style={styles.previewMetaChip}>{jobPreview?.salaryRange || 'Salary N/A'}</Text>
                                </View>
                                <View style={styles.previewMetaRow}>
                                    <Text style={styles.previewMetaChip}>{jobPreview?.remoteAllowed ? 'Remote allowed' : 'On-site'}</Text>
                                    <Text style={styles.previewMetaChip}>{jobPreview?.shift || 'Flexible shift'}</Text>
                                </View>
                                <Text style={styles.previewSectionTitle}>Requirements</Text>
                                {Array.isArray(jobPreview?.requirements) && jobPreview.requirements.length > 0 ? (
                                    jobPreview.requirements.slice(0, 8).map((item, index) => (
                                        <Text key={`${String(item)}-${index}`} style={styles.previewRequirement}>• {item}</Text>
                                    ))
                                ) : (
                                    <Text style={styles.previewRequirement}>• Requirements will be shared by employer</Text>
                                )}
                            </ScrollView>
                        )}

                        <View style={styles.previewActions}>
                            <TouchableOpacity style={styles.previewSecondaryBtn} onPress={onCloseJobPreview} activeOpacity={0.85}>
                                <Text style={styles.previewSecondaryText}>Close</Text>
                            </TouchableOpacity>
                            {!isEmployerRole ? (
                                <TouchableOpacity
                                    style={[styles.previewPrimaryBtn, (hasAppliedToPreviewJob || jobPreviewApplying) && styles.previewPrimaryBtnDisabled]}
                                    onPress={onApplyJobPreview}
                                    activeOpacity={0.85}
                                    disabled={Boolean(hasAppliedToPreviewJob || jobPreviewApplying)}
                                >
                                    <Text style={styles.previewPrimaryText}>
                                        {jobPreviewApplying ? 'Applying...' : (hasAppliedToPreviewJob ? 'Applied' : 'Apply')}
                                    </Text>
                                </TouchableOpacity>
                            ) : null}
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

export default memo(FeedTabComponent);

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#ffffff',
    },
    content: {
        paddingHorizontal: 0,
        paddingTop: 2,
        paddingBottom: 28,
    },
    footerLoading: {
        paddingVertical: 16,
    },
    footerSpacer: {
        height: 26,
    },
    listLoadingWrap: {
        paddingVertical: 24,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    listLoadingText: {
        color: '#4b5563',
        fontSize: 12,
        fontWeight: '600',
    },
    postActionOverlay: {
        flex: 1,
        backgroundColor: 'rgba(17, 24, 39, 0.36)',
        justifyContent: 'flex-end',
    },
    postActionSheet: {
        backgroundColor: '#ffffff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        borderTopWidth: 1,
        borderTopColor: '#ddd6fe',
        paddingHorizontal: 16,
        paddingTop: 10,
        paddingBottom: 18,
        gap: 8,
    },
    postActionHandle: {
        width: 38,
        height: 4,
        borderRadius: 999,
        alignSelf: 'center',
        backgroundColor: '#c4b5fd',
        marginBottom: 4,
    },
    postActionTitle: {
        color: '#111111',
        fontSize: 16,
        fontWeight: '800',
    },
    postActionSubtitle: {
        color: '#4b5563',
        fontSize: 12,
        lineHeight: 16,
        marginBottom: 4,
    },
    postActionItem: {
        minHeight: 42,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e9ddff',
        backgroundColor: '#faf8ff',
        paddingHorizontal: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    postActionItemDanger: {
        borderColor: '#fecaca',
        backgroundColor: '#fff1f2',
    },
    postActionItemText: {
        color: '#111111',
        fontSize: 13,
        fontWeight: '700',
    },
    postActionItemDangerText: {
        color: '#dc2626',
        fontSize: 13,
        fontWeight: '800',
    },
    postActionCancel: {
        marginTop: 4,
        minHeight: 42,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#c4b5fd',
        backgroundColor: '#f3e8ff',
        alignItems: 'center',
        justifyContent: 'center',
    },
    postActionCancelText: {
        color: '#111111',
        fontSize: 13,
        fontWeight: '700',
    },
    commentsOverlay: {
        flex: 1,
        backgroundColor: 'rgba(76, 29, 149, 0.28)',
        justifyContent: 'flex-end',
    },
    commentsSheet: {
        maxHeight: '96%',
        minHeight: '84%',
        backgroundColor: '#ffffff',
        borderTopLeftRadius: 18,
        borderTopRightRadius: 18,
        paddingHorizontal: 14,
        paddingTop: 8,
        paddingBottom: 12,
        borderTopWidth: 1,
        borderTopColor: '#ddd6fe',
    },
    commentsHandle: {
        alignSelf: 'center',
        width: 40,
        height: 4,
        borderRadius: 999,
        backgroundColor: '#c4b5fd',
        marginBottom: 10,
    },
    commentsHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    commentsTitle: {
        color: '#111111',
        fontSize: 16,
        fontWeight: '800',
    },
    commentsCloseBtn: {
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f3e8ff',
    },
    commentsCloseText: {
        color: '#111111',
        fontSize: 18,
        lineHeight: 18,
        fontWeight: '700',
    },
    commentsPostMeta: {
        borderWidth: 1,
        borderColor: '#ddd6fe',
        borderRadius: 10,
        backgroundColor: '#f5f3ff',
        paddingHorizontal: 11,
        paddingVertical: 9,
        marginBottom: 8,
    },
    commentsPostAuthor: {
        color: '#111111',
        fontSize: 12,
        fontWeight: '800',
        marginBottom: 2,
    },
    commentsPostText: {
        color: '#111111',
        fontSize: 12,
        lineHeight: 16,
    },
    commentsScroll: {
        flex: 1,
    },
    commentsScrollContent: {
        paddingBottom: 12,
        gap: 10,
    },
    commentRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
    },
    commentAvatar: {
        width: 30,
        height: 30,
        borderRadius: 15,
        marginTop: 1,
    },
    commentBubble: {
        flex: 1,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#e9ddff',
        backgroundColor: '#faf8ff',
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    commentAuthor: {
        color: '#111111',
        fontSize: 12,
        fontWeight: '800',
    },
    commentText: {
        color: '#111111',
        fontSize: 13,
        lineHeight: 18,
    },
    commentTime: {
        marginTop: 2,
        color: '#6b7280',
        fontSize: 10.5,
        fontWeight: '600',
    },
    commentsEmptyText: {
        color: '#4b5563',
        fontSize: 13,
        fontWeight: '600',
        textAlign: 'center',
        marginTop: 18,
        marginBottom: 18,
    },
    commentComposerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        borderTopWidth: 1,
        borderTopColor: '#ddd6fe',
        paddingTop: 10,
    },
    commentComposerAvatar: {
        width: 30,
        height: 30,
        borderRadius: 15,
    },
    commentComposerInput: {
        flex: 1,
        minHeight: 38,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: '#c4b5fd',
        backgroundColor: '#ffffff',
        paddingHorizontal: 12,
        color: '#111111',
        fontSize: 13,
    },
    commentComposerSendBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#5b48f2',
    },
    commentsLoadingWrap: {
        paddingVertical: 24,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    commentsLoadingText: {
        color: '#4b5563',
        fontSize: 13,
        fontWeight: '600',
    },
    previewOverlay: {
        flex: 1,
        backgroundColor: 'rgba(76, 29, 149, 0.28)',
        justifyContent: 'flex-end',
    },
    previewSheet: {
        maxHeight: '75%',
        backgroundColor: '#ffffff',
        borderTopLeftRadius: 18,
        borderTopRightRadius: 18,
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 16,
        borderTopWidth: 1,
        borderTopColor: '#ddd6fe',
    },
    previewLoadingWrap: {
        paddingVertical: 28,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
    },
    previewLoadingText: {
        color: '#4b5563',
        fontSize: 13,
        fontWeight: '600',
    },
    previewTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: '#111111',
        marginBottom: 6,
    },
    previewCompany: {
        fontSize: 13,
        color: '#4b5563',
        fontWeight: '700',
        marginBottom: 12,
    },
    previewMetaRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 8,
    },
    previewMetaChip: {
        backgroundColor: '#f3e8ff',
        borderRadius: 999,
        borderWidth: 1,
        borderColor: '#ddd6fe',
        paddingHorizontal: 10,
        paddingVertical: 6,
        color: '#111111',
        fontSize: 12,
        fontWeight: '700',
    },
    previewSectionTitle: {
        marginTop: 6,
        marginBottom: 8,
        color: '#111111',
        fontSize: 13,
        fontWeight: '800',
    },
    previewRequirement: {
        color: '#111111',
        fontSize: 13,
        lineHeight: 20,
        marginBottom: 4,
    },
    previewActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 10,
        marginTop: 12,
    },
    previewSecondaryBtn: {
        borderWidth: 1,
        borderColor: '#c4b5fd',
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 10,
        backgroundColor: '#f3e8ff',
    },
    previewSecondaryText: {
        color: '#111111',
        fontSize: 13,
        fontWeight: '700',
    },
    previewPrimaryBtn: {
        borderRadius: 10,
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: '#5b48f2',
    },
    previewPrimaryBtnDisabled: {
        opacity: 0.55,
    },
    previewPrimaryText: {
        color: '#ffffff',
        fontSize: 13,
        fontWeight: '800',
    },
});
