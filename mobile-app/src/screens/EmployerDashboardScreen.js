import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Image,
    Modal,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    Alert,
    Linking,
} from 'react-native';
import { logger } from '../utils/logger';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';

import client from '../api/client';

const ANALYTICS_DATA = [
    { name: 'Applied', value: 45, color: '#94a3b8' },
    { name: 'Shortlisted', value: 12, color: '#8b5cf6' },
    { name: 'Interview', value: 5, color: '#a855f7' },
    { name: 'Offer', value: 2, color: '#7c3aed' },
];

export default function EmployerDashboardScreen({ navigation }) {
    const [jobs, setJobs] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState('');
    const [selectedJob, setSelectedJob] = useState(null);
    const [activeFilter, setActiveFilter] = useState('All');
    const [employerId, setEmployerId] = useState(null);
    const [fillRateMeter, setFillRateMeter] = useState(null);
    const [loadingFillRate, setLoadingFillRate] = useState(false);
    const insets = useSafeAreaInsets();

    React.useEffect(() => {
        fetchMyJobs();
        hydrateEmployerId();
    }, []);

    const hydrateEmployerId = async () => {
        try {
            const raw = await SecureStore.getItemAsync('userInfo');
            if (!raw) return;
            const parsed = JSON.parse(raw);
            if (parsed?._id) {
                setEmployerId(parsed._id);
            }
        } catch (error) {
            logger.warn('Failed to read employer id:', error?.message || error);
        }
    };

    React.useEffect(() => {
        if (!employerId) return;
        fetchFillRateMeter(employerId);
    }, [employerId]);

    const fetchMyJobs = async () => {
        setIsLoading(true);
        setErrorMsg('');
        try {
            logger.log('🔍 Fetching employer jobs...');
            const { data } = await client.get('/api/jobs/my-jobs');
            logger.log('✅ API Response Data:', data);

            const jobsArray = Array.isArray(data) ? data : (data.data || []);

            const formattedJobs = jobsArray.map(j => ({
                id: j._id,
                title: j.title,
                company: j.companyName || 'Your Company',
                location: j.location,
                salary: j.salaryRange,
                type: j.shift || 'Full-time',
                postedAt: new Date(j.createdAt).toLocaleDateString(),
                description: j.requirements ? j.requirements.join(', ') : 'No description provided.',
                skills: j.requirements || [],
                matchScore: 0 // Mock score placeholder
            }));
            logger.log('📊 Jobs count:', formattedJobs.length);
            setJobs(formattedJobs);
        } catch (error) {
            logger.error('❌ Failed to load jobs:', error);
            logger.error('❌ Error response:', error.response?.data);
            logger.error('❌ Error status:', error.response?.status);
            setErrorMsg('Failed to load jobs. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const fetchFillRateMeter = async (id) => {
        setLoadingFillRate(true);
        try {
            const { data } = await client.get(`/api/analytics/employer/${id}/fill-rate-meter`);
            setFillRateMeter(data?.metrics || null);
        } catch (error) {
            logger.warn('Fill-rate meter unavailable:', error?.message || error);
            setFillRateMeter(null);
        } finally {
            setLoadingFillRate(false);
        }
    };

    const handleBoostTopJob = async () => {
        const topJob = jobs[0];
        if (!topJob?.id) {
            Alert.alert('No jobs yet', 'Create a job first to run a boost.');
            return;
        }

        try {
            const { data } = await client.post('/api/payment/create-featured-listing', { jobId: topJob.id });
            if (data?.url) {
                Linking.openURL(data.url);
            } else {
                Alert.alert('Boost unavailable', 'Could not start checkout right now.');
            }
        } catch (error) {
            Alert.alert('Boost unavailable', 'Could not start checkout right now.');
        }
    };

    const [isEditModalVisible, setIsEditModalVisible] = useState(false);
    const [editForm, setEditForm] = useState({
        title: '',
        company: '',
        location: '',
        salary: '',
        description: '',
        requirements: ''
    });

    const openEditModal = () => {
        setEditForm({
            title: selectedJob.title,
            company: selectedJob.company,
            location: selectedJob.location,
            salary: selectedJob.salary,
            description: selectedJob.description,
            requirements: selectedJob.skills.join(', ')
        });
        setIsEditModalVisible(true);
    };

    const handleSaveEdit = () => {
        const updatedJobs = jobs.map(j => {
            if (j.id === selectedJob.id) {
                return {
                    ...j,
                    title: editForm.title,
                    company: editForm.company,
                    location: editForm.location,
                    salary: editForm.salary,
                    description: editForm.description,
                    skills: editForm.requirements.split(',').map(s => s.trim()).filter(s => s)
                };
            }
            return j;
        });
        setJobs(updatedJobs);
        setSelectedJob(updatedJobs.find(j => j.id === selectedJob.id));
        setIsEditModalVisible(false);
    };

    if (selectedJob) {
        // Find max value for bar chart
        const maxValue = Math.max(...ANALYTICS_DATA.map(d => d.value));

        return (
            <View style={styles.container}>
                <View style={styles.bannerContainer}>
                    <Image
                        source={{ uri: 'https://source.unsplash.com/random/800x400/?office,work' }}
                        style={styles.bannerImage}
                    />
                    <View style={styles.bannerOverlay} />
                    <TouchableOpacity
                        style={[styles.backButton, { top: insets.top + 16 }]}
                        onPress={() => setSelectedJob(null)}
                    >
                        <Ionicons name="arrow-back" size={24} color="#FFF" />
                    </TouchableOpacity>
                </View>

                <View style={styles.contentCard}>
                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                        <View style={styles.detailHeader}>
                            <View>
                                <Text style={styles.detailTitle}>{selectedJob.title}</Text>
                                <Text style={styles.detailCompany}>{selectedJob.company}</Text>
                            </View>
                        </View>

                        <View style={styles.statsRow}>
                            <View style={styles.statBox}>
                                <Text style={styles.statLabel}>SALARY</Text>
                                <Text style={styles.statValue}>{selectedJob.salary}</Text>
                            </View>
                            <View style={styles.statBox}>
                                <Text style={styles.statLabel}>TYPE</Text>
                                <Text style={styles.statValue}>{selectedJob.type}</Text>
                            </View>
                        </View>

                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Description</Text>
                            <Text style={styles.descriptionText}>{selectedJob.description}</Text>
                        </View>

                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Requirements</Text>
                            <View style={styles.tagsContainer}>
                                {selectedJob.skills.map(skill => (
                                    <View key={skill} style={styles.requirementTag}>
                                        <Text style={styles.requirementTagText}>{skill}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>

                        <View style={styles.analyticsSection}>
                            <Text style={styles.sectionTitle}>Hiring Funnel Analytics</Text>
                            <View style={styles.chartContainer}>
                                {ANALYTICS_DATA.map((item, index) => {
                                    const heightPercent = Math.max((item.value / maxValue) * 100, 5);
                                    return (
                                        <View key={index} style={styles.barColumn}>
                                            <View style={styles.barWrapper}>
                                                <View
                                                    style={[
                                                        styles.barFill,
                                                        { height: `${heightPercent}%`, backgroundColor: item.color }
                                                    ]}
                                                />
                                            </View>
                                            <Text style={styles.barLabel}>{item.name}</Text>
                                            <Text style={styles.barValue}>{item.value}</Text>
                                        </View>
                                    );
                                })}
                            </View>
                        </View>
                    </ScrollView>

                    <View style={[styles.bottomActionContainer, { paddingBottom: insets.bottom || 16 }]}>
                        <TouchableOpacity style={styles.editButton} onPress={openEditModal}>
                            <Text style={styles.editButtonText}>Edit Job Posting</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Edit Modal (Preserving Employer Functionality) */}
                <Modal
                    visible={isEditModalVisible}
                    animationType="slide"
                    transparent={true}
                    onRequestClose={() => setIsEditModalVisible(false)}
                >
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        style={styles.modalOverlay}
                    >
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitleText}>Edit Job</Text>
                                <TouchableOpacity onPress={() => setIsEditModalVisible(false)}>
                                    <Ionicons name="close" size={24} color="#6B7280" />
                                </TouchableOpacity>
                            </View>

                            <ScrollView showsVerticalScrollIndicator={false}>
                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Job Title</Text>
                                    <TextInput style={styles.input} value={editForm.title} onChangeText={t => setEditForm({ ...editForm, title: t })} />
                                </View>
                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Company/Shop Name</Text>
                                    <TextInput style={styles.input} value={editForm.company} onChangeText={t => setEditForm({ ...editForm, company: t })} />
                                </View>
                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Location</Text>
                                    <TextInput style={styles.input} value={editForm.location} onChangeText={t => setEditForm({ ...editForm, location: t })} />
                                </View>
                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Salary</Text>
                                    <TextInput style={styles.input} value={editForm.salary} onChangeText={t => setEditForm({ ...editForm, salary: t })} />
                                </View>
                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Description</Text>
                                    <TextInput style={[styles.input, styles.textArea]} value={editForm.description} multiline onChangeText={t => setEditForm({ ...editForm, description: t })} />
                                </View>
                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Requirements (Comma separated)</Text>
                                    <TextInput style={[styles.input, styles.textArea]} value={editForm.requirements} multiline onChangeText={t => setEditForm({ ...editForm, requirements: t })} />
                                </View>
                                <TouchableOpacity style={styles.saveButton} onPress={handleSaveEdit}>
                                    <Text style={styles.saveButtonText}>Save Changes</Text>
                                </TouchableOpacity>
                            </ScrollView>
                        </View>
                    </KeyboardAvoidingView>
                </Modal>
            </View>
        );
    }

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.header}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={styles.headerTitle}>Your Job Postings</Text>
                    <TouchableOpacity
                        style={styles.analyticsBtn}
                        onPress={() => navigation.navigate('EmployerAnalytics')}
                    >
                        <Ionicons name="bar-chart" size={16} color="#7c3aed" />
                        <Text style={styles.analyticsBtnText}>Analytics</Text>
                    </TouchableOpacity>
                </View>

                {isLoading && <Text style={{ color: '#64748b', marginTop: 8 }}>Loading jobs...</Text>}
                {errorMsg ? <Text style={{ color: 'red', marginTop: 8 }}>{errorMsg}</Text> : null}

                <View style={styles.fillRateCard}>
                    <View style={styles.fillRateHeader}>
                        <Text style={styles.fillRateTitle}>Fill Rate Meter</Text>
                        {loadingFillRate ? <Text style={styles.fillRateSubtle}>Refreshing...</Text> : null}
                    </View>
                    <View style={styles.fillRateGrid}>
                        <View style={styles.fillRateItem}>
                            <Text style={styles.fillRateLabel}>Applications</Text>
                            <Text style={styles.fillRateValue}>{fillRateMeter?.applicationsCount ?? '--'}</Text>
                        </View>
                        <View style={styles.fillRateItem}>
                            <Text style={styles.fillRateLabel}>Shortlist Rate</Text>
                            <Text style={styles.fillRateValue}>
                                {fillRateMeter ? `${Math.round((fillRateMeter.shortlistRate || 0) * 100)}%` : '--'}
                            </Text>
                        </View>
                        <View style={styles.fillRateItem}>
                            <Text style={styles.fillRateLabel}>ETA to Fill</Text>
                            <Text style={styles.fillRateValue}>
                                {fillRateMeter ? `${fillRateMeter.estimatedTimeToFillDays}d` : '--'}
                            </Text>
                        </View>
                        <View style={styles.fillRateItem}>
                            <Text style={styles.fillRateLabel}>City Benchmark</Text>
                            <Text style={styles.fillRateValue}>
                                {fillRateMeter ? `${Math.round((fillRateMeter.cityAverageFillRate || 0) * 100)}%` : '--'}
                            </Text>
                        </View>
                    </View>
                    <TouchableOpacity style={styles.fillRateBoostButton} onPress={handleBoostTopJob}>
                        <Text style={styles.fillRateBoostText}>Boost Top Job</Text>
                    </TouchableOpacity>
                </View>

                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.filtersContainer}
                    contentContainerStyle={styles.filtersContent}
                >
                    {['All', 'High Match', 'Nearby', 'New'].map(filter => (
                        <TouchableOpacity
                            key={filter}
                            style={[styles.filterButton, activeFilter === filter && styles.filterButtonActive]}
                            onPress={() => setActiveFilter(filter)}
                        >
                            <Text style={[styles.filterText, activeFilter === filter && styles.filterTextActive]}>{filter}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
                {jobs.map((job) => (
                    <TouchableOpacity
                        key={job.id}
                        style={styles.jobCard}
                        onPress={() => navigation.navigate('Talent', { jobId: job.id, jobTitle: job.title })}
                        activeOpacity={0.9}
                    >
                        <View style={styles.jobCardHeaderRow}>
                            <View>
                                <Text style={styles.jobCardTitle}>{job.title}</Text>
                                <Text style={styles.jobCardCompany}>{job.company}</Text>
                            </View>
                        </View>

                        <View style={styles.cardTagsRow}>
                            {job.skills.slice(0, 3).map(skill => (
                                <View key={skill} style={styles.cardTag}>
                                    <Text style={styles.cardTagText}>{skill}</Text>
                                </View>
                            ))}
                        </View>

                        <View style={styles.cardFooter}>
                            <View style={styles.locationWrapper}>
                                <Text style={styles.cardFooterText}>📍 {job.location}</Text>
                            </View>
                            <Text style={styles.cardSalary}>{job.salary}</Text>
                        </View>

                        <Text style={styles.postedAtText}>Posted {job.postedAt}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    header: {
        backgroundColor: '#fff',
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
        zIndex: 10,
    },
    fillRateCard: {
        marginTop: 12,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        backgroundColor: '#ffffff',
        padding: 12,
    },
    fillRateHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    fillRateTitle: {
        color: '#0f172a',
        fontSize: 14,
        fontWeight: '800',
    },
    fillRateSubtle: {
        color: '#64748b',
        fontSize: 11,
        fontWeight: '600',
    },
    fillRateGrid: {
        marginTop: 10,
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    fillRateItem: {
        width: '48%',
        borderRadius: 10,
        backgroundColor: '#f8fafc',
        padding: 8,
    },
    fillRateLabel: {
        color: '#64748b',
        fontSize: 11,
        fontWeight: '600',
    },
    fillRateValue: {
        marginTop: 4,
        color: '#111827',
        fontSize: 14,
        fontWeight: '800',
    },
    fillRateBoostButton: {
        marginTop: 10,
        alignSelf: 'flex-start',
        borderRadius: 10,
        backgroundColor: '#4f46e5',
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    fillRateBoostText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '700',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1e293b',
    },
    analyticsBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#faf5ff',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#e9d5ff',
        gap: 4
    },
    analyticsBtnText: {
        color: '#7c3aed',
        fontSize: 12,
        fontWeight: 'bold'
    },
    filtersContainer: {
        marginTop: 12,
    },
    filtersContent: {
        gap: 8,
        paddingBottom: 4,
    },
    filterButton: {
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 20,
        backgroundColor: '#f1f5f9',
        borderWidth: 1,
        borderColor: 'transparent',
    },
    filterButtonActive: {
        backgroundColor: '#faf5ff',
        borderColor: '#e9d5ff',
    },
    filterText: {
        color: '#475569',
        fontSize: 14,
        fontWeight: '500',
    },
    filterTextActive: {
        color: '#7c3aed',
    },
    listContent: {
        padding: 16,
        gap: 16,
    },
    jobCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
        borderWidth: 1,
        borderColor: '#f1f5f9',
    },
    jobCardHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    jobCardTitle: {
        fontWeight: 'bold',
        fontSize: 18,
        color: '#1e293b',
    },
    jobCardCompany: {
        color: '#64748b',
        fontSize: 14,
        fontWeight: '500',
        marginTop: 2,
    },
    cardTagsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginVertical: 12,
    },
    cardTag: {
        backgroundColor: '#f1f5f9',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    cardTagText: {
        color: '#475569',
        fontSize: 12,
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: '#f8fafc',
        paddingTop: 12,
        marginTop: 4,
    },
    locationWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    cardFooterText: {
        fontSize: 14,
        color: '#64748b',
    },
    cardSalary: {
        fontSize: 14,
        fontWeight: '600',
        color: '#334155',
    },
    postedAtText: {
        fontSize: 12,
        color: '#94a3b8',
        textAlign: 'right',
        marginTop: 8,
    },

    // Detail View Styles
    bannerContainer: {
        height: 160,
        backgroundColor: '#1e293b',
        position: 'relative',
    },
    bannerImage: {
        width: '100%',
        height: '100%',
        opacity: 0.5,
    },
    bannerOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.2)',
    },
    backButton: {
        position: 'absolute',
        left: 16,
        backgroundColor: 'rgba(0,0,0,0.3)',
        padding: 8,
        borderRadius: 20,
        zIndex: 10,
    },
    contentCard: {
        flex: 1,
        backgroundColor: '#fff',
        marginTop: -24,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 20,
    },
    detailHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 24,
    },
    detailTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#0f172a',
    },
    detailCompany: {
        fontSize: 16,
        fontWeight: '500',
        color: '#9333ea',
        marginTop: 4,
    },
    statsRow: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 24,
    },
    statBox: {
        flex: 1,
        backgroundColor: '#f8fafc',
        borderRadius: 8,
        padding: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#f1f5f9',
    },
    statLabel: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#94a3b8',
        marginBottom: 4,
    },
    statValue: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1e293b',
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#0f172a',
        marginBottom: 8,
    },
    descriptionText: {
        fontSize: 14,
        color: '#475569',
        lineHeight: 22,
    },
    tagsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    requirementTag: {
        backgroundColor: '#faf5ff',
        borderWidth: 1,
        borderColor: '#f3e8ff',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 6,
    },
    requirementTagText: {
        color: '#7c3aed',
        fontSize: 12,
        fontWeight: '500',
    },
    analyticsSection: {
        backgroundColor: '#f8fafc',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#f1f5f9',
        marginBottom: 8,
    },
    chartContainer: {
        flexDirection: 'row',
        height: 160,
        alignItems: 'flex-end',
        justifyContent: 'space-around',
        paddingTop: 20,
    },
    barColumn: {
        alignItems: 'center',
        flex: 1,
    },
    barWrapper: {
        height: 100,
        width: '100%',
        justifyContent: 'flex-end',
        alignItems: 'center',
        marginBottom: 8,
    },
    barFill: {
        width: 30,
        borderTopLeftRadius: 4,
        borderTopRightRadius: 4,
    },
    barLabel: {
        fontSize: 10,
        color: '#64748b',
        textAlign: 'center',
    },
    barValue: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#1e293b',
        marginTop: 2,
    },
    bottomActionContainer: {
        padding: 16,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#f1f5f9',
    },
    editButton: {
        backgroundColor: '#0f172a',
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        shadowColor: '#0f172a',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    editButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },

    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    modalTitleText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#111827',
    },
    inputGroup: {
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 8,
    },
    input: {
        borderWidth: 1,
        borderColor: '#D1D5DB',
        borderRadius: 12,
        padding: 12,
        fontSize: 16,
        backgroundColor: '#fff',
    },
    textArea: {
        height: 80,
        textAlignVertical: 'top',
    },
    saveButton: {
        backgroundColor: '#7c3aed',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        marginTop: 8,
        marginBottom: 40,
    },
});
