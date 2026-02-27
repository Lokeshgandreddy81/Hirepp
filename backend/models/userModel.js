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
    phoneNumber: {
      type: String,
      default: null,
    },
    city: {
      type: String,
      default: null,
    },
    isExperimentUser: {
      type: Boolean,
      default: false,
      index: true,
    },
    notificationPreferences: {
      pushEnabled: { type: Boolean, default: true },
      smsEnabled: { type: Boolean, default: false },
      emailEnabled: { type: Boolean, default: true },
      notifyNewJobRecommendations: { type: Boolean, default: true },
      notifyInterviewReady: { type: Boolean, default: true },
      notifyApplicationStatus: { type: Boolean, default: true },
      notifyPromotions: { type: Boolean, default: true },
      notifyMatch: { type: Boolean, default: true },
      notifyApplication: { type: Boolean, default: true },
      notifyHire: { type: Boolean, default: true },
    },
    privacyPreferences: {
      profileVisibleToEmployers: { type: Boolean, default: true },
      showSalaryExpectation: { type: Boolean, default: true },
      showInterviewBadge: { type: Boolean, default: true },
      showLastActive: { type: Boolean, default: true },
      allowLocationSharing: { type: Boolean, default: true },
      locationVisibilityRadiusKm: { type: Number, default: 25, min: 1, max: 200 },
    },
    featureToggles: {
      FEATURE_MATCH_UI_V1: { type: Boolean, default: true },
      FEATURE_PROBABILISTIC_MATCH: { type: Boolean, default: true },
      FEATURE_COLD_START_BOOST_SUGGESTIONS: { type: Boolean, default: false },
      FEATURE_MATCH_ALERTS: { type: Boolean, default: true },
      FEATURE_SETTINGS_ADVANCED: { type: Boolean, default: false },
      FEATURE_DETAILED_JOB_ANALYTICS: { type: Boolean, default: false },
      FEATURE_SMART_PUSH_TIMING: { type: Boolean, default: false },
    },
    securitySettings: {
      twoFactorEnabled: { type: Boolean, default: false },
      twoFactorMethod: {
        type: String,
        enum: ['sms', 'email'],
        default: 'email',
      },
    },
    linkedAccounts: {
      google: { type: Boolean, default: false },
      apple: { type: Boolean, default: false },
      emailPassword: { type: Boolean, default: true },
    },
    exportRequests: [
      {
        requestType: {
          type: String,
          enum: ['settings_data_export', 'job_history_export', 'interview_history_export'],
          default: 'settings_data_export',
        },
        status: {
          type: String,
          enum: ['pending', 'ready', 'failed'],
          default: 'pending',
        },
        requestedAt: { type: Date, default: Date.now },
        readyAt: { type: Date, default: null },
        expiresAt: { type: Date, default: null },
        downloadUrl: { type: String, default: null },
        error: { type: String, default: null },
      },
    ],
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: {
      type: Date,
      default: null,
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
      },
      billingPeriod: {
        type: String,
        enum: ['monthly', 'yearly', 'none'],
        default: 'none',
      },
      nextBillingDate: {
        type: Date,
        default: null,
      },
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
    acquisitionSource: {
      type: String,
      enum: ['camp', 'referral', 'organic', 'circle', 'unknown'],
      default: 'unknown',
      index: true,
    },
    acquisitionCity: {
      type: String,
      default: null,
      index: true,
    },
    acquisitionCampaign: {
      type: String,
      default: null,
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
