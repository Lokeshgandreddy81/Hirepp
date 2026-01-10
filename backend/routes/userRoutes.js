const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const WorkerProfile = require('../models/WorkerProfile');
// Import all controllers properly
const { registerUser, authUser, forgotPassword, resetPassword, verifyEmail, resendVerificationEmail } = require('../controllers/userController');

router.post('/register', registerUser);
router.post('/login', authUser);
router.post('/forgotpassword', forgotPassword);
router.put('/resetpassword/:resettoken', resetPassword);
router.put('/verifyemail/:verificationtoken', verifyEmail);
router.post('/resendverification', resendVerificationEmail);

// GET /api/users/profile - Fetch logged-in user's profile
router.get('/profile', protect, async (req, res) => {
    try {
        const profile = await WorkerProfile.findOne({ user: req.user._id });
        if (!profile) {
            return res.status(200).json({ profile: { roleProfiles: [] } });
        }
        res.json({ profile });
    } catch (error) {
        res.status(500).json({ message: "Server Error" });
    }
});

// PUT /api/users/profile - Update logged-in user's profile
router.put('/profile', protect, async (req, res) => {
    try {
        const profile = await WorkerProfile.findOneAndUpdate(
            { user: req.user._id },
            { $set: req.body },
            { new: true }
        );
        res.json({ profile });
    } catch (error) {
        res.status(500).json({ message: "Server Error" });
    }
});

module.exports = router;