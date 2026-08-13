import type { PersonalGoals } from '../../types/profile'
import type { HealthSnapshot } from '../../types/storage'
import type {
  BodyMeasurement,
  Workout,
  WorkoutType,
} from '../../types/health-data'
import { buildMonthlyReview } from './monthly-review'

const goals: PersonalGoals = {
  objective: null,
  dailySteps: null,
  weeklyWorkoutDays: null,
  weeklySwimmingSessions: null,
  weeklyStrengthSessions: null,
  weeklyModerateMinutes: null,
  sleepMinMinutes: null,
  sleepMaxMinutes: null,
  targetWeightRangeKg: null,
  longTermWeightRangeKg: null,
  targetWeeklyWeightLossKg: [0.3, 0.6],
  targetBodyFatPercentage: null,
}

function makeMonthlyInput(today: string) {
  const snapshot: HealthSnapshot = {
    revision: 1,
    dailyRecords: [],
    workouts: [],
    bodyMeasurements: [],
    coverage: {},
    lastImportedAt: null,
  }
  return { snapshot, goals, today, timeZone: 'Asia/Shanghai' }
}

test('an unfinished month compares only equal elapsed days', () => {
  const review = buildMonthlyReview(makeMonthlyInput('2026-08-05'))

  expect(review.periodStatus).toBe('inProgress')
  expect(review.comparison.current.end).toBe('2026-08-05')
  expect(review.comparison.previous.end).toBe('2026-07-05')
})

test('does not describe weight pacing until its evidence threshold is met', () => {
  const review = buildMonthlyReview({
    ...makeMonthlyInput('2026-08-01'),
    snapshot: {
      ...makeMonthlyInput('2026-08-01').snapshot,
      bodyMeasurements: [
        {
          key: 'a',
          date: '2026-07-25',
          measuredAt: null,
          weightKg: 80,
          bodyFatPercentage: null,
          skeletalMuscleMassKg: null,
          waistCm: null,
          source: null,
        },
        {
          key: 'b',
          date: '2026-08-01',
          measuredAt: null,
          weightKg: 79.8,
          bodyFatPercentage: null,
          skeletalMuscleMassKg: null,
          waistCm: null,
          source: null,
        },
      ],
    },
  })

  expect(review.weightTrend.kgPerWeek).toBeNull()
  expect(review.summary).toBeNull()
})

test('keeps deltas null when either period lacks evidence', () => {
  const review = buildMonthlyReview(makeMonthlyInput('2026-08-01'))

  expect(review.deltas.averageSteps).toBeNull()
  expect(review.highlight).toBeNull()
  expect(review.gap).toBeNull()
  expect(review.nextAction).toBeNull()
})

test('keeps flat current-month metrics through the thirty-first when February is shorter', () => {
  const review = buildMonthlyReview({
    ...makeMonthlyInput('2026-03-31'),
    snapshot: {
      ...makeMonthlyInput('2026-03-31').snapshot,
      dailyRecords: ['2026-03-29', '2026-03-30', '2026-03-31'].map((date) => ({
        date,
        steps: 1000,
        activeEnergyKcal: null,
        exerciseMinutes: null,
        standHours: null,
        walkingRunningDistanceKm: null,
        restingHeartRateBpm: null,
        hrvSdnnMs: null,
        sleep: null,
      })),
      coverage: { steps: [{ startDate: '2026-03-01', endDate: '2026-03-31' }] },
    },
  })

  expect(review.endDate).toBe('2026-03-31')
  expect(review.coverage.steps).toBe(1)
  expect(review.averageSteps).toBe(1000)
  expect(review.comparisonCurrent.averageSteps).toBeNull()
  expect(review.deltas.averageSteps).toBeNull()
})

test('treats sleep above the configured maximum as a monthly sleep-goal gap', () => {
  const review = buildMonthlyReview({
    ...makeMonthlyInput('2026-08-05'),
    goals: { ...goals, sleepMinMinutes: 420, sleepMaxMinutes: 540 },
    snapshot: {
      ...makeMonthlyInput('2026-08-05').snapshot,
      dailyRecords: [
        '2026-08-01',
        '2026-08-02',
        '2026-08-03',
        '2026-08-04',
        '2026-08-05',
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
      coverage: { sleep: [{ startDate: '2026-08-01', endDate: '2026-08-05' }] },
    },
  })

  expect(review.highlight).toBeNull()
  expect(review.gap?.id).toBe('sleep-gap')
})

test('does not apply a monthly sleep insight when the sleep range is incomplete', () => {
  const review = buildMonthlyReview({
    ...makeMonthlyInput('2026-08-05'),
    goals: { ...goals, sleepMinMinutes: 420, sleepMaxMinutes: null },
    snapshot: {
      ...makeMonthlyInput('2026-08-05').snapshot,
      dailyRecords: [
        '2026-08-01',
        '2026-08-02',
        '2026-08-03',
        '2026-08-04',
        '2026-08-05',
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
      coverage: { sleep: [{ startDate: '2026-08-01', endDate: '2026-08-05' }] },
    },
  })

  expect(review.highlight).toBeNull()
  expect(review.gap).toBeNull()
  expect(review.nextAction).toBeNull()
})

test('compares a negative regression slope with a positive weekly loss range', () => {
  const review = buildMonthlyReview({
    ...makeMonthlyInput('2026-08-16'),
    snapshot: {
      ...makeMonthlyInput('2026-08-16').snapshot,
      bodyMeasurements: weightSeries([80, 79.8, 79.6, 79.4, 79.2, 79]),
    },
  })

  expect(review.weightTrend.kgPerWeek).toBeCloseTo(-0.47, 2)
  expect(review.summary).toContain('与个人设置范围相符')
  const pace = [review.highlight, review.gap].find((item) =>
    item?.id.startsWith('weight-pace'),
  )
  expect(pace?.evidence[0]).toMatchObject({
    observed: expect.closeTo(0.47, 2),
    target: '0.3–0.6 公斤/周减重',
  })
})

test('describes flat and weight-gain regressions explicitly instead of calling them slower loss', () => {
  const flat = buildMonthlyReview({
    ...makeMonthlyInput('2026-08-16'),
    snapshot: {
      ...makeMonthlyInput('2026-08-16').snapshot,
      bodyMeasurements: weightSeries([80, 80, 80, 80, 80, 80]),
    },
  })
  const gain = buildMonthlyReview({
    ...makeMonthlyInput('2026-08-16'),
    snapshot: {
      ...makeMonthlyInput('2026-08-16').snapshot,
      bodyMeasurements: weightSeries([80, 80.2, 80.4, 80.6, 80.8, 81]),
    },
  })

  expect(flat.summary).toContain('基本持平')
  expect(gain.summary).toContain('每周增加')
  expect(gain.summary).toContain('方向不同')
})

test('scales weekly strength goals to a fourteen-day partial month', () => {
  const workouts = [1, 5, 10].map((day) =>
    monthlyWorkout(
      `2026-08-${String(day).padStart(2, '0')}`,
      'functionalStrength',
    ),
  )
  const review = buildMonthlyReview({
    ...makeMonthlyInput('2026-08-14'),
    goals: onlyMonthlyGoal('weeklyStrengthSessions', 2),
    snapshot: {
      ...makeMonthlyInput('2026-08-14').snapshot,
      workouts,
      coverage: {
        workouts: [{ startDate: '2026-08-01', endDate: '2026-08-14' }],
      },
    },
  })

  expect(review.strengthCount).toBe(3)
  expect(review.gap?.id).toBe('strength-gap')
  expect(review.gap?.evidence[0]?.target).toBe(4)
})

test('scales weekly strength goals across a complete twenty-eight-day month', () => {
  const workouts = [1, 4, 8, 12, 16, 20, 24].map((day) =>
    monthlyWorkout(
      `2026-02-${String(day).padStart(2, '0')}`,
      'traditionalStrength',
    ),
  )
  const review = buildMonthlyReview({
    ...makeMonthlyInput('2026-02-28'),
    goals: onlyMonthlyGoal('weeklyStrengthSessions', 2),
    snapshot: {
      ...makeMonthlyInput('2026-02-28').snapshot,
      workouts,
      coverage: {
        workouts: [{ startDate: '2026-02-01', endDate: '2026-02-28' }],
      },
    },
  })

  expect(review.periodStatus).toBe('complete')
  expect(review.gap?.id).toBe('strength-gap')
  expect(review.gap?.evidence[0]?.target).toBe(8)
})

test('uses distinct workout dates for a monthly workout-day target', () => {
  const review = buildMonthlyReview({
    ...makeMonthlyInput('2026-08-07'),
    goals: onlyMonthlyGoal('weeklyWorkoutDays', 2),
    snapshot: {
      ...makeMonthlyInput('2026-08-07').snapshot,
      workouts: [
        monthlyWorkout('2026-08-03', 'running', '07:00'),
        monthlyWorkout('2026-08-03', 'poolSwimming', '18:00'),
      ],
      coverage: {
        workouts: [{ startDate: '2026-08-01', endDate: '2026-08-07' }],
      },
    },
  })

  expect(review.workoutCount).toBe(2)
  expect(review.workoutDayCount).toBe(1)
  expect(review.gap?.id).toBe('workout-days-gap')
  expect(review.gap?.evidence[0]?.target).toBe(2)
})

function weightSeries(weights: number[]): BodyMeasurement[] {
  return weights.map((weightKg, index) => ({
    key: String(index),
    date: `2026-08-${String(index * 3 + 1).padStart(2, '0')}`,
    measuredAt: null,
    weightKg,
    bodyFatPercentage: null,
    skeletalMuscleMassKg: null,
    waistCm: null,
    source: null,
  }))
}

function monthlyWorkout(
  localDate: string,
  type: WorkoutType,
  time = '08:00',
): Workout {
  return {
    id: `${localDate}-${time}-${type}`,
    externalId: null,
    type,
    rawType: null,
    localDate,
    start: `${localDate}T${time}:00+08:00`,
    end: null,
    durationMinutes: 30,
    activeEnergyKcal: null,
    distanceMeters: type === 'poolSwimming' ? 1000 : null,
    swimmingStrokeCount: null,
    averageHeartRateBpm: null,
    maximumHeartRateBpm: null,
    heartRateSamples: null,
    source: null,
    device: null,
  }
}

function onlyMonthlyGoal<K extends keyof PersonalGoals>(
  key: K,
  value: PersonalGoals[K],
): PersonalGoals {
  return { ...EMPTY_GOALS, [key]: value }
}

const EMPTY_GOALS: PersonalGoals = {
  objective: null,
  dailySteps: null,
  weeklyWorkoutDays: null,
  weeklySwimmingSessions: null,
  weeklyStrengthSessions: null,
  weeklyModerateMinutes: null,
  sleepMinMinutes: null,
  sleepMaxMinutes: null,
  targetWeightRangeKg: null,
  longTermWeightRangeKg: null,
  targetWeeklyWeightLossKg: null,
  targetBodyFatPercentage: null,
}
