import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Proxy /api ke backend PHP saat development (ubah target sesuai server Anda).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://127.0.0.1:8000', changeOrigin: true },
    },
  },
});
