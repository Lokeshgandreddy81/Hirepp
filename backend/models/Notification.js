const mongoose = require('mongoose');

const notificationSchema = mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        type: {
            type: String,
            enum: ['match_found', 'application_received', 'message_received', 'status_update', 'interview_ready'],
            required: true
        },
        title: {
            type: String,
            required: true
        },
        message: {
            type: String,
            required: true
        },
        relatedData: {
            jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job' },
            candidateId: { type: mongoose.Schema.Types.ObjectId, ref: 'WorkerProfile' },
            chatId: { type: mongoose.Schema.Types.ObjectId, ref: 'Chat' },
            processingId: { type: mongoose.Schema.Types.ObjectId, ref: 'InterviewProcessingJob' },
            nudgeType: { type: String },
        },
        isRead: {
            type: Boolean,
            default: false
        }
    },
    {
        timestamps: true
    }
);

// Index to quickly fetch unread notifications for a user
notificationSchema.index({ user: 1, isRead: 1 });

const Notification = mongoose.model('Notification', notificationSchema);
module.exports = Notification;
