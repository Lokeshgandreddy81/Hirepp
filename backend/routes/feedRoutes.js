const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const Post = require('../models/Post');

const normalizeNumber = (value, fallback) => {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

router.get('/posts', protect, async (req, res) => {
    try {
        const page = normalizeNumber(req.query.page, 1);
        const limit = normalizeNumber(req.query.limit, 10);

        const posts = await Post.find({})
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .populate('user', 'name primaryRole')
            .lean();

        res.json({
            posts,
            hasMore: posts.length === limit,
            page,
        });
    } catch (error) {
        res.status(500).json({ message: 'Failed to load feed posts' });
    }
});

router.post('/posts', protect, async (req, res) => {
    try {
        const { type = 'text', content = '', mediaUrl = '', lat, lng } = req.body || {};

        const created = await Post.create({
            user: req.user._id,
            type,
            content,
            mediaUrl,
            location: {
                type: 'Point',
                coordinates: [Number(lng) || 0, Number(lat) || 0],
            },
        });

        const populated = await Post.findById(created._id)
            .populate('user', 'name primaryRole')
            .lean();

        res.status(201).json({ post: populated });
    } catch (error) {
        res.status(500).json({ message: 'Failed to create post' });
    }
});

router.post('/posts/:id/like', protect, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }

        const userId = String(req.user._id);
        const existingIndex = post.likes.findIndex((id) => String(id) === userId);

        if (existingIndex >= 0) {
            post.likes.splice(existingIndex, 1);
        } else {
            post.likes.push(req.user._id);
        }

        await post.save();

        res.json({
            liked: existingIndex < 0,
            likesCount: post.likes.length,
        });
    } catch (error) {
        res.status(500).json({ message: 'Failed to update like' });
    }
});

router.post('/posts/:id/comments', protect, async (req, res) => {
    try {
        const text = String(req.body?.text || '').trim();
        if (!text) {
            return res.status(400).json({ message: 'Comment text is required' });
        }

        const post = await Post.findById(req.params.id);
        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }

        post.comments.push({
            user: req.user._id,
            text,
        });

        await post.save();

        const comment = post.comments[post.comments.length - 1];
        res.status(201).json({
            comment,
            commentsCount: post.comments.length,
        });
    } catch (error) {
        res.status(500).json({ message: 'Failed to add comment' });
    }
});

module.exports = router;
