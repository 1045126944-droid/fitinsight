import { combineWeightedScores } from './score-utils'

const evidence = [
  { metric: 'steps', observed: 6000, target: 8000, reason: '步数进度' },
]

test('shows a score at exactly sixty percent applicable evidence coverage', () => {
  expect(
    combineWeightedScores([
      { score: 80, weight: 1, coverage: 0.6, applicable: true, evidence },
    ]),
  ).toEqual({ score: 80, coverage: 0.6, confidence: 'low', evidence })
})

test('does not show a score immediately below sixty percent coverage', () => {
  expect(
    combineWeightedScores([
      { score: 80, weight: 1, coverage: 0.599, applicable: true, evidence },
    ]),
  ).toEqual({
    score: null,
    coverage: 0.599,
    confidence: 'building',
    evidence,
  })
})

test('redistributes missing values without inserting a zero into the numerator', () => {
  const result = combineWeightedScores([
    { score: 90, weight: 3, coverage: 1, applicable: true, evidence },
    { score: null, weight: 1, coverage: 0, applicable: true, evidence: [] },
  ])

  expect(result).toEqual({
    score: 90,
    coverage: 0.75,
    confidence: 'medium',
    evidence,
  })
})

test('removes non-applicable weight from both score and coverage', () => {
  const result = combineWeightedScores([
    { score: 80, weight: 3, coverage: 1, applicable: true, evidence },
    { score: null, weight: 2, coverage: 0, applicable: false, evidence: [] },
  ])

  expect(result).toEqual({
    score: 80,
    coverage: 1,
    confidence: 'high',
    evidence,
  })
})
