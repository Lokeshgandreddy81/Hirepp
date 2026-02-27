const mongoose = require('mongoose');

const matchRunSchema = mongoose.Schema(
    {
        contextType: {
            type: String,
            enum: ['EMPLOYER_MATCH', 'CANDIDATE_MATCH', 'RECOMMENDED_JOBS', 'PROBABILITY_ENDPOINT'],
            required: true,
            index: true,
        },
        workerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'WorkerProfile',
            default: null,
            index: true,
        },
        jobId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Job',
            default: null,
            index: true,
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
            index: true,
        },
        modelVersionUsed: {
            type: String,
            default: null,
            index: true,
        },
        totalJobsConsidered: {
            type: Number,
            default: 0,
        },
        totalMatchesReturned: {
            type: Number,
            default: 0,
        },
        avgScore: {
            type: Number,
            default: 0,
        },
        rejectReasonCounts: {
            type: mongoose.Schema.Types.Mixed,
            default: {},
        },
        metadata: {
            type: mongoose.Schema.Types.Mixed,
            default: {},
        },
    },
    {
        timestamps: true,
    }
);

matchRunSchema.index({ contextType: 1, createdAt: -1 });
matchRunSchema.index({ modelVersionUsed: 1, createdAt: -1 });

module.exports = mongoose.model('MatchRun', matchRunSchema);
