const express = require('express');
const router = express.Router();
const { getReferralStats, getShareableJobLink, submitReferral } = require('../controllers/growthController');
const { protect } = require('../middleware/authMiddleware');

router.get('/referrals', protect, getReferralStats);
router.post('/referrals', protect, submitReferral);
router.get('/share-link/job/:jobId', protect, getShareableJobLink);

module.exports = router;
