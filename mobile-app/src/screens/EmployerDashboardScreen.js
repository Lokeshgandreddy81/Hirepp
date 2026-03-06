import React, { useCallback, useRef, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Image,
    ActivityIndicator,
    Modal,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    Alert,
} from 'react-native';
import { logger } from '../utils/logger';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import client from '../api/client';
import NudgeToast from '../components/NudgeToast';
import SocketService from '../services/socket';

const extractArrayPayload = (payload) => {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.data)) return payload.data;
    return null;
};
const OBJECT_ID_PATTERN = /^[a-f0-9]{24}$/i;
const normalizeObjectId = (value) => {
    const normalized = String(value || '').trim();
    if (!OBJECT_ID_PATTERN.test(normalized)) return '';
    return normalized;
};
const normalizeCardToken = (value) => String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
const buildCardSignature = (job = {}) => {
    const skills = Array.isArray(job.skills)
        ? job.skills.map((item) => normalizeCardToken(item)).filter(Boolean).sort().join('|')
        : '';
    return [
        normalizeCardToken(job.title),
        normalizeCardToken(job.company),
        normalizeCardToken(job.location),
        normalizeCardToken(job.salary),
        normalizeCardToken(job.type),
        skills,
    ].join('::');
};
const collapseDuplicateJobCards = (jobs = []) => {
    const rows = Array.isArray(jobs) ? jobs : [];
    const bySignature = new Set();
    const collapsed = [];

    for (const job of rows) {
        const signature = buildCardSignature(job);
        if (!signature || !bySignature.has(signature)) {
            if (signature) bySignature.add(signature);
            collapsed.push(job);
        }
    }

    return collapsed;
};
const MY_JOBS_CACHE_KEY = '@cached_employer_jobs_dashboard';

export default function EmployerDashboardScreen({ navigation }) {
    const [jobs, setJobs] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedJob, setSelectedJob] = useState(null);
    const [showResponseReminder, setShowResponseReminder] = useState(false);
    const [toastVisible, setToastVisible] = useState(false);
    const [actionBusy, setActionBusy] = useState(false);
    const fetchInFlightRef = useRef(false);
    const pendingFetchRef = useRef(false);
    const fetchRequestIdRef = useRef(0);
    const hasLoadedOnceRef = useRef(false);
    const insets = useSafeAreaInsets();

    const fetchMyJobs = useCallback(async ({ showLoader = false } = {}) => {
        if (fetchInFlightRef.current) {
            pendingFetchRef.current = true;
            return;
        }
        const requestId = fetchRequestIdRef.current + 1;
        fetchRequestIdRef.current = requestId;
        fetchInFlightRef.current = true;

        if (showLoader || !hasLoadedOnceRef.current) {
            setIsLoading(true);
        }
        try {
            const [jobsResult, applicationsResult] = await Promise.allSettled([
                client.get('/api/jobs/my-jobs', {
                    __skipApiErrorHandler: true,
                    __maxRetries: 0,
                    __disableBaseFallback: true,
                    timeout: 6000,
                }),
                client.get('/api/applications', {
                    __skipApiErrorHandler: true,
                    __maxRetries: 0,
                    __disableBaseFallback: true,
                    timeout: 6000,
                }),
            ]);
            if (requestId !== fetchRequestIdRef.current) return;

            if (jobsResult.status !== 'fulfilled') {
                throw jobsResult.reason;
            }

            const jobsArray = extractArrayPayload(jobsResult.value?.data);
            if (!jobsArray) {
                throw new Error('Invalid jobs response format.');
            }

            let applicationsArray = [];
            if (applicationsResult.status === 'fulfilled') {
                const parsedApplications = extractArrayPayload(applicationsResult.value?.data);
                if (parsedApplications) {
                    applicationsArray = parsedApplications;
                } else {
                    logger.warn('My Jobs: applications payload was not an array. Falling back to zero counts.');
                }
            } else {
                logger.warn('My Jobs: applications fetch failed. Falling back to zero counts.');
            }

            const perJobStats = applicationsArray.reduce((acc, application) => {
                const jobId = String(application?.job?._id || application?.job || '');
                if (!jobId) return acc;
                const status = String(application?.status || '').toLowerCase();
                if (!acc[jobId]) {
                    acc[jobId] = {
                        total: 0,
                        shortlisted: 0,
                        hired: 0,
                        accepted: 0,
                    };
                }
                acc[jobId].total += 1;
                if (status === 'shortlisted') acc[jobId].shortlisted += 1;
                if (status === 'hired') acc[jobId].hired += 1;
                if (status === 'accepted' || status === 'offer_accepted') acc[jobId].accepted += 1;
                return acc;
            }, {});

            const formattedJobs = jobsArray.map((j) => {
                const createdAtRaw = j?.createdAt ? new Date(j.createdAt) : null;
                const jobId = normalizeObjectId(j?._id);
                if (!jobId) return null;
                const liveStats = perJobStats[jobId] || {};
                const applicantCount = Number(liveStats.total ?? j?.applicantCount ?? 0);
                const shortlistedCount = Number(liveStats.shortlisted ?? j?.shortlistedCount ?? j?.stats?.shortlisted ?? 0);
                const hiredCount = Number(liveStats.hired ?? j?.hiredCount ?? j?.stats?.hired ?? 0);
                const acceptedCount = Number(liveStats.accepted ?? 0);

                return {
                    id: jobId,
                    title: j?.title || 'Untitled Job',
                    company: j?.companyName || 'Your Company',
                    location: j?.location || '',
                    salary: j?.salaryRange || 'Negotiable',
                    type: j?.shift || 'Full-time',
                    postedAt: createdAtRaw && !Number.isNaN(createdAtRaw.getTime())
                        ? createdAtRaw.toLocaleDateString()
                        : 'Recently',
                    createdAt: createdAtRaw ? createdAtRaw.toISOString() : null,
                    description: Array.isArray(j?.requirements) && j.requirements.length
                        ? j.requirements.join(', ')
                        : 'No description provided.',
                    skills: Array.isArray(j?.requirements) ? j.requirements : [],
                    applicantCount,
                    shortlistedCount,
                    hiredCount,
                    acceptedCount,
                    status: String(j?.status || 'open'),
                };
            }).filter(Boolean);
            const uniqueById = Array.from(new Map(
                formattedJobs.map((job) => [job.id, job])
            ).values());
            const stableCards = collapseDuplicateJobCards(uniqueById);

            setJobs(stableCards);
            const shouldRemind = stableCards.some((job) => Number(job?.applicantCount || 0) > 0);
            setShowResponseReminder(shouldRemind);
            if (shouldRemind) {
                setToastVisible(true);
            }
            AsyncStorage.setItem(MY_JOBS_CACHE_KEY, JSON.stringify(stableCards)).catch(() => { });
        } catch (error) {
            if (requestId !== fetchRequestIdRef.current) return;
            // Keep My Jobs resilient in weak-network scenarios without surfacing technical errors.
            try {
                const cached = await AsyncStorage.getItem(MY_JOBS_CACHE_KEY);
                const parsed = JSON.parse(String(cached || '[]'));
                if (Array.isArray(parsed) && parsed.length > 0) {
                    setJobs(parsed);
                    const shouldRemind = parsed.some((job) => Number(job?.applicantCount || 0) > 0);
                    setShowResponseReminder(shouldRemind);
                    return;
                }
            } catch (_cacheError) {
                // Continue to empty fallback.
            }
            setJobs([]);
            setShowResponseReminder(false);
        } finally {
            if (requestId === fetchRequestIdRef.current) {
                fetchInFlightRef.current = false;
                hasLoadedOnceRef.current = true;
                setIsLoading(false);
                if (pendingFetchRef.current) {
                    pendingFetchRef.current = false;
                    setTimeout(() => {
                        fetchMyJobs({ showLoader: false });
                    }, 0);
                }
            }
        }
    }, []);

    React.useEffect(() => {
        fetchMyJobs({ showLoader: true });
    }, [fetchMyJobs]);

    React.useEffect(() => {
        const unsubscribeFocus = navigation.addListener('focus', fetchMyJobs);
        return unsubscribeFocus;
    }, [fetchMyJobs, navigation]);

    React.useEffect(() => {
        const handleRealtimeApplication = () => {
            fetchMyJobs();
        };

        SocketService.on('new_application', handleRealtimeApplication);
        return () => {
            SocketService.off('new_application', handleRealtimeApplication);
        };
    }, [fetchMyJobs]);

    const showCenteredEmptyState = !isLoading && jobs.length === 0;

    const handleViewApplicants = useCallback(() => {
        if (!selectedJob?.id) {
            Alert.alert('Missing job', 'Could not open applicants for this job.');
            return;
        }
        setSelectedJob(null);
        navigation.navigate('Talent', { jobId: selectedJob.id, jobTitle: selectedJob.title });
    }, [navigation, selectedJob]);

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
        if (!selectedJob) return;
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

    const handleSaveEdit = useCallback(async () => {
        if (!selectedJob?.id || actionBusy) return;
        setActionBusy(true);
        try {
            const requirements = editForm.requirements.split(',').map((s) => s.trim()).filter(Boolean);
            await client.put(`/api/jobs/${selectedJob.id}`, {
                title: editForm.title,
                companyName: editForm.company,
                location: editForm.location,
                salaryRange: editForm.salary,
                requirements,
                description: editForm.description,
            });

            const updatedJobs = jobs.map((j) => {
                if (j.id !== selectedJob.id) return j;
                return {
                    ...j,
                    title: editForm.title,
                    company: editForm.company,
                    location: editForm.location,
                    salary: editForm.salary,
                    description: editForm.description,
                    skills: requirements,
                };
            });
            const updatedSelected = updatedJobs.find((j) => j.id === selectedJob.id) || null;
            setJobs(updatedJobs);
            setSelectedJob(updatedSelected);
            setIsEditModalVisible(false);
            setToastVisible(true);
        } catch (error) {
            logger.error('Failed to update job posting:', error);
            Alert.alert('Update failed', 'Could not update this job right now. Please try again.');
        } finally {
            setActionBusy(false);
        }
    }, [actionBusy, editForm, jobs, selectedJob]);

    const handleDeleteJob = useCallback((jobToDelete) => {
        if (!jobToDelete?.id || actionBusy) return;
        Alert.alert(
            'Delete this job?',
            `This will permanently remove "${jobToDelete.title}" and related applications.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        setActionBusy(true);
                        try {
                            await client.delete(`/api/jobs/${jobToDelete.id}`);
                            setSelectedJob(null);
                            setJobs((prev) => prev.filter((row) => row.id !== jobToDelete.id));
                            await fetchMyJobs();
                            Alert.alert('Deleted', 'Job posting removed successfully.');
                        } catch (error) {
                            logger.error('Delete job failed:', error);
                            Alert.alert('Delete failed', 'Could not delete this job right now. Please try again.');
                        } finally {
                            setActionBusy(false);
                        }
                    },
                },
            ]
        );
    }, [actionBusy, fetchMyJobs]);

    const handleDeleteAllJobs = useCallback(() => {
        if (actionBusy) return;
        Alert.alert(
            'Delete all my jobs?',
            'This permanently removes all of your posted jobs.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete All',
                    style: 'destructive',
                    onPress: async () => {
                        setActionBusy(true);
                        try {
                            await client.delete('/api/jobs/my-jobs/all');
                            setSelectedJob(null);
                            setJobs([]);
                            setShowResponseReminder(false);
                            await fetchMyJobs();
                            Alert.alert('Done', 'All your job postings were deleted.');
                        } catch (error) {
                            logger.error('Delete all jobs failed:', error);
                            Alert.alert('Delete all failed', 'Could not delete all jobs right now. Please try again.');
                        } finally {
                            setActionBusy(false);
                        }
                    },
                },
            ]
        );
    }, [actionBusy, fetchMyJobs]);

    if (selectedJob) {
        return (
            <View style={styles.container}>
                <View style={styles.bannerContainer}>
                    <Image
                        source={{ uri: `https://ui-avatars.com/api/?name=${encodeURIComponent(String(selectedJob.company || 'Company'))}&background=7c3aed&color=fff&size=512` }}
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

                        <View style={styles.pipelineRow}>
                            <View style={styles.pipelineCard}>
                                <Text style={styles.pipelineValue}>{selectedJob.applicantCount || 0}</Text>
                                <Text style={styles.pipelineLabel}>Applicants</Text>
                            </View>
                            <View style={styles.pipelineCard}>
                                <Text style={styles.pipelineValue}>{selectedJob.shortlistedCount || 0}</Text>
                                <Text style={styles.pipelineLabel}>Shortlisted</Text>
                            </View>
                            <View style={styles.pipelineCard}>
                                <Text style={styles.pipelineValue}>{selectedJob.hiredCount || 0}</Text>
                                <Text style={styles.pipelineLabel}>Hired</Text>
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

                    </ScrollView>

                    <View style={[styles.bottomActionContainer, { paddingBottom: insets.bottom || 16 }]}>
                        <TouchableOpacity style={styles.viewApplicantsButton} onPress={handleViewApplicants}>
                            <Text style={styles.viewApplicantsButtonText}>View Applicants</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.editButton, actionBusy && styles.actionButtonDisabled]} onPress={openEditModal} disabled={actionBusy}>
                            <Text style={styles.editButtonText}>{actionBusy ? 'Working...' : 'Edit Job Posting'}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.deleteButton, actionBusy && styles.actionButtonDisabled]}
                            onPress={() => handleDeleteJob(selectedJob)}
                            disabled={actionBusy}
                        >
                            <Text style={styles.deleteButtonText}>{actionBusy ? 'Working...' : 'Delete This Job'}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.deleteAllButton, actionBusy && styles.actionButtonDisabled]}
                            onPress={handleDeleteAllJobs}
                            disabled={actionBusy}
                        >
                            <Text style={styles.deleteAllButtonText}>{actionBusy ? 'Working...' : 'Delete All My Jobs'}</Text>
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
                                <TouchableOpacity style={[styles.saveButton, actionBusy && styles.actionButtonDisabled]} onPress={handleSaveEdit} disabled={actionBusy}>
                                    <Text style={styles.saveButtonText}>{actionBusy ? 'Saving...' : 'Save Changes'}</Text>
                                </TouchableOpacity>
                            </ScrollView>
                        </View>
                    </KeyboardAvoidingView>
                </Modal>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
                <Text style={styles.headerTitle}>My Jobs</Text>
                <Text style={styles.headerSubtitle}>Manage your job postings</Text>

                {showResponseReminder ? (
                    <View style={styles.responseReminder}>
                        <Text style={styles.responseReminderText}>Respond faster to improve hire rate and candidate trust.</Text>
                    </View>
                ) : null}
            </View>

            {isLoading ? (
                <View style={styles.loadingCenterWrap}>
                    <ActivityIndicator size="large" color="#7c3aed" />
                    <Text style={styles.loadingCenterText}>Loading jobs...</Text>
                </View>
            ) : showCenteredEmptyState ? (
                <View style={styles.emptyJobsCenterWrap}>
                    <View style={styles.emptyJobsWrap}>
                        <Text style={styles.emptyJobsTitle}>No jobs yet</Text>
                        <Text style={styles.emptyJobsSubtitle}>Your posted jobs will appear here.</Text>
                    </View>
                </View>
            ) : (
                <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
                    {jobs.map((job) => (
                        <TouchableOpacity
                            key={job.id}
                            style={styles.jobCard}
                            onPress={() => setSelectedJob(job)}
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

                            <View style={styles.pipelineBadgeRow}>
                                <View style={styles.pipelineBadge}>
                                    <Text style={styles.pipelineBadgeText}>{job.applicantCount || 0} applicants</Text>
                                </View>
                                <View style={styles.pipelineBadge}>
                                    <Text style={styles.pipelineBadgeText}>{job.shortlistedCount || 0} shortlisted</Text>
                                </View>
                                <View style={styles.pipelineBadge}>
                                    <Text style={styles.pipelineBadgeText}>{job.hiredCount || 0} hired</Text>
                                </View>
                            </View>

                            <Text style={styles.postedAtText}>Posted {job.postedAt}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            )}

            <NudgeToast
                visible={toastVisible}
                text="Respond faster to improve hire rate."
                actionLabel="Review"
                onAction={() => {
                    setToastVisible(false);
                }}
                onDismiss={() => setToastVisible(false)}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    header: {
        backgroundColor: '#7c3aed',
        paddingHorizontal: 16,
        paddingBottom: 14,
        shadowColor: '#4c1d95',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 8,
        elevation: 6,
        zIndex: 10,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: '#ffffff',
    },
    headerSubtitle: {
        marginTop: 4,
        color: 'rgba(255,255,255,0.88)',
        fontSize: 13,
        fontWeight: '500',
    },
    responseReminder: {
        marginTop: 10,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.28)',
        backgroundColor: 'rgba(255,255,255,0.14)',
        paddingHorizontal: 10,
        paddingVertical: 8,
    },
    responseReminderText: {
        color: '#ffffff',
        fontSize: 12,
        fontWeight: '600',
    },
    listContent: {
        padding: 16,
        gap: 16,
    },
    loadingCenterWrap: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 24,
    },
    loadingCenterText: {
        marginTop: 12,
        fontSize: 14,
        color: '#64748b',
        fontWeight: '600',
    },
    emptyJobsCenterWrap: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 22,
    },
    emptyJobsWrap: {
        width: '100%',
        maxWidth: 360,
        backgroundColor: '#ffffff',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        paddingVertical: 22,
        paddingHorizontal: 16,
        alignItems: 'center',
        shadowColor: '#0f172a',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    emptyJobsTitle: {
        color: '#1e293b',
        fontSize: 17,
        fontWeight: '800',
        textAlign: 'center',
    },
    emptyJobsSubtitle: {
        marginTop: 6,
        color: '#64748b',
        fontSize: 13,
        lineHeight: 18,
        textAlign: 'center',
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
    pipelineBadgeRow: {
        marginTop: 10,
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    pipelineBadge: {
        borderRadius: 999,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        backgroundColor: '#f8fafc',
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    pipelineBadgeText: {
        color: '#334155',
        fontSize: 10,
        fontWeight: '700',
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
    pipelineRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 20,
    },
    pipelineCard: {
        flex: 1,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#ede9fe',
        backgroundColor: '#faf5ff',
        paddingVertical: 10,
        alignItems: 'center',
    },
    pipelineValue: {
        color: '#6d28d9',
        fontSize: 16,
        fontWeight: '900',
    },
    pipelineLabel: {
        marginTop: 2,
        color: '#7c3aed',
        fontSize: 10,
        fontWeight: '700',
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
    bottomActionContainer: {
        padding: 16,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#f1f5f9',
        gap: 10,
    },
    viewApplicantsButton: {
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#d8b4fe',
        borderRadius: 12,
        paddingVertical: 12,
        alignItems: 'center',
    },
    viewApplicantsButtonText: {
        color: '#7c3aed',
        fontSize: 15,
        fontWeight: '700',
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
    deleteButton: {
        backgroundColor: '#fef2f2',
        borderWidth: 1,
        borderColor: '#fecaca',
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
    },
    deleteButtonText: {
        color: '#b91c1c',
        fontSize: 14,
        fontWeight: '700',
    },
    deleteAllButton: {
        backgroundColor: '#fee2e2',
        borderWidth: 1,
        borderColor: '#ef4444',
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
    },
    deleteAllButtonText: {
        color: '#991b1b',
        fontSize: 14,
        fontWeight: '800',
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
    actionButtonDisabled: {
        opacity: 0.7,
    },
});
