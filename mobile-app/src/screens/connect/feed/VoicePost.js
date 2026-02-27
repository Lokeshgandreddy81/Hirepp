import React, { memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { theme, RADIUS } from '../../../theme/theme';

function VoicePostComponent({ duration }) {
    return (
        <View style={styles.container}>
            <TouchableOpacity style={styles.playButton} activeOpacity={0.8}>
                <Text style={styles.playText}>▶</Text>
            </TouchableOpacity>
            <View style={styles.progressTrack}>
                <View style={styles.progressFill} />
            </View>
            <Text style={styles.durationText}>{duration || '0:15'}</Text>
        </View>
    );
}

export default memo(VoicePostComponent);

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.primaryLight,
        borderRadius: RADIUS.lg,
        borderWidth: 1,
        borderColor: theme.primaryLight,
        padding: 12,
        marginBottom: 16,
    },
    playButton: {
        width: 40,
        height: 40,
        borderRadius: RADIUS.full,
        backgroundColor: theme.primary,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: theme.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
    },
    playText: {
        color: theme.surface,
        fontSize: 14,
        marginLeft: 2,
    },
    progressTrack: {
        flex: 1,
        height: 6,
        borderRadius: RADIUS.full,
        backgroundColor: theme.primaryLight,
        marginHorizontal: 12,
        overflow: 'hidden',
    },
    progressFill: {
        width: '35%',
        height: '100%',
        backgroundColor: theme.primary,
    },
    durationText: {
        color: theme.primaryDark,
        fontSize: 11,
        fontWeight: '900',
    },
});
