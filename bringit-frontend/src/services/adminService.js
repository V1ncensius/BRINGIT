// Modul administrasi — UC-18, UC-19 (FR-21..FR-26)
import { api } from './apiClient';

export const adminService = {
  summary: () => api.get('/admin/summary'),
  verifications: () => api.get('/admin/verifications'),
  verify: (userId, action, reason) => api.patch(`/admin/verifications/${userId}`, { action, reason }),
  reports: () => api.get('/admin/reports'),
  moderate: (id, action) => api.patch(`/admin/reports/${id}`, { action }),
  disputes: () => api.get('/admin/disputes'),
  resolveDispute: (id, payload) => api.patch(`/admin/disputes/${id}`, payload),
  plans: () => api.get('/admin/plans'),
  savePlan: (id, payload) => api.put(`/admin/plans/${id}`, payload),
  commission: () => api.get('/settings/commission'),
  saveCommission: (payload) => api.put('/admin/commission', payload),
  sports: () => api.get('/sports', { all: 1 }),
  addSport: (name) => api.post('/admin/sports', { name }),
  toggleSport: (id, active) => api.patch(`/admin/sports/${id}`, { active }),
  transactions: (filter) => api.get('/admin/transactions', filter),
};
