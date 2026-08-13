import { calculateSwimPaceSecondsPer100m } from './swimming'

test('calculates elapsed swimming pace', () => {
  expect(calculateSwimPaceSecondsPer100m(45, 1500)).toBe(180)
})

test('rejects zero and invalid swimming measurements', () => {
  expect(calculateSwimPaceSecondsPer100m(45, 0)).toBeNull()
  expect(calculateSwimPaceSecondsPer100m(0, 1500)).toBeNull()
  expect(calculateSwimPaceSecondsPer100m(Number.NaN, 1500)).toBeNull()
})
