const algo = require('../utils/matchingAlgorithm');

const MAX_RESULTS = 20;

const TIERS = {
    STRONG: 0.82,
    GOOD: 0.70,
    POSSIBLE: 0.62,
};

const HARD_GATE_REASONS = {
    NULL_CRITICAL_FIELDS: 'NULL_CRITICAL_FIELDS',
    ROLE_MISMATCH: 'ROLE_MISMATCH',
    CERTIFICATION_MISSING: 'CERTIFICATION_MISSING',
    SHIFT_MISMATCH: 'SHIFT_MISMATCH',
    COMMUTE_OUTSIDE_RADIUS: 'COMMUTE_OUTSIDE_RADIUS',
    SALARY_OUTSIDE_RANGE: 'SALARY_OUTSIDE_RANGE',
};

const normalizeText = (value) => String(value || '').trim().toLowerCase();
const clamp01 = (value) => Math.min(1, Math.max(0, Number(value) || 0));

const toEpoch = (value) => {
    const parsed = value ? new Date(value).getTime() : 0;
    return Number.isFinite(parsed) ? parsed : 0;
};

const tokenize = (text = '') => new Set(
    String(text || '')
        .toLowerCase()
        .split(/\s+/)
        .map((token) => token.trim())
        .filter((token) => token.length > 2)
);

const hasRoleOverlap = (jobTitle, roleName) => {
    const jobTokens = tokenize(jobTitle);
    const roleTokens = tokenize(roleName);
    if (!jobTokens.size || !roleTokens.size) return false;

    for (const token of jobTokens) {
        if (roleTokens.has(token)) return true;
    }

    for (const jobToken of jobTokens) {
        for (const roleToken of roleTokens) {
            if (jobToken.includes(roleToken) || roleToken.includes(jobToken)) return true;
        }
    }

    return false;
};

const extractRequiredExperience = (requirements = []) => {
    const text = Array.isArray(requirements) ? requirements.join(' ') : String(requirements || '');
    const match = text.match(/(\d+)\s+years?/i);
    return Number(match?.[1] || 0);
};

const getShiftPreference = ({ worker = {}, roleData = {} }) => {
    const roleShift = normalizeText(roleData?.preferredShift);
    if (roleShift) return roleShift;
    return normalizeText(worker?.preferredShift || 'flexible');
};

const hasMandatoryLicenses = ({ job = {}, worker = {} }) => {
    const required = Array.isArray(job.mandatoryLicenses) ? job.mandatoryLicenses : [];
    if (!required.length) return true;

    const workerLicenses = Array.isArray(worker.licenses) ? worker.licenses : [];
    const normalizedWorker = workerLicenses.map((value) => normalizeText(value));

    return required.every((requiredLicense) => {
        const requiredValue = normalizeText(requiredLicense);
        return normalizedWorker.some((ownedLicense) => ownedLicense.includes(requiredValue));
    });
};

const getDistanceScore = ({ job = {}, worker = {} }) => {
    const jobCity = normalizeText(job.location);
    const workerCity = normalizeText(worker.city);
    if (!jobCity || !workerCity) return 0;
    return jobCity === workerCity ? 1 : 0;
};

const isCriticalFieldsMissing = ({ job = {}, worker = {}, roleData = {} }) => {
    if (!job?._id || !job.title || !job.location) return true;
    if (!worker?._id || !worker.city) return true;
    if (!roleData?.roleName) return true;
    return false;
};

const computeProfileCompleteness = ({ worker = {}, workerUser = {}, roleData = {} }) => {
    const checks = [
        Boolean(worker.firstName),
        Boolean(worker.city),
        Boolean(Array.isArray(roleData.skills) && roleData.skills.length > 0),
        Number(roleData.experienceInRole || 0) > 0,
        Number(roleData.expectedSalary || 0) > 0,
        Boolean(worker.interviewVerified),
        Boolean(workerUser.hasCompletedProfile),
    ];

    const completed = checks.filter(Boolean).length;
    return clamp01(completed / checks.length);
};

const getVerificationStatus = ({ worker = {}, workerUser = {} }) => Boolean(
    workerUser?.isVerified || worker?.interviewVerified
);

const getLastActive = ({ worker = {} }) => worker?.lastActiveAt || worker?.updatedAt || worker?.createdAt || new Date(0);

const mapTier = (score) => {
    if (score >= TIERS.STRONG) return 'STRONG';
    if (score >= TIERS.GOOD) return 'GOOD';
    if (score >= TIERS.POSSIBLE) return 'POSSIBLE';
    return 'REJECT';
};

const toLegacyTierLabel = (tier) => {
    if (tier === 'STRONG') return 'Strong Match';
    if (tier === 'GOOD') return 'Good Match';
    if (tier === 'POSSIBLE') return 'Possible Match';
    return 'Rejected';
};

const evaluateRoleAgainstJob = ({ job, worker, workerUser, roleData }) => {
    if (isCriticalFieldsMissing({ job, worker, roleData })) {
        return { accepted: false, rejectReason: HARD_GATE_REASONS.NULL_CRITICAL_FIELDS };
    }

    if (!hasRoleOverlap(job.title, roleData.roleName)) {
        return { accepted: false, rejectReason: HARD_GATE_REASONS.ROLE_MISMATCH };
    }

    if (!hasMandatoryLicenses({ job, worker })) {
        return { accepted: false, rejectReason: HARD_GATE_REASONS.CERTIFICATION_MISSING };
    }

    const shift = normalizeText(job.shift || 'flexible');
    const preference = getShiftPreference({ worker, roleData });
    if (shift !== 'flexible' && preference !== 'flexible' && shift !== preference) {
        return { accepted: false, rejectReason: HARD_GATE_REASONS.SHIFT_MISMATCH };
    }

    const distanceScore = getDistanceScore({ job, worker });
    if (distanceScore === 0) {
        return { accepted: false, rejectReason: HARD_GATE_REASONS.COMMUTE_OUTSIDE_RADIUS };
    }

    if (Number(job.maxSalary || 0) > 0 && Number(roleData.expectedSalary || 0) > 0) {
        if (Number(roleData.expectedSalary) > Number(job.maxSalary) * 1.15) {
            return { accepted: false, rejectReason: HARD_GATE_REASONS.SALARY_OUTSIDE_RANGE };
        }
    }

    const requiredExp = extractRequiredExperience(job.requirements || []);
    const skillScore = clamp01(algo.skillsScore(roleData.skills || [], job.requirements || []));
    const experienceScore = clamp01(algo.experienceScore(roleData.experienceInRole || 0, requiredExp));
    const salaryFitScore = clamp01(algo.salaryScore(roleData.expectedSalary || 0, job.maxSalary || 0));
    const profileCompletenessMultiplier = computeProfileCompleteness({ worker, workerUser, roleData });
    const reliabilityScore = 1;

    const finalScore = clamp01(
        skillScore
        * experienceScore
        * salaryFitScore
        * distanceScore
        * profileCompletenessMultiplier
    );

    const tier = mapTier(finalScore);
    const accepted = tier !== 'REJECT';

    return {
        accepted,
        rejectReason: accepted ? null : 'SCORE_BELOW_THRESHOLD',
        tier,
        finalScore,
        skillScore,
        experienceScore,
        salaryFitScore,
        distanceScore,
        profileCompletenessMultiplier,
        reliabilityScore,
        explainability: {
            jobId: String(job._id),
            salaryScore: salaryFitScore,
            skillScore,
            distanceScore,
            experienceScore,
            profileMultiplier: profileCompletenessMultiplier,
            finalScore,
            tier,
        },
        verificationStatus: getVerificationStatus({ worker, workerUser }),
        profileCompleteness: profileCompletenessMultiplier,
        lastActive: getLastActive({ worker }),
        distanceKm: distanceScore === 1 ? 0 : 999,
    };
};

const sortScoredMatches = (left, right) => {
    if (right.finalScore !== left.finalScore) return right.finalScore - left.finalScore;

    const rightVerified = right.verificationStatus ? 1 : 0;
    const leftVerified = left.verificationStatus ? 1 : 0;
    if (rightVerified !== leftVerified) return rightVerified - leftVerified;

    if (right.profileCompleteness !== left.profileCompleteness) {
        return right.profileCompleteness - left.profileCompleteness;
    }

    const rightLastActive = toEpoch(right.lastActive);
    const leftLastActive = toEpoch(left.lastActive);
    if (rightLastActive !== leftLastActive) return rightLastActive - leftLastActive;

    return (left.distanceKm || 999) - (right.distanceKm || 999);
};

const addRejectReason = (accumulator, reason) => {
    const key = reason || 'UNKNOWN';
    accumulator[key] = (accumulator[key] || 0) + 1;
};

const selectRolesForEvaluation = ({ worker = {}, roleCluster = null }) => {
    const roles = Array.isArray(worker.roleProfiles) ? worker.roleProfiles : [];
    if (!roleCluster) return roles;

    const expected = normalizeText(roleCluster);
    return roles.filter((roleData) => {
        const roleName = normalizeText(roleData.roleName);
        return roleName.includes(expected) || expected.includes(roleName);
    });
};

const evaluateBestRoleForJob = ({ worker, workerUser, job, roleCluster = null }) => {
    const roles = selectRolesForEvaluation({ worker, roleCluster });
    if (!roles.length) {
        return { accepted: false, rejectReason: HARD_GATE_REASONS.NULL_CRITICAL_FIELDS };
    }

    let bestAccepted = null;
    let firstRejection = null;

    for (const roleData of roles) {
        const evaluation = evaluateRoleAgainstJob({ job, worker, workerUser, roleData });
        if (evaluation.accepted) {
            const candidate = {
                ...evaluation,
                roleUsed: roleData.roleName,
                roleData,
            };
            if (!bestAccepted || candidate.finalScore > bestAccepted.finalScore) {
                bestAccepted = candidate;
            }
        } else if (!firstRejection) {
            firstRejection = evaluation;
        }
    }

    return bestAccepted || firstRejection || { accepted: false, rejectReason: 'UNKNOWN' };
};

const rankJobsForWorker = ({ worker, workerUser, jobs = [], city = null, roleCluster = null, maxResults = MAX_RESULTS }) => {
    const rejectReasonCounts = {};
    const accepted = [];

    const normalizedCityFilter = normalizeText(city || '');

    for (const job of jobs) {
        if (normalizedCityFilter && normalizeText(job.location) !== normalizedCityFilter) {
            addRejectReason(rejectReasonCounts, 'CITY_FILTER_MISMATCH');
            continue;
        }

        const evaluation = evaluateBestRoleForJob({ worker, workerUser, job, roleCluster });
        if (!evaluation.accepted) {
            addRejectReason(rejectReasonCounts, evaluation.rejectReason);
            continue;
        }

        accepted.push({
            job,
            jobId: job._id,
            roleUsed: evaluation.roleUsed,
            roleData: evaluation.roleData,
            finalScore: evaluation.finalScore,
            matchScore: Math.round(evaluation.finalScore * 100),
            tier: evaluation.tier,
            tierLabel: toLegacyTierLabel(evaluation.tier),
            verificationStatus: evaluation.verificationStatus,
            profileCompleteness: evaluation.profileCompleteness,
            lastActive: evaluation.lastActive,
            distanceKm: evaluation.distanceKm,
            deterministicScores: {
                skillScore: evaluation.skillScore,
                experienceScore: evaluation.experienceScore,
                salaryFitScore: evaluation.salaryFitScore,
                distanceScore: evaluation.distanceScore,
                profileCompletenessMultiplier: evaluation.profileCompletenessMultiplier,
                reliabilityScore: evaluation.reliabilityScore,
            },
            explainability: evaluation.explainability,
        });
    }

    accepted.sort(sortScoredMatches);
    const topMatches = accepted.slice(0, maxResults);

    const avgScore = topMatches.length
        ? topMatches.reduce((sum, row) => sum + row.finalScore, 0) / topMatches.length
        : 0;

    return {
        matches: topMatches,
        totalConsidered: jobs.length,
        totalReturned: topMatches.length,
        avgScore,
        rejectReasonCounts,
    };
};

const rankWorkersForJob = ({ job, candidates = [], roleCluster = null, maxResults = MAX_RESULTS }) => {
    const rejectReasonCounts = {};
    const accepted = [];

    for (const candidate of candidates) {
        const worker = candidate.worker;
        const workerUser = candidate.user || worker?.user;

        const evaluation = evaluateBestRoleForJob({ worker, workerUser, job, roleCluster });
        if (!evaluation.accepted) {
            addRejectReason(rejectReasonCounts, evaluation.rejectReason);
            continue;
        }

        accepted.push({
            worker,
            workerUser,
            applicationMeta: candidate.applicationMeta || null,
            roleUsed: evaluation.roleUsed,
            roleData: evaluation.roleData,
            finalScore: evaluation.finalScore,
            matchScore: Math.round(evaluation.finalScore * 100),
            tier: evaluation.tier,
            tierLabel: toLegacyTierLabel(evaluation.tier),
            verificationStatus: evaluation.verificationStatus,
            profileCompleteness: evaluation.profileCompleteness,
            lastActive: evaluation.lastActive,
            distanceKm: evaluation.distanceKm,
            deterministicScores: {
                skillScore: evaluation.skillScore,
                experienceScore: evaluation.experienceScore,
                salaryFitScore: evaluation.salaryFitScore,
                distanceScore: evaluation.distanceScore,
                profileCompletenessMultiplier: evaluation.profileCompletenessMultiplier,
                reliabilityScore: evaluation.reliabilityScore,
            },
            explainability: evaluation.explainability,
        });
    }

    accepted.sort(sortScoredMatches);
    const topMatches = accepted.slice(0, maxResults);

    const avgScore = topMatches.length
        ? topMatches.reduce((sum, row) => sum + row.finalScore, 0) / topMatches.length
        : 0;

    return {
        matches: topMatches,
        totalConsidered: candidates.length,
        totalReturned: topMatches.length,
        avgScore,
        rejectReasonCounts,
    };
};

module.exports = {
    MAX_RESULTS,
    TIERS,
    HARD_GATE_REASONS,
    mapTier,
    toLegacyTierLabel,
    extractRequiredExperience,
    computeProfileCompleteness,
    evaluateRoleAgainstJob,
    evaluateBestRoleForJob,
    rankJobsForWorker,
    rankWorkersForJob,
    sortScoredMatches,
};
