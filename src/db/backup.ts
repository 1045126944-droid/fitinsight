import type { IDBPDatabase } from 'idb'
import { z } from 'zod'
import { COVERAGE_METRIC_KEYS } from '../types/health-data'
import type { FitInsightDb, FitInsightBackup } from '../types/storage'
import { unionCoverage } from './health-repository'

const DATABASE_STATE_KEY = 'database-state'
const datePattern = /^\d{4}-\d{2}-\d{2}$/
const offsetTimestampPattern =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,9})?)?(?:Z|[+-](\d{2}):(\d{2}))$/

const nonNegativeNumber = z.number().finite().nonnegative()
const nullableNumber = nonNegativeNumber.nullable()
const timestamp = z.string().refine(isCanonicalTimestamp)
const date = z.string().regex(datePattern).refine(isCalendarDate)
const nullableTimestamp = timestamp.nullable()
const nullableText = z.string().nullable()

const sleepSchema = z
  .object({
    start: nullableTimestamp,
    end: nullableTimestamp,
    totalMinutes: nullableNumber,
    awakeMinutes: nullableNumber,
    coreMinutes: nullableNumber,
    deepMinutes: nullableNumber,
    remMinutes: nullableNumber,
    source: nullableText,
  })
  .strict()

const dailyRecordSchema = z
  .object({
    date,
    steps: nullableNumber,
    activeEnergyKcal: nullableNumber,
    exerciseMinutes: nullableNumber,
    standHours: nullableNumber,
    walkingRunningDistanceKm: nullableNumber,
    restingHeartRateBpm: nullableNumber,
    hrvSdnnMs: nullableNumber,
    sleep: sleepSchema.nullable(),
  })
  .strict()

const heartRateSampleSchema = z
  .object({ timestamp, bpm: nonNegativeNumber })
  .strict()

const workoutSchema = z
  .object({
    id: z.string().min(1),
    externalId: nullableText,
    type: z.enum([
      'poolSwimming',
      'openWaterSwimming',
      'traditionalStrength',
      'functionalStrength',
      'walking',
      'running',
      'other',
    ]),
    rawType: nullableText,
    localDate: date,
    start: timestamp,
    end: nullableTimestamp,
    durationMinutes: nullableNumber,
    activeEnergyKcal: nullableNumber,
    distanceMeters: nullableNumber,
    swimmingStrokeCount: nullableNumber,
    averageHeartRateBpm: nullableNumber,
    maximumHeartRateBpm: nullableNumber,
    heartRateSamples: z.array(heartRateSampleSchema).nullable(),
    source: nullableText,
    device: nullableText,
  })
  .strict()

const bodyMeasurementSchema = z
  .object({
    key: z.string().min(1),
    date,
    measuredAt: nullableTimestamp,
    weightKg: nullableNumber,
    bodyFatPercentage: nullableNumber,
    skeletalMuscleMassKg: nullableNumber,
    waistCm: nullableNumber,
    source: nullableText,
  })
  .strict()

const coverageSchema = z
  .object({
    startDate: date,
    endDate: date,
    includedMetrics: z.array(z.enum(COVERAGE_METRIC_KEYS)),
    mode: z.literal('patch'),
  })
  .strict()
  .refine((coverage) => coverage.startDate <= coverage.endDate)

const entityCountsSchema = z
  .object({
    added: z.number().int().nonnegative(),
    updated: z.number().int().nonnegative(),
    unchanged: z.number().int().nonnegative(),
    skipped: z.number().int().nonnegative(),
  })
  .strict()

const countsSchema = z
  .object({
    daily: entityCountsSchema,
    workouts: entityCountsSchema,
    body: entityCountsSchema,
    warningCount: z.number().int().nonnegative(),
  })
  .strict()

const warningSchema = z
  .object({
    code: z.enum([
      'invalid_optional_metric',
      'skipped_record',
      'duplicate_record_in_file',
      'unknown_workout_type',
      'profile_ignored',
    ]),
    path: z.string(),
  })
  .strict()

const importHistorySchema = z
  .object({
    id: z.string().min(1),
    importedAt: timestamp,
    generatedAt: timestamp,
    timezone: z.string().min(1),
    source: z.string().min(1),
    coverage: coverageSchema.nullable(),
    counts: countsSchema,
    warnings: z.array(warningSchema),
  })
  .strict()

const nullableRange = z.tuple([nonNegativeNumber, nonNegativeNumber]).nullable()
const profileSchema = z
  .object({
    id: z.literal('current'),
    name: z.string(),
    sex: z.enum(['male', 'female', 'other', 'unspecified']),
    birthDate: date.nullable(),
    ageAsOf: z
      .object({ age: z.number().int().nonnegative(), date })
      .strict()
      .nullable(),
    heightCm: nullableNumber,
    maximumHeartRateBpm: nullableNumber,
    bodyContext: z
      .object({
        weightKg: nullableNumber,
        bodyFatMassKg: nullableNumber,
        bodyFatPercentage: nullableNumber,
        skeletalMuscleMassKg: nullableNumber,
        bmi: nullableNumber,
        waistHipRatio: nullableNumber,
        visceralFatLevel: nullableNumber,
        basalMetabolicRateKcal: nullableNumber,
      })
      .strict(),
    goals: z
      .object({
        objective: z
          .enum(['fatLossPreserveMuscle', 'generalFitness'])
          .nullable(),
        dailySteps: nullableNumber,
        weeklyWorkoutDays: nullableNumber,
        weeklySwimmingSessions: nullableNumber,
        weeklyStrengthSessions: nullableNumber,
        weeklyModerateMinutes: nullableNumber,
        sleepMinMinutes: nullableNumber,
        sleepMaxMinutes: nullableNumber,
        targetWeightRangeKg: nullableRange,
        longTermWeightRangeKg: nullableRange,
        targetWeeklyWeightLossKg: nullableRange,
        targetBodyFatPercentage: nullableNumber,
      })
      .strict(),
    updatedAt: timestamp,
  })
  .strict()

const coverageRangeSchema = z
  .object({ startDate: date, endDate: date })
  .strict()
  .refine((range) => range.startDate <= range.endDate)

const backupSchema = z
  .object({
    backupVersion: z.literal('1.0.0'),
    exportedAt: timestamp,
    snapshot: z
      .object({
        revision: z.number().int().nonnegative(),
        dailyRecords: z.array(dailyRecordSchema),
        workouts: z.array(workoutSchema),
        bodyMeasurements: z.array(bodyMeasurementSchema),
        coverage: z.record(z.string(), z.array(coverageRangeSchema)),
        lastImportedAt: nullableTimestamp,
      })
      .strict(),
    importHistory: z.array(importHistorySchema),
    profile: profileSchema.nullable(),
  })
  .strict()
  .superRefine((backup, context) => {
    addDuplicateIssue(
      backup.snapshot.dailyRecords.map((record) => record.date),
      ['snapshot', 'dailyRecords'],
      context,
    )
    addDuplicateIssue(
      backup.snapshot.workouts.map((workout) => workout.id),
      ['snapshot', 'workouts'],
      context,
    )
    addDuplicateIssue(
      backup.snapshot.bodyMeasurements.map((measurement) => measurement.key),
      ['snapshot', 'bodyMeasurements'],
      context,
    )
    addDuplicateIssue(
      backup.importHistory.map((entry) => entry.id),
      ['importHistory'],
      context,
    )
  })

export type PreparedBackup = {
  backup: FitInsightBackup
  counts: {
    dailyRecords: number
    workouts: number
    bodyMeasurements: number
    importHistory: number
    hasProfile: boolean
  }
}

/** Parses untrusted backup text before any replacement transaction can begin. */
export function prepareBackupRestore(text: string): PreparedBackup {
  let unknownBackup: unknown
  try {
    unknownBackup = JSON.parse(text)
  } catch {
    throw new Error('invalid backup')
  }
  const result = backupSchema.safeParse(unknownBackup)
  if (!result.success) throw new Error('invalid backup')
  return {
    backup: result.data,
    counts: {
      dailyRecords: result.data.snapshot.dailyRecords.length,
      workouts: result.data.snapshot.workouts.length,
      bodyMeasurements: result.data.snapshot.bodyMeasurements.length,
      importHistory: result.data.importHistory.length,
      hasProfile: result.data.profile !== null,
    },
  }
}

export async function exportBackup(
  db: IDBPDatabase<FitInsightDb>,
): Promise<FitInsightBackup> {
  const tx = db.transaction(
    [
      'dailyRecords',
      'workouts',
      'bodyMeasurements',
      'importHistory',
      'meta',
      'privateProfile',
    ],
    'readonly',
  )
  const [
    dailyRecords,
    workouts,
    bodyMeasurements,
    importHistory,
    state,
    profile,
  ] = await Promise.all([
    tx.objectStore('dailyRecords').getAll(),
    tx.objectStore('workouts').getAll(),
    tx.objectStore('bodyMeasurements').getAll(),
    tx.objectStore('importHistory').getAll(),
    tx.objectStore('meta').get(DATABASE_STATE_KEY),
    tx.objectStore('privateProfile').get('current'),
  ])
  await tx.done

  return {
    backupVersion: '1.0.0',
    exportedAt: new Date().toISOString(),
    snapshot: {
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
    },
    importHistory: importHistory.sort((left, right) =>
      left.importedAt.localeCompare(right.importedAt),
    ),
    profile: profile ?? null,
  }
}

export async function restoreBackup(
  db: IDBPDatabase<FitInsightDb>,
  backup: FitInsightBackup,
): Promise<void> {
  const result = backupSchema.safeParse(backup)
  if (!result.success) throw new Error('invalid backup')
  const validated = result.data
  const tx = db.transaction(
    [
      'dailyRecords',
      'workouts',
      'bodyMeasurements',
      'importHistory',
      'meta',
      'privateProfile',
    ],
    'readwrite',
  )
  const metaStore = tx.objectStore('meta')
  const state = await metaStore.get(DATABASE_STATE_KEY)
  const nextRevision = (state?.revision ?? 0) + 1

  try {
    await Promise.all([
      tx.objectStore('dailyRecords').clear(),
      tx.objectStore('workouts').clear(),
      tx.objectStore('bodyMeasurements').clear(),
      tx.objectStore('importHistory').clear(),
      metaStore.clear(),
      tx.objectStore('privateProfile').clear(),
    ])

    for (const record of validated.snapshot.dailyRecords) {
      await tx.objectStore('dailyRecords').put(record, record.date)
    }
    for (const workout of validated.snapshot.workouts) {
      await tx.objectStore('workouts').put(workout, workout.id)
    }
    for (const measurement of validated.snapshot.bodyMeasurements) {
      await tx.objectStore('bodyMeasurements').put(measurement, measurement.key)
    }
    for (const entry of validated.importHistory) {
      await tx.objectStore('importHistory').put(entry, entry.id)
    }
    await metaStore.put(
      {
        key: DATABASE_STATE_KEY,
        revision: nextRevision,
        lastImportedAt: validated.snapshot.lastImportedAt,
      },
      DATABASE_STATE_KEY,
    )
    if (validated.profile) {
      await tx.objectStore('privateProfile').put(validated.profile, 'current')
    }
    await tx.done
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

export async function clearAllLocalData(
  db: IDBPDatabase<FitInsightDb>,
): Promise<void> {
  const tx = db.transaction(
    [
      'dailyRecords',
      'workouts',
      'bodyMeasurements',
      'importHistory',
      'meta',
      'privateProfile',
    ],
    'readwrite',
  )
  const metaStore = tx.objectStore('meta')
  const state = await metaStore.get(DATABASE_STATE_KEY)
  const nextRevision = (state?.revision ?? 0) + 1
  await Promise.all([
    tx.objectStore('dailyRecords').clear(),
    tx.objectStore('workouts').clear(),
    tx.objectStore('bodyMeasurements').clear(),
    tx.objectStore('importHistory').clear(),
    metaStore.clear(),
    tx.objectStore('privateProfile').clear(),
  ])
  await metaStore.put(
    { key: DATABASE_STATE_KEY, revision: nextRevision, lastImportedAt: null },
    DATABASE_STATE_KEY,
  )
  await tx.done
}

function isCalendarDate(value: string): boolean {
  const [year, month, day] = value.split('-').map(Number)
  const parsed = new Date(Date.UTC(year!, month! - 1, day!))
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() + 1 === month &&
    parsed.getUTCDate() === day
  )
}

function isCanonicalTimestamp(value: string): boolean {
  const parts = value.match(offsetTimestampPattern)
  if (!parts) return false
  const [, year, month, day, hour, minute, second, offsetHour, offsetMinute] =
    parts
  return (
    isCalendarDate(`${year}-${month}-${day}`) &&
    isIntegerInRange(hour, 0, 23) &&
    isIntegerInRange(minute, 0, 59) &&
    (second === undefined || isIntegerInRange(second, 0, 59)) &&
    (offsetHour === undefined || isIntegerInRange(offsetHour, 0, 23)) &&
    (offsetMinute === undefined || isIntegerInRange(offsetMinute, 0, 59))
  )
}

function isIntegerInRange(
  value: string | undefined,
  minimum: number,
  maximum: number,
): boolean {
  const numericValue = Number(value)
  return (
    Number.isInteger(numericValue) &&
    numericValue >= minimum &&
    numericValue <= maximum
  )
}

function addDuplicateIssue(
  keys: readonly string[],
  path: PropertyKey[],
  context: z.RefinementCtx,
): void {
  if (new Set(keys).size !== keys.length) {
    context.addIssue({ code: 'custom', message: 'duplicate store key', path })
  }
}
