import { useEffect, useState } from 'react'
import { withTemporaryDatabase } from '../../app/import-connection'
import { openFitInsightDb } from '../../db/database'
import {
  getHealthSnapshot,
  getPrivateProfile,
} from '../../db/health-repository'
import type {
  EvidenceItem,
  Recommendation,
  ScoreResult,
} from '../../types/analysis'
import type { DailyRecord, Workout } from '../../types/health-data'
import type { UserProfile } from '../../types/profile'
import type { CoverageRange, HealthSnapshot } from '../../types/storage'
import {
  addDays,
  differenceInCalendarDays,
  getWeekRange,
} from '../../utils/date-only'
import { calculateActivityScore } from '../analysis/activity-score'
import { calculateDailyAnalysis } from '../analysis/daily-score'
import { classifyDay } from '../analysis/day-classification'
import { calculatePersonalBaseline } from '../analysis/personal-baseline'
import { calculateRecoveryScore } from '../analysis/recovery-score'
import { generateRecommendations } from '../analysis/recommendations'
import { calculateSleepScore } from '../analysis/sleep-score'
import { calculateWeeklyStructureScore } from '../analysis/weekly-structure-score'
import { calculateWorkoutScore } from '../analysis/workout-score'
import {
  buildTodayViewModel,
  type AsyncTodayState,
  type DashboardInput,
} from './dashboard-view-model'

export function useToday(
  localDate: string,
  dataRevision: number,
): AsyncTodayState {
  const requestKey = `${localDate}:${dataRevision}`
  const [result, setResult] = useState<{
    key: string
    state: AsyncTodayState
  }>(() => ({ key: requestKey, state: { status: 'loading' } }))

  useEffect(() => {
    let alive = true
    void loadToday(localDate).then(
      (next) => {
        if (alive) setResult({ key: requestKey, state: next })
      },
      () => {
        if (alive)
          setResult({
            key: requestKey,
            state: {
              status: 'error',
              message: '本地健康数据读取失败，请稍后重试。',
            },
          })
      },
    )
    return () => {
      alive = false
    }
  }, [localDate, requestKey])

  return result.key === requestKey ? result.state : { status: 'loading' }
}

async function loadToday(localDate: string): Promise<AsyncTodayState> {
  const { snapshot, profile } = await withTemporaryDatabase(
    openFitInsightDb,
    async (database) => {
      const [snapshot, profile] = await Promise.all([
        getHealthSnapshot(database),
        getPrivateProfile(database),
      ])
      return { snapshot, profile }
    },
  )
  const record =
    snapshot.dailyRecords.find((item) => item.date === localDate) ?? null
  const workouts = snapshot.workouts.filter(
    (workout) => workout.localDate === localDate,
  )
  if (record === null && workouts.length === 0) {
    return { status: 'empty', lastImportedAt: snapshot.lastImportedAt }
  }

  const timeZone = runtimeTimeZone()
  const input = analyzeToday({
    snapshot,
    profile,
    record,
    workouts,
    localDate,
    timeZone,
  })
  return { status: 'ready', viewModel: buildTodayViewModel(input) }
}

function analyzeToday({
  snapshot,
  profile,
  record,
  workouts,
  localDate,
  timeZone,
}: {
  snapshot: HealthSnapshot
  profile: UserProfile | null
  record: DailyRecord | null
  workouts: Workout[]
  localDate: string
  timeZone: string
}): DashboardInput {
  const baseline = calculatePersonalBaseline({
    today: localDate,
    timeZone,
    dailyRecords: snapshot.dailyRecords,
    workouts: snapshot.workouts,
    coverage: snapshot.coverage,
  })
  const normalizedRecord = record ?? emptyRecord(localDate)
  if (profile === null) {
    return {
      localDate,
      timeZone,
      currentHour: currentHour(timeZone),
      lastImportedAt: snapshot.lastImportedAt,
      profile,
      record,
      workouts,
      dailyScore: unavailableScore(),
      recoveryScore: unavailableScore(),
      statusLabel: '数据不足',
      recommendations: [],
    }
  }

  const activityScore = calculateActivityScore(normalizedRecord, profile.goals)
  const workoutScore = calculateWorkoutScore(workouts, profile.goals)
  const sleepScore = calculateSleepScore({
    sleep: normalizedRecord.sleep,
    baselineSleepMidpointMinutes: baseline.sleepMidpointMinutes.value,
  })
  const recoveryScore = calculateRecoveryScore({
    sleepScore,
    restingHeartRateBpm: normalizedRecord.restingHeartRateBpm,
    restingHeartRateBaselineBpm: baseline.restingHeartRate.value,
    hrvSdnnMs: normalizedRecord.hrvSdnnMs,
    hrvBaselineMs: baseline.hrv.value,
    workoutMinutesLast72h: recentWorkoutMinutes(snapshot, localDate),
    consecutiveTrainingDays: consecutiveTrainingDays(snapshot, localDate),
  })
  const weeklyStructureScore = weeklyScore(snapshot, localDate, profile)
  const workoutsCovered = dateCovered(
    snapshot.coverage.workouts ?? [],
    localDate,
  )
  const dayType = classifyDay({ workouts, workoutsCovered })
  const daily = calculateDailyAnalysis({
    dayType,
    plannedRestDay: dayType === 'rest',
    activityScore,
    workoutScore,
    sleepScore,
    recoveryScore,
    weeklyStructureScore,
  })
  const recommendations = buildRecommendations({
    profile,
    record: normalizedRecord,
    snapshot,
    localDate,
    sleepScore,
    recoveryScore,
  })
  return {
    localDate,
    timeZone,
    currentHour: currentHour(timeZone),
    lastImportedAt: snapshot.lastImportedAt,
    profile,
    record,
    workouts,
    dailyScore: daily.score,
    recoveryScore,
    statusLabel: daily.status,
    recommendations,
  }
}

function weeklyScore(
  snapshot: HealthSnapshot,
  localDate: string,
  profile: UserProfile,
): ScoreResult {
  const week = getWeekRange(localDate, 1)
  const elapsedDays = differenceInCalendarDays(localDate, week.start) + 1
  const workoutCoveredDates = datesCoveredBy(
    snapshot.coverage.workouts ?? [],
    week.start,
    localDate,
  )
  const exerciseCoveredDates = datesCoveredBy(
    snapshot.coverage.exerciseMinutes ?? [],
    week.start,
    localDate,
  )
  return calculateWeeklyStructureScore({
    elapsedDays,
    workoutCoveredDates,
    exerciseCoveredDates,
    workouts: snapshot.workouts.filter(
      (workout) =>
        workout.localDate >= week.start && workout.localDate <= localDate,
    ),
    dailyRecords: snapshot.dailyRecords.filter(
      (record) => record.date >= week.start && record.date <= localDate,
    ),
    weeklyWorkoutDaysGoal: profile.goals.weeklyWorkoutDays,
    weeklyModerateMinutesGoal: profile.goals.weeklyModerateMinutes,
    weeklySwimmingSessionsGoal: profile.goals.weeklySwimmingSessions,
    weeklyStrengthSessionsGoal: profile.goals.weeklyStrengthSessions,
  })
}

function buildRecommendations({
  profile,
  record,
  snapshot,
  localDate,
  sleepScore,
  recoveryScore,
}: {
  profile: UserProfile
  record: DailyRecord
  snapshot: HealthSnapshot
  localDate: string
  sleepScore: ScoreResult
  recoveryScore: ScoreResult
}): Recommendation[] {
  const week = getWeekRange(localDate, 1)
  const weeklyWorkouts = snapshot.workouts.filter(
    (workout) =>
      workout.localDate >= week.start && workout.localDate <= localDate,
  )
  const swimmingCount = weeklyWorkouts.filter((workout) =>
    ['poolSwimming', 'openWaterSwimming'].includes(workout.type),
  ).length
  const strengthCount = weeklyWorkouts.filter((workout) =>
    ['traditionalStrength', 'functionalStrength'].includes(workout.type),
  ).length
  const workoutCoverageComplete = rangeCovered(
    snapshot.coverage.workouts ?? [],
    week.start,
    localDate,
  )
  return generateRecommendations({
    objective: profile.goals.objective,
    sleepConcern:
      (sleepScore.score !== null && sleepScore.score < 70) ||
      (isFiniteNonNegative(record.sleep?.totalMinutes) &&
        isFinitePositive(profile.goals.sleepMinMinutes) &&
        record.sleep.totalMinutes < profile.goals.sleepMinMinutes),
    weakRecoveryEvidence: recoveryScore.evidence.filter(isWeakRecoverySignal),
    swimmingSessionsRemaining: workoutCoverageComplete
      ? remaining(profile.goals.weeklySwimmingSessions, swimmingCount)
      : null,
    strengthSessionsRemaining: workoutCoverageComplete
      ? remaining(profile.goals.weeklyStrengthSessions, strengthCount)
      : null,
    stepsRemaining: remaining(profile.goals.dailySteps, record.steps),
    sleepObservedMinutes: record.sleep?.totalMinutes ?? null,
    sleepTargetMinutes: profile.goals.sleepMinMinutes,
  })
}

function isWeakRecoverySignal(item: EvidenceItem): boolean {
  if (item.metric === 'restingHeartRateDifference')
    return typeof item.observed === 'number' && item.observed > 5
  if (item.metric === 'hrvRatio' && typeof item.observed === 'string')
    return Number.parseFloat(item.observed) < 75
  return false
}

function recentWorkoutMinutes(
  snapshot: HealthSnapshot,
  localDate: string,
): number | null {
  const start = addDays(localDate, -3)
  if (!rangeCovered(snapshot.coverage.workouts ?? [], start, localDate))
    return null
  return snapshot.workouts
    .filter(
      (workout) => workout.localDate >= start && workout.localDate < localDate,
    )
    .reduce(
      (total, workout) =>
        total +
        (isFiniteNonNegative(workout.durationMinutes)
          ? workout.durationMinutes
          : 0),
      0,
    )
}

function consecutiveTrainingDays(
  snapshot: HealthSnapshot,
  localDate: string,
): number | null {
  const start = addDays(localDate, -3)
  if (!rangeCovered(snapshot.coverage.workouts ?? [], start, localDate))
    return null
  const trainingDates = new Set(
    snapshot.workouts
      .filter((workout) => workout.type !== 'walking')
      .map((workout) => workout.localDate),
  )
  let count = 0
  for (let offset = 1; offset <= 3; offset += 1) {
    if (!trainingDates.has(addDays(localDate, -offset))) break
    count += 1
  }
  return count
}

function datesCoveredBy(
  ranges: readonly CoverageRange[],
  start: string,
  endInclusive: string,
): string[] {
  const dates: string[] = []
  for (let date = start; date <= endInclusive; date = addDays(date, 1)) {
    if (dateCovered(ranges, date)) dates.push(date)
  }
  return dates
}

function dateCovered(ranges: readonly CoverageRange[], date: string): boolean {
  return ranges.some(
    (range) => range.startDate <= date && range.endDate >= date,
  )
}

function rangeCovered(
  ranges: readonly CoverageRange[],
  start: string,
  endInclusive: string,
): boolean {
  for (let date = start; date <= endInclusive; date = addDays(date, 1)) {
    if (!dateCovered(ranges, date)) return false
  }
  return true
}

function remaining(goal: number | null, observed: number | null): number {
  if (!isFiniteNonNegative(goal) || !isFiniteNonNegative(observed)) return 0
  return Math.max(0, Math.ceil(goal - observed))
}

function currentHour(timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone,
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date())
  const hour = Number(parts.find((part) => part.type === 'hour')?.value)
  return Number.isFinite(hour) ? hour : 12
}

function runtimeTimeZone(): string {
  try {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
    if (timeZone) {
      new Intl.DateTimeFormat('en', { timeZone }).format()
      return timeZone
    }
  } catch {
    /* deterministic valid fallback below */
  }
  return 'UTC'
}

function emptyRecord(localDate: string): DailyRecord {
  return {
    date: localDate,
    steps: null,
    activeEnergyKcal: null,
    exerciseMinutes: null,
    standHours: null,
    walkingRunningDistanceKm: null,
    restingHeartRateBpm: null,
    hrvSdnnMs: null,
    sleep: null,
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

function isFiniteNonNegative(
  value: number | null | undefined,
): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

function isFinitePositive(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
}
