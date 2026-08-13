import type { Workout } from '../../types/health-data'
import { classifyDay } from './day-classification'

const workout = (type: Workout['type']): Pick<Workout, 'type'> => ({ type })

test('does not classify an uncovered empty workout list as rest', () => {
  expect(classifyDay({ workouts: [], workoutsCovered: false })).toBe(
    'insufficientData',
  )
})

test('covered empty workouts prove rest while walking-only evidence is active recovery', () => {
  expect(classifyDay({ workouts: [], workoutsCovered: true })).toBe('rest')
  expect(
    classifyDay({ workouts: [workout('walking')], workoutsCovered: true }),
  ).toBe('activeRecovery')
})

test('a recorded training workout proves training even without complete query coverage', () => {
  expect(
    classifyDay({
      workouts: [workout('poolSwimming')],
      workoutsCovered: false,
    }),
  ).toBe('training')
})
