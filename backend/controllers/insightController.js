const Job = require('../models/Job');
const User = require('../models/userModel');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'mock-key');

// @desc Get job market trends
// @route GET /api/insights/market-trends
const getMarketTrends = async (req, res) => {
    try {
        const category = req.query.category || 'skills';

        // Mock data logic for trends (In production, derive from DB aggregation)
        let trends = {};
        if (category === 'skills') {
            trends = {
                trendingUp: ["React Native", "Next.js", "Python Fast API", "AI Agents"],
                trendingDown: ["jQuery", "AngularJS"],
                explanation: "AI Agent development and cross-platform mobile frameworks are seeing 23% increased demand."
            }
        } else {
            trends = {
                averageSalary: "$120,000",
                timeToFill: "18 Days",
                explanation: "Engineering roles are taking slightly longer to fill due to high skill requirements."
            }
        }

        res.json({
            category,
            data: trends,
            updatedAt: new Date()
        });

    } catch (error) {
        console.error("Trends Error:", error);
        res.status(500).json({ message: "Failed to load market trends" });
    }
};

// @desc Get Candidate Recommendations
// @route GET /api/insights/career-path/:userId
const getCareerPath = async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: "User not found" });

        // Gemini generated insight proxy
        const generativeModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const prompt = `Act as an expert career counselor. Based on current market trends for tech, suggest 3 skills for a candidate to learn right now to boost their salary. Return as a short paragraph.`;

        let advice = "Learn Python, React Native, and AI prompt engineering to maximize your value in the current market.";
        try {
            if (process.env.GEMINI_API_KEY) {
                const result = await generativeModel.generateContent(prompt);
                advice = result.response.text();
            }
        } catch (e) {
            console.log("Gemini insight failed, using fallback.", e.message);
        }

        res.json({
            candidateId: userId,
            recommendedSkills: ["Python", "Machine Learning", "Cloud Infrastructure"],
            aiCareerAdvice: advice
        });
    } catch (error) {
        console.error("Career Path Error:", error);
        res.status(500).json({ message: "Failed to load career path" });
    }
};

// @desc Get Employer Intelligence
// @route GET /api/insights/employer/:employerId
const getEmployerIntelligence = async (req, res) => {
    try {
        const { employerId } = req.params;

        if (req.user._id.toString() !== employerId && !req.user.isAdmin) {
            return res.status(403).json({ message: "Not authorized" });
        }

        const generativeModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const prompt = `As a recruitment analyst, give a 2 sentence summary on how to attract top software engineering talent in 2026.`;

        let summary = "Offer competitive salaries and clearly state remote work policies. Top talent values transparency and fast interview feedback loops.";
        try {
            if (process.env.GEMINI_API_KEY) {
                const result = await generativeModel.generateContent(prompt);
                summary = result.response.text();
            }
        } catch (e) {
            console.log("Gemini employer insight failed, using fallback.", e.message);
        }

        res.json({
            employerId,
            benchmarks: {
                competitiveSalaryRange: "$100k - $160k",
                optimalPostingTime: "Tuesday 10:00 AM",
                avgApplicantsPerJob: 45
            },
            aiSummary: summary
        });

    } catch (error) {
        console.error("Employer Intel Error:", error);
        res.status(500).json({ message: "Failed to load employer intelligence" });
    }
};

module.exports = {
    getMarketTrends,
    getCareerPath,
    getEmployerIntelligence
};
