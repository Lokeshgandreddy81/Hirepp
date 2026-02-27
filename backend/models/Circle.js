const mongoose = require('mongoose');

const circleSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    description: {
        type: String,
        default: '',
        trim: true,
    },
    skill: {
        type: String,
        default: '',
        trim: true,
    },
    location: {
        type: String,
        default: '',
        trim: true,
    },
    members: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    }],
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    isPrivate: {
        type: Boolean,
        default: false,
    },
    avatar: {
        type: String,
        default: '',
    },
}, {
    timestamps: true,
});

circleSchema.index({ createdAt: -1 });
circleSchema.index({ location: 1, skill: 1 });

module.exports = mongoose.model('Circle', circleSchema);
