import apiClient from './apiClient';

export const fetchCandidateMatches = (params = {}) => apiClient.get('/api/matches/candidate', { params });
export const fetchRecommendedJobs = (params = {}) => apiClient.get('/api/jobs/recommended', { params });
export const fetchMyJobs = () => apiClient.get('/api/jobs/my-jobs');
