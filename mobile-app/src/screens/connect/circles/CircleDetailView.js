import React, { memo, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Image, ScrollView, TextInput, FlatList } from 'react-native';
import { IconCheck, IconMessageSquare, IconMic, IconPlus, IconSend, IconSparkles } from '../../../components/Icons';
import { theme, RADIUS } from '../../../theme/theme';

const DETAIL_TABS = ['DISCUSSION', 'RATES', 'MEMBERS'];

const MEMBERS = [
    { id: 1, name: 'Vijay Kumar', role: 'Admin', joined: '2022', karma: 2100, avatar: 'https://i.pravatar.cc/150?u=vijay', isAdmin: true },
    { id: 2, name: 'Ramesh T.', role: 'Driver', joined: '2023', karma: 890, avatar: 'https://i.pravatar.cc/150?u=ramesh', isAdmin: false },
    { id: 3, name: 'Siva M.', role: 'Mechanic', joined: '2023', karma: 650, avatar: 'https://i.pravatar.cc/150?u=sivam', isAdmin: false },
    { id: 4, name: 'Anita R.', role: 'Driver', joined: '2024', karma: 420, avatar: 'https://i.pravatar.cc/150?u=anita', isAdmin: false },
    { id: 5, name: 'Deepak S.', role: 'Helper', joined: '2024', karma: 210, avatar: 'https://i.pravatar.cc/150?u=deepak', isAdmin: false },
];

function CircleDetailViewComponent({
    visible,
    selectedCircle,
    onClose,
    circleDetailTab,
    onTabChange,
    insetsTop,
    circleChatRef,
    chatText,
    onChatTextChange,
    isCircleRecording,
    onSendTextMessage,
    onToggleVoiceRecording,
    circleCustomRates,
    showCircleRateForm,
    circleRateService,
    circleRatePrice,
    onCircleRateServiceChange,
    onCircleRatePriceChange,
    onSubmitRate,
    onShowRateForm,
    onCancelRateForm,
}) {
    const rates = useMemo(() => ([...(selectedCircle?.rates || []), ...circleCustomRates]), [selectedCircle?.rates, circleCustomRates]);

    const renderTabItem = useCallback(({ item }) => {
        const isActive = circleDetailTab === item;
        const label = item === 'DISCUSSION' ? 'CHAT ROOM' : item;
        return (
            <TouchableOpacity
                style={[styles.modalSubtabItem, isActive && styles.modalSubtabItemActive]}
                onPress={() => onTabChange(item)}
            >
                <Text style={[styles.modalSubtabText, isActive && styles.modalSubtabTextActive]}>{label}</Text>
            </TouchableOpacity>
        );
    }, [circleDetailTab, onTabChange]);

    const rateRows = useMemo(() => (
        rates.map((item, index) => (
            <View key={`${item.service}-${index}`} style={styles.rateRow}>
                <Text style={styles.rateCol1}>{item.service}</Text>
                <Text style={styles.rateCol2}>{item.price}</Text>
            </View>
        ))
    ), [rates]);

    const memberRows = useMemo(() => (
        MEMBERS.map((item) => (
            <View key={item.id} style={styles.memberRow}>
                <View style={styles.memberAvatarWrap}>
                    <Image source={{ uri: item.avatar }} style={styles.memberAvatar} />
                    {item.isAdmin ? (
                        <View style={styles.adminBadge}>
                            <Text style={styles.adminBadgeText}>👑</Text>
                        </View>
                    ) : null}
                </View>
                <View style={styles.memberMain}>
                    <View style={styles.memberNameRow}>
                        <Text style={styles.memberName}>{item.name}</Text>
                        {item.isAdmin ? <IconCheck size={12} color={theme.indigo} /> : null}
                    </View>
                    <Text style={styles.memberSub}>{item.isAdmin ? 'Admin · ' : ''}{item.role} · Since {item.joined}</Text>
                </View>
                <View style={styles.karmaBadge}>
                    <Text style={styles.karmaBadgeText}>{item.karma.toLocaleString()}</Text>
                </View>
                <TouchableOpacity style={styles.memberMsgBtn}>
                    <IconMessageSquare size={16} color={theme.textMuted} />
                </TouchableOpacity>
            </View>
        ))
    ), []);

    return (
        <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
            <View style={styles.modalContainer}>
                <View style={styles.safeTopSpacer} />
                {insetsTop ? <View style={{ height: insetsTop }} /> : null}
                <View style={styles.modalHeaderBg}>
                    <View style={styles.modalHeaderRow}>
                        <TouchableOpacity onPress={onClose} style={styles.modalBackBtn}>
                            <Text style={styles.modalBackIcon}>‹</Text>
                        </TouchableOpacity>
                        <Image source={{ uri: `https://ui-avatars.com/api/?name=${selectedCircle?.name}&background=7c3aed&color=fff&rounded=true` }} style={styles.modalHeaderAvatar} />
                        <View style={styles.modalTitleWrap}>
                            <Text style={styles.modalHeaderTitle}>{selectedCircle?.name}</Text>
                            <Text style={styles.modalHeaderSub}>{selectedCircle?.members} Members • {selectedCircle?.online} Online</Text>
                        </View>
                    </View>
                    <FlatList
                        data={DETAIL_TABS}
                        horizontal
                        keyExtractor={(item) => item}
                        renderItem={renderTabItem}
                        contentContainerStyle={styles.modalSubtabsBg}
                        showsHorizontalScrollIndicator={false}
                    />
                </View>

                <View style={styles.modalContent}>
                    {circleDetailTab === 'DISCUSSION' ? (
                        <View style={styles.flex1}>
                            <ScrollView ref={circleChatRef} contentContainerStyle={styles.chatScrollContent}>
                                <View style={styles.chatTimeDiv}><Text style={styles.chatTimeText}>TODAY</Text></View>
                                <View style={styles.chatBubbleRow}>
                                    <View style={styles.chatBubbleAvatar}><Text style={styles.chatBubbleAvatarText}>R</Text></View>
                                    <View style={styles.chatBubbleContent}>
                                        <View style={styles.chatBubbleMeta}>
                                            <Text style={styles.chatBubbleName}>Ramesh T.</Text>
                                            <Text style={styles.chatBubbleRole}>Driver</Text>
                                        </View>
                                        <View style={styles.chatBubbleTextBg}><Text style={styles.chatBubbleText}>Does anyone know if the NH65 diversions are cleared?</Text></View>
                                        <Text style={styles.chatBubbleTime}>10:05 AM</Text>
                                    </View>
                                </View>
                                <View style={styles.chatBubbleRow}>
                                    <View style={styles.chatBubbleAvatar}><Text style={styles.chatBubbleAvatarText}>V</Text></View>
                                    <View style={styles.chatBubbleContent}>
                                        <View style={styles.chatBubbleMeta}>
                                            <Text style={styles.chatBubbleName}>Vijay Kumar</Text>
                                            <IconCheck size={12} color={theme.indigo} />
                                            <Text style={styles.chatBubbleRole}>Admin</Text>
                                        </View>
                                        <View style={styles.chatBubbleTextBg}><Text style={styles.chatBubbleText}>Yes, I passed through an hour ago. Traffic is moving smoothly.</Text></View>
                                        <Text style={styles.chatBubbleTime}>10:08 AM</Text>
                                    </View>
                                </View>
                            </ScrollView>
                            <View style={styles.chatInputRow}>
                                <TouchableOpacity style={styles.chatAttachBtn}><IconPlus size={20} color={theme.textSecondary} /></TouchableOpacity>
                                <TextInput
                                    style={[styles.chatInputText, isCircleRecording && styles.chatInputRecording]}
                                    placeholder={isCircleRecording ? '🔴 Recording... tap mic to stop' : 'Ask for help or share updates...'}
                                    value={chatText}
                                    onChangeText={onChatTextChange}
                                    editable={!isCircleRecording}
                                />
                                {chatText.length > 0 ? (
                                    <TouchableOpacity style={styles.chatSendBtn} onPress={onSendTextMessage}>
                                        <IconSend size={16} color={theme.surface} />
                                    </TouchableOpacity>
                                ) : (
                                    <TouchableOpacity style={[styles.chatSendBtn, isCircleRecording && styles.chatSendBtnRecording]} onPress={onToggleVoiceRecording}>
                                        <IconMic size={18} color={theme.surface} />
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>
                    ) : null}

                    {circleDetailTab === 'RATES' ? (
                        <ScrollView contentContainerStyle={styles.ratesBox}>
                            <View style={styles.ratesBanner}>
                                <View style={styles.ratesBannerHead}>
                                    <IconSparkles size={16} color={theme.warning} />
                                    <Text style={styles.ratesBannerTitle}>Community Rates</Text>
                                </View>
                                <Text style={styles.ratesBannerSub}>These are standard market rates sourced from community members. Use these to negotiate fair pay.</Text>
                            </View>
                            <View style={styles.ratesTable}>
                                <View style={styles.ratesHeader}>
                                    <Text style={styles.ratesHeaderCol1}>SERVICE / ITEM</Text>
                                    <Text style={styles.ratesHeaderCol2}>AVG. PRICE</Text>
                                </View>
                                {rateRows}
                            </View>
                            {showCircleRateForm ? (
                                <View style={styles.rateFormBox}>
                                    <Text style={styles.rateFormTitle}>SUGGEST A RATE</Text>
                                    <TextInput
                                        style={styles.rateFormInput}
                                        value={circleRateService}
                                        onChangeText={onCircleRateServiceChange}
                                        placeholder="Service name (e.g. Night Shift Premium)"
                                        placeholderTextColor={theme.textMuted}
                                    />
                                    <TextInput
                                        style={styles.rateFormInput}
                                        value={circleRatePrice}
                                        onChangeText={onCircleRatePriceChange}
                                        placeholder="Your suggested price (e.g. ₹450)"
                                        placeholderTextColor={theme.textMuted}
                                    />
                                    <View style={styles.rateActions}>
                                        <TouchableOpacity style={styles.rateSubmitBtn} onPress={onSubmitRate}>
                                            <Text style={styles.rateSubmitBtnText}>SUBMIT</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity style={styles.rateCancelBtn} onPress={onCancelRateForm}>
                                            <Text style={styles.rateCancelBtnText}>CANCEL</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ) : (
                                <TouchableOpacity style={styles.suggestRateBtn} onPress={onShowRateForm}>
                                    <Text style={styles.suggestRateBtnText}>+ Suggest a Rate Change</Text>
                                </TouchableOpacity>
                            )}
                        </ScrollView>
                    ) : null}

                    {circleDetailTab === 'MEMBERS' ? (
                        <ScrollView contentContainerStyle={styles.ratesBox}>
                            <View style={styles.membersHeader}>
                                <Text style={styles.membersTitle}>Community Leaders</Text>
                                <Text style={styles.membersSortBadge}>Sorted by Karma</Text>
                            </View>
                            {memberRows}
                        </ScrollView>
                    ) : null}
                </View>
            </View>
        </Modal>
    );
}

export default memo(CircleDetailViewComponent);

const styles = StyleSheet.create({
    modalContainer: {
        flex: 1,
        backgroundColor: theme.background,
    },
    safeTopSpacer: {
        height: 0,
    },
    modalHeaderBg: {
        backgroundColor: theme.primary,
        paddingTop: 16,
    },
    modalHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingBottom: 16,
    },
    modalBackBtn: {
        padding: 4,
        marginRight: 8,
    },
    modalBackIcon: {
        color: theme.surface,
        fontSize: 32,
        lineHeight: 32,
        fontWeight: '300',
    },
    modalHeaderAvatar: {
        width: 40,
        height: 40,
        borderRadius: RADIUS.full,
        borderWidth: 2,
        borderColor: theme.primaryLight,
        marginRight: 12,
    },
    modalTitleWrap: {
        flex: 1,
    },
    modalHeaderTitle: {
        fontSize: 16,
        fontWeight: '900',
        color: theme.surface,
    },
    modalHeaderSub: {
        fontSize: 10,
        fontWeight: '500',
        color: theme.primaryLight,
    },
    modalSubtabsBg: {
        paddingHorizontal: 8,
        paddingBottom: 8,
    },
    modalSubtabItem: {
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 18,
        borderRadius: RADIUS.sm,
    },
    modalSubtabItemActive: {
        backgroundColor: theme.surface,
    },
    modalSubtabText: {
        fontSize: 10,
        fontWeight: '900',
        color: theme.primaryLight,
    },
    modalSubtabTextActive: {
        color: theme.primary,
    },
    modalContent: {
        flex: 1,
    },
    flex1: {
        flex: 1,
    },
    chatScrollContent: {
        padding: 16,
        paddingBottom: 32,
    },
    chatTimeDiv: {
        alignSelf: 'center',
        backgroundColor: theme.borderMedium,
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: RADIUS.md,
        marginBottom: 16,
    },
    chatTimeText: {
        fontSize: 10,
        fontWeight: '900',
        color: theme.textSecondary,
    },
    chatBubbleRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 16,
        gap: 12,
    },
    chatBubbleAvatar: {
        width: 36,
        height: 36,
        borderRadius: RADIUS.full,
        backgroundColor: theme.primaryLight,
        justifyContent: 'center',
        alignItems: 'center',
    },
    chatBubbleAvatarText: {
        fontSize: 14,
        fontWeight: '900',
        color: theme.primary,
    },
    chatBubbleContent: {
        flex: 1,
        alignItems: 'flex-start',
    },
    chatBubbleMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 4,
    },
    chatBubbleName: {
        fontSize: 13,
        fontWeight: '800',
        color: theme.textPrimary,
    },
    chatBubbleRole: {
        fontSize: 10,
        fontWeight: '700',
        color: theme.textSecondary,
        backgroundColor: theme.border,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: RADIUS.sm,
    },
    chatBubbleTextBg: {
        backgroundColor: theme.surface,
        padding: 12,
        borderRadius: RADIUS.lg,
        borderTopLeftRadius: 0,
        borderWidth: 1,
        borderColor: theme.borderMedium,
    },
    chatBubbleText: {
        fontSize: 14,
        color: theme.textSecondary,
        lineHeight: 20,
    },
    chatBubbleTime: {
        fontSize: 10,
        color: theme.textMuted,
        fontWeight: '600',
        marginTop: 4,
        marginLeft: 4,
    },
    chatInputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        backgroundColor: theme.surface,
        borderTopWidth: 1,
        borderTopColor: theme.borderMedium,
        gap: 12,
    },
    chatAttachBtn: {
        padding: 8,
        backgroundColor: theme.border,
        borderRadius: RADIUS.full,
    },
    chatInputText: {
        flex: 1,
        backgroundColor: theme.background,
        borderRadius: RADIUS.full,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 14,
        borderWidth: 1,
        borderColor: theme.borderMedium,
    },
    chatInputRecording: {
        color: theme.error,
    },
    chatSendBtn: {
        padding: 12,
        backgroundColor: theme.primary,
        borderRadius: RADIUS.full,
    },
    chatSendBtnRecording: {
        backgroundColor: theme.error,
    },
    ratesBox: {
        padding: 16,
    },
    ratesBanner: {
        backgroundColor: theme.primaryLight,
        padding: 16,
        borderRadius: RADIUS.lg,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: theme.borderMedium,
    },
    ratesBannerHead: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
        gap: 6,
    },
    ratesBannerTitle: {
        fontSize: 14,
        fontWeight: '900',
        color: theme.primaryDark,
    },
    ratesBannerSub: {
        fontSize: 12,
        color: theme.textSecondary,
        lineHeight: 18,
    },
    ratesTable: {
        backgroundColor: theme.surface,
        borderRadius: RADIUS.lg,
        borderWidth: 1,
        borderColor: theme.borderMedium,
        overflow: 'hidden',
        marginBottom: 16,
    },
    ratesHeader: {
        flexDirection: 'row',
        backgroundColor: theme.background,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: theme.borderMedium,
    },
    ratesHeaderCol1: {
        flex: 1,
        fontSize: 10,
        fontWeight: '900',
        color: theme.textSecondary,
    },
    ratesHeaderCol2: {
        fontSize: 10,
        fontWeight: '900',
        color: theme.textSecondary,
    },
    rateRow: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: theme.border,
    },
    rateCol1: {
        flex: 1,
        fontSize: 14,
        fontWeight: '600',
        color: theme.textPrimary,
    },
    rateCol2: {
        fontSize: 14,
        fontWeight: '900',
        color: theme.primary,
    },
    rateFormBox: {
        backgroundColor: theme.primaryLight,
        borderWidth: 1,
        borderColor: theme.borderMedium,
        borderRadius: RADIUS.lg,
        padding: 16,
    },
    rateFormTitle: {
        fontSize: 10,
        fontWeight: '900',
        color: theme.primary,
        letterSpacing: 1,
        marginBottom: 12,
    },
    rateFormInput: {
        backgroundColor: theme.surface,
        borderWidth: 1,
        borderColor: theme.borderMedium,
        borderRadius: RADIUS.md,
        paddingHorizontal: 14,
        paddingVertical: 10,
        fontSize: 13,
        color: theme.textPrimary,
        marginBottom: 10,
    },
    rateActions: {
        flexDirection: 'row',
        gap: 8,
    },
    rateSubmitBtn: {
        flex: 1,
        backgroundColor: theme.primary,
        paddingVertical: 12,
        borderRadius: RADIUS.md,
        alignItems: 'center',
    },
    rateSubmitBtnText: {
        fontSize: 12,
        fontWeight: '900',
        color: theme.surface,
    },
    rateCancelBtn: {
        paddingHorizontal: 14,
        paddingVertical: 12,
        backgroundColor: theme.surface,
        borderWidth: 1,
        borderColor: theme.borderMedium,
        borderRadius: RADIUS.md,
        alignItems: 'center',
    },
    rateCancelBtnText: {
        fontSize: 12,
        fontWeight: '900',
        color: theme.textSecondary,
    },
    suggestRateBtn: {
        paddingVertical: 14,
        borderRadius: RADIUS.lg,
        borderWidth: 1,
        borderColor: theme.primaryLight,
        alignItems: 'center',
    },
    suggestRateBtnText: {
        fontSize: 12,
        fontWeight: '900',
        color: theme.primary,
    },
    membersHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    membersTitle: {
        fontSize: 14,
        fontWeight: '900',
        color: theme.textPrimary,
    },
    membersSortBadge: {
        fontSize: 10,
        fontWeight: '800',
        color: theme.textSecondary,
        backgroundColor: theme.border,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: RADIUS.sm,
    },
    memberRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.surface,
        padding: 12,
        borderRadius: RADIUS.lg,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: theme.borderMedium,
    },
    memberAvatarWrap: {
        position: 'relative',
        marginRight: 12,
    },
    memberAvatar: {
        width: 40,
        height: 40,
        borderRadius: RADIUS.full,
    },
    adminBadge: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        width: 16,
        height: 16,
        backgroundColor: theme.warning,
        borderRadius: RADIUS.full,
        borderWidth: 2,
        borderColor: theme.surface,
        justifyContent: 'center',
        alignItems: 'center',
    },
    adminBadgeText: {
        fontSize: 8,
    },
    memberMain: {
        flex: 1,
    },
    memberNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginBottom: 2,
    },
    memberName: {
        fontSize: 14,
        fontWeight: '800',
        color: theme.textPrimary,
    },
    memberSub: {
        fontSize: 11,
        color: theme.textSecondary,
    },
    karmaBadge: {
        backgroundColor: theme.primaryLight,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: RADIUS.md,
        marginRight: 8,
    },
    karmaBadgeText: {
        fontSize: 10,
        fontWeight: '900',
        color: theme.primary,
    },
    memberMsgBtn: {
        padding: 10,
        backgroundColor: theme.background,
        borderRadius: RADIUS.full,
    },
});
