import { z } from 'zod'
import type {
  BodyMeasurement,
  DailyRecord,
  HeartRateSample,
  SleepRecord,
  Workout,
} from '../../types/health-data'
import { COVERAGE_METRIC_KEYS } from '../../types/health-data'
import type { ImportWarning, ParseHealthDataResult } from './import-types'
import { normalizeWorkoutType } from './normalizers'
import { createWorkoutKey } from './workout-key'

const MAX_DAILY_RECORDS = 400
const MAX_WORKOUTS = 5_000
const MAX_BODY_MEASUREMENTS = 2_000
const MAX_HEART_RATE_SAMPLES = 20_000
const MAX_TEXT_LENGTH = 200
const semver = /^\d+\.\d+\.\d+$/
const datePattern = /^\d{4}-\d{2}-\d{2}$/
const offsetTimestampPattern =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,9})?)?(?:Z|[+-](\d{2}):(\d{2}))$/
const numericStringPattern = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/

const isValidTimezone = (timezone: string): boolean => {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone })
    return true
  } catch {
    return false
  }
}

const envelopeSchema = z
  .object({
    schemaVersion: z.string().regex(semver),
    generatedAt: z
      .string()
      .refine(isTimestamp, 'Expected an offset-bearing ISO timestamp'),
    timezone: z
      .string()
      .min(1)
      .refine(isValidTimezone, 'Expected an IANA timezone'),
    source: z.string().min(1).max(MAX_TEXT_LENGTH),
    coverage: z
      .object({
        startDate: z.string().refine(isDate, 'Expected YYYY-MM-DD'),
        endDate: z.string().refine(isDate, 'Expected YYYY-MM-DD'),
        includedMetrics: z
          .array(z.enum(COVERAGE_METRIC_KEYS))
          .transform((metrics) =>
            COVERAGE_METRIC_KEYS.filter((key) => metrics.includes(key)),
          ),
        mode: z.literal('patch'),
      })
      .refine((coverage) => coverage.startDate <= coverage.endDate)
      .nullable()
      .optional(),
    dailyRecords: z.array(z.unknown()).max(MAX_DAILY_RECORDS),
    workouts: z.array(z.unknown()).max(MAX_WORKOUTS),
    bodyMeasurements: z.array(z.unknown()).max(MAX_BODY_MEASUREMENTS),
    profile: z.unknown().optional(),
  })
  .passthrough()

const shortcutEnvelopeSchema = z
  .object({
    schemaVersion: z.literal('1.1.0'),
    generatedAt: z
      .string()
      .refine(isTimestamp, 'Expected an offset-bearing ISO timestamp'),
    daily: z
      .object({ date: z.string().refine(isDate, 'Expected YYYY-MM-DD') })
      .passthrough(),
    sleep: z.unknown().nullable().optional(),
    body: z.unknown().nullable().optional(),
    workouts: z.array(z.unknown()).max(MAX_WORKOUTS).default([]),
    timezone: z
      .string()
      .min(1)
      .refine(isValidTimezone, 'Expected an IANA timezone')
      .optional(),
    source: z.string().min(1).max(MAX_TEXT_LENGTH).optional(),
  })
  .passthrough()

type ParsedEnvelope = z.infer<typeof envelopeSchema>
type UnknownRecord = Record<string, unknown>

export function parseHealthDataJson(text: string): ParseHealthDataResult {
  let unknownValue: unknown
  try {
    unknownValue = JSON.parse(text)
  } catch {
    return invalidJson()
  }

  const shortcutEnvelope = shortcutEnvelopeSchema.safeParse(unknownValue)
  if (shortcutEnvelope.success) {
    return normalizeShortcutEnvelope(shortcutEnvelope.data)
  }

  const envelope = envelopeSchema.safeParse(unknownValue)
  if (!envelope.success) {
    return invalidEnvelope()
  }
  if (envelope.data.schemaVersion.split('.')[0] !== '1') {
    return unsupportedVersion()
  }

  return normalizeEnvelope(envelope.data)
}

function normalizeShortcutEnvelope(
  envelope: z.infer<typeof shortcutEnvelopeSchema>,
): ParseHealthDataResult {
  const daily = { ...envelope.daily, sleep: envelope.sleep ?? null }
  const body = isRecord(envelope.body)
    ? [{ ...envelope.body, date: envelope.daily.date }]
    : []
  const workouts = envelope.workouts.map((workout) =>
    isRecord(workout)
      ? {
          ...workout,
          rawType: workout.rawType ?? workout.type,
          localDate: workout.localDate ?? localDateFromTimestamp(workout.start),
        }
      : workout,
  )
  const includedMetrics = COVERAGE_METRIC_KEYS.filter((metric) => {
    if (metric === 'walkingRunningDistanceKm')
      return Object.prototype.hasOwnProperty.call(envelope.daily, 'distanceKm')
    if (metric === 'restingHeartRateBpm')
      return Object.prototype.hasOwnProperty.call(
        envelope.daily,
        'restingHeartRate',
      )
    if (metric === 'hrvSdnnMs')
      return Object.prototype.hasOwnProperty.call(envelope.daily, 'hrv')
    if (metric === 'sleep') return envelope.sleep !== undefined
    if (metric === 'workouts') return true
    if (metric === 'weightKg' || metric === 'bodyFatPercentage')
      return (
        isRecord(envelope.body) &&
        Object.prototype.hasOwnProperty.call(envelope.body, metric)
      )
    return Object.prototype.hasOwnProperty.call(envelope.daily, metric)
  })

  return normalizeEnvelope({
    schemaVersion: envelope.schemaVersion,
    generatedAt: envelope.generatedAt,
    timezone: envelope.timezone ?? 'Asia/Shanghai',
    source: envelope.source ?? 'FitInsight Shortcut',
    coverage: {
      startDate: envelope.daily.date,
      endDate: envelope.daily.date,
      includedMetrics,
      mode: 'patch',
    },
    dailyRecords: [
      {
        ...daily,
        walkingRunningDistanceKm: envelope.daily.distanceKm,
        restingHeartRateBpm: envelope.daily.restingHeartRate,
        hrvSdnnMs: envelope.daily.hrv,
      },
    ],
    workouts,
    bodyMeasurements: body,
  })
}

function localDateFromTimestamp(value: unknown): string | undefined {
  return isTimestamp(value) ? value.slice(0, 10) : undefined
}

function normalizeEnvelope(envelope: ParsedEnvelope): ParseHealthDataResult {
  const warnings: ImportWarning[] = []
  if (Object.prototype.hasOwnProperty.call(envelope, 'profile')) {
    warning(
      warnings,
      'profile_ignored',
      'profile',
      '已忽略文件中的个人资料元数据。',
    )
  }

  const dailyRecords = normalizeCollection(
    envelope.dailyRecords,
    'dailyRecords',
    warnings,
    normalizeDailyRecord,
    (record) => record.date,
  )
  const workouts = normalizeCollection(
    envelope.workouts,
    'workouts',
    warnings,
    normalizeWorkout,
    (record) => record.id,
  )
  const bodyMeasurements = normalizeCollection(
    envelope.bodyMeasurements,
    'bodyMeasurements',
    warnings,
    normalizeBodyMeasurement,
    (record) => record.key,
  )

  return {
    ok: true,
    data: {
      schemaVersion: envelope.schemaVersion,
      generatedAt: envelope.generatedAt,
      timezone: envelope.timezone,
      source: envelope.source,
      coverage: envelope.coverage ?? null,
      dailyRecords,
      workouts,
      bodyMeasurements,
    },
    warnings,
  }
}

function normalizeCollection<T>(
  records: unknown[],
  collection: string,
  warnings: ImportWarning[],
  normalize: (
    record: unknown,
    path: string,
    warnings: ImportWarning[],
  ) => T | null,
  getKey: (record: T) => string,
): T[] {
  const normalized = new Map<string, T>()
  records.forEach((record, index) => {
    const path = `${collection}[${index}]`
    const result = normalize(record, path, warnings)
    if (!result) {
      warning(warnings, 'skipped_record', path, '已跳过格式不正确的记录。')
      return
    }
    const key = getKey(result)
    if (normalized.has(key)) {
      warning(
        warnings,
        'duplicate_record_in_file',
        path,
        '文件中存在重复记录，已保留最后一条。',
      )
    }
    normalized.set(key, result)
  })
  return [...normalized.values()]
}

function normalizeDailyRecord(
  value: unknown,
  path: string,
  warnings: ImportWarning[],
): DailyRecord | null {
  if (!isRecord(value) || !isDate(value.date)) {
    return null
  }

  return {
    date: value.date,
    steps: optionalNumber(value.steps, `${path}.steps`, warnings),
    activeEnergyKcal: optionalNumber(
      value.activeEnergyKcal,
      `${path}.activeEnergyKcal`,
      warnings,
    ),
    exerciseMinutes: optionalNumber(
      value.exerciseMinutes,
      `${path}.exerciseMinutes`,
      warnings,
    ),
    standHours: optionalNumber(
      value.standHours,
      `${path}.standHours`,
      warnings,
    ),
    walkingRunningDistanceKm: optionalNumber(
      value.walkingRunningDistanceKm,
      `${path}.walkingRunningDistanceKm`,
      warnings,
    ),
    restingHeartRateBpm: optionalNumber(
      value.restingHeartRateBpm,
      `${path}.restingHeartRateBpm`,
      warnings,
    ),
    hrvSdnnMs: optionalNumber(value.hrvSdnnMs, `${path}.hrvSdnnMs`, warnings),
    sleep: normalizeSleep(value.sleep, `${path}.sleep`, warnings),
  }
}

function normalizeSleep(
  value: unknown,
  path: string,
  warnings: ImportWarning[],
): SleepRecord | null {
  if (value === undefined || value === null) {
    return null
  }
  if (!isRecord(value)) {
    optionalWarning(warnings, path)
    return null
  }

  return {
    start: optionalTimestamp(value.start, `${path}.start`, warnings),
    end: optionalTimestamp(value.end, `${path}.end`, warnings),
    totalMinutes: optionalNumber(
      value.totalMinutes,
      `${path}.totalMinutes`,
      warnings,
    ),
    awakeMinutes: optionalNumber(
      value.awakeMinutes,
      `${path}.awakeMinutes`,
      warnings,
    ),
    coreMinutes: optionalNumber(
      value.coreMinutes,
      `${path}.coreMinutes`,
      warnings,
    ),
    deepMinutes: optionalNumber(
      value.deepMinutes,
      `${path}.deepMinutes`,
      warnings,
    ),
    remMinutes: optionalNumber(
      value.remMinutes,
      `${path}.remMinutes`,
      warnings,
    ),
    source: optionalText(value.source, `${path}.source`, warnings),
  }
}

function normalizeWorkout(
  value: unknown,
  path: string,
  warnings: ImportWarning[],
): Workout | null {
  if (
    !isRecord(value) ||
    !isDate(value.localDate) ||
    !isTimestamp(value.start)
  ) {
    return null
  }

  const rawType = optionalText(
    value.rawType ?? value.type,
    `${path}.rawType`,
    warnings,
  )
  const type = normalizeWorkoutType(rawType)
  if (rawType && type === 'other' && rawType.trim().toLowerCase() !== 'other') {
    warning(
      warnings,
      'unknown_workout_type',
      `${path}.rawType`,
      '未知训练类型已归为其他。',
    )
  }
  const externalId = optionalText(
    value.externalId,
    `${path}.externalId`,
    warnings,
  )
  const source = optionalText(value.source, `${path}.source`, warnings)
  const device = optionalText(value.device, `${path}.device`, warnings)

  return {
    id: createWorkoutKey({
      externalId,
      type,
      start: value.start,
      source,
      device,
    }),
    externalId,
    type,
    rawType,
    localDate: value.localDate,
    start: value.start,
    end: optionalTimestamp(value.end, `${path}.end`, warnings),
    durationMinutes: optionalNumber(
      value.durationMinutes,
      `${path}.durationMinutes`,
      warnings,
    ),
    activeEnergyKcal: optionalNumber(
      value.activeEnergyKcal,
      `${path}.activeEnergyKcal`,
      warnings,
    ),
    distanceMeters: optionalNumber(
      value.distanceMeters,
      `${path}.distanceMeters`,
      warnings,
    ),
    swimmingStrokeCount: optionalNumber(
      value.swimmingStrokeCount,
      `${path}.swimmingStrokeCount`,
      warnings,
    ),
    averageHeartRateBpm: optionalNumber(
      value.averageHeartRateBpm,
      `${path}.averageHeartRateBpm`,
      warnings,
    ),
    maximumHeartRateBpm: optionalNumber(
      value.maximumHeartRateBpm,
      `${path}.maximumHeartRateBpm`,
      warnings,
    ),
    heartRateSamples: normalizeHeartRateSamples(
      value.heartRateSamples,
      `${path}.heartRateSamples`,
      warnings,
    ),
    source,
    device,
  }
}

function normalizeHeartRateSamples(
  value: unknown,
  path: string,
  warnings: ImportWarning[],
): HeartRateSample[] | null {
  if (value === undefined || value === null) {
    return null
  }
  if (!Array.isArray(value) || value.length > MAX_HEART_RATE_SAMPLES) {
    optionalWarning(warnings, path)
    return null
  }

  return value.flatMap((sample, index) => {
    if (!isRecord(sample) || !isTimestamp(sample.timestamp)) {
      optionalWarning(warnings, `${path}[${index}]`)
      return []
    }
    const bpm = optionalNumber(sample.bpm, `${path}[${index}].bpm`, warnings)
    return bpm === null ? [] : [{ timestamp: sample.timestamp, bpm }]
  })
}

function normalizeBodyMeasurement(
  value: unknown,
  path: string,
  warnings: ImportWarning[],
): BodyMeasurement | null {
  if (!isRecord(value) || !isDate(value.date)) {
    return null
  }
  const measuredAt = optionalTimestamp(
    value.measuredAt,
    `${path}.measuredAt`,
    warnings,
  )
  return {
    key: measuredAt ?? value.date,
    date: value.date,
    measuredAt,
    weightKg: optionalNumber(value.weightKg, `${path}.weightKg`, warnings),
    bodyFatPercentage: optionalNumber(
      value.bodyFatPercentage,
      `${path}.bodyFatPercentage`,
      warnings,
    ),
    skeletalMuscleMassKg: optionalNumber(
      value.skeletalMuscleMassKg,
      `${path}.skeletalMuscleMassKg`,
      warnings,
    ),
    waistCm: optionalNumber(value.waistCm, `${path}.waistCm`, warnings),
    source: optionalText(value.source, `${path}.source`, warnings),
  }
}

function optionalNumber(
  value: unknown,
  path: string,
  warnings: ImportWarning[],
): number | null {
  if (value === undefined || value === null) {
    return null
  }
  const numericValue =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && numericStringPattern.test(value.trim())
        ? Number(value.trim())
        : Number.NaN
  if (!Number.isFinite(numericValue) || numericValue < 0) {
    optionalWarning(warnings, path)
    return null
  }
  if (isUnusualMetric(path, numericValue)) {
    warning(
      warnings,
      'invalid_optional_metric',
      path,
      '数值异常偏高，已保留以供确认。',
    )
  }
  return numericValue
}

function optionalText(
  value: unknown,
  path: string,
  warnings: ImportWarning[],
): string | null {
  if (value === undefined || value === null) {
    return null
  }
  if (typeof value !== 'string' || value.length > MAX_TEXT_LENGTH) {
    optionalWarning(warnings, path)
    return null
  }
  return value
}

function optionalTimestamp(
  value: unknown,
  path: string,
  warnings: ImportWarning[],
): string | null {
  if (value === undefined || value === null) {
    return null
  }
  if (!isTimestamp(value)) {
    optionalWarning(warnings, path)
    return null
  }
  return value
}

function optionalWarning(warnings: ImportWarning[], path: string): void {
  warning(warnings, 'invalid_optional_metric', path, '可选数据无效，已忽略。')
}

function isUnusualMetric(path: string, value: number): boolean {
  if (path.endsWith('.steps')) return value > 100_000
  if (path.endsWith('.activeEnergyKcal')) return value > 15_000
  if (path.endsWith('.exerciseMinutes') || path.endsWith('.durationMinutes'))
    return value > 1_440
  if (path.endsWith('.standHours')) return value > 24
  if (path.endsWith('.walkingRunningDistanceKm')) return value > 200
  if (path.endsWith('.distanceMeters')) return value > 300_000
  if (path.endsWith('.restingHeartRateBpm')) return value > 220
  if (
    path.endsWith('.averageHeartRateBpm') ||
    path.endsWith('.maximumHeartRateBpm')
  )
    return value > 300
  if (path.endsWith('.bpm')) return value > 300
  if (path.endsWith('.hrvSdnnMs')) return value > 500
  if (path.endsWith('.swimmingStrokeCount')) return value > 100_000
  return false
}

function warning(
  warnings: ImportWarning[],
  code: ImportWarning['code'],
  path: string,
  message: string,
): void {
  warnings.push({ code, path, message })
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isDate(value: unknown): value is string {
  if (typeof value !== 'string' || !datePattern.test(value)) {
    return false
  }
  const [year, month, day] = value.split('-').map(Number)
  return isValidCalendarDate(year!, month!, day!)
}

function isTimestamp(value: unknown): value is string {
  if (typeof value !== 'string') {
    return false
  }
  const parts = value.match(offsetTimestampPattern)
  if (!parts) {
    return false
  }

  const [, year, month, day, hour, minute, second, offsetHour, offsetMinute] =
    parts
  return (
    isValidCalendarDate(Number(year), Number(month), Number(day)) &&
    isInRange(Number(hour), 0, 23) &&
    isInRange(Number(minute), 0, 59) &&
    (second === undefined || isInRange(Number(second), 0, 59)) &&
    (offsetHour === undefined || isInRange(Number(offsetHour), 0, 23)) &&
    (offsetMinute === undefined || isInRange(Number(offsetMinute), 0, 59))
  )
}

function isValidCalendarDate(
  year: number,
  month: number,
  day: number,
): boolean {
  if (!Number.isInteger(year) || !isInRange(month, 1, 12) || day < 1) {
    return false
  }
  const daysInMonth = [
    31,
    isLeapYear(year) ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ]
  return day <= daysInMonth[month - 1]!
}

function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
}

function isInRange(value: number, minimum: number, maximum: number): boolean {
  return Number.isInteger(value) && value >= minimum && value <= maximum
}

function invalidJson(): ParseHealthDataResult {
  return {
    ok: false,
    error: {
      code: 'invalid_json',
      message: '无法读取该文件，请确认它是有效的 JSON。',
    },
  }
}

function invalidEnvelope(): ParseHealthDataResult {
  return {
    ok: false,
    error: {
      code: 'invalid_envelope',
      message: '该文件不是 FitInsight 健康数据格式。',
    },
  }
}

function unsupportedVersion(): ParseHealthDataResult {
  return {
    ok: false,
    error: { code: 'unsupported_version', message: '该文件版本暂不受支持。' },
  }
}
