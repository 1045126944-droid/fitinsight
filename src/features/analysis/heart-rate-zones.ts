import type { HeartRateSample } from '../../types/health-data'
import type {
  HeartRateZoneInput,
  HeartRateZoneSummary,
  MaximumHeartRateProfile,
} from '../../types/analysis'
import { isValidDateOnly } from '../../utils/date-only'

const maximumAttributionSeconds = 30

export function resolveMaximumHeartRate(
  profile: MaximumHeartRateProfile,
  referenceDate = currentUtcDate(),
): number | null {
  if (isPositiveFinite(profile.maximumHeartRateBpm))
    return profile.maximumHeartRateBpm
  const age = ageFor(profile, referenceDate)
  return age === null ? null : Math.round(208 - 0.7 * age)
}

export function summarizeHeartRateZones(
  samples: HeartRateZoneInput,
  maximumHeartRate: number | null,
): HeartRateZoneSummary[] | null {
  if (!samples || !isPositiveFinite(maximumHeartRate)) return null
  const timestamped = samples
    .map((sample) => ({ sample, time: new Date(sample.timestamp).getTime() }))
    .filter(
      (entry): entry is { sample: HeartRateSample; time: number } =>
        Number.isFinite(entry.time) && isPositiveFinite(entry.sample.bpm),
    )
    .sort((left, right) => left.time - right.time)
  if (timestamped.length === 0) return null

  const zones = createZones(maximumHeartRate)
  for (const [index, entry] of timestamped.entries()) {
    const zone = zoneFor(entry.sample.bpm, maximumHeartRate)
    if (zone === null) continue
    const summary = zones[zone - 1]!
    summary.sampleCount += 1
    const next = timestamped[index + 1]
    if (next)
      summary.durationSeconds += Math.min(
        maximumAttributionSeconds,
        Math.max(0, (next.time - entry.time) / 1000),
      )
  }
  return zones
}

function createZones(maximumHeartRate: number): HeartRateZoneSummary[] {
  return [1, 2, 3, 4, 5].map((zone) => ({
    zone: zone as HeartRateZoneSummary['zone'],
    minimumBpm: maximumHeartRate * (0.4 + zone * 0.1),
    maximumBpm: maximumHeartRate * (0.5 + zone * 0.1),
    sampleCount: 0,
    durationSeconds: 0,
  }))
}

function zoneFor(
  bpm: number,
  maximumHeartRate: number,
): 1 | 2 | 3 | 4 | 5 | null {
  if (bpm < maximumHeartRate * 0.5 || bpm > maximumHeartRate) return null
  if (bpm < maximumHeartRate * 0.6) return 1
  if (bpm < maximumHeartRate * 0.7) return 2
  if (bpm < maximumHeartRate * 0.8) return 3
  if (bpm < maximumHeartRate * 0.9) return 4
  return 5
}

function ageFor(
  profile: MaximumHeartRateProfile,
  referenceDate: string,
): number | null {
  if (!isValidDateOnly(referenceDate)) return null
  if (profile.birthDate) {
    return isValidDateOnly(profile.birthDate)
      ? completedCalendarYears(profile.birthDate, referenceDate)
      : null
  }
  const ageAsOf = profile.ageAsOf
  if (
    !ageAsOf ||
    !isNonNegativeInteger(ageAsOf.age) ||
    !isValidDateOnly(ageAsOf.date) ||
    ageAsOf.date > referenceDate
  ) {
    return null
  }
  const elapsedYears = completedCalendarYears(ageAsOf.date, referenceDate)
  return elapsedYears === null ? null : ageAsOf.age + elapsedYears
}

function completedCalendarYears(
  fromDate: string,
  toDate: string,
): number | null {
  const [fromYear, fromMonth, fromDay] = fromDate.split('-').map(Number)
  const [toYear, toMonth, toDay] = toDate.split('-').map(Number)
  let years = toYear! - fromYear!
  if (toMonth! < fromMonth! || (toMonth === fromMonth && toDay! < fromDay!)) {
    years -= 1
  }
  return years >= 0 ? years : null
}

function currentUtcDate(): string {
  return new Date().toISOString().slice(0, 10)
}

function isPositiveFinite(value: number | null): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
}

function isNonNegativeInteger(value: number | undefined): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0
}
