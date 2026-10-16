// Modul pembayaran & langganan — UC-07, UC-09, UC-10 (FR-10, FR-17, NFR-13)
import { api } from './apiClient';

export const paymentService = {
  plans: () => api.get('/subscription-plans'),
  mySubscription: () => api.get('/subscriptions/me'),
  /** Membuat transaksi langganan, backend mengembalikan redirect_url payment gateway. */
  checkoutSubscription: (plan_id, method) => api.post('/payments/checkout', { type: 'subscription', plan_id, method }),
  get: (id) => api.get(`/payments/${id}`),
  /** Hanya untuk mode mock: mensimulasikan callback payment gateway. */
  simulate: (id, status) => api.post(`/payments/${id}/simulate`, { status }),
  commission: () => api.get('/settings/commission'),
};
