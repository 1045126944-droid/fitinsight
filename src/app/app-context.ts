import { createContext, useContext } from 'react'
import type { UserProfile } from '../types/profile'
import type { FitInsightBackup } from '../types/storage'
import type { PreparedBackup } from '../db/backup'
import type { AppTab } from './navigation'
import type { UiPreferences } from './preferences'

export type AppContextValue = {
  activeTab: AppTab
  setActiveTab(tab: AppTab): void
  dataRevision: number
  isDemoData: boolean
  refreshData(): Promise<void>
  profile: UserProfile | null
  saveProfile(profile: UserProfile): Promise<void>
  preferences: UiPreferences
  updatePreferences(change: Partial<UiPreferences>): void
  createBackup(): Promise<FitInsightBackup>
  prepareBackup(text: string): PreparedBackup
  restoreBackup(prepared: PreparedBackup): Promise<{ refreshed: boolean }>
  clearLocalData(): Promise<{ preferencesCleared: boolean; refreshed: boolean }>
  syncSheetOpen: boolean
  openSyncSheet(): void
  closeSyncSheet(): void
}

export const AppContext = createContext<AppContextValue | null>(null)
export function useAppContext(): AppContextValue {
  const value = useContext(AppContext)
  if (!value) throw new Error('useAppContext must be used within AppProvider')
  return value
}
