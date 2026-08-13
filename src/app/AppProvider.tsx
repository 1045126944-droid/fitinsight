import {
  clearAllLocalData,
  exportBackup,
  prepareBackupRestore,
  restoreBackup,
  type PreparedBackup,
} from '../db/backup'
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useState,
} from 'react'
import type { IDBPDatabase } from 'idb'
import { openFitInsightDb } from '../db/database'
import {
  getHealthSnapshot,
  getPrivateProfile,
  savePrivateProfile,
} from '../db/health-repository'
import { bootstrapDemoData, getDataMode } from '../demo/demo-data'
import type { UserProfile } from '../types/profile'
import type { FitInsightDb } from '../types/storage'
import { appReducer } from './app-reducer'
import { AppContext, type AppContextValue } from './app-context'
import {
  clearPreferences,
  loadPreferences,
  savePreferences,
  type UiPreferences,
} from './preferences'

export function AppProvider({
  children,
  database,
}: {
  children: ReactNode
  database?: Promise<IDBPDatabase<FitInsightDb>>
}) {
  const [dbPromise] = useState(() => database ?? openFitInsightDb())
  const [initialized, setInitialized] = useState(false)
  const [preferences, setPreferences] = useState(safePreferences)
  const [state, dispatch] = useReducer(appReducer, undefined, () => ({
    activeTab: preferences.selectedTab,
    dataRevision: 0,
    isDemoData: false,
    profile: null,
    syncSheetOpen: false,
  }))
  const refreshData = useCallback(async () => {
    const [snapshot, profile] = await Promise.all([
      dbPromise.then(getHealthSnapshot),
      dbPromise.then(getPrivateProfile),
    ])
    const isDemoData =
      (await dbPromise.then((db) => getDataMode(db, snapshot))) === 'demo'
    dispatch({
      type: 'data-refreshed',
      revision: snapshot.revision,
      isDemoData,
      profile,
    })
  }, [dbPromise])
  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        if (database === undefined) await bootstrapDemoData(await dbPromise)
      } catch {
        /* A failed demo bootstrap must not block personal data import. */
      }
      await refreshData().catch(() => undefined)
      if (alive) setInitialized(true)
    })()
    return () => {
      alive = false
    }
  }, [database, dbPromise, refreshData])
  useEffect(() => {
    document.documentElement.dataset.theme = preferences.theme
  }, [preferences.theme])
  const updatePreferences = useCallback((change: Partial<UiPreferences>) => {
    if (change.theme) document.documentElement.dataset.theme = change.theme
    setPreferences((current) => {
      const next = { ...current, ...change }
      try {
        savePreferences(window.localStorage, next)
      } catch {
        /* UI remains usable when preference storage is unavailable. */
      }
      return next
    })
  }, [])
  const setActiveTab = useCallback(
    (tab: AppContextValue['activeTab']) => {
      dispatch({ type: 'active-tab-changed', tab })
      updatePreferences({ selectedTab: tab })
    },
    [updatePreferences],
  )
  const saveProfile = useCallback(
    async (profile: UserProfile) => {
      await savePrivateProfile(await dbPromise, profile)
      await refreshData()
    },
    [dbPromise, refreshData],
  )
  const createBackup = useCallback(
    () => dbPromise.then(exportBackup),
    [dbPromise],
  )
  const prepareBackup = useCallback(
    (text: string) => prepareBackupRestore(text),
    [],
  )
  const restorePreparedBackup = useCallback(
    async (prepared: PreparedBackup) => {
      await restoreBackup(await dbPromise, prepared.backup)
      try {
        await refreshData()
        return { refreshed: true }
      } catch {
        return { refreshed: false }
      }
    },
    [dbPromise, refreshData],
  )
  const clearLocalData = useCallback(async () => {
    await clearAllLocalData(await dbPromise)
    let preferencesCleared = true
    try {
      clearPreferences(window.localStorage)
    } catch {
      preferencesCleared = false
    }
    setPreferences(safePreferences())
    try {
      await refreshData()
      return { preferencesCleared, refreshed: true }
    } catch {
      return { preferencesCleared, refreshed: false }
    }
  }, [dbPromise, refreshData])
  const value = useMemo<AppContextValue>(
    () => ({
      activeTab: state.activeTab,
      setActiveTab,
      dataRevision: state.dataRevision,
      isDemoData: state.isDemoData,
      refreshData,
      profile: state.profile,
      saveProfile,
      preferences,
      updatePreferences,
      createBackup,
      prepareBackup,
      restoreBackup: restorePreparedBackup,
      clearLocalData,
      syncSheetOpen: state.syncSheetOpen,
      openSyncSheet: () => dispatch({ type: 'sync-sheet-opened' }),
      closeSyncSheet: () => dispatch({ type: 'sync-sheet-closed' }),
    }),
    [
      clearLocalData,
      createBackup,
      preferences,
      prepareBackup,
      refreshData,
      restorePreparedBackup,
      saveProfile,
      setActiveTab,
      state,
      updatePreferences,
    ],
  )
  return (
    <AppContext.Provider value={value}>
      {initialized ? children : <AppBootScreen />}
    </AppContext.Provider>
  )
}

function AppBootScreen() {
  return (
    <main className="app-boot-screen" aria-busy="true">
      <p>正在准备 FitInsight</p>
    </main>
  )
}

function safePreferences() {
  try {
    return loadPreferences(window.localStorage)
  } catch {
    return {
      theme: 'system' as const,
      selectedTab: 'today' as const,
      weekStartsOn: 1 as const,
      onboardingComplete: false,
    }
  }
}
