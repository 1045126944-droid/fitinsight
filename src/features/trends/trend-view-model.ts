import type { TrendMetric, TrendRange } from '../../types/analysis'
import type { HealthSnapshot } from '../../types/storage'
import { addDays } from '../../utils/date-only'
import { buildTrend } from '../analysis/trend-analysis'

export type TrendLoadInput = {
  snapshot: HealthSnapshot
  metric: TrendMetric
  range: TrendRange
  endDate: string
  timeZone: string
}

export type TrendPoint = { date: string; value: number | null }

export type TrendViewModel = {
  metric: TrendMetric
  metricLabel: string
  unit: string
  range: TrendRange
  startDate: string
  endDate: string
  points: TrendPoint[]
  summary: {
    average: number | null
    minimum: number | null
    maximum: number | null
    previousPeriodChange: number | null
    dataPointCount: number
  }
}

export type AsyncTrendState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; viewModel: TrendViewModel }

export const TREND_METRICS: readonly {
  id: TrendMetric
  label: string
  unit: string
  maximumFractionDigits: number
}[] = [
  { id: 'steps', label: '步数', unit: '步', maximumFractionDigits: 0 },
  {
    id: 'activeEnergyKcal',
    label: '活动能量',
    unit: '千卡',
    maximumFractionDigits: 0,
  },
  {
    id: 'exerciseMinutes',
    label: '锻炼时间',
    unit: '分钟',
    maximumFractionDigits: 0,
  },
  {
    id: 'sleepMinutes',
    label: '睡眠时长',
    unit: '分钟',
    maximumFractionDigits: 0,
  },
  { id: 'sleepScore', label: '睡眠评分', unit: '分', maximumFractionDigits: 0 },
  {
    id: 'restingHeartRateBpm',
    label: '静息心率',
    unit: '次/分',
    maximumFractionDigits: 0,
  },
  {
    id: 'hrvSdnnMs',
    label: '心率变异性',
    unit: '毫秒',
    maximumFractionDigits: 0,
  },
  { id: 'weightKg', label: '体重', unit: '千克', maximumFractionDigits: 1 },
  {
    id: 'bodyFatPercentage',
    label: '体脂率',
    unit: '%',
    maximumFractionDigits: 1,
  },
  {
    id: 'workoutCount',
    label: '训练次数',
    unit: '次',
    maximumFractionDigits: 1,
  },
  {
    id: 'swimmingDistanceMeters',
    label: '游泳距离',
    unit: '米',
    maximumFractionDigits: 0,
  },
]

export function buildTrendViewModel(input: TrendLoadInput): TrendViewModel {
  const result = buildTrend(input)
  const startDate = addDays(input.endDate, -(input.range - 1))
  const values = new Map(
    result.points.map((point) => [point.date, point.value]),
  )
  const points: TrendPoint[] = []
  for (let date = startDate; date <= input.endDate; date = addDays(date, 1)) {
    points.push({ date, value: values.get(date) ?? null })
  }
  const metric = metricDefinition(input.metric)
  return {
    metric: input.metric,
    metricLabel: metric.label,
    unit: metric.unit,
    range: input.range,
    startDate,
    endDate: input.endDate,
    points,
    summary: {
      average: result.average,
      minimum: result.minimum,
      maximum: result.maximum,
      previousPeriodChange: result.previousPeriodChange,
      dataPointCount: result.dataPointCount,
    },
  }
}

export function formatTrendValue(
  viewModel: Pick<TrendViewModel, 'metric' | 'unit'>,
  value: number,
): string {
  const metric = metricDefinition(viewModel.metric)
  const formatted = new Intl.NumberFormat('zh-CN', {
    maximumFractionDigits: metric.maximumFractionDigits,
  }).format(value)
  return viewModel.unit === '%'
    ? `${formatted}%`
    : `${formatted} ${viewModel.unit}`
}

function metricDefinition(metric: TrendMetric) {
  return TREND_METRICS.find((candidate) => candidate.id === metric)!
}
