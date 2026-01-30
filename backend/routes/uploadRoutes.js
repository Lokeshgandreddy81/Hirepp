const express = require('express');
const router = express.Router();
const multer = require('multer');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');
const { extractWorkerDataFromAudio } = require('../services/geminiService');
const WorkerProfile = require('../models/WorkerProfile');
const EmployerProfile = require('../models/EmployerProfile');
const Job = require('../models/Job');
const User = require('../models/userModel');
const { protect } = require('../middleware/authMiddleware');

const upload = multer({ dest: path.join(__dirname, '../uploads/') });

router.get('/test', (req, res) => res.send('Upload route is reachable on 5001'));

router.post('/video', protect, upload.single('video'), async (req, res) => {
    if (!req.file) return res.status(400).json({ message: "No video file provided" });

    const videoPath = req.file.path;
    const audioPath = path.join('uploads', `${req.file.filename}.mp3`);

    try {
        // 1. Extract Audio using FFmpeg (Stripping video for Gemini speed)
        await new Promise((resolve, reject) => {
            ffmpeg(videoPath)
                .toFormat('mp3')
                .on('end', resolve)
                .on('error', reject)
                .save(audioPath);
        });

        // 2. Process with Gemini 1.5 Flash
        const aiData = await extractWorkerDataFromAudio(audioPath);

        // Normalize data: If AI returned an array, use the first item
        const rawData = Array.isArray(aiData) ? aiData[0] : aiData;
        console.log("Raw AI Data:", rawData);

        // Sanitize Data (Remove commas, handle N/A)
        const totalExperience = isNaN(parseInt(rawData.totalExperience)) ? 0 : parseInt(rawData.totalExperience);
        const expectedSalary = rawData.expectedSalary ? parseInt(String(rawData.expectedSalary).replace(/,/g, '')) : 0; // Handle "20,000"

        // Helper to parse skills
        let parsedSkills = [];
        if (Array.isArray(rawData.skills)) {
            parsedSkills = rawData.skills;
        } else if (typeof rawData.skills === 'string') {
            parsedSkills = rawData.skills.split(',').map(s => s.trim()).filter(Boolean);
        }

        const dataToSave = {
            firstName: rawData.firstName || "Unknown",
            city: rawData.city || "Unknown",
            totalExperience: totalExperience,
            roleName: rawData.roleName || "General",
            expectedSalary: isNaN(expectedSalary) ? 0 : expectedSalary,
            skills: parsedSkills
        };
        console.log("Sanitized Data:", dataToSave);

        // 3. Save based on User Role
        let savedProfile;

        if (req.user.role === 'recruiter' || req.user.role === 'employer') {
            // Employer Logic
            savedProfile = await EmployerProfile.findOneAndUpdate(
                { user: req.user._id },
                {
                    $set: {
                        companyName: (dataToSave.firstName && dataToSave.firstName !== 'Unknown') ? dataToSave.firstName : "My Company",
                        location: (dataToSave.city && dataToSave.city !== 'Unknown') ? dataToSave.city : "Remote",
                        videoIntroduction: {
                            videoUrl: `http://localhost:5001/${videoPath}`,
                            transcript: "Video processed by Gemini AI"
                        }
                    }
                },
                { upsert: true, new: true, setDefaultsOnInsert: true }
            );

            // If the profile didn't exist, we might fail on 'required' fields like companyName if we don't provide them.
            // But we don't have them from Gemini!
            // Solution: User should use EmployerProfileCreateScreen FIRST, then Video?
            // User said: "as an employer i just record the video ... profile is not cretaed".
            // Maybe we create a skeleton profile?
            if (!savedProfile) {
                savedProfile = await EmployerProfile.create({
                    user: req.user._id,
                    companyName: dataToSave.firstName || "New Employer",
                    location: dataToSave.city || "Unknown",
                    videoIntroduction: {
                        videoUrl: `http://localhost:5001/${videoPath}`,
                        transcript: "Video processed by Gemini AI"
                    }
                });
            }

            // --- NEW: AUTOMATICALLY CREATE A JOB POSTING ---
            const jobTitle = dataToSave.roleName && dataToSave.roleName !== 'General' ? dataToSave.roleName : "Open Position";
            const companyName = savedProfile.companyName && savedProfile.companyName !== 'Unknown' ? savedProfile.companyName : "My Company";

            console.log(`📝 Creating Job: "${jobTitle}" at "${companyName}"`);

            const newJob = await Job.create({
                employerId: req.user._id,
                title: jobTitle,
                companyName: companyName,
                location: savedProfile.location || dataToSave.city || "Remote", // Robust fallback
                salaryRange: dataToSave.expectedSalary ? `${dataToSave.expectedSalary}` : "Negotiable",
                requirements: Array.isArray(dataToSave.skills) ? dataToSave.skills : [],
                isOpen: true
            });
            console.log("✅ Job Created via Video:", newJob._id);

        } else {
            // Worker Logic (Existing)
            savedProfile = await WorkerProfile.findOneAndUpdate(
                { user: req.user._id },
                {
                    $set: {
                        firstName: dataToSave.firstName,
                        city: dataToSave.city,
                        totalExperience: dataToSave.totalExperience,
                        videoIntroduction: {
                            videoUrl: `http://localhost:5001/${videoPath}`, // Serve static file
                            transcript: "Video processed by Gemini AI"
                        }
                    },
                    $push: {
                        roleProfiles: {
                            roleName: dataToSave.roleName,
                            experienceInRole: dataToSave.totalExperience,
                            expectedSalary: dataToSave.expectedSalary,
                            skills: dataToSave.skills
                        }
                    }
                },
                { upsert: true, new: true }
            );
        }
        console.log("Database Response:", savedProfile);

        // 4. Update Onboarding Flag
        await User.findByIdAndUpdate(req.user._id, { hasCompletedProfile: true });

        // Cleanup files
        fs.unlinkSync(audioPath);
        // Note: We keep videoPath so the recruiter can watch the video later

        res.status(200).json({ success: true, profile: savedProfile });

    } catch (error) {
        console.error("Pipeline Error:", error);
        if (fs.existsSync(audioPath)) fs.unlinkSync(audioPath);
        res.status(500).json({ message: "Error processing video", error: error.message });
    }
});

module.exports = router;