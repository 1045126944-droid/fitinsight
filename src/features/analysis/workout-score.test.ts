import type { Workout } from '../../types/health-data'
import { calculateWorkoutScore } from './workout-score'

function workout(durationMinutes: number | null): Workout {
  return {
    id: String(durationMinutes),
    externalId: null,
    type: 'running',
    rawType: null,
    localDate: '2026-08-01',
    start: '2026-08-01T08:00:00+08:00',
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
  }
}

test('scores workout minutes separately against the personal per-workout target', () => {
  const result = calculateWorkoutScore([workout(20), workout(25)], {
    weeklyModerateMinutes: 210,
    weeklyWorkoutDays: 3,
  })

  expect(result.score).toBe(64)
  expect(result.evidence).toEqual([
    expect.objectContaining({
      metric: 'workoutMinutes',
      observed: 45,
      target: 70,
    }),
  ])
})

test('unknown workout durations reduce coverage rather than add zero minutes', () => {
  const result = calculateWorkoutScore([workout(30), workout(null)], {
    weeklyModerateMinutes: 210,
    weeklyWorkoutDays: 3,
  })

  expect(result.score).toBeNull()
  expect(result.coverage).toBe(0.5)
})
