const User = require('../models/userModel');
const Notification = require('../models/Notification');
const WorkerProfile = require('../models/WorkerProfile');
const { sendPushNotificationForUser } = require('./pushService');
const { computeWorkerEngagementScore } = require('./workerEngagementService');
const { recalculateUserTrustScore } = require('./trustScoreService');
const { publishMetric } = require('./metricsService');
const { getMetricsSnapshot } = require('./metricsRegistry');
const { getEmployerLockInSummary } = require('./lockInService');
const { buildCacheKey, setJSON, CACHE_TTL_SECONDS } = require('./cacheService');
const { computeAndStoreDailyMetrics } = require('./dailyMetricsService');
const { runLifecycleAutomations } = require('./lifecycleAutomationService');
const { getSocketIoServer } = require('./sessionService');
const {
    recompute_matches_for_user,
    recompute_candidates_for_job,
} = require('./matchRecomputeService');
const sendEmail = require('../utils/sendEmail');

const runNotificationDispatchTask = async (payload = {}) => {
    const userId = String(payload.userId || '').trim();
    if (!userId) return;

    const resolvedRelatedData = (payload?.data && typeof payload.data === 'object' && !Array.isArray(payload.data))
        ? payload.data
        : ((payload?.relatedData && typeof payload.relatedData === 'object' && !Array.isArray(payload.relatedData))
            ? payload.relatedData
            : {});

    const notification = await Notification.create({
        user: userId,
        type: String(payload.notificationType || payload.type || 'status_update'),
        title: String(payload.title || 'Notification'),
        message: String(payload.body || payload.message || ''),
        relatedData: resolvedRelatedData,
        isRead: false,
    }).catch(() => null);

    if (notification) {
        const io = getSocketIoServer();
        const unreadCount = await Notification.countDocuments({ user: userId, isRead: false }).catch(() => null);
        if (io) {
            const realtimePayload = {
                notification: (typeof notification.toObject === 'function') ? notification.toObject() : notification,
                unreadCount: Number.isFinite(Number(unreadCount)) ? Number(unreadCount) : undefined,
            };
            io.to(`user_${userId}`).emit('notification_created', realtimePayload);
            io.to(`user_${userId}`).emit('NOTIFICATION_CREATED', realtimePayload);
        }
    }

    const user = await User.findById(userId).select('pushTokens notificationPreferences');
    if (!user) return;

    await sendPushNotificationForUser(
        user,
        String(payload.title || 'Notification'),
        String(payload.body || payload.message || ''),
        resolvedRelatedData,
        String(payload.pushCategory || payload.eventType || 'generic')
    );
};

const runTrustScoreRecalculationTask = async (payload = {}) => {
    const userId = String(payload.userId || '').trim();
    const workerId = String(payload.workerId || '').trim();
    if (userId) {
        await recalculateUserTrustScore({
            userId,
            reason: String(payload.reason || 'distributed_queue'),
        });
        return;
    }

    if (!workerId) return;
    const worker = await WorkerProfile.findById(workerId).select('user').lean();
    if (worker?.user) {
        await recalculateUserTrustScore({
            userId: worker.user,
            reason: String(payload.reason || 'distributed_queue_worker'),
        });
    } else {
        await computeWorkerEngagementScore({
            workerId,
            upsert: true,
            withNudge: false,
        });
    }
};

const runMetricsAggregationTask = async (payload = {}) => {
    const snapshot = getMetricsSnapshot();
    await publishMetric({
        metricName: 'ApiRequestCount',
        value: Number(snapshot?.totals?.requests || 0),
        role: 'system',
        correlationId: 'metrics-aggregation',
    });
    await publishMetric({
        metricName: 'ApiSlowRequestCount',
        value: Number(snapshot?.totals?.slowRequests || 0),
        role: 'system',
        correlationId: 'metrics-aggregation',
    });
    await computeAndStoreDailyMetrics({
        day: payload.day ? new Date(payload.day) : new Date(),
        source: 'distributed_task',
    });
    await runLifecycleAutomations();
};

const runHeavyAnalyticsQueryTask = async (payload = {}) => {
    const employerId = String(payload.employerId || '').trim();
    if (!employerId) return;

    const summary = await getEmployerLockInSummary({ employerId });
    const cacheKey = buildCacheKey('analytics:employer-summary', { employerId });
    await setJSON(cacheKey, {
        success: true,
        data: summary,
    }, CACHE_TTL_SECONDS.analytics);
};

const runEmailDispatchTask = async (payload = {}) => {
    const email = String(payload.email || '').trim();
    const subject = String(payload.subject || '').trim();
    const message = String(payload.message || '').trim();
    if (!email || !subject || !message) return;

    await sendEmail({
        email,
        subject,
        message,
    });
};

const runMatchRecalculationTask = async (payload = {}) => {
    const scope = String(payload.scope || 'generic');
    const normalizedScope = scope.toLowerCase();
    let result = null;

    if (['worker_profile_activated', 'worker_profile_updated', 'profile_created', 'profile_updated', 'user_profile_updated'].includes(normalizedScope)) {
        result = await recompute_matches_for_user({
            userId: payload.userId || null,
            workerId: payload.workerId || null,
            reason: normalizedScope,
        });
    } else if (['job_created', 'job_updated', 'job_opened', 'job_deleted', 'job_status_opened'].includes(normalizedScope)) {
        result = await recompute_candidates_for_job({
            jobId: payload.jobId,
            employerId: payload.employerId || null,
            reason: normalizedScope,
        });
    } else if (payload.jobId) {
        result = await recompute_candidates_for_job({
            jobId: payload.jobId,
            employerId: payload.employerId || null,
            reason: normalizedScope,
        });
    } else {
        result = await recompute_matches_for_user({
            userId: payload.userId || null,
            workerId: payload.workerId || null,
            reason: normalizedScope,
        });
    }

    const io = getSocketIoServer();
    if (io && result?.recomputed) {
        const rooms = new Set();
        if (result.userId) {
            rooms.add(`user_${String(result.userId)}`);
            rooms.add(`candidate:${String(result.userId)}`);
        }
        if (result.employerId) {
            rooms.add(`user_${String(result.employerId)}`);
            rooms.add(`employer:${String(result.employerId)}`);
        }
        if (Array.isArray(result.candidateUserIds)) {
            for (const candidateUserId of result.candidateUserIds) {
                const safeCandidateUserId = String(candidateUserId || '').trim();
                if (!safeCandidateUserId) continue;
                rooms.add(`user_${safeCandidateUserId}`);
                rooms.add(`candidate:${safeCandidateUserId}`);
            }
        }

        const realtimePayload = {
            scope: normalizedScope,
            jobId: result.jobId || null,
            workerId: result.workerId || null,
            userId: result.userId || null,
            recomputedAt: result.recomputedAt || new Date().toISOString(),
        };
        for (const roomName of rooms) {
            io.to(roomName).emit('MATCH_RECALCULATED', realtimePayload);
            io.to(roomName).emit('match_recalculated', realtimePayload);
            io.to(roomName).emit('NEW_MATCH_AVAILABLE', realtimePayload);
        }
    }

    await publishMetric({
        metricName: 'MatchRecalculationRequested',
        value: 1,
        role: 'system',
        correlationId: `match-recalc-${scope}`,
        dimensions: {
            Scope: scope,
            Recomputed: result?.recomputed ? 'true' : 'false',
        },
    });
};

const runSmartInterviewAiTask = async () => {
    // Smart Interview AI processing already runs on dedicated SQS workers.
    // This handler exists to keep distributed task topology explicit and extensible.
    await publishMetric({
        metricName: 'SmartInterviewAsyncDispatch',
        value: 1,
        role: 'system',
        correlationId: 'smart-interview-async',
    });
};

module.exports = {
    runNotificationDispatchTask,
    runEmailDispatchTask,
    runTrustScoreRecalculationTask,
    runMetricsAggregationTask,
    runHeavyAnalyticsQueryTask,
    runMatchRecalculationTask,
    runSmartInterviewAiTask,
};
