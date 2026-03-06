import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Audio } from 'expo-av';
import { RADIUS } from '../../../theme/theme';

const formatDuration = (millis = 0) => {
    const totalSeconds = Math.max(0, Math.floor(Number(millis || 0) / 1000));
    const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
    const seconds = String(totalSeconds % 60).padStart(2, '0');
    return `${minutes}:${seconds}`;
};

function VoicePostComponent({ duration, mediaUrl }) {
    const sourceUri = String(mediaUrl || '').trim();
    const soundRef = useRef(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [durationMillis, setDurationMillis] = useState(0);

    const statusDuration = useMemo(() => {
        if (durationMillis > 0) {
            return formatDuration(durationMillis);
        }
        return String(duration || '0:15');
    }, [duration, durationMillis]);

    useEffect(() => {
        return () => {
            const activeSound = soundRef.current;
            if (activeSound) {
                soundRef.current = null;
                activeSound.unloadAsync().catch(() => {});
            }
        };
    }, []);

    const handlePlaybackStatus = useCallback((status) => {
        if (!status || !status.isLoaded) {
            setIsPlaying(false);
            return;
        }
        setIsPlaying(Boolean(status.isPlaying));
        if (Number.isFinite(Number(status.durationMillis)) && Number(status.durationMillis) > 0) {
            setDurationMillis(Number(status.durationMillis));
        }
    }, []);

    const togglePlayback = useCallback(async () => {
        if (!sourceUri) return;
        try {
            setIsLoading(true);
            if (!soundRef.current) {
                const created = await Audio.Sound.createAsync(
                    { uri: sourceUri },
                    { shouldPlay: true },
                    handlePlaybackStatus
                );
                soundRef.current = created.sound;
                setIsPlaying(true);
            } else {
                const status = await soundRef.current.getStatusAsync();
                if (status?.isLoaded && status.isPlaying) {
                    await soundRef.current.pauseAsync();
                    setIsPlaying(false);
                } else {
                    await soundRef.current.playAsync();
                    setIsPlaying(true);
                }
            }
        } catch (_error) {
            setIsPlaying(false);
        } finally {
            setIsLoading(false);
        }
    }, [handlePlaybackStatus, sourceUri]);

    return (
        <View style={styles.container}>
            <TouchableOpacity
                style={[styles.playButton, !sourceUri && styles.playButtonDisabled]}
                onPress={togglePlayback}
                activeOpacity={0.85}
                disabled={!sourceUri || isLoading}
            >
                {isLoading ? (
                    <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                    <Text style={styles.playText}>{isPlaying ? '❚❚' : '▶'}</Text>
                )}
            </TouchableOpacity>
            <View style={styles.progressTrack}>
                <View style={[styles.progressFill, isPlaying && styles.progressFillActive]} />
            </View>
            <Text style={styles.durationText}>{statusDuration}</Text>
        </View>
    );
}

export default memo(VoicePostComponent);

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#faf8ff',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e9ddff',
        padding: 12,
        marginBottom: 8,
    },
    playButton: {
        width: 40,
        height: 40,
        borderRadius: RADIUS.full,
        backgroundColor: '#6d28d9',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
    },
    playButtonDisabled: {
        opacity: 0.45,
    },
    playText: {
        color: '#ffffff',
        fontSize: 14,
        marginLeft: 2,
        fontWeight: '800',
    },
    progressTrack: {
        flex: 1,
        height: 6,
        borderRadius: RADIUS.full,
        backgroundColor: '#e9ddff',
        marginHorizontal: 12,
        overflow: 'hidden',
    },
    progressFill: {
        width: '35%',
        height: '100%',
        backgroundColor: '#6d28d9',
        opacity: 0.55,
    },
    progressFillActive: {
        opacity: 1,
    },
    durationText: {
        color: '#6b7280',
        fontSize: 11,
        fontWeight: '700',
    },
});
