import React, { useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    Alert, ActivityIndicator, Dimensions, Image
} from 'react-native';
import { logger } from '../utils/logger';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import client from '../api/client';
import { IconSparkles, IconMapPin, IconGlobe, IconMessageSquare } from '../components/Icons';
import { useAppState } from '../context/AppStateContext';
import { triggerHaptic } from '../utils/haptics';

const { width } = Dimensions.get('window');

// ─── MOCK DATA ───────────────────────────────────────────────────────────────
const MOCK_ROLE = 'employee'; // toggle to 'employer' to see bar chart

const SIMILAR_JOBS = [
    { id: '1', title: 'Senior Operator', company: 'LogiTech', location: 'Hyderabad', salary: '₹40k' },
    { id: '2', title: 'Warehouse Lead', company: 'Prime Mover', location: 'Remote', salary: '₹50k' },
];

const FUNNEL_DATA = [
    { name: 'Applied', value: 45, color: '#94a3b8' },
    { name: 'Shortlisted', value: 12, color: '#8b5cf6' },
    { name: 'Interview', value: 5, color: '#a855f7' },
    { name: 'Offer', value: 2, color: '#7c3aed' },
];

export default function JobDetailsScreen({ navigation, route }) {
    const insets = useSafeAreaInsets();
    const { job, matchScore, fitReason } = route.params || {};
    const [applying, setApplying] = useState(false);
    const [applied, setApplied] = useState(false);

    const [isSaved, setIsSaved] = useState(false);
    const [loadingAI, setLoadingAI] = useState(false);
    const [explanation, setExplanation] = useState(null);
    const { dispatch } = useAppState();

    // Safely handle missing params
    const safeJob = job || {
        title: 'Heavy Truck Driver',
        companyName: 'Express Logistics',
        location: 'Hyderabad, TS',
        salaryRange: '₹35,000 - ₹45,000 / mo',
        type: 'Full-time',
        requirements: ['Valid Heavy License', '5+ Years Exp', 'Clean Record'],
    };
    const safeMatchScore = matchScore || 92;
    const safeFitReason = fitReason || `Your profile is a strong match for this ${safeJob.title} role based on your 8 years of experience.`;

    const handleApply = async () => {
        setApplying(true);
        try {
            const userInfoStr = await SecureStore.getItemAsync('userInfo');
            const userInfo = JSON.parse(userInfoStr || '{}');
            const workerId = userInfo._id;

            const { data } = await client.post('/api/applications', {
                jobId: safeJob._id || safeJob.id,
                workerId: workerId,
                initiatedBy: 'worker' // As per backend requirement
            });

            // Update global state immediately
            if (data?.application) {
                dispatch({
                    type: 'ADD_APPLICATION',
                    payload: data.application
                });
            } else if (data) {
                dispatch({
                    type: 'ADD_APPLICATION',
                    payload: data
                });
            }

            // Trigger refresh for employer view
            dispatch({
                type: 'MARK_REFRESH_NEEDED',
                payload: { screen: 'applications' }
            });

            triggerHaptic.success();
            setApplying(false);
            setApplied(true);
            Alert.alert(
                '🎉 Application Sent!',
                `You applied to ${safeJob.title} at ${safeJob.companyName}.`,
                [
                    { text: 'View Applications', onPress: () => navigation.navigate('MainTab', { screen: 'Applications' }) },
                    { text: 'Stay Here', style: 'cancel' },
                ]
            );
        } catch (error) {
            setApplying(false);
            const errorMsg = error.response?.data?.message || 'Failed to submit application.';
            Alert.alert('Error', errorMsg);
        }
    };

    const handleExplain = async () => {
        setLoadingAI(true);
        try {
            const userInfoStr = await SecureStore.getItemAsync('userInfo');
            const userInfo = JSON.parse(userInfoStr || '{}');
            const candidateId = userInfo._id;
            const jobId = safeJob._id || safeJob.id;
            const cacheKey = `@explain_${jobId}_${candidateId}`;

            // Try Cache
            const cached = await AsyncStorage.getItem(cacheKey);
            if (cached) {
                setExplanation(JSON.parse(cached));
                setLoadingAI(false);
                return;
            }

            // Fetch Fresh
            const { data } = await client.post('/api/matches/explain', {
                jobId,
                candidateId,
                matchScore: safeMatchScore
            });

            if (data && data.explanation) {
                setExplanation(data.explanation);
                AsyncStorage.setItem(cacheKey, JSON.stringify(data.explanation)).catch(logger.error);
            }
        } catch (error) {
            logger.error('Explanation Error:', error);
            setExplanation(["You are a strong match for this position.", "Your skills align well with the core requirements.", "Good location fit."]); // Fallback
        } finally {
            setLoadingAI(false);
        }
    };

    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} bounces={false}>
                {/* Banner Header */}
                <View style={styles.bannerContainer}>
                    <Image source={{ uri: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&q=80&w=800' }} style={styles.bannerImage} />
                    <View style={styles.bannerOverlay} />
                    <View style={[styles.bannerHeader, { paddingTop: insets.top + 16 }]}>
                        <TouchableOpacity style={styles.iconBtnBlur} onPress={() => navigation.goBack()}>
                            <Text style={styles.iconBtnText}>‹</Text>
                        </TouchableOpacity>
                        <View style={styles.headerRightActions}>
                            <TouchableOpacity style={styles.iconBtnBlur} onPress={() => Alert.alert('Share Job', 'Opening share sheet...')}>
                                <Text style={styles.iconBtnSmallIcon}>↗</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.iconBtnBlur, { marginLeft: 12 }]} onPress={() => setIsSaved(!isSaved)}>
                                <Text style={styles.iconBtnSmallIcon}>{isSaved ? '♥' : '♡'}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                {/* Main Content Card */}
                <View style={styles.contentCard}>
                    {/* Header Info */}
                    <View style={styles.heroHeader}>
                        <View style={styles.heroFlex}>
                            <Text style={styles.jobTitle}>{safeJob.title}</Text>
                            <Text style={styles.companyName}>{safeJob.companyName}</Text>
                        </View>
                        {MOCK_ROLE === 'employee' && (
                            <View style={styles.matchScoreBadge}>
                                <Text style={styles.matchScoreText}>{safeMatchScore}%</Text>
                            </View>
                        )}
                    </View>

                    {/* Quick Stats: Salary & Type */}
                    <View style={styles.quickStatsRow}>
                        <View style={styles.quickStatCard}>
                            <Text style={styles.quickStatLabel}>SALARY</Text>
                            <Text style={styles.quickStatValue}>{safeJob.salaryRange}</Text>
                        </View>
                        <View style={[styles.quickStatCard, { marginLeft: 16 }]}>
                            <Text style={styles.quickStatLabel}>TYPE</Text>
                            <Text style={styles.quickStatValue}>{safeJob.type}</Text>
                        </View>
                    </View>

                    {/* Location */}
                    <View style={styles.locationBox}>
                        <IconMapPin size={16} color="#64748b" />
                        <Text style={styles.locationText}>{safeJob.location}</Text>
                    </View>

                    {/* Description */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Description</Text>
                        <Text style={styles.descriptionText}>
                            We are looking for an experienced {safeJob.title.toLowerCase()} to join our growing team at {safeJob.companyName}. This is an exciting opportunity to work on challenging routes in a fast-paced environment. You'll ensure safe and timely deliveries across our network.
                        </Text>
                    </View>

                    {/* Requirements */}
                    {safeJob?.requirements?.length > 0 && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Requirements</Text>
                            <View style={styles.tagsRow}>
                                {safeJob.requirements.map((req, i) => (
                                    <View key={i} style={styles.skillTag}>
                                        <Text style={styles.skillTagText}>{req}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    )}

                    {/* Mode Specific Sections */}
                    {MOCK_ROLE === 'employer' ? (
                        <View style={styles.funnelSection}>
                            <Text style={styles.sectionTitle}>Hiring Funnel Analytics</Text>
                            <View style={styles.funnelChartBox}>
                                {/* Vertical Bar Chart */}
                                {FUNNEL_DATA.map((item, idx) => (
                                    <View key={idx} style={styles.funnelBarCol}>
                                        <Text style={styles.funnelBarValue}>{item.value}</Text>
                                        <View style={styles.funnelBarTrack}>
                                            <View style={[styles.funnelBarFill, { height: `${(item.value / 45) * 100}%`, backgroundColor: item.color }]} />
                                        </View>
                                        <Text style={styles.funnelBarLabel}>{item.name}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    ) : (
                        <View style={styles.smartMatchCard}>
                            <View style={styles.smartMatchHeader}>
                                <View style={styles.smartMatchTitleRow}>
                                    <IconSparkles size={16} color="#6366f1" />
                                    <Text style={styles.smartMatchTitle}>Smart Match Analysis</Text>
                                </View>
                                {!explanation && (
                                    <TouchableOpacity
                                        style={[styles.explainBtn, loadingAI && { opacity: 0.5 }]}
                                        onPress={handleExplain}
                                        disabled={loadingAI}
                                    >
                                        <Text style={styles.explainBtnText}>{loadingAI ? 'Analyzing...' : 'Why do I match?'}</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                            <View style={styles.smartMatchTextContainer}>
                                {explanation && Array.isArray(explanation) ? (
                                    explanation.map((bullet, idx) => (
                                        <Text key={idx} style={styles.smartMatchText}>• {bullet}</Text>
                                    ))
                                ) : (
                                    <Text style={styles.smartMatchText}>{safeFitReason}</Text>
                                )}
                            </View>
                        </View>
                    )}

                    {/* Company Info Section */}
                    {MOCK_ROLE === 'employee' && safeJob?.companyName && (
                        <View style={styles.companySection}>
                            <View style={styles.sectionHeaderRow}>
                                <Text style={styles.sectionTitle}>About {safeJob.companyName}</Text>
                                <TouchableOpacity>
                                    <Text style={styles.viewProfileText}>View Profile</Text>
                                </TouchableOpacity>
                            </View>
                            <View style={styles.companyCard}>
                                <Image source={{ uri: `https://ui-avatars.com/api/?name=${encodeURIComponent(safeJob.companyName)}&background=7c3aed&color=fff` }} style={styles.companyLogo} />
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.companyDesc} numberOfLines={3}>Express Logistics is a premier supply chain partner delivering excellence across India. We believe in taking care of our fleet and our people.</Text>
                                    <View style={styles.companyMetaRow}>
                                        <Text style={styles.companyMetaLabel}>Founded: 2012</Text>
                                        <Text style={styles.companyMetaLabel}>Employees: 500+</Text>
                                    </View>
                                </View>
                            </View>
                        </View>
                    )}

                    {/* Similar Jobs Carousel */}
                    {MOCK_ROLE === 'employee' && (
                        <View style={styles.similarSection}>
                            <Text style={styles.sectionTitle}>Similar Jobs</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.similarScroll}>
                                {SIMILAR_JOBS.map(sj => (
                                    <TouchableOpacity key={sj.id} style={styles.similarCard} activeOpacity={0.8}>
                                        <Text style={styles.similarCardTitle} numberOfLines={1}>{sj.title}</Text>
                                        <Text style={styles.similarCardCompany}>{sj.company}</Text>
                                        <View style={styles.similarCardFooter}>
                                            <Text style={styles.similarCardLoc}>📍 {sj.location}</Text>
                                            <Text style={styles.similarCardSal}>{sj.salary}</Text>
                                        </View>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>
                    )}

                    <View style={{ height: 100 }} />
                </View>
            </ScrollView>

            {/* Sticky Apply Button */}
            <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
                {MOCK_ROLE === 'employee' ? (
                    <TouchableOpacity
                        style={[styles.applyBtn, applied && styles.applyBtnApplied]}
                        onPress={handleApply}
                        disabled={applying || applied}
                        activeOpacity={0.85}
                    >
                        {applying ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.applyBtnText}>{applied ? '✓ APPLIED' : 'APPLY NOW'}</Text>
                        )}
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity style={styles.editJobBtn} activeOpacity={0.85}>
                        <Text style={styles.editJobBtnText}>EDIT JOB POSTING</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    scrollContent: { flexGrow: 1 },

    // Banner
    bannerContainer: { height: 220, position: 'relative' },
    bannerImage: { width: '100%', height: '100%', position: 'absolute' },
    bannerOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15, 23, 42, 0.4)' },
    bannerHeader: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, position: 'absolute', top: 0, left: 0, right: 0 },
    iconBtnBlur: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
    iconBtnText: { color: '#fff', fontSize: 32, lineHeight: 36, fontWeight: '300', marginLeft: -2 },
    headerRightActions: { flexDirection: 'row', alignItems: 'center' },
    iconBtnSmallIcon: { color: '#fff', fontSize: 20, fontWeight: '600' },

    // Content
    contentCard: { backgroundColor: '#fff', borderTopLeftRadius: 32, borderTopRightRadius: 32, marginTop: -32, paddingHorizontal: 20, paddingTop: 28, flex: 1 },
    heroHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
    heroFlex: { flex: 1, paddingRight: 16 },
    jobTitle: { fontSize: 26, fontWeight: '900', color: '#0f172a', marginBottom: 4, lineHeight: 32 },
    companyName: { fontSize: 16, fontWeight: '700', color: '#9333ea' },
    matchScoreBadge: { backgroundColor: '#faf5ff', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: '#f3e8ff' },
    matchScoreText: { fontSize: 18, fontWeight: '900', color: '#7e22ce' },

    quickStatsRow: { flexDirection: 'row', marginBottom: 16 },
    quickStatCard: { flex: 1, backgroundColor: '#f8fafc', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#f1f5f9', alignItems: 'center' },
    quickStatLabel: { fontSize: 10, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 4, letterSpacing: 0.5 },
    quickStatValue: { fontSize: 14, fontWeight: '800', color: '#1e293b' },

    locationBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#f1f5f9', marginBottom: 24 },
    locationText: { fontSize: 14, fontWeight: '600', color: '#475569' },

    section: { marginBottom: 24 },
    sectionTitle: { fontSize: 16, fontWeight: '900', color: '#0f172a', marginBottom: 12 },
    descriptionText: { fontSize: 14, lineHeight: 22, color: '#475569', fontWeight: '500' },

    tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    skillTag: { backgroundColor: '#faf5ff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#f3e8ff' },
    skillTagText: { fontSize: 12, color: '#7e22ce', fontWeight: '700' },

    // Employer
    funnelSection: { backgroundColor: '#f8fafc', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#f1f5f9', marginBottom: 24 },
    funnelChartBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 160, paddingTop: 20 },
    funnelBarCol: { alignItems: 'center', width: '22%' },
    funnelBarValue: { fontSize: 12, fontWeight: '900', color: '#0f172a', marginBottom: 4 },
    funnelBarTrack: { width: '100%', flex: 1, backgroundColor: '#e2e8f0', borderRadius: 4, justifyContent: 'flex-end' },
    funnelBarFill: { width: '100%', borderRadius: 4 },
    funnelBarLabel: { fontSize: 10, fontWeight: '700', color: '#64748b', marginTop: 8, textAlign: 'center' },

    // Employee 
    smartMatchCard: { backgroundColor: '#eef2ff', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#e0e7ff', marginBottom: 24 },
    smartMatchHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    smartMatchTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    smartMatchTitle: { fontSize: 14, fontWeight: '900', color: '#3730a3' },
    explainBtn: { backgroundColor: '#9333ea', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
    explainBtnText: { fontSize: 10, fontWeight: 'bold', color: '#fff' },
    smartMatchText: { fontSize: 13, lineHeight: 20, color: '#3730a3' },

    companySection: { marginBottom: 24 },
    sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 12 },
    viewProfileText: { fontSize: 12, fontWeight: 'bold', color: '#9333ea', marginBottom: 2 },
    companyCard: { backgroundColor: '#fff', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', flexDirection: 'row', gap: 16 },
    companyLogo: { width: 48, height: 48, borderRadius: 12 },
    companyDesc: { fontSize: 12, color: '#64748b', lineHeight: 18, marginBottom: 8 },
    companyMetaRow: { flexDirection: 'row', gap: 12 },
    companyMetaLabel: { fontSize: 10, fontWeight: 'bold', color: '#94a3b8' },

    similarSection: { marginBottom: 24 },
    similarScroll: { paddingRight: 20 },
    similarCard: { backgroundColor: '#fff', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', width: 220, marginRight: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 4, elevation: 1 },
    similarCardTitle: { fontSize: 14, fontWeight: 'bold', color: '#0f172a', marginBottom: 2 },
    similarCardCompany: { fontSize: 12, color: '#64748b', marginBottom: 12 },
    similarCardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#f8fafc', paddingTop: 8 },
    similarCardLoc: { fontSize: 11, color: '#94a3b8' },
    similarCardSal: { fontSize: 12, fontWeight: 'bold', color: '#9333ea' },

    // Footer
    footer: { backgroundColor: '#fff', paddingHorizontal: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#f1f5f9', shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 10 },
    applyBtn: { backgroundColor: '#9333ea', paddingVertical: 16, borderRadius: 16, alignItems: 'center', shadowColor: '#9333ea', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
    applyBtnApplied: { backgroundColor: '#22c55e', shadowColor: '#22c55e' },
    applyBtnText: { color: '#fff', fontSize: 14, fontWeight: '900', letterSpacing: 1 },
    editJobBtn: { backgroundColor: '#0f172a', paddingVertical: 16, borderRadius: 16, alignItems: 'center' },
    editJobBtnText: { color: '#fff', fontSize: 14, fontWeight: '900', letterSpacing: 1 },
});
