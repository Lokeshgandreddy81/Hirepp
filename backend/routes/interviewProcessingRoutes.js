const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const InterviewProcessingJob = require('../models/InterviewProcessingJob');

const router = express.Router();

router.get('/latest', protect, async (req, res) => {
    try {
        const latest = await InterviewProcessingJob.findOne({
            userId: req.user._id,
            status: { $in: ['pending', 'processing'] },
        })
            .sort({ createdAt: -1 })
            .select('_id status');

        if (!latest) {
            return res.json({ processingId: null, status: null });
        }

        return res.json({
            processingId: latest._id,
            status: latest.status,
        });
    } catch (error) {
        console.error('Interview latest status error:', error.message);
        return res.status(500).json({ message: 'Failed to fetch latest interview processing status.' });
    }
});

router.get('/:id', protect, async (req, res) => {
    try {
        const processingJob = await InterviewProcessingJob.findOne({
            _id: req.params.id,
            userId: req.user._id,
        }).select('status extractedData createdJobId errorMessage');

        if (!processingJob) {
            return res.status(404).json({ message: 'Interview processing job not found.' });
        }

        return res.json({
            status: processingJob.status,
            extractedData: processingJob.extractedData || null,
            createdJobId: processingJob.createdJobId || null,
            errorMessage: processingJob.errorMessage || null,
        });
    } catch (error) {
        console.error('Interview processing status error:', error.message);
        return res.status(500).json({ message: 'Failed to fetch interview processing status.' });
    }
});

module.exports = router;
