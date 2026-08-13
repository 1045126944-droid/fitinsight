import type { DailyRecord } from '../../types/health-data'
import { calculateActivityScore } from './activity-score'

function daily(overrides: Partial<DailyRecord> = {}): DailyRecord {
  return {
    date: '2026-08-01',
    steps: 6000,
    activeEnergyKcal: null,
    exerciseMinutes: 999,
    standHours: null,
    walkingRunningDistanceKm: null,
    restingHeartRateBpm: null,
    hrvSdnnMs: null,
    sleep: null,
    ...overrides,
  }
}

test('scores steps primarily, caps the score, and never uses exercise minutes', () => {
  const result = calculateActivityScore(
    daily({ steps: 8800, standHours: 10 }),
    {
      dailySteps: 8000,
    },
  )

  expect(result.score).toBe(98)
  expect(result.evidence).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ metric: 'steps', observed: '110%' }),
    ]),
  )
  expect(result.evidence.map((item) => item.metric)).not.toContain(
    'exerciseMinutes',
  )
})

test('missing optional stand hours lowers coverage but does not become zero', () => {
  const result = calculateActivityScore(daily(), { dailySteps: 8000 })

  expect(result.score).toBe(75)
  expect(result.coverage).toBeCloseTo(0.85)
  expect(result.confidence).toBe('medium')
})
