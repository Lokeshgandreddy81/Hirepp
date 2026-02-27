const Application = require('../models/Application');
const Job = require('../models/Job');
const WorkerProfile = require('../models/WorkerProfile');
const User = require('../models/userModel');
const { createNotification } = require('./notificationController');
const { sendPushNotificationForUser } = require('../services/pushService');
const {
    fireAndForget,
    markFirstShortlistOnce,
    markFirstHireOnce,
    recordLifecycleEvent,
    normalizeSalaryBand,
} = require('../services/revenueInstrumentationService');
const {
    recordMatchPerformanceMetric,
    recordJobFillCompletedOnce,
} = require('../services/matchMetricsService');

const ALLOWED_STATUSES = new Set([
    'requested',
    'pending',
    'shortlisted',
    'accepted',
    'rejected',
    'hired',
    'offer_proposed',
    'offer_accepted',
]);

// @desc    Send Connection Request (Worker applies OR Employer invites)
// @route   POST /api/applications
// @access  Private
const sendRequest = async (req, res) => {
    const { jobId, workerId, initiatedBy } = req.body;

    try {
        // 1. Validation
        if (!jobId || !workerId || !initiatedBy) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        const job = await Job.findById(jobId);
        if (!job) return res.status(404).json({ message: 'Job not found' });

        // workerId from mobile can be either WorkerProfile._id or User._id.
        let resolvedWorkerProfile = await WorkerProfile.findById(workerId).select('_id user');
        if (!resolvedWorkerProfile) {
            resolvedWorkerProfile = await WorkerProfile.findOne({ user: workerId }).select('_id user');
        }
        if (!resolvedWorkerProfile) {
            return res.status(404).json({ message: 'Worker profile not found' });
        }

        // 2. Check for existing application
        const existingApp = await Application.findOne({ job: jobId, worker: resolvedWorkerProfile._id });
        if (existingApp) {
            return res.status(400).json({ message: 'Application already exists' });
        }

        // 3. Create Application
        // Employer ID comes from Job document for consistency
        const application = await Application.create({
            job: jobId,
            worker: resolvedWorkerProfile._id,
            employer: job.employerId,
            initiatedBy,
            status: 'pending',
            lastMessage: initiatedBy === 'worker' ? 'Applied for this job' : 'Invited you to apply'
        });

        // Notify the Employer
        await createNotification({
            user: job.employerId,
            type: 'application_received',
            title: 'New Applicant',
            message: `A new candidate applied to: ${job.title}`,
            relatedData: { jobId: job._id, candidateId: resolvedWorkerProfile._id }
        });

        // Realtime update for employer-side talent views
        const io = req.app.get('io');
        if (io) {
            io.emit('new_application', {
                applicationId: application._id.toString(),
                jobId: job._id.toString(),
                workerId: resolvedWorkerProfile._id.toString()
            });
        }

        fireAndForget('recordApplicationCreatedLifecycle', () => recordLifecycleEvent({
            eventType: 'APPLICATION_CREATED',
            employerId: job.employerId,
            workerId: resolvedWorkerProfile._id,
            jobId: job._id,
            applicationId: application._id,
            city: job.location || 'Hyderabad',
            roleCluster: job.title || 'general',
            salaryBand: normalizeSalaryBand(job.salaryRange),
            shift: job.shift || 'unknown',
            metadata: {
                initiatedBy,
            },
        }).then(() => recordMatchPerformanceMetric({
            eventName: 'APPLICATION_CREATED',
            jobId: job._id,
            workerId: resolvedWorkerProfile._id,
            applicationId: application._id,
            city: job.location || 'Hyderabad',
            roleCluster: job.title || 'general',
            metadata: {
                initiatedBy,
                source: 'application_controller',
            },
        })), {
            applicationId: String(application._id),
            jobId: String(job._id),
        });

        res.status(201).json(application);
    } catch (error) {
        console.error("Send Request Error:", error);
        res.status(500).json({ message: 'Request failed' });
    }
};

// @desc    Update Application Status (Accept/Reject)
// @route   PUT /api/applications/:id/status
// @access  Private
const updateStatus = async (req, res) => {
    const { status } = req.body; // 'accepted' or 'rejected'
    const { id } = req.params;
    const normalizedStatus = String(status || '').toLowerCase();

    if (!ALLOWED_STATUSES.has(normalizedStatus)) {
        return res.status(400).json({ message: 'Invalid status' });
    }

    try {
        const application = await Application.findById(id);
        if (!application) return res.status(404).json({ message: 'Application not found' });

        const workerProfile = await WorkerProfile.findById(application.worker).select('user');
        const isEmployer = String(application.employer) === String(req.user._id);
        const isWorker = String(workerProfile?.user) === String(req.user._id);
        if (!isEmployer && !isWorker) {
            return res.status(403).json({ message: 'Not authorized for this application' });
        }

        // Verify authorization (Only the recipient can accept/reject ideally, 
        // but for now we check if user is involved)
        // In a strictly secure app, we'd check initiatedBy:
        // if initiatedBy 'worker', only employer can accept.
        // if initiatedBy 'employer', only worker can accept.
        // For MVP, we presume the frontend handles the UI logic and backend just updates.

        application.status = normalizedStatus;

        const STATUS_MESSAGE_MAP = {
            requested: 'Application requested.',
            pending: 'Application submitted.',
            shortlisted: 'You are shortlisted.',
            accepted: 'Connection Accepted. Chat is open.',
            rejected: 'Application Rejected.',
            hired: 'Offer confirmed. You are hired.',
            offer_proposed: 'Offer proposed by employer.',
            offer_accepted: 'Offer accepted.',
        };

        application.lastMessage = STATUS_MESSAGE_MAP[normalizedStatus] || application.lastMessage;

        await application.save();

        if (normalizedStatus === 'shortlisted') {
            fireAndForget('markFirstShortlistOnce', async () => {
                const job = await Job.findById(application.job).select('location title salaryRange shift');
                await markFirstShortlistOnce({
                    employerId: application.employer,
                    applicationId: application._id,
                    jobId: application.job,
                    city: job?.location || null,
                });
                await recordLifecycleEvent({
                    eventType: 'APPLICATION_SHORTLISTED',
                    employerId: application.employer,
                    workerId: application.worker,
                    jobId: application.job,
                    applicationId: application._id,
                    city: job?.location || 'Hyderabad',
                    roleCluster: job?.title || 'general',
                    salaryBand: normalizeSalaryBand(job?.salaryRange),
                    shift: job?.shift || 'unknown',
                });
                await recordMatchPerformanceMetric({
                    eventName: 'APPLICATION_SHORTLISTED',
                    jobId: application.job,
                    workerId: application.worker,
                    applicationId: application._id,
                    city: job?.location || 'Hyderabad',
                    roleCluster: job?.title || 'general',
                    metadata: {
                        source: 'application_controller',
                    },
                });
            }, { applicationId: String(application._id), employerId: String(application.employer) });
        }

        if (normalizedStatus === 'hired') {
            fireAndForget('markFirstHireOnce', async () => {
                const job = await Job.findById(application.job).select('location title salaryRange shift');
                await markFirstHireOnce({
                    employerId: application.employer,
                    applicationId: application._id,
                    jobId: application.job,
                    city: job?.location || null,
                });
                await recordLifecycleEvent({
                    eventType: 'APPLICATION_HIRED',
                    employerId: application.employer,
                    workerId: application.worker,
                    jobId: application.job,
                    applicationId: application._id,
                    city: job?.location || 'Hyderabad',
                    roleCluster: job?.title || 'general',
                    salaryBand: normalizeSalaryBand(job?.salaryRange),
                    shift: job?.shift || 'unknown',
                });
                await recordMatchPerformanceMetric({
                    eventName: 'APPLICATION_HIRED',
                    jobId: application.job,
                    workerId: application.worker,
                    applicationId: application._id,
                    city: job?.location || 'Hyderabad',
                    roleCluster: job?.title || 'general',
                    metadata: {
                        source: 'application_controller',
                    },
                });
                await recordJobFillCompletedOnce({
                    jobId: application.job,
                    workerId: application.worker,
                    city: job?.location || 'Hyderabad',
                    roleCluster: job?.title || 'general',
                    metadata: {
                        source: 'application_controller',
                        triggerStatus: 'hired',
                        applicationId: String(application._id),
                    },
                });
            }, { applicationId: String(application._id), employerId: String(application.employer) });
        }

        // Push notification to the candidate side when status changes
        try {
            if (workerProfile?.user) {
                const candidateUser = await User.findById(workerProfile.user).select('pushTokens notificationPreferences');
                await sendPushNotificationForUser(
                    candidateUser,
                    'Application Update',
                    `Your application status is now ${normalizedStatus}.`,
                    { type: 'status', applicationId: application._id.toString() },
                    'application_status'
                );
            }
        } catch (pushError) {
            console.error('Application status push error:', pushError.message);
        }

        res.json(application);

    } catch (error) {
        console.error("Update Status Error:", error);
        res.status(500).json({ message: 'Update failed' });
    }
};

// @desc    Get user's applications
// @route   GET /api/applications
// @access  Private
const getApplications = async (req, res) => {
    try {
        let query = {};
        if (req.user.role === 'recruiter' || req.user.role === 'employer') {
            query = { employer: req.user._id };
        } else {
            const workerProfile = await WorkerProfile.findOne({ user: req.user._id }).select('_id');
            if (!workerProfile?._id) {
                return res.json({
                    success: true,
                    count: 0,
                    total: 0,
                    page: 1,
                    pages: 0,
                    data: []
                });
            }
            query = { worker: workerProfile._id };
        }

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        const applications = await Application.find(query)
            .populate('job', 'title companyName location')
            .populate('worker', 'firstName city totalExperience roleProfiles')
            .populate('employer', 'name') // Populate employer User name
            .sort({ updatedAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await Application.countDocuments(query);

        res.json({
            success: true,
            count: applications.length,
            total,
            page,
            pages: Math.ceil(total / limit),
            data: applications
        });
    } catch (error) {
        console.error("Get Apps Error:", error);
        res.status(500).json({ message: 'Fetch failed' });
    }
};

// @desc    Get Single Application by ID
// @route   GET /api/applications/:id
// @access  Private
const getApplicationById = async (req, res) => {
    try {
        const application = await Application.findById(req.params.id)
            .populate('job', 'title companyName location salaryRange requirements')
            .populate('employer', 'name email industry location phone website') // Added phone and website
            .populate('worker', 'firstName lastName');

        if (!application) {
            return res.status(404).json({ message: 'Application not found' });
        }

        const workerProfile = await WorkerProfile.findById(application.worker).select('user');
        const isEmployer = String(application.employer) === String(req.user._id);
        const isWorker = String(workerProfile?.user) === String(req.user._id);
        if (!isEmployer && !isWorker) {
            return res.status(403).json({ message: 'Not authorized for this application' });
        }

        res.json(application);
    } catch (error) {
        console.error("Get Single App Error:", error);
        res.status(500).json({ message: 'Fetch failed' });
    }
};

module.exports = { sendRequest, updateStatus, getApplications, getApplicationById };
