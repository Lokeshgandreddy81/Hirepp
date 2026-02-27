jest.mock('../services/matchMetricsService', () => ({
    getMatchPerformanceAlerts: jest.fn(),
}));

const { getMatchPerformanceAlerts } = require('../services/matchMetricsService');
const { getMatchPerformanceAlertsController } = require('../controllers/adminController');

const mockRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
};

describe('admin match performance alerts controller', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('returns breached metrics with configured thresholds', async () => {
        getMatchPerformanceAlerts.mockResolvedValue({
            targets: {
                interviewRateTarget: 0.1,
                postInterviewHireRateTarget: 0.35,
                offerAcceptanceTarget: 0.78,
            },
            metrics: {
                interviewRate: 0.08,
                postInterviewHireRate: 0.22,
                offerAcceptanceRate: 0.75,
            },
            alerts: [
                { metric: 'interviewRate', current: 0.08, target: 0.1, breached: true },
            ],
            breached: true,
            trends: [],
        });

        const req = { query: { city: 'Hyderabad', roleCluster: 'Driver' } };
        const res = mockRes();
        await getMatchPerformanceAlertsController(req, res);

        expect(getMatchPerformanceAlerts).toHaveBeenCalledWith(expect.objectContaining({
            city: 'Hyderabad',
            roleCluster: 'Driver',
        }));
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            success: true,
            data: expect.objectContaining({
                breached: true,
                alerts: expect.any(Array),
                targets: expect.any(Object),
            }),
        }));
    });
});
