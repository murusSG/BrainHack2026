import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('@supabase')) return 'supabase';
          if (id.includes('leaflet')) return 'maps';
          if (id.includes('@mantine')) return 'mantine';
          return 'vendor';
        }
      }
    }
  },
  server: {
    host: '0.0.0.0',
    port: 5173
  },
  test: {
    environment: 'jsdom',
    setupFiles: './tests/setup.js',
    globals: true,
    testTimeout: 15000
  }
});
