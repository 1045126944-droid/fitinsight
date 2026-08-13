/* global URL, console, process */

import { readFile, readdir, stat } from 'node:fs/promises'
import { join, relative, resolve } from 'node:path'

const projectRoot = resolve(import.meta.dirname, '..')
const distRoot = join(projectRoot, 'dist')

const requiredFiles = [
  'index.html',
  'manifest.webmanifest',
  'sw.js',
  'theme-init.js',
  'icons/fitinsight-icon-source.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
  'icons/apple-touch-icon.png',
  'icons/favicon-32.png',
  'examples/sample-health-data.json',
  'examples/sample-realistic-health.json',
]

for (const path of requiredFiles) {
  await requireFile(join(distRoot, path), path)
}

const manifest = JSON.parse(
  await readFile(join(distRoot, 'manifest.webmanifest'), 'utf8'),
)
assert(manifest.name === 'FitInsight', 'manifest name mismatch')
assert(manifest.display === 'standalone', 'manifest display must be standalone')
assert(manifest.start_url === './', 'manifest start_url must be ./')
assert(manifest.scope === './', 'manifest scope must be ./')

const expectedIcons = [
  ['./icons/icon-192.png', '192x192', 'any'],
  ['./icons/icon-512.png', '512x512', 'any'],
  ['./icons/icon-maskable-512.png', '512x512', 'maskable'],
]
for (const [src, sizes, purpose] of expectedIcons) {
  assert(
    manifest.icons?.some(
      (icon) =>
        icon.src === src && icon.sizes === sizes && icon.purpose === purpose,
    ),
    `manifest icon missing: ${src} (${purpose})`,
  )
}

const example = JSON.parse(
  await readFile(join(distRoot, 'examples/sample-health-data.json'), 'utf8'),
)
assert(example.synthetic === true, 'example must be explicitly synthetic')
assert(
  typeof example.source === 'string' && example.source.includes('synthetic'),
  'example source must be synthetic',
)

const html = await readFile(join(distRoot, 'index.html'), 'utf8')
const htmlTags = parseTags(html)
const viewport = htmlTags.find(
  ({ name, attrs }) => name === 'meta' && attrs.name === 'viewport',
)
assert(
  viewport?.attrs.content
    ?.split(',')
    .map((value) => value.trim())
    .includes('viewport-fit=cover'),
  'built viewport must include viewport-fit=cover',
)
const themeColors = htmlTags.filter(
  ({ name, attrs }) => name === 'meta' && attrs.name === 'theme-color',
)
assert(
  themeColors.some(
    ({ attrs }) =>
      attrs.media === '(prefers-color-scheme: light)' &&
      attrs.content?.toLowerCase() === '#f4f0ea',
  ),
  'built HTML must expose the light canvas as a media-qualified theme color',
)
assert(
  themeColors.some(
    ({ attrs }) =>
      attrs.media === '(prefers-color-scheme: dark)' &&
      attrs.content?.toLowerCase() === '#11181f',
  ),
  'built HTML must expose the dark canvas as a media-qualified theme color',
)

for (const { name, attrs } of htmlTags) {
  if (name === 'script' && attrs.src) {
    requireLocalResource(attrs.src, 'script')
  }
  if (name === 'img' && attrs.src) {
    requireLocalResource(attrs.src, 'image')
  }
  if (name === 'img' && attrs.srcset) {
    for (const candidate of parseSrcset(attrs.srcset)) {
      requireLocalResource(candidate, 'image')
    }
  }
  if (name === 'link' && attrs.href) {
    const relationships = new Set((attrs.rel ?? '').toLowerCase().split(/\s+/))
    if (
      relationships.has('stylesheet') ||
      relationships.has('manifest') ||
      relationships.has('icon') ||
      relationships.has('apple-touch-icon')
    ) {
      requireLocalResource(attrs.href, `link rel=${attrs.rel}`)
    }
  }
}

const analyticsPackages = [
  '@google-analytics',
  '@segment/analytics-next',
  '@sentry',
  'firebase/analytics',
  'google-analytics',
  'mixpanel-browser',
  'plausible-tracker',
  'posthog-js',
  'react-ga',
  'react-ga4',
]
const sourceFiles = [
  ...(await collectSourceFiles(join(projectRoot, 'src'))),
  join(projectRoot, 'vite.config.ts'),
]

for (const file of sourceFiles) {
  const source = await readFile(file, 'utf8')
  for (const specifier of importSpecifiers(source)) {
    if (analyticsPackages.some((name) => packageMatches(specifier, name))) {
      fail(
        `analytics import ${JSON.stringify(specifier)} in ${relative(projectRoot, file)}`,
      )
    }
  }
}

console.log(
  'PWA verification passed: install shell is local and offline-ready.',
)

async function requireFile(path, label) {
  try {
    const info = await stat(path)
    assert(info.isFile() && info.size > 0, `required file is empty: ${label}`)
  } catch (error) {
    if (error?.code === 'ENOENT') {
      fail(`required file is missing: ${label}`)
    }
    throw error
  }
}

function parseTags(source) {
  return Array.from(
    source.matchAll(/<(script|link|img|meta)\b([^>]*)>/gi),
    (match) => ({
      name: match[1].toLowerCase(),
      attrs: Object.fromEntries(
        Array.from(
          match[2].matchAll(
            /([:\w-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g,
          ),
          (attribute) => [
            attribute[1].toLowerCase(),
            attribute[2] ?? attribute[3] ?? attribute[4] ?? '',
          ],
        ),
      ),
    }),
  )
}

function parseSrcset(value) {
  return value
    .split(',')
    .map((candidate) => candidate.trim().split(/\s+/, 1)[0])
    .filter(Boolean)
}

function requireLocalResource(value, label) {
  if (value.startsWith('data:')) {
    return
  }
  let url
  try {
    url = new URL(value, 'https://fitinsight.local/')
  } catch {
    fail(`invalid ${label} URL: ${value}`)
  }
  assert(
    url.origin === 'https://fitinsight.local',
    `cross-origin ${label} URL: ${value}`,
  )
}

async function collectSourceFiles(directory) {
  const files = []
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) {
      files.push(...(await collectSourceFiles(path)))
    } else if (/\.(?:[cm]?[jt]sx?)$/.test(entry.name)) {
      files.push(path)
    }
  }
  return files
}

function importSpecifiers(source) {
  const specifiers = []
  const staticImports =
    /\b(?:import|export)\s+(?:[^'";]*?\sfrom\s*)?['"]([^'"]+)['"]/g
  const callableImports = /\b(?:import|require)\s*\(\s*['"]([^'"]+)['"]/g
  for (const pattern of [staticImports, callableImports]) {
    for (const match of source.matchAll(pattern)) {
      specifiers.push(match[1])
    }
  }
  return specifiers
}

function packageMatches(specifier, packageName) {
  return specifier === packageName || specifier.startsWith(`${packageName}/`)
}

function assert(condition, message) {
  if (!condition) {
    fail(message)
  }
}

function fail(message) {
  console.error(`PWA verification failed: ${message}`)
  process.exit(1)
}
