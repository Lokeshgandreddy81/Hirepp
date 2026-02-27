import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { logger } from '../utils/logger';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        logger.error('ErrorBoundary caught an error', {
            message: error?.message,
            componentStack: errorInfo?.componentStack,
        });
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null });
    }

    render() {
        if (this.state.hasError) {
            return (
                <View style={styles.container}>
                    <Text style={styles.title}>Oops, something went wrong.</Text>
                    <Text style={styles.subtitle}>{this.state.error?.toString()}</Text>
                    <TouchableOpacity style={styles.button} onPress={this.handleReset}>
                        <Text style={styles.buttonText}>Try Again</Text>
                    </TouchableOpacity>
                </View>
            );
        }

        return this.props.children;
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
        backgroundColor: '#f8fafc',
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#0f172a',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        color: '#64748b',
        textAlign: 'center',
        marginBottom: 24,
    },
    button: {
        backgroundColor: '#7c3aed',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
    },
    buttonText: {
        color: '#ffffff',
        fontWeight: 'bold',
    },
});

export default ErrorBoundary;
