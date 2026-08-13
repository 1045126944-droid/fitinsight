import type {
  MonthlyMetrics,
  MonthlyReview,
  ReviewCoverage,
  ReviewInsight,
  ReviewPeriod,
} from '../../types/analysis'
import type { PersonalGoals } from '../../types/profile'
import type { HealthSnapshot } from '../../types/storage'
import { addDays } from '../../utils/date-only'
import { mean } from './math'
import { selectMonth } from './periods'
import { estimateWeightChangePerWeek } from './weight-trend'

export type MonthlyReviewInput = {
  snapshot: HealthSnapshot
  goals: PersonalGoals
  today: string
  timeZone: string
}

export function buildMonthlyReview(input: MonthlyReviewInput): MonthlyReview {
  const selection = selectMonth(input.today)
  const current = monthlyMetrics(input.snapshot, selection.current)
  const comparisonCurrent = monthlyMetrics(
    input.snapshot,
    selection.comparison.current,
  )
  const previous = monthlyMetrics(input.snapshot, selection.comparison.previous)
  const weightTrend = estimateWeightChangePerWeek(
    input.snapshot.bodyMeasurements.filter(
      (measurement) => measurement.date <= selection.current.end,
    ),
  )
  const { highlight, gap, nextAction } = monthlyInsights(
    current.metrics,
    input.goals,
    weightTrend.kgPerWeek,
    selection.current,
  )
  return {
    ...current.metrics,
    period: 'month',
    startDate: selection.current.start,
    endDate: selection.current.end,
    periodStatus: selection.status,
    comparison: selection.comparison,
    previous: previous.metrics,
    comparisonCurrent: comparisonCurrent.metrics,
    deltas: monthlyDeltas(comparisonCurrent.metrics, previous.metrics),
    coverage: current.coverage,
    previousCoverage: previous.coverage,
    weightTrend,
    highlight,
    gap,
    nextAction,
    summary: weightSummary(
      weightTrend.kgPerWeek,
      input.goals.targetWeeklyWeightLossKg,
    ),
  }
}

type MetricsWithCoverage = { metrics: MonthlyMetrics; coverage: ReviewCoverage }

function monthlyMetrics(
  snapshot: HealthSnapshot,
  period: ReviewPeriod,
): MetricsWithCoverage {
  const coverage = coverageFor(snapshot, period)
  const daily = snapshot.dailyRecords.filter((record) =>
    inPeriod(record.date, period),
  )
  const workouts = snapshot.workouts.filter((workout) =>
    inPeriod(workout.localDate, period),
  )
  const measurements = snapshot.bodyMeasurements.filter((measurement) =>
    inPeriod(measurement.date, period),
  )
  const workoutReady = enough(coverage.workouts)
  const swims = workouts.filter((workout) => isSwim(workout.type))
  return {
    coverage,
    metrics: {
      workoutCount: workoutReady ? workouts.length : null,
      workoutDayCount: workoutReady
        ? new Set(workouts.map((workout) => workout.localDate)).size
        : null,
      workoutMinutes:
        workoutReady &&
        workouts.every((workout) => isNumber(workout.durationMinutes))
          ? sum(workouts.map((workout) => workout.durationMinutes!))
          : null,
      activeEnergyKcal: aggregateSum(
        daily.map((record) => record.activeEnergyKcal),
        coverage.activeEnergyKcal,
      ),
      averageSteps: aggregate(
        daily.map((record) => record.steps),
        coverage.steps,
      ),
      averageSleepMinutes: aggregate(
        daily.map((record) => record.sleep?.totalMinutes ?? null),
        coverage.sleep,
      ),
      swimCount: workoutReady ? swims.length : null,
      swimDistanceMeters:
        workoutReady &&
        swims.every((workout) => isNumber(workout.distanceMeters))
          ? sum(swims.map((workout) => workout.distanceMeters!))
          : null,
      strengthCount: workoutReady
        ? workouts.filter((workout) => isStrength(workout.type)).length
        : null,
      weightChangeKg: measurementChange(
        measurements.map((measurement) => measurement.weightKg),
      ),
      bodyFatChangePercentagePoints: measurementChange(
        measurements.map((measurement) => measurement.bodyFatPercentage),
      ),
      waistChangeCm: measurementChange(
        measurements.map((measurement) => measurement.waistCm),
      ),
      averageRestingHeartRateBpm: aggregate(
        daily.map((record) => record.restingHeartRateBpm),
        coverage.restingHeartRateBpm,
      ),
    },
  }
}

function monthlyDeltas(
  current: MonthlyMetrics,
  previous: MonthlyMetrics,
): MonthlyMetrics {
  return Object.fromEntries(
    Object.keys(current).map((key) => [
      key,
      delta(
        current[key as keyof MonthlyMetrics],
        previous[key as keyof MonthlyMetrics],
      ),
    ]),
  ) as MonthlyMetrics
}

function monthlyInsights(
  metrics: MonthlyMetrics,
  goals: PersonalGoals,
  kgPerWeek: number | null,
  period: ReviewPeriod,
): {
  highlight: ReviewInsight | null
  gap: ReviewInsight | null
  nextAction: ReviewInsight | null
} {
  const candidates: Array<{
    id: string
    observed: number | null
    target: number | null
    targetLabel?: string | null
    maximum?: number | null
    label: string
    reason?: string
  }> = [
    {
      id: 'sleep',
      observed: metrics.averageSleepMinutes,
      target: finite(goals.sleepMinMinutes),
      maximum: finite(goals.sleepMaxMinutes),
      label: '睡眠时长',
    },
    {
      id: 'strength',
      observed: metrics.strengthCount,
      target: scaledWeeklyGoal(goals.weeklyStrengthSessions, period),
      label: '力量训练',
    },
    {
      id: 'swimming',
      observed: metrics.swimCount,
      target: scaledWeeklyGoal(goals.weeklySwimmingSessions, period),
      label: '游泳训练',
    },
    {
      id: 'workout-days',
      observed: metrics.workoutDayCount,
      target: scaledWeeklyGoal(goals.weeklyWorkoutDays, period),
      label: '训练日',
    },
    {
      id: 'steps',
      observed: metrics.averageSteps,
      target: finite(goals.dailySteps),
      label: '日均步数',
    },
    {
      id: 'weight-pace',
      observed: kgPerWeek === null ? null : -kgPerWeek,
      target: weightRangeMaximum(goals.targetWeeklyWeightLossKg),
      targetLabel: weightRangeLabel(goals.targetWeeklyWeightLossKg),
      label: '体重变化速度',
      reason: weightEvidenceReason(kgPerWeek),
    },
  ]
  const valid = candidates.filter(
    (candidate) =>
      candidate.observed !== null &&
      candidate.target !== null &&
      (candidate.id !== 'sleep' || validSleepGoalRange(goals)),
  )
  const reached = valid.find((candidate) =>
    candidate.id === 'weight-pace'
      ? withinWeightRange(kgPerWeek, goals.targetWeeklyWeightLossKg)
      : candidate.id === 'sleep'
        ? candidate.observed! >= candidate.target! &&
          candidate.observed! <= candidate.maximum!
        : candidate.observed! >= candidate.target!,
  )
  const missed = valid.find((candidate) =>
    candidate.id === 'weight-pace'
      ? !withinWeightRange(kgPerWeek, goals.targetWeeklyWeightLossKg)
      : candidate.id === 'sleep'
        ? candidate.observed! < candidate.target! ||
          candidate.observed! > candidate.maximum!
        : candidate.observed! < candidate.target!,
  )
  const highlight = reached
    ? insight(
        `${reached.id}-met`,
        `${reached.label}与个人设置目标相符。`,
        reached,
      )
    : null
  const gap = missed
    ? insight(
        `${missed.id}-gap`,
        `${missed.label}与个人设置目标仍有差距。`,
        missed,
      )
    : null
  const nextAction = missed
    ? insight(
        `${missed.id}-next`,
        `可温和地为${missed.label}安排一个可完成的小步骤。`,
        missed,
      )
    : null
  return { highlight, gap, nextAction }
}

function weightSummary(
  kgPerWeek: number | null,
  target: [number, number] | null,
): string | null {
  if (kgPerWeek === null || !validWeightLossRange(target)) return null
  if (Math.abs(kgPerWeek) < 1e-9)
    return '近期体重趋势基本持平，未进入个人设置的每周减重范围。'
  if (kgPerWeek > 0)
    return `近期体重趋势为每周增加 ${formatPace(kgPerWeek)} 公斤，与个人设置的减重范围方向不同。`
  const lossKgPerWeek = -kgPerWeek
  if (lossKgPerWeek > target[1]) return '近期每周减重幅度较个人设置范围更快。'
  if (lossKgPerWeek < target[0]) return '近期每周减重幅度较个人设置范围更慢。'
  return '近期每周减重幅度与个人设置范围相符。'
}

function coverageFor(
  snapshot: HealthSnapshot,
  period: ReviewPeriod,
): ReviewCoverage {
  const keys = [
    'steps',
    'activeEnergyKcal',
    'exerciseMinutes',
    'standHours',
    'walkingRunningDistanceKm',
    'restingHeartRateBpm',
    'hrvSdnnMs',
    'sleep',
    'workouts',
    'weightKg',
    'bodyFatPercentage',
    'skeletalMuscleMassKg',
    'waistCm',
  ] as const
  const periodDates = dates(period)
  return Object.fromEntries(
    keys.map((key) => [
      key,
      periodDates.filter((date) => covered(snapshot, key, date)).length /
        periodDates.length,
    ]),
  )
}

function measurementChange(values: readonly (number | null)[]): number | null {
  const valid = values.filter(isNumber)
  return valid.length < 2 ? null : valid.at(-1)! - valid[0]!
}
function dates(period: ReviewPeriod): string[] {
  const result: string[] = []
  for (let date = period.start; date <= period.end; date = addDays(date, 1))
    result.push(date)
  return result
}
function covered(snapshot: HealthSnapshot, key: string, date: string): boolean {
  return (snapshot.coverage[key] ?? []).some(
    (range) => range.startDate <= date && range.endDate >= date,
  )
}
function inPeriod(date: string, period: ReviewPeriod): boolean {
  return date >= period.start && date <= period.end
}
function enough(coverage: number | undefined): boolean {
  return coverage !== undefined && coverage >= 0.6
}
function isNumber(value: number | null): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}
function finite(value: number | null): number | null {
  return isNumber(value) ? value : null
}
function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0)
}
function aggregate(
  values: readonly (number | null)[],
  coverage: number | undefined,
): number | null {
  return enough(coverage) ? mean(values.filter(isNumber)) : null
}
function aggregateSum(
  values: readonly (number | null)[],
  coverage: number | undefined,
): number | null {
  const valid = values.filter(isNumber)
  return enough(coverage) && valid.length ? sum(valid) : null
}
function delta(current: number | null, previous: number | null): number | null {
  return current === null || previous === null ? null : current - previous
}
function isSwim(type: string): boolean {
  return type === 'poolSwimming' || type === 'openWaterSwimming'
}
function isStrength(type: string): boolean {
  return type === 'traditionalStrength' || type === 'functionalStrength'
}
function validSleepGoalRange(goals: PersonalGoals): boolean {
  return (
    finite(goals.sleepMinMinutes) !== null &&
    finite(goals.sleepMaxMinutes) !== null &&
    goals.sleepMinMinutes! <= goals.sleepMaxMinutes!
  )
}
function withinWeightRange(
  kgPerWeek: number | null,
  range: [number, number] | null,
): boolean {
  if (kgPerWeek === null || kgPerWeek >= 0 || !validWeightLossRange(range))
    return false
  const lossKgPerWeek = -kgPerWeek
  return lossKgPerWeek >= range[0] && lossKgPerWeek <= range[1]
}
function insight(
  id: string,
  text: string,
  item: {
    id: string
    observed: number | null
    target: number | string | null
    targetLabel?: string | null
    reason?: string
  },
): ReviewInsight {
  return {
    id,
    text,
    evidence: [
      {
        metric: item.id,
        observed: item.observed,
        target: item.targetLabel ?? item.target,
        reason: item.reason ?? '依据用户设置目标与有覆盖的数据比较',
      },
    ],
  }
}

function scaledWeeklyGoal(
  goal: number | null,
  period: ReviewPeriod,
): number | null {
  const valid = finite(goal)
  return valid === null ? null : (valid * dates(period).length) / 7
}

function validWeightLossRange(
  range: [number, number] | null,
): range is [number, number] {
  return (
    range !== null &&
    range.every((value) => Number.isFinite(value) && value >= 0) &&
    range[0] <= range[1]
  )
}

function weightRangeLabel(range: [number, number] | null): string | null {
  return validWeightLossRange(range)
    ? `${range[0]}–${range[1]} 公斤/周减重`
    : null
}

function weightRangeMaximum(range: [number, number] | null): number | null {
  return validWeightLossRange(range) ? range[1] : null
}

function weightEvidenceReason(kgPerWeek: number | null): string {
  if (kgPerWeek === null) return '体重趋势证据不足'
  if (Math.abs(kgPerWeek) < 1e-9)
    return '回归趋势基本持平，与用户设置的非负每周减重范围比较'
  if (kgPerWeek > 0) return '回归趋势为体重增加，与用户设置的减重目标方向不同'
  return '将有符号的回归斜率取反，换算为正的每周减重幅度后与用户设置范围比较'
}

function formatPace(value: number): string {
  return new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 2 }).format(
    value,
  )
}
