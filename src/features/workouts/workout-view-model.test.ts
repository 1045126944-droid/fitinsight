import { expect, test } from 'vitest'
import type { Workout } from '../../types/health-data'
import { buildWorkoutDetail, buildWorkoutListItems } from './workout-view-model'

test('sorts by authoritative descending localDate before actual start time within that date', () => {
  const items = buildWorkoutListItems([
    workout({
      id: 'day-2-later-epoch',
      localDate: '2026-08-02',
      start: '2026-08-03T11:00:00Z',
    }),
    workout({
      id: 'day-3-earlier-epoch',
      localDate: '2026-08-03',
      start: '2026-08-03T08:00:00+08:00',
    }),
    workout({
      id: 'day-3-later-epoch',
      localDate: '2026-08-03',
      start: '2026-08-03T02:00:00-04:00',
    }),
  ])

  expect(items.map((item) => item.id)).toEqual([
    'day-3-later-epoch',
    'day-3-earlier-epoch',
    'day-2-later-epoch',
  ])
})

test('swimming comparison uses the newest four chronologically earlier exact-subtype workouts by epoch', () => {
  const selected = swim({
    id: 'selected',
    localDate: '2026-08-08',
    start: '2026-08-08T10:00:00+08:00',
    durationMinutes: 2,
  })
  const detail = buildWorkoutDetail(
    selected,
    [
      selected,
      swim({
        id: 'later-but-lexically-earlier',
        start: '2026-08-08T09:30:00+07:00',
        durationMinutes: 1 / 3,
      }),
      swim({
        id: 'newest-earlier-but-lexically-later',
        start: '2026-08-08T10:30:00+09:00',
        durationMinutes: 130 / 60,
      }),
      swim({
        id: 'earlier-2',
        start: '2026-08-08T09:00:00+08:00',
        durationMinutes: 140 / 60,
      }),
      swim({
        id: 'earlier-3',
        start: '2026-08-08T08:30:00+08:00',
        durationMinutes: 150 / 60,
      }),
      swim({
        id: 'earlier-4',
        start: '2026-08-08T08:00:00+08:00',
        durationMinutes: 160 / 60,
      }),
      swim({
        id: 'too-old',
        start: '2026-08-08T07:30:00+08:00',
        durationMinutes: 500 / 60,
      }),
      swim({
        id: 'wrong-subtype',
        type: 'openWaterSwimming',
        start: '2026-08-08T09:45:00+09:00',
        durationMinutes: 1,
      }),
    ],
    null,
  )

  expect(detail.swimming).toEqual({
    pace: '2分00秒/100米',
    comparison: '比最近 4 次快 25 秒/100米',
  })
})

test('preserves the imported timestamp wall clock when displaying local start', () => {
  const imported = workout({
    id: 'offset-start',
    localDate: '2026-08-01',
    start: '2026-08-01T08:05:00-04:00',
  })

  expect(buildWorkoutListItems([imported])[0]?.startLabel).toBe('08:05')
  expect(
    buildWorkoutDetail(imported, [imported], null).metrics.find(
      (metric) => metric.label === '开始时间',
    ),
  ).toEqual({ label: '开始时间', value: '2026年8月1日 08:05' })
})

function swim(overrides: Partial<Workout>): Workout {
  return workout({
    type: 'poolSwimming',
    distanceMeters: 100,
    ...overrides,
  })
}

function workout(overrides: Partial<Workout> = {}): Workout {
  return {
    id: 'workout',
    externalId: null,
    type: 'other',
    rawType: null,
    localDate: '2026-08-08',
    start: '2026-08-08T08:00:00+08:00',
    end: null,
    durationMinutes: null,
    activeEnergyKcal: null,
    distanceMeters: null,
    swimmingStrokeCount: null,
    averageHeartRateBpm: null,
    maximumHeartRateBpm: null,
    heartRateSamples: null,
    source: null,
    device: null,
    ...overrides,
  }
}
