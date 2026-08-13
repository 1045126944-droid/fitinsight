import type { DailyRecord, Workout } from '../../types/health-data'
import { calculatePersonalBaseline } from './personal-baseline'

const daily = (
  date: string,
  overrides: Partial<DailyRecord> = {},
): DailyRecord => ({
  date,
  steps: null,
  activeEnergyKcal: null,
  exerciseMinutes: null,
  standHours: null,
  walkingRunningDistanceKm: null,
  restingHeartRateBpm: null,
  hrvSdnnMs: null,
  sleep: null,
  ...overrides,
})

const workout = (start: string, durationMinutes: number | null): Workout => ({
  id: start,
  externalId: null,
  type: 'running',
  rawType: null,
  localDate: 'ignored-by-analysis',
  start,
  end: null,
  durationMinutes,
  activeEnergyKcal: null,
  distanceMeters: null,
  swimmingStrokeCount: null,
  averageHeartRateBpm: null,
  maximumHeartRateBpm: null,
  heartRateSamples: null,
  source: null,
  device: null,
})

test('excludes today and makes each daily metric ready at seven valid observations', () => {
  const baseline = calculatePersonalBaseline({
    today: '2026-08-01',
    timeZone: 'Asia/Shanghai',
    dailyRecords: [
      daily('2026-07-25', {
        restingHeartRateBpm: 60,
        hrvSdnnMs: 40,
        steps: 7000,
      }),
      daily('2026-07-26', {
        restingHeartRateBpm: 62,
        hrvSdnnMs: 42,
        steps: 7100,
      }),
      daily('2026-07-27', {
        restingHeartRateBpm: 64,
        hrvSdnnMs: 44,
        steps: 7200,
      }),
      daily('2026-07-28', {
        restingHeartRateBpm: 66,
        hrvSdnnMs: 46,
        steps: 7300,
      }),
      daily('2026-07-29', {
        restingHeartRateBpm: 68,
        hrvSdnnMs: 48,
        steps: 7400,
      }),
      daily('2026-07-30', {
        restingHeartRateBpm: 70,
        hrvSdnnMs: 50,
        steps: 7500,
      }),
      daily('2026-07-31', {
        restingHeartRateBpm: 72,
        hrvSdnnMs: null,
        steps: 7600,
      }),
      daily('2026-08-01', {
        restingHeartRateBpm: 10,
        hrvSdnnMs: 10,
        steps: 10,
      }),
    ],
    workouts: [],
    coverage: {},
  })

  expect(baseline.restingHeartRate).toEqual({
    value: 66,
    sampleCount: 7,
    status: 'ready',
  })
  expect(baseline.hrv).toEqual({
    value: null,
    sampleCount: 6,
    status: 'building',
  })
  expect(baseline.steps).toEqual({
    value: 7300,
    sampleCount: 7,
    status: 'ready',
  })
})

test('uses a circular local sleep midpoint across midnight', () => {
  const baseline = calculatePersonalBaseline({
    today: '2026-08-01',
    timeZone: 'Asia/Shanghai',
    dailyRecords: [
      daily('2026-07-25', {
        sleep: {
          start: '2026-07-24T11:30:00Z',
          end: '2026-07-24T19:30:00Z',
          totalMinutes: 480,
          awakeMinutes: null,
          coreMinutes: null,
          deepMinutes: null,
          remMinutes: null,
          source: null,
        },
      }),
      daily('2026-07-26', {
        sleep: {
          start: '2026-07-25T12:30:00Z',
          end: '2026-07-25T20:30:00Z',
          totalMinutes: 480,
          awakeMinutes: null,
          coreMinutes: null,
          deepMinutes: null,
          remMinutes: null,
          source: null,
        },
      }),
      daily('2026-07-27', {
        sleep: {
          start: '2026-07-26T11:30:00Z',
          end: '2026-07-26T19:30:00Z',
          totalMinutes: 480,
          awakeMinutes: null,
          coreMinutes: null,
          deepMinutes: null,
          remMinutes: null,
          source: null,
        },
      }),
      daily('2026-07-28', {
        sleep: {
          start: '2026-07-27T12:30:00Z',
          end: '2026-07-27T20:30:00Z',
          totalMinutes: 480,
          awakeMinutes: null,
          coreMinutes: null,
          deepMinutes: null,
          remMinutes: null,
          source: null,
        },
      }),
      daily('2026-07-29', {
        sleep: {
          start: '2026-07-28T11:30:00Z',
          end: '2026-07-28T19:30:00Z',
          totalMinutes: 480,
          awakeMinutes: null,
          coreMinutes: null,
          deepMinutes: null,
          remMinutes: null,
          source: null,
        },
      }),
      daily('2026-07-30', {
        sleep: {
          start: '2026-07-29T12:30:00Z',
          end: '2026-07-29T20:30:00Z',
          totalMinutes: 480,
          awakeMinutes: null,
          coreMinutes: null,
          deepMinutes: null,
          remMinutes: null,
          source: null,
        },
      }),
      daily('2026-07-31', {
        sleep: {
          start: '2026-07-30T12:00:00Z',
          end: '2026-07-30T20:00:00Z',
          totalMinutes: 480,
          awakeMinutes: null,
          coreMinutes: null,
          deepMinutes: null,
          remMinutes: null,
          source: null,
        },
      }),
    ],
    workouts: [],
    coverage: {},
  })

  expect(baseline.sleepMinutes).toEqual({
    value: 480,
    sampleCount: 7,
    status: 'ready',
  })
  expect(baseline.sleepMidpointMinutes).toEqual({
    value: 0,
    sampleCount: 7,
    status: 'ready',
  })
})

test('counts covered no-workout days but not unqueried days in the 28-day baseline', () => {
  const baseline = calculatePersonalBaseline({
    today: '2026-08-01',
    timeZone: 'Asia/Shanghai',
    dailyRecords: [],
    workouts: [
      workout('2026-07-25T16:30:00Z', 45),
      workout('2026-07-26T16:30:00Z', 30),
      workout('2026-08-01T00:30:00Z', 90),
    ],
    coverage: {
      workouts: [{ startDate: '2026-07-25', endDate: '2026-07-31' }],
    },
  })

  expect(baseline.workoutCount28d).toEqual({
    value: 2,
    sampleCount: 7,
    status: 'ready',
  })
  expect(baseline.workoutMinutes28d).toEqual({
    value: 75,
    sampleCount: 7,
    status: 'ready',
  })
})

test('keeps an unknown workout duration unavailable while covered no-workout days stay zero', () => {
  const baseline = calculatePersonalBaseline({
    today: '2026-08-01',
    timeZone: 'Asia/Shanghai',
    dailyRecords: [],
    workouts: [workout('2026-07-26T16:30:00Z', null)],
    coverage: {
      workouts: [{ startDate: '2026-07-25', endDate: '2026-07-31' }],
    },
  })

  expect(baseline.workoutCount28d).toEqual({
    value: 1,
    sampleCount: 7,
    status: 'ready',
  })
  expect(baseline.workoutMinutes28d).toEqual({
    value: null,
    sampleCount: 6,
    status: 'building',
  })
})

test('uses only valid daily records in the 14 days ending yesterday', () => {
  const baseline = calculatePersonalBaseline({
    today: '2026-08-01',
    timeZone: 'Asia/Shanghai',
    dailyRecords: [
      daily('2026-07-18', { restingHeartRateBpm: 60 }),
      daily('2026-07-19', { restingHeartRateBpm: 62 }),
      daily('2026-07-20', { restingHeartRateBpm: 64 }),
      daily('2026-07-21', { restingHeartRateBpm: 66 }),
      daily('2026-07-22', { restingHeartRateBpm: 68 }),
      daily('2026-07-23', { restingHeartRateBpm: 70 }),
      daily('2026-07-17', { restingHeartRateBpm: 180 }),
      daily('2026-02-30', { restingHeartRateBpm: 20 }),
    ],
    workouts: [],
    coverage: {},
  })

  expect(baseline.restingHeartRate).toEqual({
    value: null,
    sampleCount: 6,
    status: 'building',
  })
})
