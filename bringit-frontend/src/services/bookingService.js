// Modul booking jasa — UC-09, UC-10, UC-11 (FR-14, FR-15, FR-18, FR-27)
import { api } from './apiClient';

export const bookingService = {
  /** filter: { type: 'all'|'referee'|'photographer', city, sport, date } */
  searchProviders: (filter) => api.get('/providers', filter),
  getProvider: (id) => api.get(`/providers/${id}`),
  create: (payload) => api.post('/bookings', payload),
  myBookings: () => api.get('/bookings/me'),
  submitReview: (payload) => api.post('/reviews', payload),
  latestReviews: (providerId) => api.get('/reviews', { provider_id: providerId }),
};
