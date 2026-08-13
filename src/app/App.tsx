import { useCallback, useState } from 'react'
import { AppShell } from '../components/AppShell'
import { BottomNavigation } from '../components/BottomNavigation'
import { UpdatePrompt } from '../components/UpdatePrompt'
import { openFitInsightDb } from '../db/database'
import { createHealthRepository } from '../db/health-repository'
import { SyncSheet } from '../features/import/SyncSheet'
import { TodayPage } from '../features/dashboard/TodayPage'
import { useToday } from '../features/dashboard/useToday'
import { TrendsPage } from '../features/trends/TrendsPage'
import { WorkoutsPage } from '../features/workouts/WorkoutsPage'
import { useWorkouts } from '../features/workouts/useWorkouts'
import { ReviewsPage } from '../features/reviews/ReviewsPage'
import { ProfilePage } from '../features/profile/ProfilePage'
import { useReview, type ReviewSelection } from '../features/reviews/useReview'
import {
  commitPreparedImport,
  inspectHealthFile,
  type PreparedImport,
} from '../features/import/import-service'
import type { ImportSummary } from '../types/storage'
import { AppProvider } from './AppProvider'
import { useAppContext } from './app-context'
import { withTemporaryDatabase } from './import-connection'
import { APP_TABS } from './navigation'
import { usePwaUpdate } from '../pwa/usePwaUpdate'

export function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  )
}

function AppContent() {
  const pwaUpdate = usePwaUpdate()
  const {
    activeTab,
    setActiveTab,
    syncSheetOpen,
    closeSyncSheet,
    isDemoData,
    refreshData,
  } = useAppContext()
  const activeDefinition = APP_TABS.find((tab) => tab.id === activeTab)
  const inspectFile = useCallback(
    async (file: File): Promise<PreparedImport> => {
      return withTemporaryDatabase(openFitInsightDb, (db) =>
        inspectHealthFile(file, createHealthRepository(db)),
      )
    },
    [],
  )
  const commitImport = useCallback(
    async (prepared: PreparedImport): Promise<ImportSummary> =>
      withTemporaryDatabase(openFitInsightDb, (db) =>
        commitPreparedImport(prepared, db),
      ),
    [],
  )
  const loadSyntheticData = useCallback(async () => {
    const payload = {
      schemaVersion: '1.0.0',
      generatedAt: new Date().toISOString(),
      timezone: runtimeTimeZone(),
      source: 'fitinsight-development-synthetic',
      coverage: null,
      dailyRecords: [{ date: runtimeLocalDate(), steps: 0 }],
      workouts: [],
      bodyMeasurements: [],
    }
    const prepared = await inspectFile(
      new File([JSON.stringify(payload)], 'fitinsight-synthetic.json', {
        type: 'application/json',
      }),
    )
    await commitImport(prepared)
    await refreshData()
  }, [commitImport, inspectFile, refreshData])

  if (activeDefinition === undefined) {
    return null
  }

  return (
    <>
      <AppShell
        notice={isDemoData ? <DemoDataNotice /> : null}
        navigation={
          <BottomNavigation activeTab={activeTab} onChange={setActiveTab} />
        }
      >
        {activeTab === 'today' ? <TodayDestination /> : null}
        {activeTab === 'workouts' ? <WorkoutsDestination /> : null}
        {activeTab === 'trends' ? <TrendsDestination /> : null}
        {activeTab === 'reviews' ? <ReviewsDestination /> : null}
        {activeTab === 'profile' ? (
          <ProfilePage loadSyntheticData={loadSyntheticData} />
        ) : null}
      </AppShell>
      <SyncSheet
        open={syncSheetOpen}
        onClose={closeSyncSheet}
        inspectFile={inspectFile}
        commitImport={commitImport}
        onImported={refreshData}
      />
      <UpdatePrompt {...pwaUpdate} />
    </>
  )
}

function DemoDataNotice() {
  return (
    <aside className="demo-data-notice" aria-label="演示数据说明">
      <strong>演示数据</strong>
      <span>最近 30 天的合成健康记录，可安全体验所有页面</span>
    </aside>
  )
}

function TodayDestination() {
  const { dataRevision, openSyncSheet, setActiveTab } = useAppContext()
  const state = useToday(runtimeLocalDate(), dataRevision)
  return (
    <TodayPage
      state={state}
      openSyncSheet={openSyncSheet}
      openProfile={() => setActiveTab('profile')}
      openTraining={() => setActiveTab('workouts')}
    />
  )
}

function WorkoutsDestination() {
  const { dataRevision, openSyncSheet } = useAppContext()
  const state = useWorkouts(dataRevision)
  return <WorkoutsPage state={state} openSyncSheet={openSyncSheet} />
}

function TrendsDestination() {
  const { dataRevision, openSyncSheet } = useAppContext()
  return (
    <TrendsPage dataRevision={dataRevision} openSyncSheet={openSyncSheet} />
  )
}

function ReviewsDestination() {
  const { dataRevision, openSyncSheet } = useAppContext()
  const [selection, setSelection] = useState<ReviewSelection>('week')
  const state = useReview(
    selection,
    runtimeLocalDate(),
    runtimeTimeZone(),
    dataRevision,
  )
  return (
    <ReviewsPage
      state={state}
      selection={selection}
      onSelectionChange={setSelection}
      openSyncSheet={openSyncSheet}
    />
  )
}

function runtimeLocalDate(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  )
  return `${values.year!}-${values.month!}-${values.day!}`
}

function runtimeTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
}
