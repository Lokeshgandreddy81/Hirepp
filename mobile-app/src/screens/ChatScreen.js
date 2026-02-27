import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, FlatList,
    StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Animated, Image, Modal, Alert, ActivityIndicator, Linking
} from 'react-native';
import { logger } from '../utils/logger';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconVideo, IconPhone, IconPlus, IconSend, IconMic, IconGlobe, IconSparkles, IconBriefcase, IconCheck } from '../components/Icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { saveLimitedCache } from '../utils/cacheManager';
import { triggerHaptic } from '../utils/haptics';
import client from '../api/client';
import { BASE_URL } from '../config';
import { AuthContext } from '../context/AuthContext';
import SkeletonLoader from '../components/SkeletonLoader';
import SocketService from '../services/socket';
import * as DocumentPicker from 'expo-document-picker';
import { initiateCall } from '../services/WebRTCService';

const AI_SUGGESTIONS = [
    "Sounds great, thanks!",
    "Can we do tomorrow?",
    "What's the salary range?"
];

// Typing Indicator Component
const TypingIndicator = () => {
    const dot1 = useRef(new Animated.Value(0)).current;
    const dot2 = useRef(new Animated.Value(0)).current;
    const dot3 = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const createAnimation = (anim, delay) => {
            return Animated.loop(
                Animated.sequence([
                    Animated.timing(anim, { toValue: -6, duration: 300, delay, useNativeDriver: true }),
                    Animated.timing(anim, { toValue: 0, duration: 300, useNativeDriver: true }),
                    Animated.delay(400)
                ])
            );
        };
        createAnimation(dot1, 0).start();
        createAnimation(dot2, 150).start();
        createAnimation(dot3, 300).start();
    }, []);

    return (
        <View style={styles.typingContainer}>
            <Animated.View style={[styles.typingDot, { transform: [{ translateY: dot1 }] }]} />
            <Animated.View style={[styles.typingDot, { transform: [{ translateY: dot2 }] }]} />
            <Animated.View style={[styles.typingDot, { transform: [{ translateY: dot3 }] }]} />
        </View>
    );
};

export default function ChatScreen({ route, navigation }) {
    const insets = useSafeAreaInsets();
    const { applicationId, otherPartyName = 'Logitech', jobTitle = 'Moving the world, one delivery at a time.', status = 'Applied' } = route.params || {};

    const { userInfo } = React.useContext(AuthContext);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [showAttachments, setShowAttachments] = useState(false);
    const [isTyping, setIsTyping] = useState(false); // legacy — used for incoming socket typing
    const [isOtherTyping, setIsOtherTyping] = useState(false);
    const [lastReadByOther, setLastReadByOther] = useState(null);
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isScreenReady, setIsScreenReady] = useState(false);
    const [uploadingFile, setUploadingFile] = useState(false);

    const flatListRef = useRef(null);
    const typingTimeout = useRef(null);

    useEffect(() => {
        const timeout = setTimeout(() => setIsScreenReady(true), 50);
        return () => clearTimeout(timeout);
    }, []);

    useEffect(() => {
        if (!applicationId) return;

        // Fetch history
        const fetchHistory = async () => {
            try {
                // 1. Try cache
                const cached = await AsyncStorage.getItem(`@chat_history_${applicationId}`);
                if (cached) {
                    setMessages(JSON.parse(cached));
                    setIsLoading(false);
                }
            } catch (e) {
                logger.error("Chat cache error", e);
            }

            try {
                // 2. Fetch fresh
                const { data } = await client.get(`/api/chat/${applicationId}`);
                if (data && Array.isArray(data)) {
                    setMessages(data);
                    // 3. Update cache (max 100 messages to prevent unbounded bloat)
                    saveLimitedCache(`@chat_history_${applicationId}`, data, 100);
                }
            } catch (err) {
                logger.error('Failed to fetch chat history', err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchHistory();

        // Setup Socket
        const handleNewMessage = (msg) => {
            setMessages((prev) => [...prev, msg]);
            setIsTyping(false);
        };

        SocketService.on('receiveMessage', handleNewMessage);

        // Typing indicators — Feature 4
        SocketService.on('user_typing', ({ userId }) => {
            if (userId !== userInfo?._id) setIsOtherTyping(true);
        });
        SocketService.on('user_stop_typing', ({ userId }) => {
            if (userId !== userInfo?._id) setIsOtherTyping(false);
        });

        // Read receipts — Feature 5
        SocketService.on('messages_read_ack', ({ userId, readAt }) => {
            if (userId !== userInfo?._id) setLastReadByOther(readAt);
        });

        // Ensure we join the room if connected
        SocketService.emit('joinRoom', { applicationId });

        return () => {
            SocketService.off('receiveMessage');
            SocketService.off('user_typing');
            SocketService.off('user_stop_typing');
            SocketService.off('messages_read_ack');
            if (typingTimeout.current) clearTimeout(typingTimeout.current);
        };
    }, [applicationId]);

    // Emit read receipts when messages load or change — Feature 5
    useEffect(() => {
        if (!applicationId || !userInfo) return;
        SocketService.emit('messages_read', { roomId: applicationId, userId: userInfo._id });
    }, [messages.length]);

    const getMessageStatus = (message) => {
        if (!userInfo) return null;
        const senderId = typeof message.sender === 'object' ? message.sender?._id : message.sender;
        if (senderId !== userInfo._id) return null;
        if (lastReadByOther && new Date(lastReadByOther) >= new Date(message.createdAt || message.timestamp)) return 'seen';
        return 'sent';
    };

    const sendMessage = async (payload = input) => {
        if (!userInfo) return;
        const isTextPayload = typeof payload === 'string';
        const trimmedText = isTextPayload ? payload.trim() : '';
        if (isTextPayload && !trimmedText) return;

        // Stop typing on send
        if (typingTimeout.current) clearTimeout(typingTimeout.current);
        SocketService.emit('stop_typing', { roomId: applicationId, userId: userInfo._id });

        // Send via socket
        SocketService.emit('sendMessage', {
            applicationId,
            senderId: userInfo._id,
            ...(isTextPayload ? { text: trimmedText } : payload)
        });

        triggerHaptic.light();
        if (isTextPayload) setInput('');
    };

    const handleInputChange = (text) => {
        setInput(text);
        if (!userInfo || !applicationId) return;
        // Emit typing
        SocketService.emit('typing', { roomId: applicationId, userId: userInfo._id });
        // Debounce stop_typing
        if (typingTimeout.current) clearTimeout(typingTimeout.current);
        typingTimeout.current = setTimeout(() => {
            SocketService.emit('stop_typing', { roomId: applicationId, userId: userInfo._id });
        }, 1500);
    };

    const handleStartVideoCall = () => {
        if (!applicationId) return;
        initiateCall(SocketService, applicationId, userInfo?._id);
        navigation.navigate('VideoCall', { roomId: applicationId, applicationId, otherPartyName });
    };

    const uploadAttachment = async (file) => {
        if (!file || !applicationId) return;
        setUploadingFile(true);
        try {
            const formData = new FormData();
            formData.append('file', {
                uri: file.uri,
                name: file.name || 'attachment',
                type: file.mimeType || 'application/octet-stream',
            });
            formData.append('applicationId', applicationId);

            const { data } = await client.post('/api/chat/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            sendMessage({
                type: 'file',
                fileUrl: data?.url,
                fileName: file.name || 'Attachment',
                fileSize: file.size
            });
        } catch (e) {
            Alert.alert('Upload Failed', 'Could not upload file. Please try again.');
        } finally {
            setUploadingFile(false);
        }
    };

    const handlePickDocument = async () => {
        setShowAttachments(false);
        const result = await DocumentPicker.getDocumentAsync({
            type: [
                'application/pdf',
                'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            ],
            copyToCacheDirectory: true,
        });

        if (result.canceled) return;
        const file = result.assets?.[0];
        if (file) await uploadAttachment(file);
    };

    const handlePickImage = async () => {
        setShowAttachments(false);
        const result = await DocumentPicker.getDocumentAsync({
            type: ['image/*'],
            copyToCacheDirectory: true,
        });

        if (result.canceled) return;
        const file = result.assets?.[0];
        if (file) await uploadAttachment(file);
    };

    const handleAttachmentPress = () => {
        setShowAttachments(true);
        Alert.alert(
            'Share',
            'What would you like to share?',
            [
                { text: '📄 Resume / Document', onPress: handlePickDocument },
                { text: '📷 Photo', onPress: handlePickImage },
                { text: 'Cancel', style: 'cancel', onPress: () => setShowAttachments(false) },
            ],
            { cancelable: true, onDismiss: () => setShowAttachments(false) }
        );
    };

    const submitUserReport = async (userId) => {
        try {
            await client.post('/api/reports', { targetId: userId, targetType: 'user', reason: 'reported_from_chat' });
        } catch (e) { /* ignore */ }
        Alert.alert('User Reported', 'User reported. You can block them too.', [
            { text: 'Block User', style: 'destructive', onPress: () => { navigation.goBack(); } },
            { text: 'OK', style: 'cancel' }
        ]);
    };

    const handleReportUser = () => {
        Alert.alert('Report User', 'Why are you reporting this user?', [
            { text: 'Spam', onPress: () => submitUserReport(applicationId) },
            { text: 'Harassment', onPress: () => submitUserReport(applicationId) },
            { text: 'Fake Profile', onPress: () => submitUserReport(applicationId) },
            { text: 'Cancel', style: 'cancel' }
        ]);
    };

    const formatTime = (iso) => {
        try {
            return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } catch {
            return '';
        }
    };

    const lastMyMessageId = useMemo(() => {
        if (!userInfo || messages.length === 0) return null;
        for (let i = messages.length - 1; i >= 0; i -= 1) {
            const msg = messages[i];
            const sid = typeof msg.sender === 'object' ? msg.sender?._id : msg.sender;
            if (sid === userInfo._id) return msg._id;
        }
        return null;
    }, [messages, userInfo]);

    const renderMessage = ({ item, index }) => {
        const isSystem = item.type === 'system';
        const senderId = typeof item.sender === 'object' ? item.sender?._id : item.sender;
        const isMe = userInfo && senderId === userInfo._id;

        // Determine if this is the last message sent by me
        const isLastMyMsg = lastMyMessageId && lastMyMessageId === item._id;
        const status = isLastMyMsg ? getMessageStatus(item) : null;

        if (isSystem) {
            return (
                <View style={styles.sysMsgWrapper}>
                    <Text style={styles.sysMsgText}>{item.text}</Text>
                </View>
            );
        }

        if (item.type === 'file') {
            return (
                <View style={[styles.msgWrapper, isMe ? styles.msgWrapperMe : styles.msgWrapperThem]}>
                    <TouchableOpacity
                        style={[styles.bubble, styles.fileBubble, isMe ? styles.fileBubbleMe : styles.fileBubbleThem]}
                        onPress={() => item.fileUrl && Linking.openURL(item.fileUrl)}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.fileEmoji}>📄</Text>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.fileName} numberOfLines={1}>{item.fileName || 'Document'}</Text>
                            <Text style={styles.fileMeta}>
                                {item.fileSize ? `${Math.round(item.fileSize / 1024)} KB · Tap to open` : 'Tap to open'}
                            </Text>
                        </View>
                    </TouchableOpacity>
                    {status === 'seen' && <Text style={styles.readReceiptText}>✓✓ Seen</Text>}
                    {status === 'sent' && <Text style={styles.readReceiptText}>✓ Sent</Text>}
                </View>
            );
        }

        return (
            <View style={[styles.msgWrapper, isMe ? styles.msgWrapperMe : styles.msgWrapperThem]}>
                <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
                    <Text style={[styles.bubbleText, isMe ? styles.bubbleTextMe : styles.bubbleTextThem]}>
                        {item.text}
                    </Text>
                    <Text style={styles.timeText}>
                        {formatTime(item.createdAt)}
                    </Text>
                </View>
                {status === 'seen' && <Text style={styles.readReceiptText}>✓✓ Seen</Text>}
                {status === 'sent' && <Text style={styles.readReceiptText}>✓ Sent</Text>}
            </View>
        );
    };

    const renderHeader = () => (
        <View style={[styles.header, { paddingTop: insets.top }]}>
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                <Text style={styles.backArrow}>‹</Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={styles.headerInfoContainer}
                activeOpacity={0.7}
                onPress={() => setShowProfileModal(true)}
                onLongPress={handleReportUser}
            >
                <Image source={{ uri: `https://ui-avatars.com/api/?name=${otherPartyName}&background=7c3aed&color=fff` }} style={styles.headerAvatar} />
                <View style={styles.headerInfoText}>
                    <Text style={styles.headerName} numberOfLines={1}>{otherPartyName}</Text>
                    <Text style={styles.headerSub} numberOfLines={1}>
                        {isOtherTyping ? 'typing...' : status}
                    </Text>
                </View>
            </TouchableOpacity>

            <View style={styles.headerActions}>
                <TouchableOpacity style={styles.headerActionBtn} onPress={handleStartVideoCall}>
                    <IconVideo size={20} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.headerActionBtn}>
                    <IconPhone size={20} color="#fff" />
                </TouchableOpacity>
            </View>
        </View>
    );

    const products = [
        { name: 'Express Last-Mile', icon: '🚚', desc: 'Tech-enabled delivery for e-commerce and retail.' },
        { name: 'Cold Chain Pros', icon: '❄️', desc: 'Temperature-sensitive food and vaccine transport.' },
        { name: 'Heavy Hauling', icon: '🏗️', desc: 'Industrial equipment and raw material infrastructure.' },
        { name: 'Warehouse Smart', icon: '🏢', desc: 'AI-driven inventory and storage management.' }
    ];

    const milestones = [
        { year: '2023', event: 'Reached 10M successful deliveries nationwide' },
        { year: '2021', event: 'Expanded cross-border logistics to SEA regions' },
        { year: '2015', event: 'Founded in Hyderabad as a small bike-fleet' }
    ];

    if (!isScreenReady) {
        return <View style={styles.container} />;
    }

    return (
        <View style={styles.container}>
            {renderHeader()}

            {isLoading ? (
                <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
                    <SkeletonLoader height={60} style={{ borderRadius: 16, marginBottom: 12, width: '70%', alignSelf: 'flex-start' }} />
                    <SkeletonLoader height={60} style={{ borderRadius: 16, marginBottom: 12, width: '60%', alignSelf: 'flex-end', backgroundColor: '#e9d5ff' }} />
                    <SkeletonLoader height={60} style={{ borderRadius: 16, marginBottom: 12, width: '75%', alignSelf: 'flex-start' }} />
                </View>
            ) : (
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    keyExtractor={item => item._id}
                    renderItem={renderMessage}
                    style={{ flex: 1 }}
                    contentContainerStyle={styles.messagesList}
                    showsVerticalScrollIndicator={false}
                    getItemLayout={(data, index) => ({
                        length: 80,
                        offset: 80 * index,
                        index,
                    })}
                    maxToRenderPerBatch={10}
                    windowSize={5}
                    removeClippedSubviews={false}
                    initialNumToRender={15}
                    onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                    onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
                    ListFooterComponent={() => isOtherTyping ? (
                        <View style={styles.typingWrapper}>
                            <View style={styles.typingBubble}>
                                <TypingIndicator />
                            </View>
                        </View>
                    ) : null}
                />
            )}

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={0}>
                {/* Suggestions */}
                <View style={styles.suggestionsContainer}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.suggestionsContent}>
                        {AI_SUGGESTIONS.map((sugg, idx) => (
                            <TouchableOpacity key={idx} style={styles.suggPill} onPress={() => setInput(sugg)}>
                                <Text style={styles.suggText}>✨ Suggest: {sugg}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {/* Input Bar */}
                <View style={[styles.inputBar, { paddingBottom: insets.bottom + 8 }]}>
                    <TouchableOpacity
                        style={[styles.attachBtn, showAttachments && styles.attachBtnActive]}
                        onPress={handleAttachmentPress}
                        disabled={uploadingFile}
                    >
                        <View style={{ transform: [{ rotate: showAttachments ? '45deg' : '0deg' }] }}>
                            <IconPlus size={24} color={showAttachments ? '#1e293b' : '#64748b'} />
                        </View>
                    </TouchableOpacity>

                    <View style={styles.inputWrap}>
                        <TextInput
                            style={styles.inputField}
                            placeholder="Type a message..."
                            placeholderTextColor="#94a3b8"
                            value={input}
                            onChangeText={handleInputChange}
                            multiline
                            editable={!uploadingFile}
                        />
                    </View>

                    {uploadingFile ? (
                        <View style={styles.uploadingIndicator}>
                            <ActivityIndicator size="small" color="#9333ea" />
                        </View>
                    ) : input.trim() ? (
                        <TouchableOpacity style={styles.sendBtn} onPress={() => sendMessage()}>
                            <IconSend size={18} color="#fff" />
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity style={styles.micBtn}>
                            <IconMic size={24} color="#64748b" />
                        </TouchableOpacity>
                    )}
                </View>
            </KeyboardAvoidingView>

            {/* Profile Detail Modal fully mapped to ContactInfoView */}
            <Modal
                visible={showProfileModal}
                animationType="slide"
                presentationStyle="fullScreen"
                onRequestClose={() => setShowProfileModal(false)}
            >
                <View style={[styles.modalContainer, { paddingTop: insets.top }]}>
                    <View style={styles.modalHeader}>
                        <TouchableOpacity onPress={() => setShowProfileModal(false)} style={styles.modalBackBtnModal}>
                            <Text style={styles.modalBackIconModal}>‹</Text>
                        </TouchableOpacity>
                        <Text style={styles.modalTitle}>Enterprise Hub</Text>
                    </View>
                    <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} bounces={false}>
                        <View style={styles.bannerContainer}>
                            {/* Mocking radial gradient and background */}
                            <Image
                                source={{ uri: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?q=80&w=800&auto=format&fit=crop' }}
                                style={styles.bannerImage}
                            />
                            <View style={styles.bannerPillContainer}>
                                <View style={styles.bannerPill}>
                                    <Text style={styles.bannerPillText}>Logistics & Supply Chain</Text>
                                </View>
                            </View>
                        </View>

                        <View style={styles.profileSection}>
                            <Image source={{ uri: `https://ui-avatars.com/api/?name=${otherPartyName}&background=7c3aed&color=fff&size=512` }} style={styles.contactAvatarLg} />

                            <View style={styles.nameRow}>
                                <Text style={styles.contactName}>{otherPartyName}</Text>
                                <View style={styles.verifiedBadge}>
                                    <IconCheck size={14} color="#6366f1" />
                                </View>
                            </View>
                            <Text style={styles.contactRole}>{jobTitle}</Text>

                            <View style={styles.actionRow}>
                                <TouchableOpacity style={styles.actionBtnModal}>
                                    <View style={styles.actionIconWrap}>
                                        <IconPhone size={20} color="#9333ea" />
                                    </View>
                                    <Text style={styles.actionBtnText}>CALL</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.actionBtnModal}>
                                    <View style={styles.actionIconWrap}>
                                        <IconVideo size={20} color="#9333ea" />
                                    </View>
                                    <Text style={styles.actionBtnText}>VIDEO</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.actionBtnModal}>
                                    <View style={styles.actionIconWrap}>
                                        <IconGlobe size={20} color="#9333ea" />
                                    </View>
                                    <Text style={styles.actionBtnText}>SITE</Text>
                                </TouchableOpacity>
                            </View>

                            {/* Section Cards */}
                            <View style={styles.detailsCard}>
                                <Text style={styles.sectionTitle}><IconSparkles size={14} color="#a855f7" />  MISSION & VISION</Text>
                                <Text style={styles.sectionText}>
                                    We are building the backbone of modern commerce in India. By integrating AI with a massive fleet network, we ensure fair pay for partners and lightning-fast logistics for businesses.
                                </Text>
                                <View style={styles.gridRow}>
                                    <View style={styles.gridBox}>
                                        <Text style={styles.gridBoxLabel}>INDUSTRY</Text>
                                        <Text style={styles.gridBoxValue}>Logistics & Supply Chain</Text>
                                    </View>
                                    <View style={styles.gridBox}>
                                        <Text style={styles.gridBoxLabel}>GLOBAL HQ</Text>
                                        <Text style={styles.gridBoxValue}>Hyderabad, IN</Text>
                                    </View>
                                </View>
                            </View>

                            <View style={styles.detailsCard}>
                                <Text style={styles.sectionTitle}><IconBriefcase size={14} color="#a855f7" />  PRODUCTS & SERVICES</Text>
                                {products.map((p, idx) => (
                                    <View key={idx} style={styles.productRow}>
                                        <View style={styles.productIconBox}>
                                            <Text style={styles.productIconEmoji}>{p.icon}</Text>
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.productName}>{p.name}</Text>
                                            <Text style={styles.productDesc}>{p.desc}</Text>
                                        </View>
                                    </View>
                                ))}
                            </View>

                            <View style={styles.detailsCard}>
                                <Text style={styles.sectionTitle}><IconGlobe size={14} color="#a855f7" />  TIMELINE</Text>
                                <View style={styles.timelineContainer}>
                                    <View style={styles.timelineLine} />
                                    {milestones.map((m, idx) => (
                                        <View key={idx} style={styles.timelineItem}>
                                            <View style={styles.timelineDot} />
                                            <View style={styles.timelineYearBadge}>
                                                <Text style={styles.timelineYearText}>{m.year}</Text>
                                            </View>
                                            <Text style={styles.timelineEventText}>{m.event}</Text>
                                        </View>
                                    ))}
                                </View>
                            </View>

                            <View style={styles.darkCard}>
                                <View style={styles.darkCardIconBg}>
                                    <IconGlobe size={80} color="rgba(255,255,255,0.05)" />
                                </View>
                                <Text style={styles.sectionTitleDark}>CONTACT INFORMATION</Text>
                                <View style={styles.darkRow}>
                                    <Text style={styles.darkLabel}>PARTNERSHIP</Text>
                                    <Text style={styles.darkValue}>partners@logitech.in</Text>
                                </View>
                                <View style={styles.darkRow}>
                                    <Text style={styles.darkLabel}>SUPPORT</Text>
                                    <Text style={styles.darkValue}>+91 1800 200 1234</Text>
                                </View>
                                <View style={styles.darkRow}>
                                    <Text style={styles.darkLabel}>OFFICIAL WEB</Text>
                                    <Text style={styles.darkValue}>www.logitech.in</Text>
                                </View>
                            </View>
                            <View style={{ height: 40 }} />
                        </View>
                    </ScrollView>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f3e8ff' }, // matching ref

    // Header
    header: { backgroundColor: '#9333ea', paddingHorizontal: 16, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 4, zIndex: 10 },
    backBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center', marginRight: 8, backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: 18 },
    backArrow: { color: '#fff', fontSize: 24, fontWeight: '300', marginBottom: 2 },
    headerInfoContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.1)' },
    headerAvatar: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', marginRight: 12 },
    headerInfoText: { flex: 1 },
    headerName: { color: '#fff', fontSize: 15, fontWeight: '700' },
    headerSub: { color: '#e9d5ff', fontSize: 11, fontWeight: '500' },
    headerActions: { flexDirection: 'row', gap: 6, marginLeft: 8 },
    headerActionBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center', borderRadius: 18 },

    // Messages
    messagesList: { paddingHorizontal: 16, paddingBottom: 24, paddingTop: 16 },
    sysMsgWrapper: { alignItems: 'center', marginVertical: 16 },
    sysMsgText: { backgroundColor: '#fef3c7', color: '#92400e', fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#fde68a' },

    msgWrapper: { maxWidth: '80%', marginBottom: 12 },
    msgWrapperMe: { alignSelf: 'flex-end' },
    msgWrapperThem: { alignSelf: 'flex-start' },
    bubble: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
    bubbleMe: { backgroundColor: '#e9d5ff', borderTopRightRadius: 4, borderWidth: 1, borderColor: '#d8b4fe' },
    bubbleThem: { backgroundColor: '#fff', borderTopLeftRadius: 4 },
    bubbleText: { fontSize: 14, lineHeight: 20 },
    bubbleTextMe: { color: '#0f172a' },
    bubbleTextThem: { color: '#0f172a' },
    timeText: { fontSize: 10, color: '#94a3b8', marginTop: 4, alignSelf: 'flex-end' },
    readReceiptText: { fontSize: 10, color: '#94a3b8', alignSelf: 'flex-end', marginTop: 2, marginRight: 4, fontWeight: '600' },

    // Typing
    typingWrapper: { alignSelf: 'flex-start', marginBottom: 12, marginLeft: 4 },
    typingBubble: { backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 16, borderTopLeftRadius: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
    typingContainer: { flexDirection: 'row', gap: 4, alignItems: 'center', height: 16, paddingHorizontal: 4 },
    typingDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#a855f7' },

    // Suggestions
    suggestionsContainer: { backgroundColor: 'rgba(255,255,255,0.9)', borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingVertical: 8 },
    suggestionsContent: { paddingHorizontal: 16, gap: 8 },
    suggPill: { backgroundColor: '#fff', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#e9d5ff', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 1, elevation: 1 },
    suggText: { fontSize: 12, fontWeight: '800', color: '#7e22ce' },

    // Input Bar
    inputBar: { backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#f1f5f9', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingTop: 8 },
    attachBtn: { padding: 10, borderRadius: 20 },
    attachBtnActive: { backgroundColor: '#f1f5f9' },
    inputWrap: { flex: 1, backgroundColor: '#f8fafc', borderRadius: 24, borderWidth: 1, borderColor: '#f1f5f9', minHeight: 40, maxHeight: 100, justifyContent: 'center' },
    inputField: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10, fontSize: 14, color: '#0f172a' },
    sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#9333ea', justifyContent: 'center', alignItems: 'center', marginLeft: 8, shadowColor: '#9333ea', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 3 },
    micBtn: { padding: 10, marginLeft: 2 },
    uploadingIndicator: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginLeft: 8, backgroundColor: '#f3e8ff' },

    // File message
    fileBubble: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    fileBubbleMe: { backgroundColor: '#ede9fe', borderWidth: 1, borderColor: '#ddd6fe' },
    fileBubbleThem: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0' },
    fileEmoji: { fontSize: 18 },
    fileName: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
    fileMeta: { fontSize: 11, color: '#64748b', marginTop: 2 },

    // Profile Modal Styles mapped from ContactInfoView
    modalContainer: { flex: 1, backgroundColor: '#f8fafc' },
    modalHeader: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#9333ea', paddingVertical: 16, paddingHorizontal: 20 },
    modalBackBtnModal: { marginRight: 16, backgroundColor: 'rgba(255,255,255,0.1)', width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
    modalBackIconModal: { color: '#ffffff', fontSize: 24, fontWeight: '300', marginBottom: 2 },
    modalTitle: { color: '#ffffff', fontSize: 18, fontWeight: '700' },

    bannerContainer: { height: 160, position: 'relative', backgroundColor: '#581c87' },
    bannerImage: { width: '100%', height: '100%', opacity: 0.4 },
    bannerPillContainer: { position: 'absolute', bottom: 16, left: 16 },
    bannerPill: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
    bannerPillText: { color: '#fff', fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 },

    profileSection: { paddingHorizontal: 16, marginTop: -48, alignItems: 'center' },
    contactAvatarLg: { width: 96, height: 96, borderRadius: 24, borderWidth: 4, borderColor: '#ffffff', backgroundColor: '#ffffff', marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 16 },
    nameRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4, gap: 8 },
    contactName: { fontSize: 24, fontWeight: '900', color: '#0f172a' },
    verifiedBadge: { backgroundColor: '#eef2ff', width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    contactRole: { fontSize: 12, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 32, textAlign: 'center', paddingHorizontal: 16 },

    actionRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginBottom: 24, width: '100%', paddingHorizontal: 16 },
    actionBtnModal: { flex: 1, backgroundColor: '#ffffff', borderRadius: 24, padding: 16, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2, borderWidth: 1, borderColor: '#f1f5f9' },
    actionIconWrap: { width: 40, height: 40, borderRadius: 16, backgroundColor: '#faf5ff', justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
    actionBtnText: { fontSize: 10, fontWeight: '900', color: '#94a3b8', letterSpacing: 0.5 },

    detailsCard: { backgroundColor: '#ffffff', borderRadius: 32, padding: 24, marginBottom: 16, borderWidth: 1, borderColor: '#f1f5f9', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1, width: '100%' },
    sectionTitle: { fontSize: 16, fontWeight: '900', color: '#0f172a', marginBottom: 16, flex: 1 },
    sectionText: { fontSize: 14, color: '#475569', lineHeight: 22, fontWeight: '500', marginBottom: 24 },

    gridRow: { flexDirection: 'row', gap: 12 },
    gridBox: { flex: 1, backgroundColor: '#f8fafc', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#f1f5f9' },
    gridBoxLabel: { fontSize: 9, fontWeight: '900', color: '#94a3b8', letterSpacing: 1, marginBottom: 4 },
    gridBoxValue: { fontSize: 12, fontWeight: '900', color: '#334155' },

    productRow: { flexDirection: 'row', gap: 16, padding: 16, backgroundColor: '#f8fafc', borderRadius: 16, borderWidth: 1, borderColor: '#f1f5f9', marginBottom: 12 },
    productIconBox: { width: 48, height: 48, backgroundColor: '#fff', borderRadius: 12, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
    productIconEmoji: { fontSize: 24 },
    productName: { fontSize: 14, fontWeight: '900', color: '#1e293b', marginBottom: 4 },
    productDesc: { fontSize: 12, fontWeight: '500', color: '#64748b', lineHeight: 18 },

    timelineContainer: { paddingLeft: 24, position: 'relative' },
    timelineLine: { position: 'absolute', left: 4, top: 8, bottom: 8, width: 2, backgroundColor: '#f3e8ff' },
    timelineItem: { marginBottom: 24, position: 'relative' },
    timelineDot: { position: 'absolute', left: -25, top: 4, width: 12, height: 12, borderRadius: 6, backgroundColor: '#a855f7', borderWidth: 4, borderColor: '#faf5ff' },
    timelineYearBadge: { backgroundColor: '#faf5ff', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: '#f3e8ff', alignSelf: 'flex-start', marginBottom: 8 },
    timelineYearText: { fontSize: 10, fontWeight: '900', color: '#9333ea' },
    timelineEventText: { fontSize: 14, fontWeight: '700', color: '#334155' },

    darkCard: { backgroundColor: '#0f172a', borderRadius: 32, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 16, elevation: 10, width: '100%', overflow: 'hidden', position: 'relative' },
    darkCardIconBg: { position: 'absolute', top: 16, right: 16, transform: [{ rotate: '12deg' }] },
    sectionTitleDark: { fontSize: 16, fontWeight: '900', color: '#fff', marginBottom: 16, zIndex: 10 },
    darkRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, zIndex: 10 },
    darkLabel: { fontSize: 10, fontWeight: '900', color: '#94a3b8', letterSpacing: 1 },
    darkValue: { fontSize: 14, fontWeight: '900', color: '#c084fc' },
});
