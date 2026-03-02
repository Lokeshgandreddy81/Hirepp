jest.mock('../models/MatchPerformanceMetric', () => ({
    create: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
}));

jest.mock('../models/MatchLog', () => ({
    findOne: jest.fn(),
}));

jest.mock('../models/Job', () => ({
    findById: jest.fn(),
}));

jest.mock('../models/Application', () => ({
    findById: jest.fn(),
}));

const MatchPerformanceMetric = require('../models/MatchPerformanceMetric');
const MatchLog = require('../models/MatchLog');
const Job = require('../models/Job');

const {
    recordMatchPerformanceMetric,
    getMatchQualityAnalytics,
    getMatchPerformanceAlerts,
} = require('../services/matchMetricsService');

describe('matchMetricsService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('stores a metric row with explicit probability/tier', async () => {
        MatchPerformanceMetric.create.mockResolvedValue({ _id: 'metric-1' });

        await recordMatchPerformanceMetric({
            eventName: 'MATCH_RECOMMENDATION_VIEWED',
            jobId: 'job-1',
            workerId: 'worker-1',
            city: 'Hyderabad',
            roleCluster: 'Driver',
            matchProbability: 0.88,
            matchTier: 'STRONG',
        });

        expect(MatchPerformanceMetric.create).toHaveBeenCalledWith(expect.objectContaining({
            eventName: 'MATCH_RECOMMENDATION_VIEWED',
            jobId: 'job-1',
            workerId: 'worker-1',
            city: 'Hyderabad',
            roleCluster: 'Driver',
            matchProbability: 0.88,
            matchTier: 'STRONG',
        }));
    });

    it('backfills probability and tier from latest match log', async () => {
        MatchLog.findOne.mockReturnValue({
            sort: () => ({
                select: () => ({
                    lean: async () => ({
                        finalScore: 0.91,
                        tier: 'STRONG',
                        matchModelVersionUsed: 'v100',
                    }),
                }),
            }),
        });
        Job.findById.mockReturnValue({
            select: () => ({
                lean: async () => ({
                    location: 'Mumbai',
                    title: 'Warehouse Associate',
                }),
            }),
        });
        MatchPerformanceMetric.create.mockResolvedValue({ _id: 'metric-2' });

        await recordMatchPerformanceMetric({
            eventName: 'APPLICATION_CREATED',
            jobId: 'job-2',
            workerId: 'worker-2',
        });

        expect(MatchPerformanceMetric.create).toHaveBeenCalledWith(expect.objectContaining({
            eventName: 'APPLICATION_CREATED',
            matchProbability: 0.91,
            matchTier: 'STRONG',
            modelVersionUsed: 'v100',
            city: 'Mumbai',
            roleCluster: 'Warehouse Associate',
        }));
    });

    it('returns overview/detail analytics structure', async () => {
        const now = new Date('2026-02-01T00:00:00.000Z');
        MatchPerformanceMetric.find.mockReturnValue({
            select: () => ({
                lean: async () => ([
                    { eventName: 'MATCH_RECOMMENDATION_VIEWED', matchProbability: 0.88, timestamp: now },
                    { eventName: 'APPLICATION_CREATED', matchProbability: 0.88, timestamp: now },
                    { eventName: 'APPLICATION_SHORTLISTED', matchProbability: 0.88, timestamp: now },
                    { eventName: 'APPLICATION_HIRED', matchProbability: 0.88, timestamp: now },
                    { eventName: 'WORKER_JOINED', matchProbability: 0.88, timestamp: now },
                ]),
            }),
        });

        const result = await getMatchQualityAnalytics({});

        expect(result.overview).toEqual(expect.objectContaining({
            totalMatchesServed: 1,
            applicationRate: 1,
            shortlistRate: 1,
            hireRate: 1,
            retention30dRate: 1,
        }));
        expect(result.detail).toHaveProperty('matchProbabilityBuckets');
        expect(result.detail).toHaveProperty('conversionRates');
        expect(Array.isArray(result.detail.cohortMetrics)).toBe(true);
    });

    it('returns benchmark alerts when rolling rates breach targets', async () => {
        const now = new Date('2026-02-20T00:00:00.000Z');
        const rows = [
            ...Array.from({ length: 300 }).map(() => ({ eventName: 'MATCH_RECOMMENDATION_VIEWED', timestamp: now })),
            ...Array.from({ length: 25 }).map(() => ({ eventName: 'APPLICATION_SHORTLISTED', timestamp: now })),
            ...Array.from({ length: 5 }).map(() => ({ eventName: 'APPLICATION_HIRED', timestamp: now })),
            ...Array.from({ length: 30 }).map(() => ({ eventName: 'OFFER_EXTENDED', timestamp: now })),
            ...Array.from({ length: 15 }).map(() => ({ eventName: 'OFFER_ACCEPTED', timestamp: now })),
        ];

        MatchPerformanceMetric.find.mockReturnValue({
            select: () => ({
                lean: async () => rows,
            }),
        });

        const result = await getMatchPerformanceAlerts({
            from: '2026-02-15T00:00:00.000Z',
            to: '2026-02-22T00:00:00.000Z',
        });

        expect(result.alerts.length).toBeGreaterThan(0);
        expect(result.alerts.map((item) => item.metric)).toEqual(expect.arrayContaining([
            'interviewRate',
            'postInterviewHireRate',
            'offerAcceptanceRate',
        ]));
        expect(Array.isArray(result.trends)).toBe(true);
        expect(result.metrics.interviewRate).toBeCloseTo(0.0833, 3);
    });
});
