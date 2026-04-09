/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// base path is the repo name for GitHub Pages at https://<user>.github.io/momsite/
// Change to '/' if deploying to a root (user.github.io) repo or custom domain.
export default defineConfig({
  base: '/momsite/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon-192.png', 'icon-512.png', 'robots.txt'],
      manifest: {
        name: 'Charge Nurse Assigner',
        short_name: 'Assigner',
        description: 'Balanced patient distribution for charge nurses',
        theme_color: '#4a7dff',
        background_color: '#f5f5f7',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '.',
        scope: '.',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,webmanifest}'],
      },
    }),
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    css: false,
    exclude: ['**/node_modules/**', '**/dist/**', 'tests/e2e/**'],
  },
});
