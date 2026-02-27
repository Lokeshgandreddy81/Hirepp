import React, { memo, useCallback, useMemo } from 'react';
import { View, FlatList, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { IconPlus } from '../../../components/Icons';
import FeedComposer from './FeedComposer';
import FeedPostCard from './FeedPostCard';
import { theme, RADIUS } from '../../../theme/theme';

function FeedTabComponent({
    feedPosts,
    loadingFeed,
    loadingMoreFeed,
    composerOpen,
    composerMediaType,
    composerText,
    likedPostIds,
    likeCountMap,
    commentsByPostId,
    activeCommentPostId,
    commentInputMap,
    currentUserAvatar,
    onRefreshFeed,
    onLoadMoreFeed,
    onMediaButtonClick,
    onInputAreaClick,
    onCancelComposer,
    onPost,
    onComposerTextChange,
    onToggleLike,
    onToggleComment,
    onToggleVouch,
    onCommentInputChange,
    onSubmitComment,
}) {
    const keyExtractor = useCallback((item) => String(item._id), []);

    const renderPostItem = useCallback(({ item }) => {
        const postId = item._id;
        return (
            <FeedPostCard
                post={item}
                isLiked={likedPostIds.has(postId)}
                likeCount={Number(likeCountMap[postId] ?? item.likes ?? 0)}
                commentList={commentsByPostId[postId] || []}
                isCommentOpen={activeCommentPostId === postId}
                commentInputValue={commentInputMap[postId] || ''}
                currentUserAvatar={currentUserAvatar}
                onToggleLike={onToggleLike}
                onToggleComment={onToggleComment}
                onToggleVouch={onToggleVouch}
                onCommentInputChange={onCommentInputChange}
                onSubmitComment={onSubmitComment}
            />
        );
    }, [
        likedPostIds,
        likeCountMap,
        commentsByPostId,
        activeCommentPostId,
        commentInputMap,
        currentUserAvatar,
        onToggleLike,
        onToggleComment,
        onToggleVouch,
        onCommentInputChange,
        onSubmitComment,
    ]);

    const listHeader = useMemo(() => (
        <FeedComposer
            composerOpen={composerOpen}
            composerMediaType={composerMediaType}
            composerText={composerText}
            currentUserAvatar={currentUserAvatar}
            onInputAreaClick={onInputAreaClick}
            onMediaButtonClick={onMediaButtonClick}
            onCancelComposer={onCancelComposer}
            onPost={onPost}
            onComposerTextChange={onComposerTextChange}
        />
    ), [
        composerOpen,
        composerMediaType,
        composerText,
        currentUserAvatar,
        onInputAreaClick,
        onMediaButtonClick,
        onCancelComposer,
        onPost,
        onComposerTextChange,
    ]);

    const listFooter = useMemo(() => {
        if (loadingMoreFeed) {
            return (
                <View style={styles.footerLoading}>
                    <ActivityIndicator color={theme.primary} />
                </View>
            );
        }
        return <View style={styles.footerSpacer} />;
    }, [loadingMoreFeed]);

    return (
        <View style={styles.container}>
            <FlatList
                data={feedPosts}
                keyExtractor={keyExtractor}
                renderItem={renderPostItem}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.content}
                refreshing={loadingFeed}
                onRefresh={onRefreshFeed}
                onEndReached={onLoadMoreFeed}
                onEndReachedThreshold={0.3}
                ListHeaderComponent={listHeader}
                ListFooterComponent={listFooter}
                removeClippedSubviews
                windowSize={10}
                maxToRenderPerBatch={8}
                initialNumToRender={6}
            />

            <TouchableOpacity style={styles.fab} activeOpacity={0.88}>
                <IconPlus size={24} color={theme.surface} />
            </TouchableOpacity>
        </View>
    );
}

export default memo(FeedTabComponent);

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        paddingHorizontal: 14,
        paddingTop: 12,
    },
    footerLoading: {
        paddingVertical: 16,
    },
    footerSpacer: {
        height: 84,
    },
    fab: {
        position: 'absolute',
        right: 18,
        bottom: 18,
        width: 56,
        height: 56,
        borderRadius: RADIUS.full,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.primary,
        shadowColor: theme.textPrimary,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 4,
    },
});
