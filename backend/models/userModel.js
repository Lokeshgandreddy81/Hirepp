const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = mongoose.Schema(
  {
    // --- NEW FIELDS START ---
    name: {
      type: String,
      required: true, // Name is now mandatory
    },
    role: {
      type: String,
      enum: ['candidate', 'recruiter'], // Strictly these two options
      default: 'candidate',
    },
    primaryRole: {
      type: String,
      enum: ['worker', 'employer'],
      default: function () {
        const rawRole = String(this.role || '').toLowerCase();
        return rawRole === 'recruiter' || rawRole === 'employer' ? 'employer' : 'worker';
      },
    },
    hasCompletedProfile: {
      type: Boolean,
      default: false,
    },
    // --- NEW FIELDS END ---

    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    otpCode: {
      type: String,
    },
    otpExpiry: {
      type: Date,
    },
    pushTokens: [{
      type: String,
    }],
    verificationToken: String,
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    loginAttempts: {
      type: Number,
      required: true,
      default: 0
    },
    lockUntil: {
      type: Number
    },
    // --- STRIPE & BILLING ---
    subscription: {
      plan: {
        type: String,
        enum: ['free', 'pro', 'enterprise'],
        default: 'free'
      },
      stripeCustomerId: String,
      stripeSubscriptionId: String,
      credits: {
        type: Number,
        default: 3 // Give 3 free credits on signup
      }
    },
    // --- MARKETING & REFERRAL ---
    referralCode: {
      type: String,
      unique: true,
      sparse: true // Allows nulls while enforcing uniqueness for non-nulls
    },
    referredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },

    // Enterprise Features
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization'
    },
    orgRole: {
      type: String,
      enum: ['admin', 'hiring_manager', 'recruiter', 'viewer'],
      default: 'viewer'
    }
  },
  {
    timestamps: true,
  }
);

// (The encryption logic below is unchanged from your original team code)
userSchema.pre('save', async function () {
  if (!this.primaryRole) {
    const rawRole = String(this.role || '').toLowerCase();
    this.primaryRole = rawRole === 'recruiter' || rawRole === 'employer' ? 'employer' : 'worker';
  }

  if (!this.isModified('password')) {
    return;
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Generate and hash password token
userSchema.methods.getResetPasswordToken = function () {
  const crypto = require('crypto');
  // Generate token
  const resetToken = crypto.randomBytes(20).toString('hex');

  // Hash token and set to resetPasswordToken field
  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  // Set expire (e.g., 10 minutes)
  this.resetPasswordExpire = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
