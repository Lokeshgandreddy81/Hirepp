const mongoose = require('mongoose');

const academyEnrollmentSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    courseId: {
        type: String,
        required: true,
        trim: true,
    },
    progress: {
        type: Number,
        default: 0,
        min: 0,
        max: 100,
    },
}, {
    timestamps: true,
});

academyEnrollmentSchema.index({ user: 1, courseId: 1 }, { unique: true });

module.exports = mongoose.model('AcademyEnrollment', academyEnrollmentSchema);
