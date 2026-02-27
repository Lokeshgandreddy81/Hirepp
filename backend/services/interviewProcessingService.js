const crypto = require('crypto');
const fs = require('fs');
const AnalyticsEvent = require('../models/AnalyticsEvent');
const InterviewProcessingJob = require('../models/InterviewProcessingJob');
const InterviewSignal = require('../models/InterviewSignal');

const toInterviewRole = (user = {}) => {
    const rawPrimary = String(user.primaryRole || '').toLowerCase();
    if (rawPrimary === 'employer') return 'employer';

    const rawRole = String(user.role || '').toLowerCase();
    return rawRole === 'employer' || rawRole === 'recruiter' ? 'employer' : 'worker';
};

const buildInterviewIdempotencyKey = ({ userId, videoHash }) => {
    return crypto
        .createHash('sha256')
        .update(`${String(userId || '')}:${String(videoHash || '')}`)
        .digest('hex');
};

const computeFileSha256 = async (filePath) => {
    return new Promise((resolve, reject) => {
        const hash = crypto.createHash('sha256');
        const stream = fs.createReadStream(filePath);

        stream.on('error', reject);
        stream.on('data', (chunk) => hash.update(chunk));
        stream.on('end', () => resolve(hash.digest('hex')));
    });
};

let dailyProcessingCountCache = {
    dateKey: null,
    value: 0,
    expiresAt: 0,
};

const getDailyProcessingCount = async () => {
    const now = Date.now();
    const currentDateKey = new Date(now).toISOString().slice(0, 10);

    if (
        dailyProcessingCountCache.expiresAt > now &&
        dailyProcessingCountCache.dateKey === currentDateKey
    ) {
        return dailyProcessingCountCache.value;
    }

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const count = await InterviewProcessingJob.countDocuments({
        createdAt: { $gte: startOfDay },
    });

    dailyProcessingCountCache = {
        dateKey: currentDateKey,
        value: count,
        expiresAt: now + 30_000,
    };

    return count;
};

const transitionProcessingStatus = async ({
    processingId,
    fromStatus,
    toStatus,
    set = {},
    unset = {},
}) => {
    const allowedTransitions = {
        pending: new Set(['processing']),
        processing: new Set(['completed', 'failed']),
        failed: new Set(['pending']),
        completed: new Set(),
    };

    if (!allowedTransitions[fromStatus]?.has(toStatus)) {
        console.warn(`Invalid interview status transition attempted: ${fromStatus} -> ${toStatus}`);
        return { acknowledged: true, matchedCount: 0, modifiedCount: 0 };
    }

    const update = {};
    if (Object.keys(set).length) update.$set = set;
    if (Object.keys(unset).length) update.$unset = unset;

    return InterviewProcessingJob.updateOne(
        { _id: processingId, status: fromStatus },
        update
    );
};

const trackInterviewEvent = async ({
    userId,
    eventName,
    processingId,
    role,
    durationMs,
    errorType,
}) => {
    if (!eventName) return;

    try {
        await AnalyticsEvent.create({
            user: userId || null,
            eventName,
            metadata: {
                processingId: processingId ? String(processingId) : null,
                role: role || null,
                durationMs: Number.isFinite(durationMs) ? durationMs : null,
                errorType: errorType || null,
            },
        });
    } catch (error) {
        console.error('Interview analytics tracking failed:', error.message);
    }
};

const markProfileConfirmed = async ({ processingId, userId }) => {
    if (!processingId) return null;

    return InterviewProcessingJob.findOneAndUpdate(
        { _id: processingId, userId },
        { $set: { profileConfirmedAt: new Date() } },
        { new: true }
    );
};

const markJobConfirmed = async ({ processingId, userId }) => {
    if (!processingId) return null;

    return InterviewProcessingJob.findOneAndUpdate(
        { _id: processingId, userId },
        { $set: { jobConfirmedAt: new Date() } },
        { new: true }
    );
};

const finalizeInterviewSignalIfEligible = async ({ processingId, userId }) => {
    if (!processingId) return { finalized: false, reason: 'missing_processing_id' };

    const job = await InterviewProcessingJob.findOne({ _id: processingId, userId });
    if (!job) return { finalized: false, reason: 'processing_not_found' };
    if (job.status !== 'completed') return { finalized: false, reason: 'processing_not_completed' };
    if (job.signalFinalizedAt) return { finalized: true, reason: 'already_finalized' };

    const needsJobConfirmation = job.role === 'employer';
    if (!job.profileConfirmedAt) return { finalized: false, reason: 'profile_not_confirmed' };
    if (needsJobConfirmation && !job.jobConfirmedAt) return { finalized: false, reason: 'job_not_confirmed' };

    await InterviewSignal.findOneAndUpdate(
        { processingId: job._id },
        {
            $setOnInsert: {
                userId: job.userId,
                role: job.role,
                processingId: job._id,
                videoDuration: job.rawMetrics?.videoDuration ?? null,
                transcriptWordCount: job.rawMetrics?.transcriptWordCount ?? null,
                confidenceScore: job.rawMetrics?.confidenceScore ?? null,
            },
        },
        { upsert: true, new: true }
    );

    await InterviewProcessingJob.updateOne(
        { _id: job._id, signalFinalizedAt: null },
        { $set: { signalFinalizedAt: new Date() } }
    );

    return { finalized: true, reason: 'created' };
};

module.exports = {
    toInterviewRole,
    buildInterviewIdempotencyKey,
    computeFileSha256,
    getDailyProcessingCount,
    transitionProcessingStatus,
    trackInterviewEvent,
    markProfileConfirmed,
    markJobConfirmed,
    finalizeInterviewSignalIfEligible,
};
