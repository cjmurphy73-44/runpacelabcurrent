import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  // VERCEL_ENV is a server-side build variable, not exposed by Vite by default.
  // Expose only its non-secret deployment label so Preview builds fail closed.
  define: {
    'import.meta.env.VERCEL_ENV': JSON.stringify(process.env.VERCEL_ENV || ''),
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  build: {
    rollupOptions: {
      // Externalize base44 runtime so Vite doesn't look for it locally
      external: ['@base44/runtime']
    }
  }
});
