import apiClient from './apiClient';

export const loginUser = (payload) => apiClient.post('/api/users/login', payload);
export const registerUser = (payload) => apiClient.post('/api/users/register', payload);
export const fetchProfileCompletion = (params = {}) => apiClient.get('/api/users/profile-completion', { params });
export const logoutUser = (payload, config = {}) => apiClient.post('/api/users/logout', payload, config);
