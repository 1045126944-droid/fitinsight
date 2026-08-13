import type { EvidenceItem, ScoreResult } from '../../types/analysis'

export type WeightedPart = {
  score: number | null
  weight: number
  coverage: number
  applicable: boolean
  evidence: EvidenceItem[]
}

export function combineWeightedScores(parts: WeightedPart[]): ScoreResult {
  const applicable = parts.filter((part) => part.applicable)
  const totalWeight = applicable.reduce((sum, part) => sum + part.weight, 0)
  const available = applicable.filter((part) => part.score !== null)
  const effectiveWeight = available.reduce(
    (sum, part) => sum + part.weight * part.coverage,
    0,
  )
  const coverage = totalWeight === 0 ? 0 : effectiveWeight / totalWeight
  const evidence = available.flatMap((part) => part.evidence)
  if (coverage < 0.6 || effectiveWeight === 0) {
    return { score: null, coverage, confidence: 'building', evidence }
  }
  const weighted = available.reduce(
    (sum, part) => sum + (part.score ?? 0) * part.weight * part.coverage,
    0,
  )
  return {
    score: Math.round(weighted / effectiveWeight),
    coverage,
    confidence: coverage >= 0.9 ? 'high' : coverage >= 0.75 ? 'medium' : 'low',
    evidence,
  }
}
