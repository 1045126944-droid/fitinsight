import type {
  CoverageMetricKey,
  DailyRecord,
  HeartRateSample,
  Workout,
} from './health-data'
import type { UserProfile } from './profile'
import type { CoverageRange } from './storage'

export type BaselineMetric = {
  value: number | null
  sampleCount: number
  status: 'building' | 'ready'
}

export type PersonalBaseline = {
  restingHeartRate: BaselineMetric
  hrv: BaselineMetric
  sleepMinutes: BaselineMetric
  sleepMidpointMinutes: BaselineMetric
  steps: BaselineMetric
  workoutCount28d: BaselineMetric
  workoutMinutes28d: BaselineMetric
}

export type PersonalBaselineInput = {
  today: string
  timeZone: string
  dailyRecords: readonly DailyRecord[]
  workouts: readonly Workout[]
  coverage?: Readonly<Partial<Record<string, readonly CoverageRange[]>>>
}

export type HeartRateZoneSummary = {
  zone: 1 | 2 | 3 | 4 | 5
  minimumBpm: number
  maximumBpm: number
  sampleCount: number
  durationSeconds: number
}

export type HeartRateZoneInput = readonly HeartRateSample[] | null
export type MaximumHeartRateProfile = Pick<
  UserProfile,
  'birthDate' | 'ageAsOf' | 'maximumHeartRateBpm'
>

export type Confidence = 'building' | 'low' | 'medium' | 'high'

export type EvidenceItem = {
  metric: string
  observed: number | string | null
  target: number | string | null
  reason: string
}

export type ScoreResult = {
  score: number | null
  coverage: number
  confidence: Confidence
  evidence: EvidenceItem[]
}

export type Recommendation = {
  id: string
  priority: 1 | 2 | 3
  title: string
  reason: string
  confidence: Confidence
  evidence: EvidenceItem[]
}

export type DayClassification =
  'training' | 'activeRecovery' | 'rest' | 'insufficientData'

export type DailyAnalysisInput = {
  dayType: DayClassification
  plannedRestDay: boolean
  activityScore: ScoreResult
  workoutScore: ScoreResult
  sleepScore: ScoreResult
  recoveryScore: ScoreResult
  weeklyStructureScore: ScoreResult
}

export type DailyAnalysis = {
  classification: DayClassification
  score: ScoreResult
  status:
    | '状态很好'
    | '基本达标'
    | '部分不足'
    | '明显不足'
    | '活动或恢复不足'
    | '数据不足'
}

export type TrendRange = 7 | 30 | 90
export type TrendMetric =
  | 'steps'
  | 'activeEnergyKcal'
  | 'exerciseMinutes'
  | 'sleepMinutes'
  | 'sleepScore'
  | 'restingHeartRateBpm'
  | 'hrvSdnnMs'
  | 'weightKg'
  | 'bodyFatPercentage'
  | 'workoutCount'
  | 'swimmingDistanceMeters'

export type TrendResult = {
  points: { date: string; value: number }[]
  average: number | null
  minimum: number | null
  maximum: number | null
  previousPeriodChange: number | null
  dataPointCount: number
}

export type ReviewPeriod = { start: string; end: string }
export type ReviewComparison = {
  basis: 'fullPeriod' | 'equalElapsedDays'
  current: ReviewPeriod
  previous: ReviewPeriod
}
export type ReviewInsight = {
  id: string
  text: string
  evidence: EvidenceItem[]
}
export type { CoverageMetricKey } from './health-data'
export type ReviewCoverage = Readonly<
  Partial<Record<CoverageMetricKey, number>>
>

export type WeeklyMetrics = {
  workoutCount: number | null
  workoutDayCount: number | null
  workoutMinutes: number | null
  averageSteps: number | null
  activeEnergyKcal: number | null
  swimCount: number | null
  swimDistanceMeters: number | null
  strengthCount: number | null
  averageSleepMinutes: number | null
  averageSleepScore: number | null
  averageRestingHeartRateBpm: number | null
  goalDays: number | null
  recoveryDays: number | null
}
export type WeeklyReview = WeeklyMetrics & {
  period: 'week'
  startDate: string
  endDate: string
  periodStatus: 'complete' | 'inProgress'
  comparison: ReviewComparison
  previous: WeeklyMetrics
  deltas: WeeklyMetrics
  coverage: ReviewCoverage
  previousCoverage: ReviewCoverage
  highlight: ReviewInsight | null
  gap: ReviewInsight | null
  nextAction: ReviewInsight | null
}

export type WeightTrend = {
  kgPerWeek: number | null
  confidence: Confidence
  pointCount: number
  spanDays: number
}
export type MonthlyMetrics = {
  workoutCount: number | null
  workoutDayCount: number | null
  workoutMinutes: number | null
  activeEnergyKcal: number | null
  averageSteps: number | null
  averageSleepMinutes: number | null
  swimCount: number | null
  swimDistanceMeters: number | null
  strengthCount: number | null
  weightChangeKg: number | null
  bodyFatChangePercentagePoints: number | null
  waistChangeCm: number | null
  averageRestingHeartRateBpm: number | null
}
export type MonthlyReview = MonthlyMetrics & {
  period: 'month'
  startDate: string
  endDate: string
  periodStatus: 'complete' | 'inProgress'
  comparison: ReviewComparison
  comparisonCurrent: MonthlyMetrics
  previous: MonthlyMetrics
  deltas: MonthlyMetrics
  coverage: ReviewCoverage
  previousCoverage: ReviewCoverage
  weightTrend: WeightTrend
  highlight: ReviewInsight | null
  gap: ReviewInsight | null
  nextAction: ReviewInsight | null
  summary: string | null
}
