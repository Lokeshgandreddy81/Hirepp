const { evaluateCompositeMatch } = require('../match/apexSynthesisMatcher');

describe('apexSynthesisMatcher', () => {
    it('returns bounded deterministic score for strong match', () => {
        const profile = {
            roleName: 'Delivery Executive',
            skills: ['Inventory checks', 'Packing', 'Route knowledge'],
            experience_years: '3 years',
            expectedSalary: '₹22,000',
            location: 'Hyderabad',
            education: 'Bachelor',
        };
        const job = {
            title: 'Delivery Executive',
            required_skills: ['Packing', 'Route knowledge'],
            experience_required: '2+ years',
            salaryRange: 'Rs 25,000 - Rs 30,000',
            location: 'Hyderabad',
            education_required: 'Diploma',
        };

        const first = evaluateCompositeMatch({ profile, job });
        const second = evaluateCompositeMatch({ profile, job });

        expect(first.finalScore).toBeGreaterThan(0.7);
        expect(first.finalScore).toBeLessThanOrEqual(1);
        expect(first.finalScore).toBeGreaterThanOrEqual(0);
        expect(second.finalScore).toBe(first.finalScore);
    });

    it('handles nested schema-like salary and malformed values without throwing', () => {
        const result = evaluateCompositeMatch({
            profile: {
                skills: ['reactjs', 'javascript'],
                salary_expectations: {
                    value: {
                        minValue: '90k',
                        unitText: 'YEAR',
                    },
                },
                experience_years: '.5 years',
                location: { address: { addressLocality: 'Bengaluru' } },
            },
            job: {
                title: 'Frontend Developer',
                baseSalary: {
                    value: {
                        maxValue: '1.4e5',
                    },
                },
                requirements: ['React', 'TypeScript', '1-3 years'],
                location: { address: { addressLocality: 'Bengaluru' } },
            },
        });

        expect(result.finalScore).toBeGreaterThanOrEqual(0);
        expect(result.finalScore).toBeLessThanOrEqual(1);
        expect(result.components.skillScore).toBeGreaterThan(0);
    });

    it('remains safe under adversarial empty and invalid payloads', () => {
        const result = evaluateCompositeMatch({
            profile: null,
            job: {
                title: '',
                requirements: [null, undefined, ''],
                maxSalary: Infinity,
                location: '',
            },
        });

        expect(result.finalScore).toBeGreaterThanOrEqual(0);
        expect(result.finalScore).toBeLessThanOrEqual(1);
    });
});
