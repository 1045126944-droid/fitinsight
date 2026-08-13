import type { Workout, WorkoutType } from '../../types/health-data'
import type { PersonalGoals } from '../../types/profile'
import type { HealthSnapshot } from '../../types/storage'
import { buildWeeklyReview } from './weekly-review'

const goals: PersonalGoals = {
  objective: null,
  dailySteps: 8000,
  weeklyWorkoutDays: 3,
  weeklySwimmingSessions: 2,
  weeklyStrengthSessions: 1,
  weeklyModerateMinutes: 150,
  sleepMinMinutes: 420,
  sleepMaxMinutes: 540,
  targetWeightRangeKg: null,
  longTermWeightRangeKg: null,
  targetWeeklyWeightLossKg: null,
  targetBodyFatPercentage: null,
}

function workout(
  localDate: string,
  start: string,
  type: WorkoutType = 'running',
): Workout {
  return {
    id: start,
    externalId: null,
    type,
    rawType: null,
    localDate,
    start,
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
  }
}

function makeWeeklyInput(workoutStarts: string[] = []) {
  const snapshot: HealthSnapshot = {
    revision: 1,
    dailyRecords: [],
    workouts: workoutStarts.map((start) => workout(start.slice(0, 10), start)),
    bodyMeasurements: [],
    coverage: {
      workouts: [{ startDate: '2026-07-27', endDate: '2026-08-01' }],
    },
    lastImportedAt: null,
  }
  return {
    snapshot,
    goals,
    today: '2026-08-01',
    timeZone: 'Asia/Shanghai',
    weekStartsOn: 1 as const,
  }
}

test('counts distinct workout dates rather than workout rows', () => {
  const review = buildWeeklyReview(
    makeWeeklyInput([
      '2026-07-27T07:00:00+08:00',
      '2026-07-27T18:00:00+08:00',
      '2026-07-29T18:00:00+08:00',
    ]),
  )

  expect(review.workoutCount).toBe(3)
  expect(review.workoutDayCount).toBe(2)
})

test('withholds a covered-day aggregate below sixty percent evidence', () => {
  const review = buildWeeklyReview({
    ...makeWeeklyInput(),
    snapshot: {
      ...makeWeeklyInput().snapshot,
      dailyRecords: [
        {
          date: '2026-07-27',
          steps: 9000,
          activeEnergyKcal: null,
          exerciseMinutes: null,
          standHours: null,
          walkingRunningDistanceKm: null,
          restingHeartRateBpm: null,
          hrvSdnnMs: null,
          sleep: null,
        },
      ],
      coverage: { steps: [{ startDate: '2026-07-27', endDate: '2026-07-29' }] },
    },
  })

  expect(review.coverage.steps).toBeCloseTo(0.5)
  expect(review.averageSteps).toBeNull()
})

test('retains an in-progress top-level week while comparing equal elapsed days', () => {
  const review = buildWeeklyReview(makeWeeklyInput())

  expect(review).toMatchObject({
    period: 'week',
    startDate: '2026-07-27',
    endDate: '2026-08-01',
    periodStatus: 'inProgress',
    comparison: {
      basis: 'equalElapsedDays',
      current: { start: '2026-07-27', end: '2026-08-01' },
      previous: { start: '2026-07-20', end: '2026-07-25' },
    },
  })
})

test('treats sleep above the configured maximum as a sleep-goal gap', () => {
  const input = makeWeeklyInput()
  const review = buildWeeklyReview({
    ...input,
    snapshot: {
      ...input.snapshot,
      dailyRecords: [
        '2026-07-27',
        '2026-07-28',
        '2026-07-29',
        '2026-07-30',
        '2026-07-31',
        '2026-08-01',
      ].map((date) => ({
        date,
        steps: null,
        activeEnergyKcal: null,
        exerciseMinutes: null,
        standHours: null,
        walkingRunningDistanceKm: null,
        restingHeartRateBpm: null,
        hrvSdnnMs: null,
        sleep: {
          start: null,
          end: null,
          totalMinutes: 600,
          awakeMinutes: null,
          coreMinutes: null,
          deepMinutes: null,
          remMinutes: null,
          source: null,
        },
      })),
      coverage: { sleep: [{ startDate: '2026-07-27', endDate: '2026-08-01' }] },
    },
  })

  expect(review.highlight).toBeNull()
  expect(review.gap?.id).toBe('sleep-gap')
  expect(review.gap?.text).toContain('高于个人设置上限')
  expect(review.gap?.evidence[0]?.target).toBe(540)
  expect(review.nextAction?.id).toBe('sleep-next')
})

test('describes sleep below the configured minimum in the correct direction', () => {
  const input = makeWeeklyInput()
  const review = buildWeeklyReview({
    ...input,
    snapshot: {
      ...input.snapshot,
      dailyRecords: [
        '2026-07-27',
        '2026-07-28',
        '2026-07-29',
        '2026-07-30',
        '2026-07-31',
        '2026-08-01',
      ].map((date) => dailyWithSleep(date, 360)),
      coverage: { sleep: [{ startDate: '2026-07-27', endDate: '2026-08-01' }] },
    },
  })

  expect(review.gap?.text).toContain('低于个人设置下限')
  expect(review.gap?.evidence[0]?.target).toBe(420)
})

test('prorates a weekly strength target for the elapsed fraction of an early week', () => {
  const strength = workout(
    '2026-08-03',
    '2026-08-03T18:00:00+08:00',
    'functionalStrength',
  )
  const review = buildWeeklyReview({
    ...makeWeeklyInput(),
    today: '2026-08-03',
    goals: {
      ...goals,
      dailySteps: null,
      sleepMinMinutes: null,
      sleepMaxMinutes: null,
      weeklySwimmingSessions: null,
      weeklyWorkoutDays: null,
      weeklyStrengthSessions: 7,
    },
    snapshot: {
      ...makeWeeklyInput().snapshot,
      workouts: [strength],
      coverage: {
        workouts: [{ startDate: '2026-08-03', endDate: '2026-08-03' }],
      },
    },
  })

  expect(review.highlight?.id).toBe('strength-met')
  expect(review.highlight?.evidence[0]?.target).toBe(1)
})

test('uses the full weekly target after all seven days are complete', () => {
  const strength = workout(
    '2026-08-03',
    '2026-08-03T18:00:00+08:00',
    'functionalStrength',
  )
  const review = buildWeeklyReview({
    ...makeWeeklyInput(),
    today: '2026-08-09',
    goals: {
      ...goals,
      dailySteps: null,
      sleepMinMinutes: null,
      sleepMaxMinutes: null,
      weeklySwimmingSessions: null,
      weeklyWorkoutDays: null,
      weeklyStrengthSessions: 2,
    },
    snapshot: {
      ...makeWeeklyInput().snapshot,
      workouts: [strength],
      coverage: {
        workouts: [{ startDate: '2026-08-03', endDate: '2026-08-09' }],
      },
    },
  })

  expect(review.gap?.id).toBe('strength-gap')
  expect(review.gap?.evidence[0]?.target).toBe(2)
})

test('prorates a total goal to covered days when an unfinished week has gaps', () => {
  const coveredDates = ['2026-08-03', '2026-08-04', '2026-08-05']
  const review = buildWeeklyReview({
    ...makeWeeklyInput(),
    today: '2026-08-07',
    goals: {
      ...goals,
      dailySteps: null,
      sleepMinMinutes: null,
      sleepMaxMinutes: null,
      weeklySwimmingSessions: null,
      weeklyWorkoutDays: null,
      weeklyStrengthSessions: 7,
    },
    snapshot: {
      ...makeWeeklyInput().snapshot,
      workouts: coveredDates.map((date) =>
        workout(date, `${date}T18:00:00+08:00`, 'traditionalStrength'),
      ),
      coverage: {
        workouts: [{ startDate: '2026-08-03', endDate: '2026-08-05' }],
      },
    },
  })

  expect(review.coverage.workouts).toBeCloseTo(0.6)
  expect(review.highlight?.id).toBe('strength-met')
  expect(review.highlight?.evidence[0]?.target).toBe(3)
})

test('does not apply a sleep insight when the sleep range is incomplete', () => {
  const input = makeWeeklyInput()
  const review = buildWeeklyReview({
    ...input,
    goals: {
      ...input.goals,
      dailySteps: null,
      sleepMinMinutes: 420,
      sleepMaxMinutes: null,
    },
    snapshot: {
      ...input.snapshot,
      dailyRecords: [
        '2026-07-27',
        '2026-07-28',
        '2026-07-29',
        '2026-07-30',
        '2026-07-31',
        '2026-08-01',
      ].map((date) => ({
        date,
        steps: null,
        activeEnergyKcal: null,
        exerciseMinutes: null,
        standHours: null,
        walkingRunningDistanceKm: null,
        restingHeartRateBpm: null,
        hrvSdnnMs: null,
        sleep: {
          start: null,
          end: null,
          totalMinutes: 480,
          awakeMinutes: null,
          coreMinutes: null,
          deepMinutes: null,
          remMinutes: null,
          source: null,
        },
      })),
      coverage: { sleep: [{ startDate: '2026-07-27', endDate: '2026-08-01' }] },
    },
  })

  expect(review.goalDays).toBeNull()
  expect(review.highlight).toBeNull()
  expect(review.gap).toBeNull()
  expect(review.nextAction).toBeNull()
})

function dailyWithSleep(date: string, totalMinutes: number) {
  return {
    date,
    steps: null,
    activeEnergyKcal: null,
    exerciseMinutes: null,
    standHours: null,
    walkingRunningDistanceKm: null,
    restingHeartRateBpm: null,
    hrvSdnnMs: null,
    sleep: {
      start: null,
      end: null,
      totalMinutes,
      awakeMinutes: null,
      coreMinutes: null,
      deepMinutes: null,
      remMinutes: null,
      source: null,
    },
  }
}
