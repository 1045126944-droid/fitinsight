import type { ScoreResult } from '../../types/analysis'
import { calculateRecoveryScore } from './recovery-score'

function scoreResult(score: number, coverage = 1): ScoreResult {
  return {
    score,
    coverage,
    confidence: coverage >= 0.9 ? 'high' : 'medium',
    evidence: [
      { metric: 'sleep', observed: score, target: 85, reason: '睡眠得分' },
    ],
  }
}

test('missing HRV redistributes recovery weight and lowers confidence', () => {
  const result = calculateRecoveryScore({
    sleepScore: scoreResult(85),
    restingHeartRateBpm: 63,
    restingHeartRateBaselineBpm: 62,
    hrvSdnnMs: null,
    hrvBaselineMs: 48,
    workoutMinutesLast72h: 95,
    consecutiveTrainingDays: 2,
  })

  expect(result.score).not.toBeNull()
  expect(result.coverage).toBeCloseTo(0.8)
  expect(result.confidence).toBe('low')
  expect(result.evidence.map((item) => item.metric)).not.toContain('hrvRatio')
})

test('uses personal resting-heart-rate difference and HRV ratio', () => {
  const result = calculateRecoveryScore({
    sleepScore: scoreResult(100),
    restingHeartRateBpm: 67,
    restingHeartRateBaselineBpm: 62,
    hrvSdnnMs: 36,
    hrvBaselineMs: 48,
    workoutMinutesLast72h: 60,
    consecutiveTrainingDays: 1,
  })

  expect(result.score).toBe(85)
  expect(result.coverage).toBe(1)
  expect(result.evidence).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        metric: 'restingHeartRateDifference',
        observed: 5,
      }),
      expect.objectContaining({ metric: 'hrvRatio', observed: '75%' }),
    ]),
  )
})

test('missing personal baselines reduce coverage instead of becoming population targets', () => {
  const result = calculateRecoveryScore({
    sleepScore: scoreResult(80),
    restingHeartRateBpm: 61,
    restingHeartRateBaselineBpm: null,
    hrvSdnnMs: 45,
    hrvBaselineMs: null,
    workoutMinutesLast72h: 40,
    consecutiveTrainingDays: 1,
  })

  expect(result.score).toBeNull()
  expect(result.coverage).toBeCloseTo(0.55)
  expect(result.confidence).toBe('building')
  expect(result.evidence.map((item) => item.metric)).toEqual([
    'sleep',
    'recentLoadProxy',
  ])
})
