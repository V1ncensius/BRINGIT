// Modul ELO — UC-08 (FR-11, FR-12, FR-13)
import { api } from './apiClient';

export const eloService = {
  getMine: (sport) => api.get('/elo/me', { sport }),
  leaderboard: (sport, city) => api.get('/elo/leaderboard', { sport, city }),
};
