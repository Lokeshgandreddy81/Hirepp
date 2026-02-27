import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Dimensions, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BarChart, LineChart } from 'react-native-chart-kit';
import client from '../api/client';
import { AuthContext } from '../context/AuthContext';
import * as SecureStore from 'expo-secure-store';
import { logger } from '../utils/logger';

const screenWidth = Dimensions.get('window').width;

const chartConfig = {
    backgroundGradientFrom: '#fff',
    backgroundGradientTo: '#fff',
    color: (opacity = 1) => `rgba(124, 58, 237, ${opacity})`, // purple-600
    strokeWidth: 2,
    barPercentage: 0.7,
    useShadowColorFromDataset: false,
    decimalPlaces: 0,
};

export default function EmployerAnalyticsScreen({ navigation }) {
    const { userToken } = useContext(AuthContext);
    const [loading, setLoading] = useState(true);
    const [funnelData, setFunnelData] = useState(null);
    const [performanceData, setPerformanceData] = useState([]);

    useEffect(() => {
        fetchAnalytics();
    }, []);

    const fetchAnalytics = async () => {
        try {
            setLoading(true);
            const userInfoStr = await SecureStore.getItemAsync('userInfo');
            const userInfoStrParsed = JSON.parse(userInfoStr || '{}');
            const employerId = userInfoStrParsed._id;

            if (!employerId) return;

            const [funnelRes, perfRes] = await Promise.all([
                client.get(`/api/analytics/employer/${employerId}/hiring-funnel`),
                client.get(`/api/analytics/employer/${employerId}/job-performance`)
            ]);

            setFunnelData(funnelRes.data);
            setPerformanceData(perfRes.data);

        } catch (error) {
            logger.error('Failed to fetch analytics', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#9333ea" />
            </View>
        );
    }

    const funnelChartData = {
        labels: ["Applied", "ShortListed", "Interview", "Hired"],
        datasets: [
            {
                data: [
                    funnelData?.funnel?.applied || 0,
                    funnelData?.funnel?.shortlisted || 0,
                    funnelData?.funnel?.interviewed || 0,
                    funnelData?.funnel?.hired || 0
                ]
            }
        ]
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#0f172a" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Analytics Dashboard</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Aggregate Stats */}
                <View style={styles.statsRow}>
                    <View style={styles.statCard}>
                        <Text style={styles.statLabel}>Total Jobs</Text>
                        <Text style={styles.statValue}>{funnelData?.totalJobs || 0}</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statLabel}>Total Apps</Text>
                        <Text style={styles.statValue}>{funnelData?.totalApplications || 0}</Text>
                    </View>
                </View>

                {/* Funnel Chart */}
                <View style={styles.sectionCard}>
                    <Text style={styles.sectionTitle}>Hiring Funnel</Text>
                    <BarChart
                        data={funnelChartData}
                        width={screenWidth - 48}
                        height={220}
                        yAxisLabel=""
                        chartConfig={chartConfig}
                        verticalLabelRotation={0}
                        fromZero={true}
                        showValuesOnTopOfBars={true}
                        style={{ marginVertical: 8, borderRadius: 16 }}
                    />
                </View>

                {/* Performance by Job */}
                <Text style={[styles.sectionTitle, { marginLeft: 4, marginBottom: 12, marginTop: 8 }]}>Job Performance</Text>
                {performanceData.map(job => (
                    <View key={job.jobId} style={styles.jobPerfCard}>
                        <View style={styles.jobPerfHeader}>
                            <Text style={styles.jobPerfTitle}>{job.title}</Text>
                            <View style={[styles.statusBadge, { backgroundColor: job.status === 'Active' ? '#dcfce7' : '#f1f5f9' }]}>
                                <Text style={[styles.statusText, { color: job.status === 'Active' ? '#166534' : '#475569' }]}>{job.status}</Text>
                            </View>
                        </View>

                        <View style={styles.perfMetricsRow}>
                            <View style={styles.perfMetric}>
                                <Text style={styles.perfMetricVal}>{job.views}</Text>
                                <Text style={styles.perfMetricLbl}>Views</Text>
                            </View>
                            <View style={styles.perfMetric}>
                                <Text style={styles.perfMetricVal}>{job.applications}</Text>
                                <Text style={styles.perfMetricLbl}>Apps</Text>
                            </View>
                            <View style={styles.perfMetric}>
                                <Text style={styles.perfMetricVal}>{job.avgMatchScore}%</Text>
                                <Text style={styles.perfMetricLbl}>Avg Match</Text>
                            </View>
                            <View style={styles.perfMetric}>
                                <Text style={styles.perfMetricVal}>{job.daysOpen}</Text>
                                <Text style={styles.perfMetricLbl}>Days</Text>
                            </View>
                        </View>
                    </View>
                ))}

                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f8fafc',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    backButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#0f172a',
    },
    scrollContent: {
        padding: 16,
    },
    statsRow: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 20,
    },
    statCard: {
        flex: 1,
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#f1f5f9',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    statLabel: {
        fontSize: 12,
        color: '#64748b',
        fontWeight: '600',
        marginBottom: 4,
        textTransform: 'uppercase',
    },
    statValue: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#7c3aed',
    },
    sectionCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#f1f5f9',
        marginBottom: 24,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1e293b',
        alignSelf: 'flex-start',
    },
    jobPerfCard: {
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    jobPerfHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    jobPerfTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#0f172a',
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusText: {
        fontSize: 10,
        fontWeight: 'bold',
    },
    perfMetricsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: '#f8fafc',
        padding: 12,
        borderRadius: 8,
    },
    perfMetric: {
        alignItems: 'center',
    },
    perfMetricVal: {
        fontSize: 16,
        fontWeight: '800',
        color: '#334155',
    },
    perfMetricLbl: {
        fontSize: 10,
        color: '#64748b',
        marginTop: 2,
    }
});
