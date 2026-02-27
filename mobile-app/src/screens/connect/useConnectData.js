import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Animated, Share } from 'react-native';
import client from '../../api/client';
import { AuthContext } from '../../context/AuthContext';
import { DEMO_MODE } from '../../config';

const MOCK_POSTS = [
    {
        _id: 'p1',
        type: 'text',
        author: 'Amir Khan',
        role: 'Construction Lead',
        time: 'Just now',
        karma: 450,
        text: 'Any electricians available for a quick site inspection in Banjara Hills? Emergency fix needed.',
        likes: 12,
        comments: 3,
        vouched: false,
        avatar: 'https://i.pravatar.cc/150?u=amir',
    },
    {
        _id: 'p2',
        type: 'voice',
        author: 'Sunil Driver',
        role: 'Heavy Vehicle Expert',
        time: '3h ago',
        karma: 1200,
        text: 'Completed the 800km run. Truck maintained perfectly. Maintenance is key!',
        likes: 156,
        comments: 24,
        vouched: true,
        duration: '0:15',
        avatar: 'https://i.pravatar.cc/150?u=sunil',
    },
    {
        _id: 'p3',
        type: 'bounty',
        author: 'LogiTech Corp',
        role: 'Verified Employer',
        time: '5h ago',
        karma: 0,
        text: 'Refer a Senior Warehouse Manager. Bonus paid upon successful 30-day onboarding.',
        likes: 89,
        comments: 45,
        vouched: false,
        reward: '₹2,000',
        avatar: 'https://ui-avatars.com/api/?name=LogiTech&background=7c3aed&color=fff',
    },
];

const MOCK_CIRCLES = [
    {
        _id: 'c1',
        name: 'Heavy Haulers India',
        category: 'Logistics',
        members: '12.5k',
        online: 142,
        desc: 'Discuss routes, tolls, and vehicle maintenance tips for long-haul drivers.',
        topics: ['Route Advice', 'Toll Updates', 'Mechanic Referrals'],
        rates: [
            { service: '10-Ton Truck (Per KM)', price: '₹35 - ₹40' },
            { service: 'Waiting Charge (Per Hour)', price: '₹200' },
            { service: 'Helper Daily Wage', price: '₹800' },
        ],
    },
    {
        _id: 'c2',
        name: 'Hyderabad Electricians',
        category: 'Trades',
        members: '3.2k',
        online: 45,
        desc: 'Union news, rate cards, and helper availability for local electricians.',
        topics: ['Daily Rates', 'Helper Needed', 'License Renewals'],
        rates: [
            { service: 'Fan Installation', price: '₹250' },
            { service: 'Full House Wiring (2BHK)', price: '₹15,000' },
            { service: 'Site Visit / Inspection', price: '₹300' },
        ],
    },
    {
        _id: 'c3',
        name: 'Last-Mile Delivery',
        category: 'Logistics',
        members: '45k',
        online: 1200,
        desc: 'Community for Swiggy, Zomato, and Amazon delivery partners.',
        topics: ['Incentive Hacks', 'Bike Repair', 'Traffic Alerts'],
        rates: [],
    },
];

const FALLBACK_BOUNTIES = [
    { id: 1, company: 'Zomato', logoLetter: 'Z', logoBg: '#ef4444', role: 'Operations Lead', bonus: '₹5,000', bonusValue: 5000, expiresInDays: 2, totalPot: '₹50,000', referrals: 12, category: 'Operations' },
    { id: 2, company: 'Delhivery', logoLetter: 'D', logoBg: '#2563eb', role: 'Senior HMV Driver', bonus: '₹3,500', bonusValue: 3500, expiresInDays: 5, totalPot: '₹35,000', referrals: 8, category: 'Driving' },
    { id: 3, company: 'Amazon', logoLetter: 'A', logoBg: '#f59e0b', role: 'Warehouse Supervisor', bonus: '₹8,000', bonusValue: 8000, expiresInDays: 7, totalPot: '₹80,000', referrals: 22, category: 'Warehouse' },
    { id: 4, company: 'Swiggy', logoLetter: 'S', logoBg: '#f97316', role: 'City Delivery Partner', bonus: '₹2,000', bonusValue: 2000, expiresInDays: 1, totalPot: '₹20,000', referrals: 45, category: 'Delivery' },
    { id: 5, company: 'BigBasket', logoLetter: 'B', logoBg: '#16a34a', role: 'Store Inventory Staff', bonus: '₹4,000', bonusValue: 4000, expiresInDays: 10, totalPot: '₹40,000', referrals: 6, category: 'Operations' },
    { id: 6, company: 'LogiTech Corp', logoLetter: 'L', logoBg: '#7c3aed', role: 'Fleet Coordinator', bonus: '₹6,500', bonusValue: 6500, expiresInDays: 3, totalPot: '₹65,000', referrals: 18, category: 'Logistics' },
];

export const CONNECT_TABS = ['Feed', 'Pulse', 'Academy', 'Circles', 'Bounties'];
export const CURRENT_USER = { avatar: 'https://i.pravatar.cc/150?img=11', name: 'Lokesh' };
export const ACADEMY_MENTORS = [
    { id: 1, name: 'Suresh V.', exp: '20y', skill: 'Heavy Transport', rating: 4.9, sessions: 340, avatar: 'https://i.pravatar.cc/150?u=suresh' },
    { id: 2, name: 'Kavya S.', exp: '12y', skill: 'Electrical Work', rating: 4.8, sessions: 215, avatar: 'https://i.pravatar.cc/150?u=kavya' },
    { id: 3, name: 'Anand R.', exp: '8y', skill: 'Warehouse Ops', rating: 4.7, sessions: 180, avatar: 'https://i.pravatar.cc/150?u=anandrao' },
    { id: 4, name: 'Meena J.', exp: '15y', skill: 'HR & Placement', rating: 5.0, sessions: 95, avatar: 'https://i.pravatar.cc/150?u=meena' },
];

const timeAgo = (dateString) => {
    if (!dateString) return 'Just now';
    const date = new Date(dateString);
    const diffMs = Date.now() - date.getTime();
    const diffMinutes = Math.max(0, Math.floor(diffMs / 60000));
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
};

const firstSalaryNumber = (value = '') => {
    const match = String(value).replace(/,/g, '').match(/\d+/);
    return match ? Number(match[0]) : 0;
};

export function useConnectData() {
    const { userInfo } = useContext(AuthContext);

    const [activeTab, setActiveTab] = useState('Feed');
    const [showMyProfile, setShowMyProfile] = useState(false);

    const [joinedCircles, setJoinedCircles] = useState(new Set(['c1']));
    const [selectedCircle, setSelectedCircle] = useState(null);
    const [circleDetailTab, setCircleDetailTab] = useState('DISCUSSION');
    const [chatText, setChatText] = useState('');
    const [circlesData, setCirclesData] = useState([]);
    const [circleMessages, setCircleMessages] = useState([]);
    const [isCircleRecording, setIsCircleRecording] = useState(false);
    const [circleCustomRates, setCircleCustomRates] = useState([]);
    const [showCircleRateForm, setShowCircleRateForm] = useState(false);
    const [circleRateService, setCircleRateService] = useState('');
    const [circleRatePrice, setCircleRatePrice] = useState('');
    const circleChatRef = useRef(null);
    const circleScrollTimeoutRef = useRef(null);

    const [academyCourses, setAcademyCourses] = useState([]);
    const [enrolledCourses, setEnrolledCourses] = useState([]);
    const [enrolledCourseIds, setEnrolledCourseIds] = useState(new Set());
    const [connectedMentorIds, setConnectedMentorIds] = useState(new Set());

    const [pulseItems, setPulseItems] = useState([]);
    const [appliedGigIds, setAppliedGigIds] = useState(new Set());
    const [hiredProIds, setHiredProIds] = useState(new Set());
    const [radarRefreshing, setRadarRefreshing] = useState(false);
    const [pulseToast, setPulseToast] = useState(null);
    const pulseAnim = useRef(new Animated.Value(0.3)).current;
    const pulseLoopRef = useRef(null);
    const pulseToastTimeoutRef = useRef(null);

    const [bountyItems, setBountyItems] = useState([]);
    const [referralStats, setReferralStats] = useState(null);
    const [referredBountyIds, setReferredBountyIds] = useState(new Set());
    const [referringBounty, setReferringBounty] = useState(null);
    const [referPhoneInput, setReferPhoneInput] = useState('');
    const [referPhoneError, setReferPhoneError] = useState('');
    const [bountyToast, setBountyToast] = useState(null);
    const bountyToastTimeoutRef = useRef(null);

    const [composerOpen, setComposerOpen] = useState(false);
    const [composerMediaType, setComposerMediaType] = useState(null);
    const [composerText, setComposerText] = useState('');
    const [feedPosts, setFeedPosts] = useState(MOCK_POSTS);
    const [feedPage, setFeedPage] = useState(1);
    const [hasMoreFeed, setHasMoreFeed] = useState(true);
    const [loadingFeed, setLoadingFeed] = useState(false);
    const [loadingMoreFeed, setLoadingMoreFeed] = useState(false);
    const [likedPostIds, setLikedPostIds] = useState(new Set());
    const [likeCountMap, setLikeCountMap] = useState(Object.fromEntries(MOCK_POSTS.map((p) => [p._id, p.likes])));
    const [commentsByPostId, setCommentsByPostId] = useState({});
    const [activeCommentPostId, setActiveCommentPostId] = useState(null);
    const [commentInputMap, setCommentInputMap] = useState({});

    useEffect(() => {
        if (!circleChatRef.current) {
            return;
        }

        if (circleScrollTimeoutRef.current) {
            clearTimeout(circleScrollTimeoutRef.current);
        }

        const timeout = setTimeout(() => {
            circleChatRef.current?.scrollToEnd({ animated: true });
        }, 80);
        circleScrollTimeoutRef.current = timeout;

        return () => {
            clearTimeout(timeout);
            circleScrollTimeoutRef.current = null;
        };
    }, [circleMessages.length]);

    const mapApiPost = useCallback((post) => {
        const authorName = post?.user?.name || 'Member';
        const mappedType = post?.type === 'photo' ? 'gallery' : (post?.type || 'text');

        return {
            _id: String(post?._id || `post-${Date.now()}`),
            type: mappedType,
            author: authorName,
            role: post?.user?.primaryRole === 'employer' ? 'Employer' : 'Member',
            time: timeAgo(post?.createdAt),
            karma: 0,
            text: post?.content || '',
            likes: Array.isArray(post?.likes) ? post.likes.length : 0,
            comments: Array.isArray(post?.comments) ? post.comments.length : 0,
            vouched: false,
            avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(authorName)}&background=9333ea&color=fff`,
            duration: mappedType === 'voice' ? '0:15' : undefined,
            mediaUrl: post?.mediaUrl || '',
        };
    }, []);

    const fetchFeedPosts = useCallback(async (pageToLoad = 1, replace = false) => {
        if (!DEMO_MODE) {
            if (replace) {
                setLoadingFeed(true);
            } else {
                setLoadingMoreFeed(true);
            }
        }

        try {
            const { data } = await client.get('/api/feed/posts', {
                params: { page: pageToLoad, limit: 10 },
            });
            const apiPosts = Array.isArray(data?.posts) ? data.posts : [];
            const mappedPosts = apiPosts.map(mapApiPost);
            setFeedPosts((prev) => (replace ? mappedPosts : [...prev, ...mappedPosts]));
            setFeedPage(pageToLoad);
            setHasMoreFeed(Boolean(data?.hasMore));

            if (replace) {
                const counts = {};
                mappedPosts.forEach((post) => {
                    counts[post._id] = post.likes || 0;
                });
                setLikeCountMap(counts);
                setLikedPostIds(new Set());
            }
        } catch (error) {
            if (replace) {
                Alert.alert('Feed Unavailable', 'Could not load posts right now.');
            }
        } finally {
            if (!DEMO_MODE) {
                setLoadingFeed(false);
                setLoadingMoreFeed(false);
            }
        }
    }, [mapApiPost]);

    const handleMediaButtonClick = useCallback((type) => {
        setComposerOpen(true);
        setComposerMediaType(type);
    }, []);

    const handleInputAreaClick = useCallback(() => {
        setComposerOpen(true);
        setComposerMediaType('TEXT');
    }, []);

    const handleCancelComposer = useCallback(() => {
        setComposerOpen(false);
        setComposerMediaType(null);
        setComposerText('');
    }, []);

    const handlePost = useCallback(async () => {
        if (!composerText.trim()) return;

        try {
            const feedType = composerMediaType === 'VOICE'
                ? 'voice'
                : composerMediaType === 'PHOTOS'
                    ? 'photo'
                    : composerMediaType === 'VIDEO'
                        ? 'video'
                        : 'text';

            const { data } = await client.post('/api/feed/posts', {
                type: feedType,
                content: composerText.trim(),
            });

            const createdPost = data?.post
                ? mapApiPost(data.post)
                : {
                    _id: `local-${Date.now()}`,
                    type: feedType === 'photo' ? 'gallery' : feedType,
                    author: userInfo?.name || CURRENT_USER.name,
                    role: 'Member',
                    time: 'Just now',
                    karma: 0,
                    text: composerText.trim(),
                    likes: 0,
                    comments: 0,
                    vouched: false,
                    avatar: CURRENT_USER.avatar,
                };

            setFeedPosts((prev) => [createdPost, ...prev]);
            setLikeCountMap((prev) => ({ ...prev, [createdPost._id]: 0 }));
            setComposerText('');
            setComposerOpen(false);
            setComposerMediaType(null);
        } catch (error) {
            Alert.alert('Post Failed', 'Could not publish your post right now.');
        }
    }, [composerMediaType, composerText, mapApiPost, userInfo?.name]);

    const handleToggleLike = useCallback(async (postId) => {
        try {
            const { data } = await client.post(`/api/feed/posts/${postId}/like`);
            const isLiked = Boolean(data?.liked);
            setLikedPostIds((prev) => {
                const next = new Set(prev);
                if (isLiked) {
                    next.add(postId);
                } else {
                    next.delete(postId);
                }
                return next;
            });
            setLikeCountMap((prev) => ({ ...prev, [postId]: Number(data?.likesCount || 0) }));
        } catch (error) {
            setLikedPostIds((prev) => {
                const next = new Set(prev);
                if (next.has(postId)) {
                    next.delete(postId);
                    setLikeCountMap((map) => ({ ...map, [postId]: (map[postId] || 1) - 1 }));
                } else {
                    next.add(postId);
                    setLikeCountMap((map) => ({ ...map, [postId]: (map[postId] || 0) + 1 }));
                }
                return next;
            });
        }
    }, []);

    const handleSubmitComment = useCallback(async (postId) => {
        const text = (commentInputMap[postId] || '').trim();
        if (!text) return;

        try {
            await client.post(`/api/feed/posts/${postId}/comments`, { text });
            setCommentsByPostId((prev) => ({ ...prev, [postId]: [...(prev[postId] || []), text] }));
            setCommentInputMap((prev) => ({ ...prev, [postId]: '' }));
        } catch (error) {
            Alert.alert('Comment Failed', 'Could not add comment right now.');
        }
    }, [commentInputMap]);

    const handleToggleComment = useCallback((postId) => {
        setActiveCommentPostId((prev) => (prev === postId ? null : postId));
    }, []);

    const handleCommentInputChange = useCallback((postId, text) => {
        setCommentInputMap((prev) => ({ ...prev, [postId]: text }));
    }, []);

    const handleLoadMoreFeed = useCallback(() => {
        if (hasMoreFeed && !loadingMoreFeed) {
            fetchFeedPosts(feedPage + 1, false);
        }
    }, [hasMoreFeed, loadingMoreFeed, fetchFeedPosts, feedPage]);

    const handleRefreshFeed = useCallback(() => {
        fetchFeedPosts(1, true);
    }, [fetchFeedPosts]);

    const handleVouch = useCallback((postId) => {
        setFeedPosts((prev) => prev.map((post) => (
            post._id === postId ? { ...post, vouched: !post.vouched } : post
        )));
    }, []);

    const showPulseToast = useCallback((message) => {
        setPulseToast(message);
        if (pulseToastTimeoutRef.current) {
            clearTimeout(pulseToastTimeoutRef.current);
        }
        pulseToastTimeoutRef.current = setTimeout(() => setPulseToast(null), 2500);
    }, []);

    const fetchPulseItems = useCallback(async () => {
        try {
            const { data } = await client.get('/api/pulse');
            const items = Array.isArray(data?.items) ? data.items : [];
            const mapped = items.map((item) => ({
                id: item._id,
                title: item.title || 'Urgent Requirement',
                employer: item.companyName || 'Employer',
                distance: 'Nearby',
                pay: item.salaryRange || 'Negotiable',
                urgent: true,
                timePosted: timeAgo(item.createdAt),
                category: item.requirements?.[0] || 'Pulse',
                categoryBg: '#fef3c7',
                categoryColor: '#b45309',
            }));
            setPulseItems(mapped);
        } catch (error) {
            // Keep fallback data in module UI if API unavailable.
        }
    }, []);

    const handleRefreshRadar = useCallback(async () => {
        setRadarRefreshing(true);
        await fetchPulseItems();
        setRadarRefreshing(false);
    }, [fetchPulseItems]);

    const handleApplyGig = useCallback(async (gig) => {
        try {
            if (!gig?.id) return;
            await client.post('/api/applications', {
                jobId: gig.id,
                workerId: userInfo?._id,
                initiatedBy: 'worker',
            });
            setAppliedGigIds((prev) => new Set(prev).add(gig.id));
            showPulseToast(`Request sent to ${gig.employer}!`);
        } catch (error) {
            showPulseToast('Could not apply right now. Please retry.');
        }
    }, [showPulseToast, userInfo?._id]);

    const handleHirePro = useCallback((pro) => {
        setHiredProIds((prev) => new Set(prev).add(pro.id));
        showPulseToast(`Hire request sent to ${pro.name}!`);
    }, [showPulseToast]);

    const fetchAcademyData = useCallback(async () => {
        try {
            const [coursesRes, enrolledRes] = await Promise.all([
                client.get('/api/academy/courses'),
                client.get('/api/academy/enrolled'),
            ]);
            const courses = Array.isArray(coursesRes?.data?.courses) ? coursesRes.data.courses : [];
            const enrolled = Array.isArray(enrolledRes?.data?.enrolled) ? enrolledRes.data.enrolled : [];
            setAcademyCourses(courses);
            setEnrolledCourses(enrolled);
            setEnrolledCourseIds(new Set(enrolled.map((item) => item.courseId)));
        } catch (error) {
            // Keep fallback academy cards.
        }
    }, []);

    const handleEnrollCourse = useCallback(async (id) => {
        try {
            await client.post(`/api/academy/courses/${id}/enroll`);
            setEnrolledCourseIds((prev) => new Set(prev).add(id));
        } catch (error) {
            Alert.alert('Enrollment Failed', 'Could not enroll right now.');
        }
    }, []);

    const handleConnectMentor = useCallback((id) => {
        setConnectedMentorIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    }, []);

    const showBountyToast = useCallback((message) => {
        setBountyToast(message);
        if (bountyToastTimeoutRef.current) {
            clearTimeout(bountyToastTimeoutRef.current);
        }
        bountyToastTimeoutRef.current = setTimeout(() => setBountyToast(null), 3000);
    }, []);

    const fetchBounties = useCallback(async () => {
        try {
            const statsRes = await client.get('/api/growth/referrals');
            setReferralStats(statsRes?.data || null);
            const referralBounties = Array.isArray(statsRes?.data?.bounties) ? statsRes.data.bounties : [];
            let mapped = [];
            if (referralBounties.length > 0) {
                mapped = referralBounties.map((bounty, index) => ({
                    id: bounty.id || bounty.jobId || `bounty-${index}`,
                    company: bounty.company || 'Employer',
                    logoLetter: String(bounty.company || 'H')[0].toUpperCase(),
                    logoBg: '#7c3aed',
                    role: bounty.role || 'Open Role',
                    bonus: bounty.bonus || `₹${Number(bounty.bonusValue || 2000).toLocaleString()}`,
                    bonusValue: Number(bounty.bonusValue || 2000),
                    expiresInDays: bounty.expiresInDays || 7,
                    totalPot: bounty.totalPot || `₹${(Number(bounty.bonusValue || 2000) * 10).toLocaleString()}`,
                    referrals: Number(bounty.referrals || 0),
                    category: bounty.category || 'General',
                }));
            } else {
                const sourceRes = await client.get('/api/matches/candidate');
                const source = Array.isArray(sourceRes?.data) ? sourceRes.data : [];
                mapped = source.map((matchItem, index) => {
                    const job = matchItem?.job || {};
                    const baseReward = firstSalaryNumber(job.salaryRange)
                        ? Math.max(1500, Math.round(firstSalaryNumber(job.salaryRange) * 0.1))
                        : 2000;
                    return {
                        id: job._id || `bounty-${index}`,
                        company: job.companyName || 'Employer',
                        logoLetter: String(job.companyName || 'H')[0].toUpperCase(),
                        logoBg: '#7c3aed',
                        role: job.title || 'Open Role',
                        bonus: `₹${baseReward.toLocaleString()}`,
                        bonusValue: baseReward,
                        expiresInDays: 7,
                        totalPot: `₹${(baseReward * 10).toLocaleString()}`,
                        referrals: 0,
                        category: job.requirements?.[0] || 'General',
                    };
                });
            }
            if (mapped.length > 0) {
                setBountyItems(mapped);
            }
        } catch (error) {
            // Keep fallback bounty cards.
        }
    }, []);

    const handleOpenReferModal = useCallback((bounty) => {
        setReferringBounty(bounty);
        setReferPhoneInput('');
        setReferPhoneError('');
    }, []);

    const handleCloseReferModal = useCallback(() => {
        setReferringBounty(null);
        setReferPhoneInput('');
        setReferPhoneError('');
    }, []);

    const handleReferPhoneChange = useCallback((value) => {
        setReferPhoneInput(value);
        setReferPhoneError('');
    }, []);

    const handleSendReferral = useCallback(async () => {
        if (!referPhoneInput.trim() || referPhoneInput.replace(/\D/g, '').length < 10) {
            setReferPhoneError('Please enter a valid 10-digit phone number');
            return;
        }
        if (!referringBounty) return;

        try {
            await client.post('/api/growth/referrals', {
                jobId: referringBounty.id,
                candidateContact: referPhoneInput,
                reward: referringBounty.bonusValue || 0,
            });

            const linkRes = await client.get(`/api/growth/share-link/job/${referringBounty.id}`);
            const shareLink = linkRes?.data?.shareLink;
            if (shareLink) {
                await Share.share({
                    message: `Check this opportunity on HireCircle: ${shareLink}`,
                });
            }

            setReferredBountyIds((prev) => new Set(prev).add(referringBounty.id));
            const earned = referringBounty.bonus;
            handleCloseReferModal();
            showBountyToast(`Referral sent! You'll earn ${earned} when they join.`);
        } catch (error) {
            setReferPhoneError('Could not send referral. Please try again.');
        }
    }, [referPhoneInput, referringBounty, handleCloseReferModal, showBountyToast]);

    const fetchCircles = useCallback(async () => {
        try {
            const [allRes, myRes] = await Promise.all([
                client.get('/api/circles'),
                client.get('/api/circles/my'),
            ]);
            const allCircles = Array.isArray(allRes?.data?.circles) ? allRes.data.circles : [];
            const myCircles = Array.isArray(myRes?.data?.circles) ? myRes.data.circles : [];
            setCirclesData(allCircles);
            setJoinedCircles(new Set(myCircles.map((circle) => String(circle._id))));
        } catch (error) {
            // Keep fallback circles.
        }
    }, []);

    const toggleJoinCircle = useCallback(async (id) => {
        const alreadyJoined = joinedCircles.has(id);
        if (alreadyJoined) return;

        try {
            await client.post(`/api/circles/${id}/join`);
            setJoinedCircles((prev) => new Set(prev).add(id));
        } catch (error) {
            Alert.alert('Join Failed', 'Could not join this circle right now.');
        }
    }, [joinedCircles]);

    const circlesList = useMemo(() => (
        circlesData.length > 0
            ? circlesData.map((circle) => ({
                _id: String(circle._id),
                name: circle.name,
                category: circle.skill || 'Community',
                members: `${Array.isArray(circle.members) ? circle.members.length : 0}`,
                online: 0,
                desc: circle.description || 'Join this circle to connect with professionals nearby.',
                topics: [circle.skill || 'Updates'],
                rates: [],
            }))
            : MOCK_CIRCLES
    ), [circlesData]);

    const handleOpenCircle = useCallback((circle) => {
        setSelectedCircle(circle);
        setCircleDetailTab('DISCUSSION');
    }, []);

    const handleCloseCircleDetail = useCallback(() => {
        setSelectedCircle(null);
    }, []);

    const handleCircleDetailTabChange = useCallback((nextTab) => {
        setCircleDetailTab(nextTab);
    }, []);

    const handleCircleSendMessage = useCallback(() => {
        if (!chatText.length) return;

        const nextMessages = [...circleMessages, {
            id: Date.now(),
            user: 'You',
            role: 'Member',
            text: chatText,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            type: 'text',
        }];

        setCircleMessages(nextMessages);
        setChatText('');
        if (circleScrollTimeoutRef.current) {
            clearTimeout(circleScrollTimeoutRef.current);
        }
        circleScrollTimeoutRef.current = setTimeout(() => {
            circleChatRef.current?.scrollToEnd({ animated: true });
        }, 50);
    }, [chatText, circleMessages]);

    const handleCircleToggleVoice = useCallback(() => {
        if (isCircleRecording) {
            setIsCircleRecording(false);
            const nextMessages = [...circleMessages, {
                id: Date.now(),
                user: 'You',
                role: 'Member',
                text: '🎤 Voice message (0:08)',
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                type: 'text',
            }];
            setCircleMessages(nextMessages);
            if (circleScrollTimeoutRef.current) {
                clearTimeout(circleScrollTimeoutRef.current);
            }
            circleScrollTimeoutRef.current = setTimeout(() => {
                circleChatRef.current?.scrollToEnd({ animated: true });
            }, 50);
            return;
        }
        setIsCircleRecording(true);
    }, [circleMessages, isCircleRecording]);

    const handleShowCircleRateForm = useCallback(() => {
        setShowCircleRateForm(true);
    }, []);

    const handleCancelCircleRateForm = useCallback(() => {
        setShowCircleRateForm(false);
        setCircleRateService('');
        setCircleRatePrice('');
    }, []);

    const handleSubmitCircleRate = useCallback(() => {
        if (!circleRateService.trim() || !circleRatePrice.trim()) return;

        setCircleCustomRates((prev) => [
            ...prev,
            { service: circleRateService.trim(), price: circleRatePrice.trim() },
        ]);
        setCircleRateService('');
        setCircleRatePrice('');
        setShowCircleRateForm(false);
    }, [circleRateService, circleRatePrice]);

    useEffect(() => {
        fetchFeedPosts(1, true);
        fetchPulseItems();
        fetchAcademyData();
        fetchCircles();
        fetchBounties();
    }, [fetchFeedPosts, fetchPulseItems, fetchAcademyData, fetchCircles, fetchBounties]);

    useEffect(() => {
        if (pulseLoopRef.current) {
            return undefined;
        }

        pulseLoopRef.current = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 0.3, duration: 1000, useNativeDriver: true }),
            ])
        );
        pulseLoopRef.current.start();

        return () => {
            if (pulseLoopRef.current) {
                pulseLoopRef.current.stop();
                pulseLoopRef.current = null;
            }
            if (pulseToastTimeoutRef.current) {
                clearTimeout(pulseToastTimeoutRef.current);
                pulseToastTimeoutRef.current = null;
            }
            if (bountyToastTimeoutRef.current) {
                clearTimeout(bountyToastTimeoutRef.current);
                bountyToastTimeoutRef.current = null;
            }
            if (circleScrollTimeoutRef.current) {
                clearTimeout(circleScrollTimeoutRef.current);
                circleScrollTimeoutRef.current = null;
            }
        };
    }, [pulseAnim]);

    const bountiesList = useMemo(() => (
        bountyItems.length > 0 ? bountyItems : FALLBACK_BOUNTIES
    ), [bountyItems]);

    const bountyEarningsTotal = useMemo(() => {
        const localEarnings = [...referredBountyIds].reduce((sum, id) => {
            const matched = bountiesList.find((bounty) => bounty.id === id);
            return sum + (matched ? matched.bonusValue : 0);
        }, 0);

        return Number(referralStats?.totalEarnings || 0) || localEarnings;
    }, [referredBountyIds, bountiesList, referralStats?.totalEarnings]);

    const feedTabProps = useMemo(() => ({
        feedPosts,
        loadingFeed,
        loadingMoreFeed,
        composerOpen,
        composerMediaType,
        composerText,
        likedPostIds,
        likeCountMap,
        commentsByPostId,
        activeCommentPostId,
        commentInputMap,
        currentUserAvatar: CURRENT_USER.avatar,
        onRefreshFeed: handleRefreshFeed,
        onLoadMoreFeed: handleLoadMoreFeed,
        onMediaButtonClick: handleMediaButtonClick,
        onInputAreaClick: handleInputAreaClick,
        onCancelComposer: handleCancelComposer,
        onPost: handlePost,
        onComposerTextChange: setComposerText,
        onToggleLike: handleToggleLike,
        onToggleComment: handleToggleComment,
        onToggleVouch: handleVouch,
        onCommentInputChange: handleCommentInputChange,
        onSubmitComment: handleSubmitComment,
    }), [
        feedPosts,
        loadingFeed,
        loadingMoreFeed,
        composerOpen,
        composerMediaType,
        composerText,
        likedPostIds,
        likeCountMap,
        commentsByPostId,
        activeCommentPostId,
        commentInputMap,
        handleRefreshFeed,
        handleLoadMoreFeed,
        handleMediaButtonClick,
        handleInputAreaClick,
        handleCancelComposer,
        handlePost,
        handleToggleLike,
        handleToggleComment,
        handleVouch,
        handleCommentInputChange,
        handleSubmitComment,
    ]);

    const pulseTabProps = useMemo(() => ({
        pulseItems,
        appliedGigIds,
        hiredProIds,
        radarRefreshing,
        pulseAnim,
        onRefreshRadar: handleRefreshRadar,
        onApplyGig: handleApplyGig,
        onHirePro: handleHirePro,
    }), [pulseItems, appliedGigIds, hiredProIds, radarRefreshing, pulseAnim, handleRefreshRadar, handleApplyGig, handleHirePro]);

    const circlesTabProps = useMemo(() => ({
        circles: circlesList,
        joinedCircles,
        onOpenCircle: handleOpenCircle,
        onJoinCircle: toggleJoinCircle,
    }), [circlesList, joinedCircles, handleOpenCircle, toggleJoinCircle]);

    const academyTabProps = useMemo(() => ({
        academyCourses,
        enrolledCourses,
        enrolledCourseIds,
        mentors: ACADEMY_MENTORS,
        connectedMentorIds,
        onEnrollCourse: handleEnrollCourse,
        onConnectMentor: handleConnectMentor,
    }), [academyCourses, enrolledCourses, enrolledCourseIds, connectedMentorIds, handleEnrollCourse, handleConnectMentor]);

    const bountiesTabProps = useMemo(() => ({
        bounties: bountiesList,
        referredBountyIds,
        totalEarned: bountyEarningsTotal,
        onOpenReferModal: handleOpenReferModal,
    }), [bountiesList, referredBountyIds, bountyEarningsTotal, handleOpenReferModal]);

    const circleDetailProps = useMemo(() => ({
        visible: !!selectedCircle,
        selectedCircle,
        onClose: handleCloseCircleDetail,
        circleDetailTab,
        onTabChange: handleCircleDetailTabChange,
        circleChatRef,
        chatText,
        onChatTextChange: setChatText,
        isCircleRecording,
        onSendTextMessage: handleCircleSendMessage,
        onToggleVoiceRecording: handleCircleToggleVoice,
        circleCustomRates,
        showCircleRateForm,
        circleRateService,
        circleRatePrice,
        onCircleRateServiceChange: setCircleRateService,
        onCircleRatePriceChange: setCircleRatePrice,
        onSubmitRate: handleSubmitCircleRate,
        onShowRateForm: handleShowCircleRateForm,
        onCancelRateForm: handleCancelCircleRateForm,
    }), [
        selectedCircle,
        handleCloseCircleDetail,
        circleDetailTab,
        handleCircleDetailTabChange,
        chatText,
        isCircleRecording,
        handleCircleSendMessage,
        handleCircleToggleVoice,
        circleCustomRates,
        showCircleRateForm,
        circleRateService,
        circleRatePrice,
        handleSubmitCircleRate,
        handleShowCircleRateForm,
        handleCancelCircleRateForm,
    ]);

    const referralModalProps = useMemo(() => ({
        visible: !!referringBounty,
        referringBounty,
        referPhoneInput,
        referPhoneError,
        onClose: handleCloseReferModal,
        onPhoneChange: handleReferPhoneChange,
        onSendReferral: handleSendReferral,
    }), [
        referringBounty,
        referPhoneInput,
        referPhoneError,
        handleCloseReferModal,
        handleReferPhoneChange,
        handleSendReferral,
    ]);

    return {
        userInfo,
        activeTab,
        setActiveTab,
        showMyProfile,
        setShowMyProfile,
        feedTabProps,
        pulseTabProps,
        circlesTabProps,
        academyTabProps,
        bountiesTabProps,
        circleDetailProps,
        referralModalProps,
        pulseToast,
        bountyToast,
    };
}
