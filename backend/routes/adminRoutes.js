const express = require('express');
const router = express.Router();
const {
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
} = require('../controllers/adminController');
const { getFeedback } = require('../controllers/betaFeedbackController');
const { protect, admin } = require('../middleware/authMiddleware');

router.get('/stats', protect, admin, getPlatformStats);
router.get('/users', protect, admin, getAllUsers);
router.get('/jobs', protect, admin, getAllJobs);
router.get('/feedback', protect, admin, getFeedback);
router.post('/beta-codes', protect, admin, generateBetaCodes);
router.post('/city-pipeline', protect, admin, createCityPipelineEntry);
router.get('/city-pipeline', protect, admin, getCityPipelineEntries);
router.get('/city-pipeline/summary', protect, admin, getCityPipelineSummary);
router.put('/city-pipeline/:id', protect, admin, updateCityPipelineEntry);
router.get('/match-report', protect, admin, getMatchReport);
router.get('/match-calibration-suggestions', protect, admin, getMatchCalibrationSuggestions);
router.get('/match-performance-alerts', protect, admin, getMatchPerformanceAlertsController);

module.exports = router;
