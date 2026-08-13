import { PWA_OPTIONS } from './pwa-options'

test('uses prompt updates and no runtime cache for health data', () => {
  expect(PWA_OPTIONS.filename).toBe('sw.js')
  expect(PWA_OPTIONS.manifestFilename).toBe('manifest.webmanifest')
  expect(PWA_OPTIONS.registerType).toBe('prompt')
  expect(PWA_OPTIONS.manifest).toMatchObject({
    name: 'FitInsight',
    short_name: 'FitInsight',
    lang: 'zh-CN',
    start_url: './',
    scope: './',
    display: 'standalone',
    orientation: 'portrait-primary',
    background_color: '#11181F',
    theme_color: '#11181F',
  })
  expect(PWA_OPTIONS.workbox?.globPatterns).toContain(
    'examples/sample-realistic-health.json',
  )
  expect(PWA_OPTIONS.workbox?.runtimeCaching).toEqual([])
})
