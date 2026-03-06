export const MATCH_TIERS = {
    STRONG: 'STRONG',
    GOOD: 'GOOD',
    POSSIBLE: 'POSSIBLE',
};

export const FEATURE_REASON_THRESHOLD = 0.6;
const SCORE_EPSILON = 0.00001;
const EXPLAINABILITY_SCORE_WEIGHTS = {
    skill: 0.4,
    experience: 0.28,
    salary: 0.18,
    distance: 0.14,
};

export const clamp01 = (value) => {
    const normalized = typeof value === 'string'
        ? value.replace(/[%\s,]/g, '')
        : value;
    const numeric = Number(normalized);
    if (!Number.isFinite(numeric)) return 0;
    return Math.max(0, Math.min(1, numeric));
};

const toRatio = (value) => {
    if (typeof value === 'string') {
        const normalizedText = value.trim().toLowerCase();
        if (!normalizedText) return null;

        const slashMatch = normalizedText.match(/^(-?\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/);
        if (slashMatch) {
            const numerator = Number(slashMatch[1]);
            const denominator = Number(slashMatch[2]);
            if (Number.isFinite(numerator) && Number.isFinite(denominator) && denominator > 0) {
                return clamp01(numerator / denominator);
            }
        }

        const cleaned = normalizedText
            .replace(/percent|percentage/g, '')
            .replace(/[%\s,]/g, '');
        if (!cleaned) return null;
        let numeric = Number(cleaned);
        if (!Number.isFinite(numeric)) {
            const firstNumericToken = cleaned.match(/-?\d+(?:\.\d+)?/);
            numeric = firstNumericToken ? Number(firstNumericToken[0]) : Number.NaN;
        }
        if (!Number.isFinite(numeric)) return null;
        if (numeric <= 1) return clamp01(numeric);
        if (numeric <= 100) return clamp01(numeric / 100);
        return clamp01(numeric);
    }

    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return null;
    if (numeric <= 1) return clamp01(numeric);
    if (numeric <= 100) return clamp01(numeric / 100);
    return clamp01(numeric);
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

export const getTierDefaultRatio = (tier) => {
    const normalized = String(tier || '').toUpperCase();
    if (normalized === MATCH_TIERS.STRONG) return 0.9;
    if (normalized === MATCH_TIERS.GOOD) return 0.78;
    if (normalized === MATCH_TIERS.POSSIBLE) return 0.65;
    return 0;
};

export const getNormalizedScore = (job = {}) => {
    const scoreCandidates = [
        job?.matchProbability,
        job?.finalScore,
        job?.matchScore,
        job?.probability,
        job?.score,
        job?.matchPercent,
        job?.matchPercentage,
        job?.match_probability,
        job?.final_score,
        job?.relevanceScore,
        job?.metrics?.matchProbability,
        job?.metrics?.finalScore,
        job?.metrics?.matchScore,
        job?.match?.probability,
        job?.match?.score,
        job?.job?.matchProbability,
        job?.job?.finalScore,
        job?.job?.matchScore,
    ];

    let bestResolvedScore = null;
    for (const candidate of scoreCandidates) {
        const normalized = toRatio(candidate);
        if (normalized === null) continue;
        if (bestResolvedScore === null || normalized > bestResolvedScore) {
            bestResolvedScore = normalized;
            if (bestResolvedScore >= 1 - SCORE_EPSILON) break;
        }
    }

    if (bestResolvedScore !== null && bestResolvedScore > SCORE_EPSILON) {
        return bestResolvedScore;
    }

    const explainability = job?.explainability || job?.match?.explainability || job?.metrics?.explainability || {};
    if (explainability && typeof explainability === 'object') {
        const skill = extractFeatureStrength({ explainability, scoreKey: 'skillScore', impactKey: 'skillImpact' });
        const experience = extractFeatureStrength({ explainability, scoreKey: 'experienceScore', impactKey: 'experienceImpact' });
        const salary = extractFeatureStrength({ explainability, scoreKey: 'salaryScore', impactKey: 'salaryImpact' });
        const distance = extractFeatureStrength({ explainability, scoreKey: 'distanceScore', impactKey: 'distanceImpact' });
        const explainabilityBlend = (
            (skill * EXPLAINABILITY_SCORE_WEIGHTS.skill)
            + (experience * EXPLAINABILITY_SCORE_WEIGHTS.experience)
            + (salary * EXPLAINABILITY_SCORE_WEIGHTS.salary)
            + (distance * EXPLAINABILITY_SCORE_WEIGHTS.distance)
        );
        if (explainabilityBlend > SCORE_EPSILON) {
            return clamp01(explainabilityBlend);
        }
    }

    return getTierDefaultRatio(job?.tier);
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
    const toJobEpoch = (job = {}) => {
        const candidateEpochs = [
            Number(job?.createdAtEpoch),
            Date.parse(job?.createdAt || ''),
            Date.parse(job?.job?.createdAt || ''),
        ].filter((value) => Number.isFinite(value) && value > 0);
        return candidateEpochs.length ? candidateEpochs[0] : 0;
    };

    normalized.sort((left, right) => {
        const leftTier = getTierPriority(left.tier);
        const rightTier = getTierPriority(right.tier);
        if (rightTier !== leftTier) return rightTier - leftTier;

        const leftScore = getNormalizedScore(left);
        const rightScore = getNormalizedScore(right);
        if (rightScore !== leftScore) return rightScore - leftScore;

        const rightEpoch = toJobEpoch(right);
        const leftEpoch = toJobEpoch(left);
        if (rightEpoch !== leftEpoch) return rightEpoch - leftEpoch;

        return String(left?._id || '').localeCompare(String(right?._id || ''));
    });

    return normalized;
};

export const isMatchTier = (tier) => {
    const normalized = String(tier || '').toUpperCase();
    return normalized === MATCH_TIERS.STRONG || normalized === MATCH_TIERS.GOOD || normalized === MATCH_TIERS.POSSIBLE;
};
