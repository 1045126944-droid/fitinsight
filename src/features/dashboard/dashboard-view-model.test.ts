import { describe, expect, test } from 'vitest'
import type { ScoreResult } from '../../types/analysis'
import type { DailyRecord, Workout } from '../../types/health-data'
import type { UserProfile } from '../../types/profile'
import {
  buildTodayViewModel,
  type DashboardInput,
} from './dashboard-view-model'

describe('buildTodayViewModel', () => {
  test('low coverage shows building copy and never substitutes a zero score', () => {
    const viewModel = buildTodayViewModel(
      makeDashboardInput({ dailyScore: unavailableScore(), profile: null }),
    )

    expect(viewModel.score.score).toBeNull()
    expect(viewModel.statusLabel).toBe('个人基线建立中')
    expect(viewModel.prescription?.actionLabel).toBe('先完善本地档案')
    expect(viewModel.prescription?.action).toEqual({ intent: 'profile' })
  })

  test('ready data leads with one action and no more than four known evidence metrics', () => {
    const viewModel = buildTodayViewModel(makeReadyDashboardInput())

    expect(viewModel.prescription?.title).toBeTruthy()
    expect(viewModel.prescription?.reason).toBeTruthy()
    expect(viewModel.prescription?.actionLabel).toBe('分段完成剩余步数')
    expect(viewModel.prescription?.action).toEqual({
      intent: 'details',
      targetId: 'today-details',
    })
    expect(viewModel.evidence.length).toBeLessThanOrEqual(4)
    expect(viewModel.evidence.map((metric) => metric.id)).toEqual([
      'steps',
      'active-energy',
      'exercise-minutes',
      'sleep',
    ])
  })

  test('partial records expose known detail rows and omit missing sleep stages and heart rate', () => {
    const viewModel = buildTodayViewModel(
      makeDashboardInput({
        profile: readyProfile,
        dailyScore: readyScore,
        statusLabel: '基本达标',
        record: {
          ...todayRecord,
          activeEnergyKcal: 508,
          exerciseMinutes: null,
          sleep: {
            ...todayRecord.sleep!,
            awakeMinutes: 31,
            coreMinutes: null,
            deepMinutes: null,
            remMinutes: null,
          },
        },
        workouts: [
          {
            ...todayWorkout,
            activeEnergyKcal: 326,
            averageHeartRateBpm: null,
            maximumHeartRateBpm: null,
          },
        ],
      }),
    )

    const labels = viewModel.details.flatMap((group) =>
      group.items.map((item) => item.label),
    )
    expect(labels).toEqual([
      '步数',
      '活动能量',
      '站立',
      '步行与跑步距离',
      '静息心率',
      'HRV',
      '睡眠时长',
      '清醒时间',
      '训练类型',
      '训练时长',
      '训练能量',
    ])
    expect(labels).not.toContain('核心睡眠')
    expect(labels).not.toContain('平均心率')
  })

  test('weekly structure actions open training instead of a fabricated anchor', () => {
    const viewModel = buildTodayViewModel(
      makeDashboardInput({
        profile: readyProfile,
        dailyScore: readyScore,
        statusLabel: '基本达标',
        recommendations: [
          {
            id: 'weekly-structure',
            priority: 1,
            title: '补齐本周训练结构',
            reason: '本周目标还剩力量 1 次；可结合恢复状态择一安排。',
            confidence: 'high',
            evidence: [],
          },
        ],
      }),
    )

    expect(viewModel.prescription?.action).toEqual({ intent: 'training' })
  })

  test('recovery actions point to rendered evidence without pretending to save rest', () => {
    const viewModel = buildTodayViewModel(
      makeDashboardInput({
        profile: readyProfile,
        dailyScore: readyScore,
        recoveryScore: { ...readyScore, score: 48 },
        statusLabel: '部分不足',
        recommendations: [
          {
            id: 'recovery-rest',
            priority: 1,
            title: '可考虑安排完整休息',
            reason: '当前有 2 项独立恢复信号偏弱。',
            confidence: 'medium',
            evidence: [],
          },
        ],
      }),
    )

    expect(viewModel.prescription?.actionLabel).toBe('查看今日恢复依据')
    expect(viewModel.prescription?.action).toEqual({
      intent: 'evidence',
      targetId: 'today-evidence',
    })
  })
})

const readyScore: ScoreResult = {
  score: 82,
  coverage: 0.94,
  confidence: 'high',
  evidence: [],
}

const todayRecord: DailyRecord = {
  date: '2026-07-29',
  steps: 8_426,
  activeEnergyKcal: 540,
  exerciseMinutes: 46,
  standHours: 11,
  walkingRunningDistanceKm: 6.4,
  restingHeartRateBpm: 58,
  hrvSdnnMs: 52,
  sleep: {
    start: '2026-07-28T23:30:00+08:00',
    end: '2026-07-29T07:05:00+08:00',
    totalMinutes: 418,
    awakeMinutes: 37,
    coreMinutes: 231,
    deepMinutes: 79,
    remMinutes: 108,
    source: 'Apple Health',
  },
}

const todayWorkout: Workout = {
  id: 'workout-1',
  externalId: 'external-1',
  type: 'poolSwimming',
  rawType: 'HKWorkoutActivityTypeSwimming',
  localDate: '2026-07-29',
  start: '2026-07-29T07:30:00+08:00',
  end: '2026-07-29T08:16:00+08:00',
  durationMinutes: 46,
  activeEnergyKcal: 326,
  distanceMeters: 1_500,
  swimmingStrokeCount: 812,
  averageHeartRateBpm: 128,
  maximumHeartRateBpm: 154,
  heartRateSamples: [],
  source: 'Apple Health',
  device: 'Apple Watch',
}

const readyProfile: UserProfile = {
  id: 'current',
  name: 'Lu',
  sex: 'unspecified',
  birthDate: null,
  ageAsOf: null,
  heightCm: null,
  maximumHeartRateBpm: null,
  bodyContext: {
    weightKg: null,
    bodyFatMassKg: null,
    bodyFatPercentage: null,
    skeletalMuscleMassKg: null,
    bmi: null,
    waistHipRatio: null,
    visceralFatLevel: null,
    basalMetabolicRateKcal: null,
  },
  goals: {
    objective: 'generalFitness',
    dailySteps: 10_000,
    weeklyWorkoutDays: 4,
    weeklySwimmingSessions: 2,
    weeklyStrengthSessions: 2,
    weeklyModerateMinutes: 180,
    sleepMinMinutes: 420,
    sleepMaxMinutes: 540,
    targetWeightRangeKg: null,
    longTermWeightRangeKg: null,
    targetWeeklyWeightLossKg: null,
    targetBodyFatPercentage: null,
  },
  updatedAt: '2026-07-01T08:00:00+08:00',
}

function makeReadyDashboardInput(): DashboardInput {
  return makeDashboardInput({
    profile: readyProfile,
    dailyScore: readyScore,
    statusLabel: '基本达标',
    recoveryScore: { ...readyScore, score: 78 },
    recommendations: [
      {
        id: 'steps-progress',
        priority: 1,
        title: '用轻松步行接近日目标',
        reason: '距离个人步数目标还剩 1574 步，可按当日感受分段完成。',
        confidence: 'high',
        evidence: [
          {
            metric: 'stepsRemaining',
            observed: 1_574,
            target: 0,
            reason: '依据今日已记录步数与个人步数目标之差',
          },
        ],
      },
    ],
  })
}

function makeDashboardInput(
  overrides: Partial<DashboardInput> = {},
): DashboardInput {
  return {
    localDate: '2026-07-29',
    timeZone: 'Asia/Shanghai',
    currentHour: 15,
    lastImportedAt: '2026-07-29T13:42:00+08:00',
    profile: null,
    record: todayRecord,
    workouts: [todayWorkout],
    dailyScore: unavailableScore(),
    recoveryScore: unavailableScore(),
    statusLabel: '数据不足',
    recommendations: [],
    ...overrides,
  }
}

function unavailableScore(): ScoreResult {
  return {
    score: null,
    coverage: 0,
    confidence: 'building',
    evidence: [],
  }
}
