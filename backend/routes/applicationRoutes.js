const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { sendRequest, updateStatus, getApplications, getApplicationById } = require('../controllers/applicationController');

/**
 * @swagger
 * /api/applications/{id}/status:
 *   put:
 *     summary: Update application status
 *     tags: [Applications]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *     responses:
 *       200:
 *         description: Status updated
 *       404:
 *         description: Application not found
 */
router.route('/')
    .post(protect, sendRequest)
    .get(protect, getApplications);

router.route('/:id')
    .get(protect, getApplicationById);

router.route('/:id/status')
    .put(protect, updateStatus);

module.exports = router;
