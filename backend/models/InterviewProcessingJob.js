const mongoose = require('mongoose');

const interviewProcessingJobSchema = mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        role: {
            type: String,
            enum: ['worker', 'employer'],
            required: true,
        },
        videoUrl: {
            type: String,
            required: true,
        },
        videoHash: {
            type: String,
            required: true,
            index: true,
        },
        idempotencyKey: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        status: {
            type: String,
            enum: ['pending', 'processing', 'completed', 'failed'],
            default: 'pending',
            index: true,
        },
        extractedData: {
            type: mongoose.Schema.Types.Mixed,
            default: null,
        },
        createdJobId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Job',
            default: null,
        },
        errorMessage: {
            type: String,
            default: null,
        },
        rawMetrics: {
            videoDuration: { type: Number, default: null },
            transcriptWordCount: { type: Number, default: null },
            confidenceScore: { type: Number, default: null },
        },
        startedAt: {
            type: Date,
            default: null,
        },
        completedAt: {
            type: Date,
            default: null,
        },
        notificationSentAt: {
            type: Date,
            default: null,
        },
        profileConfirmedAt: {
            type: Date,
            default: null,
        },
        jobConfirmedAt: {
            type: Date,
            default: null,
        },
        signalFinalizedAt: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
        collection: 'interview_processing_jobs',
    }
);

interviewProcessingJobSchema.index({ userId: 1, createdAt: -1 });
interviewProcessingJobSchema.index({ status: 1 });
interviewProcessingJobSchema.index({ createdAt: 1 });
interviewProcessingJobSchema.index(
    { completedAt: 1 },
    {
        expireAfterSeconds: 30 * 24 * 60 * 60,
        partialFilterExpression: { status: 'failed', completedAt: { $type: 'date' } },
    }
);

module.exports = mongoose.model('InterviewProcessingJob', interviewProcessingJobSchema);
