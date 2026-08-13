import type {
  ReviewCoverage,
  ReviewInsight,
  ReviewPeriod,
  WeeklyMetrics,
  WeeklyReview,
} from '../../types/analysis'
import type { PersonalGoals } from '../../types/profile'
import type { HealthSnapshot } from '../../types/storage'
import { addDays } from '../../utils/date-only'
import { classifyDay } from './day-classification'
import { mean } from './math'
import { calculatePersonalBaseline } from './personal-baseline'
import { selectWeek } from './periods'
import { calculateSleepScore } from './sleep-score'

export type WeeklyReviewInput = {
  snapshot: HealthSnapshot
  goals: PersonalGoals
  today: string
  timeZone: string
  weekStartsOn: 0 | 1 | 2 | 3 | 4 | 5 | 6
}

export function buildWeeklyReview(input: WeeklyReviewInput): WeeklyReview {
  const selection = selectWeek(input.today, input.weekStartsOn)
  const current = weeklyMetrics(input, selection.comparison.current)
  const previous = weeklyMetrics(input, selection.comparison.previous)
  const { highlight, gap, nextAction } = weeklyInsights(
    current.metrics,
    input.goals,
    selection.current,
    current.coverage,
  )
  return {
    ...current.metrics,
    period: 'week',
    startDate: selection.current.start,
    endDate: selection.current.end,
    periodStatus: selection.status,
    comparison: selection.comparison,
    previous: previous.metrics,
    deltas: weeklyDeltas(current.metrics, previous.metrics),
    coverage: current.coverage,
    previousCoverage: previous.coverage,
    highlight,
    gap,
    nextAction,
  }
}

type MetricsWithCoverage = { metrics: WeeklyMetrics; coverage: ReviewCoverage }

function weeklyMetrics(
  input: WeeklyReviewInput,
  period: ReviewPeriod,
): MetricsWithCoverage {
  const coverage = coverageFor(input.snapshot, period)
  const workouts = input.snapshot.workouts.filter((workout) =>
    inPeriod(workout.localDate, period),
  )
  const daily = input.snapshot.dailyRecords.filter((record) =>
    inPeriod(record.date, period),
  )
  const workoutReady = enough(coverage.workouts)
  const allDurationsKnown = workouts.every(
    (workout) => finite(workout.durationMinutes) !== null,
  )
  const swims = workouts.filter((workout) => isSwim(workout.type))
  const swimDistancesKnown = swims.every(
    (workout) => finite(workout.distanceMeters) !== null,
  )
  const sleepBaseline = calculatePersonalBaseline({
    today: period.start,
    timeZone: input.timeZone,
    dailyRecords: input.snapshot.dailyRecords,
    workouts: input.snapshot.workouts,
    coverage: input.snapshot.coverage,
  })
  const sleepScores = daily
    .map(
      (record) =>
        calculateSleepScore({
          sleep: record.sleep,
          baselineSleepMidpointMinutes:
            sleepBaseline.sleepMidpointMinutes.value,
        }).score,
    )
    .filter(isNumber)
  const applicableGoalKeys = [
    finite(input.goals.dailySteps) !== null ? 'steps' : null,
    validSleepGoalRange(input.goals) ? 'sleep' : null,
  ].filter((key): key is 'steps' | 'sleep' => key !== null)
  const goalCoverage =
    applicableGoalKeys.length === 0
      ? undefined
      : Math.min(...applicableGoalKeys.map((key) => coverage[key] ?? 0))
  const goalDays =
    applicableGoalKeys.length === 0 || !enough(goalCoverage)
      ? null
      : daily.filter((record) =>
          meetsDailyGoals(record, input.goals, applicableGoalKeys),
        ).length
  const coveredWorkoutDates = dates(period).filter((date) =>
    covered(input.snapshot, 'workouts', date),
  )
  const recoveryDays = workoutReady
    ? coveredWorkoutDates.filter((date) => {
        const classification = classifyDay({
          workouts: workouts.filter((workout) => workout.localDate === date),
          workoutsCovered: true,
        })
        return classification === 'activeRecovery' || classification === 'rest'
      }).length
    : null
  return {
    coverage,
    metrics: {
      workoutCount: workoutReady ? workouts.length : null,
      workoutDayCount: workoutReady
        ? new Set(workouts.map((workout) => workout.localDate)).size
        : null,
      workoutMinutes:
        workoutReady && allDurationsKnown
          ? sum(workouts.map((workout) => workout.durationMinutes!))
          : null,
      averageSteps: aggregate(
        daily.map((record) => record.steps),
        coverage.steps,
      ),
      activeEnergyKcal: aggregateSum(
        daily.map((record) => record.activeEnergyKcal),
        coverage.activeEnergyKcal,
      ),
      swimCount: workoutReady ? swims.length : null,
      swimDistanceMeters:
        workoutReady && swimDistancesKnown
          ? sum(swims.map((workout) => workout.distanceMeters!))
          : null,
      strengthCount: workoutReady
        ? workouts.filter((workout) => isStrength(workout.type)).length
        : null,
      averageSleepMinutes: aggregate(
        daily.map((record) => record.sleep?.totalMinutes ?? null),
        coverage.sleep,
      ),
      averageSleepScore: enough(coverage.sleep) ? mean(sleepScores) : null,
      averageRestingHeartRateBpm: aggregate(
        daily.map((record) => record.restingHeartRateBpm),
        coverage.restingHeartRateBpm,
      ),
      goalDays,
      recoveryDays,
    },
  }
}

function weeklyDeltas(
  current: WeeklyMetrics,
  previous: WeeklyMetrics,
): WeeklyMetrics {
  return Object.fromEntries(
    Object.keys(current).map((key) => [
      key,
      delta(
        current[key as keyof WeeklyMetrics],
        previous[key as keyof WeeklyMetrics],
      ),
    ]),
  ) as WeeklyMetrics
}

function weeklyInsights(
  metrics: WeeklyMetrics,
  goals: PersonalGoals,
  period: ReviewPeriod,
  coverage: ReviewCoverage,
): {
  highlight: ReviewInsight | null
  gap: ReviewInsight | null
  nextAction: ReviewInsight | null
} {
  const candidates: Array<{
    id: string
    observed: number | null
    target: number | null
    maximum?: number | null
    label: string
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
      target: scaledWeeklyGoal(
        goals.weeklyStrengthSessions,
        period,
        coverage.workouts,
      ),
      label: '力量训练',
    },
    {
      id: 'swimming',
      observed: metrics.swimCount,
      target: scaledWeeklyGoal(
        goals.weeklySwimmingSessions,
        period,
        coverage.workouts,
      ),
      label: '游泳训练',
    },
    {
      id: 'workout-days',
      observed: metrics.workoutDayCount,
      target: scaledWeeklyGoal(
        goals.weeklyWorkoutDays,
        period,
        coverage.workouts,
      ),
      label: '训练日',
    },
    {
      id: 'steps',
      observed: metrics.averageSteps,
      target: finite(goals.dailySteps),
      label: '日均步数',
    },
  ]
  const valid = candidates.filter(
    (candidate) =>
      candidate.observed !== null &&
      candidate.target !== null &&
      (candidate.id !== 'sleep' || validSleepGoalRange(goals)),
  )
  const reached = valid.find((candidate) =>
    candidate.id === 'sleep'
      ? candidate.observed! >= candidate.target! &&
        candidate.observed! <= candidate.maximum!
      : candidate.observed! >= candidate.target!,
  )
  const missed = valid.find((candidate) =>
    candidate.id === 'sleep'
      ? candidate.observed! < candidate.target! ||
        candidate.observed! > candidate.maximum!
      : candidate.observed! < candidate.target!,
  )
  const highlight = reached
    ? insight(
        `${reached.id}-met`,
        `${reached.label}达到个人设置目标。`,
        reached,
      )
    : null
  const gapItem =
    missed?.id === 'sleep' && missed.observed! > missed.maximum!
      ? { ...missed, target: missed.maximum ?? null }
      : missed
  const gap = gapItem
    ? insight(
        `${gapItem.id}-gap`,
        gapItem.id === 'sleep'
          ? gapItem.observed! > gapItem.target!
            ? `${gapItem.label}高于个人设置上限。`
            : `${gapItem.label}低于个人设置下限。`
          : `${gapItem.label}低于个人设置目标。`,
        gapItem,
      )
    : null
  const nextAction = gapItem
    ? insight(
        `${gapItem.id}-next`,
        `可温和地为${gapItem.label}安排一个可完成的小步骤。`,
        gapItem,
      )
    : null
  return { highlight, gap, nextAction }
}

function insight(
  id: string,
  text: string,
  item: { id: string; observed: number | null; target: number | null },
): ReviewInsight {
  return {
    id,
    text,
    evidence: [
      {
        metric: item.id,
        observed: item.observed,
        target: item.target,
        reason: '依据用户设置目标与有覆盖的数据比较',
      },
    ],
  }
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
  ] as const
  return Object.fromEntries(
    keys.map((key) => [
      key,
      dates(period).filter((date) => covered(snapshot, key, date)).length /
        dates(period).length,
    ]),
  )
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
function finite(value: number | null): number | null {
  return isNumber(value) ? value : null
}
function isNumber(value: number | null): value is number {
  return typeof value === 'number' && Number.isFinite(value)
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
  const known = values.filter(isNumber)
  return enough(coverage) && known.length ? sum(known) : null
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

function scaledWeeklyGoal(
  goal: number | null,
  period: ReviewPeriod,
  coverage: number | undefined,
): number | null {
  const valid = finite(goal)
  return valid === null || coverage === undefined
    ? null
    : (valid * dates(period).length * coverage) / 7
}

function meetsDailyGoals(
  record: HealthSnapshot['dailyRecords'][number],
  goals: PersonalGoals,
  keys: readonly ('steps' | 'sleep')[],
): boolean {
  return keys.every((key) => {
    if (key === 'steps')
      return finite(record.steps) !== null && record.steps! >= goals.dailySteps!
    const minutes = finite(record.sleep?.totalMinutes ?? null)
    return (
      minutes !== null &&
      minutes >= goals.sleepMinMinutes! &&
      minutes <= goals.sleepMaxMinutes!
    )
  })
}
