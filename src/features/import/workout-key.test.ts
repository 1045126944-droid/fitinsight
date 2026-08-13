import { createWorkoutKey } from './workout-key'

test('fallback workout identity ignores later calorie corrections', () => {
  const identity = {
    type: 'poolSwimming' as const,
    start: '2026-07-28T18:30:00+08:00',
    source: 'Apple Watch',
    device: 'Apple Watch',
  }

  expect(createWorkoutKey(identity)).toBe(createWorkoutKey(identity))
  expect(createWorkoutKey(identity)).toBe(
    'fallback:poolSwimming|2026-07-28T18%3A30%3A00%2B08%3A00|Apple%20Watch|Apple%20Watch',
  )
})

test('uses a supplied external identifier as the stable workout key', () => {
  expect(
    createWorkoutKey({
      externalId: 'workout-42',
      type: 'running',
      start: '2026-07-28T18:30:00+08:00',
      source: null,
      device: null,
    }),
  ).toBe('external:workout-42')
})
