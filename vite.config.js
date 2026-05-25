import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/fuel-config-app/',  // ← ВОТ ЭТУ СТРОКУ ДОБАВЬ
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Настройка датчика топлива',
        short_name: 'FuelConfig',
        description: 'Настройка MAC-адреса датчика уровня топлива',
        start_url: '/fuel-config-app/',  // ← И ЗДЕСЬ ПОМЕНЯЙ start_url
        display: 'standalone',
        background_color: '#1a1a2e',
        theme_color: '#e94560',
        orientation: 'portrait',
        icons: [
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ]
})