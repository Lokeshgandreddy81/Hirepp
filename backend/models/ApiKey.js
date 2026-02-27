const mongoose = require('mongoose');

const apiKeySchema = mongoose.Schema({
    employerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    keyPattern: {
        type: String,
        required: true,
        unique: true
        // format: sk_live_... or partner_... hashed in production ideally
    },
    tier: {
        type: String,
        enum: ['free', 'partner', 'enterprise'],
        default: 'free'
    },
    requestsToday: {
        type: Number,
        default: 0
    },
    lastResetDate: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

module.exports = mongoose.model('ApiKey', apiKeySchema);
