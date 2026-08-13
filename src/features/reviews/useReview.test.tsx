import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { useReview, type ReviewLoader } from './useReview'

afterEach(() => vi.restoreAllMocks())

test('uses the safe Monday default when localStorage access throws', async () => {
  vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
    throw new DOMException('Storage disabled', 'SecurityError')
  })
  const load = vi.fn<ReviewLoader>().mockResolvedValue({
    exportVersion: '1.0.0',
    period: 'week',
    startDate: '2026-08-03',
    endDate: '2026-08-09',
    periodStatus: 'complete',
    comparisonCaption: '与上周比较',
    metrics: [
      {
        id: 'workoutCount',
        label: '训练次数',
        current: '1',
        previous: null,
        change: null,
        unit: '次',
      },
    ],
    highlights: [],
    gaps: [],
    nextAction: null,
  })

  const { result } = renderHook(() =>
    useReview('week', '2026-08-09', 'Asia/Shanghai', 1, load),
  )

  await waitFor(() => expect(result.current.status).toBe('ready'))
  expect(load).toHaveBeenCalledWith(
    expect.objectContaining({ weekStartsOn: 1 }),
  )
})
