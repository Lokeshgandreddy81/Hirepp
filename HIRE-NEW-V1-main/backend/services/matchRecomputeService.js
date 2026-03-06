const Job = require('../models/Job');
const Application = require('../models/Application');
const WorkerProfile = require('../models/WorkerProfile');
const { delByPattern } = require('./cacheService');

const clearMatchRelatedCaches = async () => {
    await Promise.all([
        delByPattern('cache:jobs:*'),
        delByPattern('cache:jobs:list:*'),
        delByPattern('cache:analytics:employer-summary:*'),
    ]);
};

const recompute_matches_for_user = async ({
    userId = null,
    workerId = null,
    reason = 'manual',
} = {}) => {
    let workerProfile = null;
    if (workerId) {
        workerProfile = await WorkerProfile.findById(workerId).select('_id user').lean();
    }
    if (!workerProfile && userId) {
        workerProfile = await WorkerProfile.findOne({ user: userId }).select('_id user').lean();
    }
    if (!workerProfile) {
        return {
            recomputed: false,
            reason: 'WORKER_PROFILE_NOT_FOUND',
        };
    }

    await clearMatchRelatedCaches();
    const openJobsCount = await Job.countDocuments({
        status: 'OPEN',
        isOpen: true,
        isDisabled: { $ne: true },
    });

    return {
        recomputed: true,
        reason,
        userId: String(workerProfile.user || userId || ''),
        workerId: String(workerProfile._id),
        openJobsCount: Number(openJobsCount || 0),
        recomputedAt: new Date().toISOString(),
    };
};

const recompute_candidates_for_job = async ({
    jobId,
    employerId = null,
    reason = 'manual',
} = {}) => {
    const safeJobId = String(jobId || '').trim();
    if (!safeJobId) {
        return {
            recomputed: false,
            reason: 'JOB_ID_REQUIRED',
        };
    }

    const job = await Job.findById(safeJobId).select('_id employerId status isOpen').lean();
    if (!job) {
        return {
            recomputed: false,
            reason: 'JOB_NOT_FOUND',
            jobId: safeJobId,
        };
    }

    await clearMatchRelatedCaches();

    const linkedApplications = await Application.find({ job: safeJobId }).select('worker').lean();
    const workerIds = Array.from(new Set(
        linkedApplications
            .map((row) => String(row?.worker || '').trim())
            .filter(Boolean)
    ));
    let candidateUserIds = [];
    if (workerIds.length) {
        const workerProfiles = await WorkerProfile.find({ _id: { $in: workerIds } })
            .select('user')
            .lean();
        candidateUserIds = Array.from(new Set(
            workerProfiles
                .map((profile) => String(profile?.user || '').trim())
                .filter(Boolean)
        ));
    }

    return {
        recomputed: true,
        reason,
        jobId: String(job._id),
        employerId: String(employerId || job.employerId || ''),
        status: String(job.status || ''),
        isOpen: Boolean(job.isOpen),
        candidateUserIds,
        recomputedAt: new Date().toISOString(),
    };
};

module.exports = {
    recompute_matches_for_user,
    recompute_candidates_for_job,
};

