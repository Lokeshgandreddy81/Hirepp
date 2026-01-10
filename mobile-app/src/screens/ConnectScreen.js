import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Header from '../components/Header';

export default function ConnectScreen() {
    return (
        <SafeAreaView style={styles.container}>
            <Header title="Connect" subtitle="Find your network" />
            <View style={styles.content}>
                <Text style={styles.text}>Connect Screen (Coming Soon)</Text>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFB' },
    content: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    text: { fontSize: 18, color: '#6B7280' }
});
