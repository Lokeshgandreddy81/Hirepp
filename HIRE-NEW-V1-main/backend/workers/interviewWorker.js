require('dotenv').config();

const path = require('path');
const fs = require('fs');
const os = require('os');
const axios = require('axios');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegInstaller = require('ffmpeg-static');

const connectDB = require('../config/db');
const InterviewProcessingJob = require('../models/InterviewProcessingJob');
const Job = require('../models/Job');
const User = require('../models/userModel');
const WorkerProfile = require('../models/WorkerProfile');
const EmployerProfile = require('../models/EmployerProfile');
const Notification = require('../models/Notification');
const { extractWorkerDataFromAudio } = require('../services/geminiService');
const { sendPushNotificationForUser } = require('../services/pushService');
const {
    receiveInterviewMessages,
    deleteInterviewMessage,
    sendToInterviewDeadLetterQueue,
    getQueueSelfRecoveryConfig,
    isQueueConfigured,
    getInterviewQueueDepth,
} = require('../services/sqsInterviewQueue');
const {
    trackInterviewEvent,
    transitionProcessingStatus,
} = require('../services/interviewProcessingService');
const { publishMetric } = require('../services/metricsService');
const {
    fireAndForget,
    markFirstJobDraftCreatedOnce,
} = require('../services/revenueInstrumentationService');
const { safeLogPlatformEvent } = require('../services/eventLoggingService');
const { recordQueueBacklog } = require('../services/systemMonitoringService');
const { isDegradationActive, setDegradationFlag } = require('../services/degradationService');
const { updateResilienceState } = require('../services/resilienceStateService');
const { appendSmartInterviewTraceSyncSafe } = require('../services/smartInterviewTraceService');
const { EMPLOYER_PRIMARY_ROLE } = require('../utils/roleGuards');

ffmpeg.setFfmpegPath(ffmpegInstaller);

const workerConfig = {
    concurrency: Number.parseInt(process.env.INTERVIEW_WORKER_CONCURRENCY || '5', 10),
    pollWaitSeconds: Number.parseInt(process.env.INTERVIEW_WORKER_POLL_WAIT_SECONDS || '20', 10),
    visibilityTimeout: Number.parseInt(process.env.INTERVIEW_WORKER_VISIBILITY_TIMEOUT || '300', 10),
    staleMinutes: Number.parseInt(process.env.INTERVIEW_PROCESSING_STALE_MINUTES || '15', 10),
    processingTimeoutMs: Number.parseInt(process.env.INTERVIEW_PROCESSING_TIMEOUT_MS || String(5 * 60 * 1000), 10),
};
const queueRecoveryConfig = getQueueSelfRecoveryConfig();

let isShuttingDown = false;
let lastStaleRecoveryRun = 0;
const processingDurations = [];
let completionCount = 0;
let failureCount = 0;
const dlqEscalationCounter = new Map();
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, Math.max(0, ms)));

const parseNumber = (value, fallback = 0) => {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
    }
    const cleaned = String(value ?? '').replace(/,/g, '').trim().toLowerCase();
    if (!cleaned) return fallback;
    const token = cleaned.match(/(-?\d+(?:\.\d+)?)\s*(k|thousand|lakh|lac|crore|cr)?/i);
    if (!token) return fallback;
    const base = Number.parseFloat(token[1]);
    if (!Number.isFinite(base)) return fallback;
    const multiplierBySuffix = {
        k: 1000,
        thousand: 1000,
        lakh: 100000,
        lac: 100000,
        crore: 10000000,
        cr: 10000000,
    };
    const suffix = String(token[2] || '').toLowerCase();
    const multiplier = multiplierBySuffix[suffix] || 1;
    return Math.max(0, base * multiplier);
};

const toSkills = (value) => {
    if (Array.isArray(value)) return value.filter(Boolean).map((item) => String(item).trim()).filter(Boolean);
    if (typeof value === 'string') return value.split(',').map((item) => item.trim()).filter(Boolean);
    return [];
};

const extractDuration = async (videoPath) => {
    return new Promise((resolve) => {
        ffmpeg.ffprobe(videoPath, (error, metadata) => {
            if (error) {
                resolve(null);
                return;
            }
            const duration = Number(metadata?.format?.duration);
            resolve(Number.isFinite(duration) ? Math.round(duration) : null);
        });
    });
};

const extractAudio = async (videoPath, audioPath) => {
    return new Promise((resolve, reject) => {
        ffmpeg(videoPath)
            .toFormat('mp3')
            .on('end', resolve)
            .on('error', reject)
            .save(audioPath);
    });
};

const downloadVideo = async (videoUrl, destinationPath) => {
    const normalizedVideoUrl = String(videoUrl || '').trim();
    if (!normalizedVideoUrl) {
        throw new Error('Video URL is required for processing');
    }

    if (normalizedVideoUrl.startsWith('/uploads/')) {
        const localUploadsRoot = path.resolve(__dirname, '..', 'uploads');
        const relativePath = normalizedVideoUrl.replace('/uploads/', '');
        const sourcePath = path.resolve(localUploadsRoot, relativePath);
        await fs.promises.copyFile(sourcePath, destinationPath);
        return;
    }

    if (!normalizedVideoUrl.includes('://') && fs.existsSync(normalizedVideoUrl)) {
        await fs.promises.copyFile(normalizedVideoUrl, destinationPath);
        return;
    }

    const response = await axios.get(videoUrl, {
        responseType: 'stream',
        timeout: 60000,
    });

    await new Promise((resolve, reject) => {
        const writer = fs.createWriteStream(destinationPath);
        response.data.pipe(writer);
        writer.on('finish', resolve);
        writer.on('error', reject);
    });
};

const cleanupFile = (filePath) => {
    if (!filePath) return;
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
    }
};

const appendWorkerTrace = (traceId, phase, data = {}) => {
    appendSmartInterviewTraceSyncSafe({
        traceId: String(traceId || 'worker-trace'),
        phase,
        data,
    });
};

const buildExtractionValidationIssues = ({
    role,
    roleName,
    city,
    skills,
    totalExperience,
    expectedSalary,
    companyName = '',
    transcript = '',
} = {}) => {
    const issues = [];
    if (!String(roleName || '').trim()) issues.push({ field: 'roleName', reason: 'missing_or_empty' });
    if (!String(city || '').trim()) issues.push({ field: 'city', reason: 'missing_or_empty' });
    if (!(Array.isArray(skills) && skills.length > 0)) issues.push({ field: 'skills', reason: 'missing_or_empty' });
    if (!(Number(totalExperience || 0) > 0)) issues.push({ field: 'totalExperience', reason: 'must_be_positive_number' });
    if (!(Number(expectedSalary || 0) > 0)) issues.push({ field: 'expectedSalary', reason: 'must_be_positive_number' });
    if (!String(transcript || '').trim()) issues.push({ field: 'transcript', reason: 'empty_transcript' });
    if (role === EMPLOYER_PRIMARY_ROLE && !String(companyName || '').trim()) {
        issues.push({ field: 'companyName', reason: 'missing_profile_company_name' });
    }
    return issues;
};

const mapExtractionToProfileData = ({
    rawData,
    role,
    userName,
    existingWorkerProfile = null,
    existingEmployerProfile = null,
    existingEmployerJob = null,
}) => {
    if (role === EMPLOYER_PRIMARY_ROLE) {
        const normalizedRoleName = String(rawData?.roleName || rawData?.jobTitle || rawData?.roleTitle || '').trim();
        const normalizedCity = String(rawData?.city || rawData?.location || '').trim();
        const normalizedSkills = toSkills(rawData?.skills || rawData?.requiredSkills);
        const expectedSalaryInt = Math.max(0, Math.round(parseNumber(rawData?.expectedSalary ?? rawData?.salaryRange, 0)));
        const totalExperience = Math.max(0, Math.round(parseNumber(rawData?.totalExperience ?? rawData?.experienceRequired, 0)));
        const companyName = String(rawData?.companyName || existingEmployerProfile?.companyName || userName || '').trim();

        const transcript = String(rawData?.transcript || '').trim();
        return {
            extractedData: {
                jobTitle: normalizedRoleName,
                companyName,
                requiredSkills: normalizedSkills,
                experienceRequired: totalExperience > 0 ? `${totalExperience} years` : '',
                salaryRange: expectedSalaryInt > 0 ? `₹${expectedSalaryInt.toLocaleString('en-IN')}` : '',
                shift: rawData?.shift || rawData?.preferredShift || 'flexible',
                location: normalizedCity,
                description: String(rawData?.description || '').trim(),
                transcript,
                confidenceScore: Number.isFinite(rawData?.confidenceScore) ? rawData.confidenceScore : null,
            },
            validationIssues: buildExtractionValidationIssues({
                role,
                roleName: normalizedRoleName,
                city: normalizedCity,
                skills: normalizedSkills,
                totalExperience,
                expectedSalary: expectedSalaryInt,
                companyName,
                transcript,
            }),
        };
    }

    const fullName = String(rawData?.firstName || rawData?.name || userName || '').trim();
    const totalExperience = Math.max(0, Math.round(parseNumber(rawData?.totalExperience ?? rawData?.experienceYears, 0)));
    const expectedSalaryInt = Math.max(0, Math.round(parseNumber(rawData?.expectedSalary, 0)));
    const roleTitle = String(rawData?.roleName || rawData?.roleTitle || '').trim();
    const city = String(rawData?.city || rawData?.location || '').trim();
    const skills = toSkills(rawData?.skills);
    const transcript = String(rawData?.transcript || '').trim();

    return {
        extractedData: {
            name: fullName,
            roleTitle,
            skills,
            experienceYears: totalExperience,
            expectedSalary: expectedSalaryInt > 0 ? `₹${expectedSalaryInt.toLocaleString('en-IN')}` : '',
            preferredShift: rawData?.preferredShift || 'flexible',
            location: city,
            summary: String(rawData?.summary || '').trim(),
            transcript,
            confidenceScore: Number.isFinite(rawData?.confidenceScore) ? rawData.confidenceScore : null,
        },
        validationIssues: buildExtractionValidationIssues({
            role,
            roleName: roleTitle,
            city,
            skills,
            totalExperience,
            expectedSalary: expectedSalaryInt,
            transcript,
        }),
    };
};

const createDraftJobIfEmployer = async ({ userId, role, extractedData }) => {
    if (role !== EMPLOYER_PRIMARY_ROLE) return null;

    const createdJob = await Job.create({
        employerId: userId,
        title: extractedData.jobTitle,
        companyName: extractedData.companyName,
        location: extractedData.location,
        salaryRange: extractedData.salaryRange,
        requirements: extractedData.requiredSkills || [],
        shift: String(extractedData.shift || 'flexible').toLowerCase() === 'day'
            ? 'Day'
            : String(extractedData.shift || 'flexible').toLowerCase() === 'night'
                ? 'Night'
                : 'Flexible',
        isPulse: false,
        isOpen: true,
        status: 'active',
    });

    return createdJob._id;
};

const computeTranscriptWordCount = (extractedData) => {
    const searchable = [
        extractedData?.summary,
        extractedData?.description,
        Array.isArray(extractedData?.skills) ? extractedData.skills.join(' ') : '',
        Array.isArray(extractedData?.requiredSkills) ? extractedData.requiredSkills.join(' ') : '',
    ]
        .filter(Boolean)
        .join(' ')
        .trim();

    if (!searchable) return 0;
    return searchable.split(/\s+/).filter(Boolean).length;
};

const computeP95 = (values = []) => {
    if (!values.length) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.max(0, Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1));
    return sorted[index];
};

const withTimeout = (promiseFactory, timeoutMs, timeoutMessage = 'Interview processing timed out') => {
    let timeoutHandle;
    const timeoutPromise = new Promise((_, reject) => {
        timeoutHandle = setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
    });

    return Promise.race([promiseFactory(), timeoutPromise])
        .finally(() => {
            if (timeoutHandle) clearTimeout(timeoutHandle);
        });
};

const notifyInterviewReady = async ({ userId, processingId, correlationId }) => {
    const lock = await InterviewProcessingJob.updateOne(
        { _id: processingId, status: 'completed', notificationSentAt: null },
        { $set: { notificationSentAt: new Date() } }
    );

    if (!lock.modifiedCount) {
        console.log(JSON.stringify({
            event: 'interview_ready_notification_skipped',
            correlationId,
            reason: 'already_sent',
        }));
        return;
    }

    const user = await User.findById(userId).select('pushTokens notificationPreferences');
    await Notification.create({
        user: userId,
        type: 'interview_ready',
        title: 'Smart Interview Ready',
        message: 'Your interview analysis is ready. Review and confirm your profile.',
        relatedData: {
            processingId,
        },
    });

    await sendPushNotificationForUser(
        user,
        'Smart Interview Ready',
        'Your interview is processed. Tap to review.',
        {
            type: 'INTERVIEW_READY',
            processingId: String(processingId),
        },
        'interview_ready'
    );

    console.log(JSON.stringify({
        event: 'interview_ready_notification_sent',
        correlationId,
        userId: String(userId),
    }));
};

const handleRetryLimitExceeded = async ({
    message,
    correlationId,
    processingId,
    role,
    reason = 'max_receive_count_exceeded',
}) => {
    await sendToInterviewDeadLetterQueue({
        payload: {
            processingId,
            body: message?.Body || null,
        },
        reason,
        originalMessage: message,
    });

    if (processingId) {
        await InterviewProcessingJob.findByIdAndUpdate(processingId, {
            $set: {
                status: 'failed',
                errorMessage: `Moved to DLQ: ${reason}`,
                completedAt: new Date(),
            },
        });
    }

    await publishMetric({
        metricName: 'InterviewFailureCount',
        value: 1,
        role: role || 'system',
        correlationId,
        dimensions: { Reason: 'DeadLetterQueue' },
    });

    console.warn(JSON.stringify({
        event: 'interview_dlq_moved',
        correlationId,
        receiveCount: Number(message?.Attributes?.ApproximateReceiveCount || 0),
        reason,
    }));

    await deleteInterviewMessage(message?.ReceiptHandle);
};

const processQueueMessage = async (message) => {
    const startedAt = Date.now();
    let parsedBody = null;

    try {
        parsedBody = JSON.parse(message.Body || '{}');
    } catch (error) {
        console.warn(JSON.stringify({
            event: 'interview_worker_invalid_message',
            correlationId: 'unknown',
            message: error.message,
        }));
        await deleteInterviewMessage(message.ReceiptHandle);
        return;
    }

    const { processingId, userId, role, videoUrl } = parsedBody;
    const correlationId = String(processingId || 'unknown');
    appendWorkerTrace(correlationId, 'pipeline_start', {
        processingId: String(processingId || ''),
        userId: String(userId || ''),
        role: String(role || ''),
    });
    const receiveCount = Number.parseInt(message?.Attributes?.ApproximateReceiveCount || '1', 10) || 1;
    if (receiveCount >= Number(queueRecoveryConfig.maxReceiveCount || 5)) {
        await handleRetryLimitExceeded({
            message,
            correlationId,
            processingId,
            role,
        });
        return;
    }
    if (receiveCount >= 4) {
        const currentEscalationCount = (dlqEscalationCounter.get(correlationId) || 0) + 1;
        dlqEscalationCounter.set(correlationId, currentEscalationCount);
        if (currentEscalationCount >= 2) {
            console.warn(JSON.stringify({
                event: 'interview_dlq_escalation',
                severity: 'critical',
                correlationId,
                receiveCount,
            }));
            await publishMetric({
                metricName: 'InterviewFailureCount',
                value: 1,
                role,
                correlationId,
                dimensions: { Reason: 'DLQEscalation' },
            });
        }
    }
    if (!processingId || !userId || !videoUrl) {
        console.warn(JSON.stringify({
            event: 'interview_worker_message_missing_fields',
            correlationId,
        }));
        await deleteInterviewMessage(message.ReceiptHandle);
        return;
    }

    const existingJob = await InterviewProcessingJob.findById(processingId).select('status');
    if (!existingJob) {
        console.warn(JSON.stringify({
            event: 'interview_worker_job_missing',
            correlationId,
        }));
        await deleteInterviewMessage(message.ReceiptHandle);
        return;
    }

    if (existingJob.status === 'completed') {
        console.log(JSON.stringify({
            event: 'interview_worker_skip_completed',
            correlationId,
        }));
        await deleteInterviewMessage(message.ReceiptHandle);
        return;
    }

    if (existingJob.status === 'failed') {
        await transitionProcessingStatus({
            processingId,
            fromStatus: 'failed',
            toStatus: 'pending',
            set: {
                status: 'pending',
                errorMessage: null,
                completedAt: null,
            },
        });
    }

    const claimResult = await transitionProcessingStatus({
        processingId,
        fromStatus: 'pending',
        toStatus: 'processing',
        set: {
            status: 'processing',
            startedAt: new Date(),
            errorMessage: null,
        },
    });

    if (!claimResult.modifiedCount) {
        console.log(JSON.stringify({
            event: 'interview_worker_claim_skipped',
            correlationId,
            currentStatus: existingJob.status,
        }));
        return;
    }

    await trackInterviewEvent({
        userId,
        eventName: 'INTERVIEW_PROCESSING_STARTED',
        processingId,
        role,
        durationMs: 0,
    });

    const tmpBase = path.join(os.tmpdir(), `interview-${processingId}-${Date.now()}`);
    const videoPath = `${tmpBase}.mp4`;
    const audioPath = `${tmpBase}.mp3`;

    try {
        const {
            mapped,
            createdJobId,
            videoDuration,
            transcriptWordCount,
            confidenceScore,
        } = await withTimeout(async () => {
            await downloadVideo(videoUrl, videoPath);
            const videoDurationResolved = await extractDuration(videoPath);
            appendWorkerTrace(correlationId, 'video_downloaded', {
                videoUrl,
                videoPath,
                videoDurationSeconds: videoDurationResolved,
            });
            await extractAudio(videoPath, audioPath);
            const audioStat = fs.statSync(audioPath);
            appendWorkerTrace(correlationId, 'audio_conversion', {
                audioPath,
                mimeType: 'audio/mpeg',
                sizeBytes: Number(audioStat?.size || 0),
            });
            const aiData = await extractWorkerDataFromAudio(audioPath, role, {
                userId,
                interviewProcessingId: processingId,
                rateLimitKey: String(userId || processingId || 'interview-worker'),
                region: null,
                traceId: correlationId,
                correlationId,
            });
            const rawData = Array.isArray(aiData) ? aiData[0] : aiData;
            const extractionFallbackReason = rawData?.manualFallbackRequired ? 'manual_fallback_required' : null;
            appendWorkerTrace(correlationId, 'transcript_received', {
                transcript: String(rawData?.transcript || '').trim(),
                transcriptLength: String(rawData?.transcript || '').trim().length,
            });
            appendWorkerTrace(correlationId, 'gemini_structured_output', {
                rawTranscript: String(rawData?.transcript || '').trim(),
                parsedStructuredObject: rawData,
            });

            const [user, existingWorkerProfile, existingEmployerProfile] = await Promise.all([
                User.findById(userId).select('name'),
                role === EMPLOYER_PRIMARY_ROLE
                    ? Promise.resolve(null)
                    : WorkerProfile.findOne({ user: userId }).select('firstName lastName city totalExperience roleProfiles').lean(),
                role === EMPLOYER_PRIMARY_ROLE
                    ? EmployerProfile.findOne({ user: userId }).select('companyName location industry').lean()
                    : Promise.resolve(null),
            ]);
            const mappedData = mapExtractionToProfileData({
                rawData,
                role,
                userName: user?.name || '',
                existingWorkerProfile,
                existingEmployerProfile,
            });

            const validationIssues = Array.isArray(mappedData?.validationIssues) ? mappedData.validationIssues : [];
            appendWorkerTrace(correlationId, 'validation_layer', {
                normalizedExtraction: mappedData?.extractedData || null,
                validationIssues,
            });
            if (validationIssues.length) {
                const validationError = new Error('Smart Interview extraction is incomplete and cannot be persisted.');
                validationError.statusCode = 422;
                validationError.validationIssues = validationIssues;
                throw validationError;
            }
            appendWorkerTrace(correlationId, 'validation_passed', {
                role: String(role || ''),
                skillsCount: Array.isArray(mappedData?.extractedData?.skills || mappedData?.extractedData?.requiredSkills)
                    ? (mappedData.extractedData.skills || mappedData.extractedData.requiredSkills).length
                    : 0,
            });
            appendWorkerTrace(correlationId, 'profile_builder', {
                role,
                extractedData: mappedData.extractedData,
            });

            const draftJobId = await createDraftJobIfEmployer({
                userId,
                role,
                extractedData: mappedData.extractedData,
            });
            if (draftJobId) {
                console.log(JSON.stringify({
                    event: 'draft_job_created',
                    metric: 'draft_job_created',
                    correlationId,
                    jobId: String(draftJobId),
                }));
                fireAndForget('markFirstJobDraftCreatedOnce', () => markFirstJobDraftCreatedOnce({
                    employerId: userId,
                    jobId: draftJobId,
                    city: mappedData?.extractedData?.location || null,
                    roleCluster: mappedData?.extractedData?.jobTitle || null,
                }), { correlationId, userId: String(userId), jobId: String(draftJobId) });
            }

            const transcriptWordCountResolved = computeTranscriptWordCount(mappedData.extractedData);
            const confidenceScoreResolved = Number.isFinite(mappedData.extractedData?.confidenceScore)
                ? Number(mappedData.extractedData.confidenceScore)
                : null;

            return {
                mapped: mappedData,
                createdJobId: draftJobId,
                videoDuration: videoDurationResolved,
                transcriptWordCount: transcriptWordCountResolved,
                confidenceScore: confidenceScoreResolved,
                extractionFallbackReason,
            };
        }, workerConfig.processingTimeoutMs, 'Interview processing timed out after 5 minutes');

        const completionResult = await transitionProcessingStatus({
            processingId,
            fromStatus: 'processing',
            toStatus: 'completed',
            set: {
                status: 'completed',
                extractedData: mapped.extractedData,
                createdJobId: createdJobId || null,
                completedAt: new Date(),
                rawMetrics: {
                    videoDuration,
                    transcriptWordCount,
                    confidenceScore,
                    extractionFallbackReason,
                },
            },
        });

        appendWorkerTrace(correlationId, 'db_write', {
            processingId: String(processingId),
            createdJobId: createdJobId ? String(createdJobId) : null,
            finalSavedProfileDocument: mapped?.extractedData || null,
            rawMetrics: {
                videoDuration,
                transcriptWordCount,
                confidenceScore,
            },
        });
        appendWorkerTrace(correlationId, 'profile_saved', {
            processingId: String(processingId),
            createdJobId: createdJobId ? String(createdJobId) : null,
        });

        if (!completionResult.modifiedCount) {
            console.warn(JSON.stringify({
                event: 'interview_worker_completion_transition_rejected',
                correlationId,
            }));
            return;
        }

        await notifyInterviewReady({ userId, processingId, correlationId });

        await trackInterviewEvent({
            userId,
            eventName: 'INTERVIEW_PROCESSING_COMPLETED',
            processingId,
            role,
            durationMs: Date.now() - startedAt,
        });
        safeLogPlatformEvent({
            type: 'interview_complete',
            userId,
            meta: {
                processingId: String(processingId),
                role,
                durationMs: Date.now() - startedAt,
            },
        });

        const durationMs = Date.now() - startedAt;
        processingDurations.push(durationMs);
        if (processingDurations.length > 200) processingDurations.shift();
        completionCount += 1;
        console.log(JSON.stringify({
            metric: 'processing_time_p95',
            value: computeP95(processingDurations),
            sampleSize: processingDurations.length,
            correlationId,
        }));
        await publishMetric({
            metricName: 'InterviewProcessingTimeMs',
            value: durationMs,
            unit: 'Milliseconds',
            role,
            correlationId,
        });
        console.log(JSON.stringify({
            metric: 'confirm_completion_rate',
            value: completionCount / Math.max(1, completionCount + failureCount),
            correlationId,
        }));
        await publishMetric({
            metricName: 'ConfirmCompletionRate',
            value: completionCount / Math.max(1, completionCount + failureCount),
            role,
            correlationId,
        });
        appendWorkerTrace(correlationId, 'response_sent', {
            status: 'completed',
            processingId: String(processingId),
        });

        await deleteInterviewMessage(message.ReceiptHandle);
    } catch (error) {
        console.warn(JSON.stringify({
            event: 'interview_worker_error',
            correlationId,
            message: error.message,
        }));
        appendWorkerTrace(correlationId, 'pipeline_error', {
            message: String(error?.message || ''),
            statusCode: Number(error?.statusCode || 500),
            validationIssues: error?.validationIssues || null,
        });
        await transitionProcessingStatus({
            processingId,
            fromStatus: 'processing',
            toStatus: 'failed',
            set: {
                status: 'failed',
                errorMessage: error.message || 'Interview processing failed',
                completedAt: new Date(),
            },
        });

        await trackInterviewEvent({
            userId,
            eventName: 'INTERVIEW_PROCESSING_FAILED',
            processingId,
            role,
            durationMs: Date.now() - startedAt,
            errorType: error.name || 'processing_error',
        });
        failureCount += 1;
        const timeoutTriggered = String(error?.message || '').toLowerCase().includes('timed out');
        await publishMetric({
            metricName: timeoutTriggered ? 'InterviewTimeoutCount' : 'InterviewFailureCount',
            value: 1,
            role,
            correlationId,
            dimensions: { Reason: timeoutTriggered ? 'ProcessingTimeout' : 'ProcessingError' },
        });
        console.log(JSON.stringify({
            metric: 'failure_rate',
            value: failureCount / Math.max(1, completionCount + failureCount),
            correlationId,
        }));
    } finally {
        cleanupFile(videoPath);
        cleanupFile(audioPath);
    }
};

const recoverStaleJobsIfNeeded = async () => {
    const now = Date.now();
    if (now - lastStaleRecoveryRun < 60_000) return;
    lastStaleRecoveryRun = now;

    const staleThreshold = new Date(now - workerConfig.staleMinutes * 60 * 1000);
    const result = await InterviewProcessingJob.updateMany(
        {
            status: 'processing',
            startedAt: { $lt: staleThreshold },
        },
        {
            $set: {
                status: 'pending',
                startedAt: null,
                errorMessage: 'Recovered stale processing job.',
            },
        }
    );

    if (result.modifiedCount > 0) {
        console.log(JSON.stringify({
            event: 'interview_worker_recovered_stale_jobs',
            metric: 'recovered_stale_jobs',
            value: result.modifiedCount,
            correlationId: 'stale-recovery',
        }));
    }
};

const runLoop = async () => {
    console.log('Interview worker started.');

    while (!isShuttingDown) {
        try {
            if (isDegradationActive('queuePaused')) {
                await sleep(1000);
                continue;
            }

            await recoverStaleJobsIfNeeded();
            const queueDepth = await getInterviewQueueDepth();
            updateResilienceState({
                queueDepth,
                queueBackpressureActive: queueDepth >= Number.parseInt(process.env.QUEUE_BACKPRESSURE_DEPTH || '1500', 10),
            });
            await recordQueueBacklog({ queueDepth });

            if (queueDepth >= Number.parseInt(process.env.QUEUE_BACKPRESSURE_DEPTH || '1500', 10)) {
                setDegradationFlag('smartInterviewPaused', true, 'queue_backpressure');
                setDegradationFlag('heavyAnalyticsPaused', true, 'queue_backpressure');
            } else if (!isDegradationActive('queuePaused')) {
                setDegradationFlag('smartInterviewPaused', false, null);
                setDegradationFlag('heavyAnalyticsPaused', false, null);
            }

            await publishMetric({
                metricName: 'InterviewQueueDepth',
                value: queueDepth,
                role: 'system',
                correlationId: 'worker-loop',
            });
            const messages = await receiveInterviewMessages(
                workerConfig.concurrency,
                workerConfig.pollWaitSeconds,
                workerConfig.visibilityTimeout
            );

            if (!messages.length) continue;
            await Promise.all(messages.map((message) => processQueueMessage(message)));
        } catch (error) {
            console.warn('Interview worker loop error:', error.message);
        }
    }

    console.log('Interview worker stopped.');
};

const bootstrap = async () => {
    await connectDB();

    if (!isQueueConfigured()) {
        console.warn('Interview worker cannot start: queue is not configured.');
        process.exit(1);
    }

    await runLoop();
};

process.on('SIGTERM', () => {
    isShuttingDown = true;
});

process.on('SIGINT', () => {
    isShuttingDown = true;
});

bootstrap().catch((error) => {
    console.warn('Interview worker bootstrap failed:', error.message);
    process.exit(1);
});
