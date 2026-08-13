import { renderHook, waitFor } from '@testing-library/react'
import type { IDBPDatabase } from 'idb'
import { deleteDB } from 'idb'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import * as databaseModule from '../../db/database'
import type {
  CoverageMetricKey,
  DailyRecord,
  Workout,
} from '../../types/health-data'
import type { UserProfile } from '../../types/profile'
import type { FitInsightDb, ImportHistoryEntry } from '../../types/storage'
import { useToday } from './useToday'

const realOpenFitInsightDb = databaseModule.openFitInsightDb
let databaseName: string
let setupDatabase: IDBPDatabase<FitInsightDb> | undefined

beforeEach(() => {
  databaseName = `fitinsight-today-test-${crypto.randomUUID()}`
  vi.spyOn(databaseModule, 'openFitInsightDb').mockImplementation(() =>
    realOpenFitInsightDb(databaseName),
  )
})

afterEach(async () => {
  vi.restoreAllMocks()
  setupDatabase?.close()
  setupDatabase = undefined
  await deleteDB(databaseName)
})

test('matches date-only records and workout localDate before building today', async () => {
  setupDatabase = await realOpenFitInsightDb(databaseName)
  await Promise.all([
    setupDatabase.put('dailyRecords', todayRecord, todayRecord.date),
    setupDatabase.put('workouts', todayWorkout, todayWorkout.id),
  ])
  setupDatabase.close()
  setupDatabase = undefined

  const { result } = renderHook(() => useToday('2026-07-29', 0))

  await waitFor(() => expect(result.current.status).toBe('ready'))
  if (result.current.status !== 'ready') throw new Error('Expected ready state')
  expect(result.current.viewModel.dateLabel).toBe('7月29日 周三')
  expect(result.current.viewModel.evidence.map((item) => item.id)).toEqual([
    'steps',
    'active-energy',
    'exercise-minutes',
    'sleep',
  ])
  expect(
    result.current.viewModel.details
      .flatMap((group) => group.items)
      .find((item) => item.label === '训练类型')?.value,
  ).toBe('泳池游泳')
})

test('returns an honest empty state when only another local day was imported', async () => {
  setupDatabase = await realOpenFitInsightDb(databaseName)
  await setupDatabase.put(
    'dailyRecords',
    { ...todayRecord, date: '2026-07-28' },
    '2026-07-28',
  )
  await setupDatabase.put(
    'meta',
    {
      key: 'database-state',
      revision: 2,
      lastImportedAt: '2026-07-29T13:42:00+08:00',
    },
    'database-state',
  )
  setupDatabase.close()
  setupDatabase = undefined

  const { result } = renderHook(() => useToday('2026-07-29', 2))

  await waitFor(() => expect(result.current.status).toBe('empty'))
  expect(result.current).toEqual({
    status: 'empty',
    lastImportedAt: '2026-07-29T13:42:00+08:00',
  })
})

test('maps a local database failure to a non-sensitive error state', async () => {
  vi.mocked(databaseModule.openFitInsightDb).mockRejectedValueOnce(
    new Error('raw indexed db internals'),
  )
  const { result } = renderHook(() => useToday('2026-07-29', 0))

  await waitFor(() => expect(result.current.status).toBe('error'))
  expect(result.current).toEqual({
    status: 'error',
    message: '本地健康数据读取失败，请稍后重试。',
  })
})

test('partial workout coverage does not prescribe unobserved weekly sessions', async () => {
  setupDatabase = await realOpenFitInsightDb(databaseName)
  await Promise.all([
    setupDatabase.put('dailyRecords', todayRecord, todayRecord.date),
    setupDatabase.put('workouts', todayWorkout, todayWorkout.id),
    setupDatabase.put('privateProfile', weeklyProfile, 'current'),
    setupDatabase.put(
      'importHistory',
      importHistory(
        'workout-partial',
        ['workouts'],
        '2026-07-29',
        '2026-07-29',
      ),
      'workout-partial',
    ),
    setupDatabase.put(
      'importHistory',
      importHistory(
        'exercise-complete',
        ['exerciseMinutes'],
        '2026-07-27',
        '2026-07-29',
      ),
      'exercise-complete',
    ),
  ])
  setupDatabase.close()
  setupDatabase = undefined

  const { result } = renderHook(() => useToday('2026-07-29', 0))

  await waitFor(() => expect(result.current.status).toBe('ready'))
  if (result.current.status !== 'ready') throw new Error('Expected ready state')
  expect(
    result.current.viewModel.recommendations.map((item) => item.id),
  ).not.toContain('weekly-structure')
})

const todayRecord: DailyRecord = {
  date: '2026-07-29',
  steps: 8_426,
  activeEnergyKcal: 540,
  exerciseMinutes: 46,
  standHours: 11,
  walkingRunningDistanceKm: 6.4,
  restingHeartRateBpm: 58,
  hrvSdnnMs: 52,
  sleep: {
    start: '2026-07-28T23:30:00+08:00',
    end: '2026-07-29T07:05:00+08:00',
    totalMinutes: 418,
    awakeMinutes: 37,
    coreMinutes: null,
    deepMinutes: null,
    remMinutes: null,
    source: 'Apple Health',
  },
}

const todayWorkout: Workout = {
  id: 'workout-today',
  externalId: 'external-today',
  type: 'poolSwimming',
  rawType: 'HKWorkoutActivityTypeSwimming',
  localDate: '2026-07-29',
  start: '2026-07-28T23:30:00Z',
  end: '2026-07-29T00:16:00Z',
  durationMinutes: 46,
  activeEnergyKcal: 326,
  distanceMeters: 1_500,
  swimmingStrokeCount: 812,
  averageHeartRateBpm: null,
  maximumHeartRateBpm: null,
  heartRateSamples: null,
  source: 'Apple Health',
  device: 'Apple Watch',
}

const weeklyProfile: UserProfile = {
  id: 'current',
  name: 'Lu',
  sex: 'unspecified',
  birthDate: null,
  ageAsOf: null,
  heightCm: null,
  maximumHeartRateBpm: null,
  bodyContext: {
    weightKg: null,
    bodyFatMassKg: null,
    bodyFatPercentage: null,
    skeletalMuscleMassKg: null,
    bmi: null,
    waistHipRatio: null,
    visceralFatLevel: null,
    basalMetabolicRateKcal: null,
  },
  goals: {
    objective: 'generalFitness',
    dailySteps: null,
    weeklyWorkoutDays: 4,
    weeklySwimmingSessions: 2,
    weeklyStrengthSessions: 2,
    weeklyModerateMinutes: 180,
    sleepMinMinutes: null,
    sleepMaxMinutes: null,
    targetWeightRangeKg: null,
    longTermWeightRangeKg: null,
    targetWeeklyWeightLossKg: null,
    targetBodyFatPercentage: null,
  },
  updatedAt: '2026-07-01T08:00:00+08:00',
}

function importHistory(
  id: string,
  includedMetrics: CoverageMetricKey[],
  startDate: string,
  endDate: string,
): ImportHistoryEntry {
  const emptyCounts = { added: 0, updated: 0, unchanged: 0, skipped: 0 }
  return {
    id,
    importedAt: '2026-07-29T13:42:00+08:00',
    generatedAt: '2026-07-29T13:40:00+08:00',
    timezone: 'Asia/Shanghai',
    source: 'synthetic test data',
    coverage: { startDate, endDate, includedMetrics, mode: 'patch' },
    counts: {
      daily: { ...emptyCounts },
      workouts: { ...emptyCounts },
      body: { ...emptyCounts },
      warningCount: 0,
    },
    warnings: [],
  }
}
