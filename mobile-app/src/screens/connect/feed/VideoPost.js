import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { ResizeMode, Video } from 'expo-av';
import { RADIUS } from '../../../theme/theme';

const VIDEO_HEIGHT = 390;

function VideoPostComponent({ mediaUrl }) {
    const sourceUri = String(mediaUrl || '').trim();
    if (!sourceUri) return null;

    return (
        <View style={styles.container}>
            <Video
                source={{ uri: sourceUri }}
                style={styles.video}
                useNativeControls
                resizeMode={ResizeMode.COVER}
                isLooping={false}
                shouldPlay={false}
            />
        </View>
    );
}

export default memo(VideoPostComponent);

const styles = StyleSheet.create({
    container: {
        marginTop: 8,
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 0,
        borderColor: 'transparent',
        backgroundColor: '#000000',
        marginBottom: 8,
    },
    video: {
        width: '100%',
        height: VIDEO_HEIGHT,
        backgroundColor: '#000000',
    },
});
