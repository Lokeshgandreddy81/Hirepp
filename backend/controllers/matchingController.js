const Job = require('../models/Job');
const WorkerProfile = require('../models/WorkerProfile');
const User = require('../models/userModel');
const MatchFeedback = require('../models/MatchFeedback');
const { createNotification } = require('./notificationController');
const { sendPushNotification } = require('../services/pushService');
const { getBatchMatchScores, explainMatch } = require('../services/geminiService');
const redisClient = require('../config/redis');
const algo = require('../utils/matchingAlgorithm'); // v7.0 Logic


// Fix 3.1: Redis-backed cache with Map fallback
const matchCache = new Map(); // Fallback if Redis unavailable
const CACHE_TTL_SEC = 604800; // 7 days in seconds (Redis format)

// Fix 2.1: Unified cache key function (eliminates emp_/can_ asymmetry)
const getCacheKey = (jobId, workerId) => `match:${jobId}:${workerId}`;

// Helper: Get from cache (try Redis first, fallback to Map)
const getFromCache = async (key) => {
    try {
        if (redisClient.isOpen) {
            const data = await redisClient.get(key);
            if (data) {
                console.log(`🔵 [REDIS GET] Key: ${key.substring(0, 30)}...`);
                return JSON.parse(data);
            }
        }
    } catch (error) {
        console.error('❌ [REDIS GET ERROR]:', error.message);
    }

    // Fallback to Map
    const cached = matchCache.get(key);
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL_SEC * 1000)) {
        console.log(`🟡 [MAP GET] Key: ${key.substring(0, 30)}...`);
        return cached.data;
    }
    return null;
};

// Helper: Set to cache (try Redis first, fallback to Map)
const setToCache = async (key, value) => {
    try {
        if (redisClient.isOpen) {
            // Set asynchronously, do not await if we want to return results faster
            redisClient.setEx(key, CACHE_TTL_SEC, JSON.stringify(value)).catch(err => {
                console.error('❌ [REDIS SET ERROR]:', err.message);
            });
            console.log(`🔵 [REDIS SET] Key: ${key.substring(0, 30)}...`);
            return;
        }
    } catch (error) {
        console.error('❌ [REDIS SET ERROR]:', error.message);
    }

    // Fallback to Map
    matchCache.set(key, { data: value, timestamp: Date.now() });
    console.log(`🟡 [MAP SET] Key: ${key.substring(0, 30)}...`);
};

// @desc Get ranked workers (Employer View) - v7.0 ALGORITHM (Hybrid Python/Node)
const getMatchesForEmployer = async (req, res) => {
    try {
        console.log('🔍 [v7.0 Hybrid] Employer Match Request for jobId:', req.params.jobId);

        // 1. Validation & Data Fetching
        const employer = await User.findById(req.user._id);
        if (!employer.hasCompletedProfile) {
            return res.status(403).json({ message: 'Please complete your profile first' });
        }

        const job = await Job.findById(req.params.jobId);
        if (!job || !job.isOpen) {
            return res.status(404).json({ message: 'Job not found or closed' });
        }

        // 2. Database Filtering (Optimized Phase 1)
        const limit = 300; // Larger fetch for Python processing
        const workers = await WorkerProfile.find({ isAvailable: true })
            .sort({ createdAt: -1 })
            .limit(limit)
            .populate('user', 'name hasCompletedProfile');

        const validWorkers = workers.filter(w => w.user && w.user.hasCompletedProfile && w.roleProfiles?.length > 0);
        console.log(`✅ [v7.0] Initial Candidates: ${validWorkers.length}`);

        let results = [];
        let usedPython = false;

        // 3. PYTHON ENGINE CALL (Circuit Breaker Pattern)
        try {
            const axios = require('axios');

            // Minify Payload
            const workerPayload = [];
            validWorkers.forEach(w => {
                w.roleProfiles.forEach(r => {
                    workerPayload.push({
                        id: w._id.toString(),
                        userId: w.user._id.toString(),
                        name: w.user.name || w.firstName,
                        city: w.city,
                        isVerified: false, // user.isVerified if available, defaults false
                        preferredShift: 'Flexible', // Add to schema if needed
                        roleName: r.roleName,
                        expectedSalary: r.expectedSalary || 0,
                        experienceInRole: r.experienceInRole || 0,
                        skills: r.skills || [],
                        licenses: []
                    });
                });
            });

            const jobPayload = {
                id: job._id.toString(),
                title: job.title,
                location: job.location,
                maxSalary: job.maxSalary || (parseInt(job.salaryRange) || 0),
                requirements: job.requirements || [],
                shift: job.shift,
                mandatoryLicenses: job.mandatoryLicenses || []
            };

            // Check for Unknown Title
            if (job.title === 'Unknown' || job.title === 'Open Position') {
                console.warn(`⚠️ [DATA WARNING] Job Title is "${job.title}". This may cause poor matching results.`);
                // User requested specific error throw
                if (job.title === 'Unknown') throw new Error("Job Title is 'Unknown' - Aborting Match to prevent bad results.");
            }

            console.log(`🐍 Sending to Python: Job "${job.title}" with ${workerPayload.length} Workers`);

            // Call Python Service (200ms Timeout)
            console.log("🐍 Calling Python Logic Engine...");
            const pyResponse = await axios.post('http://localhost:8000/calculate-matches', {
                job: jobPayload,
                workers: workerPayload
            }, { timeout: 2500 }); // Relaxed to 2.5s for initial testing

            if (pyResponse.data) {
                console.log(`🐍 Python returned ${pyResponse.data.length} matches`);

                // Map Python results to UI structure
                results = pyResponse.data.map(m => {
                    const fullWorker = validWorkers.find(w => w._id.toString() === m.workerId);
                    return {
                        worker: fullWorker, // Attach full Mongoose object
                        matchScore: m.matchScore,
                        tier: m.tier,
                        labels: m.labels
                    };
                });
                usedPython = true;
            }

        } catch (pyError) {
            console.warn("⚠️ Python Engine Unavailable (Circuit Breaker Open):", pyError.code || pyError.message);
            // usedPython remains false -> triggers Fallback
        }

        // 4. FALLBACK LOGIC (Local Node.js v7.0 Token Match)
        if (!usedPython) {
            console.log("⚙️  Running Fallback Local Logic...");
            for (const worker of validWorkers) {
                // Role Match (Token-based for "Software Engineer" vs "Software Developer")
                const jobTokens = job.title.toLowerCase().split(/\s+/).filter(t => t.length > 2);

                const roleData = worker.roleProfiles.find(r => {
                    const roleTokens = r.roleName.toLowerCase().split(/\s+/).filter(t => t.length > 2);
                    // Check if ANY significant token matches
                    const hasMatch = jobTokens.some(jt => roleTokens.includes(jt));
                    return hasMatch;
                });

                if (!roleData) {
                    continue;
                }

                // Phase 2: Hard Gates
                if (!algo.hardGates(job, worker, roleData)) {
                    continue;
                }

                // Phase 3: Quality
                const quality = algo.calculateQualityFactor(job, worker);
                if (quality === 0) continue;

                // Phase 5: Dimension Scoring
                const salScore = algo.salaryScore(roleData.expectedSalary, job.maxSalary);
                const expScore = algo.experienceScore(roleData.experienceInRole, job.requirements.join(' ').match(/\d+/) || 0); // Naive scaling from reqs
                const skillScore = algo.skillsScore(roleData.skills, job.requirements);

                // Phase 6: Composite Score
                const criticalScore = algo.criticalComposite(salScore, expScore, skillScore);
                const softBonus = algo.calculateSoftBonus(job, worker);

                let finalScore = (criticalScore + softBonus) * quality;
                finalScore = Math.min(Math.max(finalScore, 0), 1.0); // Clamp 0-1

                if (finalScore >= algo.CONFIG.DISPLAY_THRESHOLD) {
                    results.push({
                        worker,
                        matchScore: Math.round(finalScore * 100),
                        tier: finalScore >= 0.85 ? 'Strong Match' : finalScore >= 0.75 ? 'Good Match' : 'Possible Match',
                        labels: [
                            roleData.roleName,
                            `${Math.round(skillScore * 100)}% Skill Match`,
                            finalScore >= 0.85 ? 'Highly Recommended' : ''
                        ].filter(Boolean)
                    });
                }
            }
            results.sort((a, b) => b.matchScore - a.matchScore);
            results = results.slice(0, 20);
        }

        console.log(`🎯 [v7.0 Hybrid] Returned ${results.length} matches (Source: ${usedPython ? 'PYTHON' : 'NODE'})`);
        res.json(results);

    } catch (error) {
        console.error("❌ [v7.0 FATAL] Employer Match Error:", error);
        res.status(500).json({ message: 'Matching failed' });
    }
};

// @desc Get ranked jobs for the logged-in worker (Candidate View) - v7.0 ALGORITHM
const getMatchesForCandidate = async (req, res) => {
    try {
        console.log('🔍 [v7.0] Candidate Match Request for user:', req.user._id);

        const user = await User.findById(req.user._id);
        if (!user.hasCompletedProfile) {
            return res.status(403).json({ message: 'Please complete your profile first' });
        }

        const worker = await WorkerProfile.findOne({ user: req.user._id });
        if (!worker || !worker.isAvailable || !worker.roleProfiles || worker.roleProfiles.length === 0) {
            console.log(`⚠️ [v7.0] Candidate lacks a valid roleProfile. Returning empty matches gracefully.`);
            return res.status(200).json([]); // Safely return empty list to UI instead of crashing/erroring
        }

        // Fetch Open Jobs not posted by this user
        const limit = 200;
        const jobs = await Job.find({ isOpen: true, employerId: { $ne: req.user._id } })
            .sort({ createdAt: -1 })
            .limit(limit);

        console.log(`✅ [v7.0] Found ${jobs.length} potential jobs`);

        const results = [];

        for (const job of jobs) {
            // Find the BEST fitting role from the worker's multiple roles
            // Logic: Calculate score for each role, take the max.

            let bestMatchForJob = null;
            let maxScore = -1;

            for (const roleData of worker.roleProfiles) {
                // Phase 1: Category Match (Token-based)
                const jobTokens = job.title.toLowerCase().split(/\s+/).filter(t => t.length > 2);
                const roleTokens = roleData.roleName.toLowerCase().split(/\s+/).filter(t => t.length > 2);

                const hasMatch = jobTokens.some(jt => roleTokens.includes(jt));

                if (!hasMatch) {
                    continue;
                }

                // Phase 2: Hard Gates
                if (!algo.hardGates(job, worker, roleData)) continue;

                // Phase 3: Quality
                const quality = algo.calculateQualityFactor(job, worker);

                // Phase 5: Dimension Scoring
                // Note: For Candidate View, Salary Score is inverted? 
                // No, "Salary Score" checks if Offer >= Expectation. This applies to both views.
                const salScore = algo.salaryScore(roleData.expectedSalary, job.maxSalary);

                // Derive numeric experience from job requirements (naive regex)
                const reqExp = job.requirements.join(' ').match(/(\d+)\s+years?/i)?.[1] || 0;
                const expScore = algo.experienceScore(roleData.experienceInRole, reqExp);

                const skillScore = algo.skillsScore(roleData.skills, job.requirements);

                // Phase 6: Composite
                // Perspective Weighting: Candidate cares more about Salary (20%) and Location (25%)
                // We use standard weights for now but this is where W_CANDIDATE_* config would apply.
                const criticalScore = algo.criticalComposite(salScore, expScore, skillScore);
                const softBonus = algo.calculateSoftBonus(job, worker);

                let totalScore = (criticalScore + softBonus) * quality;
                totalScore = Math.min(Math.max(totalScore, 0), 1.0);

                if (totalScore > maxScore) {
                    maxScore = totalScore;
                    bestMatchForJob = {
                        job,
                        matchScore: Math.round(totalScore * 100),
                        roleUsed: roleData.roleName,
                        whyYouFit: `Matches your ${roleData.roleName} profile`,
                        labels: [
                            maxScore >= 0.85 ? 'Top Pay' : '',
                            job.shift ? `${job.shift} Shift` : ''
                        ].filter(Boolean)
                    };
                }
            }

            if (bestMatchForJob && bestMatchForJob.matchScore >= (algo.CONFIG.DISPLAY_THRESHOLD * 100)) {
                results.push(bestMatchForJob);
            }
        }

        results.sort((a, b) => b.matchScore - a.matchScore);
        const topResults = results.slice(0, 20);

        // Push when new matches are found for this candidate
        try {
            if (topResults.length > 0) {
                const topJob = topResults[0]?.job;
                await sendPushNotification(
                    user.pushTokens || [],
                    'New job match found!',
                    topJob?.title ? `${topJob.title} could be a fit for you.` : 'A new role matches your profile.',
                    { type: 'match', jobId: topJob?._id ? String(topJob._id) : undefined }
                );
            }
        } catch (pushError) {
            console.error('Match push error:', pushError.message);
        }

        console.log(`🎯 [v7.0] Returned ${topResults.length} matches for candidate`);
        res.json(topResults);

    } catch (error) {
        console.error("❌ [v7.0 FATAL] Candidate Match Error:", error);
        res.status(500).json({ message: 'Candidate match failed' });
    }
};

// @desc Generate AI Explanation for a match
const explainMatchController = async (req, res) => {
    try {
        const { jobId, candidateId, matchScore, matchBreakdown } = req.body;
        console.log(`🤖 Generating Explanation for Job ${jobId} and Candidate ${candidateId}`);

        // Need to fetch Job and Candidate info to feed Gemini
        const job = await Job.findById(jobId);
        let worker;

        // candidateId might be userId or workerId. Let's try both
        worker = await WorkerProfile.findById(candidateId).populate('user', 'name');
        if (!worker) {
            worker = await WorkerProfile.findOne({ user: candidateId }).populate('user', 'name');
        }

        if (!job || !worker) {
            return res.status(404).json({ message: "Job or Candidate not found" });
        }

        const jobData = {
            title: job.title,
            requirements: job.requirements || []
        };

        // Determine best role to use for explanation based on job title
        let bestRole = worker.roleProfiles && worker.roleProfiles.length > 0 ? worker.roleProfiles[0] : null;
        if (worker.roleProfiles) {
            const jobTokens = job.title.toLowerCase().split(/\s+/).filter(t => t.length > 2);
            for (let r of worker.roleProfiles) {
                const roleTokens = r.roleName.toLowerCase().split(/\s+/).filter(t => t.length > 2);
                if (jobTokens.some(jt => roleTokens.includes(jt))) {
                    bestRole = r;
                    break;
                }
            }
        }

        const candidateData = {
            skills: bestRole ? bestRole.skills : (worker.skills || []),
            experience: bestRole ? bestRole.experienceInRole : 0,
            location: worker.city || 'Remote'
        };

        const explanationLines = await explainMatch(jobData, candidateData, matchScore);

        res.json({ explanation: explanationLines });
    } catch (error) {
        console.error("Match Explanation Error:", error);
        res.status(500).json({ explanation: ["A strong overall candidate for this position.", "Relevant skillsets align with requirements.", "Solid experience profile."] });
    }
};

// @desc Submit match feedback
const submitMatchFeedback = async (req, res) => {
    try {
        const { jobId, candidateId, matchScoreAtTime, userAction } = req.body;
        const employerId = req.user._id;

        if (!jobId || !candidateId || !userAction) {
            return res.status(400).json({ message: "Missing required feedback fields" });
        }

        const feedback = await MatchFeedback.create({
            jobId,
            candidateId,
            employerId,
            matchScoreAtTime: matchScoreAtTime || 0,
            userAction
        });

        if (userAction === 'shortlisted') {
            const job = await Job.findById(jobId);
            const worker = await WorkerProfile.findById(candidateId);
            if (worker && job) {
                await createNotification({
                    user: worker.user, // Notify the candidate's User doc
                    type: 'status_update',
                    title: 'You were Shortlisted!',
                    message: `${job.companyName || 'An employer'} shortlisted you for: ${job.title}`,
                    relatedData: { jobId: job._id }
                });
            }
        }

        console.log(`📈 [FEEDBACK REC'D] Employer ${employerId} -> ${userAction} -> Candidate ${candidateId}`);
        res.status(201).json(feedback);
    } catch (error) {
        console.error("Match Feedback Error:", error);
        res.status(500).json({ message: "Failed to record feedback" });
    }
};

module.exports = { getMatchesForEmployer, getMatchesForCandidate, explainMatchController, submitMatchFeedback, matchCache };
