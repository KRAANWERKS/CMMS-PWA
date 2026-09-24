import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

export default defineConfig(({ mode }) => {
  const envDir = path.resolve(__dirname, '../..')
  const env = loadEnv(mode, envDir, '')

  return {
    envDir,
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'robots.txt', 'apple-touch-icon.png'],
        manifest: {
          name: 'CMMS Technician PWA',
          short_name: 'CMMS Tech',
          description: 'CMMS for field engineers; execution requires a connection',
          theme_color: '#FFA903',
          background_color: '#ffffff',
          display: 'standalone',
          scope: '/pwa/',
          start_url: '/pwa/',
          icons: [
            { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
            { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
          navigateFallback: '/pwa/index.html',
          runtimeCaching: [],
        },
      }),
    ],
    base: '/pwa/',
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@cmms/ui': path.resolve(__dirname, '../../packages/ui/src'),
        '@cmms/types': path.resolve(__dirname, '../../packages/types/src'),
        '@cmms/api-client': path.resolve(__dirname, '../../packages/api-client/src'),
      },
    },
    server: {
      port: 3001,
      proxy: {
        '/api': {
          target: env.CMMS_API_URL || 'http://localhost:7154',
          changeOrigin: true,
        },
      },
    },
  }
})
