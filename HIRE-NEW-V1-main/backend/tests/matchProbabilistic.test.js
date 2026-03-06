jest.mock('../models/MatchModel', () => ({
    findOne: jest.fn(),
}));

const MatchModel = require('../models/MatchModel');
const {
    mapProbabilityTier,
    logisticProbability,
    scoreSinglePair,
} = require('../match/matchProbabilistic');

describe('matchProbabilistic', () => {
    const worker = {
        _id: 'worker-1',
        city: 'Hyderabad',
        interviewVerified: true,
    };

    const workerUser = {
        _id: 'user-1',
        hasCompletedProfile: true,
        isVerified: true,
    };

    const job = {
        _id: 'job-1',
        title: 'Driver',
        location: 'Hyderabad',
    };

    const roleData = {
        roleName: 'Driver',
    };

    const deterministicScores = {
        skillScore: 0.8,
        experienceScore: 0.9,
        salaryFitScore: 0.85,
        distanceScore: 1,
        profileCompletenessMultiplier: 0.9,
    };

    afterEach(() => {
        jest.clearAllMocks();
        delete process.env.MATCH_MODEL_VERSION_ACTIVE;
    });

    it('maps probability tiers correctly', () => {
        expect(mapProbabilityTier(0.86)).toBe('STRONG');
        expect(mapProbabilityTier(0.75)).toBe('GOOD');
        expect(mapProbabilityTier(0.61)).toBe('POSSIBLE');
        expect(mapProbabilityTier(0.2)).toBe('REJECT');
    });

    it('computes logistic probability', () => {
        const probability = logisticProbability({
            weights: [1, 1],
            intercept: -1,
            values: [1, 0],
        });

        expect(probability).toBeCloseTo(0.5);
    });

    it('falls back when no model is available', async () => {
        MatchModel.findOne.mockImplementation(() => ({
            lean: async () => null,
        }));

        const result = await scoreSinglePair({
            worker,
            workerUser,
            job,
            roleData,
            deterministicScores,
            modelVersionOverride: 'v1',
        });

        expect(result.fallbackUsed).toBe(true);
        expect(result.reason).toBe('NO_MODEL_FOR_CLUSTER');
    });

    it('uses hierarchical key fallback to global model', async () => {
        MatchModel.findOne.mockImplementation((query) => ({
            lean: async () => {
                if (query.modelKey === '*::*') {
                    return {
                        modelVersion: 'v1',
                        modelKey: '*::*',
                        featureOrder: [
                            'skillScore',
                            'experienceScore',
                            'salaryFitScore',
                            'distanceScore',
                            'profileCompleteness',
                            'interviewCompletion',
                            'workerReliabilityScore',
                            'cityRoleClusterHash',
                            'timestampEpochNormalized',
                        ],
                        weights: [0.5, 0.3, 0.2, 0.1, 0.2, 0.1, 0.2, 0.05, 0.05],
                        intercept: -0.1,
                    };
                }
                return null;
            },
        }));

        const result = await scoreSinglePair({
            worker,
            workerUser,
            job,
            roleData,
            deterministicScores,
            modelVersionOverride: 'v1',
        });

        expect(result.fallbackUsed).toBe(false);
        expect(result.modelKeyUsed).toBe('*::*');
        expect(result.matchProbability).toBeGreaterThanOrEqual(0);
        expect(result.matchProbability).toBeLessThanOrEqual(1);
    });
});
