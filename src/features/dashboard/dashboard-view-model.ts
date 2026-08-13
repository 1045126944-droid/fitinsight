import type {
  Confidence,
  DailyAnalysis,
  Recommendation,
  ScoreResult,
} from '../../types/analysis'
import type { DailyRecord, Workout, WorkoutType } from '../../types/health-data'
import type { UserProfile } from '../../types/profile'
import { localDateAt } from '../../utils/date-only'

export type MetricDisplay = {
  id: string
  label: string
  value: string | null
  statusText: string
  accent: 'activity' | 'training' | 'sleep' | 'recovery' | 'neutral'
}

export type TodayDetailItem = {
  id: string
  label: string
  value: string
}

export type TodayDetailGroup = {
  id: string
  title: string
  accent: MetricDisplay['accent']
  items: TodayDetailItem[]
}

export type PrescriptionAction =
  | { intent: 'sync' }
  | { intent: 'profile' }
  | { intent: 'training' }
  | { intent: 'evidence'; targetId: 'today-evidence' }
  | { intent: 'details'; targetId: 'today-details' }
  | { intent: 'none' }

export type TodayViewModel = {
  dateLabel: string
  greeting: string
  lastImportedLabel: string | null
  prescription: {
    title: string
    reason: string
    actionLabel: string
    action: PrescriptionAction
    confidence: Confidence
  } | null
  score: ScoreResult
  statusLabel: string
  evidence: MetricDisplay[]
  recommendations: Recommendation[]
  details: TodayDetailGroup[]
}

export type AsyncTodayState =
  | { status: 'loading' }
  | { status: 'empty'; lastImportedAt: string | null }
  | { status: 'ready'; viewModel: TodayViewModel }
  | { status: 'error'; message: string }

export type DashboardInput = {
  localDate: string
  timeZone: string
  currentHour: number
  lastImportedAt: string | null
  profile: UserProfile | null
  record: DailyRecord | null
  workouts: readonly Workout[]
  dailyScore: ScoreResult
  recoveryScore: ScoreResult
  statusLabel: DailyAnalysis['status']
  recommendations: readonly Recommendation[]
}

export function buildTodayViewModel(input: DashboardInput): TodayViewModel {
  const evidence = buildEvidence(input).slice(0, 4)
  const details = buildDetails(input.record, input.workouts)
  return {
    dateLabel: formatDateLabel(input.localDate),
    greeting: formatGreeting(input.currentHour, input.profile?.name ?? ''),
    lastImportedLabel: formatLastImportedLabel(
      input.lastImportedAt,
      input.localDate,
      input.timeZone,
    ),
    prescription: buildPrescription(input, {
      hasEvidence: evidence.length > 0,
      hasDetails: details.length > 0,
    }),
    score: input.dailyScore,
    statusLabel:
      input.dailyScore.score === null ? '个人基线建立中' : input.statusLabel,
    evidence,
    recommendations: [...input.recommendations],
    details,
  }
}

function buildPrescription(
  input: DashboardInput,
  availability: { hasEvidence: boolean; hasDetails: boolean },
): TodayViewModel['prescription'] {
  if (input.profile === null) {
    return {
      title: '完善档案后再生成今日建议',
      reason:
        '目标和身体信息只保存在这台设备上；补充后才能提供与你相关的行动建议。',
      actionLabel: '先完善本地档案',
      action: { intent: 'profile' },
      confidence: 'building',
    }
  }
  if (input.dailyScore.score === null) {
    return {
      title: '继续记录，先建立个人基线',
      reason: '当前覆盖不足，暂不把未知数据当作零分，也不生成强训练处方。',
      actionLabel: '同步今天数据',
      action: { intent: 'sync' },
      confidence: 'building',
    }
  }

  const recommendation = input.recommendations[0]
  if (recommendation) {
    return {
      title: recommendation.title,
      reason: recommendation.reason,
      actionLabel: actionLabelFor(recommendation.id),
      action: actionFor(recommendation.id, availability),
      confidence: recommendation.confidence,
    }
  }

  return {
    title: '保持今天的节奏',
    reason: `当前记录为“${input.statusLabel}”，可结合当日感受安排活动。`,
    actionLabel: '查看今日记录',
    action: availability.hasDetails
      ? { intent: 'details', targetId: 'today-details' }
      : { intent: 'none' },
    confidence: input.dailyScore.confidence,
  }
}

function buildEvidence(input: DashboardInput): MetricDisplay[] {
  const result: MetricDisplay[] = []
  const record = input.record
  if (isFiniteNonNegative(record?.steps)) {
    result.push({
      id: 'steps',
      label: '步数',
      value: `${formatNumber(record.steps)} 步`,
      statusText: isFinitePositive(input.profile?.goals.dailySteps)
        ? `个人目标 ${formatNumber(input.profile.goals.dailySteps)} 步`
        : '今日已记录',
      accent: 'activity',
    })
  }
  if (isFiniteNonNegative(record?.activeEnergyKcal)) {
    result.push({
      id: 'active-energy',
      label: '活动能量',
      value: `${formatNumber(record.activeEnergyKcal)} 千卡`,
      statusText: '今日已记录',
      accent: 'activity',
    })
  }
  if (isFiniteNonNegative(record?.exerciseMinutes)) {
    result.push({
      id: 'exercise-minutes',
      label: '运动时间',
      value: `${formatNumber(record.exerciseMinutes)} 分钟`,
      statusText: 'Apple 锻炼时间',
      accent: 'training',
    })
  }
  if (isFiniteNonNegative(record?.sleep?.totalMinutes)) {
    result.push({
      id: 'sleep',
      label: '睡眠',
      value: formatMinutes(record.sleep.totalMinutes),
      statusText: '昨夜记录',
      accent: 'sleep',
    })
  }
  if (input.workouts.length > 0) {
    const minutes = sumKnown(input.workouts.map((item) => item.durationMinutes))
    result.push({
      id: 'workout',
      label: '今日训练',
      value:
        input.workouts.length === 1
          ? `${workoutTypeLabel(input.workouts[0]!.type)}${minutes === null ? '' : ` · ${formatMinutes(minutes)}`}`
          : `${input.workouts.length} 次${minutes === null ? '' : ` · ${formatMinutes(minutes)}`}`,
      statusText: '仅汇总今天已导入的训练',
      accent: 'training',
    })
  }
  if (input.recoveryScore.score !== null) {
    result.push({
      id: 'recovery',
      label: '恢复',
      value: `${input.recoveryScore.score} 分`,
      statusText: confidenceLabel(input.recoveryScore.confidence),
      accent: 'recovery',
    })
  }
  return result
}

function buildDetails(
  record: DailyRecord | null,
  workouts: readonly Workout[],
): TodayDetailGroup[] {
  const groups: TodayDetailGroup[] = []
  const activity = compactItems([
    detail(
      'steps',
      '步数',
      record?.steps,
      (value) => `${formatNumber(value)} 步`,
    ),
    detail(
      'active-energy',
      '活动能量',
      record?.activeEnergyKcal,
      (value) => `${formatNumber(value)} 千卡`,
    ),
    detail(
      'exercise-minutes',
      '运动时间',
      record?.exerciseMinutes,
      (value) => `${formatNumber(value)} 分钟`,
    ),
    detail(
      'stand-hours',
      '站立',
      record?.standHours,
      (value) => `${formatNumber(value)} 小时`,
    ),
    detail(
      'walking-distance',
      '步行与跑步距离',
      record?.walkingRunningDistanceKm,
      (value) => `${formatNumber(value, 1)} 公里`,
    ),
    detail(
      'resting-heart-rate',
      '静息心率',
      record?.restingHeartRateBpm,
      (value) => `${formatNumber(value)} 次/分`,
    ),
    detail(
      'hrv',
      'HRV',
      record?.hrvSdnnMs,
      (value) => `${formatNumber(value)} 毫秒`,
    ),
  ])
  if (activity.length > 0)
    groups.push({
      id: 'activity',
      title: '活动',
      accent: 'activity',
      items: activity,
    })

  const sleep = record?.sleep
  const sleepItems = compactItems([
    detail('sleep-duration', '睡眠时长', sleep?.totalMinutes, formatMinutes),
    detail('sleep-awake', '清醒时间', sleep?.awakeMinutes, formatMinutes),
    detail('sleep-core', '核心睡眠', sleep?.coreMinutes, formatMinutes),
    detail('sleep-deep', '深度睡眠', sleep?.deepMinutes, formatMinutes),
    detail('sleep-rem', '快速眼动睡眠', sleep?.remMinutes, formatMinutes),
  ])
  if (sleepItems.length > 0)
    groups.push({
      id: 'sleep',
      title: '睡眠',
      accent: 'sleep',
      items: sleepItems,
    })

  workouts.forEach((workout, index) => {
    const items = compactItems([
      {
        id: `workout-${index}-type`,
        label: '训练类型',
        value: workoutTypeLabel(workout.type),
      },
      detail(
        `workout-${index}-duration`,
        '训练时长',
        workout.durationMinutes,
        formatMinutes,
      ),
      detail(
        `workout-${index}-energy`,
        '训练能量',
        workout.activeEnergyKcal,
        (value) => `${formatNumber(value)} 千卡`,
      ),
      detail(
        `workout-${index}-average-heart-rate`,
        '平均心率',
        workout.averageHeartRateBpm,
        (value) => `${formatNumber(value)} 次/分`,
      ),
      detail(
        `workout-${index}-maximum-heart-rate`,
        '最高心率',
        workout.maximumHeartRateBpm,
        (value) => `${formatNumber(value)} 次/分`,
      ),
    ])
    groups.push({
      id: `workout-${workout.id}`,
      title: workouts.length > 1 ? `训练 ${index + 1}` : '今日训练',
      accent: 'training',
      items,
    })
  })
  return groups
}

function detail(
  id: string,
  label: string,
  value: number | null | undefined,
  formatter: (value: number) => string,
): TodayDetailItem | null {
  return isFiniteNonNegative(value)
    ? { id, label, value: formatter(value) }
    : null
}

function compactItems(
  items: readonly (TodayDetailItem | null)[],
): TodayDetailItem[] {
  return items.filter((item): item is TodayDetailItem => item !== null)
}

function formatDateLabel(localDate: string): string {
  const [year, month, day] = localDate.split('-').map(Number)
  const calendarDate = new Date(0)
  calendarDate.setUTCHours(0, 0, 0, 0)
  calendarDate.setUTCFullYear(year!, month! - 1, day!)
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  return `${month}月${day}日 ${weekdays[calendarDate.getUTCDay()]}`
}

function formatGreeting(hour: number, rawName: string): string {
  const salutation =
    hour < 6 ? '夜深了' : hour < 12 ? '上午好' : hour < 18 ? '下午好' : '晚上好'
  const name = rawName.trim()
  return name ? `${salutation}，${name}` : salutation
}

function formatLastImportedLabel(
  importedAt: string | null,
  localDate: string,
  timeZone: string,
): string | null {
  if (importedAt === null) return null
  try {
    const importedDate = localDateAt(importedAt, timeZone)
    const time = new Intl.DateTimeFormat('zh-CN', {
      timeZone,
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).format(new Date(importedAt))
    return importedDate === localDate
      ? `今天 ${time}`
      : `${formatDateLabel(importedDate).split(' ')[0]} ${time}`
  } catch {
    return null
  }
}

function actionLabelFor(id: string): string {
  if (id === 'steps-progress') return '分段完成剩余步数'
  if (id === 'weekly-structure') return '查看本周训练安排'
  if (id === 'recovery-rest') return '查看今日恢复依据'
  if (id === 'sleep-recovery') return '查看睡眠与恢复依据'
  return '查看建议依据'
}

function actionFor(
  id: string,
  availability: { hasEvidence: boolean; hasDetails: boolean },
): PrescriptionAction {
  if (id === 'weekly-structure') return { intent: 'training' }
  if (
    availability.hasEvidence &&
    ['recovery-rest', 'sleep-recovery'].includes(id)
  )
    return { intent: 'evidence', targetId: 'today-evidence' }
  if (availability.hasDetails)
    return { intent: 'details', targetId: 'today-details' }
  if (availability.hasEvidence)
    return { intent: 'evidence', targetId: 'today-evidence' }
  return { intent: 'none' }
}

function workoutTypeLabel(type: WorkoutType): string {
  const labels: Record<WorkoutType, string> = {
    poolSwimming: '泳池游泳',
    openWaterSwimming: '开放水域游泳',
    traditionalStrength: '传统力量训练',
    functionalStrength: '功能性力量训练',
    walking: '步行',
    running: '跑步',
    other: '其他训练',
  }
  return labels[type]
}

function confidenceLabel(confidence: Confidence): string {
  if (confidence === 'high') return '高置信度'
  if (confidence === 'medium') return '中等置信度'
  if (confidence === 'low') return '低置信度'
  return '个人基线建立中'
}

function formatMinutes(minutes: number): string {
  const rounded = Math.round(minutes)
  const hours = Math.floor(rounded / 60)
  const remainder = rounded % 60
  if (hours === 0) return `${remainder} 分钟`
  if (remainder === 0) return `${hours} 小时`
  return `${hours}小时${remainder}分`
}

function sumKnown(values: readonly (number | null)[]): number | null {
  const known = values.filter(isFiniteNonNegative)
  return known.length === 0
    ? null
    : known.reduce((sum, value) => sum + value, 0)
}

function formatNumber(value: number, maximumFractionDigits = 0): string {
  return new Intl.NumberFormat('zh-CN', { maximumFractionDigits }).format(value)
}

function isFiniteNonNegative(
  value: number | null | undefined,
): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

function isFinitePositive(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
}
