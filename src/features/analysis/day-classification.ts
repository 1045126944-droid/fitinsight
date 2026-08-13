import type { Workout } from '../../types/health-data'
import type { DayClassification } from '../../types/analysis'

type ClassificationWorkout = Pick<Workout, 'type'>

export type DayClassificationInput = {
  workouts: readonly ClassificationWorkout[]
  workoutsCovered: boolean
}

export function classifyDay(input: DayClassificationInput): DayClassification {
  if (input.workouts.some((workout) => workout.type !== 'walking'))
    return 'training'
  if (input.workouts.length > 0) return 'activeRecovery'
  return input.workoutsCovered ? 'rest' : 'insufficientData'
}
