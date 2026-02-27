const mongoose = require('mongoose');

const referralSchema = new mongoose.Schema({
    referrer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    job: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Job',
        required: true,
    },
    candidateName: {
        type: String,
        default: '',
        trim: true,
    },
    candidateContact: {
        type: String,
        default: '',
        trim: true,
    },
    status: {
        type: String,
        enum: ['pending', 'completed', 'rejected'],
        default: 'pending',
    },
    reward: {
        type: Number,
        default: 0,
    },
}, {
    timestamps: true,
});

referralSchema.index({ referrer: 1, createdAt: -1 });

module.exports = mongoose.model('Referral', referralSchema);
