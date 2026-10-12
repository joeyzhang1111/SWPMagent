import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const apiTarget = process.env.SWPM_API_TARGET || 'http://127.0.0.1:8000';

export default defineConfig({
  plugins: [react()],
  root: '.',
  server: {
    port: 5173,
    proxy: {
      '/api': apiTarget,
    },
  },
  preview: {
    proxy: {
      '/api': apiTarget,
    },
  },
});
