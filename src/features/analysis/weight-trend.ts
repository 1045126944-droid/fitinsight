import type { WeightTrend } from '../../types/analysis'
import type { BodyMeasurement } from '../../types/health-data'
import { differenceInCalendarDays } from '../../utils/date-only'

export function estimateWeightChangePerWeek(
  measurements: readonly BodyMeasurement[],
): WeightTrend {
  const points = measurements
    .filter((measurement) => isFiniteNumber(measurement.weightKg))
    .map((measurement) => ({
      date: measurement.date,
      value: measurement.weightKg as number,
    }))
    .sort((left, right) => left.date.localeCompare(right.date))
  const pointCount = points.length
  const spanDays =
    pointCount < 2
      ? 0
      : differenceInCalendarDays(points.at(-1)!.date, points[0]!.date)
  if (pointCount < 6 || spanDays < 14)
    return { kgPerWeek: null, confidence: 'building', pointCount, spanDays }

  const firstDate = points[0]!.date
  const xs = points.map((point) =>
    differenceInCalendarDays(point.date, firstDate),
  )
  const meanX = xs.reduce((sum, value) => sum + value, 0) / pointCount
  const meanY = points.reduce((sum, point) => sum + point.value, 0) / pointCount
  const denominator = xs.reduce((sum, value) => sum + (value - meanX) ** 2, 0)
  const numerator = points.reduce(
    (sum, point, index) => sum + (xs[index]! - meanX) * (point.value - meanY),
    0,
  )
  const kgPerWeek = denominator === 0 ? null : (numerator / denominator) * 7
  return {
    kgPerWeek,
    confidence: spanDays >= 21 ? 'high' : 'medium',
    pointCount,
    spanDays,
  }
}

function isFiniteNumber(value: number | null): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}
