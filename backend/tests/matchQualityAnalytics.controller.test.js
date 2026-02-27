jest.mock('../services/matchMetricsService', () => ({
    getMatchQualityAnalytics: jest.fn(),
}));

const { getMatchQualityAnalytics } = require('../services/matchMetricsService');
const {
    getMatchQualityOverview,
    getMatchQualityDetail,
} = require('../controllers/analyticsController');

const mockRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
};

describe('match quality analytics controller', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('returns overview response shape', async () => {
        getMatchQualityAnalytics.mockResolvedValue({
            overview: {
                totalMatchesServed: 20,
                avgMatchProbability: 0.81,
                applicationRate: 0.5,
                shortlistRate: 0.4,
                hireRate: 0.2,
                retention30dRate: 0.1,
            },
            detail: {},
            from: new Date('2026-01-01'),
            to: new Date('2026-01-31'),
        });

        const req = { query: {} };
        const res = mockRes();
        await getMatchQualityOverview(req, res);

        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            totalMatchesServed: 20,
            avgMatchProbability: 0.81,
            applicationRate: 0.5,
            shortlistRate: 0.4,
            hireRate: 0.2,
            retention30dRate: 0.1,
        }));
    });

    it('returns detail response shape', async () => {
        getMatchQualityAnalytics.mockResolvedValue({
            overview: {},
            detail: {
                matchProbabilityBuckets: {
                    '>=0.85': { apps: 1, shortlists: 1, hires: 1 },
                    '0.70-0.84': { apps: 1, shortlists: 0, hires: 0 },
                    '0.62-0.69': { apps: 0, shortlists: 0, hires: 0 },
                },
                conversionRates: {},
                cohortMetrics: [],
            },
            from: new Date('2026-01-01'),
            to: new Date('2026-01-31'),
        });

        const req = { query: {} };
        const res = mockRes();
        await getMatchQualityDetail(req, res);

        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            matchProbabilityBuckets: expect.any(Object),
            conversionRates: expect.any(Object),
            cohortMetrics: expect.any(Array),
            range: expect.any(Object),
        }));
    });
});
