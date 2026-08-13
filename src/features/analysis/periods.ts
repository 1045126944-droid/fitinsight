import type { ReviewComparison, ReviewPeriod } from '../../types/analysis'
import { addDays, getMonthRange, getWeekRange } from '../../utils/date-only'

export type PeriodSelection = {
  current: ReviewPeriod
  status: 'complete' | 'inProgress'
  comparison: ReviewComparison
}

export function selectWeek(
  today: string,
  weekStartsOn: number,
): PeriodSelection {
  return selectPeriod(today, getWeekRange(today, weekStartsOn), (date) =>
    getWeekRange(date, weekStartsOn),
  )
}

export function selectMonth(today: string): PeriodSelection {
  return selectPeriod(today, getMonthRange(today), getMonthRange)
}

function selectPeriod(
  today: string,
  full: ReviewPeriod,
  previousPeriodFor: (date: string) => ReviewPeriod,
): PeriodSelection {
  const current = { start: full.start, end: today }
  const status = today === full.end ? 'complete' : 'inProgress'
  const previousFullEnd = addDays(full.start, -1)
  const previousFull = previousPeriodFor(previousFullEnd)
  const currentDays = daysInclusive(current)
  const comparableDays = Math.min(currentDays, daysInclusive(previousFull))
  const comparisonCurrent = {
    start: current.start,
    end: addDays(current.start, comparableDays - 1),
  }
  const comparisonPrevious = {
    start: previousFull.start,
    end: addDays(previousFull.start, comparableDays - 1),
  }
  return {
    current,
    status,
    comparison: {
      basis:
        status === 'complete' && comparableDays === currentDays
          ? 'fullPeriod'
          : 'equalElapsedDays',
      current: comparisonCurrent,
      previous: comparisonPrevious,
    },
  }
}

function daysInclusive(period: ReviewPeriod): number {
  let days = 1
  for (let date = period.start; date < period.end; date = addDays(date, 1))
    days += 1
  return days
}
