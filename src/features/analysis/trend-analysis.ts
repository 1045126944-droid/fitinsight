import type { TrendMetric, TrendResult } from '../../types/analysis'
import type { HealthSnapshot } from '../../types/storage'
import { addDays } from '../../utils/date-only'
import { mean } from './math'
import { calculatePersonalBaseline } from './personal-baseline'
import { calculateSleepScore } from './sleep-score'

export type BuildTrendInput = {
  snapshot: HealthSnapshot
  metric: TrendMetric
  range: 7 | 30 | 90
  endDate: string
  timeZone: string
}

export function buildTrend(input: BuildTrendInput): TrendResult {
  const currentStart = addDays(input.endDate, -(input.range - 1))
  const previousStart = addDays(currentStart, -input.range)
  const previousEnd = addDays(currentStart, -1)
  const points = valuesInRange(
    input.snapshot,
    input.metric,
    currentStart,
    input.endDate,
    input.timeZone,
  )
  const prior = valuesInRange(
    input.snapshot,
    input.metric,
    previousStart,
    previousEnd,
    input.timeZone,
  )
  const values = points.map((point) => point.value)
  const average = mean(values)
  const previousAverage = mean(prior.map((point) => point.value))
  return {
    points,
    average,
    minimum: values.length ? Math.min(...values) : null,
    maximum: values.length ? Math.max(...values) : null,
    previousPeriodChange:
      average === null || previousAverage === null || previousAverage === 0
        ? null
        : ((average - previousAverage) / previousAverage) * 100,
    dataPointCount: points.length,
  }
}

export function valuesInRange(
  snapshot: HealthSnapshot,
  metric: TrendMetric,
  start: string,
  end: string,
  timeZone: string,
): { date: string; value: number }[] {
  const baseline =
    metric === 'sleepScore'
      ? calculatePersonalBaseline({
          today: start,
          timeZone,
          dailyRecords: snapshot.dailyRecords,
          workouts: snapshot.workouts,
          coverage: snapshot.coverage,
        })
      : null
  const byDate = new Map<string, number>()
  for (const record of snapshot.dailyRecords) {
    if (record.date < start || record.date > end) continue
    const value = dailyValue(
      record,
      metric,
      baseline?.sleepMidpointMinutes.value ?? null,
    )
    if (value !== null) byDate.set(record.date, value)
  }
  if (metric === 'weightKg' || metric === 'bodyFatPercentage') {
    for (const measurement of snapshot.bodyMeasurements) {
      if (measurement.date < start || measurement.date > end) continue
      const value =
        metric === 'weightKg'
          ? measurement.weightKg
          : measurement.bodyFatPercentage
      if (isFiniteNumber(value)) byDate.set(measurement.date, value)
    }
  }
  if (metric === 'workoutCount' || metric === 'swimmingDistanceMeters') {
    for (let date = start; date <= end; date = addDays(date, 1)) {
      const workouts = snapshot.workouts.filter(
        (workout) => workout.localDate === date,
      )
      if (metric === 'workoutCount') {
        if (workouts.length > 0) byDate.set(date, workouts.length)
        else if (isCovered(snapshot, 'workouts', date)) byDate.set(date, 0)
      } else {
        const swims = workouts.filter((workout) => isSwim(workout.type))
        if (
          swims.length &&
          swims.every((workout) => isFiniteNumber(workout.distanceMeters))
        )
          byDate.set(
            date,
            swims.reduce((sum, workout) => sum + workout.distanceMeters!, 0),
          )
        else if (swims.length === 0 && isCovered(snapshot, 'workouts', date))
          byDate.set(date, 0)
      }
    }
  }
  return [...byDate.entries()]
    .map(([date, value]) => ({ date, value }))
    .sort((left, right) => left.date.localeCompare(right.date))
}

function dailyValue(
  record: HealthSnapshot['dailyRecords'][number],
  metric: TrendMetric,
  baselineSleepMidpointMinutes: number | null,
): number | null {
  if (metric === 'sleepMinutes')
    return finite(record.sleep?.totalMinutes ?? null)
  if (metric === 'sleepScore')
    return calculateSleepScore({
      sleep: record.sleep,
      baselineSleepMidpointMinutes,
    }).score
  if (
    metric === 'steps' ||
    metric === 'activeEnergyKcal' ||
    metric === 'exerciseMinutes' ||
    metric === 'restingHeartRateBpm' ||
    metric === 'hrvSdnnMs'
  )
    return finite(record[metric])
  return null
}

function isCovered(
  snapshot: HealthSnapshot,
  metric: string,
  date: string,
): boolean {
  return (snapshot.coverage[metric] ?? []).some(
    (range) => range.startDate <= date && range.endDate >= date,
  )
}

function finite(value: number | null): number | null {
  return isFiniteNumber(value) ? value : null
}

function isFiniteNumber(value: number | null): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isSwim(type: string): boolean {
  return type === 'poolSwimming' || type === 'openWaterSwimming'
}
