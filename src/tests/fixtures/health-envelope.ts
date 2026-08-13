import type { HealthDataEnvelope } from '../../types/health-data'
import { createWorkoutKey } from '../../features/import/workout-key'

export const syntheticEnvelope = {
  schemaVersion: '1.0.0',
  generatedAt: '2026-07-29T10:15:00+08:00',
  timezone: 'Asia/Shanghai',
  source: 'Synthetic Shortcut',
  coverage: {
    startDate: '2026-07-28',
    endDate: '2026-07-29',
    includedMetrics: ['steps', 'workouts'],
    mode: 'patch',
  },
  dailyRecords: [
    {
      date: '2026-07-28',
      steps: 7200,
      activeEnergyKcal: 310,
      exerciseMinutes: 35,
      standHours: 8,
      walkingRunningDistanceKm: 4.8,
      restingHeartRateBpm: 58,
      hrvSdnnMs: null,
      sleep: null,
    },
  ],
  workouts: [
    {
      externalId: null,
      type: 'poolSwimming',
      rawType: 'Pool Swimming',
      localDate: '2026-07-28',
      start: '2026-07-28T18:30:00+08:00',
      end: '2026-07-28T19:05:00+08:00',
      durationMinutes: 35,
      activeEnergyKcal: 230,
      distanceMeters: 1000,
      swimmingStrokeCount: 420,
      averageHeartRateBpm: 132,
      maximumHeartRateBpm: 158,
      heartRateSamples: [{ timestamp: '2026-07-28T18:32:00+08:00', bpm: 128 }],
      source: 'Synthetic Watch',
      device: 'Synthetic Watch',
    },
  ],
  bodyMeasurements: [
    {
      date: '2026-07-28',
      measuredAt: '2026-07-28T07:00:00+08:00',
      weightKg: 70,
      bodyFatPercentage: 20,
      skeletalMuscleMassKg: null,
      waistCm: null,
      source: 'Synthetic Scale',
    },
  ],
} satisfies Omit<HealthDataEnvelope, 'workouts' | 'bodyMeasurements'> & {
  workouts: Array<Omit<HealthDataEnvelope['workouts'][number], 'id'>>
  bodyMeasurements: Array<
    Omit<HealthDataEnvelope['bodyMeasurements'][number], 'key'>
  >
}

type NormalizedEnvelopeOptions = {
  steps?: number | null
  workoutCalories?: number | null
}

export function makeNormalizedEnvelope(
  options: NormalizedEnvelopeOptions = {},
): HealthDataEnvelope {
  const steps = options.steps === undefined ? 7200 : options.steps
  const workoutCalories =
    options.workoutCalories === undefined ? 230 : options.workoutCalories
  const workout = {
    ...syntheticEnvelope.workouts[0]!,
    activeEnergyKcal: workoutCalories,
  }

  return {
    ...structuredClone(syntheticEnvelope),
    dailyRecords: [{ ...syntheticEnvelope.dailyRecords[0]!, steps }],
    workouts: [
      {
        ...workout,
        id: createWorkoutKey(workout),
      },
    ],
    bodyMeasurements: [
      {
        ...syntheticEnvelope.bodyMeasurements[0]!,
        key: syntheticEnvelope.bodyMeasurements[0]!.measuredAt!,
      },
    ],
  }
}
