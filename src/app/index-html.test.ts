import { expect, test } from 'vitest'
import html from '../../index.html?raw'

test('the shipped HTML viewport enables safe-area layout on edge-to-edge iPhones', () => {
  const artifact = new DOMParser().parseFromString(html, 'text/html')
  const viewport = artifact.querySelector<HTMLMetaElement>(
    'meta[name="viewport"]',
  )
  const directives = new Map(
    (viewport?.content ?? '').split(',').map((directive) => {
      const [name, value] = directive.trim().split('=', 2)
      return [name, value]
    }),
  )

  expect(directives.get('viewport-fit')).toBe('cover')
})

test('advertises a local install manifest and initializes theme before React', () => {
  const artifact = new DOMParser().parseFromString(html, 'text/html')
  const manifest = artifact.querySelector<HTMLLinkElement>(
    'link[rel="manifest"]',
  )
  const appleIcon = artifact.querySelector<HTMLLinkElement>(
    'link[rel="apple-touch-icon"]',
  )
  const capable = artifact.querySelector<HTMLMetaElement>(
    'meta[name="mobile-web-app-capable"]',
  )
  const appleCapable = artifact.querySelector<HTMLMetaElement>(
    'meta[name="apple-mobile-web-app-capable"]',
  )
  const appleStatusBar = artifact.querySelector<HTMLMetaElement>(
    'meta[name="apple-mobile-web-app-status-bar-style"]',
  )
  const appleTitle = artifact.querySelector<HTMLMetaElement>(
    'meta[name="apple-mobile-web-app-title"]',
  )
  const scripts = Array.from(
    artifact.querySelectorAll<HTMLScriptElement>('script[src]'),
  )

  expect(manifest?.getAttribute('href')).toBe('./manifest.webmanifest')
  expect(appleIcon?.getAttribute('href')).toBe('./icons/apple-touch-icon.png')
  expect(capable?.content).toBe('yes')
  expect(appleCapable?.content).toBe('yes')
  expect(appleStatusBar?.content).toBe('black-translucent')
  expect(appleTitle?.content).toBe('FitInsight')
  expect(scripts.map((script) => script.getAttribute('src'))).toEqual([
    './theme-init.js',
    './src/main.tsx',
  ])
})
