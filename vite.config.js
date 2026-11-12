import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  build: {
    // Proprietary physiology logic must not be published as original-source maps.
    sourcemap: false,
    rollupOptions: {
      // Externalize base44 runtime so Vite doesn't look for it locally
      external: ['@base44/runtime']
    }
  }
});