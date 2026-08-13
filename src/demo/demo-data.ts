import type { IDBPDatabase } from 'idb'
import {
  getHealthSnapshot,
  getPrivateProfile,
  savePrivateProfile,
} from '../db/health-repository'
import { importHealthData } from '../db/import-transaction'
import { parseHealthDataJson } from '../features/import/parse-health-data'
import type { UserProfile } from '../types/profile'
import type { FitInsightDb, HealthSnapshot } from '../types/storage'
import demoHealthText from './sample-realistic-health.json?raw'

export type DataMode = 'empty' | 'demo' | 'personal'

export const DEMO_PROFILE: UserProfile = {
  id: 'current',
  name: 'Lu',
  sex: 'male',
  birthDate: null,
  ageAsOf: { age: 21, date: '2026-08-09' },
  heightCm: 175,
  maximumHeartRateBpm: null,
  bodyContext: {
    weightKg: 82.9,
    bodyFatMassKg: 24,
    bodyFatPercentage: 28.9,
    skeletalMuscleMassKg: 33.3,
    bmi: 27.1,
    waistHipRatio: null,
    visceralFatLevel: null,
    basalMetabolicRateKcal: null,
  },
  goals: {
    objective: 'fatLossPreserveMuscle',
    dailySteps: 8_000,
    weeklyWorkoutDays: 5,
    weeklySwimmingSessions: 3,
    weeklyStrengthSessions: 2,
    weeklyModerateMinutes: 180,
    sleepMinMinutes: 420,
    sleepMaxMinutes: 540,
    targetWeightRangeKg: [76, 78],
    longTermWeightRangeKg: [73, 75],
    targetWeeklyWeightLossKg: [0.3, 0.7],
    targetBodyFatPercentage: 25,
  },
  updatedAt: '2026-08-09T17:24:00+08:00',
}

export async function bootstrapDemoData(
  database: IDBPDatabase<FitInsightDb>,
): Promise<boolean> {
  const [snapshot, profile] = await Promise.all([
    getHealthSnapshot(database),
    getPrivateProfile(database),
  ])
  if (!isPristineDatabase(snapshot, profile)) return false

  const parsed = parseHealthDataJson(demoHealthText)
  if (!parsed.ok || parsed.warnings.length > 0)
    throw new Error('invalid bundled demo data')

  await importHealthData(database, parsed.data, parsed.warnings)
  await savePrivateProfile(database, structuredClone(DEMO_PROFILE))
  return true
}

export async function getDataMode(
  database: IDBPDatabase<FitInsightDb>,
  snapshot?: HealthSnapshot,
): Promise<DataMode> {
  const current = snapshot ?? (await getHealthSnapshot(database))
  if (
    current.dailyRecords.length === 0 &&
    current.workouts.length === 0 &&
    current.bodyMeasurements.length === 0
  )
    return 'empty'

  const imports = await database.getAll('importHistory')
  return imports.length > 0 &&
    imports.every((entry) => entry.source.includes('demo-synthetic'))
    ? 'demo'
    : 'personal'
}

function isPristineDatabase(
  snapshot: HealthSnapshot,
  profile: UserProfile | null,
): boolean {
  return (
    snapshot.revision === 0 &&
    snapshot.lastImportedAt === null &&
    snapshot.dailyRecords.length === 0 &&
    snapshot.workouts.length === 0 &&
    snapshot.bodyMeasurements.length === 0 &&
    profile === null
  )
}
