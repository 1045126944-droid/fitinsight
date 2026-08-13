import type { ScoreResult } from '../../types/analysis'
import { combineWeightedScores, type WeightedPart } from './score-utils'

export const RECOVERY_WEIGHTS = {
  sleep: 0.4,
  restingHeartRate: 0.25,
  hrv: 0.2,
  recentLoad: 0.15,
} as const

export type RecoveryScoreInput = {
  sleepScore: ScoreResult
  restingHeartRateBpm: number | null
  restingHeartRateBaselineBpm: number | null
  hrvSdnnMs: number | null
  hrvBaselineMs: number | null
  workoutMinutesLast72h: number | null
  consecutiveTrainingDays: number | null
}

export function calculateRecoveryScore(input: RecoveryScoreInput): ScoreResult {
  const hrv = hrvPart(input.hrvSdnnMs, input.hrvBaselineMs)
  const result = combineWeightedScores([
    {
      score: input.sleepScore.score,
      weight: RECOVERY_WEIGHTS.sleep,
      coverage: input.sleepScore.coverage,
      applicable: true,
      evidence: input.sleepScore.evidence,
    },
    restingHeartRatePart(
      input.restingHeartRateBpm,
      input.restingHeartRateBaselineBpm,
    ),
    hrv,
    recentLoadPart(input.workoutMinutesLast72h, input.consecutiveTrainingDays),
  ])

  if (result.score !== null && hrv.score === null)
    return { ...result, confidence: 'low' }
  return result
}

function restingHeartRatePart(
  observed: number | null,
  baseline: number | null,
): WeightedPart {
  if (!isFinitePositive(observed) || !isFinitePositive(baseline))
    return missingPart(RECOVERY_WEIGHTS.restingHeartRate)
  const difference = observed - baseline
  const score =
    difference <= 0
      ? 100
      : difference <= 5
        ? 100 - (difference / 5) * 30
        : clamp(70 - ((difference - 5) / 10) * 70)
  return {
    score,
    weight: RECOVERY_WEIGHTS.restingHeartRate,
    coverage: 1,
    applicable: true,
    evidence: [
      {
        metric: 'restingHeartRateDifference',
        observed: difference,
        target: 0,
        reason: '与个人静息心率中位基线比较，不使用人群阈值',
      },
    ],
  }
}

function hrvPart(
  observed: number | null,
  baseline: number | null,
): WeightedPart {
  if (!isFinitePositive(observed) || !isFinitePositive(baseline))
    return missingPart(RECOVERY_WEIGHTS.hrv)
  const ratio = observed / baseline
  const score =
    ratio >= 1
      ? 100
      : ratio >= 0.75
        ? 60 + ((ratio - 0.75) / 0.25) * 40
        : clamp((ratio / 0.75) * 60)
  return {
    score,
    weight: RECOVERY_WEIGHTS.hrv,
    coverage: 1,
    applicable: true,
    evidence: [
      {
        metric: 'hrvRatio',
        observed: `${Math.round(ratio * 100)}%`,
        target: '100% 个人中位基线',
        reason: '与个人 HRV 中位基线比较，不作医学判断',
      },
    ],
  }
}

function recentLoadPart(
  workoutMinutesLast72h: number | null,
  consecutiveTrainingDays: number | null,
): WeightedPart {
  if (
    !isFiniteNonNegative(workoutMinutesLast72h) ||
    !isFiniteNonNegative(consecutiveTrainingDays)
  )
    return missingPart(RECOVERY_WEIGHTS.recentLoad)
  const minutePenalty = Math.max(0, workoutMinutesLast72h - 90) / 3
  const dayPenalty = Math.max(0, consecutiveTrainingDays - 2) * 15
  return {
    score: clamp(100 - minutePenalty - dayPenalty),
    weight: RECOVERY_WEIGHTS.recentLoad,
    coverage: 1,
    applicable: true,
    evidence: [
      {
        metric: 'recentLoadProxy',
        observed: `${workoutMinutesLast72h} 分钟 / 连续 ${consecutiveTrainingDays} 天`,
        target: '仅回看此前 72 小时',
        reason: '训练分钟与连续训练天数只是简单负荷代理',
      },
    ],
  }
}

function missingPart(weight: number): WeightedPart {
  return {
    score: null,
    weight,
    coverage: 0,
    applicable: true,
    evidence: [],
  }
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, value))
}

function isFinitePositive(value: number | null): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
}

function isFiniteNonNegative(value: number | null): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}
