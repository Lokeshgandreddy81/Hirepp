const User = require('../models/userModel');
const Job = require('../models/Job');
const Referral = require('../models/Referral');

// @desc Get user's referral stats
// @route GET /api/growth/referrals
const getReferralStats = async (req, res) => {
    try {
        const user = req.user;

        // Find users who used this user's referral code.
        const referredUsers = await User.find({ referredBy: user._id }).select('name createdAt role');
        const referrals = await Referral.find({ referrer: user._id })
            .sort({ createdAt: -1 })
            .populate('job', 'title companyName')
            .lean();

        const totalEarnings = referrals
            .filter((item) => item.status === 'completed')
            .reduce((sum, item) => sum + Number(item.reward || 0), 0);

        res.json({
            referralCode: user.referralCode,
            totalReferred: referredUsers.length,
            creditsEarned: user.credits || 0,
            totalEarnings,
            referredUsers,
            referrals,
        });
    } catch (error) {
        console.error("Referral Stats Error:", error);
        res.status(500).json({ message: "Failed to load referral stats" });
    }
};

// @desc Submit a referral for a specific job
// @route POST /api/growth/referrals
const submitReferral = async (req, res) => {
    try {
        const { jobId, candidateName = '', candidateContact = '' } = req.body || {};
        if (!jobId) {
            return res.status(400).json({ message: 'jobId is required' });
        }

        const job = await Job.findById(jobId).select('_id');
        if (!job) {
            return res.status(404).json({ message: 'Job not found' });
        }

        const reward = Number(req.body?.reward || 0) || 0;
        const referral = await Referral.create({
            referrer: req.user._id,
            job: job._id,
            candidateName,
            candidateContact,
            reward,
            status: 'pending',
        });

        res.status(201).json({ referral });
    } catch (error) {
        console.error("Submit Referral Error:", error);
        res.status(500).json({ message: "Failed to submit referral" });
    }
};

// @desc Generate shareable link for a job
// @route GET /api/growth/share-link/job/:jobId
const getShareableJobLink = async (req, res) => {
    try {
        const { jobId } = req.params;
        const job = await Job.findById(jobId);

        if (!job) return res.status(404).json({ message: "Job not found" });

        // Generate a UTM-tracked link
        // Base link would point to the NextJS marketing/web app
        const baseUrl = process.env.WEB_URL || 'https://hireapp.com';
        const shareLink = `${baseUrl}/jobs/${jobId}?utm_source=user_share&utm_medium=app&utm_campaign=viral_loop`;

        res.json({
            jobId,
            shareLink,
            preview: {
                title: job.title,
                company: job.companyName,
                ogImageUrl: `${baseUrl}/api/og?title=${encodeURIComponent(job.title)}` // Hypothetical NextJS Edge OG generator
            }
        });

    } catch (error) {
        console.error("Shareable Link Error:", error);
        res.status(500).json({ message: "Failed to generate share link" });
    }
}

module.exports = {
    getReferralStats,
    getShareableJobLink,
    submitReferral,
};
