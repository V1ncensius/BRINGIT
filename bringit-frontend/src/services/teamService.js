// Modul profil tim — UC-03 (FR-02, FR-09)
import { api } from './apiClient';

export const teamService = {
  getMine: () => api.get('/teams/me'),
  updateMine: (payload) => api.put('/teams/me', payload),
  updateAccount: (payload) => api.put('/users/me', payload),
  uploadLogo: (dataUrl) => api.post('/teams/me/logo', { logo: dataUrl }),
  getStats: (sport) => api.get('/teams/me/stats', { sport }),
  getActivities: () => api.get('/teams/me/activities'),
};
