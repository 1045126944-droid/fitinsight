import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { PWA_OPTIONS } from './src/pwa/pwa-options.ts'

export default defineConfig({
  base: './',
  plugins: [react(), VitePWA(PWA_OPTIONS)],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/tests/setup.ts'],
    css: true,
  },
})
