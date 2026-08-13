import type { IDBPDatabase } from 'idb'
import { deleteDB } from 'idb'
import { afterEach, beforeEach, expect, test } from 'vitest'
import type { FitInsightDb } from '../types/storage'
import { makeNormalizedEnvelope } from '../tests/fixtures/health-envelope'
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
  dbName = `fitinsight-test-${crypto.randomUUID()}`
})

afterEach(async () => {
  db?.close()
  db = undefined
  await deleteDB(dbName)
})

test('reimport is idempotent and null does not erase a prior value', async () => {
  db = await openFitInsightDb(dbName)
  const first = makeNormalizedEnvelope({ steps: 6400, workoutCalories: 420 })
  const patch = makeNormalizedEnvelope({ steps: null, workoutCalories: 440 })

  expect(await importHealthData(db, first, [])).toMatchObject({
    daily: { added: 1, updated: 0, unchanged: 0 },
    workouts: { added: 1, updated: 0, unchanged: 0 },
    body: { added: 1, updated: 0, unchanged: 0 },
  })
  expect(await importHealthData(db, patch, [])).toMatchObject({
    daily: { added: 0, updated: 0, unchanged: 1 },
    workouts: { added: 0, updated: 1, unchanged: 0 },
    body: { added: 0, updated: 0, unchanged: 1 },
  })
  expect(await importHealthData(db, patch, [])).toMatchObject({
    daily: { added: 0, updated: 0, unchanged: 1 },
    workouts: { added: 0, updated: 0, unchanged: 1 },
  })

  const snapshot = await getHealthSnapshot(db)
  expect(snapshot.dailyRecords[0]?.steps).toBe(6400)
  expect(snapshot.workouts[0]?.activeEnergyKcal).toBe(440)
})

test('nested objects merge non-null fields while arrays replace prior arrays', async () => {
  db = await openFitInsightDb(dbName)
  const first = makeNormalizedEnvelope()
  first.dailyRecords[0]!.sleep = {
    start: '2026-07-28T22:00:00+08:00',
    end: '2026-07-29T06:00:00+08:00',
    totalMinutes: 480,
    awakeMinutes: 20,
    coreMinutes: 240,
    deepMinutes: 100,
    remMinutes: 120,
    source: 'Watch',
  }
  first.workouts[0]!.heartRateSamples = [
    { timestamp: '2026-07-28T18:32:00+08:00', bpm: 128 },
    { timestamp: '2026-07-28T18:33:00+08:00', bpm: 130 },
  ]
  await importHealthData(db, first, [])

  const patch = makeNormalizedEnvelope()
  patch.dailyRecords[0]!.sleep = {
    start: null,
    end: null,
    totalMinutes: null,
    awakeMinutes: 15,
    coreMinutes: null,
    deepMinutes: null,
    remMinutes: null,
    source: null,
  }
  patch.workouts[0]!.heartRateSamples = [
    { timestamp: '2026-07-28T18:34:00+08:00', bpm: 132 },
  ]
  await importHealthData(db, patch, [])

  const snapshot = await getHealthSnapshot(db)
  expect(snapshot.dailyRecords[0]?.sleep).toMatchObject({
    start: '2026-07-28T22:00:00+08:00',
    totalMinutes: 480,
    awakeMinutes: 15,
    source: 'Watch',
  })
  expect(snapshot.workouts[0]?.heartRateSamples).toEqual([
    { timestamp: '2026-07-28T18:34:00+08:00', bpm: 132 },
  ])
})

test('preparation is read-only and a successful commit invalidates another plan', async () => {
  db = await openFitInsightDb(dbName)
  const firstPlan = await prepareImport(
    db,
    makeNormalizedEnvelope({ steps: 6100 }),
    [],
  )
  const secondPlan = await prepareImport(
    db,
    makeNormalizedEnvelope({ steps: 6200 }),
    [],
  )

  expect((await getHealthSnapshot(db)).dailyRecords).toEqual([])
  await commitImportPlan(db, firstPlan)
  await expect(commitImportPlan(db, secondPlan)).rejects.toThrow(
    'stale import plan',
  )
  expect((await getHealthSnapshot(db)).dailyRecords[0]?.steps).toBe(6100)
})

test('one import transaction rolls back every store after a real clone failure', async () => {
  db = await openFitInsightDb(dbName)
  const plan = await prepareImport(
    db,
    makeNormalizedEnvelope({ steps: 6800 }),
    [],
  )
  plan.workoutChanges[0]!.value = {
    ...plan.workoutChanges[0]!.value,
    device: (() => 'not cloneable') as unknown as string,
  }

  await expect(commitImportPlan(db, plan)).rejects.toThrow()

  const snapshot = await getHealthSnapshot(db)
  expect(snapshot).toMatchObject({
    revision: 0,
    dailyRecords: [],
    workouts: [],
    bodyMeasurements: [],
    lastImportedAt: null,
  })
  expect(await db.count('importHistory')).toBe(0)
})

test('history stores only sanitized warnings and snapshot unions adjacent coverage', async () => {
  db = await openFitInsightDb(dbName)
  const first = makeNormalizedEnvelope()
  first.coverage = {
    startDate: '2026-07-01',
    endDate: '2026-07-10',
    includedMetrics: ['steps', 'workouts'],
    mode: 'patch',
  }
  const second = makeNormalizedEnvelope()
  second.coverage = {
    startDate: '2026-07-11',
    endDate: '2026-07-20',
    includedMetrics: ['steps'],
    mode: 'patch',
  }
  await importHealthData(db, first, [
    {
      code: 'invalid_optional_metric',
      path: 'dailyRecords[0].steps',
      message: 'raw 999',
    },
  ])
  await importHealthData(db, second, [])

  const history = await db.getAllFromIndex('importHistory', 'byImportedAt')
  const warnedEntry = history.find((entry) => entry.warnings.length > 0)
  expect(warnedEntry?.warnings).toEqual([
    { code: 'invalid_optional_metric', path: 'dailyRecords[0].steps' },
  ])
  expect(JSON.stringify(history)).not.toContain('raw 999')
  expect((await getHealthSnapshot(db)).coverage).toEqual({
    steps: [{ startDate: '2026-07-01', endDate: '2026-07-20' }],
    workouts: [{ startDate: '2026-07-01', endDate: '2026-07-10' }],
  })
})
