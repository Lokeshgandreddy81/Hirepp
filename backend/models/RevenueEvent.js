const mongoose = require('mongoose');

const revenueEventSchema = mongoose.Schema(
    {
        employerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        eventType: {
            type: String,
            enum: ['subscription_charge', 'boost_purchase'],
            required: true,
            index: true,
        },
        amountInr: {
            type: Number,
            required: true,
        },
        currency: {
            type: String,
            default: 'inr',
        },
        status: {
            type: String,
            enum: ['succeeded', 'failed'],
            default: 'succeeded',
            index: true,
        },
        city: {
            type: String,
            default: 'Hyderabad',
            index: true,
        },
        jobId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Job',
            default: null,
        },
        stripeSessionId: {
            type: String,
            default: null,
            index: true,
        },
        stripeSubscriptionId: {
            type: String,
            default: null,
        },
        settledAt: {
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

revenueEventSchema.index({ city: 1, settledAt: -1, status: 1 });
revenueEventSchema.index({ stripeSessionId: 1, eventType: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('RevenueEvent', revenueEventSchema);
