const mongoose = require('mongoose');

const employerProfileSchema = mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: 'User',
        },
        companyName: {
            type: String,
            required: true
        },
        industry: {
            type: String
        },
        location: {
            type: String,
            required: true
        },
        logoUrl: {
            type: String
        },
        videoIntroduction: {
            videoUrl: { type: String },
            transcript: { type: String }
        },
        website: {
            type: String
        }
    },
    {
        timestamps: true,
    }
);

const EmployerProfile = mongoose.model('EmployerProfile', employerProfileSchema);

module.exports = EmployerProfile;
