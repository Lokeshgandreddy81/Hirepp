const Message = require('../models/Message');
const Application = require('../models/Application');
const WorkerProfile = require('../models/WorkerProfile');

// Get Chat History (Paginated)
const getChatHistory = async (req, res) => {
    try {
        const { applicationId } = req.params;

        // Defensive check: If applicationId is not a valid 24-character hex ObjectId, return empty history gracefully
        if (!applicationId || !applicationId.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(200).json([]);
        }

        const application = await Application.findById(applicationId).select('employer worker status');
        if (!application) {
            return res.status(200).json([]);
        }

        const workerProfile = await WorkerProfile.findById(application.worker).select('user');
        const isEmployer = String(application.employer) === String(req.user._id);
        const isWorker = String(workerProfile?.user) === String(req.user._id);
        if (!isEmployer && !isWorker) {
            return res.status(403).json({ message: 'Not authorized to view this chat' });
        }

        if (String(application.status || '').toLowerCase() !== 'accepted') {
            return res.status(403).json({ message: 'Chat is available after acceptance' });
        }

        const page = parseInt(req.query.page) || 1;
        const limit = 20;
        const skip = (page - 1) * limit;

        const messages = await Message.find({ applicationId })
            .sort({ createdAt: -1 }) // Latest first for UI
            .skip(skip)
            .limit(limit)
            .populate('sender', 'name firstName role');

        // Inverse because we fetched latest first, but usually clients re-reverse or append.
        // Returning as is (Latest is index 0) is fine for "inverted" FlatLists.
        res.status(200).json(messages);
    } catch (error) {
        console.error("Get History Error:", error);
        res.status(500).json({ message: "Failed to fetch history", error: error.message, stack: error.stack });
    }
};

// Send Message (REST Fallback / if needed for some flows, usually done via Socket)
const sendMessageREST = async (req, res) => {
    try {
        const { applicationId, text } = req.body;
        const sender = req.user._id;

        const application = await Application.findById(applicationId).select('employer worker status');
        if (!application) {
            return res.status(404).json({ message: 'Application not found' });
        }

        const workerProfile = await WorkerProfile.findById(application.worker).select('user');
        const isEmployer = String(application.employer) === String(sender);
        const isWorker = String(workerProfile?.user) === String(sender);
        if (!isEmployer && !isWorker) {
            return res.status(403).json({ message: 'Not authorized to message in this chat' });
        }

        if (String(application.status || '').toLowerCase() !== 'accepted') {
            return res.status(403).json({ message: 'Chat is available after acceptance' });
        }

        if (!String(text || '').trim()) {
            return res.status(400).json({ message: 'Message text is required' });
        }

        const message = await Message.create({
            applicationId,
            sender,
            text: String(text).trim()
        });

        const fullMsg = await message.populate('sender', 'name firstName role');

        // If using hybrid, we might emit here too if we have access to io, 
        // but typically controller doesn't have 'io' scope unless passed.
        // For this architecture, we rely on the Socket Event 'sendMessage' for real-time,
        // this REST endpoint is just a backup or for non-realtime clients.

        res.status(201).json(fullMsg);
    } catch (error) {
        res.status(500).json({ message: "Message failed" });
    }
};

module.exports = { getChatHistory, sendMessageREST };
