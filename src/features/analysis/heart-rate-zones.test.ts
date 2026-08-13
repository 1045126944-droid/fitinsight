import type { UserProfile } from '../../types/profile'
import {
  resolveMaximumHeartRate,
  summarizeHeartRateZones,
} from './heart-rate-zones'

const profile = (overrides: Partial<UserProfile> = {}): UserProfile => ({
  id: 'current',
  name: '',
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
    objective: null,
    dailySteps: null,
    weeklyWorkoutDays: null,
    weeklySwimmingSessions: null,
    weeklyStrengthSessions: null,
    weeklyModerateMinutes: null,
    sleepMinMinutes: null,
    sleepMaxMinutes: null,
    targetWeightRangeKg: null,
    longTermWeightRangeKg: null,
    targetWeeklyWeightLossKg: null,
    targetBodyFatPercentage: null,
  },
  updatedAt: '2026-08-01T00:00:00Z',
  ...overrides,
})

test('prefers a local maximum heart-rate override and otherwise uses age', () => {
  expect(
    resolveMaximumHeartRate(
      profile({
        maximumHeartRateBpm: 193,
        ageAsOf: { age: 50, date: '2026-08-01' },
      }),
    ),
  ).toBe(193)
  expect(
    resolveMaximumHeartRate(
      profile({ ageAsOf: { age: 50, date: '2026-08-01' } }),
    ),
  ).toBe(173)
  expect(resolveMaximumHeartRate(profile())).toBeNull()
})

test('calculates age against an explicit local reference date', () => {
  expect(
    resolveMaximumHeartRate(profile({ birthDate: '2000-08-02' }), '2026-08-01'),
  ).toBe(191)
  expect(
    resolveMaximumHeartRate(profile({ birthDate: '2000-08-02' }), '2026-08-02'),
  ).toBe(190)
  expect(
    resolveMaximumHeartRate(profile({ birthDate: '2026-08-02' }), '2026-08-01'),
  ).toBeNull()
  expect(
    resolveMaximumHeartRate(
      profile({ ageAsOf: { age: 50, date: '2020-08-02' } }),
      '2026-08-01',
    ),
  ).toBe(170)
  expect(
    resolveMaximumHeartRate(
      profile({ ageAsOf: { age: 50, date: '2020-08-02' } }),
      '2026-08-02',
    ),
  ).toBe(169)
  expect(
    resolveMaximumHeartRate(
      profile({ ageAsOf: { age: 50, date: '2026-08-02' } }),
      '2026-08-01',
    ),
  ).toBeNull()
  expect(resolveMaximumHeartRate(profile(), '2026-02-30')).toBeNull()
})

test('uses inclusive lower and exclusive upper bounds, including maximum in zone 5', () => {
  const zones = summarizeHeartRateZones(
    [
      { timestamp: '2026-08-01T18:00:00+08:00', bpm: 100 },
      { timestamp: '2026-08-01T18:00:05+08:00', bpm: 120 },
      { timestamp: '2026-08-01T18:00:10+08:00', bpm: 193 },
    ],
    193,
  )

  expect(zones?.map((zone) => zone.sampleCount)).toEqual([1, 1, 0, 0, 1])
  expect(summarizeHeartRateZones(null, 193)).toBeNull()
})

test('caps sparse-sample duration and leaves out-of-range values unzoned', () => {
  const zones = summarizeHeartRateZones(
    [
      { timestamp: '2026-08-01T18:00:00Z', bpm: 100 },
      { timestamp: '2026-08-01T18:02:00Z', bpm: 120 },
      { timestamp: '2026-08-01T18:02:05Z', bpm: 40 },
      { timestamp: '2026-08-01T18:02:10Z', bpm: 200 },
    ],
    199,
  )

  expect(zones?.map((zone) => zone.durationSeconds)).toEqual([30, 5, 0, 0, 0])
  expect(zones?.reduce((total, zone) => total + zone.sampleCount, 0)).toBe(2)
})

test('sorts timestamped samples and assigns exact percentage boundaries once', () => {
  const zones = summarizeHeartRateZones(
    [
      { timestamp: '2026-08-01T18:00:25Z', bpm: 200 },
      { timestamp: 'invalid', bpm: 150 },
      { timestamp: '2026-08-01T18:00:10Z', bpm: 140 },
      { timestamp: '2026-08-01T18:00:35Z', bpm: 201 },
      { timestamp: '2026-08-01T18:00:00Z', bpm: 100 },
      { timestamp: '2026-08-01T18:00:30Z', bpm: 99 },
      { timestamp: '2026-08-01T18:00:20Z', bpm: 180 },
      { timestamp: '2026-08-01T18:00:05Z', bpm: 120 },
      { timestamp: '2026-08-01T18:00:15Z', bpm: 160 },
    ],
    200,
  )

  expect(zones?.map((zone) => zone.sampleCount)).toEqual([1, 1, 1, 1, 2])
  expect(zones?.map((zone) => zone.durationSeconds)).toEqual([5, 5, 5, 5, 10])
})
