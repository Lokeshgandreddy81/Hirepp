import React, { memo, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity } from 'react-native';
import { IconAward, IconBookOpen, IconSparkles } from '../../../components/Icons';
import MentorCard from './MentorCard';
import { theme, RADIUS } from '../../../theme/theme';

const FALLBACK_COURSES = [
    { id: 1, title: 'Safe Driving on Highways', instructor: 'Rajiv Menon', duration: '3h 20m', level: 'Beginner', enrolled: 1420, rating: 4.8, thumb: 'https://picsum.photos/id/1076/200/120' },
    { id: 2, title: 'Electrical Safety at Work Sites', instructor: 'Kavya Srinivas', duration: '2h 05m', level: 'Intermediate', enrolled: 890, rating: 4.6, thumb: 'https://picsum.photos/id/160/200/120' },
    { id: 3, title: 'Inventory Management Basics', instructor: 'Anand Rao', duration: '1h 45m', level: 'Beginner', enrolled: 2100, rating: 4.7, thumb: 'https://picsum.photos/id/180/200/120' },
];

const getLevelStyle = (level) => {
    if (level === 'Beginner') {
        return {
            badge: styles.levelBeginnerBg,
            text: styles.levelBeginnerText,
        };
    }

    if (level === 'Intermediate') {
        return {
            badge: styles.levelIntermediateBg,
            text: styles.levelIntermediateText,
        };
    }

    return {
        badge: styles.levelAdvancedBg,
        text: styles.levelAdvancedText,
    };
};

function CourseCardComponent({ course, isEnrolled, onEnrollCourse }) {
    const handleEnroll = useCallback(() => {
        if (!isEnrolled) {
            onEnrollCourse(course.id);
        }
    }, [isEnrolled, onEnrollCourse, course.id]);

    const levelStyle = useMemo(() => getLevelStyle(course.level), [course.level]);
    const enrollButtonStyle = useMemo(() => [
        styles.actionButton,
        isEnrolled && styles.actionButtonDone,
    ], [isEnrolled]);

    const enrollButtonTextStyle = useMemo(() => [
        styles.actionButtonText,
        isEnrolled && styles.actionButtonTextDone,
    ], [isEnrolled]);

    return (
        <View style={styles.courseCard}>
            <Image source={{ uri: course.thumb }} style={styles.courseThumb} />
            <View style={styles.courseContent}>
                <View style={styles.courseHeaderRow}>
                    <Text style={styles.courseTitle}>{course.title}</Text>
                    <View style={[styles.levelBadge, levelStyle.badge]}>
                        <Text style={[styles.levelBadgeText, levelStyle.text]}>{course.level.toUpperCase()}</Text>
                    </View>
                </View>
                <Text style={styles.courseInstructor}>{course.instructor} · {course.duration}</Text>
                <View style={styles.courseFooterRow}>
                    <Text style={styles.courseMeta}>⭐ {course.rating} · {course.enrolled.toLocaleString()} enrolled</Text>
                    <TouchableOpacity
                        style={enrollButtonStyle}
                        onPress={handleEnroll}
                        disabled={isEnrolled}
                    >
                        <Text style={enrollButtonTextStyle}>{isEnrolled ? 'ENROLLED ✓' : 'START'}</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

const CourseCard = memo(CourseCardComponent);

function AcademyTabComponent({
    academyCourses,
    enrolledCourses,
    enrolledCourseIds,
    mentors,
    connectedMentorIds,
    onEnrollCourse,
    onConnectMentor,
    contentContainerStyle,
}) {
    const courses = useMemo(() => {
        if (academyCourses.length === 0) {
            return FALLBACK_COURSES;
        }

        return academyCourses.map((course, index) => ({
            id: course.id,
            title: course.title,
            instructor: 'HireCircle Academy',
            duration: course.duration || '2h',
            level: course.level ? `${course.level.charAt(0).toUpperCase()}${course.level.slice(1)}` : 'Beginner',
            enrolled: enrolledCourses.filter((item) => item.courseId === course.id).length || 0,
            rating: 4.7,
            thumb: `https://picsum.photos/id/${160 + index}/200/120`,
        }));
    }, [academyCourses, enrolledCourses]);

    const totalCourses = courses.length + 5;
    const doneCourses = enrolledCourseIds.size + 2;
    const progressPct = useMemo(() => Math.round((doneCourses / totalCourses) * 100), [doneCourses, totalCourses]);
    const karmaEarned = useMemo(() => (enrolledCourseIds.size * 120) + 240, [enrolledCourseIds]);
    const progressFillStyle = useMemo(() => [styles.progressFill, { width: `${progressPct}%` }], [progressPct]);

    const isCourseEnrolled = useCallback((courseId) => (
        enrolledCourseIds.has(courseId)
    ), [enrolledCourseIds]);

    const isMentorConnected = useCallback((mentorId) => (
        connectedMentorIds.has(mentorId)
    ), [connectedMentorIds]);

    const courseCards = useMemo(() => (
        courses.map((item) => (
            <CourseCard
                key={item.id}
                course={item}
                isEnrolled={isCourseEnrolled(item.id)}
                onEnrollCourse={onEnrollCourse}
            />
        ))
    ), [courses, isCourseEnrolled, onEnrollCourse]);

    const mentorCards = useMemo(() => (
        mentors.map((item) => (
            <MentorCard
                key={item.id}
                mentor={item}
                isConnected={isMentorConnected(item.id)}
                onConnect={onConnectMentor}
            />
        ))
    ), [mentors, isMentorConnected, onConnectMentor]);

    return (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={contentContainerStyle}>
            <View style={styles.academyCard}>
                <View style={styles.headerRow}>
                    <IconBookOpen size={16} color={theme.primary} />
                    <Text style={styles.headerTitle}>MY LEARNING</Text>
                    <View style={styles.karmaBadge}>
                        <Text style={styles.karmaText}>+{karmaEarned} KARMA</Text>
                    </View>
                </View>
                <View style={styles.progressHeaderRow}>
                    <Text style={styles.progressCaption}>{doneCourses} / {totalCourses} Courses</Text>
                    <Text style={styles.progressPercent}>{progressPct}%</Text>
                </View>
                <View style={styles.progressTrack}>
                    <View style={progressFillStyle} />
                </View>
                <Text style={styles.progressSubcopy}>2 courses in progress · Next: Forklift Certification</Text>
            </View>

            <View style={styles.sectionHeaderRow}>
                <IconAward size={16} color={theme.primary} />
                <Text style={styles.sectionTitle}>TOP COURSES FOR YOU</Text>
            </View>

            {courseCards}

            <View style={styles.academyCard}>
                <View style={styles.headerRow}>
                    <IconSparkles size={16} color={theme.primary} />
                    <Text style={styles.headerTitle}>AI MENTOR MATCH</Text>
                </View>
                {mentorCards}
            </View>

            <View style={styles.bottomSpace} />
        </ScrollView>
    );
}

export default memo(AcademyTabComponent);

const styles = StyleSheet.create({
    academyCard: {
        backgroundColor: theme.surface,
        borderRadius: RADIUS.xl,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: theme.borderMedium,
        shadowColor: theme.textPrimary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 16,
    },
    headerTitle: {
        fontSize: 12,
        fontWeight: '900',
        color: theme.textPrimary,
    },
    karmaBadge: {
        marginLeft: 'auto',
        backgroundColor: theme.primaryLight,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: RADIUS.md,
    },
    karmaText: {
        fontSize: 10,
        fontWeight: '900',
        color: theme.primary,
    },
    progressHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 6,
    },
    progressCaption: {
        fontSize: 11,
        fontWeight: '700',
        color: theme.textSecondary,
    },
    progressPercent: {
        fontSize: 12,
        fontWeight: '900',
        color: theme.textPrimary,
    },
    progressTrack: {
        height: 6,
        backgroundColor: theme.primaryLight,
        borderRadius: RADIUS.sm,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: theme.primary,
        borderRadius: RADIUS.sm,
    },
    progressSubcopy: {
        fontSize: 10,
        color: theme.textMuted,
        marginTop: 6,
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        gap: 8,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: '900',
        color: theme.textPrimary,
        letterSpacing: 1,
    },
    courseCard: {
        backgroundColor: theme.surface,
        borderRadius: RADIUS.xl,
        padding: 14,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: theme.borderMedium,
        flexDirection: 'row',
        gap: 12,
        alignItems: 'flex-start',
        shadowColor: theme.textPrimary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    courseThumb: {
        width: 90,
        height: 64,
        borderRadius: RADIUS.md,
        backgroundColor: theme.borderMedium,
    },
    courseContent: {
        flex: 1,
        minWidth: 0,
    },
    courseHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 2,
        gap: 4,
    },
    courseTitle: {
        flex: 1,
        fontSize: 13,
        fontWeight: '900',
        color: theme.textPrimary,
    },
    levelBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: RADIUS.sm,
    },
    levelBadgeText: {
        fontSize: 10,
        fontWeight: '800',
    },
    levelBeginnerBg: {
        backgroundColor: theme.border,
    },
    levelBeginnerText: {
        color: theme.success,
    },
    levelIntermediateBg: {
        backgroundColor: theme.primaryLight,
    },
    levelIntermediateText: {
        color: theme.warning,
    },
    levelAdvancedBg: {
        backgroundColor: theme.chatBackground,
    },
    levelAdvancedText: {
        color: theme.primaryDark,
    },
    courseInstructor: {
        fontSize: 10,
        fontWeight: '700',
        color: theme.textMuted,
        marginTop: 2,
    },
    courseFooterRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 6,
    },
    courseMeta: {
        fontSize: 10,
        color: theme.textMuted,
        fontWeight: '600',
        flex: 1,
        marginRight: 12,
    },
    actionButton: {
        backgroundColor: theme.darkCard,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: RADIUS.md,
    },
    actionButtonDone: {
        backgroundColor: theme.primaryLight,
    },
    actionButtonText: {
        fontSize: 10,
        fontWeight: '900',
        color: theme.surface,
    },
    actionButtonTextDone: {
        color: theme.primary,
    },
    bottomSpace: {
        height: 32,
    },
});
