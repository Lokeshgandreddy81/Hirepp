const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/userModel');

// Helper function to generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

// @desc    Register a new user
// @route   POST /api/users/register
// @access  Public
const registerUser = async (req, res) => {
  const { name, email, role, password } = req.body;
  const crypto = require('crypto');

  try {
    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Generate Verification Token
    const verificationToken = crypto.randomBytes(20).toString('hex');

    const user = await User.create({
      name,
      email,
      role: role || 'candidate',
      password,
      verificationToken,
    });

    if (user) {
      // Send Verification Email
      const verifyUrl = `http://localhost:5001/api/users/verifyemail/${verificationToken}`;
      const message = `Please confirm your email by clicking here: \n\n ${verifyUrl}`;

      try {
        const sendEmail = require('../utils/sendEmail');
        await sendEmail({
          email: user.email,
          subject: 'Email Verification',
          message,
        });
      } catch (err) {
        console.error('Verification email failed', err);
        // We still allow registration, but user is not verified.
      }

      res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        token: generateToken(user._id),
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ... authUser is unchanged ...

// @desc    Verify Email
// @route   PUT /api/users/verifyemail/:verificationtoken
// @access  Public
const verifyEmail = async (req, res) => {
  const verificationToken = req.params.verificationtoken;

  try {
    const user = await User.findOne({ verificationToken });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or Expired Token' });
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    await user.save();

    res.status(200).json({ success: true, data: 'Email Verified' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ... forgotPassword and resetPassword unchanged ...



// @desc    Auth user & get token (LOGIN)
// @route   POST /api/users/login
// @access  Public
const authUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });

    if (user && (await user.matchPassword(password))) {
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified, // Include verification status
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ... forgotPassword and resetPassword unchanged ...

// @desc    Resend Verification Email
// @route   POST /api/users/resendverification
// @access  Public
const resendVerificationEmail = async (req, res) => {
  const { email } = req.body;
  const crypto = require('crypto');

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: 'User already verified' });
    }

    // Generate new token
    const verificationToken = crypto.randomBytes(20).toString('hex');
    user.verificationToken = verificationToken;
    await user.save();

    // Send Verification Email
    const verifyUrl = `http://localhost:5001/api/users/verifyemail/${verificationToken}`;
    const message = `Please confirm your email by clicking here: \n\n ${verifyUrl}`;

    try {
      const sendEmail = require('../utils/sendEmail');
      await sendEmail({
        email: user.email,
        subject: 'Email Verification',
        message,
      });
      res.status(200).json({ success: true, data: 'Verification email sent' });
    } catch (err) {
      console.error('Verification email failed', err);
      return res.status(500).json({ message: 'Email could not be sent' });
    }

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// CRUCIAL: This exports the functions so routes can use them
module.exports = { registerUser, authUser, forgotPassword, resetPassword, verifyEmail, resendVerificationEmail };