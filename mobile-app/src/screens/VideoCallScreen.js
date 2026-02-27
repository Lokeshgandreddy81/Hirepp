import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconMic, IconCamera, IconPhone } from '../components/Icons';
import SocketService from '../services/socket';
import { endCall } from '../services/WebRTCService';
import { trackEvent } from '../services/analytics';

const formatDuration = (secs) => {
    const m = String(Math.floor(secs / 60)).padStart(2, '0');
    const s = String(secs % 60).padStart(2, '0');
    return `${m}:${s}`;
};

export default function VideoCallScreen({ route, navigation }) {
    const insets = useSafeAreaInsets();
    const { roomId, applicationId, otherPartyName = 'Candidate' } = route.params || {};
    const [isMuted, setIsMuted] = useState(false);
    const [isCameraOn, setIsCameraOn] = useState(true);
    const [duration, setDuration] = useState(0);
    const [callStatus, setCallStatus] = useState('connecting');
    const hasTrackedStartRef = useRef(false);

    useEffect(() => {
        const timeout = setTimeout(() => setCallStatus('connected'), 800);
        return () => clearTimeout(timeout);
    }, []);

    useEffect(() => {
        if (callStatus !== 'connected') return;
        const interval = setInterval(() => setDuration(d => d + 1), 1000);
        return () => clearInterval(interval);
    }, [callStatus]);

    useEffect(() => {
        if (callStatus !== 'connected' || hasTrackedStartRef.current) return;
        const payload = {
            roomId: String(roomId || applicationId || ''),
            applicationId: String(applicationId || ''),
            source: route?.params?.source || 'video_call_screen',
        };
        trackEvent('VIDEO_CALL_STARTED', payload);
        hasTrackedStartRef.current = true;
    }, [applicationId, callStatus, roomId, route?.params?.source]);

    const handleEndCall = () => {
        endCall(SocketService, roomId || applicationId);
        setCallStatus('ended');
        navigation.goBack();
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}> 
            <View style={styles.remoteVideo}>
                {/* TODO: wire RTCPeerConnection when react-native-webrtc available */}
                <Text style={styles.remoteLabel}>{otherPartyName}</Text>
                <Text style={styles.statusText}>{callStatus === 'connecting' ? 'Connecting…' : 'Live'}</Text>
            </View>

            <View style={styles.localVideo}>
                <Text style={styles.localLabel}>You</Text>
            </View>

            <View style={[styles.controls, { paddingBottom: Math.max(insets.bottom, 16) }]}> 
                <View style={styles.controlRow}>
                    <TouchableOpacity
                        style={[styles.controlButton, isMuted && styles.controlButtonActive]}
                        onPress={() => setIsMuted(prev => !prev)}
                    >
                        <IconMic size={20} color={isMuted ? '#fff' : '#1e293b'} />
                        <Text style={[styles.controlText, isMuted && styles.controlTextActive]}>{isMuted ? 'Unmute' : 'Mute'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.controlButton, !isCameraOn && styles.controlButtonActive]}
                        onPress={() => setIsCameraOn(prev => !prev)}
                    >
                        <IconCamera size={20} color={!isCameraOn ? '#fff' : '#1e293b'} />
                        <Text style={[styles.controlText, !isCameraOn && styles.controlTextActive]}>{isCameraOn ? 'Cam' : 'Off'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.controlButton, styles.endButton]}
                        onPress={handleEndCall}
                    >
                        <IconPhone size={20} color="#fff" />
                        <Text style={[styles.controlText, styles.endText]}>End</Text>
                    </TouchableOpacity>
                </View>
                <Text style={styles.durationText}>Duration: {formatDuration(duration)}</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f172a',
    },
    remoteVideo: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#0f172a',
    },
    remoteLabel: {
        color: '#fff',
        fontSize: 20,
        fontWeight: '700',
    },
    statusText: {
        color: '#94a3b8',
        marginTop: 8,
    },
    localVideo: {
        position: 'absolute',
        right: 16,
        top: 16,
        width: 120,
        height: 160,
        borderRadius: 12,
        backgroundColor: '#1e293b',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#334155',
    },
    localLabel: {
        color: '#e2e8f0',
        fontSize: 12,
    },
    controls: {
        backgroundColor: '#0b1220',
        paddingTop: 16,
        paddingHorizontal: 16,
        borderTopWidth: 1,
        borderTopColor: '#1e293b',
    },
    controlRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
    },
    controlButton: {
        flex: 1,
        backgroundColor: '#e2e8f0',
        borderRadius: 14,
        paddingVertical: 12,
        alignItems: 'center',
        gap: 4,
    },
    controlButtonActive: {
        backgroundColor: '#7c3aed',
    },
    controlText: {
        fontSize: 12,
        color: '#1e293b',
        fontWeight: '700',
    },
    controlTextActive: {
        color: '#ffffff',
    },
    endButton: {
        backgroundColor: '#dc2626',
    },
    endText: {
        color: '#fff',
    },
    durationText: {
        marginTop: 12,
        color: '#94a3b8',
        textAlign: 'center',
        fontSize: 12,
    },
});
