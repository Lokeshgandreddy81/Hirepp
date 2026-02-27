import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { AuthContext } from '../context/AuthContext';
import React, { useState, useContext } from 'react';

const OnboardingScreen = () => {
    const navigation = useNavigation();
    const [step, setStep] = useState(1);
    const { completeOnboarding } = useContext(AuthContext);

    const handleNext = async () => {
        if (step < 3) {
            setStep(step + 1);
        } else {
            // Finish onboarding
            await completeOnboarding();
            navigation.replace('RoleSelection');
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.content}>
                    {step === 1 && (
                        <View style={styles.stepContainer}>
                            <Text style={styles.title}>Welcome to HireApp</Text>
                            <Text style={styles.description}>Connect with top talent or find your dream job with AI-powered matchmaking.</Text>
                        </View>
                    )}
                    {step === 2 && (
                        <View style={styles.stepContainer}>
                            <Text style={styles.title}>Smart Video Intro</Text>
                            <Text style={styles.description}>Record a quick 60-second video to automatically generate a powerful profile.</Text>
                        </View>
                    )}
                    {step === 3 && (
                        <View style={styles.stepContainer}>
                            <Text style={styles.title}>Real-time Feedback</Text>
                            <Text style={styles.description}>Our intelligent feedback loop ensures every application moves candidates closer to a hire.</Text>
                        </View>
                    )}

                    <View style={styles.dotsContainer}>
                        <View style={[styles.dot, step >= 1 ? styles.activeDot : null]} />
                        <View style={[styles.dot, step >= 2 ? styles.activeDot : null]} />
                        <View style={[styles.dot, step >= 3 ? styles.activeDot : null]} />
                    </View>

                    <TouchableOpacity style={styles.button} onPress={handleNext}>
                        <Text style={styles.buttonText}>{step === 3 ? "Get Started" : "Next"}</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
    },
    content: {
        padding: 30,
        alignItems: 'center',
    },
    stepContainer: {
        alignItems: 'center',
        marginBottom: 40,
        minHeight: 150,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#1e293b',
        marginBottom: 15,
        textAlign: 'center',
    },
    description: {
        fontSize: 16,
        color: '#64748b',
        textAlign: 'center',
        lineHeight: 24,
    },
    dotsContainer: {
        flexDirection: 'row',
        marginBottom: 30,
    },
    dot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#cbd5e1',
        marginHorizontal: 5,
    },
    activeDot: {
        backgroundColor: '#2563eb',
        width: 20,
    },
    button: {
        backgroundColor: '#2563eb',
        paddingVertical: 15,
        paddingHorizontal: 40,
        borderRadius: 30,
        width: '100%',
        alignItems: 'center',
    },
    buttonText: {
        color: '#ffffff',
        fontSize: 18,
        fontWeight: '600',
    },
});

export default OnboardingScreen;
