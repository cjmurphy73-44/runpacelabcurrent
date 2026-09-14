import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import base44 from "@base44/vite-plugin"

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    base44({
      legacySDKImports: process.env.BASE44_LEGACY_SDK_IMPORTS === 'true',
      hmrNotifier: true,
      navigationNotifier: true,
      analyticsTracker: true,
      visualEditAgent: true
    }),
    react(),
  ],
  server: {
    host: '0.0.0.0',
    port: 7860,
    strictPort: true,
    allowedHosts: ['connors-macbook-pro.tailcbed5c.ts.net']
  },
  test: {
    globals: true,
    environment: 'node',
  },
});