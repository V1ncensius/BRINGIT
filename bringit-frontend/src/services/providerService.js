// Modul penyedia jasa (wasit/fotografer) — UC-12..UC-17 (FR-03, FR-16, FR-19)
import { api } from './apiClient';

export const providerService = {
  getProfile: () => api.get('/provider/me'),
  updateProfile: (payload) => api.put('/provider/me', payload),
  summary: () => api.get('/provider/summary'),
  bookings: (status) => api.get('/provider/bookings', { status }),
  respond: (id, action, force = false) => api.patch(`/provider/bookings/${id}`, { action, force }),
  slots: () => api.get('/provider/slots'),
  addSlot: (payload) => api.post('/provider/slots', payload),
  removeSlot: (id) => api.delete(`/provider/slots/${id}`),
  earnings: (period) => api.get('/provider/earnings', { period }),
};
