import type { SleepRecord } from '../../types/health-data'
import type { EvidenceItem, ScoreResult } from '../../types/analysis'
import { combineWeightedScores, type WeightedPart } from './score-utils'

export const SLEEP_WEIGHTS = {
  duration: 0.4,
  regularity: 0.2,
  efficiency: 0.2,
  awake: 0.1,
  stageCompleteness: 0.1,
} as const

export type SleepScoreInput = {
  sleep: SleepRecord | null
  baselineSleepMidpointMinutes: number | null
}

export function calculateSleepScore(input: SleepScoreInput): ScoreResult {
  const sleep = input.sleep
  if (!sleep) return unavailable()

  const intervalMinutes = sleepIntervalMinutes(sleep)
  return combineWeightedScores([
    part(
      durationScore(sleep.totalMinutes),
      SLEEP_WEIGHTS.duration,
      evidence(
        'sleepDuration',
        sleep.totalMinutes,
        '420–540 分钟',
        '按当晚总睡眠时长评估',
      ),
    ),
    part(
      regularityScore(sleep, input.baselineSleepMidpointMinutes),
      SLEEP_WEIGHTS.regularity,
      evidence(
        'sleepRegularity',
        sleepMidpointMinutes(sleep),
        input.baselineSleepMidpointMinutes,
        '与已建立的 14 天个人睡眠中点比较',
      ),
    ),
    efficiencyPart(sleep, intervalMinutes),
    part(
      awakeScore(sleep.awakeMinutes, intervalMinutes),
      SLEEP_WEIGHTS.awake,
      evidence(
        'sleepAwake',
        sleep.awakeMinutes,
        intervalMinutes,
        '清醒时间只用于描述睡眠连续性',
      ),
    ),
    stageCompletenessPart(sleep),
  ])
}

function durationScore(minutes: number | null): number | null {
  if (!isFiniteNonNegative(minutes)) return null
  if (minutes < 300) return clamp(40 + (minutes - 300) * 0.5)
  if (minutes < 360) return 40 + ((minutes - 300) / 60) * 30
  if (minutes < 420) return 70 + ((minutes - 360) / 60) * 30
  if (minutes <= 540) return 100
  return Math.max(80, 100 - (minutes - 540) / 30)
}

function regularityScore(
  sleep: SleepRecord,
  baseline: number | null,
): number | null {
  const midpoint = sleepMidpointMinutes(sleep)
  if (!isFiniteNonNegative(midpoint) || !isFiniteNonNegative(baseline))
    return null
  const directDifference = Math.abs(midpoint - baseline)
  const difference = Math.min(directDifference, 1_440 - directDifference)
  if (difference <= 30) return 100
  return clamp(100 - ((difference - 30) / 150) * 100)
}

function efficiencyPart(
  sleep: SleepRecord,
  explicitIntervalMinutes: number | null,
): WeightedPart {
  const inferredInterval =
    isFiniteNonNegative(sleep.totalMinutes) &&
    isFiniteNonNegative(sleep.awakeMinutes)
      ? sleep.totalMinutes + sleep.awakeMinutes
      : null
  const interval = explicitIntervalMinutes ?? inferredInterval
  const score = efficiencyScore(sleep.totalMinutes, interval)
  return {
    score,
    weight: SLEEP_WEIGHTS.efficiency,
    coverage: score === null ? 0 : explicitIntervalMinutes === null ? 0.5 : 1,
    applicable: true,
    evidence:
      score === null
        ? []
        : [
            {
              metric: 'sleepEfficiency',
              observed:
                interval === null || sleep.totalMinutes === null
                  ? null
                  : `${Math.round((sleep.totalMinutes / interval) * 100)}%`,
              target: '≥90%',
              reason:
                explicitIntervalMinutes === null
                  ? '缺少明确卧床区间，按睡眠与清醒分钟估算，置信度较低'
                  : '按睡眠分钟除以开始至结束区间计算',
            },
          ],
  }
}

function efficiencyScore(
  asleepMinutes: number | null,
  intervalMinutes: number | null,
): number | null {
  if (
    !isFiniteNonNegative(asleepMinutes) ||
    !isFinitePositive(intervalMinutes) ||
    asleepMinutes > intervalMinutes
  )
    return null
  const ratio = asleepMinutes / intervalMinutes
  if (ratio >= 0.9) return 100
  if (ratio >= 0.85) return 90 + ((ratio - 0.85) / 0.05) * 10
  if (ratio >= 0.75) return 70 + ((ratio - 0.75) / 0.1) * 20
  return clamp((ratio / 0.75) * 70)
}

function awakeScore(
  awakeMinutes: number | null,
  intervalMinutes: number | null,
): number | null {
  if (
    !isFiniteNonNegative(awakeMinutes) ||
    !isFinitePositive(intervalMinutes) ||
    awakeMinutes > intervalMinutes
  )
    return null
  const ratio = awakeMinutes / intervalMinutes
  if (ratio <= 0.1) return 100
  if (ratio >= 0.4) return 0
  return 100 - ((ratio - 0.1) / 0.3) * 100
}

function stageCompletenessPart(sleep: SleepRecord): WeightedPart {
  const stages = [sleep.coreMinutes, sleep.deepMinutes, sleep.remMinutes]
  const validStages = stages.filter(isFiniteNonNegative)
  if (
    validStages.length !== stages.length ||
    !isFinitePositive(sleep.totalMinutes)
  )
    return {
      score: null,
      weight: SLEEP_WEIGHTS.stageCompleteness,
      coverage: 0,
      applicable: true,
      evidence: [],
    }
  const stageMinutes = validStages.reduce((sum, minutes) => sum + minutes, 0)
  const consistency =
    1 - Math.abs(stageMinutes - sleep.totalMinutes) / sleep.totalMinutes
  return {
    score: clamp(consistency * 100),
    weight: SLEEP_WEIGHTS.stageCompleteness,
    coverage: 1,
    applicable: true,
    evidence: [
      {
        metric: 'sleepStageCompleteness',
        observed: `3/3 stages; ${stageMinutes}/${sleep.totalMinutes} minutes`,
        target: '阶段分钟与总睡眠分钟一致',
        reason: '只检查阶段数据是否齐全及分钟数是否内部一致，不评价阶段比例',
      },
    ],
  }
}

function part(
  score: number | null,
  weight: number,
  item: EvidenceItem,
): WeightedPart {
  return {
    score,
    weight,
    coverage: score === null ? 0 : 1,
    applicable: true,
    evidence: score === null ? [] : [item],
  }
}

function evidence(
  metric: string,
  observed: number | string | null,
  target: number | string | null,
  reason: string,
): EvidenceItem {
  return { metric, observed, target, reason }
}

function sleepIntervalMinutes(sleep: SleepRecord): number | null {
  if (!sleep.start || !sleep.end) return null
  const start = new Date(sleep.start).getTime()
  const end = new Date(sleep.end).getTime()
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start)
    return null
  return (end - start) / 60_000
}

function sleepMidpointMinutes(sleep: SleepRecord): number | null {
  if (!sleep.start || !sleep.end) return null
  const start = new Date(sleep.start).getTime()
  const end = new Date(sleep.end).getTime()
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start)
    return null
  const midpoint = new Date(start + (end - start) / 2)
  const offset = isoOffsetMinutes(sleep.start)
  const localMidpoint = new Date(midpoint.getTime() + offset * 60_000)
  return localMidpoint.getUTCHours() * 60 + localMidpoint.getUTCMinutes()
}

function isoOffsetMinutes(value: string): number {
  if (value.endsWith('Z')) return 0
  const match = value.match(/([+-])(\d{2}):(\d{2})$/)
  if (!match) return 0
  const direction = match[1] === '-' ? -1 : 1
  return direction * (Number(match[2]) * 60 + Number(match[3]))
}

function unavailable(): ScoreResult {
  return { score: null, coverage: 0, confidence: 'building', evidence: [] }
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, value))
}

function isFiniteNonNegative(value: number | null): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

function isFinitePositive(value: number | null): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
}
