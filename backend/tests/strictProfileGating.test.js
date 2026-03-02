const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { app } = require('../index');
const User = require('../models/userModel');
const WorkerProfile = require('../models/WorkerProfile');
const EmployerProfile = require('../models/EmployerProfile');
const crypto = require('crypto');
const { generateToken } = require('../utils/generateToken');

let mongoServer;

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
    }
    await mongoose.connect(uri);
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

afterEach(async () => {
    await User.deleteMany({});
    await WorkerProfile.deleteMany({});
    await EmployerProfile.deleteMany({});
});

describe('Strict Profile Completion Gating Enforcement', () => {

    const createTestUser = async (overrides = {}) => {
        const user = await User.create({
            name: 'Test Gate User',
            email: `testgate_${Date.now()}@example.com`,
            password: 'Password123!',
            phoneNumber: '+15550001111',
            role: 'candidate',
            activeRole: 'worker',
            isVerified: overrides.isVerified || false,
            otpVerified: overrides.otpVerified || false,
            profileComplete: overrides.profileComplete || false,
            ...overrides
        });
        const token = generateToken(user._id, { tokenVersion: user.tokenVersion || 0 });
        return { user, token };
    };

    it('1. Rejects request with 403 OTP_NOT_VERIFIED if OTP not verified', async () => {
        const { user, token } = await createTestUser({ otpVerified: false, profileComplete: true });

        // Try accessing jobs (protected)
        const res = await request(app)
            .get('/api/jobs')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(403);
        expect(res.body.code).toBe('OTP_NOT_VERIFIED');
    });

    it('2. Rejects request with 403 PROFILE_INCOMPLETE if profile not complete', async () => {
        const { user, token } = await createTestUser({ otpVerified: true, profileComplete: false });

        // Try accessing applications (protected)
        const res = await request(app)
            .get('/api/applications')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(403);
        expect(res.body.code).toBe('PROFILE_INCOMPLETE');
    });

    it('3. Exempts setup routes allowing profile completion update', async () => {
        // Complete false, OTP true -> should be able to hit /api/users/profile/complete
        const { user, token } = await createTestUser({ otpVerified: true, profileComplete: false });

        // Need to create worker profile first so it passes validation in endpoint
        await WorkerProfile.create({
            user: user._id,
            firstName: 'Test',
            city: 'Seattle'
        });

        const res = await request(app)
            .post('/api/users/profile/complete')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.message).toBe('Profile marked complete');

        // Check DB
        const dbUser = await User.findById(user._id);
        expect(dbUser.profileComplete).toBe(true);
    });

    it('4. Role Switch: Rejects if switching to employer but employer profile incomplete', async () => {
        const { user, token } = await createTestUser({
            otpVerified: true,
            profileComplete: true,
            activeRole: 'employer'
        });

        // User has no EmployerProfile created
        const res = await request(app)
            .get('/api/applications') // arbitrary protected
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(403);
        expect(res.body.code).toBe('PROFILE_INCOMPLETE_ROLE');
    });

    it('5. Allows request if OTP verified, Profile Complete, and Role Profile exists', async () => {
        const { user, token } = await createTestUser({
            otpVerified: true,
            profileComplete: true,
            activeRole: 'worker'
        });

        await WorkerProfile.create({
            user: user._id,
            firstName: 'Valid',
            city: 'London',
            roleProfiles: [{ roleName: 'Developer', skills: ['js', 'node'] }]
        });

        // Test arbitrary protected route that doesn't 404 (or even if it 404s, it shouldn't 403)
        const res = await request(app)
            .get('/api/users/worker-lock-in-summary')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
    });
});
