import { expect, test } from 'vitest'
import {
  loadPreferences,
  savePreferences,
  type PreferenceStorage,
} from './preferences'

function createMemoryStorage(): PreferenceStorage & {
  snapshot(): Record<string, string>
} {
  const values = new Map<string, string>()
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
    snapshot: () => Object.fromEntries(values),
  }
}

test('persists only approved UI preference keys', () => {
  const storage = createMemoryStorage()

  savePreferences(storage, {
    theme: 'dark',
    selectedTab: 'today',
    weekStartsOn: 1,
    onboardingComplete: true,
  })

  expect(Object.keys(storage.snapshot()).sort()).toEqual([
    'fitinsight.onboardingComplete',
    'fitinsight.selectedTab',
    'fitinsight.theme',
    'fitinsight.weekStartsOn',
  ])
})

test('ignores malformed stored values and keeps safe UI defaults', () => {
  const storage = createMemoryStorage()
  storage.setItem('fitinsight.theme', 'private-profile')
  storage.setItem('fitinsight.selectedTab', 'not-a-tab')
  storage.setItem('fitinsight.weekStartsOn', '7')
  storage.setItem('fitinsight.onboardingComplete', 'yes')

  expect(loadPreferences(storage)).toEqual({
    theme: 'system',
    selectedTab: 'today',
    weekStartsOn: 1,
    onboardingComplete: false,
  })
})
