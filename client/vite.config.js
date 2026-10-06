import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      registerType: 'autoUpdate',
      injectRegister: false,
      injectManifest: { globPatterns: ['**/*.{js,css,html,woff,woff2,svg,png,webmanifest}'], maximumFileSizeToCacheInBytes: 5 * 1024 * 1024 },
      manifest: {
        name: 'Nagham — Offline Music',
        short_name: 'Nagham',
        description: 'Your personal offline music library',
        theme_color: '#111316',
        background_color: '#111316',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        // Lets the installed app appear in Android's Share menu for audio files
        share_target: {
          action: '/share-target',
          method: 'POST',
          enctype: 'multipart/form-data',
          params: { files: [{ name: 'audio', accept: ['audio/*', '.mp3', '.m4a', '.ogg', '.wav', '.flac', '.opus'] }] },
        },
      },
      devOptions: { enabled: false },
    }),
  ],
  server: { port: 5173, proxy: { '/api': 'http://localhost:5000', '/media': 'http://localhost:5000' } },
  preview: { port: 4173, proxy: { '/api': 'http://localhost:5000', '/media': 'http://localhost:5000' } },
  build: { target: 'es2020', chunkSizeWarningLimit: 900 },
});
