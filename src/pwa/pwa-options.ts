import type { VitePWAOptions } from 'vite-plugin-pwa'

export const PWA_OPTIONS: Partial<VitePWAOptions> = {
  filename: 'sw.js',
  manifestFilename: 'manifest.webmanifest',
  strategies: 'generateSW',
  registerType: 'prompt',
  manifest: {
    name: 'FitInsight',
    short_name: 'FitInsight',
    description: '仅在本机分析个人健康数据',
    lang: 'zh-CN',
    start_url: './',
    scope: './',
    display: 'standalone',
    orientation: 'portrait-primary',
    background_color: '#11181F',
    theme_color: '#11181F',
    icons: [
      {
        src: './icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: './icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: './icons/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  },
  workbox: {
    globPatterns: [
      '**/*.{js,css,html}',
      'icons/*.png',
      'examples/sample-health-data.json',
      'examples/sample-realistic-health.json',
    ],
    runtimeCaching: [],
  },
}
