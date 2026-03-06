import React, { memo, useMemo } from 'react';
import { ScrollView, Image, StyleSheet, Dimensions } from 'react-native';
import { theme, RADIUS } from '../../../theme/theme';

const SCREEN_WIDTH = Dimensions.get('window').width;
const IMAGE_WIDTH = Math.max(260, SCREEN_WIDTH - 48);

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
        marginTop: 8,
        marginBottom: 8,
    },
    image: {
        width: IMAGE_WIDTH,
        height: IMAGE_WIDTH,
        borderRadius: 12,
        marginRight: 8,
        backgroundColor: theme.borderMedium,
        borderWidth: 0,
        borderColor: 'transparent',
    },
});
