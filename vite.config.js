import { defineConfig } from 'vite';

// Dev: frontend di 5173, API di 8787 (wrangler dev). /api diproxy ke API lokal.
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8787',
        changeOrigin: false,
      },
    },
  },
});
