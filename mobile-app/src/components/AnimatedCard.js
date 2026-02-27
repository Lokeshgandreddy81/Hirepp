import React, { useRef } from 'react';
import { Animated, TouchableWithoutFeedback } from 'react-native';
import { triggerHaptic } from '../utils/haptics';

export const AnimatedCard = ({ children, onPress, onLongPress, style }) => {
    const scale = useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
        Animated.spring(scale, {
            toValue: 0.96,
            useNativeDriver: true,
            tension: 150,
            friction: 4
        }).start();
        triggerHaptic.light();
    };

    const handlePressOut = () => {
        Animated.spring(scale, {
            toValue: 1,
            useNativeDriver: true,
            tension: 100,
            friction: 5
        }).start();
    };

    return (
        <TouchableWithoutFeedback
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            onPress={onPress}
            onLongPress={onLongPress}
            delayPressIn={10}
        >
            <Animated.View style={[{ transform: [{ scale }] }, style]}>
                {children}
            </Animated.View>
        </TouchableWithoutFeedback>
    );
};
