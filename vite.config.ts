import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '')

  return {
    base: env.VITE_BASE || '/',
    plugins: [
      react(),
      VitePWA({
        registerType: 'prompt',
        manifest: {
          name: 'BusLedger',
          short_name: 'BusLedger',
          description: 'Private daily collection-sheet ledger for one bus.',
          theme_color: '#0866ff',
          background_color: '#ffffff',
          display: 'standalone',
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
          navigateFallback: 'index.html',
          runtimeCaching: [],
        },
      }),
    ],
  }
})
