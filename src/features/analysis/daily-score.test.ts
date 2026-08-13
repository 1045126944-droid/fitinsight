import type { DailyAnalysisInput, ScoreResult } from '../../types/analysis'
import { calculateDailyAnalysis } from './daily-score'

function scoreResult(
  score: number,
  coverage = 1,
  metric = 'fixture',
): ScoreResult {
  return {
    score,
    coverage,
    confidence: coverage >= 0.9 ? 'high' : coverage >= 0.75 ? 'medium' : 'low',
    evidence: [{ metric, observed: score, target: 80, reason: '合成证据' }],
  }
}

function unavailableScore(): ScoreResult {
  return { score: null, coverage: 0, confidence: 'building', evidence: [] }
}

function input(
  overrides: Partial<DailyAnalysisInput> = {},
): DailyAnalysisInput {
  return {
    dayType: 'training',
    plannedRestDay: false,
    activityScore: scoreResult(80, 1, 'activity'),
    workoutScore: scoreResult(80, 1, 'workout'),
    sleepScore: scoreResult(80, 1, 'sleep'),
    recoveryScore: scoreResult(80, 1, 'recovery'),
    weeklyStructureScore: scoreResult(80, 1, 'weeklyStructure'),
    ...overrides,
  }
}

test('a planned rest day is not penalized for having no workout', () => {
  const analysis = calculateDailyAnalysis(
    input({
      dayType: 'rest',
      plannedRestDay: true,
      activityScore: scoreResult(78, 1, 'activity'),
      workoutScore: unavailableScore(),
      sleepScore: scoreResult(82, 1, 'sleep'),
      recoveryScore: scoreResult(80, 1, 'recovery'),
      weeklyStructureScore: scoreResult(70, 1, 'weeklyStructure'),
    }),
  )

  expect(analysis.score.score).toBe(79)
  expect(analysis.score.coverage).toBe(1)
  expect(analysis.score.evidence.map((item) => item.metric)).not.toContain(
    'workoutMissing',
  )
})

test('does not show a number when evidence coverage is below sixty percent', () => {
  const analysis = calculateDailyAnalysis(
    input({
      activityScore: scoreResult(75, 1, 'activity'),
      sleepScore: unavailableScore(),
      recoveryScore: unavailableScore(),
      weeklyStructureScore: unavailableScore(),
      workoutScore: unavailableScore(),
    }),
  )

  expect(analysis.score.score).toBeNull()
  expect(analysis.status).toBe('数据不足')
})

test('shows a numeric daily score at exactly sixty percent evidence coverage', () => {
  const analysis = calculateDailyAnalysis(
    input({
      activityScore: scoreResult(80, 1, 'activity'),
      workoutScore: scoreResult(80, 1, 'workout'),
      sleepScore: scoreResult(80, 0.4, 'sleep'),
      recoveryScore: unavailableScore(),
      weeklyStructureScore: unavailableScore(),
    }),
  )

  expect(analysis.score.score).toBe(80)
  expect(analysis.score.coverage).toBeCloseTo(0.6)
  expect(analysis.status).toBe('基本达标')
})

test.each([
  { score: 85, status: '状态很好' },
  { score: 84, status: '基本达标' },
  { score: 70, status: '基本达标' },
  { score: 69, status: '部分不足' },
  { score: 55, status: '部分不足' },
  { score: 54, status: '明显不足' },
  { score: 40, status: '明显不足' },
  { score: 39, status: '活动或恢复不足' },
] as const)(
  'maps $score to the approved status $status',
  ({ score, status }) => {
    expect(
      calculateDailyAnalysis(
        input({
          activityScore: scoreResult(score, 1, 'activity'),
          workoutScore: scoreResult(score, 1, 'workout'),
          sleepScore: scoreResult(score, 1, 'sleep'),
          recoveryScore: scoreResult(score, 1, 'recovery'),
          weeklyStructureScore: scoreResult(score, 1, 'weeklyStructure'),
        }),
      ).status,
    ).toBe(status)
  },
)
