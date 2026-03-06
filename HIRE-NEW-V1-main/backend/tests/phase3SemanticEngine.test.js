const { calculatePhase3SemanticScore, buildWorkDnaVersionId } = require('../match/phase3SemanticEngine');

describe('phase3SemanticEngine', () => {
    it('returns strong semantic score for aligned role and skills', () => {
        const aligned = calculatePhase3SemanticScore({
            profile: {
                roleName: 'Delivery Executive',
                skills: ['Inventory checks', 'Packing', 'Route knowledge'],
            },
            job: {
                title: 'Delivery Associate',
                requirements: ['inventory management', 'packing', 'route planning'],
            },
            profileYears: 3,
            jobYears: 2,
            jobSalary: 28000,
            profileExpectedSalary: 24000,
        });

        const mismatch = calculatePhase3SemanticScore({
            profile: {
                roleName: 'Frontend Developer',
                skills: ['React', 'TypeScript'],
            },
            job: {
                title: 'Delivery Associate',
                requirements: ['inventory management', 'packing', 'route planning'],
            },
            profileYears: 1,
            jobYears: 3,
            jobSalary: 22000,
            profileExpectedSalary: 35000,
        });

        expect(aligned.phase3CompositeScore).toBeGreaterThan(mismatch.phase3CompositeScore);
        expect(aligned.semanticSkillScore).toBeGreaterThan(0.5);
    });

    it('keeps all phase3 outputs in [0,1]', () => {
        const result = calculatePhase3SemanticScore({
            profile: {
                roleName: 'QA Engineer',
                skills: ['testing', 'automation'],
            },
            job: {
                title: 'QA Analyst',
                requirements: ['manual testing', 'automation'],
            },
            profileYears: 0.5,
            jobYears: 2,
            jobSalary: 40000,
            profileExpectedSalary: 50000,
        });

        expect(result.semanticSkillScore).toBeGreaterThanOrEqual(0);
        expect(result.semanticSkillScore).toBeLessThanOrEqual(1);
        expect(result.experienceGaussianScore).toBeGreaterThanOrEqual(0);
        expect(result.experienceGaussianScore).toBeLessThanOrEqual(1);
        expect(result.economicViabilityScore).toBeGreaterThanOrEqual(0);
        expect(result.economicViabilityScore).toBeLessThanOrEqual(1);
        expect(result.phase3CompositeScore).toBeGreaterThanOrEqual(0);
        expect(result.phase3CompositeScore).toBeLessThanOrEqual(1);
    });

    it('builds deterministic work DNA version ids', () => {
        const first = buildWorkDnaVersionId({
            worker: {
                _id: 'worker-1',
                user: 'user-1',
                updatedAt: '2026-03-04T06:00:00.000Z',
                city: 'Hyderabad',
            },
            roleData: {
                roleName: 'Delivery Executive',
                experienceInRole: 3,
                expectedSalary: 25000,
                skills: ['Packing', 'Inventory checks'],
            },
        });

        const second = buildWorkDnaVersionId({
            worker: {
                _id: 'worker-1',
                user: 'user-1',
                updatedAt: '2026-03-04T06:00:00.000Z',
                city: 'Hyderabad',
            },
            roleData: {
                roleName: 'Delivery Executive',
                experienceInRole: 3,
                expectedSalary: 25000,
                skills: ['Packing', 'Inventory checks'],
            },
        });

        const changed = buildWorkDnaVersionId({
            worker: {
                _id: 'worker-1',
                user: 'user-1',
                updatedAt: '2026-03-04T06:00:00.000Z',
                city: 'Hyderabad',
            },
            roleData: {
                roleName: 'Delivery Executive',
                experienceInRole: 3,
                expectedSalary: 25000,
                skills: ['Packing', 'Inventory checks', 'Customer service'],
            },
        });

        expect(first).toBe(second);
        expect(changed).not.toBe(first);
    });
});
