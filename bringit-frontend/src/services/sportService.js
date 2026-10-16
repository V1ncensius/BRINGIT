// Master data cabang olahraga — FR-26, NFR-14
import { api } from './apiClient';

export const sportService = {
  listActive: () => api.get('/sports'),
};
