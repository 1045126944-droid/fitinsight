import type { DailyRecord, Workout } from '../../types/health-data'
import type { EvidenceItem, ScoreResult } from '../../types/analysis'
import { isValidDateOnly } from '../../utils/date-only'
import { combineWeightedScores, type WeightedPart } from './score-utils'

export const WEEKLY_STRUCTURE_WEIGHTS = {
  workoutDays: 0.25,
  moderateMinutes: 0.25,
  swimmingSessions: 0.25,
  strengthSessions: 0.25,
} as const

type WeeklyWorkout = Pick<Workout, 'localDate' | 'type'>
type WeeklyDailyRecord = Pick<DailyRecord, 'date' | 'exerciseMinutes'>

export type WeeklyStructureScoreInput = {
  elapsedDays: number
  workoutCoveredDates: readonly string[]
  exerciseCoveredDates: readonly string[]
  workouts: readonly WeeklyWorkout[]
  dailyRecords: readonly WeeklyDailyRecord[]
  weeklyWorkoutDaysGoal: number | null
  weeklyModerateMinutesGoal: number | null
  weeklySwimmingSessionsGoal: number | null
  weeklyStrengthSessionsGoal: number | null
}

export function calculateWeeklyStructureScore(
  input: WeeklyStructureScoreInput,
): ScoreResult {
  const workoutCoveredDates = new Set(
    input.workoutCoveredDates.filter(isValidDateOnly),
  )
  const exerciseCoveredDates = new Set(
    input.exerciseCoveredDates.filter(isValidDateOnly),
  )
  const elapsedDays = validElapsedDays(input.elapsedDays)
  const coveredWorkouts = input.workouts.filter((workout) =>
    workoutCoveredDates.has(workout.localDate),
  )
  const workoutCoverage = ratio(workoutCoveredDates.size, elapsedDays)
  const distinctWorkoutDays = new Set(
    coveredWorkouts.map((workout) => workout.localDate),
  ).size
  const swimmingSessions = coveredWorkouts.filter((workout) =>
    ['poolSwimming', 'openWaterSwimming'].includes(workout.type),
  ).length
  const strengthSessions = coveredWorkouts.filter((workout) =>
    ['traditionalStrength', 'functionalStrength'].includes(workout.type),
  ).length

  const exerciseByDate = new Map<string, number>()
  for (const record of input.dailyRecords) {
    if (
      exerciseCoveredDates.has(record.date) &&
      isFiniteNonNegative(record.exerciseMinutes)
    )
      exerciseByDate.set(record.date, record.exerciseMinutes)
  }
  const moderateMinutes = [...exerciseByDate.values()].reduce(
    (sum, minutes) => sum + minutes,
    0,
  )
  const exerciseCoverage = ratio(exerciseByDate.size, elapsedDays)

  return combineWeightedScores([
    progressPart({
      metric: 'distinctWorkoutDays',
      observed: distinctWorkoutDays,
      goal: input.weeklyWorkoutDaysGoal,
      coveredDays: workoutCoveredDates.size,
      coverage: workoutCoverage,
      weight: WEEKLY_STRUCTURE_WEIGHTS.workoutDays,
      reason: '按有查询覆盖的本地日期去重，不重复计算同日多次训练',
    }),
    progressPart({
      metric: 'moderateExerciseMinutes',
      observed: moderateMinutes,
      goal: input.weeklyModerateMinutesGoal,
      coveredDays: exerciseByDate.size,
      coverage: exerciseCoverage,
      weight: WEEKLY_STRUCTURE_WEIGHTS.moderateMinutes,
      reason: '只汇总 Apple 每日运动分钟，不把训练时长重复计入',
    }),
    progressPart({
      metric: 'swimmingSessions',
      observed: swimmingSessions,
      goal: input.weeklySwimmingSessionsGoal,
      coveredDays: workoutCoveredDates.size,
      coverage: workoutCoverage,
      weight: WEEKLY_STRUCTURE_WEIGHTS.swimmingSessions,
      reason: '泳池游泳和开放水域游泳均计为游泳训练',
    }),
    progressPart({
      metric: 'strengthSessions',
      observed: strengthSessions,
      goal: input.weeklyStrengthSessionsGoal,
      coveredDays: workoutCoveredDates.size,
      coverage: workoutCoverage,
      weight: WEEKLY_STRUCTURE_WEIGHTS.strengthSessions,
      reason: '传统力量和功能性力量均计为力量训练',
    }),
  ])
}

type ProgressPartInput = {
  metric: string
  observed: number
  goal: number | null
  coveredDays: number
  coverage: number
  weight: number
  reason: string
}

function progressPart(input: ProgressPartInput): WeightedPart {
  if (!isFiniteNonNegative(input.goal)) return notApplicable(input.weight)
  if (input.coveredDays === 0 || input.coverage === 0)
    return missing(input.weight)
  const target = (input.goal * input.coveredDays) / 7
  const score = target === 0 ? 100 : Math.min(input.observed / target, 1) * 100
  const evidence: EvidenceItem = {
    metric: input.metric,
    observed: input.observed,
    target: `${target.toFixed(2)} covered-day target`,
    reason: input.reason,
  }
  return {
    score,
    weight: input.weight,
    coverage: input.coverage,
    applicable: true,
    evidence: [evidence],
  }
}

function notApplicable(weight: number): WeightedPart {
  return { score: null, weight, coverage: 0, applicable: false, evidence: [] }
}

function missing(weight: number): WeightedPart {
  return { score: null, weight, coverage: 0, applicable: true, evidence: [] }
}

function validElapsedDays(value: number): number {
  return Number.isFinite(value) && value > 0
    ? Math.min(7, Math.floor(value))
    : 0
}

function ratio(numerator: number, denominator: number): number {
  return denominator === 0 ? 0 : Math.min(numerator / denominator, 1)
}

function isFiniteNonNegative(value: number | null): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}
