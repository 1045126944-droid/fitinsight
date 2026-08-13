import sampleText from '../../public/examples/sample-health-data.json?raw'
import { parseHealthDataJson } from '../features/import/parse-health-data'

type RawSample = {
  synthetic?: unknown
  source?: unknown
  coverage: {
    startDate: string
    endDate: string
    includedMetrics: string[]
    mode: string
  }
  dailyRecords: Array<{ date: string; walkingRunningDistanceKm?: unknown }>
  workouts: Array<{
    id?: unknown
    rawType?: unknown
    start?: unknown
    end?: unknown
    swimmingStrokeCount?: unknown
    averageHeartRateBpm?: unknown
    maximumHeartRateBpm?: unknown
    heartRateSamples?: Array<{ timestamp?: unknown }> | null
  }>
  bodyMeasurements: Array<{
    key?: unknown
    measuredAt?: unknown
    skeletalMuscleMassKg?: unknown
    waistCm?: unknown
  }>
  profile?: unknown
}

const offsetTimestamp = /(?:Z|[+-]\d{2}:\d{2})$/

test('the public synthetic example covers 30 days through today and passes the production parser without warnings', () => {
  const raw = JSON.parse(sampleText) as RawSample
  const result = parseHealthDataJson(sampleText)

  expect(result.ok).toBe(true)
  if (!result.ok) return

  expect(result.warnings).toEqual([])
  expect(raw.synthetic).toBe(true)
  expect(raw.source).toContain('synthetic')
  expect(result.data.timezone).toBe('Asia/Shanghai')
  expect(result.data.dailyRecords).toHaveLength(30)
  expect(result.data.dailyRecords.at(0)?.date).toBe('2026-07-11')
  expect(result.data.dailyRecords.at(-1)).toMatchObject({
    date: '2026-08-09',
    steps: 10_420,
    activeEnergyKcal: 648,
    exerciseMinutes: 58,
    standHours: 12,
    restingHeartRateBpm: 59,
    hrvSdnnMs: 51,
  })
  expect(result.data.workouts.map((workout) => workout.type)).toEqual(
    expect.arrayContaining(['poolSwimming', 'traditionalStrength']),
  )
  expect(
    result.data.workouts.every((workout) => workout.heartRateSamples === null),
  ).toBe(true)
  expect(result.data.bodyMeasurements.length).toBeGreaterThanOrEqual(6)

  expect(raw.coverage).toEqual({
    startDate: '2026-07-11',
    endDate: '2026-08-09',
    includedMetrics: [
      'steps',
      'activeEnergyKcal',
      'exerciseMinutes',
      'standHours',
      'restingHeartRateBpm',
      'hrvSdnnMs',
      'sleep',
      'workouts',
      'weightKg',
      'bodyFatPercentage',
    ],
    mode: 'patch',
  })
  expect(raw.profile).toBeUndefined()
  expect(
    raw.dailyRecords.every(
      (record) => record.walkingRunningDistanceKm === undefined,
    ),
  ).toBe(true)
  expect(raw.workouts.every((workout) => workout.id === undefined)).toBe(true)
  expect(
    raw.bodyMeasurements.every((measurement) => measurement.key === undefined),
  ).toBe(true)
  expect(
    raw.workouts.every(
      (workout) =>
        typeof workout.start === 'string' &&
        offsetTimestamp.test(workout.start) &&
        (workout.end === null ||
          (typeof workout.end === 'string' &&
            offsetTimestamp.test(workout.end))),
    ),
  ).toBe(true)
  expect(
    raw.workouts.every(
      (workout) =>
        workout.swimmingStrokeCount === undefined &&
        workout.averageHeartRateBpm === undefined &&
        workout.maximumHeartRateBpm === undefined &&
        workout.heartRateSamples === undefined,
    ),
  ).toBe(true)
  expect(
    raw.bodyMeasurements.every(
      (measurement) =>
        typeof measurement.measuredAt === 'string' &&
        offsetTimestamp.test(measurement.measuredAt) &&
        measurement.skeletalMuscleMassKg === undefined &&
        measurement.waistCm === undefined,
    ),
  ).toBe(true)
})
