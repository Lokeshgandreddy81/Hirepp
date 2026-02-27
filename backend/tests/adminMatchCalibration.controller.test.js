jest.mock('../match/matchModelCalibration', () => ({
    getAndPersistCalibrationSuggestion: jest.fn(),
}));

const { getAndPersistCalibrationSuggestion } = require('../match/matchModelCalibration');
const { getMatchCalibrationSuggestions } = require('../controllers/adminController');

const mockRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
};

describe('admin calibration endpoint controller', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('returns actionable calibration suggestions payload', async () => {
        getAndPersistCalibrationSuggestion.mockResolvedValue({
            suggestion: {
                modelVersion: 'v100',
                city: 'Hyderabad',
                roleCluster: 'Driver',
                suggestions: ['Tighten STRONG threshold.'],
                suggestedThresholds: { strongMin: 0.87, goodMin: 0.71, possibleMin: 0.64 },
                currentThresholds: { strongMin: 0.85, goodMin: 0.7, possibleMin: 0.62 },
                diagnostics: {},
                driftDetected: true,
                requiresRetrain: true,
            },
            persisted: { _id: 'calib-100' },
        });

        const req = {
            query: { city: 'Hyderabad', roleCluster: 'Driver' },
        };
        const res = mockRes();

        await getMatchCalibrationSuggestions(req, res);

        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            success: true,
            data: expect.objectContaining({
                modelVersion: 'v100',
                calibrationId: 'calib-100',
                suggestions: expect.arrayContaining(['Tighten STRONG threshold.']),
            }),
        }));
    });
});
