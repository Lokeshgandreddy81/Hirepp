const express = require('express');
const router = express.Router();
const {
    getEmployerHiringFunnel,
    getEmployerJobPerformance,
    getCohorts,
    getLTVPrediction,
    getExecutiveDashboard,
    getEmployerFillRateMeter,
    getCityHiringQuality,
    getRevenueLoops,
    getMatchQualityOverview,
    getMatchQualityDetail,
} = require('../controllers/analyticsController');
const { trackEvent } = require('../controllers/eventController');
const { protect } = require('../middleware/authMiddleware');

router.get('/employer/:employerId/hiring-funnel', protect, getEmployerHiringFunnel);
router.get('/employer/:employerId/job-performance', protect, getEmployerJobPerformance);
router.get('/employer/:employerId/fill-rate-meter', protect, getEmployerFillRateMeter);
router.get('/city-hiring-quality', protect, getCityHiringQuality);
router.get('/revenue-loops', protect, getRevenueLoops);
router.get('/match-quality-overview', protect, getMatchQualityOverview);
router.get('/match-quality-detail', protect, getMatchQualityDetail);
router.get('/cohorts', protect, getCohorts);
router.get('/ltv/:userId', protect, getLTVPrediction);
router.get('/executive-dashboard', protect, getExecutiveDashboard);

router.post('/track', protect, trackEvent);

module.exports = router;
