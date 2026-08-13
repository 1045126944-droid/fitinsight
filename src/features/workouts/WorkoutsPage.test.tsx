import { render, renderHook, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test, vi } from 'vitest'
import type { Workout } from '../../types/health-data'
import type { UserProfile } from '../../types/profile'
import {
  buildWorkoutListItems,
  buildWorkoutsViewModel,
} from './workout-view-model'
import { useWorkouts } from './useWorkouts'
import { WorkoutsPage } from './WorkoutsPage'

test('filters swimming and does not fabricate zones without timestamped samples', async () => {
  const user = userEvent.setup()
  render(
    <WorkoutsPage
      state={{
        status: 'ready',
        viewModel: buildWorkoutsViewModel(
          [
            workout({
              id: 'swim',
              type: 'poolSwimming',
              localDate: '2026-08-01',
              start: '2026-08-01T18:00:00+08:00',
              durationMinutes: 40,
              distanceMeters: 2_000,
              averageHeartRateBpm: 136,
              maximumHeartRateBpm: 162,
              heartRateSamples: null,
            }),
            workout({
              id: 'strength',
              type: 'traditionalStrength',
              localDate: '2026-07-31',
              start: '2026-07-31T18:00:00+08:00',
            }),
          ],
          profile(),
        ),
      }}
      openSyncSheet={vi.fn()}
    />,
  )

  await user.click(screen.getByRole('button', { name: '游泳' }))
  expect(screen.getAllByRole('article')).toHaveLength(1)
  await user.click(screen.getByRole('button', { name: /泳池游泳/ }))
  expect(screen.getByText('平均配速（含休息）')).toBeVisible()
  expect(screen.queryByText('心率区间')).not.toBeInTheDocument()
})

test('maps every workout category and presents repository results newest first', () => {
  const items = buildWorkoutListItems([
    workout({
      id: 'walk',
      type: 'walking',
      localDate: '2026-08-02',
      start: '2026-08-02T09:00:00+08:00',
    }),
    workout({
      id: 'swim',
      type: 'openWaterSwimming',
      localDate: '2026-08-01',
      start: '2026-08-01T09:00:00+08:00',
    }),
    workout({
      id: 'strength',
      type: 'functionalStrength',
      localDate: '2026-08-03',
      start: '2026-08-03T09:00:00+08:00',
    }),
    workout({
      id: 'run',
      type: 'running',
      localDate: '2026-08-02',
      start: '2026-08-02T18:00:00+08:00',
    }),
    workout({
      id: 'other',
      type: 'other',
      localDate: '2026-07-30',
      start: '2026-07-30T09:00:00+08:00',
    }),
  ])

  expect(
    items.map(({ id, category, localDate }) => ({ id, category, localDate })),
  ).toEqual([
    { id: 'strength', category: 'strength', localDate: '2026-08-03' },
    { id: 'run', category: 'running', localDate: '2026-08-02' },
    { id: 'walk', category: 'walking', localDate: '2026-08-02' },
    { id: 'swim', category: 'swimming', localDate: '2026-08-01' },
    { id: 'other', category: 'other', localDate: '2026-07-30' },
  ])
})

test('renders one group per authoritative localDate even when start strings cross date boundaries', () => {
  render(
    <WorkoutsPage
      state={{
        status: 'ready',
        viewModel: buildWorkoutsViewModel(
          [
            workout({
              id: 'day-3-early-string',
              localDate: '2026-08-03',
              start: '2026-08-01T23:00:00-10:00',
            }),
            workout({
              id: 'day-2',
              localDate: '2026-08-02',
              start: '2026-08-02T12:00:00Z',
            }),
            workout({
              id: 'day-3-late-string',
              localDate: '2026-08-03',
              start: '2026-08-03T08:00:00+08:00',
            }),
          ],
          null,
        ),
      }}
      openSyncSheet={vi.fn()}
    />,
  )

  expect(
    screen.getAllByRole('heading', { level: 2, name: /8月3日/ }),
  ).toHaveLength(1)
  expect(screen.getAllByRole('article')).toHaveLength(3)
})

test('reloads workouts after the local data revision changes', async () => {
  const first = buildWorkoutsViewModel(
    [workout({ id: 'first', type: 'walking' })],
    null,
  )
  const second = buildWorkoutsViewModel(
    [workout({ id: 'second', type: 'running' })],
    null,
  )
  const load = vi
    .fn()
    .mockResolvedValueOnce(first)
    .mockResolvedValueOnce(second)
  const { result, rerender } = renderHook(
    ({ revision }) => useWorkouts(revision, load),
    { initialProps: { revision: 0 } },
  )

  await waitFor(() =>
    expect(result.current).toMatchObject({ status: 'ready', viewModel: first }),
  )
  rerender({ revision: 1 })
  await waitFor(() =>
    expect(result.current).toMatchObject({
      status: 'ready',
      viewModel: second,
    }),
  )
  expect(load).toHaveBeenCalledTimes(2)
})

function workout(overrides: Partial<Workout> = {}): Workout {
  return {
    id: 'workout',
    externalId: null,
    type: 'other',
    rawType: null,
    localDate: '2026-08-01',
    start: '2026-08-01T08:00:00+08:00',
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

function profile(): UserProfile {
  return {
    id: 'current',
    name: 'Lu',
    sex: 'unspecified',
    birthDate: '1990-01-01',
    ageAsOf: null,
    heightCm: null,
    maximumHeartRateBpm: 190,
    bodyContext: {
      weightKg: null,
      bodyFatMassKg: null,
      bodyFatPercentage: null,
      skeletalMuscleMassKg: null,
      bmi: null,
      waistHipRatio: null,
      visceralFatLevel: null,
      basalMetabolicRateKcal: null,
    },
    goals: {
      objective: null,
      dailySteps: null,
      weeklyWorkoutDays: null,
      weeklySwimmingSessions: null,
      weeklyStrengthSessions: 3,
      weeklyModerateMinutes: null,
      sleepMinMinutes: null,
      sleepMaxMinutes: null,
      targetWeightRangeKg: null,
      longTermWeightRangeKg: null,
      targetWeeklyWeightLossKg: null,
      targetBodyFatPercentage: null,
    },
    updatedAt: '2026-07-01T08:00:00+08:00',
  }
}
