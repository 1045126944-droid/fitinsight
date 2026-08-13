import type { DailyRecord } from '../../types/health-data'
import type { HealthSnapshot } from '../../types/storage'
import { buildTrend } from './trend-analysis'

function snapshot(overrides: Partial<HealthSnapshot> = {}): HealthSnapshot {
  return {
    revision: 1,
    dailyRecords: [],
    workouts: [],
    bodyMeasurements: [],
    coverage: {},
    lastImportedAt: null,
    ...overrides,
  }
}

function daily(
  date: string,
  overrides: Partial<DailyRecord> = {},
): DailyRecord {
  return {
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
  }
}

test('returns no statistics or invented points when a metric has no data', () => {
  const result = buildTrend({
    snapshot: snapshot(),
    metric: 'hrvSdnnMs',
    range: 30,
    endDate: '2026-08-01',
    timeZone: 'Asia/Shanghai',
  })

  expect(result).toEqual({
    points: [],
    average: null,
    minimum: null,
    maximum: null,
    previousPeriodChange: null,
    dataPointCount: 0,
  })
})

test('uses inclusive date-only periods and compares their means as a percentage', () => {
  const result = buildTrend({
    snapshot: snapshot({
      dailyRecords: [
        daily('2026-07-19', { steps: 100 }),
        daily('2026-07-20', { steps: 100 }),
        daily('2026-07-28', { steps: 200 }),
        daily('2026-07-29', { steps: 400 }),
      ],
    }),
    metric: 'steps',
    range: 7,
    endDate: '2026-07-29',
    timeZone: 'Asia/Shanghai',
  })

  expect(result).toEqual({
    points: [
      { date: '2026-07-28', value: 200 },
      { date: '2026-07-29', value: 400 },
    ],
    average: 300,
    minimum: 200,
    maximum: 400,
    previousPeriodChange: 200,
    dataPointCount: 2,
  })
})

test('emits a workout zero only for a date with explicit workout coverage', () => {
  const result = buildTrend({
    snapshot: snapshot({
      coverage: {
        workouts: [{ startDate: '2026-07-31', endDate: '2026-07-31' }],
      },
    }),
    metric: 'workoutCount',
    range: 7,
    endDate: '2026-08-01',
    timeZone: 'Asia/Shanghai',
  })

  expect(result.points).toEqual([{ date: '2026-07-31', value: 0 }])
  expect(result.dataPointCount).toBe(1)
})

test('uses the existing sleep scoring function rather than treating sleep as a raw score', () => {
  const result = buildTrend({
    snapshot: snapshot({
      dailyRecords: [
        daily('2026-08-01', {
          sleep: {
            start: '2026-07-31T15:00:00+00:00',
            end: '2026-07-31T23:00:00+00:00',
            totalMinutes: 480,
            awakeMinutes: 20,
            coreMinutes: 260,
            deepMinutes: 110,
            remMinutes: 110,
            source: null,
          },
        }),
      ],
    }),
    metric: 'sleepScore',
    range: 7,
    endDate: '2026-08-01',
    timeZone: 'Asia/Shanghai',
  })

  expect(result.points).toEqual([{ date: '2026-08-01', value: 100 }])
})

test('uses the personal baseline before the trend window for sleep-score points', () => {
  const baselineSleep = {
    start: '2026-07-15T12:00:00Z',
    end: '2026-07-15T20:00:00Z',
    totalMinutes: 480,
    awakeMinutes: 20,
    coreMinutes: 260,
    deepMinutes: 110,
    remMinutes: 110,
    source: null,
  }
  const result = buildTrend({
    snapshot: snapshot({
      dailyRecords: [
        ...[
          '2026-07-19',
          '2026-07-20',
          '2026-07-21',
          '2026-07-22',
          '2026-07-23',
          '2026-07-24',
          '2026-07-25',
        ].map((date) => daily(date, { sleep: baselineSleep })),
        daily('2026-07-26', {
          sleep: {
            ...baselineSleep,
            start: '2026-07-25T18:00:00Z',
            end: '2026-07-26T02:00:00Z',
          },
        }),
      ],
    }),
    metric: 'sleepScore',
    range: 7,
    endDate: '2026-08-01',
    timeZone: 'Asia/Shanghai',
  })

  expect(result.points[0]?.value).toBeLessThan(100)
})

test('emits swimming distance zero when covered workouts contain no swimming', () => {
  const result = buildTrend({
    snapshot: snapshot({
      workouts: [
        {
          id: 'run',
          externalId: null,
          type: 'running',
          rawType: null,
          localDate: '2026-08-01',
          start: '2026-08-01T07:00:00+08:00',
          end: null,
          durationMinutes: 30,
          activeEnergyKcal: null,
          distanceMeters: null,
          swimmingStrokeCount: null,
          averageHeartRateBpm: null,
          maximumHeartRateBpm: null,
          heartRateSamples: null,
          source: null,
          device: null,
        },
      ],
      coverage: {
        workouts: [{ startDate: '2026-08-01', endDate: '2026-08-01' }],
      },
    }),
    metric: 'swimmingDistanceMeters',
    range: 7,
    endDate: '2026-08-01',
    timeZone: 'Asia/Shanghai',
  })

  expect(result.points).toEqual([{ date: '2026-08-01', value: 0 }])
})
