import React, { memo, useCallback, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MOTION } from '../../theme/motion';

const TAB_META = {
    Feed: { icon: 'newspaper-outline', iconActive: 'newspaper' },
    Pulse: { icon: 'flash-outline', iconActive: 'flash' },
    Academy: { icon: 'school-outline', iconActive: 'school' },
    Circles: { icon: 'people-outline', iconActive: 'people' },
    Bounties: { icon: 'trophy-outline', iconActive: 'trophy' },
};

function TabButton({ tab, active, onPress }) {
    const scale = useRef(new Animated.Value(active ? 1 : 0.96)).current;
    const opacity = useRef(new Animated.Value(active ? 1 : 0.8)).current;
    const tabMeta = TAB_META[tab] || TAB_META.Feed;
    const iconName = active ? tabMeta.iconActive : tabMeta.icon;

    useEffect(() => {
        Animated.parallel([
            Animated.spring(scale, {
                toValue: active ? 1 : 0.96,
                stiffness: 220,
                damping: 18,
                mass: 0.85,
                useNativeDriver: true,
            }),
            Animated.timing(opacity, {
                toValue: active ? 1 : 0.8,
                duration: MOTION.tabTransitionMs,
                useNativeDriver: true,
            }),
        ]).start();
    }, [active, opacity, scale]);

    return (
        <TouchableOpacity
            style={[styles.tabButton, active && styles.tabButtonActive]}
            onPress={onPress}
            activeOpacity={0.82}
        >
            <Animated.View style={{ transform: [{ scale }], opacity, alignItems: 'center' }}>
                <Ionicons name={iconName} size={16} color={active ? '#ffffff' : '#5b4b7c'} />
                <Text style={[styles.tabText, active && styles.tabTextActive]} numberOfLines={1}>
                    {tab}
                </Text>
            </Animated.View>
        </TouchableOpacity>
    );
}

function ConnectTabBarComponent({ tabs, activeTab, onTabPress }) {
    const safeTabs = Array.isArray(tabs) ? tabs : [];
    const handleTabPress = useCallback((tab) => onTabPress(tab), [onTabPress]);

    return (
        <View style={styles.container}>
            <View style={styles.tabRow}>
                {safeTabs.map((tab) => {
                    const isActive = activeTab === tab;
                    return (
                        <View key={tab} style={styles.tabSlot}>
                            <TabButton tab={tab} active={isActive} onPress={() => handleTabPress(tab)} />
                        </View>
                    );
                })}
            </View>
        </View>
    );
}

export default memo(ConnectTabBarComponent);

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#f4edff',
        paddingHorizontal: 12,
        paddingTop: 6,
        paddingBottom: 10,
    },
    tabRow: {
        flexDirection: 'row',
        alignItems: 'stretch',
        borderRadius: 18,
        backgroundColor: '#efe5ff',
        borderWidth: 1,
        borderColor: '#e1d0ff',
        paddingHorizontal: 5,
        paddingVertical: 6,
        gap: 4,
        shadowColor: '#7c3aed',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 9,
        elevation: 1,
    },
    tabSlot: {
        flex: 1,
    },
    tabButton: {
        minHeight: 50,
        borderRadius: 13,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 6,
    },
    tabButtonActive: {
        backgroundColor: '#7c3aed',
        shadowColor: '#7c3aed',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.16,
        shadowRadius: 8,
        elevation: 3,
    },
    tabText: {
        marginTop: 4,
        color: '#5b4b7c',
        fontSize: 10.5,
        fontWeight: '700',
        letterSpacing: 0.1,
    },
    tabTextActive: {
        color: '#ffffff',
    },
});
