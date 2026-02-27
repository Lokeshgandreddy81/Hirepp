const BetaFeedback = require('../models/BetaFeedback');

// @desc Submit feedback from the beta testing panel
// @route POST /api/feedback
// @access Private
const submitFeedback = async (req, res) => {
    try {
        const { type, message, screenshotUrl } = req.body;

        if (!type || !message) {
            return res.status(400).json({ message: 'Type and message are required' });
        }

        const feedback = await BetaFeedback.create({
            user: req.user._id,
            type,
            message,
            screenshotUrl
        });

        res.status(201).json({ success: true, data: feedback });
    } catch (error) {
        console.error("Submit Feedback Error:", error);
        res.status(500).json({ message: "Failed to submit feedback" });
    }
};

// @desc Get all feedback for admin dashboard
// @route GET /api/admin/feedback
// @access Private (Admin)
const getFeedback = async (req, res) => {
    try {
        const feedbackList = await BetaFeedback.find()
            .populate('user', 'name email role')
            .sort({ createdAt: -1 });

        res.json({ success: true, count: feedbackList.length, data: feedbackList });
    } catch (error) {
        console.error("Get Feedback Error:", error);
        res.status(500).json({ message: "Failed to load feedback" });
    }
};

module.exports = { submitFeedback, getFeedback };
