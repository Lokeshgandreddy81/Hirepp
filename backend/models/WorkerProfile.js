const mongoose = require('mongoose');

const workerProfileSchema = mongoose.Schema(
  {
    // Link to the main User account we created in Phase 1
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    // Base Information (Phase 3, Task 13)
    firstName: { type: String, required: true },
    lastName: { type: String },
    city: { type: String, required: true },
    totalExperience: { type: Number, default: 0 },
    preferredShift: {
      type: String,
      enum: ['Day', 'Night', 'Flexible'],
      default: 'Flexible',
    },
    licenses: [{ type: String }],
    lastActiveAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    
    // AI-Extracted Video Data (Phase 3, Task 17)
    // This will be populated by the Gemini extraction logic later
    videoIntroduction: {
      videoUrl: { type: String }, // Path to the webm/mp4 file
      transcript: { type: String }, // Text from Whisper
    },

    // Role-Specific Profiles (Phase 3, Task 14)
    // A worker can have multiple skill sets (e.g., "Cook" and "Maid")
    roleProfiles: [
      {
        roleName: { type: String, required: true }, // e.g., "COOK"
        experienceInRole: { type: Number },
        expectedSalary: { type: Number },
        skills: [{ type: String }], // Array of tags like ["South Indian", "Tiffins"]
        lastUpdated: { type: Date, default: Date.now },
      }
    ],

    // Global settings for matching
    isAvailable: { type: Boolean, default: true },
    interviewVerified: {
      type: Boolean,
      default: false,
      index: true,
    },
    settings: {
      matchPreferences: {
        maxCommuteDistanceKm: { type: Number, default: 25, min: 1, max: 300 },
        salaryExpectationMin: { type: Number, default: null },
        salaryExpectationMax: { type: Number, default: null },
        preferredShiftTimes: {
          type: [String],
          default: [],
        },
        roleClusters: {
          type: [String],
          default: [],
        },
        minimumMatchTier: {
          type: String,
          enum: ['STRONG', 'GOOD', 'POSSIBLE'],
          default: 'GOOD',
        },
      },
    },
  },
  {
    timestamps: true,
  }
);

// Match Engine Optimization: Indexing for fast searches (Phase 5)
workerProfileSchema.index({ city: 1, 'roleProfiles.roleName': 1 });

const WorkerProfile = mongoose.model('WorkerProfile', workerProfileSchema);

module.exports = WorkerProfile;
