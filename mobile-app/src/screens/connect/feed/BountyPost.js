import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { RADIUS } from '../../../theme/theme';

function BountyPostComponent({ reward }) {
    return (
        <View style={styles.container}>
            <Text style={styles.label}>REFERRAL BOUNTY</Text>
            <Text style={styles.reward}>{reward || '₹2,000'}</Text>
            <View style={styles.button}>
                <Text style={styles.buttonText}>REFER A PEER</Text>
            </View>
        </View>
    );
}

export default memo(BountyPostComponent);

const styles = StyleSheet.create({
    container: {
        position: 'relative',
        zIndex: 10,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: RADIUS.md,
        backgroundColor: '#fafafa',
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    label: {
        color: '#6b7280',
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 1,
        marginBottom: 4,
    },
    reward: {
        color: '#111111',
        fontSize: 22,
        fontWeight: '900',
        marginBottom: 12,
    },
    button: {
        backgroundColor: '#111111',
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: RADIUS.md,
    },
    buttonText: {
        color: '#ffffff',
        fontSize: 12,
        fontWeight: '900',
    },
});
