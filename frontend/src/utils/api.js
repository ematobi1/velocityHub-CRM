import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add auth token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle responses and errors
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error.response?.data || error.message);
  }
);

// Auth API
export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (data) => api.post('/auth/register', data),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data) => api.patch('/auth/me', data),
  changePassword: (currentPassword, newPassword) =>
    api.post('/auth/change-password', { currentPassword, newPassword }),
  logout: () => api.post('/auth/logout')
};

// Leads API
export const leadsAPI = {
  getAll: (params) => api.get('/leads', { params }),
  getById: (id) => api.get(`/leads/${id}`),
  create: (data) => api.post('/leads', data),
  update: (id, data) => api.patch(`/leads/${id}`, data),
  delete: (id) => api.delete(`/leads/${id}`),
  addNote: (id, content) => api.post(`/leads/${id}/notes`, { content }),
  convert: (id) => api.post(`/leads/${id}/convert`),
  bulk: (action, leadIds, data) => api.post('/leads/bulk', { action, leadIds, data }),
  getStats: () => api.get('/leads/stats/overview')
};

// Deals API
export const dealsAPI = {
  getAll: (params) => api.get('/deals', { params }),
  getById: (id) => api.get(`/deals/${id}`),
  create: (data) => api.post('/deals', data),
  update: (id, data) => api.put(`/deals/${id}`, data),
  delete: (id) => api.delete(`/deals/${id}`),
  moveStage: (id, stage) => api.patch(`/deals/${id}/stage`, { stage }),
  addActivity: (id, activity) => api.post(`/deals/${id}/activities`, activity),
  getAnalytics: () => api.get('/deals/analytics'),
  getAIInsights: (id) => api.get(`/deals/${id}/ai-analysis`),
  requestAIAnalysis: (id) => api.post(`/deals/${id}/ai-analysis`)
};

// Contacts API
export const contactsAPI = {
  getAll: (params) => api.get('/contacts', { params }),
  getById: (id) => api.get(`/contacts/${id}`),
  create: (data) => api.post('/contacts', data),
  update: (id, data) => api.put(`/contacts/${id}`, data),
  delete: (id) => api.delete(`/contacts/${id}`),
  updateEngagement: (id, data) => api.patch(`/contacts/${id}/engagement`, data),
  bulk: (action, contactIds, data) => api.post('/contacts/bulk', { action, contactIds, data })
};

// Companies API
export const companiesAPI = {
  getAll: (params) => api.get('/companies', { params }),
  getById: (id) => api.get(`/companies/${id}`),
  create: (data) => api.post('/companies', data),
  update: (id, data) => api.put(`/companies/${id}`, data),
  delete: (id) => api.delete(`/companies/${id}`),
  getAnalytics: (id) => api.get(`/companies/${id}/analytics`),
  linkContact: (id, contactId) => api.post(`/companies/${id}/contacts/${contactId}`),
  unlinkContact: (id, contactId) => api.delete(`/companies/${id}/contacts/${contactId}`),
  getStats: () => api.get('/companies/stats/overview')
};

// Analytics API
export const analyticsAPI = {
  getDashboard: () => api.get('/analytics/dashboard'),
  getRevenueForecast: () => api.get('/analytics/revenue-forecast'),
  getPerformance: (period) => api.get('/analytics/performance', { params: { period } }),
  getFunnel: () => api.get('/analytics/funnel')
};

// Lead AI & Advanced Features API
export const leadAdvancedAPI = {
  // AI Scoring
  scoreOne: (id) => api.post(`/leads/${id}/score`),
  batchScore: (leadIds) => api.post('/leads/batch/score', { leadIds }),
  scoreAll: () => api.post('/leads/score-all'),
  getByScoreRange: (range) => api.get(`/leads/by-score/${range}`), // hot, warm, cold, poor
  getRecommendations: () => api.get('/leads/recommendations'),

  // Bulk Actions
  bulkUpdate: (leadIds, updates) => api.post('/leads/bulk/update', { leadIds, updates }),
  bulkDelete: (leadIds) => api.post('/leads/bulk/delete', { leadIds }),
  bulkAssign: (leadIds, ownerId) => api.post('/leads/bulk/assign', { leadIds, ownerId }),
  bulkAddTags: (leadIds, tags) => api.post('/leads/bulk/add-tags', { leadIds, tags }),

  // CSV Import/Export
  exportCSV: (params) => api.get('/leads/export/csv', { params, responseType: 'blob' }),
  importCSV: (leads, options) => api.post('/leads/import/csv', { leads, options }),

  // Deduplication
  findDuplicates: () => api.get('/leads/duplicates'),
  mergeLeads: (primaryId, duplicateIds) => api.post('/leads/merge', { primaryId, duplicateIds })
};

// Email Sequences API
export const emailSequencesAPI = {
  getAll: () => api.get('/email-sequences'),
  getById: (id) => api.get(`/email-sequences/${id}`),
  create: (data) => api.post('/email-sequences', data),
  update: (id, data) => api.put(`/email-sequences/${id}`, data),
  delete: (id) => api.delete(`/email-sequences/${id}`),
  activate: (id) => api.post(`/email-sequences/${id}/activate`),
  pause: (id) => api.post(`/email-sequences/${id}/pause`),
  enroll: (id, leadIds) => api.post(`/email-sequences/${id}/enroll`, { leadIds }),
  unenroll: (id, leadId) => api.post(`/email-sequences/${id}/unenroll/${leadId}`),
  getAnalytics: (id) => api.get(`/email-sequences/${id}/analytics`)
};

export default api;
