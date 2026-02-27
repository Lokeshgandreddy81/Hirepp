const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    text: {
        type: String,
        required: true,
        trim: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
}, { _id: true });

const postSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    type: {
        type: String,
        enum: ['text', 'voice', 'photo', 'video'],
        default: 'text',
    },
    content: {
        type: String,
        default: '',
        trim: true,
    },
    mediaUrl: {
        type: String,
        default: '',
    },
    location: {
        type: {
            type: String,
            enum: ['Point'],
            default: 'Point',
        },
        coordinates: {
            type: [Number],
            default: [0, 0],
        },
    },
    likes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    }],
    comments: [commentSchema],
}, {
    timestamps: true,
});

postSchema.index({ createdAt: -1 });
postSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Post', postSchema);
