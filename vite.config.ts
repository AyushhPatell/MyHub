import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      manifest: {
        name: 'MyHub - Personal Dashboard',
        short_name: 'MyHub',
        description: 'Your personal command center for academic success',
        theme_color: '#2563EB',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ],
        categories: ['education', 'productivity'],
        screenshots: []
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        // Use NetworkFirst strategy for HTML to always check for updates
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/_/, /\/[^/?]+\.[^/]+$/],
        // Ensure service worker file itself is not cached and updates immediately
        skipWaiting: true,
        clientsClaim: true,
        // Don't cache the service worker file itself
        dontCacheBustURLsMatching: /^\/sw\.js$/,
        // Add cache version to force updates
        cacheId: 'myhub-v1',
        runtimeCaching: [
          {
            // HTML files - always check network first for updates (no cache)
            urlPattern: /\.html$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'html-cache-v1',
              expiration: {
                maxEntries: 1,
                maxAgeSeconds: 0 // Never cache HTML, always check for updates
              },
              networkTimeoutSeconds: 1
            }
          },
          {
            // Service worker file - never cache
            urlPattern: /\/sw\.js$/,
            handler: 'NetworkOnly',
            options: {
              cacheName: 'sw-cache-v1'
            }
          },
          {
            urlPattern: /^https:\/\/api\.openweathermap\.org\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'weather-api-cache-v1',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 // 1 hour
              }
            }
          },
          {
            // Cache static assets but check network first for updates
            urlPattern: /\.(?:js|css|png|jpg|jpeg|svg|gif|woff|woff2)$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'static-resources-v1',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 12 // 12 hours (reduced from 24)
              },
              cacheableResponse: {
                statuses: [0, 200]
              },
              networkTimeoutSeconds: 2
            }
          }
        ]
      },
      devOptions: {
        enabled: true,
        type: 'module'
      }
    })
  ],
})

