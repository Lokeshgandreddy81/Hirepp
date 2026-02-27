const mongoose = require('mongoose');

const analyticsEventSchema = mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    eventName: {
        type: String, // e.g., 'signup', 'job_posted', 'match_viewed'
        required: true,
        index: true
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed // Flexible storage for event context
    }
}, { timestamps: true });

module.exports = mongoose.model('AnalyticsEvent', analyticsEventSchema);
