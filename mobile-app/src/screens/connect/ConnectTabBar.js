import React, { memo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { theme, RADIUS } from '../../theme/theme';

function ConnectTabBarComponent({ tabs, activeTab, onTabPress }) {
    const handleTabPress = useCallback((tab) => {
        onTabPress(tab);
    }, [onTabPress]);

    return (
        <View style={styles.container}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.content}>
                {tabs.map((tab) => {
                    const isActive = activeTab === tab;
                    return (
                        <TouchableOpacity key={tab} style={styles.tabButton} onPress={() => handleTabPress(tab)} activeOpacity={0.7}>
                            <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{tab}</Text>
                            {isActive ? <View style={styles.tabIndicator} /> : null}
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>
        </View>
    );
}

export default memo(ConnectTabBarComponent);

const styles = StyleSheet.create({
    container: {
        backgroundColor: theme.surface,
        borderBottomWidth: 1,
        borderBottomColor: theme.border,
    },
    content: {
        paddingHorizontal: 8,
    },
    tabButton: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        alignItems: 'center',
    },
    tabText: {
        fontSize: 11,
        fontWeight: '900',
        color: theme.textMuted,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    tabTextActive: {
        color: theme.primary,
    },
    tabIndicator: {
        position: 'absolute',
        bottom: 0,
        left: 12,
        right: 12,
        height: 2,
        backgroundColor: theme.primary,
        borderRadius: RADIUS.sm,
    },
});
