import type { AppTab } from './navigation'

export type ThemeChoice = 'system' | 'light' | 'dark'
export type UiPreferences = {
  theme: ThemeChoice
  selectedTab: AppTab
  weekStartsOn: 0 | 1
  onboardingComplete: boolean
}
export type PreferenceStorage = Pick<
  Storage,
  'getItem' | 'setItem' | 'removeItem'
>

const keys = {
  theme: 'fitinsight.theme',
  selectedTab: 'fitinsight.selectedTab',
  weekStartsOn: 'fitinsight.weekStartsOn',
  onboardingComplete: 'fitinsight.onboardingComplete',
} as const
const defaults: UiPreferences = {
  theme: 'system',
  selectedTab: 'today',
  weekStartsOn: 1,
  onboardingComplete: false,
}

export function loadPreferences(storage: PreferenceStorage): UiPreferences {
  const theme = storage.getItem(keys.theme)
  const tab = storage.getItem(keys.selectedTab)
  const week = storage.getItem(keys.weekStartsOn)
  const onboarding = storage.getItem(keys.onboardingComplete)
  return {
    theme:
      theme === 'light' || theme === 'dark' || theme === 'system'
        ? theme
        : defaults.theme,
    selectedTab:
      tab === 'today' ||
      tab === 'workouts' ||
      tab === 'trends' ||
      tab === 'reviews' ||
      tab === 'profile'
        ? tab
        : defaults.selectedTab,
    weekStartsOn: week === '0' ? 0 : week === '1' ? 1 : defaults.weekStartsOn,
    onboardingComplete:
      onboarding === 'true'
        ? true
        : onboarding === 'false'
          ? false
          : defaults.onboardingComplete,
  }
}

export function savePreferences(
  storage: PreferenceStorage,
  preferences: UiPreferences,
): void {
  storage.setItem(keys.theme, preferences.theme)
  storage.setItem(keys.selectedTab, preferences.selectedTab)
  storage.setItem(keys.weekStartsOn, String(preferences.weekStartsOn))
  storage.setItem(
    keys.onboardingComplete,
    String(preferences.onboardingComplete),
  )
}

/** Removes only the four UI preferences FitInsight owns. */
export function clearPreferences(storage: Pick<Storage, 'removeItem'>): void {
  for (const key of Object.values(keys)) storage.removeItem(key)
}
