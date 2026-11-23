import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const base = env.VITE_BASE || '/'
  return {
    base,
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg', 'offline.html', 'icons/*.png'],
        manifest: {
          name: 'UsSpace',
          short_name: 'UsSpace',
          description: 'A private little universe for two people in a long-distance relationship.',
          theme_color: '#FFD6E7',
          background_color: '#FFF8F0',
          display: 'standalone',
          orientation: 'portrait',
          start_url: '.',
          scope: '.',
          icons: [
            { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
            { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
            { src: 'icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
        workbox: {
          navigateFallback: 'index.html',
          globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest}'],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
              handler: 'CacheFirst',
              options: { cacheName: 'usspace-fonts', expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 } },
            },
            {
              urlPattern: /^https:\/\/[abc]\.tile\.openstreetmap\.org\/.*/i,
              handler: 'CacheFirst',
              options: { cacheName: 'usspace-maps', expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 14 } },
            },
          ],
        },
      }),
    ],
  }
})
