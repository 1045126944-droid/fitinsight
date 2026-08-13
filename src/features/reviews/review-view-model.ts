import type { MonthlyReview, WeeklyReview } from '../../types/analysis'

export type ReviewMetricDisplay = {
  id: string
  label: string
  current: string | null
  previous: string | null
  change: string | null
  unit: string | null
}

export type ReviewViewModel = {
  exportVersion: '1.0.0'
  period: 'week' | 'month'
  startDate: string
  endDate: string
  periodStatus: 'complete' | 'inProgress' | 'insufficient'
  comparisonCaption: string
  metrics: ReviewMetricDisplay[]
  highlights: string[]
  gaps: string[]
  nextAction: string | null
}

type MetricDefinition = {
  id: string
  label: string
  unit: string
  digits?: number
}

const WEEKLY_METRICS: readonly MetricDefinition[] = [
  { id: 'workoutCount', label: '训练次数', unit: '次' },
  { id: 'workoutDayCount', label: '训练日', unit: '天' },
  { id: 'workoutMinutes', label: '训练时长', unit: '分钟' },
  { id: 'averageSteps', label: '日均步数', unit: '步' },
  { id: 'activeEnergyKcal', label: '活动能量', unit: '千卡' },
  { id: 'swimCount', label: '游泳次数', unit: '次' },
  { id: 'swimDistanceMeters', label: '游泳距离', unit: '米' },
  { id: 'strengthCount', label: '力量训练', unit: '次' },
  { id: 'averageSleepMinutes', label: '平均睡眠', unit: '分钟' },
  { id: 'averageSleepScore', label: '平均睡眠评分', unit: '分', digits: 1 },
  { id: 'averageRestingHeartRateBpm', label: '平均静息心率', unit: '次/分' },
  { id: 'goalDays', label: '达标天数', unit: '天' },
  { id: 'recoveryDays', label: '恢复与休息天数', unit: '天' },
]

const MONTHLY_METRICS: readonly MetricDefinition[] = [
  { id: 'workoutCount', label: '训练次数', unit: '次' },
  { id: 'workoutDayCount', label: '训练日', unit: '天' },
  { id: 'workoutMinutes', label: '训练时长', unit: '分钟' },
  { id: 'activeEnergyKcal', label: '活动能量', unit: '千卡' },
  { id: 'averageSteps', label: '日均步数', unit: '步' },
  { id: 'averageSleepMinutes', label: '平均睡眠', unit: '分钟' },
  { id: 'swimCount', label: '游泳次数', unit: '次' },
  { id: 'swimDistanceMeters', label: '游泳距离', unit: '米' },
  { id: 'strengthCount', label: '力量训练', unit: '次' },
  { id: 'weightChangeKg', label: '体重变化', unit: '千克', digits: 1 },
  {
    id: 'bodyFatChangePercentagePoints',
    label: '体脂变化',
    unit: '百分点',
    digits: 1,
  },
  { id: 'waistChangeCm', label: '腰围变化', unit: '厘米', digits: 1 },
  { id: 'averageRestingHeartRateBpm', label: '平均静息心率', unit: '次/分' },
]

export function buildReviewViewModel(
  review: WeeklyReview | MonthlyReview,
): ReviewViewModel {
  const metrics =
    review.period === 'month'
      ? buildMetrics(
          MONTHLY_METRICS,
          review.periodStatus === 'inProgress'
            ? review.comparisonCurrent
            : review,
          review.previous,
          review.deltas,
        )
      : buildMetrics(WEEKLY_METRICS, review, review.previous, review.deltas)
  const highlights = compactInsights([
    review.highlight?.text,
    review.period === 'month' ? review.summary : null,
  ])
  const gaps = compactInsights([review.gap?.text])
  const nextAction = review.nextAction?.text ?? null

  return {
    exportVersion: '1.0.0',
    period: review.period,
    startDate: review.startDate,
    endDate: review.endDate,
    periodStatus: statusFor(review, metrics, highlights, gaps, nextAction),
    comparisonCaption: comparisonCaption(review),
    metrics,
    highlights,
    gaps,
    nextAction,
  }
}

function buildMetrics(
  definitions: readonly MetricDefinition[],
  current: object,
  previous: object,
  deltas: object,
): ReviewMetricDisplay[] {
  const currentValues = current as Record<string, number | null>
  const previousValues = previous as Record<string, number | null>
  const deltaValues = deltas as Record<string, number | null>
  return definitions.flatMap((definition) => {
    const value = currentValues[definition.id] ?? null
    if (value === null) return []
    return [
      {
        id: String(definition.id),
        label: definition.label,
        current: formatNumber(value, definition.digits),
        previous: formatNullable(
          previousValues[definition.id] ?? null,
          definition.digits,
        ),
        change: formatChange(
          deltaValues[definition.id] ?? null,
          definition.digits,
        ),
        unit: definition.unit,
      },
    ]
  })
}

function comparisonCaption(review: WeeklyReview | MonthlyReview): string {
  if (review.comparison.basis === 'equalElapsedDays') {
    return review.period === 'month'
      ? '与上月相同已过天数比较'
      : '与上周相同已过天数比较'
  }
  return review.period === 'month' ? '与上月比较' : '与上周比较'
}

function statusFor(
  review: WeeklyReview | MonthlyReview,
  metrics: readonly ReviewMetricDisplay[],
  highlights: readonly string[],
  gaps: readonly string[],
  nextAction: string | null,
): ReviewViewModel['periodStatus'] {
  if (
    metrics.length === 0 &&
    highlights.length === 0 &&
    gaps.length === 0 &&
    nextAction === null
  ) {
    return 'insufficient'
  }
  return review.periodStatus
}

function compactInsights(
  values: readonly (string | null | undefined)[],
): string[] {
  return values.filter(
    (value): value is string => value !== null && value !== undefined,
  )
}

function formatNullable(value: number | null, digits?: number): string | null {
  return value === null ? null : formatNumber(value, digits)
}

function formatChange(value: number | null, digits?: number): string | null {
  if (value === null) return null
  return `${value > 0 ? '+' : ''}${formatNumber(value, digits)}`
}

function formatNumber(value: number, digits = 0): string {
  return new Intl.NumberFormat('zh-CN', {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(value)
}
