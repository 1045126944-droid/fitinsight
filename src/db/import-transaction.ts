import type { IDBPDatabase } from 'idb'
import type { ImportWarning } from '../features/import/import-types'
import type { HealthDataEnvelope } from '../types/health-data'
import type {
  EntityImportCounts,
  FitInsightDb,
  ImportPlan,
  ImportSummary,
  UpsertChange,
} from '../types/storage'
import { mergeNonNull } from './merge-non-null'

const DATABASE_STATE_KEY = 'database-state'

export async function prepareImport(
  db: IDBPDatabase<FitInsightDb>,
  data: HealthDataEnvelope,
  warnings: ImportWarning[],
): Promise<ImportPlan> {
  const tx = db.transaction(
    ['dailyRecords', 'workouts', 'bodyMeasurements', 'meta'],
    'readonly',
  )
  const [dailyRecords, workouts, bodyMeasurements, state] = await Promise.all([
    tx.objectStore('dailyRecords').getAll(),
    tx.objectStore('workouts').getAll(),
    tx.objectStore('bodyMeasurements').getAll(),
    tx.objectStore('meta').get(DATABASE_STATE_KEY),
  ])
  await tx.done

  const daily = planChanges(
    dailyRecords,
    data.dailyRecords,
    (record) => record.date,
  )
  const workout = planChanges(workouts, data.workouts, (record) => record.id)
  const body = planChanges(
    bodyMeasurements,
    data.bodyMeasurements,
    (record) => record.key,
  )

  return {
    baseRevision: state?.revision ?? 0,
    generatedAt: data.generatedAt,
    timezone: data.timezone,
    source: data.source,
    coverage: data.coverage,
    dailyChanges: daily.changes,
    workoutChanges: workout.changes,
    bodyChanges: body.changes,
    counts: {
      daily: withSkipped(daily.counts, countSkipped(warnings, 'dailyRecords')),
      workouts: withSkipped(workout.counts, countSkipped(warnings, 'workouts')),
      body: withSkipped(
        body.counts,
        countSkipped(warnings, 'bodyMeasurements'),
      ),
      warningCount: warnings.length,
    },
    warnings: structuredClone(warnings),
  }
}

export async function commitImportPlan(
  db: IDBPDatabase<FitInsightDb>,
  plan: ImportPlan,
): Promise<ImportSummary> {
  const tx = db.transaction(
    ['dailyRecords', 'workouts', 'bodyMeasurements', 'importHistory', 'meta'],
    'readwrite',
  )
  const stateStore = tx.objectStore('meta')
  const currentState = await stateStore.get(DATABASE_STATE_KEY)
  const currentRevision = currentState?.revision ?? 0
  if (currentRevision !== plan.baseRevision) {
    await tx.done
    throw new Error('stale import plan')
  }

  const counts = structuredClone(plan.counts)
  try {
    await putChanges(tx.objectStore('dailyRecords'), plan.dailyChanges)
    await putChanges(tx.objectStore('workouts'), plan.workoutChanges)
    await putChanges(tx.objectStore('bodyMeasurements'), plan.bodyChanges)

    const lastImportedAt = new Date().toISOString()
    const historyId = crypto.randomUUID()
    await Promise.all([
      tx.objectStore('importHistory').put(
        {
          id: historyId,
          importedAt: lastImportedAt,
          generatedAt: plan.generatedAt,
          timezone: plan.timezone,
          source: plan.source,
          coverage: plan.coverage,
          counts,
          warnings: plan.warnings.map(({ code, path }) => ({ code, path })),
        },
        historyId,
      ),
      stateStore.put(
        {
          key: DATABASE_STATE_KEY,
          revision: currentRevision + 1,
          lastImportedAt,
        },
        DATABASE_STATE_KEY,
      ),
    ])
    await tx.done
    return { ...counts, lastImportedAt }
  } catch (error) {
    try {
      tx.abort()
    } catch {
      // The failed request may already have aborted the transaction.
    }
    await tx.done.catch(() => undefined)
    throw error
  }
}

export async function replaceHealthData(
  db: IDBPDatabase<FitInsightDb>,
  data: HealthDataEnvelope,
  warnings: ImportWarning[],
  expectedRevision: number,
): Promise<ImportSummary> {
  const tx = db.transaction(
    ['dailyRecords', 'workouts', 'bodyMeasurements', 'importHistory', 'meta'],
    'readwrite',
  )
  const stateStore = tx.objectStore('meta')
  const currentState = await stateStore.get(DATABASE_STATE_KEY)
  const currentRevision = currentState?.revision ?? 0
  if (currentRevision !== expectedRevision) {
    await tx.done
    throw new Error('stale import plan')
  }

  const counts = {
    daily: {
      added: data.dailyRecords.length,
      updated: 0,
      unchanged: 0,
      skipped: countSkipped(warnings, 'dailyRecords'),
    },
    workouts: {
      added: data.workouts.length,
      updated: 0,
      unchanged: 0,
      skipped: countSkipped(warnings, 'workouts'),
    },
    body: {
      added: data.bodyMeasurements.length,
      updated: 0,
      unchanged: 0,
      skipped: countSkipped(warnings, 'bodyMeasurements'),
    },
    warningCount: warnings.length,
  }

  try {
    await Promise.all([
      tx.objectStore('dailyRecords').clear(),
      tx.objectStore('workouts').clear(),
      tx.objectStore('bodyMeasurements').clear(),
      tx.objectStore('importHistory').clear(),
    ])
    await putRecords(
      tx.objectStore('dailyRecords'),
      data.dailyRecords,
      (record) => record.date,
    )
    await putRecords(
      tx.objectStore('workouts'),
      data.workouts,
      (record) => record.id,
    )
    await putRecords(
      tx.objectStore('bodyMeasurements'),
      data.bodyMeasurements,
      (record) => record.key,
    )

    const lastImportedAt = new Date().toISOString()
    const historyId = crypto.randomUUID()
    await Promise.all([
      tx.objectStore('importHistory').put(
        {
          id: historyId,
          importedAt: lastImportedAt,
          generatedAt: data.generatedAt,
          timezone: data.timezone,
          source: data.source,
          coverage: data.coverage,
          counts,
          warnings: warnings.map(({ code, path }) => ({ code, path })),
        },
        historyId,
      ),
      stateStore.put(
        {
          key: DATABASE_STATE_KEY,
          revision: currentRevision + 1,
          lastImportedAt,
        },
        DATABASE_STATE_KEY,
      ),
    ])
    await tx.done
    return { ...counts, lastImportedAt }
  } catch (error) {
    try {
      tx.abort()
    } catch {
      // The failed request may already have aborted the transaction.
    }
    await tx.done.catch(() => undefined)
    throw error
  }
}

export async function importHealthData(
  db: IDBPDatabase<FitInsightDb>,
  data: HealthDataEnvelope,
  warnings: ImportWarning[],
): Promise<ImportSummary> {
  return commitImportPlan(db, await prepareImport(db, data, warnings))
}

function planChanges<T extends Record<string, unknown>>(
  currentRecords: T[],
  importedRecords: T[],
  getKey: (record: T) => string,
): { changes: UpsertChange<T>[]; counts: EntityImportCounts } {
  const current = new Map(
    currentRecords.map((record) => [getKey(record), record]),
  )
  const changes: UpsertChange<T>[] = []
  let added = 0
  let updated = 0
  let unchanged = 0
  for (const patch of importedRecords) {
    const key = getKey(patch)
    const existing = current.get(key)
    if (!existing) {
      changes.push({ kind: 'add', key, value: patch })
      added += 1
      continue
    }
    const value = mergeNonNull(existing, patch)
    if (recordsEqual(existing, value)) {
      unchanged += 1
    } else {
      changes.push({ kind: 'update', key, value })
      updated += 1
    }
  }
  return { changes, counts: { added, updated, unchanged, skipped: 0 } }
}

function recordsEqual(
  left: Record<string, unknown>,
  right: Record<string, unknown>,
): boolean {
  return JSON.stringify(left) === JSON.stringify(right)
}

function countSkipped(warnings: ImportWarning[], collection: string): number {
  return warnings.filter(
    (warning) =>
      warning.code === 'skipped_record' &&
      warning.path.startsWith(`${collection}[`),
  ).length
}

function withSkipped(
  counts: EntityImportCounts,
  skipped: number,
): EntityImportCounts {
  return { ...counts, skipped }
}

async function putChanges<T>(
  store: { put(value: T, key: string): Promise<string> },
  changes: UpsertChange<T>[],
): Promise<void> {
  for (const change of changes) {
    await store.put(change.value, change.key)
  }
}

async function putRecords<T>(
  store: { put(value: T, key: string): Promise<string> },
  records: T[],
  getKey: (record: T) => string,
): Promise<void> {
  for (const record of records) await store.put(record, getKey(record))
}
