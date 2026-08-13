import type { HeartRateZoneSummary } from '../../types/analysis'
import type { Workout, WorkoutType } from '../../types/health-data'
import type { UserProfile } from '../../types/profile'
import { getWeekRange } from '../../utils/date-only'
import {
  resolveMaximumHeartRate,
  summarizeHeartRateZones,
} from '../analysis/heart-rate-zones'
import { calculateSwimPaceSecondsPer100m } from '../analysis/swimming'

export type WorkoutCategory =
  'all' | 'swimming' | 'strength' | 'walking' | 'running' | 'other'

export type WorkoutListItem = {
  id: string
  category: Exclude<WorkoutCategory, 'all'>
  localDate: string
  typeLabel: string
  startLabel: string
  summary: string | null
}

export type WorkoutDetailMetric = { label: string; value: string }
export type WorkoutHeartRateZone = {
  zone: string
  duration: string
  sampleCount: number
}

export type WorkoutDetail = {
  id: string
  title: string
  metrics: WorkoutDetailMetric[]
  swimming: { pace: string; comparison: string | null } | null
  heartRateZones: WorkoutHeartRateZone[] | null
  strengthSummary: WorkoutDetailMetric[] | null
}

export type WorkoutsViewModel = {
  items: WorkoutListItem[]
  detailsById: Readonly<Record<string, WorkoutDetail>>
  lastImportedAt: string | null
}

export type AsyncWorkoutsState =
  | { status: 'loading' }
  | { status: 'empty'; lastImportedAt: string | null }
  | { status: 'error'; message: string }
  | { status: 'ready'; viewModel: WorkoutsViewModel }

export function buildWorkoutsViewModel(
  workouts: readonly Workout[],
  profile: UserProfile | null,
  lastImportedAt: string | null = null,
): WorkoutsViewModel {
  const items = buildWorkoutListItems(workouts)
  return {
    items,
    detailsById: Object.fromEntries(
      workouts.map((workout) => [
        workout.id,
        buildWorkoutDetail(workout, workouts, profile),
      ]),
    ),
    lastImportedAt,
  }
}

export function buildWorkoutListItems(
  workouts: readonly Workout[],
): WorkoutListItem[] {
  return [...workouts].sort(compareWorkoutsNewestFirst).map((workout) => ({
    id: workout.id,
    category: categoryFor(workout.type),
    localDate: workout.localDate,
    typeLabel: typeLabel(workout.type),
    startLabel: formatStartTime(workout.start),
    summary: workoutSummary(workout),
  }))
}

export function buildWorkoutDetail(
  workout: Workout,
  workouts: readonly Workout[],
  profile: UserProfile | null,
): WorkoutDetail {
  const swimming = swimmingDetail(workout, workouts)
  const heartRateZones = zoneDetails(workout, profile)
  return {
    id: workout.id,
    title: `${typeLabel(workout.type)}详情`,
    metrics: compactMetrics([
      { label: '训练类型', value: typeLabel(workout.type) },
      {
        label: '开始时间',
        value: `${formatDate(workout.localDate)} ${formatStartTime(workout.start)}`,
      },
      metric('时长', workout.durationMinutes, formatMinutes),
      metric('活动能量', workout.activeEnergyKcal, formatKcal),
      metric('距离', workout.distanceMeters, formatDistance),
      metric('平均心率', workout.averageHeartRateBpm, formatHeartRate),
      metric('最高心率', workout.maximumHeartRateBpm, formatHeartRate),
      textMetric('来源', workout.source),
      textMetric('设备', workout.device),
    ]),
    swimming,
    heartRateZones,
    strengthSummary: isStrength(workout.type)
      ? strengthDetails(workout, workouts, profile)
      : null,
  }
}

export function categoryFor(
  type: WorkoutType,
): Exclude<WorkoutCategory, 'all'> {
  if (type === 'poolSwimming' || type === 'openWaterSwimming') return 'swimming'
  if (type === 'traditionalStrength' || type === 'functionalStrength')
    return 'strength'
  if (type === 'walking') return 'walking'
  if (type === 'running') return 'running'
  return 'other'
}

function swimmingDetail(
  workout: Workout,
  workouts: readonly Workout[],
): WorkoutDetail['swimming'] {
  if (!isSwimming(workout.type)) return null
  const pace = calculateSwimPaceSecondsPer100m(
    workout.durationMinutes,
    workout.distanceMeters,
  )
  if (pace === null) return null
  const selectedStart = timestampMilliseconds(workout.start)
  const earlier = [...workouts]
    .filter(
      (candidate) =>
        candidate.id !== workout.id &&
        candidate.type === workout.type &&
        timestampMilliseconds(candidate.start) < selectedStart,
    )
    .sort(
      (left, right) =>
        timestampMilliseconds(right.start) - timestampMilliseconds(left.start),
    )
    .slice(0, 4)
  const comparablePaces = earlier
    .map((candidate) =>
      calculateSwimPaceSecondsPer100m(
        candidate.durationMinutes,
        candidate.distanceMeters,
      ),
    )
    .filter((value): value is number => value !== null)
  return {
    pace: formatPace(pace),
    comparison: paceComparison(pace, comparablePaces),
  }
}

function paceComparison(
  pace: number,
  comparablePaces: readonly number[],
): string | null {
  if (comparablePaces.length === 0) return null
  const comparison =
    comparablePaces.reduce((sum, value) => sum + value, 0) /
    comparablePaces.length
  const difference = Math.round(Math.abs(comparison - pace))
  const prefix = difference === 0 ? '与' : pace < comparison ? '比' : '比'
  const result =
    difference === 0
      ? `与最近 ${comparablePaces.length} 次相同`
      : `${prefix}最近 ${comparablePaces.length} 次${pace < comparison ? '快' : '慢'} ${difference} 秒/100米`
  return result
}

function zoneDetails(
  workout: Workout,
  profile: UserProfile | null,
): WorkoutHeartRateZone[] | null {
  if (profile === null || workout.heartRateSamples === null) return null
  const maximum = resolveMaximumHeartRate(profile, workout.localDate)
  const zones = summarizeHeartRateZones(workout.heartRateSamples, maximum)
  if (zones === null) return null
  const observed = zones.filter((zone) => zone.sampleCount > 0)
  return observed.length === 0 ? null : observed.map(formatZone)
}

function formatZone(zone: HeartRateZoneSummary): WorkoutHeartRateZone {
  return {
    zone: `Z${zone.zone}`,
    duration: formatDurationSeconds(zone.durationSeconds),
    sampleCount: zone.sampleCount,
  }
}

function strengthDetails(
  workout: Workout,
  workouts: readonly Workout[],
  profile: UserProfile | null,
): WorkoutDetailMetric[] {
  const week = getWeekRange(workout.localDate, 1)
  const weekly = workouts.filter(
    (candidate) =>
      isStrength(candidate.type) &&
      candidate.localDate >= week.start &&
      candidate.localDate <= week.end,
  )
  const durations = weekly
    .map((candidate) => candidate.durationMinutes)
    .filter(isFiniteNonNegative)
  const energies = weekly
    .map((candidate) => candidate.activeEnergyKcal)
    .filter(isFiniteNonNegative)
  const heartRates = weekly
    .map((candidate) => candidate.averageHeartRateBpm)
    .filter(isFinitePositive)
  const goal = profile?.goals.weeklyStrengthSessions
  return compactMetrics([
    { label: '本周力量训练', value: `${weekly.length} 次` },
    aggregateMetric('本周时长', durations, '分钟'),
    aggregateMetric('本周活动能量', energies, '千卡'),
    heartRates.length > 0
      ? {
          label: '本周平均心率',
          value: `${formatNumber(mean(heartRates), 0)} 次/分`,
        }
      : null,
    isFinitePositive(goal)
      ? { label: '本周目标进度', value: `${weekly.length} / ${goal} 次` }
      : null,
  ])
}

function aggregateMetric(
  label: string,
  values: readonly number[],
  unit: string,
): WorkoutDetailMetric | null {
  return values.length > 0
    ? { label, value: `${formatNumber(sum(values), 0)} ${unit}` }
    : null
}

function workoutSummary(workout: Workout): string | null {
  const values = compactStrings([
    isFiniteNonNegative(workout.durationMinutes)
      ? formatMinutes(workout.durationMinutes)
      : null,
    isFiniteNonNegative(workout.distanceMeters)
      ? formatDistance(workout.distanceMeters)
      : null,
    isFiniteNonNegative(workout.activeEnergyKcal)
      ? formatKcal(workout.activeEnergyKcal)
      : null,
  ])
  return values.length > 0 ? values.join(' · ') : null
}

function metric(
  label: string,
  value: number | null,
  format: (value: number) => string,
): WorkoutDetailMetric | null {
  return isFiniteNonNegative(value) ? { label, value: format(value) } : null
}

function textMetric(
  label: string,
  value: string | null,
): WorkoutDetailMetric | null {
  const normalized = value?.trim()
  return normalized ? { label, value: normalized } : null
}

function compactMetrics(
  values: readonly (WorkoutDetailMetric | null)[],
): WorkoutDetailMetric[] {
  return values.filter((value): value is WorkoutDetailMetric => value !== null)
}

function compactStrings(values: readonly (string | null)[]): string[] {
  return values.filter((value): value is string => value !== null)
}

function typeLabel(type: WorkoutType): string {
  if (type === 'poolSwimming') return '泳池游泳'
  if (type === 'openWaterSwimming') return '开放水域游泳'
  if (type === 'traditionalStrength') return '传统力量训练'
  if (type === 'functionalStrength') return '功能性力量训练'
  if (type === 'walking') return '步行'
  if (type === 'running') return '跑步'
  return '其他训练'
}

function formatDate(date: string): string {
  const [year, month, day] = date.split('-').map(Number)
  return `${year}年${month}月${day}日`
}

function formatStartTime(start: string): string {
  const wallClock = start.match(/^\d{4}-\d{2}-\d{2}T(\d{2}):(\d{2})/)
  return wallClock ? `${wallClock[1]}:${wallClock[2]}` : start
}

function compareWorkoutsNewestFirst(left: Workout, right: Workout): number {
  const localDateOrder = right.localDate.localeCompare(left.localDate)
  if (localDateOrder !== 0) return localDateOrder
  return timestampMilliseconds(right.start) - timestampMilliseconds(left.start)
}

function timestampMilliseconds(timestamp: string): number {
  return new Date(timestamp).getTime()
}

function formatMinutes(value: number): string {
  return `${formatNumber(value, 0)} 分钟`
}

function formatKcal(value: number): string {
  return `${formatNumber(value, 0)} 千卡`
}

function formatDistance(value: number): string {
  if (value >= 1_000) return `${formatNumber(value / 1_000, 2)} 公里`
  return `${formatNumber(value, 0)} 米`
}

function formatHeartRate(value: number): string {
  return `${formatNumber(value, 0)} 次/分`
}

function formatPace(seconds: number): string {
  const rounded = Math.round(seconds)
  const minutes = Math.floor(rounded / 60)
  return `${minutes}分${String(rounded % 60).padStart(2, '0')}秒/100米`
}

function formatDurationSeconds(value: number): string {
  const seconds = Math.round(value)
  if (seconds >= 60) return `${Math.floor(seconds / 60)}分${seconds % 60}秒`
  return `${seconds}秒`
}

function formatNumber(value: number, maximumFractionDigits: number): string {
  return new Intl.NumberFormat('zh-CN', { maximumFractionDigits }).format(value)
}

function isSwimming(type: WorkoutType): boolean {
  return type === 'poolSwimming' || type === 'openWaterSwimming'
}

function isStrength(type: WorkoutType): boolean {
  return type === 'traditionalStrength' || type === 'functionalStrength'
}

function isFiniteNonNegative(value: number | null): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

function isFinitePositive(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
}

function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0)
}

function mean(values: readonly number[]): number {
  return sum(values) / values.length
}
