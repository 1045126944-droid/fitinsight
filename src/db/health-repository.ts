import type { IDBPDatabase } from 'idb'
import type {
  CoverageRange,
  FitInsightDb,
  HealthSnapshot,
  ImportHistoryEntry,
  ImportPlan,
} from '../types/storage'
import type { ImportWarning } from '../features/import/import-types'
import type { HealthDataEnvelope } from '../types/health-data'
import type { UserProfile } from '../types/profile'
import { prepareImport } from './import-transaction'

const DATABASE_STATE_KEY = 'database-state'

export type HealthRepository = {
  getHealthSnapshot(): Promise<HealthSnapshot>
  getImportHistory(): Promise<ImportHistoryEntry[]>
  getPrivateProfile(): Promise<UserProfile | null>
  prepareImport(
    data: HealthDataEnvelope,
    warnings: ImportWarning[],
  ): Promise<ImportPlan>
}

export function createHealthRepository(
  db: IDBPDatabase<FitInsightDb>,
): HealthRepository {
  return {
    getHealthSnapshot: () => getHealthSnapshot(db),
    getImportHistory: () => db.getAll('importHistory'),
    getPrivateProfile: () => getPrivateProfile(db),
    prepareImport: (data, warnings) => prepareImport(db, data, warnings),
  }
}

export async function getHealthSnapshot(
  db: IDBPDatabase<FitInsightDb>,
): Promise<HealthSnapshot> {
  const tx = db.transaction(
    ['dailyRecords', 'workouts', 'bodyMeasurements', 'importHistory', 'meta'],
    'readonly',
  )
  const [dailyRecords, workouts, bodyMeasurements, importHistory, state] =
    await Promise.all([
      tx.objectStore('dailyRecords').getAll(),
      tx.objectStore('workouts').getAll(),
      tx.objectStore('bodyMeasurements').getAll(),
      tx.objectStore('importHistory').getAll(),
      tx.objectStore('meta').get(DATABASE_STATE_KEY),
    ])
  await tx.done

  return {
    revision: state?.revision ?? 0,
    dailyRecords: dailyRecords.sort((left, right) =>
      left.date.localeCompare(right.date),
    ),
    workouts: workouts.sort((left, right) =>
      left.start.localeCompare(right.start),
    ),
    bodyMeasurements: bodyMeasurements.sort((left, right) =>
      left.key.localeCompare(right.key),
    ),
    coverage: unionCoverage(importHistory),
    lastImportedAt: state?.lastImportedAt ?? null,
  }
}

export async function getPrivateProfile(
  db: IDBPDatabase<FitInsightDb>,
): Promise<UserProfile | null> {
  return (await db.get('privateProfile', 'current')) ?? null
}

export async function savePrivateProfile(
  db: IDBPDatabase<FitInsightDb>,
  profile: UserProfile,
): Promise<void> {
  const tx = db.transaction(['privateProfile', 'meta'], 'readwrite')
  const meta = tx.objectStore('meta')
  const state = await meta.get(DATABASE_STATE_KEY)
  await Promise.all([
    tx.objectStore('privateProfile').put(structuredClone(profile), 'current'),
    meta.put(
      {
        key: DATABASE_STATE_KEY,
        revision: (state?.revision ?? 0) + 1,
        lastImportedAt: state?.lastImportedAt ?? null,
      },
      DATABASE_STATE_KEY,
    ),
  ])
  await tx.done
}

export function unionCoverage(
  importHistory: readonly ImportHistoryEntry[],
): Readonly<Partial<Record<string, readonly CoverageRange[]>>> {
  const rangesByMetric = new Map<string, CoverageRange[]>()
  for (const entry of importHistory) {
    if (!entry.coverage) continue
    for (const metric of entry.coverage.includedMetrics) {
      const ranges = rangesByMetric.get(metric) ?? []
      ranges.push({
        startDate: entry.coverage.startDate,
        endDate: entry.coverage.endDate,
      })
      rangesByMetric.set(metric, ranges)
    }
  }

  const result: Record<string, CoverageRange[]> = {}
  for (const [metric, ranges] of rangesByMetric) {
    const sorted = ranges.sort((left, right) =>
      left.startDate.localeCompare(right.startDate),
    )
    const merged: CoverageRange[] = []
    for (const range of sorted) {
      const previous = merged.at(-1)
      if (previous && range.startDate <= nextDate(previous.endDate)) {
        if (range.endDate > previous.endDate) previous.endDate = range.endDate
      } else {
        merged.push({ ...range })
      }
    }
    result[metric] = merged
  }
  return result
}

function nextDate(date: string): string {
  const value = new Date(`${date}T00:00:00Z`)
  value.setUTCDate(value.getUTCDate() + 1)
  return value.toISOString().slice(0, 10)
}
