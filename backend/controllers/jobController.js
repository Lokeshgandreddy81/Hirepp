const Job = require('../models/Job');
const WorkerProfile = require('../models/WorkerProfile');
const User = require('../models/userModel');
const MatchRun = require('../models/MatchRun');
const MatchLog = require('../models/MatchLog');
const mongoose = require('mongoose');
const { suggestJobRequirements } = require('../services/geminiService');
const redisClient = require('../config/redis');
const { matchCache } = require('./matchingController');
const UpsellExposure = require('../models/UpsellExposure');
const matchEngineV2 = require('../match/matchEngineV2');
const { scoreSinglePair } = require('../match/matchProbabilistic');
const InterviewProcessingJob = require('../models/InterviewProcessingJob');
const {
    markJobConfirmed,
    finalizeInterviewSignalIfEligible,
} = require('../services/interviewProcessingService');
const { publishMetric } = require('../services/metricsService');
const {
    fireAndForget,
    markFirstJobActivatedOnce,
    createAnalyticsEvent,
} = require('../services/revenueInstrumentationService');
const {
    recordJobFillCompletedOnce,
    recordMatchPerformanceMetric,
} = require('../services/matchMetricsService');

const logRecommendedRun = async ({
    userId,
    workerId,
    stats = {},
    rows = [],
    modelVersionUsed = null,
    metadata = {},
}) => {
    try {
        const run = await MatchRun.create({
            contextType: 'RECOMMENDED_JOBS',
            userId,
            workerId,
            modelVersionUsed,
            totalJobsConsidered: Number(stats.totalConsidered || 0),
            totalMatchesReturned: Number(stats.totalReturned || 0),
            avgScore: Number(stats.avgScore || 0),
            rejectReasonCounts: stats.rejectReasonCounts || {},
            metadata,
        });

        if (rows.length) {
            await MatchLog.insertMany(rows.map((row) => ({
                matchRunId: run._id,
                workerId,
                jobId: row.job?._id || null,
                finalScore: Number(row.matchProbability ?? row.finalScore ?? 0),
                tier: row.tier || 'REJECT',
                accepted: true,
                explainability: row.explainability || {},
                matchModelVersionUsed: row.matchModelVersionUsed || modelVersionUsed || null,
            })), { ordered: false });
        }
    } catch (error) {
        console.error('Recommended jobs logging failed:', error.message);
    }
};

const extractSalaryBounds = (job) => {
    const minSalary = Number(job?.minSalary);
    const maxSalary = Number(job?.maxSalary);
    if (Number.isFinite(minSalary) || Number.isFinite(maxSalary)) {
        return {
            min: Number.isFinite(minSalary) ? minSalary : null,
            max: Number.isFinite(maxSalary) ? maxSalary : null,
        };
    }

    const numbers = String(job?.salaryRange || '')
        .match(/\d[\d,]*/g);
    if (!numbers || !numbers.length) return { min: null, max: null };

    const parsed = numbers
        .map((item) => Number(String(item).replace(/,/g, '')))
        .filter((value) => Number.isFinite(value));
    if (!parsed.length) return { min: null, max: null };

    return {
        min: Math.min(...parsed),
        max: Math.max(...parsed),
    };
};

const tierThresholdMap = {
    STRONG: 0.82,
    GOOD: 0.70,
    POSSIBLE: 0.62,
};

// @desc    Create a new job
// @route   POST /api/jobs/
// @access  Protected
const createJob = async (req, res) => {
    const { title, companyName, salaryRange, location, requirements, screeningQuestions, minSalary, maxSalary, shift, mandatoryLicenses, isPulse } = req.body;

    try {
        const job = await Job.create({
            employerId: req.user._id,
            title,
            companyName,
            salaryRange,
            location,
            requirements: requirements || [],
            screeningQuestions: screeningQuestions || [],
            minSalary,
            maxSalary,
            shift: shift || 'Flexible',
            mandatoryLicenses: mandatoryLicenses || [],
            isPulse: Boolean(isPulse),
        });

        res.status(201).json({
            success: true,
            data: job,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Get all jobs posted by the logged-in employer
// @route   GET /api/jobs/my-jobs
// @access  Protected
const getEmployerJobs = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        const jobs = await Job.find({ employerId: req.user._id })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await Job.countDocuments({ employerId: req.user._id });

        res.status(200).json({
            success: true,
            count: jobs.length,
            total,
            page,
            pages: Math.ceil(total / limit),
            data: jobs,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Get jobs with optional filters (companyId)
// @route   GET /api/jobs
// @access  Protected
const getJobs = async (req, res) => {
    try {
        const { companyId } = req.query;
        const query = {};

        if (companyId) {
            const companyFilters = [];
            if (mongoose.Types.ObjectId.isValid(companyId)) {
                companyFilters.push({ employerId: companyId });
            }
            companyFilters.push({ companyName: companyId });
            query.$or = companyFilters;
            query.status = 'active';
        } else {
            query.isOpen = true;
            query.status = 'active';
        }

        const jobs = await Job.find(query).sort({ createdAt: -1 }).limit(100);
        res.status(200).json({
            success: true,
            count: jobs.length,
            data: jobs,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// @desc    Get AI-suggested requirements for a job title
// @route   POST /api/jobs/suggest
// @access  Protected
const suggestRequirements = async (req, res) => {
    const { jobTitle } = req.body;

    if (!jobTitle) {
        return res.status(400).json({
            success: false,
            message: 'Please provide a job title'
        });
    }

    try {
        const suggestions = await suggestJobRequirements(jobTitle);

        res.status(200).json({
            success: true,
            data: suggestions,
        });
    } catch (error) {
        console.error('AI Suggestion Error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to generate AI suggestions'
        });
    }
};

// Helper: Clear all match cache entries for a specific job (prevent ghost matches)
const clearJobMatches = async (jobId) => {
    let totalDeleted = 0;

    try {
        // Clear from Redis
        if (redisClient && redisClient.isOpen) {
            const pattern = `match:${jobId}:*`;
            console.log(`🗑️ [CLEANUP] Scanning Redis for pattern: ${pattern}`);

            const keys = await redisClient.keys(pattern);
            if (keys.length > 0) {
                await redisClient.del(keys);
                totalDeleted += keys.length;
                console.log(`✅ [CLEANUP] Deleted ${keys.length} Redis cache entries`);
            } else {
                console.log(`ℹ️ [CLEANUP] No Redis cache entries found for job ${jobId}`);
            }
        }
    } catch (redisError) {
        console.error('❌ [CLEANUP REDIS ERROR]:', redisError.message);
        // Don't throw - continue to Map cleanup
    }

    try {
        // Clear from Map fallback
        if (matchCache) {
            let mapDeletedCount = 0;
            for (const [key, value] of matchCache.entries()) {
                if (key.startsWith(`match:${jobId}:`)) {
                    matchCache.delete(key);
                    mapDeletedCount++;
                }
            }
            if (mapDeletedCount > 0) {
                totalDeleted += mapDeletedCount;
                console.log(`✅ [CLEANUP] Deleted ${mapDeletedCount} Map cache entries`);
            }
        }
    } catch (mapError) {
        console.error('❌ [CLEANUP MAP ERROR]:', mapError.message);
        // Don't throw - cache cleanup failure shouldn't block job deletion
    }

    console.log(`🎯 [CLEANUP COMPLETE] Total cache entries cleared: ${totalDeleted}`);
    return totalDeleted;
};

// @desc    Delete a job
// @route   DELETE /api/jobs/:id
// @access  Protected
const deleteJob = async (req, res) => {
    try {
        const job = await Job.findById(req.params.id);

        if (!job) {
            return res.status(404).json({ success: false, message: 'Job not found' });
        }

        // Verify ownership
        if (job.employerId.toString() !== req.user._id.toString()) {
            return res.status(401).json({ success: false, message: 'Not authorized' });
        }

        // CRITICAL: Clear all cached matches for this job BEFORE deletion
        console.log(`🗑️ [JOB DELETE] Clearing all matches for job ${job._id}...`);
        const deletedCount = await clearJobMatches(job._id);

        await job.deleteOne();

        res.status(200).json({
            success: true,
            message: 'Job and all associated matches deleted successfully',
            cacheEntriesCleared: deletedCount
        });
    } catch (error) {
        console.error('❌ [JOB DELETE ERROR]:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Update a job
// @route   PUT /api/jobs/:id
// @access  Protected
const updateJob = async (req, res) => {
    try {
        let job = await Job.findById(req.params.id);

        if (!job) {
            return res.status(404).json({ success: false, message: 'Job not found' });
        }

        // Verify ownership
        if (job.employerId.toString() !== req.user._id.toString()) {
            return res.status(401).json({ success: false, message: 'Not authorized' });
        }

        const previousStatus = String(job.status || '').toLowerCase();

        // Allowed fields to update
        const {
            title,
            companyName,
            salaryRange,
            location,
            requirements,
            status: requestedStatus,
            processingId,
        } = req.body;

        job.title = title || job.title;
        job.companyName = companyName || job.companyName;
        job.salaryRange = salaryRange || job.salaryRange;
        job.location = location || job.location;

        // Handle requirements array from string or array
        if (requirements) {
            job.requirements = Array.isArray(requirements)
                ? requirements
                : requirements.split(',').map(s => s.trim());
        }

        if (requestedStatus) {
            const normalizedStatus = String(requestedStatus).toLowerCase();
            if (!['draft_from_ai', 'active', 'closed'].includes(normalizedStatus)) {
                return res.status(400).json({ success: false, message: 'Invalid job status value' });
            }

            // Guard draft activation from Smart Interview flow
            if (normalizedStatus === 'active' && processingId) {
                const processingJob = await InterviewProcessingJob.findOne({
                    _id: processingId,
                    userId: req.user._id,
                    status: 'completed',
                }).select('createdJobId');

                if (!processingJob) {
                    return res.status(400).json({ success: false, message: 'Invalid processing reference' });
                }

                if (String(processingJob.createdJobId || '') !== String(job._id)) {
                    return res.status(400).json({ success: false, message: 'Processing job does not match this draft job' });
                }
            }

            job.status = normalizedStatus;
            job.isOpen = normalizedStatus === 'active';
        }

        const updatedJob = await job.save();
        const nextStatus = String(updatedJob.status || '').toLowerCase();
        if (previousStatus !== 'active' && nextStatus === 'active') {
            fireAndForget('markFirstJobActivatedOnce', () => markFirstJobActivatedOnce({
                employerId: req.user._id,
                jobId: updatedJob._id,
                city: updatedJob.location || null,
            }), { employerId: String(req.user._id), jobId: String(updatedJob._id) });
        }
        if (previousStatus === 'active' && nextStatus === 'closed') {
            fireAndForget('recordJobFillCompletedMetric', () => recordJobFillCompletedOnce({
                jobId: updatedJob._id,
                city: updatedJob.location || 'unknown',
                roleCluster: updatedJob.title || 'general',
                metadata: {
                    source: 'job_controller',
                    triggerStatus: 'closed',
                    employerId: String(req.user._id),
                },
            }), { employerId: String(req.user._id), jobId: String(updatedJob._id) });
        }

        let signalFinalized = false;
        if (processingId && String(updatedJob.status) === 'active') {
            await markJobConfirmed({ processingId, userId: req.user._id });
            const finalizeResult = await finalizeInterviewSignalIfEligible({
                processingId,
                userId: req.user._id,
            });
            signalFinalized = Boolean(finalizeResult?.finalized);

            const [draftCount, confirmedCount] = await Promise.all([
                InterviewProcessingJob.countDocuments({
                    userId: req.user._id,
                    role: 'employer',
                    createdJobId: { $ne: null },
                }),
                InterviewProcessingJob.countDocuments({
                    userId: req.user._id,
                    role: 'employer',
                    createdJobId: { $ne: null },
                    jobConfirmedAt: { $ne: null },
                }),
            ]);
            console.log(JSON.stringify({
                metric: 'draft_job_confirmed',
                processingId: String(processingId),
                jobId: String(updatedJob._id),
                signalFinalized,
                correlationId: String(processingId),
            }));
            console.log(JSON.stringify({
                metric: 'draft_to_confirm_ratio',
                value: confirmedCount / Math.max(1, draftCount),
                confirmedCount,
                draftCount,
                correlationId: String(processingId),
            }));
            await publishMetric({
                metricName: 'DraftToConfirmRatio',
                value: confirmedCount / Math.max(1, draftCount),
                role: 'employer',
                correlationId: String(processingId),
            });
        }

        res.status(200).json({ success: true, data: updatedJob, signalFinalized });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get recommended jobs for a worker profile
// @route   GET /api/jobs/recommended
// @access  Protected
const getRecommendedJobs = async (req, res) => {
    try {
        const cityFilter = String(req.query.city || '').trim();
        const roleClusterFilter = String(req.query.roleCluster || '').trim();
        const requestedWorkerId = String(req.query.workerId || '').trim();
        const includePreferences = ['true', '1', 'yes', 'on'].includes(String(req.query.preferences || '').toLowerCase());
        const isAdmin = Boolean(req.user?.isAdmin);

        let worker = null;
        if (requestedWorkerId) {
            worker = await WorkerProfile.findById(requestedWorkerId)
                .populate('user', 'isVerified hasCompletedProfile')
                .lean();

            if (!worker) {
                worker = await WorkerProfile.findOne({ user: requestedWorkerId })
                    .populate('user', 'isVerified hasCompletedProfile')
                    .lean();
            }
        } else {
            worker = await WorkerProfile.findOne({ user: req.user._id })
                .populate('user', 'isVerified hasCompletedProfile')
                .lean();
        }

        if (!worker) {
            return res.status(404).json({ message: 'Worker profile not found' });
        }

        const workerOwnerId = String(worker.user?._id || worker.user || '');
        if (requestedWorkerId && !isAdmin && workerOwnerId !== String(req.user._id)) {
            return res.status(403).json({ message: 'Not authorized for requested workerId' });
        }

        if (!worker.isAvailable || !Array.isArray(worker.roleProfiles) || worker.roleProfiles.length === 0) {
            return res.json({ recommendedJobs: [] });
        }

        const workerUser = worker.user?._id
            ? worker.user
            : await User.findById(workerOwnerId).select('isVerified hasCompletedProfile').lean();
        const matchPreferences = includePreferences ? (worker.settings?.matchPreferences || {}) : {};

        const query = {
            isOpen: true,
            status: 'active',
            employerId: { $ne: workerOwnerId || req.user._id },
        };

        if (cityFilter) {
            query.location = new RegExp(`^${cityFilter}$`, 'i');
        }

        if (roleClusterFilter) {
            query.title = new RegExp(roleClusterFilter, 'i');
        }

        if (includePreferences && !roleClusterFilter) {
            const preferredRoleClusters = Array.isArray(matchPreferences.roleClusters)
                ? matchPreferences.roleClusters.filter(Boolean)
                : [];
            if (preferredRoleClusters.length) {
                query.$or = preferredRoleClusters.map((roleCluster) => ({
                    title: new RegExp(String(roleCluster), 'i'),
                }));
            }
        }

        if (includePreferences) {
            const shiftPreferences = Array.isArray(matchPreferences.preferredShiftTimes)
                ? matchPreferences.preferredShiftTimes.filter(Boolean)
                : [];
            if (shiftPreferences.length) {
                query.shift = { $in: shiftPreferences };
            }

            const maxCommuteDistanceKm = Number(matchPreferences.maxCommuteDistanceKm || 0);
            if (!cityFilter && maxCommuteDistanceKm > 0 && maxCommuteDistanceKm <= 15 && worker.city) {
                query.location = new RegExp(`^${String(worker.city).trim()}$`, 'i');
            }
        }

        let jobs = await Job.find(query)
            .sort({ createdAt: -1 })
            .limit(5000)
            .lean();

        if (includePreferences) {
            const salaryMin = Number(matchPreferences.salaryExpectationMin);
            const salaryMax = Number(matchPreferences.salaryExpectationMax);
            const hasSalaryMin = Number.isFinite(salaryMin) && salaryMin > 0;
            const hasSalaryMax = Number.isFinite(salaryMax) && salaryMax > 0;
            if (hasSalaryMin || hasSalaryMax) {
                jobs = jobs.filter((job) => {
                    const bounds = extractSalaryBounds(job);
                    if (!Number.isFinite(bounds.min) && !Number.isFinite(bounds.max)) return true;

                    if (hasSalaryMin && Number.isFinite(bounds.max) && bounds.max < salaryMin) return false;
                    if (hasSalaryMax && Number.isFinite(bounds.min) && bounds.min > salaryMax) return false;
                    return true;
                });
            }
        }

        const deterministic = matchEngineV2.rankJobsForWorker({
            worker,
            workerUser: workerUser || {},
            jobs,
            roleCluster: roleClusterFilter || null,
            maxResults: 300,
        });

        const scored = [];
        let matchModelVersionUsed = null;

        for (const row of deterministic.matches) {
            const probabilistic = await scoreSinglePair({
                worker,
                workerUser: workerUser || {},
                job: row.job,
                roleData: row.roleData,
                deterministicScores: row.deterministicScores,
            });

            if (probabilistic.fallbackUsed) {
                scored.push({
                    ...row,
                    matchProbability: row.finalScore,
                    tier: row.tier,
                    tierLabel: row.tierLabel,
                    matchModelVersionUsed: probabilistic.modelVersionUsed,
                    explainability: {
                        ...(row.explainability || {}),
                        matchProbability: row.finalScore,
                    },
                });
                continue;
            }

            matchModelVersionUsed = probabilistic.modelVersionUsed;
            if (probabilistic.tier === 'REJECT') continue;

            scored.push({
                ...row,
                finalScore: probabilistic.matchProbability,
                matchScore: Math.round(probabilistic.matchProbability * 100),
                matchProbability: probabilistic.matchProbability,
                tier: probabilistic.tier,
                tierLabel: probabilistic.tierLabel,
                matchModelVersionUsed: probabilistic.modelVersionUsed,
                explainability: {
                    ...(row.explainability || {}),
                    ...(probabilistic.explainability || {}),
                },
            });
        }

        scored.sort(matchEngineV2.sortScoredMatches);
        const minTier = String(matchPreferences.minimumMatchTier || 'POSSIBLE').toUpperCase();
        const minThreshold = includePreferences
            ? (tierThresholdMap[minTier] || tierThresholdMap.POSSIBLE)
            : tierThresholdMap.POSSIBLE;
        const topRows = scored.filter((row) => (row.matchProbability ?? row.finalScore) >= minThreshold).slice(0, 20);

        const responseRows = topRows.map((row) => ({
            job: row.job,
            matchScore: row.matchScore,
            matchProbability: row.matchProbability ?? row.finalScore,
            tier: row.tier,
            tierLabel: row.tierLabel || matchEngineV2.toLegacyTierLabel(row.tier),
            matchModelVersionUsed: row.matchModelVersionUsed || matchModelVersionUsed,
            explainability: row.explainability || {},
        }));

        setImmediate(() => {
            logRecommendedRun({
                userId: req.user._id,
                workerId: worker._id,
                stats: {
                    ...deterministic,
                    totalReturned: responseRows.length,
                    avgScore: responseRows.length
                        ? responseRows.reduce((sum, item) => sum + Number(item.matchProbability || 0), 0) / responseRows.length
                        : 0,
                },
                rows: responseRows,
                modelVersionUsed: matchModelVersionUsed,
                metadata: {
                    correlationId: `recommended-${req.user._id}-${worker._id}-${Date.now()}`,
                    cityFilter: cityFilter || null,
                    roleClusterFilter: roleClusterFilter || null,
                },
            });
            Promise.all(responseRows.map((row) => recordMatchPerformanceMetric({
                eventName: 'MATCH_RECOMMENDATION_VIEWED',
                jobId: row.job?._id,
                workerId: worker._id,
                city: row.job?.location || cityFilter || worker.city || 'unknown',
                roleCluster: row.job?.title || roleClusterFilter || 'general',
                matchProbability: row.matchProbability,
                matchTier: row.tier,
                modelVersionUsed: row.matchModelVersionUsed || matchModelVersionUsed || null,
                timestamp: new Date(),
                metadata: {
                    source: 'recommended_jobs_endpoint',
                    userId: String(req.user._id),
                },
            }))).catch((metricError) => {
                console.warn('Recommended match metric collection failed:', metricError.message);
            });
        });

        return res.json({
            recommendedJobs: responseRows,
            matchModelVersionUsed,
            appliedPreferences: includePreferences ? matchPreferences : null,
        });
    } catch (error) {
        console.error('Recommended jobs failed:', error);
        return res.status(500).json({ message: 'Failed to fetch recommended jobs' });
    }
};

// @desc    Record one-time boost upsell exposure for employer job
// @route   POST /api/jobs/:id/boost-upsell-exposure
// @access  Protected (Employer owner)
const recordBoostUpsellExposure = async (req, res) => {
    try {
        const job = await Job.findById(req.params.id).select('_id employerId location');
        if (!job) {
            return res.status(404).json({ success: false, message: 'Job not found' });
        }

        if (String(job.employerId) !== String(req.user._id)) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        const exposureType = 'smart_interview_post_confirm';
        const result = await UpsellExposure.updateOne(
            { employerId: req.user._id, jobId: job._id, type: exposureType },
            {
                $setOnInsert: {
                    employerId: req.user._id,
                    jobId: job._id,
                    type: exposureType,
                    shownAt: new Date(),
                },
            },
            { upsert: true }
        );

        const shouldShow = Boolean(result?.upsertedCount);
        if (shouldShow) {
            fireAndForget('trackBoostUpsellShown', () => createAnalyticsEvent({
                userId: req.user._id,
                eventName: 'EMPLOYER_BOOST_UPSELL_SHOWN',
                metadata: {
                    jobId: String(job._id),
                    city: job.location || null,
                },
            }), { employerId: String(req.user._id), jobId: String(job._id) });
        }

        return res.status(200).json({
            success: true,
            shouldShow,
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    createJob,
    getJobs,
    getEmployerJobs,
    getRecommendedJobs,
    suggestRequirements,
    deleteJob,
    updateJob,
    recordBoostUpsellExposure,
    clearJobMatches // Export for testing
};
