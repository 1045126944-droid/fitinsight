import type { SleepRecord } from '../../types/health-data'
import { calculateSleepScore } from './sleep-score'

function sleep(overrides: Partial<SleepRecord> = {}): SleepRecord {
  return {
    start: '2026-07-31T22:30:00+08:00',
    end: '2026-08-01T06:30:00+08:00',
    totalMinutes: 450,
    awakeMinutes: 30,
    coreMinutes: 270,
    deepMinutes: 90,
    remMinutes: 90,
    source: 'Synthetic Watch',
    ...overrides,
  }
}

test('missing sleep stages redistributes weight instead of scoring them as zero', () => {
  const result = calculateSleepScore({
    sleep: sleep({ coreMinutes: null, deepMinutes: null, remMinutes: null }),
    baselineSleepMidpointMinutes: 150,
  })

  expect(result.score).not.toBeNull()
  expect(result.score).toBeGreaterThanOrEqual(80)
  expect(result.coverage).toBeCloseTo(0.9)
  expect(result.evidence.map((item) => item.metric)).not.toContain(
    'sleepStageCompleteness',
  )
})

test.each([
  {
    totalMinutes: 300,
    end: '2026-08-01T01:00:00Z',
    midpoint: 1350,
    expected: 76,
  },
  {
    totalMinutes: 330,
    end: '2026-08-01T01:30:00Z',
    midpoint: 1365,
    expected: 82,
  },
  {
    totalMinutes: 360,
    end: '2026-08-01T02:00:00Z',
    midpoint: 1380,
    expected: 88,
  },
  {
    totalMinutes: 390,
    end: '2026-08-01T02:30:00Z',
    midpoint: 1395,
    expected: 94,
  },
  {
    totalMinutes: 420,
    end: '2026-08-01T03:00:00Z',
    midpoint: 1410,
    expected: 100,
  },
  {
    totalMinutes: 540,
    end: '2026-08-01T05:00:00Z',
    midpoint: 30,
    expected: 100,
  },
])(
  'uses the specified duration curve at $totalMinutes minutes',
  ({ totalMinutes, end, midpoint, expected }) => {
    const result = calculateSleepScore({
      sleep: sleep({
        start: '2026-07-31T20:00:00Z',
        end,
        totalMinutes,
        awakeMinutes: 0,
        coreMinutes: totalMinutes * 0.6,
        deepMinutes: totalMinutes * 0.2,
        remMinutes: totalMinutes * 0.2,
      }),
      baselineSleepMidpointMinutes: midpoint,
    })

    expect(result.score).toBe(expected)
    expect(result.coverage).toBe(1)
    expect(result.confidence).toBe('high')
  },
)

test('stage completeness reflects presence and duration consistency only', () => {
  const result = calculateSleepScore({
    sleep: sleep({ coreMinutes: 150, deepMinutes: 50, remMinutes: 50 }),
    baselineSleepMidpointMinutes: 150,
  })

  expect(result.evidence).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        metric: 'sleepStageCompleteness',
        observed: '3/3 stages; 250/450 minutes',
      }),
    ]),
  )
})

test('returns building evidence rather than treating absent sleep as zero', () => {
  expect(
    calculateSleepScore({
      sleep: null,
      baselineSleepMidpointMinutes: null,
    }),
  ).toEqual({
    score: null,
    coverage: 0,
    confidence: 'building',
    evidence: [],
  })
})
