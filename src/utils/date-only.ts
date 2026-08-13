const dateOnlyPattern = /^\d{4}-\d{2}-\d{2}$/
const millisecondsPerDay = 86_400_000

type DateParts = { year: number; month: number; day: number }

export type DateRange = { start: string; end: string }

export function isValidDateOnly(value: string): boolean {
  try {
    parseDateParts(value)
    return true
  } catch {
    return false
  }
}

export function localDateAt(instant: string, timeZone: string): string {
  const date = new Date(instant)
  if (Number.isNaN(date.getTime()))
    throw new TypeError('Expected a valid instant')

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  )
  return `${values.year!}-${values.month!}-${values.day!}`
}

export function addDays(dateOnly: string, days: number): string {
  if (!Number.isInteger(days))
    throw new TypeError('Expected an integer day count')
  const date = parseDateOnly(dateOnly)
  date.setUTCDate(date.getUTCDate() + days)
  return formatDateOnly(date)
}

export function differenceInCalendarDays(left: string, right: string): number {
  return Math.round(
    (parseDateOnly(left).getTime() - parseDateOnly(right).getTime()) /
      millisecondsPerDay,
  )
}

export function getWeekRange(dateOnly: string, weekStartsOn = 1): DateRange {
  if (!Number.isInteger(weekStartsOn) || weekStartsOn < 0 || weekStartsOn > 6) {
    throw new TypeError('Expected weekStartsOn to be from 0 through 6')
  }
  const date = parseDateOnly(dateOnly)
  const daysFromStart = (date.getUTCDay() - weekStartsOn + 7) % 7
  const start = addDays(dateOnly, -daysFromStart)
  return { start, end: addDays(start, 6) }
}

export function getMonthRange(dateOnly: string): DateRange {
  const { year, month } = parseDateParts(dateOnly)
  const start = formatDateParts({ year, month, day: 1 })
  const lastDay = dateAtUtc(year, month + 1, 0).getUTCDate()
  return { start, end: formatDateParts({ year, month, day: lastDay }) }
}

function parseDateOnly(value: string): Date {
  const parts = parseDateParts(value)
  return dateAtUtc(parts.year, parts.month, parts.day)
}

function parseDateParts(value: string): DateParts {
  if (!dateOnlyPattern.test(value))
    throw new TypeError('Expected a YYYY-MM-DD date')
  const [year, month, day] = value.split('-').map(Number)
  const date = dateAtUtc(year!, month!, day!)
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() + 1 !== month ||
    date.getUTCDate() !== day
  ) {
    throw new TypeError('Expected a valid calendar date')
  }
  return { year: year!, month: month!, day: day! }
}

function dateAtUtc(year: number, month: number, day: number): Date {
  const date = new Date(0)
  date.setUTCHours(0, 0, 0, 0)
  date.setUTCFullYear(year, month - 1, day)
  return date
}

function formatDateOnly(date: Date): string {
  return formatDateParts({
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  })
}

function formatDateParts({ year, month, day }: DateParts): string {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}
