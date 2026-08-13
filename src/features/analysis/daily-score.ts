import type {
  DailyAnalysis,
  DailyAnalysisInput,
  ScoreResult,
} from '../../types/analysis'
import { combineWeightedScores, type WeightedPart } from './score-utils'

export const DAILY_WEIGHTS = {
  activity: 25,
  workout: 25,
  sleep: 25,
  recovery: 15,
  weeklyStructure: 10,
} as const

export function calculateDailyAnalysis(
  input: DailyAnalysisInput,
): DailyAnalysis {
  const score = combineWeightedScores([
    scorePart(input.activityScore, DAILY_WEIGHTS.activity),
    scorePart(input.workoutScore, DAILY_WEIGHTS.workout, !input.plannedRestDay),
    scorePart(input.sleepScore, DAILY_WEIGHTS.sleep),
    scorePart(input.recoveryScore, DAILY_WEIGHTS.recovery),
    scorePart(input.weeklyStructureScore, DAILY_WEIGHTS.weeklyStructure),
  ])
  return {
    classification: input.dayType,
    score,
    status: statusFor(score.score),
  }
}

function scorePart(
  result: ScoreResult,
  weight: number,
  applicable = true,
): WeightedPart {
  return {
    score: result.score,
    weight,
    coverage: result.coverage,
    applicable,
    evidence: result.evidence,
  }
}

function statusFor(score: number | null): DailyAnalysis['status'] {
  if (score === null) return '数据不足'
  if (score >= 85) return '状态很好'
  if (score >= 70) return '基本达标'
  if (score >= 55) return '部分不足'
  if (score >= 40) return '明显不足'
  return '活动或恢复不足'
}
