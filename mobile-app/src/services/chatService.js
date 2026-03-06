import apiClient from './apiClient';

export const fetchChatHistory = (applicationId) => apiClient.get(`/api/chat/${applicationId}`);
export const uploadChatAttachment = (formData) => apiClient.post('/api/chat/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
});
