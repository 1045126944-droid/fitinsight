import type { WorkoutIdentityInput } from './import-types'

export function createWorkoutKey(workout: WorkoutIdentityInput): string {
  if (workout.externalId) {
    return `external:${workout.externalId}`
  }

  return `fallback:${[
    workout.type,
    workout.start,
    workout.source ?? '',
    workout.device ?? '',
  ]
    .map((part) => encodeURIComponent(part))
    .join('|')}`
}
