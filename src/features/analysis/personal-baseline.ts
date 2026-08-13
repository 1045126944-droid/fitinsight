import type { SleepRecord, Workout } from '../../types/health-data'
import type {
  BaselineMetric,
  PersonalBaseline,
  PersonalBaselineInput,
} from '../../types/analysis'
import { addDays, isValidDateOnly, localDateAt } from '../../utils/date-only'
import { circularMeanMinutes, mean, median } from './math'

const minimumObservations = 7
const workoutCoverageMetric = 'workouts'

export function calculatePersonalBaseline(
  input: PersonalBaselineInput,
): PersonalBaseline {
  const baselineStart = addDays(input.today, -14)
  const priorRecords = input.dailyRecords.filter((record) =>
    isInDailyBaselineWindow(record.date, baselineStart, input.today),
  )
  const sleepRecords = priorRecords
    .map((record) => record.sleep)
    .filter(isPresent)
  const workoutBaselines = calculateWorkoutBaselines(input)

  return {
    restingHeartRate: fromValues(
      priorRecords.map((record) => record.restingHeartRateBpm),
      median,
    ),
    hrv: fromValues(
      priorRecords.map((record) => record.hrvSdnnMs),
      median,
    ),
    sleepMinutes: fromValues(
      sleepRecords.map((sleep) => sleep.totalMinutes),
      mean,
    ),
    sleepMidpointMinutes: fromValues(
      sleepRecords.map((sleep) => sleepMidpointMinutes(sleep, input.timeZone)),
      circularMeanMinutes,
    ),
    steps: fromValues(
      priorRecords.map((record) => record.steps),
      mean,
    ),
    ...workoutBaselines,
  }
}

function calculateWorkoutBaselines(
  input: PersonalBaselineInput,
): Pick<PersonalBaseline, 'workoutCount28d' | 'workoutMinutes28d'> {
  const start = addDays(input.today, -28)
  const observedDates = datesCoveredBy(
    input.coverage?.[workoutCoverageMetric] ?? [],
    start,
    input.today,
  )
  const workoutsByDate = new Map<string, Workout[]>()
  for (const workout of input.workouts) {
    const date = safeLocalDateAt(workout.start, input.timeZone)
    if (!date || date < start || date >= input.today) continue
    const workouts = workoutsByDate.get(date) ?? []
    workouts.push(workout)
    workoutsByDate.set(date, workouts)
  }

  let workoutCount = 0
  let workoutMinutes = 0
  let minuteObservationCount = 0
  for (const date of observedDates) {
    const workouts = workoutsByDate.get(date) ?? []
    workoutCount += workouts.length
    if (
      workouts.every((workout) => isFiniteNonNegative(workout.durationMinutes))
    ) {
      workoutMinutes += workouts.reduce(
        (total, workout) => total + (workout.durationMinutes ?? 0),
        0,
      )
      minuteObservationCount += 1
    }
  }

  return {
    workoutCount28d: fromValue(workoutCount, observedDates.size),
    workoutMinutes28d: fromValue(workoutMinutes, minuteObservationCount),
  }
}

function datesCoveredBy(
  ranges: readonly { startDate: string; endDate: string }[],
  start: string,
  endExclusive: string,
): Set<string> {
  const dates = new Set<string>()
  for (const range of ranges) {
    const rangeStart = range.startDate > start ? range.startDate : start
    const rangeEnd =
      range.endDate < addDays(endExclusive, -1)
        ? range.endDate
        : addDays(endExclusive, -1)
    if (rangeStart > rangeEnd) continue
    for (let date = rangeStart; date <= rangeEnd; date = addDays(date, 1))
      dates.add(date)
  }
  return dates
}

function sleepMidpointMinutes(
  sleep: SleepRecord,
  timeZone: string,
): number | null {
  if (!sleep.start || !sleep.end) return null
  const start = new Date(sleep.start).getTime()
  const end = new Date(sleep.end).getTime()
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start)
    return null
  const midpoint = new Date(start + (end - start) / 2)
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(midpoint)
  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  )
  return Number(values.hour) * 60 + Number(values.minute)
}

function fromValues(
  values: readonly (number | null)[],
  aggregate: (numbers: readonly number[]) => number | null,
): BaselineMetric {
  const valid = values.filter(isFiniteNumber)
  return fromValue(aggregate(valid), valid.length)
}

function fromValue(value: number | null, sampleCount: number): BaselineMetric {
  return {
    value: sampleCount >= minimumObservations ? value : null,
    sampleCount,
    status: sampleCount >= minimumObservations ? 'ready' : 'building',
  }
}

function isInDailyBaselineWindow(
  date: string,
  start: string,
  endExclusive: string,
): boolean {
  return isValidDateOnly(date) && date >= start && date < endExclusive
}

function safeLocalDateAt(instant: string, timeZone: string): string | null {
  try {
    return localDateAt(instant, timeZone)
  } catch {
    return null
  }
}

function isPresent<T>(value: T | null): value is T {
  return value !== null
}

function isFiniteNumber(value: number | null): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isFiniteNonNegative(value: number | null): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}
