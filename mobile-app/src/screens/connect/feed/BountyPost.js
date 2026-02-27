import React, { memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { theme, RADIUS } from '../../../theme/theme';

function BountyPostComponent({ reward }) {
    return (
        <View style={styles.container}>
            <Text style={styles.label}>REFERRAL BOUNTY</Text>
            <Text style={styles.reward}>{reward || '₹2,000'}</Text>
            <TouchableOpacity style={styles.button} activeOpacity={0.85}>
                <Text style={styles.buttonText}>REFER A PEER</Text>
            </TouchableOpacity>
        </View>
    );
}

export default memo(BountyPostComponent);

const styles = StyleSheet.create({
    container: {
        position: 'relative',
        zIndex: 10,
        marginBottom: 16,
    },
    label: {
        color: theme.primaryLight,
        fontSize: 11,
        fontWeight: '900',
        letterSpacing: 1,
        marginBottom: 4,
    },
    reward: {
        color: theme.surface,
        fontSize: 24,
        fontWeight: '900',
        marginBottom: 12,
    },
    button: {
        backgroundColor: theme.surface,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: RADIUS.md,
    },
    buttonText: {
        color: theme.primaryDark,
        fontSize: 12,
        fontWeight: '900',
    },
});
