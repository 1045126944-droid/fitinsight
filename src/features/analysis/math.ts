const minutesPerDay = 1_440

export function mean(values: readonly number[]): number | null {
  if (values.length === 0) return null
  return values.reduce((total, value) => total + value, 0) / values.length
}

export function median(values: readonly number[]): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((left, right) => left - right)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? (sorted[middle - 1]! + sorted[middle]!) / 2
    : sorted[middle]!
}

export function circularMeanMinutes(values: readonly number[]): number | null {
  if (values.length === 0) return null
  const angle = (minutes: number) => (minutes / minutesPerDay) * Math.PI * 2
  const sine = mean(values.map((value) => Math.sin(angle(value))))!
  const cosine = mean(values.map((value) => Math.cos(angle(value))))!
  const radians = Math.atan2(sine, cosine)
  return (
    Math.round(
      ((radians < 0 ? radians + Math.PI * 2 : radians) / (Math.PI * 2)) *
        minutesPerDay,
    ) % minutesPerDay
  )
}
