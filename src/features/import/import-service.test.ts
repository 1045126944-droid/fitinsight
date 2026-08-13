import type { IDBPDatabase } from 'idb'
import { deleteDB } from 'idb'
import { afterEach, beforeEach, expect, test } from 'vitest'
import { openFitInsightDb } from '../../db/database'
import {
  createHealthRepository,
  getHealthSnapshot,
} from '../../db/health-repository'
import type { FitInsightDb } from '../../types/storage'
import { syntheticEnvelope } from '../../tests/fixtures/health-envelope'
import demoHealthText from '../../demo/sample-realistic-health.json?raw'
import realisticShortcutText from '../../../public/examples/sample-realistic-health.json?raw'
import { getDataMode } from '../../demo/demo-data'
import {
  commitPreparedImport,
  inspectHealthFile,
  type ImportServiceError,
} from './import-service'

let dbName: string
let db: IDBPDatabase<FitInsightDb> | undefined

beforeEach(() => {
  dbName = `fitinsight-import-service-${crypto.randomUUID()}`
})

afterEach(async () => {
  db?.close()
  db = undefined
  await deleteDB(dbName)
})

function emptySnapshot() {
  return {
    revision: 0,
    dailyRecords: [],
    workouts: [],
    bodyMeasurements: [],
    coverage: {},
    lastImportedAt: null,
  }
}

test('inspects a health file without committing it or applying envelope profile metadata', async () => {
  db = await openFitInsightDb(dbName)
  const repository = createHealthRepository(db)
  const file = new File(
    [
      JSON.stringify({
        ...syntheticEnvelope,
        profile: { name: 'Synthetic Person' },
      }),
    ],
    'fitinsight.json',
    { type: 'application/json' },
  )

  const prepared = await inspectHealthFile(file, repository)

  expect(prepared.summary.daily.added).toBe(1)
  expect(await repository.getHealthSnapshot()).toEqual(emptySnapshot())
  expect(await repository.getPrivateProfile()).toBeNull()

  await commitPreparedImport(prepared, db)
  expect((await repository.getHealthSnapshot()).dailyRecords).toHaveLength(1)
  expect(await repository.getPrivateProfile()).toBeNull()
})

test('accepts a JSON extension when iOS omits the MIME type', async () => {
  db = await openFitInsightDb(dbName)
  const prepared = await inspectHealthFile(
    new File([JSON.stringify(syntheticEnvelope)], 'export.json', { type: '' }),
    createHealthRepository(db),
  )

  expect(prepared.fileName).toBe('export.json')
})

test('previews and commits a simplified Shortcut 1.1 file on iOS', async () => {
  db = await openFitInsightDb(dbName)
  const repository = createHealthRepository(db)
  const prepared = await inspectHealthFile(
    new File(
      [
        JSON.stringify({
          schemaVersion: '1.1.0',
          generatedAt: '2026-08-09T20:42:00+08:00',
          timezone: 'Asia/Shanghai',
          source: 'FitInsight Shortcut',
          daily: {
            date: '2026-08-09',
            steps: 8426,
            activeEnergyKcal: 534,
            exerciseMinutes: 48,
            distanceKm: 6.8,
            restingHeartRate: 63,
            hrv: 51,
          },
          sleep: { totalMinutes: 438 },
          body: { weightKg: 81.6, bodyFatPercentage: null },
          workouts: [],
        }),
      ],
      'fitinsight-health.json',
      { type: '' },
    ),
    repository,
  )

  expect(prepared.summary).toMatchObject({
    daily: { added: 1, updated: 0, skipped: 0 },
    workouts: { added: 0, updated: 0, skipped: 0 },
    body: { added: 1, updated: 0, skipped: 0 },
  })
  await commitPreparedImport(prepared, db)
  expect(await repository.getHealthSnapshot()).toMatchObject({
    dailyRecords: [
      expect.objectContaining({
        date: '2026-08-09',
        steps: 8426,
        hrvSdnnMs: 51,
      }),
    ],
    bodyMeasurements: [expect.objectContaining({ weightKg: 81.6 })],
  })
})

test('replaces bundled demo records when the first personal health file is confirmed', async () => {
  db = await openFitInsightDb(dbName)
  const repository = createHealthRepository(db)
  const demo = await inspectHealthFile(
    new File([demoHealthText], 'demo.json', { type: 'application/json' }),
    repository,
  )
  await commitPreparedImport(demo, db)

  const personal = await inspectHealthFile(
    new File(
      [
        JSON.stringify({
          ...syntheticEnvelope,
          source: 'FitInsight Shortcut',
          dailyRecords: [
            {
              ...syntheticEnvelope.dailyRecords[0],
              date: '2026-08-09',
              steps: 12_345,
            },
          ],
          workouts: [],
          bodyMeasurements: [],
        }),
      ],
      'personal.json',
      { type: 'application/json' },
    ),
    repository,
  )
  await commitPreparedImport(personal, db)

  const snapshot = await repository.getHealthSnapshot()
  expect(snapshot.dailyRecords).toEqual([
    expect.objectContaining({ date: '2026-08-09', steps: 12_345 }),
  ])
  expect(snapshot.workouts).toEqual([])
  expect(snapshot.bodyMeasurements).toEqual([])
})

test('previews and commits the realistic Shortcut example as a personal replacement for bundled demo data', async () => {
  db = await openFitInsightDb(dbName)
  const repository = createHealthRepository(db)
  const demo = await inspectHealthFile(
    new File([demoHealthText], 'demo.json', { type: 'application/json' }),
    repository,
  )
  await commitPreparedImport(demo, db)

  const realistic = await inspectHealthFile(
    new File([realisticShortcutText], 'sample-realistic-health.json', {
      type: 'application/json',
    }),
    repository,
  )

  expect(realistic.summary).toMatchObject({
    daily: { added: 30, updated: 0, unchanged: 0, skipped: 0 },
    workouts: { added: 16, updated: 0, unchanged: 0, skipped: 0 },
    body: { added: 8, updated: 0, unchanged: 0, skipped: 0 },
  })
  await commitPreparedImport(realistic, db)

  expect(await getDataMode(db)).toBe('personal')
  expect((await repository.getHealthSnapshot()).dailyRecords).toHaveLength(30)
})

test('rejects a file over 25 MiB before attempting to read it', async () => {
  db = await openFitInsightDb(dbName)
  const file = new File(
    [new Uint8Array(25 * 1024 * 1024 + 1)],
    'oversize.json',
    {
      type: 'application/json',
    },
  )

  await expect(
    inspectHealthFile(file, createHealthRepository(db)),
  ).rejects.toMatchObject({
    code: 'unreadable_file',
  } satisfies Partial<ImportServiceError>)
})

test('maps stale plans to a safe reinspection error without changing data', async () => {
  db = await openFitInsightDb(dbName)
  const repository = createHealthRepository(db)
  const first = await inspectHealthFile(
    new File([JSON.stringify(syntheticEnvelope)], 'first.json', {
      type: 'application/json',
    }),
    repository,
  )
  const stale = await inspectHealthFile(
    new File([JSON.stringify(syntheticEnvelope)], 'stale.json', {
      type: 'application/json',
    }),
    repository,
  )
  await commitPreparedImport(first, db)

  await expect(commitPreparedImport(stale, db)).rejects.toMatchObject({
    code: 'stale_preview',
  } satisfies Partial<ImportServiceError>)
  expect((await getHealthSnapshot(db)).dailyRecords).toHaveLength(1)
})

test('rejects invalid coverage before preparing or writing an import', async () => {
  db = await openFitInsightDb(dbName)
  const repository = createHealthRepository(db)
  const file = new File(
    [
      JSON.stringify({
        ...syntheticEnvelope,
        coverage: {
          startDate: '2026-08-08',
          endDate: '2026-08-01',
          includedMetrics: ['steps', 'unknownMetric'],
          mode: 'patch',
        },
      }),
    ],
    'invalid-coverage.json',
    { type: 'application/json' },
  )

  await expect(inspectHealthFile(file, repository)).rejects.toMatchObject({
    code: 'invalid_envelope',
  } satisfies Partial<ImportServiceError>)
  expect(await repository.getHealthSnapshot()).toEqual(emptySnapshot())
})
