import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Настройка датчика топлива',
        short_name: 'FuelConfig',
        description: 'Настройка MAC-адреса датчика уровня топлива',
        start_url: '/',
        display: 'standalone',
        background_color: '#1a1a2e',
        theme_color: '#e94560',
        orientation: 'portrait',
        icons: [
          {
            src: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="20" fill="%23e94560"/><text x="50" y="68" font-size="55" text-anchor="middle" fill="white">⛽</text></svg>',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ]
})