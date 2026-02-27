const ApiKey = require('../models/ApiKey');
const Job = require('../models/Job');

const protectApiKey = async (req, res, next) => {
    let key = req.headers['x-api-key'] || req.query.api_key;

    if (!key) {
        return res.status(401).json({ message: 'Not authorized, no API key' });
    }

    try {
        const apiKeyDoc = await ApiKey.findOne({ keyPattern: key });

        if (!apiKeyDoc) {
            return res.status(401).json({ message: 'Not authorized, invalid API key' });
        }

        // Rate Limit Enforcement
        const todayStr = new Date().toDateString();
        const lastResetStr = new Date(apiKeyDoc.lastResetDate).toDateString();

        if (todayStr !== lastResetStr) {
            apiKeyDoc.requestsToday = 0;
            apiKeyDoc.lastResetDate = new Date();
        }

        let maxRequests = 100;
        if (apiKeyDoc.tier === 'partner') maxRequests = 10000;
        if (apiKeyDoc.tier === 'enterprise') maxRequests = 999999;

        if (apiKeyDoc.requestsToday >= maxRequests) {
            return res.status(429).json({ message: "Rate limit exceeded for your API tier." });
        }

        apiKeyDoc.requestsToday += 1;
        await apiKeyDoc.save();

        req.employerId = apiKeyDoc.employerId; // Context setting
        next();

    } catch (error) {
        console.error(error);
        res.status(401).json({ message: 'Not authorized, token failed' });
    }
};

// @desc Get public jobs payload
// @route GET /api/public/jobs
const getPublicJobsList = async (req, res) => {
    try {
        const jobs = await Job.find({ isOpen: true, status: 'active' })
            .select('title companyName location salaryRange createdAt')
            .limit(10);

        res.json({
            status: "success",
            results: jobs.length,
            data: jobs
        });
    } catch (e) {
        res.status(500).json({ message: "Public API Error" });
    }
};

// @desc Stub for webhook registration
// @route POST /api/public/webhooks
const registerWebhook = async (req, res) => {
    const { eventType, targetUrl } = req.body;
    // Store in Webhook DB config
    res.json({ message: "Webhook successfully registered", eventType, targetUrl, active: true });
}

module.exports = {
    protectApiKey,
    getPublicJobsList,
    registerWebhook
};
