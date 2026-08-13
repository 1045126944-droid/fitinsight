import type { UserProfile } from '../types/profile'
import type { AppTab } from './navigation'

export type AppState = {
  activeTab: AppTab
  dataRevision: number
  isDemoData: boolean
  profile: UserProfile | null
  syncSheetOpen: boolean
}
export type AppAction =
  | { type: 'active-tab-changed'; tab: AppTab }
  | {
      type: 'data-refreshed'
      revision: number
      isDemoData: boolean
      profile: UserProfile | null
    }
  | { type: 'sync-sheet-opened' }
  | { type: 'sync-sheet-closed' }

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'active-tab-changed':
      return { ...state, activeTab: action.tab }
    case 'data-refreshed':
      if (action.revision < state.dataRevision) return state
      return {
        ...state,
        dataRevision: action.revision,
        isDemoData: action.isDemoData,
        profile: action.profile,
      }
    case 'sync-sheet-opened':
      return { ...state, syncSheetOpen: true }
    case 'sync-sheet-closed':
      return { ...state, syncSheetOpen: false }
  }
}
