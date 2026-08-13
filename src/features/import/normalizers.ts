import type { WorkoutType } from '../../types/health-data'

const workoutTypeAliases: Record<string, WorkoutType> = {
  poolswimming: 'poolSwimming',
  poolswim: 'poolSwimming',
  泳池游泳: 'poolSwimming',
  'pool swimming': 'poolSwimming',
  openwaterswimming: 'openWaterSwimming',
  'open water swimming': 'openWaterSwimming',
  公开水域游泳: 'openWaterSwimming',
  开放水域游泳: 'openWaterSwimming',
  traditionalstrength: 'traditionalStrength',
  'traditional strength training': 'traditionalStrength',
  传统力量训练: 'traditionalStrength',
  functionalstrength: 'functionalStrength',
  'functional strength training': 'functionalStrength',
  功能性力量训练: 'functionalStrength',
  walking: 'walking',
  walk: 'walking',
  步行: 'walking',
  running: 'running',
  run: 'running',
  跑步: 'running',
}

const controlledWorkoutTypes = new Set<WorkoutType>([
  'poolSwimming',
  'openWaterSwimming',
  'traditionalStrength',
  'functionalStrength',
  'walking',
  'running',
  'other',
])

export function normalizeWorkoutType(rawType: string | null): WorkoutType {
  if (!rawType) {
    return 'other'
  }

  if (controlledWorkoutTypes.has(rawType as WorkoutType)) {
    return rawType as WorkoutType
  }

  return workoutTypeAliases[rawType.trim().toLowerCase()] ?? 'other'
}
