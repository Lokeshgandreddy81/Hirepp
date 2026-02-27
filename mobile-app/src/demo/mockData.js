export const demoUser = {
    _id: 'demo-user-1',
    name: 'Lokesh Demo',
    email: 'demo@hirecircle.app',
    role: 'candidate',
    primaryRole: 'worker',
};

export const demoProfile = {
    _id: 'demo-profile-1',
    firstName: 'Lokesh',
    lastName: 'Demo',
    city: 'Hyderabad',
    totalExperience: 5,
    companyName: 'HireCircle Demo Co',
    location: 'Hyderabad',
    avatar: null,
    roleProfiles: [
        {
            roleName: 'Operations Specialist',
            experienceInRole: 5,
            skills: ['Logistics', 'Warehouse Ops', 'Team Coordination'],
            lastUpdated: new Date().toISOString(),
        },
    ],
};

export const mockJobs = [
    {
        _id: 'demo-job-1',
        title: 'Warehouse Operations Lead',
        companyName: 'LogiTech India',
        location: 'Hyderabad',
        salaryRange: '₹35,000 - ₹45,000',
        type: 'Full-time',
        requirements: ['Inventory Management', 'Team Handling', 'Shift Planning'],
        createdAt: '2026-02-20T10:00:00.000Z',
    },
    {
        _id: 'demo-job-2',
        title: 'Heavy Vehicle Driver',
        companyName: 'Prime Movers',
        location: 'Bangalore',
        salaryRange: '₹28,000 - ₹38,000',
        type: 'Full-time',
        requirements: ['HMV License', 'Long Route Experience', 'Safety Compliance'],
        createdAt: '2026-02-18T12:00:00.000Z',
    },
    {
        _id: 'demo-job-3',
        title: 'Last-Mile Fleet Supervisor',
        companyName: 'QuickDrop',
        location: 'Mumbai',
        salaryRange: '₹40,000 - ₹52,000',
        type: 'Full-time',
        requirements: ['Fleet Tracking', 'Delivery Ops', 'Vendor Management'],
        createdAt: '2026-02-16T08:30:00.000Z',
    },
];

export const mockApplications = [
    {
        _id: 'demo-app-1',
        status: 'accepted',
        lastMessage: 'Can you join by Monday?',
        updatedAt: '2026-02-25T11:30:00.000Z',
        matchScore: 94,
        applicationStatus: 'accepted',
        initiatedBy: 'worker',
        job: mockJobs[0],
        worker: {
            _id: 'demo-worker-1',
            firstName: 'Lokesh',
            lastName: 'Demo',
            name: 'Lokesh Demo',
            city: 'Hyderabad',
            totalExperience: 5,
            roleProfiles: demoProfile.roleProfiles,
        },
        employer: {
            _id: 'demo-employer-1',
            name: 'Anita Sharma',
            companyName: mockJobs[0].companyName,
            email: 'hiring@logitech.in',
            phone: '+91 90000 11111',
            website: 'https://logitech.in',
            industry: 'Logistics',
            location: 'Hyderabad',
        },
    },
    {
        _id: 'demo-app-2',
        status: 'shortlisted',
        lastMessage: 'Please share your availability this week.',
        updatedAt: '2026-02-24T09:10:00.000Z',
        matchScore: 88,
        applicationStatus: 'shortlisted',
        initiatedBy: 'worker',
        job: mockJobs[1],
        worker: {
            _id: 'demo-worker-1',
            firstName: 'Lokesh',
            lastName: 'Demo',
            name: 'Lokesh Demo',
            city: 'Hyderabad',
            totalExperience: 5,
            roleProfiles: demoProfile.roleProfiles,
        },
        employer: {
            _id: 'demo-employer-2',
            name: 'Ravi Menon',
            companyName: mockJobs[1].companyName,
            email: 'jobs@primemovers.in',
            phone: '+91 90000 22222',
            website: 'https://primemovers.in',
            industry: 'Transport',
            location: 'Bangalore',
        },
    },
];

export const mockChatMessages = [
    {
        _id: 'demo-msg-1',
        sender: 'demo-employer-1',
        type: 'text',
        text: 'Hi Lokesh, thanks for applying.',
        createdAt: '2026-02-25T11:20:00.000Z',
    },
    {
        _id: 'demo-msg-2',
        sender: 'demo-user-1',
        type: 'text',
        text: 'Thank you. I am available for interview this week.',
        createdAt: '2026-02-25T11:23:00.000Z',
    },
    {
        _id: 'demo-msg-3',
        sender: 'demo-employer-1',
        type: 'file',
        fileName: 'Interview_Schedule.pdf',
        fileUrl: 'https://example.com/demo/interview-schedule.pdf',
        fileSize: 248120,
        createdAt: '2026-02-25T11:25:00.000Z',
    },
];

export const mockFeedPosts = [
    {
        _id: 'demo-feed-1',
        type: 'text',
        content: 'Need 3 operations associates for immediate onboarding in Hyderabad.',
        mediaUrl: '',
        createdAt: '2026-02-26T09:30:00.000Z',
        user: { _id: 'demo-employer-1', name: 'Anita Sharma', primaryRole: 'employer' },
        likes: ['u1', 'u2', 'u3'],
        comments: [{ text: 'Interested. Please DM.' }],
    },
    {
        _id: 'demo-feed-2',
        type: 'voice',
        content: 'Voice update from field team on route optimization.',
        mediaUrl: 'https://example.com/demo/voice-note.m4a',
        createdAt: '2026-02-26T07:00:00.000Z',
        user: { _id: 'demo-worker-2', name: 'Sunil Driver', primaryRole: 'worker' },
        likes: ['u1'],
        comments: [],
    },
    {
        _id: 'demo-feed-3',
        type: 'photo',
        content: 'New warehouse floor ready for intake.',
        mediaUrl: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1200&q=60',
        createdAt: '2026-02-25T15:45:00.000Z',
        user: { _id: 'demo-employer-3', name: 'Warehouse Team', primaryRole: 'employer' },
        likes: ['u1', 'u4'],
        comments: [{ text: 'Great setup.' }],
    },
];

export const mockCircles = [
    {
        _id: 'demo-circle-1',
        name: 'Heavy Haulers India',
        skill: 'Logistics',
        description: 'Rate cards, route alerts, and maintenance tips for heavy vehicle operators.',
        members: ['demo-user-1', 'demo-user-2'],
    },
    {
        _id: 'demo-circle-2',
        name: 'Warehouse Ops Guild',
        skill: 'Operations',
        description: 'Discuss staffing, SOPs, and throughput improvements.',
        members: ['demo-user-1'],
    },
    {
        _id: 'demo-circle-3',
        name: 'Delivery Growth Club',
        skill: 'Last-Mile',
        description: 'Share incentive patterns and city-level demand updates.',
        members: ['demo-user-3'],
    },
];

export const mockMentors = [
    { id: 1, name: 'Suresh V.', exp: '20y', skill: 'Heavy Transport', rating: 4.9, sessions: 340 },
    { id: 2, name: 'Kavya S.', exp: '12y', skill: 'Electrical Work', rating: 4.8, sessions: 215 },
    { id: 3, name: 'Anand R.', exp: '8y', skill: 'Warehouse Ops', rating: 4.7, sessions: 180 },
];

export const mockBounties = [
    { id: 'demo-job-1', company: 'LogiTech India', role: 'Warehouse Operations Lead', bonus: '₹5,000', bonusValue: 5000, totalPot: '₹50,000', referrals: 12, expiresInDays: 5, category: 'Operations' },
    { id: 'demo-job-2', company: 'Prime Movers', role: 'Heavy Vehicle Driver', bonus: '₹3,500', bonusValue: 3500, totalPot: '₹35,000', referrals: 9, expiresInDays: 4, category: 'Driving' },
    { id: 'demo-job-3', company: 'QuickDrop', role: 'Fleet Supervisor', bonus: '₹6,000', bonusValue: 6000, totalPot: '₹60,000', referrals: 7, expiresInDays: 6, category: 'Logistics' },
];

export const mockNotifications = [
    {
        _id: 'demo-notif-1',
        type: 'message_received',
        title: 'New Message',
        message: 'Anita Sharma sent you an interview update.',
        isRead: false,
        createdAt: '2026-02-26T10:00:00.000Z',
        relatedData: { applicationId: 'demo-app-1' },
    },
    {
        _id: 'demo-notif-2',
        type: 'status_update',
        title: 'Application Status Updated',
        message: 'Your application for Heavy Vehicle Driver is shortlisted.',
        isRead: false,
        createdAt: '2026-02-25T14:10:00.000Z',
        relatedData: { applicationId: 'demo-app-2' },
    },
    {
        _id: 'demo-notif-3',
        type: 'match_found',
        title: 'New Opportunity Match',
        message: 'You have a 91% match for Fleet Supervisor.',
        isRead: true,
        createdAt: '2026-02-24T08:10:00.000Z',
        relatedData: { jobId: 'demo-job-3' },
    },
];

export const mockCourses = [
    { id: 'course-1', title: 'Warehouse Leadership Basics', duration: '3h' },
    { id: 'course-2', title: 'Fleet Safety Fundamentals', duration: '2h' },
    { id: 'course-3', title: 'Last-Mile Ops Metrics', duration: '1.5h' },
];

export const mockEnrolledCourses = [
    { courseId: 'course-1' },
];
