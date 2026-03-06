import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const LOADER_TRACK_WIDTH = 160;

export default function AppBootSplash({ showProgress = true }) {
    const logoOpacity = useRef(new Animated.Value(0)).current;
    const logoScale = useRef(new Animated.Value(0.72)).current;
    const logoFloat = useRef(new Animated.Value(0)).current;
    const glowPulse = useRef(new Animated.Value(0)).current;

    const ringOuterScale = useRef(new Animated.Value(0.1)).current;
    const ringMidScale = useRef(new Animated.Value(0.1)).current;
    const ringInnerScale = useRef(new Animated.Value(0.1)).current;

    const brandOpacity = useRef(new Animated.Value(0)).current;
    const brandTranslateY = useRef(new Animated.Value(14)).current;
    const loaderOpacity = useRef(new Animated.Value(0)).current;

    const topGlowDrift = useRef(new Animated.Value(0)).current;
    const bottomGlowDrift = useRef(new Animated.Value(0)).current;
    const orbProgress = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        orbProgress.setValue(0);

        const intro = Animated.parallel([
            Animated.timing(logoOpacity, {
                toValue: 1,
                duration: 520,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
            }),
            Animated.spring(logoScale, {
                toValue: 1,
                damping: 11,
                stiffness: 150,
                mass: 0.86,
                useNativeDriver: true,
            }),
            Animated.sequence([
                Animated.delay(300),
                Animated.spring(ringOuterScale, {
                    toValue: 1,
                    damping: 12,
                    stiffness: 150,
                    mass: 0.8,
                    useNativeDriver: true,
                }),
            ]),
            Animated.sequence([
                Animated.delay(420),
                Animated.spring(ringMidScale, {
                    toValue: 1,
                    damping: 12,
                    stiffness: 160,
                    mass: 0.8,
                    useNativeDriver: true,
                }),
            ]),
            Animated.sequence([
                Animated.delay(520),
                Animated.spring(ringInnerScale, {
                    toValue: 1,
                    damping: 12,
                    stiffness: 170,
                    mass: 0.8,
                    useNativeDriver: true,
                }),
            ]),
            Animated.sequence([
                Animated.delay(470),
                Animated.parallel([
                    Animated.timing(brandOpacity, {
                        toValue: 1,
                        duration: 340,
                        easing: Easing.out(Easing.cubic),
                        useNativeDriver: true,
                    }),
                    Animated.timing(brandTranslateY, {
                        toValue: 0,
                        duration: 340,
                        easing: Easing.out(Easing.cubic),
                        useNativeDriver: true,
                    }),
                ]),
            ]),
            Animated.sequence([
                Animated.delay(760),
                Animated.timing(loaderOpacity, {
                    toValue: 1,
                    duration: 260,
                    easing: Easing.out(Easing.cubic),
                    useNativeDriver: true,
                }),
            ]),
        ]);

        const logoFloatLoop = Animated.loop(
            Animated.sequence([
                Animated.delay(900),
                Animated.timing(logoFloat, {
                    toValue: 1,
                    duration: 2800,
                    easing: Easing.inOut(Easing.sin),
                    useNativeDriver: true,
                }),
                Animated.timing(logoFloat, {
                    toValue: 0,
                    duration: 2800,
                    easing: Easing.inOut(Easing.sin),
                    useNativeDriver: true,
                }),
            ])
        );

        const glowPulseLoop = Animated.loop(
            Animated.sequence([
                Animated.timing(glowPulse, {
                    toValue: 1,
                    duration: 1600,
                    easing: Easing.inOut(Easing.sin),
                    useNativeDriver: true,
                }),
                Animated.timing(glowPulse, {
                    toValue: 0,
                    duration: 1600,
                    easing: Easing.inOut(Easing.sin),
                    useNativeDriver: true,
                }),
            ])
        );

        const topGlowLoop = Animated.loop(
            Animated.sequence([
                Animated.timing(topGlowDrift, {
                    toValue: 1,
                    duration: 9000,
                    easing: Easing.inOut(Easing.sin),
                    useNativeDriver: true,
                }),
                Animated.timing(topGlowDrift, {
                    toValue: 0,
                    duration: 9000,
                    easing: Easing.inOut(Easing.sin),
                    useNativeDriver: true,
                }),
            ])
        );

        const bottomGlowLoop = Animated.loop(
            Animated.sequence([
                Animated.timing(bottomGlowDrift, {
                    toValue: 1,
                    duration: 11000,
                    easing: Easing.inOut(Easing.sin),
                    useNativeDriver: true,
                }),
                Animated.timing(bottomGlowDrift, {
                    toValue: 0,
                    duration: 11000,
                    easing: Easing.inOut(Easing.sin),
                    useNativeDriver: true,
                }),
            ])
        );

        const loaderLoop = Animated.loop(
            Animated.timing(orbProgress, {
                toValue: 1,
                duration: 2000,
                easing: Easing.inOut(Easing.quad),
                useNativeDriver: false,
            })
        );

        intro.start();
        logoFloatLoop.start();
        glowPulseLoop.start();
        topGlowLoop.start();
        bottomGlowLoop.start();
        loaderLoop.start();

        return () => {
            intro.stop();
            logoFloatLoop.stop();
            glowPulseLoop.stop();
            topGlowLoop.stop();
            bottomGlowLoop.stop();
            loaderLoop.stop();
        };
    }, [
        bottomGlowDrift,
        brandOpacity,
        brandTranslateY,
        glowPulse,
        loaderOpacity,
        logoFloat,
        logoOpacity,
        logoScale,
        orbProgress,
        ringInnerScale,
        ringMidScale,
        ringOuterScale,
        topGlowDrift,
    ]);

    const topGlowTranslateX = topGlowDrift.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 40],
    });
    const topGlowTranslateY = topGlowDrift.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 30],
    });

    const bottomGlowTranslateX = bottomGlowDrift.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -30],
    });
    const bottomGlowTranslateY = bottomGlowDrift.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -25],
    });

    const logoTranslateY = logoFloat.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -8],
    });

    const glowScale = glowPulse.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 1.12],
    });
    const glowOpacity = glowPulse.interpolate({
        inputRange: [0, 1],
        outputRange: [0.6, 1],
    });

    const trailWidth = orbProgress.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: [0, LOADER_TRACK_WIDTH * 0.46, 0],
    });
    const trailTranslateX = orbProgress.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: [0, LOADER_TRACK_WIDTH * 0.28, LOADER_TRACK_WIDTH],
    });
    const orbTranslateX = orbProgress.interpolate({
        inputRange: [0, 1],
        outputRange: [-8, LOADER_TRACK_WIDTH],
    });

    return (
        <View style={styles.container}>
            <Animated.View
                style={[
                    styles.glowTop,
                    {
                        transform: [{ translateX: topGlowTranslateX }, { translateY: topGlowTranslateY }],
                    },
                ]}
            />
            <Animated.View
                style={[
                    styles.glowBottom,
                    {
                        transform: [{ translateX: bottomGlowTranslateX }, { translateY: bottomGlowTranslateY }],
                    },
                ]}
            />
            <View style={styles.glassSeal} />

            <View style={styles.centerWrap}>
                <Animated.View
                    style={[
                        styles.logoWrap,
                        {
                            opacity: logoOpacity,
                            transform: [{ scale: logoScale }, { translateY: logoTranslateY }],
                        },
                    ]}
                >

                    <Animated.View style={[styles.ringOuter, { transform: [{ scale: ringOuterScale }] }]} />
                    <Animated.View style={[styles.ringMid, { transform: [{ scale: ringMidScale }] }]} />
                    <Animated.View style={[styles.ringInner, { transform: [{ scale: ringInnerScale }] }]} />
                </Animated.View>

                <Animated.View
                    style={[
                        styles.wordmarkWrap,
                        {
                            opacity: brandOpacity,
                            transform: [{ translateY: brandTranslateY }],
                        },
                    ]}
                >
                    <Text style={styles.wordmark}>
                        <Text style={styles.wordmarkBase}>Hire</Text>
                        <Text style={styles.wordmarkAccent}>Circle</Text>
                    </Text>
                    <Text style={styles.tagline}>Connect · Hire · Grow</Text>
                </Animated.View>
            </View>

            {showProgress ? (
                <Animated.View style={[styles.loaderWrap, { opacity: loaderOpacity }]}>
                    <View style={styles.loaderTrack}>
                        <Animated.View style={[styles.loaderTrailWrap, { width: trailWidth, transform: [{ translateX: trailTranslateX }] }]}>
                            <LinearGradient
                                colors={[
                                    'rgba(124,58,237,0)',
                                    'rgba(124,58,237,0.42)',
                                    'rgba(139,92,246,0.14)',
                                ]}
                                start={{ x: 0, y: 0.5 }}
                                end={{ x: 1, y: 0.5 }}
                                style={StyleSheet.absoluteFill}
                            />
                        </Animated.View>
                        <Animated.View style={[styles.loaderOrb, { transform: [{ translateX: orbTranslateX }] }]} />
                    </View>
                    <Text style={styles.loaderLabel}>Loading</Text>
                </Animated.View>
            ) : null}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#ffffff',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    glowTop: {
        position: 'absolute',
        top: -150,
        left: -120,
        width: 500,
        height: 500,
        borderRadius: 250,
        backgroundColor: 'rgba(248,246,255,0.45)',
    },
    glowBottom: {
        position: 'absolute',
        bottom: -120,
        right: -100,
        width: 440,
        height: 440,
        borderRadius: 220,
        backgroundColor: 'rgba(244,240,255,0.35)',
    },
    glassSeal: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255,255,255,0.80)',
    },
    centerWrap: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: -20,
        zIndex: 10,
    },
    logoWrap: {
        width: 160,
        height: 160,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 36,
    },
    ringOuter: {
        position: 'absolute',
        width: 130,
        height: 130,
        borderRadius: 65,
        borderWidth: 4,
        borderColor: '#7C3AED',
    },
    ringMid: {
        position: 'absolute',
        width: 86,
        height: 86,
        borderRadius: 43,
        borderWidth: 4,
        borderColor: '#7C3AED',
    },
    ringInner: {
        position: 'absolute',
        width: 44,
        height: 44,
        borderRadius: 22,
        borderWidth: 4,
        borderColor: '#7C3AED',
    },
    wordmarkWrap: {
        alignItems: 'center',
    },
    wordmark: {
        fontSize: 38,
        lineHeight: 42,
        fontWeight: '800',
        letterSpacing: -1.8,
        color: '#0f0520',
    },
    wordmarkBase: {
        color: '#0f0520',
    },
    wordmarkAccent: {
        color: '#7C3AED',
    },
    tagline: {
        marginTop: 10,
        fontSize: 11,
        lineHeight: 14,
        fontWeight: '500',
        letterSpacing: 3.4,
        textTransform: 'uppercase',
        color: 'rgba(109,40,217,0.36)',
    },
    loaderWrap: {
        position: 'absolute',
        bottom: 48,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 20,
    },
    loaderTrack: {
        width: LOADER_TRACK_WIDTH,
        height: 2.5,
        borderRadius: 99,
        overflow: 'hidden',
        backgroundColor: 'rgba(167,139,250,0.10)',
    },
    loaderTrailWrap: {
        position: 'absolute',
        left: 0,
        top: 0,
        height: '100%',
        borderRadius: 99,
        overflow: 'hidden',
        backgroundColor: 'transparent',
    },
    loaderOrb: {
        position: 'absolute',
        top: -2.75,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#8B5CF6',
        shadowColor: '#8B5CF6',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.80,
        shadowRadius: 8,
        elevation: 4,
    },
    loaderLabel: {
        marginTop: 10,
        fontSize: 9,
        fontWeight: '500',
        letterSpacing: 3.5,
        textTransform: 'uppercase',
        color: 'rgba(124,58,237,0.24)',
    },
});
