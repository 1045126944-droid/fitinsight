import type { Workout } from '../../types/health-data'
import type { PersonalGoals } from '../../types/profile'
import type { ScoreResult } from '../../types/analysis'
import { combineWeightedScores } from './score-utils'

type WorkoutGoals = Pick<
  PersonalGoals,
  'weeklyModerateMinutes' | 'weeklyWorkoutDays'
>

export function calculateWorkoutScore(
  workouts: readonly Workout[],
  goals: WorkoutGoals,
): ScoreResult {
  if (workouts.length === 0) return unavailable()
  const target = perWorkoutTarget(goals)
  if (target === null) return unavailable()
  const knownDurations = workouts
    .map((workout) => workout.durationMinutes)
    .filter(isFiniteNonNegative)
  if (knownDurations.length === 0) return unavailable()
  const minutes = knownDurations.reduce((sum, value) => sum + value, 0)
  const coverage = knownDurations.length / workouts.length
  return combineWeightedScores([
    {
      score: Math.min(minutes / target, 1) * 100,
      weight: 1,
      coverage,
      applicable: true,
      evidence: [
        {
          metric: 'workoutMinutes',
          observed: minutes,
          target,
          reason: '训练时长单独评分，不再通过每日运动分钟重复计算',
        },
      ],
    },
  ])
}

function perWorkoutTarget(goals: WorkoutGoals): number | null {
  if (
    !isFinitePositive(goals.weeklyModerateMinutes) ||
    !isFinitePositive(goals.weeklyWorkoutDays)
  )
    return null
  return goals.weeklyModerateMinutes / goals.weeklyWorkoutDays
}

function unavailable(): ScoreResult {
  return { score: null, coverage: 0, confidence: 'building', evidence: [] }
}

function isFinitePositive(value: number | null): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
}

function isFiniteNonNegative(value: number | null): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}
