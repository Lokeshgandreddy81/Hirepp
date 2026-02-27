const Job = require('../models/Job');
const Application = require('../models/Application');
const WorkerProfile = require('../models/WorkerProfile');
const User = require('../models/userModel');
const MatchFeedback = require('../models/MatchFeedback');
const MatchRun = require('../models/MatchRun');
const MatchLog = require('../models/MatchLog');

const { createNotification } = require('./notificationController');
const { sendPushNotificationForUser } = require('../services/pushService');
const { explainMatch } = require('../services/geminiService');
const redisClient = require('../config/redis');
const { recordMatchPerformanceMetric } = require('../services/matchMetricsService');

const matchEngineV2 = require('../match/matchEngineV2');
const { scoreSinglePair } = require('../match/matchProbabilistic');

const matchCache = new Map();
const CACHE_TTL_SEC = 604800;

const getCacheKey = (jobId, workerId) => `match:${jobId}:${workerId}`;

const getFromCache = async (key) => {
    try {
        if (redisClient.isOpen) {
            const data = await redisClient.get(key);
            if (data) return JSON.parse(data);
        }
    } catch (error) {
        console.error('❌ [REDIS GET ERROR]:', error.message);
    }

    const cached = matchCache.get(key);
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL_SEC * 1000)) {
        return cached.data;
    }
    return null;
};

const setToCache = async (key, value) => {
    try {
        if (redisClient.isOpen) {
            redisClient.setEx(key, CACHE_TTL_SEC, JSON.stringify(value)).catch((error) => {
                console.error('❌ [REDIS SET ERROR]:', error.message);
            });
            return;
        }
    } catch (error) {
        console.error('❌ [REDIS SET ERROR]:', error.message);
    }

    matchCache.set(key, { data: value, timestamp: Date.now() });
};

const toModelTierLabel = (tier = 'REJECT') => {
    if (tier === 'STRONG') return 'Strong Match';
    if (tier === 'GOOD') return 'Good Match';
    if (tier === 'POSSIBLE') return 'Possible Match';
    return 'Rejected';
};

const isWorkerVisibleToEmployer = (worker) => {
    const prefs = worker?.user?.privacyPreferences || {};
    return prefs.profileVisibleToEmployers !== false;
};

const sanitizeWorkerForEmployer = (worker) => {
    if (!worker || typeof worker !== 'object') return worker;
    const prefs = worker?.user?.privacyPreferences || {};
    const sanitized = {
        ...worker,
        roleProfiles: Array.isArray(worker.roleProfiles)
            ? worker.roleProfiles.map((roleProfile) => ({
                ...roleProfile,
                ...(prefs.showSalaryExpectation === false ? { expectedSalary: null } : {}),
            }))
            : [],
    };

    if (prefs.showInterviewBadge === false) {
        sanitized.interviewVerified = false;
    }

    if (prefs.showLastActive === false) {
        sanitized.lastActiveAt = null;
    }

    if (prefs.allowLocationSharing === false) {
        sanitized.city = null;
    }

    return sanitized;
};

const logMatchRun = async ({
    contextType,
    workerId = null,
    jobId = null,
    userId = null,
    modelVersionUsed = null,
    stats = {},
    rows = [],
    metadata = {},
}) => {
    try {
        const run = await MatchRun.create({
            contextType,
            workerId,
            jobId,
            userId,
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
                workerId: row.workerId || null,
                jobId: row.jobId || null,
                finalScore: Number(row.finalScore || 0),
                tier: row.tier || 'REJECT',
                accepted: Boolean(row.accepted),
                rejectReason: row.rejectReason || null,
                explainability: row.explainability || {},
                matchModelVersionUsed: row.matchModelVersionUsed || null,
                metadata: row.metadata || {},
            })), { ordered: false });
        }
    } catch (error) {
        console.error('Match run logging failed:', error.message);
    }
};

const runProbabilisticOverlay = async ({ matches = [] }) => {
    const scored = [];
    let matchModelVersionUsed = null;

    for (const row of matches) {
        const probabilistic = await scoreSinglePair({
            worker: row.worker,
            workerUser: row.workerUser,
            job: row.job,
            roleData: row.roleData,
            deterministicScores: row.deterministicScores,
        });

        if (probabilistic.fallbackUsed) {
            scored.push({
                ...row,
                matchProbability: row.finalScore,
                matchModelVersionUsed: probabilistic.modelVersionUsed,
                modelKeyUsed: probabilistic.modelKeyUsed,
                probabilisticFallbackUsed: true,
                explainability: {
                    ...(row.explainability || {}),
                    matchProbability: row.finalScore,
                },
            });
            continue;
        }

        matchModelVersionUsed = probabilistic.modelVersionUsed;

        if (probabilistic.tier === 'REJECT') {
            continue;
        }

        scored.push({
            ...row,
            finalScore: probabilistic.matchProbability,
            matchScore: Math.round(probabilistic.matchProbability * 100),
            tier: probabilistic.tier,
            tierLabel: probabilistic.tierLabel,
            matchProbability: probabilistic.matchProbability,
            matchModelVersionUsed: probabilistic.modelVersionUsed,
            modelKeyUsed: probabilistic.modelKeyUsed,
            probabilisticFallbackUsed: false,
            explainability: {
                ...(row.explainability || {}),
                ...(probabilistic.explainability || {}),
            },
        });
    }

    scored.sort(matchEngineV2.sortScoredMatches);

    return {
        matches: scored,
        matchModelVersionUsed,
    };
};

const getMatchesForEmployer = async (req, res) => {
    try {
        const jobId = req.params.jobId;

        const employer = await User.findById(req.user._id).select('hasCompletedProfile');
        if (!employer?.hasCompletedProfile) {
            return res.status(403).json({ message: 'Please complete your profile first' });
        }

        const job = await Job.findById(jobId);
        if (!job) {
            return res.status(404).json({ message: 'Job not found' });
        }

        const applications = await Application.find({ job: jobId })
            .select('_id worker status updatedAt')
            .sort({ updatedAt: -1 })
            .lean();

        if (!applications.length) {
            return res.json({ matches: [] });
        }

        const workerIds = applications.map((application) => application.worker);
        const applicationByWorkerId = new Map(applications.map((application) => [String(application.worker), application]));

        const workers = await WorkerProfile.find({ _id: { $in: workerIds } })
            .populate('user', 'name hasCompletedProfile isVerified privacyPreferences')
            .lean();

        const candidates = workers
            .filter((worker) => (
                worker?.user
                && worker?.user?.hasCompletedProfile
                && Array.isArray(worker.roleProfiles)
                && worker.roleProfiles.length > 0
                && isWorkerVisibleToEmployer(worker)
            ))
            .map((worker) => ({
                worker,
                user: worker.user,
                applicationMeta: applicationByWorkerId.get(String(worker._id)) || null,
            }));

        const deterministic = matchEngineV2.rankWorkersForJob({
            job,
            candidates,
            maxResults: 20,
        });

        const probabilistic = await runProbabilisticOverlay({ matches: deterministic.matches.map((row) => ({ ...row, job })) });
        let ranked = probabilistic.matches;

        if (!ranked.length) {
            const fallbackWorkers = workers.filter((worker) => Boolean(worker?.user) && isWorkerVisibleToEmployer(worker));
            ranked = fallbackWorkers.map((worker) => {
                const applicationMeta = applicationByWorkerId.get(String(worker._id));
                return {
                    worker,
                    matchScore: 0,
                    finalScore: 0,
                    tier: 'APPLIED',
                    tierLabel: 'Applied',
                    matchProbability: 0,
                    explainability: {
                        jobId: String(job._id),
                        finalScore: 0,
                        tier: 'APPLIED',
                    },
                    applicationMeta,
                };
            });
        }

        const responseRows = ranked.slice(0, 20).map((row) => ({
            worker: sanitizeWorkerForEmployer(row.worker),
            matchScore: row.matchScore,
            tier: row.tierLabel || toModelTierLabel(row.tier),
            matchProbability: row.matchProbability,
            matchModelVersionUsed: row.matchModelVersionUsed || probabilistic.matchModelVersionUsed,
            explainability: row.explainability || {},
            labels: [
                row.roleUsed,
                `${Math.round((row.deterministicScores?.skillScore || 0) * 100)}% Skill Match`,
                row.tier === 'STRONG' ? 'Highly Recommended' : '',
            ].filter(Boolean),
            applicationId: row.applicationMeta?._id || null,
            applicationStatus: row.applicationMeta?.status || 'pending',
        }));

        setImmediate(() => {
            logMatchRun({
                contextType: 'EMPLOYER_MATCH',
                userId: req.user._id,
                jobId: job._id,
                modelVersionUsed: probabilistic.matchModelVersionUsed,
                stats: deterministic,
                rows: responseRows.map((row) => ({
                    workerId: row.worker?._id,
                    jobId: job._id,
                    finalScore: (row.matchProbability ?? row.matchScore / 100),
                    tier: row.tier,
                    accepted: row.tier !== 'Rejected',
                    explainability: row.explainability,
                    matchModelVersionUsed: row.matchModelVersionUsed,
                })),
                metadata: {
                    correlationId: `emp-${req.user._id}-${job._id}-${Date.now()}`,
                },
            });
        });

        return res.json({
            matches: responseRows,
            matchModelVersionUsed: probabilistic.matchModelVersionUsed,
        });
    } catch (error) {
        console.error('Employer match failed:', error);
        return res.status(500).json({ message: 'Matching failed' });
    }
};

const getMatchesForCandidate = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('hasCompletedProfile pushTokens isVerified notificationPreferences');
        if (!user?.hasCompletedProfile) {
            return res.status(403).json({ message: 'Please complete your profile first' });
        }

        const worker = await WorkerProfile.findOne({ user: req.user._id }).lean();
        if (!worker || !worker.isAvailable || !Array.isArray(worker.roleProfiles) || !worker.roleProfiles.length) {
            return res.status(200).json([]);
        }

        const jobs = await Job.find({
            isOpen: true,
            status: 'active',
            employerId: { $ne: req.user._id },
        })
            .sort({ createdAt: -1 })
            .limit(5000)
            .lean();

        const deterministic = matchEngineV2.rankJobsForWorker({
            worker,
            workerUser: user,
            jobs,
            maxResults: 200,
        });

        const probabilistic = await runProbabilisticOverlay({
            matches: deterministic.matches.map((row) => ({
                ...row,
                worker,
                workerUser: user,
            })),
        });

        const topRows = probabilistic.matches.slice(0, 20).map((row) => ({
            job: row.job,
            matchScore: row.matchScore,
            tier: row.tier,
            roleUsed: row.roleUsed,
            matchProbability: row.matchProbability,
            matchModelVersionUsed: row.matchModelVersionUsed || probabilistic.matchModelVersionUsed,
            whyYouFit: `Matches your ${row.roleUsed} profile`,
            labels: [
                row.tier === 'STRONG' ? 'Top Pay' : '',
                row.job?.shift ? `${row.job.shift} Shift` : '',
            ].filter(Boolean),
            explainability: row.explainability || {},
        }));

        setImmediate(() => {
            logMatchRun({
                contextType: 'CANDIDATE_MATCH',
                userId: req.user._id,
                workerId: worker._id,
                modelVersionUsed: probabilistic.matchModelVersionUsed,
                stats: deterministic,
                rows: topRows.map((row) => ({
                    workerId: worker._id,
                    jobId: row.job?._id,
                    finalScore: row.matchProbability,
                    tier: row.tier,
                    accepted: true,
                    explainability: row.explainability,
                    matchModelVersionUsed: row.matchModelVersionUsed,
                })),
                metadata: {
                    correlationId: `can-${req.user._id}-${Date.now()}`,
                },
            });
        });

        try {
            if (topRows.length > 0) {
                const topJob = topRows[0]?.job;
                await sendPushNotificationForUser(
                    user,
                    'New job match found!',
                    topJob?.title ? `${topJob.title} could be a fit for you.` : 'A new role matches your profile.',
                    { type: 'match', jobId: topJob?._id ? String(topJob._id) : undefined },
                    'new_job_recommendations'
                );
            }
        } catch (pushError) {
            console.error('Match push error:', pushError.message);
        }

        return res.json(topRows);
    } catch (error) {
        console.error('Candidate match failed:', error);
        return res.status(500).json({ message: 'Candidate match failed' });
    }
};

const getMatchProbability = async (req, res) => {
    try {
        const { workerId, jobId } = req.query;
        if (!jobId) {
            return res.status(400).json({ message: 'jobId is required' });
        }

        const resolvedWorkerId = workerId || null;
        if (!resolvedWorkerId) {
            return res.status(400).json({ message: 'workerId is required' });
        }

        const [worker, job] = await Promise.all([
            WorkerProfile.findById(resolvedWorkerId).populate('user', 'isVerified hasCompletedProfile').lean(),
            Job.findById(jobId).lean(),
        ]);

        if (!worker || !job) {
            return res.status(404).json({ message: 'Worker or job not found' });
        }

        const isAdmin = Boolean(req.user?.isAdmin);
        const isWorkerOwner = String(worker.user?._id || worker.user) === String(req.user._id);
        const isEmployerOwner = String(job.employerId) === String(req.user._id);
        if (!isAdmin && !isWorkerOwner && !isEmployerOwner) {
            return res.status(403).json({ message: 'Not authorized for this match probability' });
        }

        const workerUser = worker.user || {};
        const deterministic = matchEngineV2.evaluateBestRoleForJob({
            worker,
            workerUser,
            job,
        });

        if (!deterministic.accepted) {
            return res.json({
                matchProbability: 0,
                matchModelVersionUsed: null,
                fallbackUsed: true,
                explainability: {
                    skillImpact: 0,
                    experienceImpact: 0,
                    salaryImpact: 0,
                    distanceImpact: 0,
                    reliabilityImpact: 0,
                },
                reason: deterministic.rejectReason,
            });
        }

        const probabilistic = await scoreSinglePair({
            worker,
            workerUser,
            job,
            roleData: deterministic.roleData,
            deterministicScores: {
                skillScore: deterministic.skillScore,
                experienceScore: deterministic.experienceScore,
                salaryFitScore: deterministic.salaryFitScore,
                distanceScore: deterministic.distanceScore,
                profileCompletenessMultiplier: deterministic.profileCompletenessMultiplier,
            },
        });

        const fallbackProbability = deterministic.finalScore;
        const matchProbability = probabilistic.fallbackUsed
            ? fallbackProbability
            : probabilistic.matchProbability;

        setImmediate(() => {
            logMatchRun({
                contextType: 'PROBABILITY_ENDPOINT',
                userId: req.user._id,
                workerId: worker._id,
                jobId: job._id,
                modelVersionUsed: probabilistic.modelVersionUsed,
                stats: {
                    totalConsidered: 1,
                    totalReturned: 1,
                    avgScore: matchProbability,
                    rejectReasonCounts: {},
                },
                rows: [{
                    workerId: worker._id,
                    jobId: job._id,
                    finalScore: matchProbability,
                    tier: probabilistic.fallbackUsed ? deterministic.tier : probabilistic.tier,
                    accepted: true,
                    explainability: probabilistic.fallbackUsed ? deterministic.explainability : probabilistic.explainability,
                    matchModelVersionUsed: probabilistic.modelVersionUsed,
                }],
                metadata: {
                    correlationId: `prob-${req.user._id}-${job._id}-${worker._id}`,
                    fallbackUsed: probabilistic.fallbackUsed,
                    modelKeyUsed: probabilistic.modelKeyUsed,
                },
            });
            recordMatchPerformanceMetric({
                eventName: 'MATCH_DETAIL_VIEWED',
                jobId: job._id,
                workerId: worker._id,
                city: job.location || 'unknown',
                roleCluster: deterministic.roleData?.roleName || job.title || 'general',
                matchProbability,
                matchTier: probabilistic.fallbackUsed ? deterministic.tier : probabilistic.tier,
                modelVersionUsed: probabilistic.modelVersionUsed || null,
                timestamp: new Date(),
                metadata: {
                    source: 'match_probability_endpoint',
                    userId: String(req.user._id),
                    fallbackUsed: probabilistic.fallbackUsed,
                },
            }).catch((metricError) => {
                console.warn('Probability match metric collection failed:', metricError.message);
            });
        });

        return res.json({
            matchProbability,
            matchModelVersionUsed: probabilistic.modelVersionUsed,
            fallbackUsed: probabilistic.fallbackUsed,
            explainability: probabilistic.fallbackUsed
                ? {
                    skillImpact: deterministic.skillScore,
                    experienceImpact: deterministic.experienceScore,
                    salaryImpact: deterministic.salaryFitScore,
                    distanceImpact: deterministic.distanceScore,
                    reliabilityImpact: deterministic.reliabilityScore || 1,
                }
                : probabilistic.explainability,
        });
    } catch (error) {
        console.error('Probability endpoint failed:', error);
        return res.status(500).json({ message: 'Probability scoring failed' });
    }
};

const explainMatchController = async (req, res) => {
    try {
        const { jobId, candidateId, matchScore } = req.body;

        const job = await Job.findById(jobId);
        let worker = await WorkerProfile.findById(candidateId).populate('user', 'name');
        if (!worker) {
            worker = await WorkerProfile.findOne({ user: candidateId }).populate('user', 'name');
        }

        if (!job || !worker) {
            return res.status(404).json({ message: 'Job or Candidate not found' });
        }

        let bestRole = Array.isArray(worker.roleProfiles) && worker.roleProfiles.length > 0
            ? worker.roleProfiles[0]
            : null;

        if (Array.isArray(worker.roleProfiles)) {
            const jobTokens = String(job.title || '').toLowerCase().split(/\s+/).filter((token) => token.length > 2);
            for (const role of worker.roleProfiles) {
                const roleTokens = String(role.roleName || '').toLowerCase().split(/\s+/).filter((token) => token.length > 2);
                if (jobTokens.some((token) => roleTokens.includes(token))) {
                    bestRole = role;
                    break;
                }
            }
        }

        const explanationLines = await explainMatch(
            {
                title: job.title,
                requirements: job.requirements || [],
            },
            {
                skills: bestRole ? bestRole.skills : [],
                experience: bestRole ? bestRole.experienceInRole : 0,
                location: worker.city || 'Remote',
            },
            matchScore
        );

        return res.json({ explanation: explanationLines });
    } catch (error) {
        console.error('Match explanation error:', error);
        return res.status(500).json({
            explanation: [
                'A strong overall candidate for this position.',
                'Relevant skillsets align with requirements.',
                'Solid experience profile.',
            ],
        });
    }
};

const submitMatchFeedback = async (req, res) => {
    try {
        const { jobId, candidateId, matchScoreAtTime, userAction } = req.body;
        const employerId = req.user._id;

        if (!jobId || !candidateId || !userAction) {
            return res.status(400).json({ message: 'Missing required feedback fields' });
        }

        const feedback = await MatchFeedback.create({
            jobId,
            candidateId,
            employerId,
            matchScoreAtTime: matchScoreAtTime || 0,
            userAction,
        });

        if (userAction === 'shortlisted') {
            const [job, worker] = await Promise.all([
                Job.findById(jobId),
                WorkerProfile.findById(candidateId),
            ]);

            if (worker && job) {
                await createNotification({
                    user: worker.user,
                    type: 'status_update',
                    title: 'You were Shortlisted!',
                    message: `${job.companyName || 'An employer'} shortlisted you for: ${job.title}`,
                    relatedData: { jobId: job._id },
                });
            }
        }

        return res.status(201).json(feedback);
    } catch (error) {
        console.error('Match feedback error:', error);
        return res.status(500).json({ message: 'Failed to record feedback' });
    }
};

module.exports = {
    getMatchesForEmployer,
    getMatchesForCandidate,
    getMatchProbability,
    explainMatchController,
    submitMatchFeedback,
    matchCache,
    getCacheKey,
    getFromCache,
    setToCache,
};
