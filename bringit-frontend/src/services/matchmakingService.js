// Modul matchmaking — UC-04 (FR-04, FR-05)
import { api } from './apiClient';

export const matchmakingService = {
  /** filter: { city, sport, level, sort } */
  searchTeams: (filter) => api.get('/teams', filter),
  getTeam: (id) => api.get(`/teams/${id}`),
  sendRequest: (payload) => api.post('/opponent-requests', payload),
  /** box: 'incoming' | 'outgoing' */
  listRequests: (box) => api.get('/opponent-requests', { box }),
  respond: (id, action) => api.patch(`/opponent-requests/${id}`, { action }),
};
