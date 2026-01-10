import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Header from '../components/Header';

export default function SettingsScreen() {
    return (
        <SafeAreaView style={styles.container}>
            <Header title="Settings" subtitle="Manage your account" />
            <View style={styles.content}>
                <Text style={styles.text}>Settings Screen</Text>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFB' },
    content: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    text: { fontSize: 18, color: '#6B7280' }
});
