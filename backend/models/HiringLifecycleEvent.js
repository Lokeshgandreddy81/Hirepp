const mongoose = require('mongoose');

const hiringLifecycleEventSchema = mongoose.Schema(
    {
        eventType: {
            type: String,
            enum: [
                'INTERVIEW_CONFIRMED',
                'APPLICATION_CREATED',
                'APPLICATION_SHORTLISTED',
                'APPLICATION_HIRED',
                'RETENTION_30D',
            ],
            required: true,
            index: true,
        },
        employerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
        workerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'WorkerProfile',
            default: null,
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
        jobId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Job',
            default: null,
        },
        applicationId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Application',
            default: null,
        },
        city: {
            type: String,
            default: 'Hyderabad',
            index: true,
        },
        roleCluster: {
            type: String,
            default: 'general',
        },
        salaryBand: {
            type: String,
            default: 'unknown',
        },
        shift: {
            type: String,
            default: 'unknown',
        },
        occurredAt: {
            type: Date,
            default: Date.now,
            index: true,
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

hiringLifecycleEventSchema.index({ city: 1, occurredAt: -1, eventType: 1 });
hiringLifecycleEventSchema.index({ eventType: 1, occurredAt: -1 });
hiringLifecycleEventSchema.index({ employerId: 1, occurredAt: -1 });
hiringLifecycleEventSchema.index({ workerId: 1, occurredAt: -1 });
hiringLifecycleEventSchema.index(
    { eventType: 1, applicationId: 1 },
    {
        unique: true,
        partialFilterExpression: {
            eventType: 'RETENTION_30D',
            applicationId: { $type: 'objectId' },
        },
    }
);

module.exports = mongoose.model('HiringLifecycleEvent', hiringLifecycleEventSchema);
