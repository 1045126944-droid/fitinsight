import type { EvidenceItem, Recommendation } from '../../types/analysis'
import type { PersonalGoals } from '../../types/profile'

export type RecommendationInput = {
  objective?: PersonalGoals['objective']
  sleepConcern: boolean
  weakRecoveryEvidence: readonly EvidenceItem[]
  swimmingSessionsRemaining: number | null
  strengthSessionsRemaining: number | null
  stepsRemaining: number
  sleepObservedMinutes?: number | null
  sleepTargetMinutes?: number | string | null
}

type Candidate = Omit<Recommendation, 'priority'>

export function generateRecommendations(
  input: RecommendationInput,
): Recommendation[] {
  const candidates: Candidate[] = []
  const recovery = recoveryRecommendation(input)
  if (recovery) candidates.push(recovery)
  const structure = structureRecommendation(input)
  if (structure) candidates.push(structure)
  const steps = stepsRecommendation(input.stepsRemaining)
  if (steps) candidates.push(steps)

  return candidates.slice(0, 3).map((candidate, index) => ({
    ...candidate,
    priority: (index + 1) as 1 | 2 | 3,
  }))
}

function recoveryRecommendation(input: RecommendationInput): Candidate | null {
  const weakRecoveryEvidence = distinctMetrics(input.weakRecoveryEvidence)
  const weakSignals = weakRecoveryEvidence.length
  if (weakSignals >= 2) {
    const evidence = [...weakRecoveryEvidence]
    if (input.sleepConcern) evidence.push(sleepEvidence(input))
    return {
      id: 'recovery-rest',
      title: '可考虑安排完整休息',
      reason: `当前有 ${weakSignals} 项独立恢复信号偏弱，可考虑暂停训练并观察后续个人趋势。`,
      confidence: weakSignals >= 3 ? 'high' : 'medium',
      evidence,
    }
  }
  if (!input.sleepConcern) return null
  const sleep = sleepEvidence(input)
  return {
    id: 'sleep-recovery',
    title: '优先给睡眠留出空间',
    reason:
      typeof input.sleepObservedMinutes === 'number'
        ? `记录到 ${input.sleepObservedMinutes} 分钟睡眠，可先用温和安排支持恢复。`
        : '睡眠证据提示需要关注，但个人基线仍在建立，可先保持温和安排。',
    confidence:
      typeof input.sleepObservedMinutes === 'number' ? 'medium' : 'low',
    evidence: [sleep],
  }
}

function structureRecommendation(input: RecommendationInput): Candidate | null {
  const swimming = knownCount(input.swimmingSessionsRemaining)
  const strength = knownCount(input.strengthSessionsRemaining)
  if ((swimming ?? 0) === 0 && (strength ?? 0) === 0) return null
  const details = [
    swimming !== null && swimming > 0 ? `游泳 ${swimming} 次` : null,
    strength !== null && strength > 0 ? `力量 ${strength} 次` : null,
  ].filter((value): value is string => value !== null)
  const evidence: EvidenceItem[] = []
  if (swimming !== null && swimming > 0)
    evidence.push({
      metric: 'swimmingSessionsRemaining',
      observed: swimming,
      target: 0,
      reason: '依据本周个人游泳训练目标的剩余次数',
    })
  if (strength !== null && strength > 0)
    evidence.push({
      metric: 'strengthSessionsRemaining',
      observed: strength,
      target: 0,
      reason: '依据本周个人力量训练目标的剩余次数',
    })
  const preserveMusclePriority =
    input.objective === 'fatLossPreserveMuscle' &&
    strength !== null &&
    strength > 0
  if (preserveMusclePriority)
    evidence.unshift({
      metric: 'objective',
      observed: '减脂并尽量保留肌肉',
      target: '完成已设置的每周力量训练目标',
      reason: '仅依据用户明确设置的目标，不从身体成分推断效果',
    })
  return {
    id: 'weekly-structure',
    title: preserveMusclePriority
      ? '在恢复允许时优先补齐力量训练'
      : '补齐本周训练结构',
    reason: preserveMusclePriority
      ? `你设置了“减脂并尽量保留肌肉”目标，本周明确的力量训练目标还剩 ${strength} 次；可结合恢复状态温和安排。`
      : `本周目标还剩${details.join('、')}；可结合恢复状态择一安排。`,
    confidence: 'high',
    evidence,
  }
}

function stepsRecommendation(remainingInput: number): Candidate | null {
  const remaining = finiteCount(remainingInput)
  if (remaining === 0) return null
  return {
    id: 'steps-progress',
    title: '用轻松步行接近日目标',
    reason: `距离个人步数目标还剩 ${remaining} 步，可按当日感受分段完成。`,
    confidence: 'high',
    evidence: [
      {
        metric: 'stepsRemaining',
        observed: remaining,
        target: 0,
        reason: '依据今日已记录步数与个人步数目标之差',
      },
    ],
  }
}

function sleepEvidence(input: RecommendationInput): EvidenceItem {
  const observed = input.sleepObservedMinutes
  return {
    metric: 'sleepConcern',
    observed:
      typeof observed === 'number' && Number.isFinite(observed)
        ? observed
        : '个人基线建立中',
    target: input.sleepTargetMinutes ?? null,
    reason: '睡眠建议只依据已提供的睡眠证据，不作医学推断',
  }
}

function finiteCount(value: number): number {
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0
}

function knownCount(value: number | null): number | null {
  return value === null ? null : finiteCount(value)
}

function distinctMetrics(evidence: readonly EvidenceItem[]): EvidenceItem[] {
  const byMetric = new Map<string, EvidenceItem>()
  for (const item of evidence) {
    const metric = item.metric.trim()
    if (metric && !byMetric.has(metric)) byMetric.set(metric, item)
  }
  return [...byMetric.values()]
}
