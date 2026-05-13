import api from '../../../api/client';

export const getDashboardOverview = () => api.get('/admin/dashboard/summary');
export const getUserStats = () => api.get('/admin/dashboard/users');
export const getDepartmentStats = () => api.get('/admin/dashboard/departments');
export const getAdminUsers = () => api.get('/admin/users');
export const updateAdminUser = (id, data) => api.patch(`/admin/users/${id}`, data);
export const deleteAdminUser = (id) => api.delete(`/admin/users/${id}`);
export const getSecurityLogs = (params = {}) => api.get('/admin/logs', { params });
export const getExceptionRequests = () => api.get('/admin/exception-requests');
export const createExceptionRequest = (data) => api.post('/admin/exception-requests', data);
export const updateExceptionRequest = (id, data) => api.patch(`/admin/exception-requests/${id}`, data);
export const deleteExceptionRequest = (id) => api.delete(`/admin/exception-requests/${id}`);
export const getExceptionKeywords = () => api.get('/admin/exception-keywords');
export const createExceptionKeyword = (data) => api.post('/admin/exception-keywords', data);
export const updateExceptionKeyword = (id, data) => api.patch(`/admin/exception-keywords/${id}`, data);
export const deleteExceptionKeyword = (id) => api.delete(`/admin/exception-keywords/${id}`);
