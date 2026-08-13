import type { DailyRecord, Workout, WorkoutType } from '../../types/health-data'
import { calculateWeeklyStructureScore } from './weekly-structure-score'

function workout(
  localDate: string,
  type: WorkoutType,
): Pick<Workout, 'localDate' | 'type'> {
  return { localDate, type }
}

function daily(
  date: string,
  exerciseMinutes: number | null,
): Pick<DailyRecord, 'date' | 'exerciseMinutes'> {
  return { date, exerciseMinutes }
}

test('uses covered local days and distinct workout dates', () => {
  const result = calculateWeeklyStructureScore({
    elapsedDays: 3,
    workoutCoveredDates: ['2026-07-27', '2026-07-28', '2026-07-29'],
    exerciseCoveredDates: ['2026-07-27', '2026-07-28', '2026-07-29'],
    workouts: [
      workout('2026-07-27', 'running'),
      workout('2026-07-27', 'poolSwimming'),
      workout('2026-07-29', 'functionalStrength'),
    ],
    dailyRecords: [
      daily('2026-07-27', 30),
      daily('2026-07-28', 40),
      daily('2026-07-29', 50),
    ],
    weeklyWorkoutDaysGoal: 4,
    weeklyModerateMinutesGoal: 240,
    weeklySwimmingSessionsGoal: 2,
    weeklyStrengthSessionsGoal: 2,
  })

  expect(result.evidence).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ metric: 'distinctWorkoutDays', observed: 2 }),
      expect.objectContaining({
        metric: 'moderateExerciseMinutes',
        observed: 120,
      }),
      expect.objectContaining({ metric: 'swimmingSessions', observed: 1 }),
      expect.objectContaining({ metric: 'strengthSessions', observed: 1 }),
    ]),
  )
  expect(result.score).toBe(100)
  expect(result.coverage).toBe(1)
})

test('prorates targets to covered days and lowers coverage for unqueried days', () => {
  const result = calculateWeeklyStructureScore({
    elapsedDays: 5,
    workoutCoveredDates: ['2026-07-27', '2026-07-28', '2026-07-29'],
    exerciseCoveredDates: ['2026-07-27', '2026-07-28', '2026-07-29'],
    workouts: [workout('2026-07-27', 'poolSwimming')],
    dailyRecords: [
      daily('2026-07-27', 30),
      daily('2026-07-28', 30),
      daily('2026-07-29', 30),
    ],
    weeklyWorkoutDaysGoal: 4,
    weeklyModerateMinutesGoal: 210,
    weeklySwimmingSessionsGoal: null,
    weeklyStrengthSessionsGoal: null,
  })

  expect(result.score).toBe(79)
  expect(result.coverage).toBeCloseTo(0.6)
  expect(result.evidence).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        metric: 'distinctWorkoutDays',
        target: '1.71 covered-day target',
      }),
      expect.objectContaining({
        metric: 'moderateExerciseMinutes',
        target: '90.00 covered-day target',
      }),
    ]),
  )
})

test('null goals are non-applicable and do not dilute available goals', () => {
  const result = calculateWeeklyStructureScore({
    elapsedDays: 2,
    workoutCoveredDates: ['2026-07-27', '2026-07-28'],
    exerciseCoveredDates: ['2026-07-27', '2026-07-28'],
    workouts: [workout('2026-07-27', 'poolSwimming')],
    dailyRecords: [],
    weeklyWorkoutDaysGoal: null,
    weeklyModerateMinutesGoal: null,
    weeklySwimmingSessionsGoal: 3,
    weeklyStrengthSessionsGoal: null,
  })

  expect(result.score).toBe(100)
  expect(result.coverage).toBe(1)
  expect(result.evidence.map((item) => item.metric)).toEqual([
    'swimmingSessions',
  ])
})

test('exercise-only coverage cannot score absent workouts as zero', () => {
  const result = calculateWeeklyStructureScore({
    elapsedDays: 3,
    workoutCoveredDates: [],
    exerciseCoveredDates: ['2026-07-27', '2026-07-28', '2026-07-29'],
    workouts: [],
    dailyRecords: [
      daily('2026-07-27', 30),
      daily('2026-07-28', 30),
      daily('2026-07-29', 30),
    ],
    weeklyWorkoutDaysGoal: 3,
    weeklyModerateMinutesGoal: 210,
    weeklySwimmingSessionsGoal: 2,
    weeklyStrengthSessionsGoal: 2,
  })

  expect(result.score).toBeNull()
  expect(result.coverage).toBe(0.25)
  expect(result.evidence.map((item) => item.metric)).toEqual([
    'moderateExerciseMinutes',
  ])
})
