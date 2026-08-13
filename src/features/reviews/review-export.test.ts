import { expect, test } from 'vitest'
import type { ReviewViewModel } from './review-view-model'
import { serializeReviewCsv, serializeReviewJson } from './review-export'

test('exports aggregate review data without raw health records', () => {
  const review = makeReviewViewModel()
  const json = JSON.parse(serializeReviewJson(review))

  expect(json).toMatchObject({
    exportType: 'fitinsight-review',
    period: review.period,
  })
  expect(json).not.toHaveProperty('dailyRecords')
  expect(json).not.toHaveProperty('workouts')
})

test('writes UTF-8 BOM and RFC-4180 escaping for Chinese CSV', () => {
  const csv = serializeReviewCsv(
    makeReviewViewModel({ nextAction: '睡眠优先，力量训练保持 2 次' }),
  )

  expect(csv.startsWith('\uFEFF')).toBe(true)
  expect(csv).toContain('"睡眠优先，力量训练保持 2 次"')
})

function makeReviewViewModel(
  overrides: Partial<ReviewViewModel> = {},
): ReviewViewModel {
  return {
    exportVersion: '1.0.0',
    period: 'month',
    startDate: '2026-08-01',
    endDate: '2026-08-31',
    periodStatus: 'inProgress',
    comparisonCaption: '与上月相同已过天数比较',
    metrics: [
      {
        id: 'workoutCount',
        label: '训练次数',
        current: '4',
        previous: '3',
        change: '+1',
        unit: '次',
      },
    ],
    highlights: ['训练频率稳定。'],
    gaps: ['睡眠时长仍需关注。'],
    nextAction: '睡眠优先',
    ...overrides,
  }
}
