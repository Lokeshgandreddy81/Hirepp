const {
    HARD_GATE_REASONS,
    mapTier,
    evaluateRoleAgainstJob,
    rankJobsForWorker,
    sortScoredMatches,
} = require('../match/matchEngineV2');

describe('matchEngineV2', () => {
    const baseJob = {
        _id: 'job-1',
        title: 'Delivery Driver',
        location: 'Hyderabad',
        requirements: ['Driving'],
        maxSalary: 25000,
        shift: 'Flexible',
        mandatoryLicenses: [],
    };

    const baseWorker = {
        _id: 'worker-1',
        firstName: 'Lokesh',
        city: 'Hyderabad',
        interviewVerified: true,
        preferredShift: 'Flexible',
        licenses: ['Commercial'],
        roleProfiles: [],
        updatedAt: new Date('2026-01-01T00:00:00Z'),
    };

    const baseUser = {
        _id: 'user-1',
        isVerified: true,
        hasCompletedProfile: true,
    };

    const baseRole = {
        roleName: 'Driver',
        experienceInRole: 4,
        expectedSalary: 22000,
        skills: ['Driving', 'Route Planning'],
    };

    it('rejects on missing mandatory certification', () => {
        const evaluation = evaluateRoleAgainstJob({
            job: { ...baseJob, mandatoryLicenses: ['Heavy Vehicle'] },
            worker: { ...baseWorker, licenses: ['LMV'] },
            workerUser: baseUser,
            roleData: baseRole,
        });

        expect(evaluation.accepted).toBe(false);
        expect(evaluation.rejectReason).toBe(HARD_GATE_REASONS.CERTIFICATION_MISSING);
    });

    it('rejects on shift mismatch hard gate', () => {
        const evaluation = evaluateRoleAgainstJob({
            job: { ...baseJob, shift: 'Night' },
            worker: { ...baseWorker, preferredShift: 'Day' },
            workerUser: baseUser,
            roleData: baseRole,
        });

        expect(evaluation.accepted).toBe(false);
        expect(evaluation.rejectReason).toBe(HARD_GATE_REASONS.SHIFT_MISMATCH);
    });

    it('computes multiplicative score and explainability', () => {
        const evaluation = evaluateRoleAgainstJob({
            job: baseJob,
            worker: baseWorker,
            workerUser: baseUser,
            roleData: baseRole,
        });

        expect(evaluation.accepted).toBe(true);
        expect(evaluation.finalScore).toBeGreaterThan(0);
        expect(evaluation.explainability.skillScore).toBeCloseTo(evaluation.skillScore);
        expect(evaluation.explainability.finalScore).toBeCloseTo(evaluation.finalScore);
        expect(evaluation.tier).toBe(mapTier(evaluation.finalScore));
    });

    it('maps tiers correctly', () => {
        expect(mapTier(0.90)).toBe('STRONG');
        expect(mapTier(0.75)).toBe('GOOD');
        expect(mapTier(0.63)).toBe('POSSIBLE');
        expect(mapTier(0.40)).toBe('REJECT');
    });

    it('handles null critical fields safely', () => {
        const evaluation = evaluateRoleAgainstJob({
            job: { ...baseJob, title: '' },
            worker: baseWorker,
            workerUser: baseUser,
            roleData: baseRole,
        });

        expect(evaluation.accepted).toBe(false);
        expect(evaluation.rejectReason).toBe(HARD_GATE_REASONS.NULL_CRITICAL_FIELDS);
    });

    it('sorts ties by verification/profile/lastActive/distance', () => {
        const rows = [
            {
                finalScore: 0.8,
                verificationStatus: false,
                profileCompleteness: 0.8,
                lastActive: new Date('2026-01-01T00:00:00Z'),
                distanceKm: 2,
            },
            {
                finalScore: 0.8,
                verificationStatus: true,
                profileCompleteness: 0.8,
                lastActive: new Date('2026-01-01T00:00:00Z'),
                distanceKm: 5,
            },
        ];

        rows.sort(sortScoredMatches);
        expect(rows[0].verificationStatus).toBe(true);
    });

    it('returns only top 20 ranked jobs', () => {
        const jobs = Array.from({ length: 25 }).map((_, index) => ({
            ...baseJob,
            _id: `job-${index}`,
            title: 'Driver',
            requirements: ['Driving'],
            maxSalary: 25000 + index,
        }));

        const worker = {
            ...baseWorker,
            roleProfiles: [baseRole],
        };

        const ranked = rankJobsForWorker({
            worker,
            workerUser: baseUser,
            jobs,
            maxResults: 20,
        });

        expect(ranked.matches.length).toBeLessThanOrEqual(20);
    });
});
