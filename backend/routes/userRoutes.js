const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const WorkerProfile = require('../models/WorkerProfile');
const User = require('../models/userModel');
const InterviewProcessingJob = require('../models/InterviewProcessingJob');
const {
    markProfileConfirmed,
    finalizeInterviewSignalIfEligible,
} = require('../services/interviewProcessingService');
const { publishMetric } = require('../services/metricsService');
const {
    fireAndForget,
    recordLifecycleEvent,
    normalizeSalaryBand,
} = require('../services/revenueInstrumentationService');
// Import all controllers properly
const { registerUser, authUser, forgotPassword, resetPassword, verifyEmail, resendVerificationEmail, exportUserData, deleteUserAccount } = require('../controllers/userController');

/**
 * @swagger
 * /api/users/login:
 *   post:
 *     summary: Authenticate user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: JWT token returned
 *       401:
 *         description: Invalid credentials
 */
router.post('/register', registerUser);
router.post('/login', authUser);
router.post('/forgotpassword', forgotPassword);
router.put('/resetpassword/:resettoken', resetPassword);
router.put('/verifyemail/:verificationtoken', verifyEmail);
router.post('/resendverification', resendVerificationEmail);

router.get('/export', protect, exportUserData);
router.delete('/delete', protect, deleteUserAccount);

// GET /api/users/profile - Fetch logged-in user's profile
router.get('/profile', protect, async (req, res) => {
    try {
        let profile;
        const isEmployer = req.user.role === 'recruiter' || req.user.role === 'employer' || req.user.primaryRole === 'employer';
        if (isEmployer) {
            const EmployerProfile = require('../models/EmployerProfile');
            profile = await EmployerProfile.findOne({ user: req.user._id });
        } else {
            profile = await WorkerProfile.findOne({ user: req.user._id });
        }

        if (!profile) {
            // Return empty structure to avoid frontend crashes
            return res.status(200).json({ profile: { roleProfiles: [] } });
        }
        res.json({ profile });
    } catch (error) {
        console.error("GET Profile Error:", error);
        res.status(500).json({ message: "Server Error" });
    }
});

// PUT /api/users/profile - Update logged-in user's profile
router.put('/profile', protect, async (req, res) => {
    try {
        let profile;
        const { processingId, ...profilePayload } = req.body || {};
        const isEmployer = req.user.role === 'recruiter' || req.user.role === 'employer' || req.user.primaryRole === 'employer';
        const completedWorkerInterview = !isEmployer && processingId
            ? await InterviewProcessingJob.findOne({
                _id: processingId,
                userId: req.user._id,
                status: 'completed',
                role: 'worker',
            }).select('_id')
            : null;

        if (isEmployer) {
            const EmployerProfile = require('../models/EmployerProfile');
            profile = await EmployerProfile.findOneAndUpdate(
                { user: req.user._id },
                { $set: profilePayload },
                { new: true, upsert: true }
            );
        } else {
            const workerUpdatePayload = {
                ...profilePayload,
                ...(completedWorkerInterview ? { interviewVerified: true } : {}),
            };
            profile = await WorkerProfile.findOneAndUpdate(
                { user: req.user._id },
                { $set: workerUpdatePayload },
                { new: true, upsert: true }
            );
        }

        if (processingId || profilePayload.hasCompletedProfile) {
            await User.findByIdAndUpdate(req.user._id, { hasCompletedProfile: true });
        }

        let signalFinalized = false;
        if (processingId) {
            await markProfileConfirmed({ processingId, userId: req.user._id });

            if (!isEmployer) {
                const primaryRole = Array.isArray(profile?.roleProfiles) && profile.roleProfiles.length > 0
                    ? profile.roleProfiles[0]
                    : null;
                fireAndForget('recordInterviewConfirmedLifecycle', () => recordLifecycleEvent({
                    eventType: 'INTERVIEW_CONFIRMED',
                    userId: req.user._id,
                    workerId: profile?._id || null,
                    city: profile?.city || req.user?.acquisitionCity || 'Hyderabad',
                    roleCluster: primaryRole?.roleName || profilePayload?.roleTitle || 'general',
                    salaryBand: normalizeSalaryBand(primaryRole?.expectedSalary ? String(primaryRole.expectedSalary) : profilePayload?.expectedSalary || ''),
                    shift: primaryRole?.preferredShift || profilePayload?.preferredShift || 'unknown',
                    metadata: {
                        processingId: String(processingId),
                    },
                }), { userId: String(req.user._id), processingId: String(processingId) });
            }

            const finalizeResult = await finalizeInterviewSignalIfEligible({
                processingId,
                userId: req.user._id,
            });
            signalFinalized = Boolean(finalizeResult?.finalized);
            console.log(JSON.stringify({
                event: 'profile_confirmed_from_interview',
                correlationId: String(processingId),
                userId: String(req.user._id),
                signalFinalized,
            }));
            await publishMetric({
                metricName: 'ConfirmCompletionRate',
                value: signalFinalized ? 1 : 0,
                role: isEmployer ? 'employer' : 'worker',
                correlationId: String(processingId),
            });
        }

        res.json({ profile, signalFinalized });
    } catch (error) {
        console.error("PUT Profile Error:", error);
        res.status(500).json({ message: "Server Error" });
    }
});

module.exports = router;
