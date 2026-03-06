jest.mock('../models/MatchPerformanceMetric', () => ({
    find: jest.fn(),
}));

jest.mock('../models/MatchModel', () => ({
    findOne: jest.fn(),
}));

jest.mock('../models/MatchModelCalibration', () => ({
    create: jest.fn(),
}));

const MatchPerformanceMetric = require('../models/MatchPerformanceMetric');
const MatchModel = require('../models/MatchModel');
const MatchModelCalibration = require('../models/MatchModelCalibration');

const { getAndPersistCalibrationSuggestion } = require('../match/matchModelCalibration');

const repeatRows = (count, rowFactory) => Array.from({ length: count }).map((_, index) => rowFactory(index));

describe('matchModelCalibration', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('produces actionable suggestions when strong underperforms and possible is noisy', async () => {
        const now = new Date('2026-02-20T00:00:00.000Z');
        const rows = [
            ...repeatRows(30, () => ({ eventName: 'APPLICATION_CREATED', matchProbability: 0.9, timestamp: now })),
            ...repeatRows(2, () => ({ eventName: 'APPLICATION_HIRED', matchProbability: 0.9, timestamp: now })),
            ...repeatRows(40, () => ({ eventName: 'APPLICATION_CREATED', matchProbability: 0.65, timestamp: now })),
            ...repeatRows(1, () => ({ eventName: 'APPLICATION_HIRED', matchProbability: 0.65, timestamp: now })),
        ];

        MatchPerformanceMetric.find.mockReturnValue({
            select: () => ({
                lean: async () => rows,
            }),
        });
        MatchModel.findOne.mockReturnValue({
            sort: () => ({
                select: () => ({
                    lean: async () => ({ modelVersion: 'v999' }),
                }),
            }),
        });
        MatchModelCalibration.create.mockImplementation(async (payload) => ({ _id: 'calib-1', ...payload }));

        const { suggestion, persisted } = await getAndPersistCalibrationSuggestion({
            city: 'Hyderabad',
            roleCluster: 'Driver',
        });

        expect(persisted._id).toBe('calib-1');
        expect(Array.isArray(suggestion.suggestions)).toBe(true);
        expect(suggestion.suggestions.length).toBeGreaterThan(0);
        expect(suggestion.suggestedThresholds.strongMin).toBeGreaterThanOrEqual(0.85);
        expect(suggestion.suggestedThresholds.possibleMin).toBeGreaterThanOrEqual(0.62);
    });
});
