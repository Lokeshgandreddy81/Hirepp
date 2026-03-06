const express = require('express');
const request = require('supertest');

const mockFindOne = jest.fn();
const mockHydrateHybridContractFromExtractedData = jest.fn();

jest.mock('../middleware/authMiddleware', () => ({
    protect: (req, _res, next) => {
        req.user = { _id: 'user-1' };
        next();
    },
}));

jest.mock('../middleware/validate', () => ({
    validate: () => (_req, _res, next) => next(),
}));

jest.mock('../middleware/rateLimiters', () => ({
    smartInterviewStartLimiter: (_req, _res, next) => next(),
}));

jest.mock('../services/degradationService', () => ({
    isDegradationActive: jest.fn(() => false),
}));

jest.mock('../schemas/requestSchemas', () => ({
    objectIdParamSchema: {},
    smartInterviewStartSchema: {},
    smartInterviewTurnSchema: {},
}));

jest.mock('../models/InterviewProcessingJob', () => ({
    findOne: (...args) => mockFindOne(...args),
    findOneAndUpdate: jest.fn(),
    updateOne: jest.fn(),
}));

jest.mock('../services/interviewProcessingService', () => ({
    createHybridInterviewSession: jest.fn(),
    processHybridTurn: jest.fn(),
    applyClarificationOverride: jest.fn(),
    hydrateHybridContractFromExtractedData: (...args) => mockHydrateHybridContractFromExtractedData(...args),
}));

jest.mock('../services/sqsInterviewQueue', () => ({
    enqueueInterviewJob: jest.fn(),
    isQueueConfigured: jest.fn(() => true),
}));

describe('interview-processing status payload', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('selects raw metrics fields and returns non-zero quality payload values', async () => {
        const processingJobDoc = {
            _id: 'proc-1',
            status: 'processing',
            extractedData: null,
            createdJobId: null,
            errorMessage: null,
            rawMetrics: {
                profileQualityScore: 0.87,
                slotCompletenessRatio: 0.75,
                communicationClarityScore: 0.82,
                salaryOutlierFlag: false,
                salaryMedianForRoleCity: 30000,
            },
            latestTranscriptSnippet: 'driver in hyderabad',
            clarificationHints: {
                expectedSalary: { question: 'Please confirm salary.' },
            },
        };
        const selectMock = jest.fn().mockResolvedValue(processingJobDoc);
        mockFindOne.mockReturnValue({ select: selectMock });

        mockHydrateHybridContractFromExtractedData.mockResolvedValue({
            slotState: {},
            slotConfidence: {},
            ambiguousFields: [],
            missingSlot: null,
            interviewComplete: false,
            interviewStep: 2,
            maxSteps: 8,
            adaptiveQuestion: null,
            clarificationMode: false,
            clarificationTriggeredCount: 0,
            clarificationResolvedCount: 0,
            clarificationSkippedCount: 0,
            averageClarificationsPerInterview: 0,
            clarificationHints: processingJobDoc.clarificationHints,
            latestTranscriptSnippet: processingJobDoc.latestTranscriptSnippet,
            profileQualityScore: processingJobDoc.rawMetrics.profileQualityScore,
            slotCompletenessRatio: processingJobDoc.rawMetrics.slotCompletenessRatio,
            ambiguityRate: 0.1,
            communicationClarityScore: processingJobDoc.rawMetrics.communicationClarityScore,
            confidenceLanguageScore: 0.8,
            salaryOutlierFlag: processingJobDoc.rawMetrics.salaryOutlierFlag,
            salaryOutlierConfirmed: false,
            salaryMedianForRoleCity: processingJobDoc.rawMetrics.salaryMedianForRoleCity,
            salaryRealismRatio: 1.1,
            clarificationBudgetExceeded: false,
            extractionFallbackReason: null,
        });

        const app = express();
        app.use(express.json());
        app.use('/api/v2/interview-processing', require('../routes/interviewProcessingRoutes'));

        const res = await request(app).get('/api/v2/interview-processing/proc-1');

        expect(res.status).toBe(200);
        expect(res.body.processingId).toBe('proc-1');
        expect(res.body.profileQualityScore).toBeGreaterThan(0);
        expect(res.body.slotCompletenessRatio).toBeGreaterThan(0);
        expect(res.body.communicationClarityScore).toBeGreaterThan(0);
        expect(res.body.latestTranscriptSnippet).toBe('driver in hyderabad');

        const selectArg = String(selectMock.mock.calls[0]?.[0] || '');
        expect(selectArg).toContain('rawMetrics');
        expect(selectArg).toContain('latestTranscriptSnippet');
        expect(selectArg).toContain('clarificationHints');
    });
});
