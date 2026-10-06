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
        // A phone can keep an earlier app shell in its service-worker cache.
        // Activate each new release automatically so an owner never returns to
        // an obsolete "Foundation" screen after we deploy a production fix.
        registerType: 'autoUpdate',
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
