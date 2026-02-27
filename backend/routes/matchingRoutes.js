const express = require('express');
const router = express.Router();
const { getMatchesForEmployer, getMatchesForCandidate, explainMatchController, submitMatchFeedback } = require('../controllers/matchingController');
const { protect } = require('../middleware/authMiddleware');

router.get('/employer/:jobId', protect, getMatchesForEmployer);
router.get('/candidate', protect, getMatchesForCandidate);
router.post('/explain', protect, explainMatchController);
router.post('/feedback', protect, submitMatchFeedback);

module.exports = router;
