import type { BodyMeasurement } from '../../types/health-data'
import { estimateWeightChangePerWeek } from './weight-trend'

function measurement(date: string, weightKg: number | null): BodyMeasurement {
  return {
    key: date,
    date,
    measuredAt: null,
    weightKg,
    bodyFatPercentage: null,
    skeletalMuscleMassKg: null,
    waistCm: null,
    source: null,
  }
}

test('does not judge weekly weight change with fewer than six points or fourteen days', () => {
  const result = estimateWeightChangePerWeek([
    measurement('2026-07-26', 80.4),
    measurement('2026-07-30', 80.1),
    measurement('2026-08-01', 79.9),
  ])

  expect(result.kgPerWeek).toBeNull()
  expect(result.confidence).toBe('building')
})

test('uses date-only regression and assigns high confidence after twenty-one days', () => {
  const result = estimateWeightChangePerWeek([
    measurement('2026-07-01', 80),
    measurement('2026-07-05', 79.8),
    measurement('2026-07-10', 79.55),
    measurement('2026-07-15', 79.3),
    measurement('2026-07-20', 79.05),
    measurement('2026-07-22', 78.95),
  ])

  expect(result.kgPerWeek).toBeCloseTo(-0.35)
  expect(result.confidence).toBe('high')
  expect(result.pointCount).toBe(6)
  expect(result.spanDays).toBe(21)
})
