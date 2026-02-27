import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { IconBell } from '../../components/Icons';
import { theme, RADIUS } from '../../theme/theme';

function ConnectHeaderComponent({ avatar, onNotificationsPress, onProfilePress }) {
    return (
        <View style={styles.header}>
            <View style={styles.headerLeft}>
                <View style={styles.logoBox}><Text style={styles.logoH}>H</Text></View>
                <Text style={styles.logoTitle}>HIRE<Text style={styles.logoCircle}>CIRCLE</Text></Text>
            </View>
            <View style={styles.headerRight}>
                <TouchableOpacity style={styles.bellButton} onPress={onNotificationsPress}>
                    <IconBell size={20} color={theme.textSecondary} />
                    <View style={styles.bellDot} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.avatarButton} onPress={onProfilePress} activeOpacity={0.85}>
                    <Image source={{ uri: avatar }} style={styles.avatarImage} />
                </TouchableOpacity>
            </View>
        </View>
    );
}

export default memo(ConnectHeaderComponent);

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: theme.surface,
        borderBottomWidth: 1,
        borderBottomColor: theme.border,
        shadowColor: theme.textPrimary,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    logoBox: {
        width: 32,
        height: 32,
        borderRadius: RADIUS.sm,
        backgroundColor: theme.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
    },
    logoH: {
        color: theme.surface,
        fontSize: 16,
        fontWeight: '900',
        fontStyle: 'italic',
    },
    logoTitle: {
        fontSize: 20,
        fontWeight: '900',
        color: theme.textPrimary,
        letterSpacing: -0.5,
    },
    logoCircle: {
        color: theme.primary,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    bellButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    bellDot: {
        position: 'absolute',
        top: 8,
        right: 8,
        width: 8,
        height: 8,
        borderRadius: RADIUS.full,
        backgroundColor: theme.error,
        borderWidth: 2,
        borderColor: theme.surface,
    },
    avatarButton: {
        marginLeft: 8,
        borderRadius: RADIUS.full,
        borderWidth: 2,
        borderColor: theme.primary,
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarImage: {
        width: 36,
        height: 36,
        borderRadius: RADIUS.full,
    },
});
