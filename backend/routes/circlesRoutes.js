const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const Circle = require('../models/Circle');
const CirclePost = require('../models/CirclePost');

router.get('/', protect, async (req, res) => {
    try {
        const circles = await Circle.find({}).sort({ createdAt: -1 }).lean();
        res.json({ circles });
    } catch (error) {
        res.status(500).json({ message: 'Failed to load circles' });
    }
});

router.get('/my', protect, async (req, res) => {
    try {
        const circles = await Circle.find({ members: req.user._id }).sort({ createdAt: -1 }).lean();
        res.json({ circles });
    } catch (error) {
        res.status(500).json({ message: 'Failed to load joined circles' });
    }
});

router.post('/', protect, async (req, res) => {
    try {
        const { name, description = '', skill = '', location = '', isPrivate = false, avatar = '' } = req.body || {};
        if (!name || !String(name).trim()) {
            return res.status(400).json({ message: 'Circle name is required' });
        }

        const created = await Circle.create({
            name: String(name).trim(),
            description,
            skill,
            location,
            isPrivate,
            avatar,
            createdBy: req.user._id,
            members: [req.user._id],
        });

        res.status(201).json({ circle: created });
    } catch (error) {
        res.status(500).json({ message: 'Failed to create circle' });
    }
});

router.post('/:id/join', protect, async (req, res) => {
    try {
        const circle = await Circle.findById(req.params.id);
        if (!circle) {
            return res.status(404).json({ message: 'Circle not found' });
        }

        const isMember = circle.members.some((memberId) => String(memberId) === String(req.user._id));
        if (!isMember) {
            circle.members.push(req.user._id);
            await circle.save();
        }

        res.json({
            joined: true,
            memberCount: circle.members.length,
        });
    } catch (error) {
        res.status(500).json({ message: 'Failed to join circle' });
    }
});

router.get('/:id/posts', protect, async (req, res) => {
    try {
        const circle = await Circle.findById(req.params.id).select('_id');
        if (!circle) {
            return res.status(404).json({ message: 'Circle not found' });
        }

        const posts = await CirclePost.find({ circle: req.params.id })
            .sort({ createdAt: -1 })
            .limit(100)
            .populate('user', 'name primaryRole')
            .lean();

        res.json({ posts });
    } catch (error) {
        res.status(500).json({ message: 'Failed to load circle posts' });
    }
});

router.post('/:id/posts', protect, async (req, res) => {
    try {
        const circle = await Circle.findById(req.params.id);
        if (!circle) {
            return res.status(404).json({ message: 'Circle not found' });
        }

        const text = String(req.body?.text || '').trim();
        if (!text) {
            return res.status(400).json({ message: 'Post text is required' });
        }

        const post = await CirclePost.create({
            circle: circle._id,
            user: req.user._id,
            text,
        });

        const populated = await CirclePost.findById(post._id).populate('user', 'name primaryRole').lean();
        res.status(201).json({ post: populated });
    } catch (error) {
        res.status(500).json({ message: 'Failed to create circle post' });
    }
});

module.exports = router;
