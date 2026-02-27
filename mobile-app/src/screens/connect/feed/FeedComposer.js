import React, { memo, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, TextInput, Image, StyleSheet } from 'react-native';
import { IconMic, IconImage, IconVideo } from '../../../components/Icons';
import { theme, RADIUS } from '../../../theme/theme';

function FeedComposerComponent({
    composerOpen,
    composerMediaType,
    composerText,
    currentUserAvatar,
    onInputAreaClick,
    onMediaButtonClick,
    onCancelComposer,
    onPost,
    onComposerTextChange,
}) {
    const onVoicePress = useCallback(() => onMediaButtonClick('VOICE'), [onMediaButtonClick]);
    const onPhotosPress = useCallback(() => onMediaButtonClick('PHOTOS'), [onMediaButtonClick]);
    const onVideoPress = useCallback(() => onMediaButtonClick('VIDEO'), [onMediaButtonClick]);

    const placeholder = useMemo(() => {
        if (composerMediaType === 'VOICE') return 'Describe your voice note...';
        if (composerMediaType === 'PHOTOS') return 'Caption your photos...';
        if (composerMediaType === 'VIDEO') return 'Caption your video...';
        return 'What do you want to share?';
    }, [composerMediaType]);

    const isPostDisabled = !composerText.trim();

    return (
        <View style={styles.container}>
            <View style={styles.topRow}>
                <Image source={{ uri: currentUserAvatar }} style={styles.avatar} />
                <TouchableOpacity style={styles.inputTrigger} onPress={onInputAreaClick} activeOpacity={0.8}>
                    <Text style={styles.inputTriggerText}>Share your work today...</Text>
                </TouchableOpacity>
            </View>

            {composerOpen ? (
                <TextInput
                    style={styles.textArea}
                    value={composerText}
                    onChangeText={onComposerTextChange}
                    placeholder={placeholder}
                    placeholderTextColor={theme.textMuted}
                    multiline
                    numberOfLines={3}
                    autoFocus
                />
            ) : null}

            <View style={styles.toolbar}>
                <TouchableOpacity style={styles.toolButton} onPress={onVoicePress} activeOpacity={0.8}>
                    <IconMic size={14} color={composerMediaType === 'VOICE' ? theme.primary : theme.textSecondary} />
                    <Text style={[styles.toolText, composerMediaType === 'VOICE' && styles.toolTextActive]}>VOICE</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.toolButton} onPress={onPhotosPress} activeOpacity={0.8}>
                    <IconImage size={14} color={composerMediaType === 'PHOTOS' ? theme.indigo : theme.textSecondary} />
                    <Text style={[styles.toolText, composerMediaType === 'PHOTOS' && styles.toolTextIndigo]}>PHOTOS</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.toolButton} onPress={onVideoPress} activeOpacity={0.8}>
                    <IconVideo size={14} color={composerMediaType === 'VIDEO' ? theme.warning : theme.textSecondary} />
                    <Text style={[styles.toolText, composerMediaType === 'VIDEO' && styles.toolTextWarning]}>VIDEO</Text>
                </TouchableOpacity>

                <View style={styles.divider} />

                {composerOpen ? (
                    <View style={styles.actionsRow}>
                        <TouchableOpacity style={styles.cancelButton} onPress={onCancelComposer} activeOpacity={0.85}>
                            <Text style={styles.cancelText}>CANCEL</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.postButton, isPostDisabled && styles.postButtonDisabled]}
                            onPress={onPost}
                            disabled={isPostDisabled}
                            activeOpacity={0.85}
                        >
                            <Text style={styles.postText}>POST</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <TouchableOpacity style={styles.postButton} onPress={onInputAreaClick} activeOpacity={0.85}>
                        <Text style={styles.postText}>POST</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
}

export default memo(FeedComposerComponent);

const styles = StyleSheet.create({
    container: {
        backgroundColor: theme.surface,
        borderRadius: RADIUS.xl,
        borderWidth: 1,
        borderColor: theme.borderMedium,
        shadowColor: theme.textPrimary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
        padding: 16,
        marginBottom: 16,
    },
    topRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: RADIUS.lg,
        marginRight: 12,
    },
    inputTrigger: {
        flex: 1,
        borderRadius: RADIUS.lg,
        backgroundColor: theme.background,
        borderWidth: 1,
        borderColor: theme.border,
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    inputTriggerText: {
        color: theme.textMuted,
        fontSize: 13,
        fontWeight: '500',
    },
    textArea: {
        marginBottom: 12,
        borderRadius: RADIUS.lg,
        borderWidth: 1,
        borderColor: theme.borderMedium,
        backgroundColor: theme.background,
        color: theme.textPrimary,
        minHeight: 80,
        fontSize: 14,
        lineHeight: 20,
        paddingHorizontal: 16,
        paddingVertical: 12,
        textAlignVertical: 'top',
    },
    toolbar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 4,
    },
    toolButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    toolText: {
        color: theme.textSecondary,
        fontSize: 10,
        fontWeight: '800',
    },
    toolTextActive: {
        color: theme.primary,
    },
    toolTextIndigo: {
        color: theme.indigo,
    },
    toolTextWarning: {
        color: theme.warning,
    },
    divider: {
        width: 1,
        height: 16,
        backgroundColor: theme.borderMedium,
        marginLeft: 8,
        marginRight: 8,
    },
    actionsRow: {
        marginLeft: 'auto',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    cancelButton: {
        borderRadius: RADIUS.sm,
        paddingHorizontal: 10,
        paddingVertical: 6,
        backgroundColor: theme.border,
    },
    cancelText: {
        color: theme.textSecondary,
        fontSize: 10,
        fontWeight: '900',
    },
    postButton: {
        marginLeft: 'auto',
        borderRadius: RADIUS.sm,
        backgroundColor: theme.primaryLight,
        paddingHorizontal: 14,
        paddingVertical: 6,
    },
    postButtonDisabled: {
        opacity: 0.45,
    },
    postText: {
        color: theme.primary,
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 0.3,
    },
});
