import type { DailyRecord } from '../../types/health-data'
import type { PersonalGoals } from '../../types/profile'
import type { ScoreResult } from '../../types/analysis'
import { combineWeightedScores, type WeightedPart } from './score-utils'

type ActivityGoals = Pick<PersonalGoals, 'dailySteps'>

export function calculateActivityScore(
  record: DailyRecord,
  goals: ActivityGoals,
): ScoreResult {
  return combineWeightedScores([
    stepsPart(record.steps, goals.dailySteps),
    standPart(record.standHours),
  ])
}

function stepsPart(steps: number | null, goal: number | null): WeightedPart {
  if (!isFinitePositive(goal))
    return {
      score: null,
      weight: 0.85,
      coverage: 0,
      applicable: false,
      evidence: [],
    }
  if (!isFiniteNonNegative(steps)) return missing(0.85)
  const progress = steps / goal
  return {
    score: Math.min(progress, 1) * 100,
    weight: 0.85,
    coverage: 1,
    applicable: true,
    evidence: [
      {
        metric: 'steps',
        observed: `${Math.round(Math.min(progress, 1.1) * 100)}%`,
        target: goal,
        reason: `今日 ${steps} 步；展示进度最高 110%，评分最高 100`,
      },
    ],
  }
}

function standPart(hours: number | null): WeightedPart {
  if (!isFiniteNonNegative(hours)) return missing(0.15)
  return {
    score: Math.min(hours / 12, 1) * 100,
    weight: 0.15,
    coverage: 1,
    applicable: true,
    evidence: [
      {
        metric: 'standHours',
        observed: hours,
        target: 12,
        reason: '站立小时仅作为活动的辅助信号',
      },
    ],
  }
}

function missing(weight: number): WeightedPart {
  return { score: null, weight, coverage: 0, applicable: true, evidence: [] }
}

function isFinitePositive(value: number | null): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
}

function isFiniteNonNegative(value: number | null): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}
