import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler']],
      },
    }),
    VitePWA({
      registerType: 'autoUpdate', // Força a atualização automática no background
      includeAssets: ['BRSense_logo.png', 'apple-touch-icon.png', 'icon-192x192.png', 'icon-512x512.png'],
      manifest: {
        name: "BR Sense",
        short_name: "BR Sense",
        description: "Monitoramento Agrícola Inteligente",
        start_url: "/",
        display: "standalone",
        background_color: "#1A202C",
        theme_color: "#3182CE",
        icons: [
          {
            src: "/icon-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any maskable"
          },
          {
            src: "/icon-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable"
          }
        ]
      }
    })
  ],
})