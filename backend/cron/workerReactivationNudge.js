require('dotenv').config();

const connectDB = require('../config/db');
const WorkerProfile = require('../models/WorkerProfile');
const Application = require('../models/Application');
const Notification = require('../models/Notification');
const User = require('../models/userModel');
const { sendPushNotificationForUser } = require('../services/pushService');
const { createAnalyticsEvent } = require('../services/revenueInstrumentationService');

const APPLICATION_IDLE_DAYS = Number.parseInt(process.env.WORKER_REACTIVATION_IDLE_DAYS || '7', 10);
const NUDGE_COOLDOWN_DAYS = Number.parseInt(process.env.WORKER_REACTIVATION_COOLDOWN_DAYS || '3', 10);
const MAX_NUDGES_PER_RUN = Number.parseInt(process.env.WORKER_REACTIVATION_MAX_PER_RUN || '1000', 10);

const runWorkerReactivationNudge = async () => {
    const now = Date.now();
    const applicationIdleThreshold = new Date(now - APPLICATION_IDLE_DAYS * 24 * 60 * 60 * 1000);
    const cooldownThreshold = new Date(now - NUDGE_COOLDOWN_DAYS * 24 * 60 * 60 * 1000);

    const verifiedProfiles = await WorkerProfile.find({ interviewVerified: true })
        .select('_id user city roleProfiles')
        .limit(MAX_NUDGES_PER_RUN);

    if (!verifiedProfiles.length) {
        console.log('[worker-reactivation] no interview-verified profiles found');
        return;
    }

    const workerIds = verifiedProfiles.map((profile) => profile._id);
    const userIds = verifiedProfiles.map((profile) => profile.user);

    const recentApplications = await Application.distinct('worker', {
        worker: { $in: workerIds },
        createdAt: { $gte: applicationIdleThreshold },
    });
    const workersWithRecentApplications = new Set(recentApplications.map((id) => String(id)));

    const recentNudges = await Notification.find({
        user: { $in: userIds },
        type: 'status_update',
        'relatedData.nudgeType': 'worker_reactivation',
        createdAt: { $gte: cooldownThreshold },
    }).select('user');
    const usersWithRecentNudges = new Set(recentNudges.map((item) => String(item.user)));

    let nudgesSent = 0;

    for (const profile of verifiedProfiles) {
        const workerKey = String(profile._id);
        const userKey = String(profile.user);

        if (workersWithRecentApplications.has(workerKey)) continue;
        if (usersWithRecentNudges.has(userKey)) continue;

        const user = await User.findById(profile.user).select('pushTokens notificationPreferences');
        if (!user) continue;

        await Notification.create({
            user: profile.user,
            type: 'status_update',
            title: 'New jobs matching your skills',
            message: 'Your verified interview profile has fresh matches waiting. Apply now.',
            relatedData: {
                nudgeType: 'worker_reactivation',
            },
        });

        await sendPushNotificationForUser(
            user,
            'New jobs matching your skills',
            'Your verified interview profile has fresh matches waiting.',
            {
                type: 'worker_reactivation',
            },
            'new_job_recommendations'
        );

        await createAnalyticsEvent({
            userId: profile.user,
            eventName: 'WORKER_REACTIVATION_NUDGE_SENT',
            metadata: {
                city: profile.city || null,
                roleCluster: profile?.roleProfiles?.[0]?.roleName || null,
            },
        });

        nudgesSent += 1;
    }

    console.log(`[worker-reactivation] sent ${nudgesSent} nudges`);
};

const main = async () => {
    await connectDB();
    await runWorkerReactivationNudge();
    process.exit(0);
};

main().catch((error) => {
    console.error('[worker-reactivation] failed:', error.message);
    process.exit(1);
});
