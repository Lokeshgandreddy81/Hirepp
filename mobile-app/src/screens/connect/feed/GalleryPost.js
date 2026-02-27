import React, { memo, useMemo } from 'react';
import { ScrollView, Image, StyleSheet } from 'react-native';
import { theme, RADIUS } from '../../../theme/theme';

function GalleryPostComponent({ post }) {
    const images = useMemo(() => {
        if (Array.isArray(post?.images) && post.images.length > 0) {
            return post.images;
        }
        if (post?.mediaUrl) {
            return [post.mediaUrl];
        }
        return [];
    }, [post?.images, post?.mediaUrl]);

    if (images.length === 0) return null;

    return (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scroller}>
            {images.map((uri, index) => (
                <Image key={`${post?._id || 'gallery'}-${index}`} source={{ uri }} style={styles.image} />
            ))}
        </ScrollView>
    );
}

export default memo(GalleryPostComponent);

const styles = StyleSheet.create({
    scroller: {
        marginBottom: 12,
    },
    image: {
        width: 180,
        height: 120,
        borderRadius: RADIUS.lg,
        marginRight: 8,
        backgroundColor: theme.borderMedium,
    },
});
