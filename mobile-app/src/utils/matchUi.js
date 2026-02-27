export const MATCH_TIERS = {
    STRONG: 'STRONG',
    GOOD: 'GOOD',
    POSSIBLE: 'POSSIBLE',
};

export const FEATURE_REASON_THRESHOLD = 0.6;

export const clamp01 = (value) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return 0;
    return Math.max(0, Math.min(1, numeric));
};

export const getTierColor = (tier) => {
    switch (String(tier || '').toUpperCase()) {
        case MATCH_TIERS.STRONG:
            return '#10B981';
        case MATCH_TIERS.GOOD:
            return '#2563EB';
        case MATCH_TIERS.POSSIBLE:
            return '#D97706';
        default:
            return '#64748B';
    }
};

export const getTierPriority = (tier) => {
    const normalized = String(tier || '').toUpperCase();
    if (normalized === MATCH_TIERS.STRONG) return 3;
    if (normalized === MATCH_TIERS.GOOD) return 2;
    if (normalized === MATCH_TIERS.POSSIBLE) return 1;
    return 0;
};

export const getNormalizedScore = (job = {}) => {
    if (job.matchProbability !== undefined && job.matchProbability !== null) {
        return clamp01(job.matchProbability);
    }

    const score = Number(job.finalScore);
    if (Number.isFinite(score) && score <= 1) {
        return clamp01(score);
    }

    return clamp01((Number(job.matchScore) || 0) / 100);
};

export const getDisplayScorePercent = (job = {}) => Math.round(getNormalizedScore(job) * 100);

const normalizeFromImpact = (impactValue) => {
    const impact = Number(impactValue);
    if (!Number.isFinite(impact)) return 0;

    // Convert logistic contribution-ish value to a [0,1] pseudo-strength.
    return clamp01(1 / (1 + Math.exp(-(impact * 4))));
};

const extractFeatureStrength = ({ explainability = {}, scoreKey, impactKey }) => {
    if (explainability && explainability[scoreKey] !== undefined) {
        return clamp01(explainability[scoreKey]);
    }
    if (explainability && explainability[impactKey] !== undefined) {
        return normalizeFromImpact(explainability[impactKey]);
    }
    return 0;
};

export const buildMatchReasons = ({ explainability = {}, distanceKm = null, max = 3 }) => {
    const candidates = [
        {
            id: 'skill',
            label: 'Skills matched',
            score: extractFeatureStrength({ explainability, scoreKey: 'skillScore', impactKey: 'skillImpact' }),
        },
        {
            id: 'experience',
            label: 'Experience aligned',
            score: extractFeatureStrength({ explainability, scoreKey: 'experienceScore', impactKey: 'experienceImpact' }),
        },
        {
            id: 'salary',
            label: 'Salary expectation aligned',
            score: extractFeatureStrength({ explainability, scoreKey: 'salaryScore', impactKey: 'salaryImpact' }),
        },
        {
            id: 'distance',
            label: Number.isFinite(Number(distanceKm))
                ? `Within ${Math.round(Number(distanceKm))} km`
                : 'Close distance fit',
            score: extractFeatureStrength({ explainability, scoreKey: 'distanceScore', impactKey: 'distanceImpact' }),
        },
    ];

    return candidates
        .filter((item) => item.score > FEATURE_REASON_THRESHOLD)
        .sort((left, right) => right.score - left.score)
        .slice(0, max);
};

export const sortRecommendedJobsByTierAndScore = (jobs = []) => {
    const normalized = Array.isArray(jobs) ? jobs.slice() : [];

    normalized.sort((left, right) => {
        const leftTier = getTierPriority(left.tier);
        const rightTier = getTierPriority(right.tier);
        if (rightTier !== leftTier) return rightTier - leftTier;

        const leftScore = getNormalizedScore(left);
        const rightScore = getNormalizedScore(right);
        return rightScore - leftScore;
    });

    return normalized;
};

export const isMatchTier = (tier) => {
    const normalized = String(tier || '').toUpperCase();
    return normalized === MATCH_TIERS.STRONG || normalized === MATCH_TIERS.GOOD || normalized === MATCH_TIERS.POSSIBLE;
};
