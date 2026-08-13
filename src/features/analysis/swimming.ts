export function calculateSwimPaceSecondsPer100m(
  durationMinutes: number | null,
  distanceMeters: number | null,
): number | null {
  if (!isPositiveFinite(durationMinutes) || !isPositiveFinite(distanceMeters))
    return null
  return (durationMinutes * 60 * 100) / distanceMeters
}

function isPositiveFinite(value: number | null): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
}
