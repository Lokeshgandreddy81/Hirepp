import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    AppState,
    Dimensions,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthContext } from '../context/AuthContext';
import client from '../api/client';
import { getPrimaryRoleFromUser } from '../utils/roleMode';
import { triggerHaptic } from '../utils/haptics';
import { logger } from '../utils/logger';
import { trackEvent } from '../services/analytics';

const { width } = Dimensions.get('window');

const PROCESSING_MESSAGES = [
    'Transcribing your video...',
    'Understanding your skills...',
    'Building your profile...',
    'Optimizing your match quality...',
];

const MAX_RECORD_DURATION_SECONDS = 90;
const HYBRID_POLL_WINDOW_MS = 30 * 1000;
const POLL_INTERVAL_MS = 5 * 1000;
const PROCESSING_NOTICE_TIMEOUT_MS = 2 * 60 * 1000;
const BOOST_UPSELL_TYPE = 'smart_interview_post_confirm';

const STAGES = {
    INTRO: 'intro',
    RECORDING: 'recording',
    UPLOADING: 'uploading',
    PROCESSING: 'processing',
    REVIEW: 'review',
    COMPLETE: 'complete',
};

const buildDefaultExtractedData = (role, userInfo) => {
    if (role === 'employer') {
        return {
            jobTitle: '',
            companyName: userInfo?.name || '',
            requiredSkills: [],
            experienceRequired: '',
            salaryRange: '',
            shift: 'flexible',
            location: '',
            description: '',
            confidenceScore: null,
        };
    }

    return {
        name: userInfo?.name || '',
        roleTitle: '',
        skills: [],
        experienceYears: 0,
        expectedSalary: '',
        preferredShift: 'flexible',
        location: '',
        summary: '',
        confidenceScore: null,
    };
};

export default function SmartInterviewScreen({ navigation, route }) {
    const insets = useSafeAreaInsets();
    const { userInfo, completeOnboarding } = useContext(AuthContext);
    const role = getPrimaryRoleFromUser(userInfo);
    const isEmployer = role === 'employer';

    const [cameraPermission, requestCameraPermission] = useCameraPermissions();
    const [microphonePermission, requestMicrophonePermission] = useMicrophonePermissions();

    const [stage, setStage] = useState(STAGES.INTRO);
    const [timer, setTimer] = useState(0);
    const [isRecording, setIsRecording] = useState(false);
    const [facing, setFacing] = useState('front');
    const [videoUri, setVideoUri] = useState(null);
    const [processingId, setProcessingId] = useState(null);
    const [createdJobId, setCreatedJobId] = useState(null);
    const [extractedData, setExtractedData] = useState(null);
    const [waitingForPush, setWaitingForPush] = useState(false);
    const [processingMessageIndex, setProcessingMessageIndex] = useState(0);
    const [showBoostUpsell, setShowBoostUpsell] = useState(false);
    const [upsellJobId, setUpsellJobId] = useState(null);

    const cameraRef = useRef(null);
    const timerRef = useRef(null);
    const pollingRef = useRef(null);
    const pollingStartedAtRef = useRef(0);
    const processingTimeoutRef = useRef(null);
    const processingNoticeShownRef = useRef(false);
    const appStateRef = useRef(AppState.currentState);
    const statusRequestInFlightRef = useRef(false);
    const mountedRef = useRef(true);
    const stageRef = useRef(stage);
    const upsellShownRef = useRef(false);

    const statusSubtitle = useMemo(() => {
        if (stage === STAGES.RECORDING) return 'Recording...';
        if (stage === STAGES.UPLOADING || stage === STAGES.PROCESSING) return 'AI analyzing your video';
        if (stage === STAGES.REVIEW) return 'Review your profile';
        if (stage === STAGES.COMPLETE) return "You're all set!";
        return 'Tell us about yourself';
    }, [stage]);

    const clearTimer = useCallback(() => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
    }, []);

    const stopStatusTracking = useCallback(() => {
        if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
        }
        if (processingTimeoutRef.current) {
            clearTimeout(processingTimeoutRef.current);
            processingTimeoutRef.current = null;
        }
    }, []);

    const formatTimer = useCallback((seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        const maxMins = Math.floor(MAX_RECORD_DURATION_SECONDS / 60);
        const maxSecs = MAX_RECORD_DURATION_SECONDS % 60;
        return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')} / ${String(maxMins).padStart(2, '0')}:${String(maxSecs).padStart(2, '0')}`;
    }, []);

    const hydrateExtractedData = useCallback((payload) => {
        const defaults = buildDefaultExtractedData(role, userInfo);
        return {
            ...defaults,
            ...(payload || {}),
        };
    }, [role, userInfo]);

    const getBoostDismissKey = useCallback((jobId) => {
        const userId = String(userInfo?._id || 'unknown');
        return `@boost_upsell_dismissed:${userId}:${String(jobId)}:${BOOST_UPSELL_TYPE}`;
    }, [userInfo?._id]);

    const maybeShowBoostUpsell = useCallback(async (jobId) => {
        if (!jobId || !isEmployer || upsellShownRef.current) return;
        const dismissKey = getBoostDismissKey(jobId);
        const dismissed = await AsyncStorage.getItem(dismissKey);
        if (dismissed === '1') return;

        try {
            const { data } = await client.post(`/api/jobs/${jobId}/boost-upsell-exposure`);
            if (data?.shouldShow) {
                upsellShownRef.current = true;
                setUpsellJobId(jobId);
                setShowBoostUpsell(true);
                trackEvent('EMPLOYER_BOOST_UPSELL_SHOWN', {
                    source: 'smart_interview_complete',
                    jobId: String(jobId),
                });
            }
        } catch (error) {
            logger.warn('Upsell exposure check failed:', error?.message || error);
        }
    }, [getBoostDismissKey, isEmployer]);

    const dismissBoostUpsell = useCallback(async () => {
        if (!upsellJobId) return;
        const dismissKey = getBoostDismissKey(upsellJobId);
        await AsyncStorage.setItem(dismissKey, '1');
        setShowBoostUpsell(false);
    }, [getBoostDismissKey, upsellJobId]);

    const handleBoostPurchase = useCallback(async () => {
        if (!upsellJobId) return;
        trackEvent('EMPLOYER_BOOST_UPSELL_CLICKED', {
            source: 'smart_interview_complete',
            jobId: String(upsellJobId),
        });
        setShowBoostUpsell(false);

        try {
            const { data } = await client.post('/api/payment/create-featured-listing', { jobId: upsellJobId });
            trackEvent('EMPLOYER_BOOST_PURCHASE_INITIATED', {
                source: 'smart_interview_complete',
                jobId: String(upsellJobId),
            });
            if (data?.url) {
                const { Linking } = await import('react-native');
                Linking.openURL(data.url);
            } else {
                Alert.alert('Boost Unavailable', 'Could not start payment checkout right now.');
            }
        } catch (error) {
            Alert.alert('Boost Unavailable', 'Could not start payment checkout right now.');
        }
    }, [upsellJobId]);

    const checkProcessingStatus = useCallback(async (id) => {
        if (!id || statusRequestInFlightRef.current) return;
        statusRequestInFlightRef.current = true;

        try {
            const { data } = await client.get(`/api/v2/interview-processing/${id}`);
            if (!mountedRef.current) return;

            const status = String(data?.status || '').toLowerCase();

            if (status === 'completed') {
                stopStatusTracking();
                setExtractedData(hydrateExtractedData(data?.extractedData));
                setCreatedJobId(data?.createdJobId || null);
                setStage(STAGES.REVIEW);
                setWaitingForPush(false);
                triggerHaptic.success();
                return;
            }

            if (status === 'failed') {
                stopStatusTracking();
                setWaitingForPush(false);
                triggerHaptic.error();
                Alert.alert('Processing Failed', data?.errorMessage || 'Could not process your interview. Please record again.');
                setStage(STAGES.INTRO);
                return;
            }

            setStage(STAGES.PROCESSING);
        } catch (error) {
            logger.warn('Interview status check failed:', error?.message || error);
        } finally {
            statusRequestInFlightRef.current = false;
        }
    }, [hydrateExtractedData, stopStatusTracking]);

    const beginHybridStatusTracking = useCallback((id) => {
        stopStatusTracking();
        setWaitingForPush(false);
        processingNoticeShownRef.current = false;
        pollingStartedAtRef.current = Date.now();

        checkProcessingStatus(id);

        pollingRef.current = setInterval(() => {
            const elapsed = Date.now() - pollingStartedAtRef.current;
            if (elapsed >= HYBRID_POLL_WINDOW_MS) {
                if (pollingRef.current) {
                    clearInterval(pollingRef.current);
                    pollingRef.current = null;
                }
                setWaitingForPush(true);
                return;
            }
            checkProcessingStatus(id);
        }, POLL_INTERVAL_MS);

        processingTimeoutRef.current = setTimeout(() => {
            if (!mountedRef.current) return;
            if (processingNoticeShownRef.current) return;
            if (stageRef.current !== STAGES.PROCESSING && stageRef.current !== STAGES.UPLOADING) return;

            processingNoticeShownRef.current = true;
            if (pollingRef.current) {
                clearInterval(pollingRef.current);
                pollingRef.current = null;
            }
            setWaitingForPush(true);
            Alert.alert(
                'Still Processing',
                'Your interview is still processing. We’ll notify you when it’s ready.'
            );
        }, PROCESSING_NOTICE_TIMEOUT_MS);
    }, [checkProcessingStatus, stopStatusTracking]);

    const uploadForAsyncProcessing = useCallback(async (uri) => {
        setStage(STAGES.UPLOADING);

        const formData = new FormData();
        formData.append('video', {
            uri,
            type: 'video/mp4',
            name: `smart-interview-${Date.now()}.mp4`,
        });

        try {
            const { data } = await client.post('/api/v2/upload/video', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                transformRequest: (body) => body,
                timeout: 20000,
            });

            if (!data?.success || !data?.processingId) {
                throw new Error(data?.error || 'Could not queue interview processing.');
            }

            setProcessingId(data.processingId);
            setStage(STAGES.PROCESSING);
            beginHybridStatusTracking(data.processingId);
        } catch (error) {
            triggerHaptic.error();
            Alert.alert(
                'Upload Failed',
                error?.response?.data?.error || error?.message || 'Could not upload interview video. Please try again.'
            );
            setStage(STAGES.INTRO);
        }
    }, [beginHybridStatusTracking]);

    const startRecording = useCallback(async () => {
        if (!cameraRef.current) return;

        setStage(STAGES.RECORDING);
        setIsRecording(true);
        setTimer(0);
        triggerHaptic.medium();

        timerRef.current = setInterval(() => {
            setTimer((prev) => prev + 1);
        }, 1000);

        try {
            const recordingResult = await cameraRef.current.recordAsync({
                maxDuration: MAX_RECORD_DURATION_SECONDS,
            });

            if (!mountedRef.current) return;

            clearTimer();
            setIsRecording(false);

            if (recordingResult?.uri) {
                setVideoUri(recordingResult.uri);
                await uploadForAsyncProcessing(recordingResult.uri);
            } else {
                setStage(STAGES.INTRO);
            }
        } catch (error) {
            clearTimer();
            setIsRecording(false);
            if (!mountedRef.current) return;
            logger.error('Recording failed:', error?.message || error);
            Alert.alert('Recording Failed', 'Could not record video. Please try again.');
            setStage(STAGES.INTRO);
        }
    }, [clearTimer, uploadForAsyncProcessing]);

    const stopRecording = useCallback(() => {
        if (cameraRef.current && isRecording) {
            triggerHaptic.light();
            cameraRef.current.stopRecording();
        }
    }, [isRecording]);

    const cancelRecording = useCallback(() => {
        if (isRecording && cameraRef.current) {
            cameraRef.current.stopRecording();
        }
        clearTimer();
        setIsRecording(false);
        setTimer(0);
        setStage(STAGES.INTRO);
    }, [clearTimer, isRecording]);

    const parseSkills = useCallback((value) => {
        if (Array.isArray(value)) return value;
        return String(value || '').split(',').map((item) => item.trim()).filter(Boolean);
    }, []);

    const handleConfirmSave = useCallback(async () => {
        if (!extractedData) return;

        try {
            if (isEmployer) {
                await client.put('/api/users/profile', {
                    companyName: extractedData.companyName || userInfo?.name || 'My Company',
                    location: extractedData.location || 'Remote',
                    industry: extractedData.jobTitle || '',
                    hasCompletedProfile: true,
                    processingId,
                });

                if (createdJobId) {
                    await client.put(`/api/jobs/${createdJobId}`, {
                        title: extractedData.jobTitle || 'Open Position',
                        companyName: extractedData.companyName || userInfo?.name || 'My Company',
                        salaryRange: extractedData.salaryRange || 'Negotiable',
                        location: extractedData.location || 'Remote',
                        requirements: parseSkills(extractedData.requiredSkills),
                        status: 'active',
                        processingId,
                    });

                    await maybeShowBoostUpsell(createdJobId);
                }
            } else {
                const fullName = String(extractedData.name || userInfo?.name || '').trim();
                const [firstName = 'Unknown', ...rest] = fullName.split(' ').filter(Boolean);
                const lastName = rest.join(' ');
                const expectedSalaryNum = Number.parseInt(String(extractedData.expectedSalary || '').replace(/[^0-9]/g, ''), 10);
                const experienceYears = Number.isFinite(Number(extractedData.experienceYears))
                    ? Number(extractedData.experienceYears)
                    : 0;

                await client.put('/api/users/profile', {
                    firstName,
                    lastName,
                    city: extractedData.location || 'Unknown',
                    totalExperience: experienceYears,
                    roleProfiles: [{
                        roleName: extractedData.roleTitle || 'General',
                        experienceInRole: experienceYears,
                        expectedSalary: Number.isFinite(expectedSalaryNum) ? expectedSalaryNum : 0,
                        skills: parseSkills(extractedData.skills),
                        lastUpdated: new Date(),
                    }],
                    hasCompletedProfile: true,
                    processingId,
                });
            }

            await completeOnboarding?.();
            triggerHaptic.success();
            setStage(STAGES.COMPLETE);
        } catch (error) {
            logger.error('Smart interview confirm failed:', error?.message || error);
            Alert.alert('Save Failed', 'Could not save your profile data. Please try again.');
        }
    }, [completeOnboarding, createdJobId, extractedData, isEmployer, maybeShowBoostUpsell, parseSkills, processingId, userInfo]);

    useEffect(() => {
        stageRef.current = stage;
    }, [stage]);

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
            clearTimer();
            stopStatusTracking();
            if (cameraRef.current && isRecording) {
                cameraRef.current.stopRecording();
            }
        };
    }, [clearTimer, isRecording, stopStatusTracking]);

    useEffect(() => {
        requestCameraPermission();
        requestMicrophonePermission();
    }, [requestCameraPermission, requestMicrophonePermission]);

    useEffect(() => {
        if (stage !== STAGES.PROCESSING && stage !== STAGES.UPLOADING) return undefined;

        const interval = setInterval(() => {
            setProcessingMessageIndex((prev) => (prev + 1) % PROCESSING_MESSAGES.length);
        }, 1800);

        return () => clearInterval(interval);
    }, [stage]);

    useEffect(() => {
        const subscription = AppState.addEventListener('change', (nextState) => {
            const wasBackground = appStateRef.current.match(/inactive|background/);
            if (wasBackground && nextState === 'active' && processingId && (stage === STAGES.PROCESSING || waitingForPush)) {
                checkProcessingStatus(processingId);
            }
            if (wasBackground && nextState === 'active' && stageRef.current === STAGES.COMPLETE) {
                setShowBoostUpsell(false);
            }
            appStateRef.current = nextState;
        });

        return () => {
            subscription.remove();
        };
    }, [checkProcessingStatus, processingId, stage, waitingForPush]);

    useEffect(() => {
        const incomingProcessingId = route?.params?.processingId;
        if (!incomingProcessingId) return;
        if (String(incomingProcessingId) === String(processingId) && !waitingForPush) return;

        setProcessingId(incomingProcessingId);
        setStage(STAGES.PROCESSING);
        beginHybridStatusTracking(incomingProcessingId);
    }, [beginHybridStatusTracking, processingId, route?.params?.processingId, waitingForPush]);

    if (!cameraPermission || !microphonePermission) {
        return (
            <View style={styles.loaderContainer}>
                <ActivityIndicator color="#ffffff" size="large" />
            </View>
        );
    }

    if (!cameraPermission.granted || !microphonePermission.granted) {
        return (
            <View style={styles.permissionContainer}>
                <Text style={styles.permissionTitle}>Camera Access Needed</Text>
                <Text style={styles.permissionText}>Smart Interview requires camera and microphone access.</Text>
                <TouchableOpacity style={styles.primaryButton} onPress={() => {
                    requestCameraPermission();
                    requestMicrophonePermission();
                }}>
                    <Text style={styles.primaryButtonText}>Grant Permissions</Text>
                </TouchableOpacity>
            </View>
        );
    }

    if (stage === STAGES.INTRO) {
        return (
            <LinearGradient colors={['#000000', '#111827']} style={[styles.container, { paddingTop: insets.top + 12 }]}> 
                <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                    <Text style={styles.backButtonText}>‹</Text>
                </TouchableOpacity>

                <View style={styles.centeredContent}>
                    <Text style={styles.headerTitle}>Smart Interview</Text>
                    <Text style={styles.headerSubtitle}>{statusSubtitle}</Text>

                    <View style={styles.introCard}>
                        <Text style={styles.introCardTitle}>Single 90-second video</Text>
                        <Text style={styles.introCardText}>Record once. AI extracts your profile, then you review before confirming.</Text>
                    </View>

                    <TouchableOpacity style={styles.primaryButton} onPress={startRecording}>
                        <Text style={styles.primaryButtonText}>Start Recording</Text>
                    </TouchableOpacity>
                </View>
            </LinearGradient>
        );
    }

    if (stage === STAGES.REVIEW) {
        return (
            <View style={[styles.reviewContainer, { paddingTop: insets.top + 12 }]}> 
                <ScrollView contentContainerStyle={styles.reviewScroll} showsVerticalScrollIndicator={false}>
                    <Text style={styles.headerTitle}>Review Your Profile</Text>
                    <Text style={styles.headerSubtitle}>AI extracted this from your interview. Edit before saving.</Text>

                    <View style={styles.videoPreviewCard}>
                        <Text style={styles.videoPreviewLabel}>Recorded Video</Text>
                        <Text style={styles.videoPreviewValue}>{videoUri ? 'Ready' : 'Not available'}</Text>
                    </View>

                    <View style={styles.confidenceCard}>
                        <Text style={styles.confidenceLabel}>AI Confidence</Text>
                        <View style={styles.confidenceBarTrack}>
                            <View style={[styles.confidenceBarFill, { width: `${Math.max(40, Math.min(100, Number(extractedData?.confidenceScore) || 82))}%` }]} />
                        </View>
                        <Text style={styles.confidenceValue}>{Math.max(40, Math.min(100, Number(extractedData?.confidenceScore) || 82))}%</Text>
                    </View>

                    <View style={styles.reviewCard}>
                        {isEmployer ? (
                            <>
                                <Text style={styles.reviewLabel}>Job Title</Text>
                                <TextInput
                                    style={styles.reviewInput}
                                    value={String(extractedData?.jobTitle || '')}
                                    onChangeText={(value) => setExtractedData((prev) => ({ ...(prev || {}), jobTitle: value }))}
                                />

                                <Text style={styles.reviewLabel}>Company Name</Text>
                                <TextInput
                                    style={styles.reviewInput}
                                    value={String(extractedData?.companyName || '')}
                                    onChangeText={(value) => setExtractedData((prev) => ({ ...(prev || {}), companyName: value }))}
                                />

                                <Text style={styles.reviewLabel}>Required Skills</Text>
                                <TextInput
                                    style={styles.reviewInput}
                                    value={Array.isArray(extractedData?.requiredSkills) ? extractedData.requiredSkills.join(', ') : String(extractedData?.requiredSkills || '')}
                                    onChangeText={(value) => setExtractedData((prev) => ({ ...(prev || {}), requiredSkills: value.split(',').map((item) => item.trim()).filter(Boolean) }))}
                                />

                                <Text style={styles.reviewLabel}>Salary Range</Text>
                                <TextInput
                                    style={styles.reviewInput}
                                    value={String(extractedData?.salaryRange || '')}
                                    onChangeText={(value) => setExtractedData((prev) => ({ ...(prev || {}), salaryRange: value }))}
                                />

                                <Text style={styles.reviewLabel}>Location</Text>
                                <TextInput
                                    style={styles.reviewInput}
                                    value={String(extractedData?.location || '')}
                                    onChangeText={(value) => setExtractedData((prev) => ({ ...(prev || {}), location: value }))}
                                />
                            </>
                        ) : (
                            <>
                                <Text style={styles.reviewLabel}>Name</Text>
                                <TextInput
                                    style={styles.reviewInput}
                                    value={String(extractedData?.name || '')}
                                    onChangeText={(value) => setExtractedData((prev) => ({ ...(prev || {}), name: value }))}
                                />

                                <Text style={styles.reviewLabel}>Role</Text>
                                <TextInput
                                    style={styles.reviewInput}
                                    value={String(extractedData?.roleTitle || '')}
                                    onChangeText={(value) => setExtractedData((prev) => ({ ...(prev || {}), roleTitle: value }))}
                                />

                                <Text style={styles.reviewLabel}>Skills</Text>
                                <TextInput
                                    style={styles.reviewInput}
                                    value={Array.isArray(extractedData?.skills) ? extractedData.skills.join(', ') : String(extractedData?.skills || '')}
                                    onChangeText={(value) => setExtractedData((prev) => ({ ...(prev || {}), skills: value.split(',').map((item) => item.trim()).filter(Boolean) }))}
                                />

                                <Text style={styles.reviewLabel}>Experience (years)</Text>
                                <TextInput
                                    style={styles.reviewInput}
                                    keyboardType="numeric"
                                    value={String(extractedData?.experienceYears ?? '')}
                                    onChangeText={(value) => setExtractedData((prev) => ({ ...(prev || {}), experienceYears: value }))}
                                />

                                <Text style={styles.reviewLabel}>Location</Text>
                                <TextInput
                                    style={styles.reviewInput}
                                    value={String(extractedData?.location || '')}
                                    onChangeText={(value) => setExtractedData((prev) => ({ ...(prev || {}), location: value }))}
                                />
                            </>
                        )}
                    </View>

                    <TouchableOpacity style={styles.primaryButton} onPress={handleConfirmSave}>
                        <Text style={styles.primaryButtonText}>Confirm & Continue</Text>
                    </TouchableOpacity>

                    <View style={styles.trustBadgeCard}>
                        <Text style={styles.trustBadgeTitle}>Visibility Boost</Text>
                        <Text style={styles.trustBadgeText}>Completing this interview improves your visibility by 3x.</Text>
                    </View>
                </ScrollView>
            </View>
        );
    }

    if (stage === STAGES.COMPLETE) {
        return (
            <LinearGradient colors={['#000000', '#111827']} style={[styles.container, { paddingTop: insets.top + 24 }]}> 
                <View style={styles.centeredContent}>
                    <Text style={styles.successEmoji}>✓</Text>
                    <Text style={styles.headerTitle}>Your Smart Profile Is Live</Text>
                    <Text style={styles.headerSubtitle}>You can now apply instantly and get better matches.</Text>

                    <TouchableOpacity
                        style={styles.primaryButton}
                        onPress={() => navigation.navigate('MainTab', {
                            screen: isEmployer ? 'My Jobs' : 'Jobs',
                            params: isEmployer
                                ? undefined
                                : {
                                    highlightMatches: true,
                                    recommendedCount: 3,
                                    source: 'interview_complete',
                                },
                        })}
                    >
                        <Text style={styles.primaryButtonText}>{isEmployer ? 'View Job' : 'Explore Jobs'}</Text>
                    </TouchableOpacity>

                    {!isEmployer && (
                        <View style={styles.workerNudgeCard}>
                            <Text style={styles.workerNudgeTitle}>3 jobs matching your profile right now</Text>
                            <Text style={styles.workerNudgeText}>We prioritized opportunities based on your verified interview profile.</Text>
                        </View>
                    )}

                </View>
                <Modal
                    visible={isEmployer && showBoostUpsell}
                    transparent
                    animationType="fade"
                    onRequestClose={dismissBoostUpsell}
                >
                    <View style={styles.upsellModalBackdrop}>
                        <View style={styles.upsellModalCard}>
                            <Text style={styles.upsellTitle}>Boost this job to reach 3x more candidates</Text>
                            <Text style={styles.upsellText}>One-tap boost for ₹499. Higher visibility in city feed.</Text>
                            <View style={styles.upsellActions}>
                                <TouchableOpacity style={styles.upsellSecondaryButton} onPress={dismissBoostUpsell}>
                                    <Text style={styles.upsellSecondaryText}>Maybe Later</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.upsellPrimaryButton} onPress={handleBoostPurchase}>
                                    <Text style={styles.upsellPrimaryText}>Boost Job</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>
            </LinearGradient>
        );
    }

    return (
        <View style={styles.cameraContainer}>
            <CameraView style={styles.cameraView} facing={facing} mode="video" ref={cameraRef}>
                <LinearGradient colors={['rgba(0,0,0,0.55)', 'transparent', 'rgba(0,0,0,0.85)']} style={styles.overlay}> 
                    <View style={[styles.topHeader, { paddingTop: insets.top + 8 }]}> 
                        <Text style={styles.headerTitleSmall}>Smart Interview ✦</Text>
                        <Text style={styles.headerSubtitleSmall}>{statusSubtitle}</Text>
                    </View>

                    <View style={styles.middleArea}>
                        {(stage === STAGES.UPLOADING || stage === STAGES.PROCESSING) ? (
                            <View style={styles.processingCard}>
                                <ActivityIndicator color="#5B8CFF" size="large" />
                                <Text style={styles.processingTitle}>{PROCESSING_MESSAGES[processingMessageIndex]}</Text>
                                <Text style={styles.processingSubtext}>
                                    {waitingForPush
                                        ? 'Processing continues in background. We will notify you when ready.'
                                        : 'Please keep the app open for faster completion.'}
                                </Text>
                            </View>
                        ) : (
                            <View style={styles.centerGlowRing} />
                        )}
                    </View>

                    <View style={[styles.bottomControls, { paddingBottom: insets.bottom + 18 }]}> 
                        {stage === STAGES.RECORDING && (
                            <>
                                <View style={styles.timerPill}>
                                    <Text style={styles.timerText}>{formatTimer(timer)}</Text>
                                </View>

                                <View style={styles.waveformRow}>
                                    {Array.from({ length: 16 }).map((_, index) => (
                                        <View
                                            key={`wave-${index}`}
                                            style={[
                                                styles.waveBar,
                                                {
                                                    height: 6 + ((timer + index * 3) % 18),
                                                    opacity: 0.35 + ((timer + index) % 6) * 0.1,
                                                },
                                            ]}
                                        />
                                    ))}
                                </View>

                                <View style={styles.recordingActionsRow}>
                                    <TouchableOpacity
                                        style={styles.smallCircleButton}
                                        onPress={() => setFacing((prev) => (prev === 'front' ? 'back' : 'front'))}
                                    >
                                        <Text style={styles.smallCircleButtonText}>↺</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity style={styles.stopButton} onPress={stopRecording}>
                                        <View style={styles.stopButtonInner} />
                                    </TouchableOpacity>

                                    <TouchableOpacity style={styles.smallCircleButton} onPress={cancelRecording}>
                                        <Text style={styles.smallCircleButtonText}>×</Text>
                                    </TouchableOpacity>
                                </View>
                            </>
                        )}

                        {(stage === STAGES.UPLOADING || stage === STAGES.PROCESSING) && (
                            <TouchableOpacity style={styles.exitButton} onPress={() => navigation.goBack()}>
                                <Text style={styles.exitButtonText}>Leave Screen</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </LinearGradient>
            </CameraView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    loaderContainer: {
        flex: 1,
        backgroundColor: '#000',
        alignItems: 'center',
        justifyContent: 'center',
    },
    centeredContent: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 24,
    },
    backButton: {
        width: 42,
        height: 42,
        borderRadius: 21,
        marginLeft: 16,
        marginTop: 8,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.12)',
    },
    backButtonText: {
        color: '#fff',
        fontSize: 26,
        marginTop: -2,
    },
    headerTitle: {
        color: '#fff',
        fontSize: 32,
        fontWeight: '700',
        textAlign: 'center',
    },
    headerSubtitle: {
        color: '#cbd5e1',
        marginTop: 10,
        fontSize: 16,
        fontWeight: '500',
        textAlign: 'center',
        maxWidth: 320,
    },
    introCard: {
        width: '100%',
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderRadius: 24,
        padding: 18,
        marginTop: 28,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
    },
    introCardTitle: {
        color: '#ffffff',
        fontWeight: '700',
        fontSize: 16,
        marginBottom: 6,
    },
    introCardText: {
        color: '#cbd5e1',
        fontSize: 14,
        lineHeight: 20,
    },
    primaryButton: {
        width: '100%',
        backgroundColor: '#5B8CFF',
        borderRadius: 28,
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#5B8CFF',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 6,
    },
    primaryButtonText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 16,
    },
    permissionContainer: {
        flex: 1,
        backgroundColor: '#0f172a',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 24,
    },
    permissionTitle: {
        color: '#fff',
        fontSize: 24,
        fontWeight: '700',
        marginBottom: 10,
    },
    permissionText: {
        color: '#cbd5e1',
        textAlign: 'center',
        marginBottom: 24,
    },
    cameraContainer: {
        flex: 1,
        backgroundColor: '#000',
    },
    cameraView: {
        flex: 1,
    },
    overlay: {
        flex: 1,
        justifyContent: 'space-between',
    },
    topHeader: {
        alignItems: 'center',
    },
    headerTitleSmall: {
        color: '#fff',
        fontSize: 22,
        fontWeight: '700',
    },
    headerSubtitleSmall: {
        color: '#e2e8f0',
        fontSize: 14,
        fontWeight: '500',
        marginTop: 4,
    },
    middleArea: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 22,
    },
    centerGlowRing: {
        width: width * 0.44,
        height: width * 0.44,
        borderRadius: (width * 0.44) / 2,
        borderWidth: 2,
        borderColor: 'rgba(91,140,255,0.7)',
        backgroundColor: 'rgba(91,140,255,0.08)',
    },
    processingCard: {
        width: '100%',
        backgroundColor: 'rgba(8,15,30,0.92)',
        borderRadius: 28,
        borderWidth: 1,
        borderColor: 'rgba(91,140,255,0.35)',
        padding: 20,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
    },
    processingTitle: {
        marginTop: 14,
        color: '#fff',
        fontWeight: '700',
        fontSize: 16,
        textAlign: 'center',
    },
    processingSubtext: {
        marginTop: 10,
        color: '#cbd5e1',
        fontSize: 13,
        textAlign: 'center',
    },
    bottomControls: {
        paddingHorizontal: 18,
    },
    timerPill: {
        alignSelf: 'center',
        backgroundColor: 'rgba(0,0,0,0.72)',
        borderRadius: 999,
        paddingHorizontal: 16,
        paddingVertical: 8,
        marginBottom: 14,
    },
    timerText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 14,
    },
    waveformRow: {
        alignSelf: 'center',
        flexDirection: 'row',
        alignItems: 'flex-end',
        marginBottom: 18,
    },
    waveBar: {
        width: 6,
        borderRadius: 4,
        marginHorizontal: 2,
        backgroundColor: '#5B8CFF',
    },
    recordingActionsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        marginBottom: 2,
    },
    smallCircleButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.58)',
    },
    smallCircleButtonText: {
        color: '#fff',
        fontSize: 22,
        fontWeight: '500',
    },
    stopButton: {
        width: 92,
        height: 92,
        borderRadius: 46,
        backgroundColor: '#FF4D4F',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#FF4D4F',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 8,
    },
    stopButtonInner: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: '#fff',
    },
    exitButton: {
        alignSelf: 'center',
        backgroundColor: 'rgba(0,0,0,0.58)',
        borderRadius: 999,
        paddingHorizontal: 18,
        paddingVertical: 10,
    },
    exitButtonText: {
        color: '#fff',
        fontWeight: '600',
    },
    reviewContainer: {
        flex: 1,
        backgroundColor: '#0b1220',
    },
    reviewScroll: {
        paddingHorizontal: 16,
        paddingBottom: 30,
    },
    videoPreviewCard: {
        marginTop: 18,
        marginBottom: 12,
        backgroundColor: '#111827',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#1f2937',
        padding: 14,
    },
    videoPreviewLabel: {
        color: '#94a3b8',
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 6,
    },
    videoPreviewValue: {
        color: '#e2e8f0',
        fontSize: 15,
        fontWeight: '700',
    },
    confidenceCard: {
        backgroundColor: '#111827',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#1f2937',
        padding: 14,
        marginBottom: 12,
    },
    confidenceLabel: {
        color: '#94a3b8',
        fontSize: 12,
        fontWeight: '600',
    },
    confidenceBarTrack: {
        marginTop: 8,
        height: 8,
        borderRadius: 8,
        backgroundColor: '#1f2937',
        overflow: 'hidden',
    },
    confidenceBarFill: {
        height: '100%',
        backgroundColor: '#22C55E',
    },
    confidenceValue: {
        marginTop: 6,
        color: '#e2e8f0',
        fontWeight: '700',
    },
    reviewCard: {
        backgroundColor: '#111827',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#1f2937',
        padding: 14,
        marginBottom: 14,
    },
    reviewLabel: {
        color: '#cbd5e1',
        fontSize: 12,
        fontWeight: '700',
        marginBottom: 6,
        marginTop: 8,
    },
    reviewInput: {
        backgroundColor: '#0f172a',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#334155',
        color: '#fff',
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 14,
    },
    trustBadgeCard: {
        marginTop: 12,
        backgroundColor: 'rgba(34,197,94,0.14)',
        borderRadius: 18,
        borderWidth: 1,
        borderColor: 'rgba(34,197,94,0.32)',
        padding: 14,
    },
    trustBadgeTitle: {
        color: '#86efac',
        fontSize: 13,
        fontWeight: '700',
    },
    trustBadgeText: {
        marginTop: 4,
        color: '#dcfce7',
        fontSize: 13,
    },
    workerNudgeCard: {
        marginTop: 14,
        width: '100%',
        borderRadius: 16,
        backgroundColor: 'rgba(91,140,255,0.14)',
        borderWidth: 1,
        borderColor: 'rgba(91,140,255,0.5)',
        padding: 14,
    },
    workerNudgeTitle: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: '700',
    },
    workerNudgeText: {
        marginTop: 6,
        color: '#cbd5e1',
        fontSize: 12,
        lineHeight: 17,
    },
    upsellModalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.58)',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 20,
    },
    upsellModalCard: {
        width: '100%',
        borderRadius: 16,
        backgroundColor: '#111827',
        borderWidth: 1,
        borderColor: '#1f2937',
        padding: 16,
    },
    upsellTitle: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: '700',
    },
    upsellText: {
        marginTop: 6,
        color: '#cbd5e1',
        fontSize: 12,
        lineHeight: 17,
    },
    upsellActions: {
        marginTop: 10,
        flexDirection: 'row',
        gap: 10,
    },
    upsellSecondaryButton: {
        flex: 1,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#334155',
        paddingVertical: 10,
        alignItems: 'center',
    },
    upsellSecondaryText: {
        color: '#e2e8f0',
        fontWeight: '600',
        fontSize: 12,
    },
    upsellPrimaryButton: {
        flex: 1,
        borderRadius: 12,
        backgroundColor: '#5B8CFF',
        paddingVertical: 10,
        alignItems: 'center',
    },
    upsellPrimaryText: {
        color: '#ffffff',
        fontWeight: '700',
        fontSize: 12,
    },
    successEmoji: {
        color: '#22C55E',
        fontSize: 64,
        fontWeight: '700',
        marginBottom: 12,
    },
});
