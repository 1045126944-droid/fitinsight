import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import type { MonthlyReview } from '../../types/analysis'
import { buildReviewViewModel, type ReviewViewModel } from './review-view-model'
import { ReviewsPage } from './ReviewsPage'

test('labels an unfinished month and explains equal-elapsed-day comparison', () => {
  render(
    <ReviewsPage
      state={readyMonthlyReviewState({ periodStatus: 'inProgress' })}
    />,
  )

  expect(screen.getByText('进行中')).toBeVisible()
  expect(screen.getByText('与上月相同已过天数比较')).toBeVisible()
})

test('omits a missing body metric instead of displaying zero', () => {
  render(
    <ReviewsPage
      state={readyMonthlyReviewState({
        comparisonCurrent: {
          ...monthlyMetrics(),
          bodyFatChangePercentagePoints: null,
        },
      })}
    />,
  )

  expect(screen.queryByText(/体脂变化/)).not.toBeInTheDocument()
  expect(screen.queryByText('0%')).not.toBeInTheDocument()
})

function readyMonthlyReviewState(overrides: Partial<MonthlyReview> = {}): {
  status: 'ready'
  viewModel: ReviewViewModel
} {
  return {
    status: 'ready',
    viewModel: buildReviewViewModel({
      ...monthlyMetrics(),
      period: 'month',
      startDate: '2026-08-01',
      endDate: '2026-08-31',
      periodStatus: 'inProgress',
      comparison: {
        basis: 'equalElapsedDays',
        current: { start: '2026-08-01', end: '2026-08-08' },
        previous: { start: '2026-07-01', end: '2026-07-08' },
      },
      previous: {
        workoutCount: null,
        workoutDayCount: null,
        workoutMinutes: null,
        activeEnergyKcal: null,
        averageSteps: null,
        averageSleepMinutes: null,
        swimCount: null,
        swimDistanceMeters: null,
        strengthCount: null,
        weightChangeKg: null,
        bodyFatChangePercentagePoints: null,
        waistChangeCm: null,
        averageRestingHeartRateBpm: null,
      },
      comparisonCurrent: {
        ...monthlyMetrics(),
      },
      deltas: {
        workoutCount: null,
        workoutDayCount: null,
        workoutMinutes: null,
        activeEnergyKcal: null,
        averageSteps: null,
        averageSleepMinutes: null,
        swimCount: null,
        swimDistanceMeters: null,
        strengthCount: null,
        weightChangeKg: null,
        bodyFatChangePercentagePoints: null,
        waistChangeCm: null,
        averageRestingHeartRateBpm: null,
      },
      coverage: {},
      previousCoverage: {},
      weightTrend: {
        kgPerWeek: null,
        confidence: 'building',
        pointCount: 0,
        spanDays: 0,
      },
      highlight: null,
      gap: null,
      nextAction: null,
      summary: null,
      ...overrides,
    }),
  }
}

function monthlyMetrics(): MonthlyReview['comparisonCurrent'] {
  return {
    workoutCount: 4,
    workoutDayCount: 3,
    workoutMinutes: 180,
    activeEnergyKcal: 1_200,
    averageSteps: 7_200,
    averageSleepMinutes: 430,
    swimCount: 1,
    swimDistanceMeters: 1_000,
    strengthCount: 2,
    weightChangeKg: -0.4,
    bodyFatChangePercentagePoints: -0.6,
    waistChangeCm: -0.5,
    averageRestingHeartRateBpm: 58,
  }
}
