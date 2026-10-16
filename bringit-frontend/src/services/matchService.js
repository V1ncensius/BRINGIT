// Modul pertandingan — UC-05, UC-06 (FR-06, FR-07, FR-08, FR-09)
import { api } from './apiClient';

export const matchService = {
  /** scope: 'active' | 'history' */
  list: (scope) => api.get('/matches', { scope }),
  get: (id) => api.get(`/matches/${id}`),
  confirmSchedule: (id) => api.post(`/matches/${id}/confirm-schedule`),
  proposeSchedule: (id, payload) => api.post(`/matches/${id}/propose`, payload),
  cancel: (id) => api.post(`/matches/${id}/cancel`),
  submitResult: (id, payload) => api.post(`/matches/${id}/result`, payload),
  confirmResult: (id) => api.post(`/matches/${id}/result/confirm`),
  disputeResult: (id, reason) => api.post(`/matches/${id}/result/dispute`, { reason }),
};
