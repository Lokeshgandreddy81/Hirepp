const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const AcademyEnrollment = require('../models/AcademyEnrollment');

const DEMO_COURSES = [
    {
        id: 'delivery-driver-certification',
        title: 'Delivery Driver Certification',
        description: 'Essential driving safety and route planning practices for delivery workers.',
        duration: '2 hours',
        skill: 'driving',
        level: 'beginner',
    },
    {
        id: 'construction-safety-basics',
        title: 'Basic Construction Safety',
        description: 'Core site safety fundamentals and hazard awareness for construction roles.',
        duration: '3 hours',
        skill: 'construction',
        level: 'beginner',
    },
    {
        id: 'customer-service-fundamentals',
        title: 'Customer Service Fundamentals',
        description: 'Communication and conflict-resolution techniques for customer-facing work.',
        duration: '1.5 hours',
        skill: 'service',
        level: 'beginner',
    },
    {
        id: 'digital-skills-for-gig-workers',
        title: 'Digital Skills for Gig Workers',
        description: 'Mobile-first productivity and platform usage for gig worker growth.',
        duration: '4 hours',
        skill: 'digital',
        level: 'intermediate',
    },
];

const getCourseById = (courseId) => DEMO_COURSES.find((course) => course.id === courseId);

router.get('/courses', protect, async (req, res) => {
    res.json({ courses: DEMO_COURSES });
});

router.get('/courses/:id', protect, async (req, res) => {
    const course = getCourseById(req.params.id);
    if (!course) {
        return res.status(404).json({ message: 'Course not found' });
    }
    res.json({ course });
});

router.post('/courses/:id/enroll', protect, async (req, res) => {
    const course = getCourseById(req.params.id);
    if (!course) {
        return res.status(404).json({ message: 'Course not found' });
    }

    try {
        const enrollment = await AcademyEnrollment.findOneAndUpdate(
            { user: req.user._id, courseId: course.id },
            { $setOnInsert: { progress: 0 } },
            { upsert: true, new: true }
        );

        res.status(201).json({
            enrollment,
            course,
        });
    } catch (error) {
        res.status(500).json({ message: 'Failed to enroll in course' });
    }
});

router.get('/enrolled', protect, async (req, res) => {
    try {
        const enrollments = await AcademyEnrollment.find({ user: req.user._id }).lean();
        const enrolled = enrollments.map((enrollment) => ({
            ...enrollment,
            course: getCourseById(enrollment.courseId) || null,
        }));

        res.json({ enrolled });
    } catch (error) {
        res.status(500).json({ message: 'Failed to load enrolled courses' });
    }
});

module.exports = router;
