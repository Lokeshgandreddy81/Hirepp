const express = require('express');
const router = express.Router();
const { 
    createJob, 
    getJobs,
    getEmployerJobs, 
    suggestRequirements, 
    deleteJob, 
    updateJob 
} = require('../controllers/jobController');

// Ensure both protect and employer are destructured from the middleware file
const { protect, employer } = require('../middleware/authMiddleware');

/**
 * @swagger
 * /api/jobs:
 *   post:
 *     summary: Create a job posting
 *     tags: [Jobs]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               location:
 *                 type: string
 *               salaryRange:
 *                 type: string
 *     responses:
 *       201:
 *         description: Job created
 *       401:
 *         description: Unauthorized
 */
// @route   POST /api/jobs
router.post('/', protect, employer, createJob);
router.get('/', protect, getJobs);

// @route   GET /api/jobs/my-jobs
router.get('/my-jobs', protect, employer, getEmployerJobs);

// @route   POST /api/jobs/suggest
router.post('/suggest', protect, employer, suggestRequirements);

// @route   DELETE /api/jobs/:id
router.delete('/:id', protect, employer, deleteJob);

// @route   PUT /api/jobs/:id
router.put('/:id', protect, employer, updateJob);

module.exports = router;
