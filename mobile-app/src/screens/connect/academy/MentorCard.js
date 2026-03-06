import React, { memo, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { RADIUS } from '../../../theme/theme';
import { connectPalette, connectShadow } from '../connectPalette';

function MentorCardComponent({ mentor, isConnected, onConnect }) {
    const safeMentor = (mentor && typeof mentor === 'object') ? mentor : {};
    const mentorId = String(safeMentor.id || '').trim();
    const mentorName = String(safeMentor.name || 'Mentor').trim() || 'Mentor';
    const mentorExp = String(safeMentor.exp || '0y').trim() || '0y';
    const mentorSkill = String(safeMentor.skill || 'General').trim() || 'General';
    const mentorRating = String(safeMentor.rating || '-').trim() || '-';
    const mentorSessions = String(safeMentor.sessions || '0').trim() || '0';
    const mentorReason = String(safeMentor.reason || '').trim();
    const mentorAvatar = String(safeMentor.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(mentorName)}&background=8b3dff&color=fff&rounded=true`);

    const handleConnect = useCallback(() => {
        if (mentorId) {
            onConnect(mentorId);
        }
    }, [onConnect, mentorId]);

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
            <Image source={{ uri: mentorAvatar }} style={styles.avatar} />
            <View style={styles.main}>
                <Text style={styles.skillLabel}>{mentorSkill.toUpperCase()}</Text>
                <Text style={styles.nameText}>{mentorName} ({mentorExp} Exp)</Text>
                <Text style={styles.metaText}>⭐ {mentorRating} · {mentorSessions} sessions</Text>
                {mentorReason ? <Text style={styles.reasonText}>{mentorReason}</Text> : null}
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
        backgroundColor: '#f6f2ff',
        borderWidth: 1,
        borderColor: connectPalette.line,
        borderRadius: RADIUS.xl,
        padding: 16,
        marginBottom: 12,
        ...connectShadow,
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
        color: connectPalette.accentDark,
        marginBottom: 4,
    },
    nameText: {
        fontSize: 14,
        fontWeight: '800',
        color: connectPalette.text,
    },
    metaText: {
        fontSize: 9,
        color: connectPalette.subtle,
        marginTop: 2,
    },
    reasonText: {
        marginTop: 4,
        fontSize: 10,
        color: connectPalette.muted,
        lineHeight: 14,
    },
    connectButton: {
        backgroundColor: connectPalette.accent,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: RADIUS.md,
    },
    connectButtonDone: {
        backgroundColor: connectPalette.surface,
        borderWidth: 1,
        borderColor: connectPalette.accentSoftAlt,
    },
    connectButtonText: {
        fontSize: 10,
        fontWeight: '900',
        color: connectPalette.surface,
    },
    connectButtonTextDone: {
        color: connectPalette.accentDark,
    },
});
