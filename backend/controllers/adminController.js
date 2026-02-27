const User = require('../models/userModel');
const Job = require('../models/Job');
const Application = require('../models/Application');
const WorkerProfile = require('../models/WorkerProfile');
const BetaCode = require('../models/BetaCode');
const CityEmployerPipeline = require('../models/CityEmployerPipeline');
const MatchModelReport = require('../models/MatchModelReport');
const { getAndPersistCalibrationSuggestion } = require('../match/matchModelCalibration');
const { getMatchPerformanceAlerts } = require('../services/matchMetricsService');

// @desc Get high-level platform statistics
// @route GET /api/admin/stats
const getPlatformStats = async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const totalEmployers = await User.countDocuments({ role: 'employer' });
        const totalCandidates = await User.countDocuments({ role: 'candidate' });
        const totalJobs = await Job.countDocuments();
        const activeJobs = await Job.countDocuments({ isOpen: true });
        const totalApplications = await Application.countDocuments();

        // Calculate some basic mock revenue or engagement metric based on apps/jobs
        const engagementScore = (totalApplications / (totalJobs || 1)).toFixed(1);

        res.json({
            users: { total: totalUsers, employers: totalEmployers, candidates: totalCandidates },
            jobs: { total: totalJobs, active: activeJobs },
            activity: { totalApplications, avgAppsPerJob: engagementScore }
        });
    } catch (error) {
        console.error("Admin Stats Error:", error);
        res.status(500).json({ message: "Failed to load platform stats" });
    }
};

// @desc Get all users with pagination for admin table
// @route GET /api/admin/users
const getAllUsers = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const startIndex = (page - 1) * limit;

        const users = await User.find()
            .select('-password')
            .sort({ createdAt: -1 })
            .skip(startIndex)
            .limit(limit);

        const total = await User.countDocuments();

        res.json({
            users,
            total,
            page,
            pages: Math.ceil(total / limit)
        });
    } catch (error) {
        console.error("Admin Users Error:", error);
        res.status(500).json({ message: "Failed to load users" });
    }
};

// @desc Get all jobs with pagination for admin table
// @route GET /api/admin/jobs
const getAllJobs = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const startIndex = (page - 1) * limit;

        const jobs = await Job.find().populate('employerId', 'name email companyName')
            .sort({ createdAt: -1 })
            .skip(startIndex)
            .limit(limit);

        const total = await Job.countDocuments();

        res.json({
            jobs,
            total,
            page,
            pages: Math.ceil(total / limit)
        });
    } catch (error) {
        console.error("Admin Jobs Error:", error);
        res.status(500).json({ message: "Failed to load jobs" });
    }
};

// @desc Generate new beta codes for user distribution
// @route POST /api/admin/beta-codes
const generateBetaCodes = async (req, res) => {
    try {
        const { count = 5 } = req.body;
        const crypto = require('crypto');

        const newCodes = [];
        for (let i = 0; i < count; i++) {
            // Generate a readable 8-10 char code e.g. BETA-A1B2C3D4
            const randomString = crypto.randomBytes(4).toString('hex').toUpperCase();
            newCodes.push({ code: `BETA-${randomString}` });
        }

        const insertedCodes = await BetaCode.insertMany(newCodes);

        res.status(201).json({
            success: true,
            message: `Generated ${count} new beta codes`,
            codes: insertedCodes.map(c => c.code)
        });
    } catch (error) {
        console.error("Generate Beta Codes Error:", error);
        res.status(500).json({ message: "Failed to generate beta codes" });
    }
};

// @desc Create city employer pipeline lead
// @route POST /api/admin/city-pipeline
const createCityPipelineEntry = async (req, res) => {
    try {
        const {
            city = 'Hyderabad',
            companyName,
            contactName = '',
            phone = '',
            stage = 'lead',
            source = 'unknown',
            owner = '',
            notes = '',
        } = req.body || {};

        if (!companyName) {
            return res.status(400).json({ message: 'companyName is required' });
        }

        const entry = await CityEmployerPipeline.create({
            city,
            companyName,
            contactName,
            phone,
            stage,
            source,
            owner,
            notes,
        });

        return res.status(201).json({ success: true, data: entry });
    } catch (error) {
        console.error('Create city pipeline entry error:', error);
        return res.status(500).json({ message: 'Failed to create pipeline entry' });
    }
};

// @desc List city employer pipeline entries
// @route GET /api/admin/city-pipeline
const getCityPipelineEntries = async (req, res) => {
    try {
        const city = String(req.query.city || 'Hyderabad');
        const stage = req.query.stage ? String(req.query.stage) : null;
        const page = Number.parseInt(req.query.page || '1', 10);
        const limit = Number.parseInt(req.query.limit || '50', 10);
        const skip = (Math.max(page, 1) - 1) * Math.max(limit, 1);

        const query = { city };
        if (stage) query.stage = stage;

        const [rows, total] = await Promise.all([
            CityEmployerPipeline.find(query)
                .sort({ updatedAt: -1 })
                .skip(skip)
                .limit(limit),
            CityEmployerPipeline.countDocuments(query),
        ]);

        return res.json({
            success: true,
            data: rows,
            page: Math.max(page, 1),
            pages: Math.ceil(total / Math.max(limit, 1)),
            total,
        });
    } catch (error) {
        console.error('Get city pipeline entries error:', error);
        return res.status(500).json({ message: 'Failed to load city pipeline entries' });
    }
};

// @desc Update city employer pipeline entry
// @route PUT /api/admin/city-pipeline/:id
const updateCityPipelineEntry = async (req, res) => {
    try {
        const existing = await CityEmployerPipeline.findById(req.params.id);
        if (!existing) {
            return res.status(404).json({ message: 'Pipeline entry not found' });
        }

        const payload = { ...req.body };
        const now = new Date();
        const nextStage = payload.stage ? String(payload.stage) : existing.stage;
        if (nextStage === 'trial_started' && !existing.trialStartedAt) payload.trialStartedAt = now;
        if (nextStage === 'converted_paid' && !existing.convertedPaidAt) payload.convertedPaidAt = now;
        if (nextStage === 'repeat_hiring' && !existing.repeatHiringAt) payload.repeatHiringAt = now;

        const updated = await CityEmployerPipeline.findByIdAndUpdate(
            req.params.id,
            { $set: payload },
            { new: true }
        );

        return res.json({ success: true, data: updated });
    } catch (error) {
        console.error('Update city pipeline entry error:', error);
        return res.status(500).json({ message: 'Failed to update city pipeline entry' });
    }
};

// @desc Get city employer pipeline summary
// @route GET /api/admin/city-pipeline/summary
const getCityPipelineSummary = async (req, res) => {
    try {
        const city = String(req.query.city || 'Hyderabad');

        const [summaryRows] = await Promise.all([
            CityEmployerPipeline.aggregate([
                { $match: { city } },
                {
                    $group: {
                        _id: '$stage',
                        count: { $sum: 1 },
                    },
                },
            ]),
        ]);

        const stageMap = summaryRows.reduce((acc, row) => ({
            ...acc,
            [row._id]: row.count,
        }), {});

        return res.json({
            success: true,
            city,
            summary: {
                lead: stageMap.lead || 0,
                demo_done: stageMap.demo_done || 0,
                trial_started: stageMap.trial_started || 0,
                converted_paid: stageMap.converted_paid || 0,
                repeat_hiring: stageMap.repeat_hiring || 0,
                lost: stageMap.lost || 0,
            },
        });
    } catch (error) {
        console.error('City pipeline summary error:', error);
        return res.status(500).json({ message: 'Failed to load city pipeline summary' });
    }
};

// @desc Get match model training report
// @route GET /api/admin/match-report?modelVersion=
const getMatchReport = async (req, res) => {
    try {
        const requestedVersion = String(req.query.modelVersion || '').trim();

        const query = requestedVersion ? { modelVersion: requestedVersion } : {};
        const report = await MatchModelReport.findOne(query).sort({ createdAt: -1 }).lean();

        if (!report) {
            return res.status(404).json({ message: 'Match model report not found' });
        }

        return res.json({
            success: true,
            data: report,
        });
    } catch (error) {
        console.error('Get match model report error:', error);
        return res.status(500).json({ message: 'Failed to load match model report' });
    }
};

// @desc Get match calibration suggestions and persist suggestion snapshot
// @route GET /api/admin/match-calibration-suggestions
const getMatchCalibrationSuggestions = async (req, res) => {
    try {
        const city = req.query.city ? String(req.query.city).trim() : null;
        const roleCluster = req.query.roleCluster ? String(req.query.roleCluster).trim() : null;
        const from = req.query.from ? String(req.query.from) : null;
        const to = req.query.to ? String(req.query.to) : null;

        const { suggestion, persisted } = await getAndPersistCalibrationSuggestion({
            city,
            roleCluster,
            from,
            to,
        });

        return res.json({
            success: true,
            data: {
                ...suggestion,
                calibrationId: persisted?._id || null,
            },
        });
    } catch (error) {
        console.error('Get match calibration suggestions error:', error);
        return res.status(500).json({ message: 'Failed to generate calibration suggestions' });
    }
};

// @desc Get match performance alerts against benchmark targets
// @route GET /api/admin/match-performance-alerts
const getMatchPerformanceAlertsController = async (req, res) => {
    try {
        const city = req.query.city ? String(req.query.city).trim() : null;
        const roleCluster = req.query.roleCluster ? String(req.query.roleCluster).trim() : null;
        const from = req.query.from ? String(req.query.from) : null;
        const to = req.query.to ? String(req.query.to) : null;

        const result = await getMatchPerformanceAlerts({
            city,
            roleCluster,
            from,
            to,
        });

        return res.json({
            success: true,
            data: result,
        });
    } catch (error) {
        console.error('Get match performance alerts error:', error);
        return res.status(500).json({ message: 'Failed to load match performance alerts' });
    }
};

module.exports = {
    getPlatformStats,
    getAllUsers,
    getAllJobs,
    generateBetaCodes,
    createCityPipelineEntry,
    getCityPipelineEntries,
    updateCityPipelineEntry,
    getCityPipelineSummary,
    getMatchReport,
    getMatchCalibrationSuggestions,
    getMatchPerformanceAlertsController,
};
