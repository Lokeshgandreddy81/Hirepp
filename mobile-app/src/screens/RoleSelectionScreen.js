import React, { useCallback, useRef, useState } from 'react';
import {
    Animated,
    Easing,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { triggerHaptic } from '../utils/haptics';

const SELECTION_DELAY_MS = 260;

const ROLE_CARDS = [
    {
        key: 'worker',
        title: "I'm a Job Seeker",
        subtitle: 'Find jobs and get matched by AI.',
        icon: 'person-outline',
    },
    {
        key: 'hybrid',
        title: 'Hybrid Mode',
        subtitle: 'Post jobs and find top talent fast.',
        icon: 'briefcase-outline',
    },
];

export default function RoleSelectionScreen({ navigation }) {
    const insets = useSafeAreaInsets();
    const [activeRole, setActiveRole] = useState(null);
    const cardAnimationsRef = useRef({
        worker: new Animated.Value(0),
        hybrid: new Animated.Value(0),
    });
    const cardAnimations = cardAnimationsRef.current;

    const animateRoleSelection = useCallback((selectedRole) => {
        Animated.parallel(
            ROLE_CARDS.map((card) => (
                Animated.timing(cardAnimations[card.key], {
                    toValue: selectedRole === card.key ? 1 : 0,
                    duration: 190,
                    easing: Easing.out(Easing.cubic),
                    useNativeDriver: false,
                })
            ))
        ).start();
    }, [cardAnimations]);

    const openLogin = useCallback((roleKey) => {
        setActiveRole(roleKey);
        animateRoleSelection(roleKey);
        triggerHaptic.light();
        setTimeout(() => {
            navigation.navigate('Login', { selectedRole: roleKey });
        }, SELECTION_DELAY_MS);
    }, [animateRoleSelection, navigation]);

    return (
        <View style={styles.container}>
            <View style={styles.bgGlowTop} />
            <View style={styles.bgGlowBottom} />

            <View
                style={[
                    styles.content,
                    { paddingTop: insets.top + 56, paddingBottom: insets.bottom + 30 },
                ]}
            >
                <View style={styles.header}>
                    <View style={styles.logoBadge}>
                        <View style={styles.logoGlyph}>
                            <View style={styles.logoRingOuter} />
                            <View style={styles.logoRingMid} />
                            <View style={styles.logoRingInner} />
                        </View>
                    </View>
                    <Text style={styles.mainTitle}>
                        Hire<Text style={styles.mainTitleAccent}>Circle</Text>
                    </Text>
                    <Text style={styles.subtitle}>Smart AI matching for everyone.</Text>
                </View>

                <View style={styles.cardStack}>
                    {ROLE_CARDS.map((card) => {
                        const isActive = activeRole === card.key;
                        const animationValue = cardAnimations[card.key];
                        const animatedCardStyle = {
                            borderColor: animationValue.interpolate({
                                inputRange: [0, 1],
                                outputRange: ['#E2E8F0', '#9C5AF7'],
                            }),
                            backgroundColor: animationValue.interpolate({
                                inputRange: [0, 1],
                                outputRange: ['#FFFFFF', '#F7F1FF'],
                            }),
                            transform: [
                                {
                                    scale: animationValue.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [1, 1.01],
                                    }),
                                },
                            ],
                        };
                        const animatedIconStyle = {
                            backgroundColor: animationValue.interpolate({
                                inputRange: [0, 1],
                                outputRange: ['#F3E8FF', '#EFE3FF'],
                            }),
                        };

                        return (
                            <TouchableOpacity
                                key={card.key}
                                activeOpacity={0.96}
                                onPress={() => openLogin(card.key)}
                            >
                                <Animated.View style={[styles.cardWrapper, animatedCardStyle]}>
                                    <Animated.View style={[styles.iconContainer, animatedIconStyle]}>
                                        <Ionicons
                                            name={card.icon}
                                            size={28}
                                            color={isActive ? '#7C3AED' : '#A855F7'}
                                        />
                                    </Animated.View>

                                    <View style={styles.cardTextWrap}>
                                        <Text style={[styles.cardTitle, isActive && styles.cardTitleActive]}>
                                            {card.title}
                                        </Text>
                                        <Text style={styles.cardSubtitle}>{card.subtitle}</Text>
                                    </View>

                                    <View style={styles.decorCircle} />
                                </Animated.View>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    bgGlowTop: {
        position: 'absolute',
        top: -120,
        left: -88,
        width: 260,
        height: 260,
        borderRadius: 130,
        backgroundColor: 'rgba(167,139,250,0.14)',
    },
    bgGlowBottom: {
        position: 'absolute',
        right: -84,
        bottom: -84,
        width: 220,
        height: 220,
        borderRadius: 110,
        backgroundColor: 'rgba(196,181,253,0.16)',
    },
    content: {
        flex: 1,
        paddingHorizontal: 28,
        justifyContent: 'center',
    },
    header: {
        marginBottom: 36,
        alignItems: 'center',
    },
    logoBadge: {
        width: 84,
        height: 84,
        borderRadius: 24,
        backgroundColor: '#ECE1FF',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 18,
    },
    logoGlyph: {
        width: 56,
        height: 56,
        alignItems: 'center',
        justifyContent: 'center',
    },
    logoRingOuter: {
        position: 'absolute',
        width: 52,
        height: 52,
        borderRadius: 26,
        borderWidth: 3,
        borderColor: '#7C3AED',
    },
    logoRingMid: {
        position: 'absolute',
        width: 34,
        height: 34,
        borderRadius: 17,
        borderWidth: 3,
        borderColor: '#7C3AED',
    },
    logoRingInner: {
        position: 'absolute',
        width: 18,
        height: 18,
        borderRadius: 9,
        borderWidth: 3,
        borderColor: '#7C3AED',
    },
    mainTitle: {
        fontSize: 44,
        lineHeight: 46,
        fontWeight: '800',
        color: '#0F172A',
        marginBottom: 10,
        letterSpacing: -1.2,
    },
    mainTitleAccent: {
        color: '#7C3AED',
    },
    subtitle: {
        fontSize: 14,
        lineHeight: 20,
        fontWeight: '600',
        color: '#61728F',
        textAlign: 'center',
    },
    cardStack: {
        gap: 18,
    },
    cardWrapper: {
        minHeight: 124,
        borderRadius: 24,
        borderWidth: 1.8,
        borderColor: '#E2E8F0',
        backgroundColor: '#FFFFFF',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 22,
        overflow: 'hidden',
        shadowColor: '#7C3AED',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
        elevation: 3,
    },
    iconContainer: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#F3E8FF',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
        zIndex: 2,
    },
    cardTextWrap: {
        flex: 1,
        zIndex: 2,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1E293B',
        marginBottom: 6,
        letterSpacing: -0.15,
    },
    cardTitleActive: {
        color: '#7C3AED',
    },
    cardSubtitle: {
        fontSize: 13,
        lineHeight: 18,
        fontWeight: '500',
        color: '#607089',
    },
    decorCircle: {
        position: 'absolute',
        right: -14,
        top: '50%',
        width: 108,
        height: 108,
        borderRadius: 54,
        backgroundColor: 'rgba(211, 187, 242, 0.28)',
        transform: [{ translateY: -54 }],
    },
});
