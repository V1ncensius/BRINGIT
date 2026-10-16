// Modul autentikasi — UC-01, UC-02, UC-12, UC-15 (FR-01)
import { api } from './apiClient';

export const authService = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (payload) => api.post('/auth/register', payload),
  me: () => api.get('/auth/me'),
  resendVerification: (email) => api.post('/auth/resend-verification', { email }),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  changePassword: (current_password, new_password) => api.post('/auth/change-password', { current_password, new_password }),
  logout: () => api.post('/auth/logout'),
};
