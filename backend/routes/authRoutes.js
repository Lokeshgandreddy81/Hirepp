const express = require('express');
const router = express.Router();
const User = require('../models/userModel');
const sendEmail = require('../utils/sendEmail');

router.post('/send-otp', async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ message: 'Email is required' });
    }

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const code = Math.floor(100000 + Math.random() * 900000).toString();
        user.otpCode = code;
        user.otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
        await user.save({ validateBeforeSave: false });

        await sendEmail({
            email,
            subject: 'Your HireCircle verification code',
            message: `Your verification code is ${code}. It will expire in 10 minutes.`,
        });

        return res.json({ message: 'OTP sent to your email' });
    } catch (error) {
        console.error('Send OTP Error:', error.message);
        return res.status(500).json({ message: 'Failed to send OTP' });
    }
});

router.post('/verify-otp', async (req, res) => {
    const { email, otp } = req.body;

    if (!email || !otp) {
        return res.status(400).json({ message: 'Email and OTP are required' });
    }

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const isValid = user.otpCode === otp && user.otpExpiry && user.otpExpiry.getTime() > Date.now();
        if (!isValid) {
            return res.status(400).json({ message: 'Invalid or expired code' });
        }

        user.isEmailVerified = true;
        user.otpCode = undefined;
        user.otpExpiry = undefined;
        await user.save({ validateBeforeSave: false });

        return res.json({ message: 'Email verified successfully' });
    } catch (error) {
        console.error('Verify OTP Error:', error.message);
        return res.status(500).json({ message: 'Failed to verify OTP' });
    }
});

module.exports = router;
