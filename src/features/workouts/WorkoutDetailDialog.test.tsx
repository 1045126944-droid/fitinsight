import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test, vi } from 'vitest'
import type { Workout } from '../../types/health-data'
import type { UserProfile } from '../../types/profile'
import {
  buildWorkoutDetail,
  buildWorkoutsViewModel,
} from './workout-view-model'
import { WorkoutsPage } from './WorkoutsPage'

test('compares swimming pace with only the four most recent earlier workouts of the exact subtype', () => {
  const selected = workout({
    id: 'selected',
    type: 'poolSwimming',
    start: '2026-08-08T08:00:00+08:00',
    localDate: '2026-08-08',
    durationMinutes: 40,
    distanceMeters: 2_000,
  })
  const detail = buildWorkoutDetail(
    selected,
    [
      selected,
      swim('recent-1', '2026-08-07', 130),
      swim('recent-2', '2026-08-06', 140),
      swim('recent-3', '2026-08-05', 150),
      swim('recent-4', '2026-08-04', 160),
      swim('too-old', '2026-08-03', 400),
      swim('later', '2026-08-09', 60),
      workout({
        id: 'open-water',
        type: 'openWaterSwimming',
        start: '2026-08-07T09:00:00+08:00',
        localDate: '2026-08-07',
        durationMinutes: 10,
        distanceMeters: 1_000,
      }),
    ],
    profile(),
  )

  expect(detail.swimming).toEqual({
    pace: '2分00秒/100米',
    comparison: '比最近 4 次快 25 秒/100米',
  })
})

test('shows heart-rate zones only with timestamped samples and a resolvable maximum heart rate', () => {
  const sampled = workout({
    id: 'sampled',
    type: 'running',
    heartRateSamples: [
      { timestamp: '2026-08-01T08:00:00+08:00', bpm: 120 },
      { timestamp: '2026-08-01T08:00:30+08:00', bpm: 150 },
    ],
  })

  expect(
    buildWorkoutDetail(sampled, [sampled], profile()).heartRateZones,
  ).toEqual([
    { zone: 'Z2', duration: '30秒', sampleCount: 1 },
    { zone: 'Z3', duration: '0秒', sampleCount: 1 },
  ])
  expect(buildWorkoutDetail(sampled, [sampled], null).heartRateZones).toBeNull()
})

test('summarizes the selected strength week and progress toward the private local goal without invented exercise details', () => {
  const selected = workout({
    id: 'strength-1',
    type: 'traditionalStrength',
    localDate: '2026-08-05',
    start: '2026-08-05T18:00:00+08:00',
    durationMinutes: 45,
    activeEnergyKcal: 210,
    averageHeartRateBpm: 118,
  })
  const detail = buildWorkoutDetail(
    selected,
    [
      selected,
      workout({
        id: 'strength-2',
        type: 'functionalStrength',
        localDate: '2026-08-07',
        start: '2026-08-07T18:00:00+08:00',
        durationMinutes: 30,
        activeEnergyKcal: 140,
        averageHeartRateBpm: 122,
      }),
      workout({
        id: 'prior-week',
        type: 'traditionalStrength',
        localDate: '2026-08-02',
        start: '2026-08-02T18:00:00+08:00',
        durationMinutes: 60,
      }),
    ],
    profile(),
  )

  expect(detail.strengthSummary).toEqual([
    { label: '本周力量训练', value: '2 次' },
    { label: '本周时长', value: '75 分钟' },
    { label: '本周活动能量', value: '350 千卡' },
    { label: '本周平均心率', value: '120 次/分' },
    { label: '本周目标进度', value: '2 / 3 次' },
  ])
  expect(JSON.stringify(detail)).not.toMatch(/动作|组数|次数|重量/)
})

test('labels the workout dialog, traps focus, closes on Escape, and restores the trigger', async () => {
  const user = userEvent.setup()
  render(
    <WorkoutsPage
      state={{
        status: 'ready',
        viewModel: buildWorkoutsViewModel(
          [workout({ id: 'run', type: 'running' })],
          null,
        ),
      }}
      openSyncSheet={vi.fn()}
    />,
  )

  const trigger = screen.getByRole('button', { name: /跑步 08:00/ })
  await user.click(trigger)
  expect(screen.getByRole('dialog', { name: '跑步详情' })).toBeVisible()
  expect(screen.getByRole('button', { name: '关闭训练详情' })).toHaveFocus()
  await user.tab()
  expect(screen.getByRole('button', { name: '关闭训练详情' })).toHaveFocus()

  await user.keyboard('{Escape}')
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(trigger).toHaveFocus()
})

function swim(id: string, date: string, paceSeconds: number) {
  return workout({
    id,
    type: 'poolSwimming',
    localDate: date,
    start: `${date}T08:00:00+08:00`,
    durationMinutes: paceSeconds / 60,
    distanceMeters: 100,
  })
}

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
