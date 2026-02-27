const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const Job = require('../models/Job');

router.get('/', protect, async (req, res) => {
    try {
        const pulseItems = await Job.find({
            isPulse: true,
            isOpen: true,
        })
            .sort({ createdAt: -1 })
            .limit(20)
            .lean();

        res.json({ items: pulseItems });
    } catch (error) {
        res.status(500).json({ message: 'Failed to load pulse items' });
    }
});

module.exports = router;
