const { performance } = require('perf_hooks');

const { rankJobsForWorker } = require('../match/matchEngineV2');
const { buildFeatureVector, FEATURE_ORDER } = require('../match/probabilisticFeatures');
const { logisticProbability } = require('../match/matchProbabilistic');

const makeWorker = () => ({
    _id: 'worker-1',
    firstName: 'Bench',
    city: 'hyderabad',
    interviewVerified: true,
    preferredShift: 'Flexible',
    licenses: ['Commercial'],
    roleProfiles: [
        {
            roleName: 'driver',
            experienceInRole: 4,
            expectedSalary: 22000,
            skills: ['driving', 'route planning', 'commercial'],
        },
    ],
    updatedAt: new Date(),
    lastActiveAt: new Date(),
});

const makeWorkerUser = () => ({
    _id: 'user-1',
    isVerified: true,
    hasCompletedProfile: true,
});

const makeJobs = (count) => Array.from({ length: count }).map((_, index) => ({
    _id: `job-${index}`,
    title: index % 2 === 0 ? 'Driver' : 'Delivery Driver',
    location: index % 5 === 0 ? 'hyderabad' : 'hyderabad',
    requirements: ['Driving'],
    maxSalary: 25000 + (index % 3) * 1000,
    minSalary: 18000,
    shift: index % 3 === 0 ? 'Day' : 'Flexible',
    mandatoryLicenses: index % 4 === 0 ? ['Commercial'] : [],
    isOpen: true,
    status: 'active',
    createdAt: new Date(Date.now() - (index * 1000)),
}));

const runDeterministicBench = (jobCount) => {
    const worker = makeWorker();
    const workerUser = makeWorkerUser();
    const jobs = makeJobs(jobCount);

    const startedAt = performance.now();
    const result = rankJobsForWorker({ worker, workerUser, jobs, maxResults: 20 });
    const elapsedMs = performance.now() - startedAt;

    return {
        jobCount,
        elapsedMs: Number(elapsedMs.toFixed(2)),
        survivors: result.matches.length,
        avgScore: Number(result.avgScore.toFixed(4)),
    };
};

const runProbabilisticBench = (deterministicMatches, worker, workerUser) => {
    const syntheticWeights = FEATURE_ORDER.map((_, index) => 0.15 + (index * 0.01));
    const intercept = -1.1;

    const startedAt = performance.now();

    const scored = deterministicMatches.map((row) => {
        const vector = buildFeatureVector({
            worker,
            workerUser,
            job: row.job,
            roleData: row.roleData,
            deterministicScores: row.deterministicScores,
            workerReliabilityScore: 0.7,
            timestamp: Date.now(),
            windowStart: Date.now() - 365 * 24 * 60 * 60 * 1000,
            windowEnd: Date.now(),
        });

        const probability = logisticProbability({
            weights: syntheticWeights,
            intercept,
            values: vector.featureValues,
        });

        return probability;
    });

    const elapsedMs = performance.now() - startedAt;

    return {
        pairs: deterministicMatches.length,
        elapsedMs: Number(elapsedMs.toFixed(2)),
        avgProbability: scored.length ? Number((scored.reduce((sum, value) => sum + value, 0) / scored.length).toFixed(4)) : 0,
    };
};

const main = () => {
    const sizes = [1000, 5000, 10000];
    const deterministic = sizes.map((size) => runDeterministicBench(size));

    const worker = makeWorker();
    const workerUser = makeWorkerUser();
    const jobs = makeJobs(5000);
    const ranked = rankJobsForWorker({ worker, workerUser, jobs, maxResults: 5000 });
    const probabilistic = runProbabilisticBench(ranked.matches, worker, workerUser);

    const fiveKDeterministic = deterministic.find((row) => row.jobCount === 5000);
    const deterministicSlaPassed = (fiveKDeterministic?.elapsedMs || 9999) < 400;
    const probabilisticSlaPassed = probabilistic.elapsedMs < 400;

    const report = {
        event: 'match_engine_v2_benchmark',
        deterministic,
        probabilistic,
        sla: {
            deterministic5kUnder400ms: deterministicSlaPassed,
            probabilisticPostFilterUnder400ms: probabilisticSlaPassed,
        },
    };

    console.log(JSON.stringify(report, null, 2));

    const strictMode = String(process.env.MATCH_BENCHMARK_STRICT || 'false').toLowerCase() === 'true';
    if (strictMode && (!deterministicSlaPassed || !probabilisticSlaPassed)) {
        process.exit(1);
    }
};

main();
