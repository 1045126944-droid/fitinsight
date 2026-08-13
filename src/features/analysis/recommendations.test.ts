import { generateRecommendations } from './recommendations'

const weakRecoveryEvidence = (metric: string) => ({
  metric,
  observed: '偏弱',
  target: '个人基线',
  reason: '合成弱恢复证据',
})

test('duplicate recovery metrics cannot trigger complete rest but two distinct metrics can', () => {
  const common = {
    sleepConcern: false,
    swimmingSessionsRemaining: 0,
    strengthSessionsRemaining: 0,
    stepsRemaining: 0,
  }

  const duplicated = generateRecommendations({
    ...common,
    weakRecoveryEvidence: [
      weakRecoveryEvidence('restingHeartRateDifference'),
      weakRecoveryEvidence('restingHeartRateDifference'),
    ],
  })
  const distinct = generateRecommendations({
    ...common,
    weakRecoveryEvidence: [
      weakRecoveryEvidence('restingHeartRateDifference'),
      weakRecoveryEvidence('hrvRatio'),
    ],
  })

  expect(duplicated.map((item) => item.id)).not.toContain('recovery-rest')
  expect(distinct.map((item) => item.id)).toContain('recovery-rest')
  expect(distinct[0]!.evidence.map((item) => item.metric)).toEqual([
    'restingHeartRateDifference',
    'hrvRatio',
  ])
})

test('returns at most three evidence-backed recommendations in priority order', () => {
  const recommendations = generateRecommendations({
    sleepConcern: true,
    weakRecoveryEvidence: [
      weakRecoveryEvidence('restingHeartRateDifference'),
      weakRecoveryEvidence('hrvRatio'),
    ],
    swimmingSessionsRemaining: 0,
    strengthSessionsRemaining: 1,
    stepsRemaining: 1800,
  })

  expect(recommendations).toHaveLength(3)
  expect(recommendations.map((item) => item.priority)).toEqual([1, 2, 3])
  expect(recommendations.map((item) => item.id)).toEqual([
    'recovery-rest',
    'weekly-structure',
    'steps-progress',
  ])
  expect(recommendations.every((item) => item.reason.length > 0)).toBe(true)
  expect(recommendations.every((item) => item.evidence.length > 0)).toBe(true)
})

test('does not recommend complete rest from only one weak recovery signal', () => {
  const recommendations = generateRecommendations({
    sleepConcern: true,
    weakRecoveryEvidence: [weakRecoveryEvidence('restingHeartRateDifference')],
    swimmingSessionsRemaining: 0,
    strengthSessionsRemaining: 0,
    stepsRemaining: 0,
  })

  expect(recommendations).toHaveLength(1)
  expect(recommendations[0]).toEqual(
    expect.objectContaining({ id: 'sleep-recovery', priority: 1 }),
  )
  expect(recommendations[0]!.title).not.toContain('完整休息')
})

test('allows complete-rest advice only at two independent weak-recovery signals', () => {
  const recommendations = generateRecommendations({
    sleepConcern: false,
    weakRecoveryEvidence: [
      weakRecoveryEvidence('restingHeartRateDifference'),
      weakRecoveryEvidence('hrvRatio'),
    ],
    swimmingSessionsRemaining: 0,
    strengthSessionsRemaining: 0,
    stepsRemaining: 0,
  })

  expect(recommendations).toEqual([
    expect.objectContaining({
      id: 'recovery-rest',
      reason: expect.stringContaining('2 项独立'),
    }),
  ])
})

test('orders weekly structure before steps and includes concrete remaining values', () => {
  const recommendations = generateRecommendations({
    sleepConcern: false,
    weakRecoveryEvidence: [],
    swimmingSessionsRemaining: 1,
    strengthSessionsRemaining: 2,
    stepsRemaining: 900,
  })

  expect(recommendations.map((item) => item.id)).toEqual([
    'weekly-structure',
    'steps-progress',
  ])
  expect(recommendations.map((item) => item.priority)).toEqual([1, 2])
  expect(recommendations[0]!.reason).toContain('游泳 1 次、力量 2 次')
  expect(recommendations[1]!.reason).toContain('900 步')
})

test('uses an explicit preserve-muscle objective to prioritize a missing strength target', () => {
  const recommendations = generateRecommendations({
    objective: 'fatLossPreserveMuscle',
    sleepConcern: false,
    weakRecoveryEvidence: [],
    swimmingSessionsRemaining: 0,
    strengthSessionsRemaining: 1,
    stepsRemaining: 0,
  })

  expect(recommendations[0]).toMatchObject({
    id: 'weekly-structure',
    title: '在恢复允许时优先补齐力量训练',
    evidence: expect.arrayContaining([
      expect.objectContaining({
        metric: 'objective',
        observed: '减脂并尽量保留肌肉',
      }),
      expect.objectContaining({
        metric: 'strengthSessionsRemaining',
        observed: 1,
      }),
    ]),
  })
  expect(JSON.stringify(recommendations)).not.toMatch(
    /体脂率|体脂肪量|必须|一定/,
  )
})

test('uses baseline-building wording when a sleep concern lacks a concrete value', () => {
  const recommendations = generateRecommendations({
    sleepConcern: true,
    weakRecoveryEvidence: [],
    swimmingSessionsRemaining: 0,
    strengthSessionsRemaining: 0,
    stepsRemaining: 0,
  })

  expect(recommendations[0]!.evidence[0]).toEqual(
    expect.objectContaining({ observed: '个人基线建立中' }),
  )
  expect(JSON.stringify(recommendations)).not.toMatch(/必须|一定|诊断/)
})
