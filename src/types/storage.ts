import type { DBSchema } from 'idb'
import type { ImportWarning } from '../features/import/import-types'
import type {
  BodyMeasurement,
  Coverage,
  DailyRecord,
  Workout,
  WorkoutType,
} from './health-data'
import type { UserProfile } from './profile'

export type EntityImportCounts = {
  added: number
  updated: number
  unchanged: number
  skipped: number
}

export type ImportSummary = {
  daily: EntityImportCounts
  workouts: EntityImportCounts
  body: EntityImportCounts
  warningCount: number
  lastImportedAt: string
}

export type UpsertChange<T> = {
  kind: 'add' | 'update'
  key: string
  value: T
}

export type ImportPlan = {
  baseRevision: number
  generatedAt: string
  timezone: string
  source: string
  coverage: Coverage | null
  dailyChanges: UpsertChange<DailyRecord>[]
  workoutChanges: UpsertChange<Workout>[]
  bodyChanges: UpsertChange<BodyMeasurement>[]
  counts: Omit<ImportSummary, 'lastImportedAt'>
  warnings: ImportWarning[]
}

export type DatabaseState = {
  key: 'database-state'
  revision: number
  lastImportedAt: string | null
}

export type ImportHistoryEntry = {
  id: string
  importedAt: string
  generatedAt: string
  timezone: string
  source: string
  coverage: Coverage | null
  counts: Omit<ImportSummary, 'lastImportedAt'>
  warnings: Pick<ImportWarning, 'code' | 'path'>[]
}

export type CoverageRange = { startDate: string; endDate: string }

export type HealthSnapshot = {
  revision: number
  dailyRecords: DailyRecord[]
  workouts: Workout[]
  bodyMeasurements: BodyMeasurement[]
  coverage: Readonly<Partial<Record<string, readonly CoverageRange[]>>>
  lastImportedAt: string | null
}

export type FitInsightBackup = {
  backupVersion: '1.0.0'
  exportedAt: string
  snapshot: HealthSnapshot
  importHistory: ImportHistoryEntry[]
  profile: UserProfile | null
}

export interface FitInsightDb extends DBSchema {
  dailyRecords: { key: string; value: DailyRecord }
  workouts: {
    key: string
    value: Workout
    indexes: { byLocalDate: string; byType: WorkoutType }
  }
  bodyMeasurements: {
    key: string
    value: BodyMeasurement
    indexes: { byDate: string }
  }
  importHistory: {
    key: string
    value: ImportHistoryEntry
    indexes: { byImportedAt: string }
  }
  meta: { key: 'database-state'; value: DatabaseState }
  privateProfile: { key: 'current'; value: UserProfile }
}
