import type { IDBPDatabase } from 'idb'
import { deleteDB } from 'idb'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import type { FitInsightDb, FitInsightBackup } from '../types/storage'
import type { UserProfile } from '../types/profile'
import { makeNormalizedEnvelope } from '../tests/fixtures/health-envelope'
import { clearAllLocalData, exportBackup, restoreBackup } from './backup'
import { openFitInsightDb } from './database'
import { getHealthSnapshot } from './health-repository'
import {
  commitImportPlan,
  importHealthData,
  prepareImport,
} from './import-transaction'

let dbName: string
let db: IDBPDatabase<FitInsightDb> | undefined

beforeEach(() => {
  dbName = `fitinsight-backup-test-${crypto.randomUUID()}`
})

afterEach(async () => {
  vi.restoreAllMocks()
  db?.close()
  db = undefined
  await deleteDB(dbName)
})

test('backup round-trips all stores and clear removes them', async () => {
  db = await openFitInsightDb(dbName)
  await importHealthData(db, makeNormalizedEnvelope({ steps: 7200 }), [])
  const profile = makeProfile()
  await db.put('privateProfile', profile, 'current')
  const backup = await exportBackup(db)
  const revisionBeforeClear = backup.snapshot.revision

  await clearAllLocalData(db)
  expect(await getHealthSnapshot(db)).toMatchObject({
    revision: revisionBeforeClear + 1,
    dailyRecords: [],
    workouts: [],
    bodyMeasurements: [],
  })
  expect(await db.count('importHistory')).toBe(0)
  expect(await db.count('privateProfile')).toBe(0)

  await restoreBackup(db, backup)
  expect(await getHealthSnapshot(db)).toMatchObject({
    revision: revisionBeforeClear + 2,
    dailyRecords: [expect.objectContaining({ steps: 7200 })],
    workouts: [expect.objectContaining({ type: 'poolSwimming' })],
    bodyMeasurements: [expect.objectContaining({ weightKg: 70 })],
  })
  expect(await db.get('privateProfile', 'current')).toEqual(profile)
  expect(await db.count('importHistory')).toBe(1)
})

test('restore uses replace semantics and invalidates a prepared import', async () => {
  db = await openFitInsightDb(dbName)
  await importHealthData(db, makeNormalizedEnvelope({ steps: 5000 }), [])
  const backup = await exportBackup(db)
  await importHealthData(db, makeNormalizedEnvelope({ steps: 8000 }), [])
  const stalePlan = await prepareImport(
    db,
    makeNormalizedEnvelope({ steps: 9000 }),
    [],
  )

  await restoreBackup(db, backup)

  expect((await getHealthSnapshot(db)).dailyRecords[0]?.steps).toBe(5000)
  await expect(commitImportPlan(db, stalePlan)).rejects.toThrow(
    'stale import plan',
  )
})

test('invalid backup is rejected before replacement and leaves every store unchanged', async () => {
  db = await openFitInsightDb(dbName)
  await importHealthData(db, makeNormalizedEnvelope({ steps: 7300 }), [])
  await db.put('privateProfile', makeProfile(), 'current')
  const before = await exportBackup(db)
  const invalid = structuredClone(before) as FitInsightBackup
  invalid.snapshot.dailyRecords[0]!.date = 'not-a-date'

  await expect(restoreBackup(db, invalid)).rejects.toThrow('invalid backup')

  const after = await exportBackup(db)
  expect(after.snapshot).toEqual(before.snapshot)
  expect(after.importHistory).toEqual(before.importHistory)
  expect(after.profile).toEqual(before.profile)
})

test('backup validation rejects an impossible offset-bearing canonical timestamp', async () => {
  db = await openFitInsightDb(dbName)
  await importHealthData(db, makeNormalizedEnvelope(), [])
  const invalid = await exportBackup(db)
  invalid.snapshot.workouts[0]!.start = '2026-02-30T10:15:00+08:00'

  await expect(restoreBackup(db, invalid)).rejects.toThrow('invalid backup')
})

test('backup validation rejects noncanonical coverage keys', async () => {
  db = await openFitInsightDb(dbName)
  await importHealthData(db, makeNormalizedEnvelope(), [])
  const invalid = await exportBackup(db)
  ;(
    invalid.importHistory[0]!.coverage!.includedMetrics as unknown as string[]
  ).push('unknownMetric')

  await expect(restoreBackup(db, invalid)).rejects.toThrow('invalid backup')
})

test.each([
  {
    name: 'daily date',
    duplicate(backup: FitInsightBackup) {
      backup.snapshot.dailyRecords.push({
        ...backup.snapshot.dailyRecords[0]!,
        steps: 9999,
      })
    },
  },
  {
    name: 'workout id',
    duplicate(backup: FitInsightBackup) {
      backup.snapshot.workouts.push({
        ...backup.snapshot.workouts[0]!,
        activeEnergyKcal: 999,
      })
    },
  },
  {
    name: 'body measurement key',
    duplicate(backup: FitInsightBackup) {
      backup.snapshot.bodyMeasurements.push({
        ...backup.snapshot.bodyMeasurements[0]!,
        weightKg: 99,
      })
    },
  },
  {
    name: 'import history id',
    duplicate(backup: FitInsightBackup) {
      backup.importHistory.push({
        ...backup.importHistory[0]!,
        source: 'duplicate history entry',
      })
    },
  },
])('backup validation rejects duplicate $name keys', async ({ duplicate }) => {
  db = await openFitInsightDb(dbName)
  await importHealthData(db, makeNormalizedEnvelope(), [])
  const invalid = await exportBackup(db)
  duplicate(invalid)

  await expect(restoreBackup(db, invalid)).rejects.toThrow('invalid backup')
})

test('restore rollback preserves all stores when a native write fails after replacement starts', async () => {
  db = await openFitInsightDb(dbName)
  await importHealthData(db, makeNormalizedEnvelope({ steps: 7300 }), [])
  await db.put('privateProfile', makeProfile(), 'current')
  const before = await exportBackup(db)
  const replacement = structuredClone(before)
  replacement.snapshot.dailyRecords[0]!.steps = 8400

  const nativePut = IDBObjectStore.prototype.put
  let dailyWriteStarted = false
  vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(function (
    this: IDBObjectStore,
    value: unknown,
    key?: IDBValidKey,
  ) {
    if (this.name === 'workouts' && dailyWriteStarted) {
      throw new DOMException('injected restore write failure', 'DataError')
    }
    const request =
      key === undefined
        ? nativePut.call(this, value)
        : nativePut.call(this, value, key)
    if (this.name === 'dailyRecords') dailyWriteStarted = true
    return request
  })

  await expect(restoreBackup(db, replacement)).rejects.toThrow(
    'injected restore write failure',
  )
  vi.restoreAllMocks()

  const after = await exportBackup(db)
  expect(after.snapshot).toEqual(before.snapshot)
  expect(after.importHistory).toEqual(before.importHistory)
  expect(after.profile).toEqual(before.profile)
})

test('clear invalidates a plan prepared before data removal', async () => {
  db = await openFitInsightDb(dbName)
  const plan = await prepareImport(db, makeNormalizedEnvelope(), [])

  await clearAllLocalData(db)

  await expect(commitImportPlan(db, plan)).rejects.toThrow('stale import plan')
})

function makeProfile(): UserProfile {
  return {
    id: 'current',
    name: '本地用户',
    sex: 'unspecified',
    birthDate: null,
    ageAsOf: null,
    heightCm: 172,
    maximumHeartRateBpm: null,
    bodyContext: {
      weightKg: 70,
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
      dailySteps: 8000,
      weeklyWorkoutDays: null,
      weeklySwimmingSessions: null,
      weeklyStrengthSessions: null,
      weeklyModerateMinutes: null,
      sleepMinMinutes: null,
      sleepMaxMinutes: null,
      targetWeightRangeKg: null,
      longTermWeightRangeKg: null,
      targetWeeklyWeightLossKg: null,
      targetBodyFatPercentage: null,
    },
    updatedAt: '2026-07-29T10:15:00+08:00',
  }
}
