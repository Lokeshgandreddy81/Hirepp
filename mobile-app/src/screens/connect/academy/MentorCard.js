import React, { memo, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { theme, RADIUS } from '../../../theme/theme';

function MentorCardComponent({ mentor, isConnected, onConnect }) {
    const handleConnect = useCallback(() => {
        onConnect(mentor.id);
    }, [onConnect, mentor.id]);

    const buttonStyle = useMemo(() => [
        styles.connectButton,
        isConnected && styles.connectButtonDone,
    ], [isConnected]);

    const buttonTextStyle = useMemo(() => [
        styles.connectButtonText,
        isConnected && styles.connectButtonTextDone,
    ], [isConnected]);

    return (
        <View style={styles.card}>
            <Image source={{ uri: mentor.avatar }} style={styles.avatar} />
            <View style={styles.main}>
                <Text style={styles.skillLabel}>{mentor.skill.toUpperCase()}</Text>
                <Text style={styles.nameText}>{mentor.name} ({mentor.exp} Exp)</Text>
                <Text style={styles.metaText}>⭐ {mentor.rating} · {mentor.sessions} sessions</Text>
            </View>
            <TouchableOpacity style={buttonStyle} onPress={handleConnect}>
                <Text style={buttonTextStyle}>{isConnected ? 'REQUESTED ✓' : 'CONNECT'}</Text>
            </TouchableOpacity>
        </View>
    );
}

export default memo(MentorCardComponent);

const styles = StyleSheet.create({
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        backgroundColor: theme.primaryLight,
        borderWidth: 1,
        borderColor: theme.borderMedium,
        borderRadius: RADIUS.xl,
        padding: 16,
        marginBottom: 12,
        shadowColor: theme.textPrimary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: RADIUS.md,
    },
    main: {
        flex: 1,
    },
    skillLabel: {
        fontSize: 10,
        fontWeight: '900',
        color: theme.primaryDark,
        marginBottom: 4,
    },
    nameText: {
        fontSize: 14,
        fontWeight: '900',
        color: theme.textPrimary,
    },
    metaText: {
        fontSize: 9,
        color: theme.textMuted,
        marginTop: 2,
    },
    connectButton: {
        backgroundColor: theme.primary,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: RADIUS.md,
    },
    connectButtonDone: {
        backgroundColor: theme.surface,
        borderWidth: 1,
        borderColor: theme.primaryLight,
    },
    connectButtonText: {
        fontSize: 10,
        fontWeight: '900',
        color: theme.surface,
    },
    connectButtonTextDone: {
        color: theme.primary,
    },
});
