import apiClient from './apiClient';

export const fetchLatestInterviewProcessing = () => apiClient.get('/api/v2/interview-processing/latest');
export const fetchInterviewProcessingById = (processingId) => apiClient.get(`/api/v2/interview-processing/${processingId}`);
export const uploadInterviewVideo = (formData, config = {}) => apiClient.post('/api/v2/upload/video', formData, config);
