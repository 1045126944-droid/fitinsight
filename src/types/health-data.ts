export type WorkoutType =
  | 'poolSwimming'
  | 'openWaterSwimming'
  | 'traditionalStrength'
  | 'functionalStrength'
  | 'walking'
  | 'running'
  | 'other'

export type HeartRateSample = { timestamp: string; bpm: number }

export const COVERAGE_METRIC_KEYS = [
  'steps',
  'activeEnergyKcal',
  'exerciseMinutes',
  'standHours',
  'walkingRunningDistanceKm',
  'restingHeartRateBpm',
  'hrvSdnnMs',
  'sleep',
  'workouts',
  'weightKg',
  'bodyFatPercentage',
  'skeletalMuscleMassKg',
  'waistCm',
] as const

export type CoverageMetricKey = (typeof COVERAGE_METRIC_KEYS)[number]

export type Coverage = {
  startDate: string
  endDate: string
  includedMetrics: CoverageMetricKey[]
  mode: 'patch'
}

export type SleepRecord = {
  start: string | null
  end: string | null
  totalMinutes: number | null
  awakeMinutes: number | null
  coreMinutes: number | null
  deepMinutes: number | null
  remMinutes: number | null
  source: string | null
}

export type DailyRecord = {
  date: string
  steps: number | null
  activeEnergyKcal: number | null
  exerciseMinutes: number | null
  standHours: number | null
  walkingRunningDistanceKm: number | null
  restingHeartRateBpm: number | null
  hrvSdnnMs: number | null
  sleep: SleepRecord | null
}

export type Workout = {
  id: string
  externalId: string | null
  type: WorkoutType
  rawType: string | null
  localDate: string
  start: string
  end: string | null
  durationMinutes: number | null
  activeEnergyKcal: number | null
  distanceMeters: number | null
  swimmingStrokeCount: number | null
  averageHeartRateBpm: number | null
  maximumHeartRateBpm: number | null
  heartRateSamples: HeartRateSample[] | null
  source: string | null
  device: string | null
}

export type BodyMeasurement = {
  key: string
  date: string
  measuredAt: string | null
  weightKg: number | null
  bodyFatPercentage: number | null
  skeletalMuscleMassKg: number | null
  waistCm: number | null
  source: string | null
}

export type HealthDataEnvelope = {
  schemaVersion: string
  generatedAt: string
  timezone: string
  source: string
  coverage: Coverage | null
  dailyRecords: DailyRecord[]
  workouts: Workout[]
  bodyMeasurements: BodyMeasurement[]
}
