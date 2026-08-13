import type { TrendViewModel } from './trend-view-model'

type TrendPoint = TrendViewModel['points'][number]

export function trendYAxisWidth(points: readonly TrendPoint[]): number {
  const largest = points.reduce(
    (current, point) =>
      point.value === null ? current : Math.max(current, Math.abs(point.value)),
    0,
  )
  return largest >= 10_000 ? 52 : 44
}
