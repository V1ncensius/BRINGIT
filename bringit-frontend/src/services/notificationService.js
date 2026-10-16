// Modul notifikasi — FR-20
import { api } from './apiClient';

export const notificationService = {
  list: () => api.get('/notifications'),
  markRead: (id) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.post('/notifications/read-all'),
};
