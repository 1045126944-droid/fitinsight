import { render, renderHook, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test, vi } from 'vitest'
import type { HealthSnapshot } from '../../types/storage'
import { buildTrendViewModel, type TrendViewModel } from './trend-view-model'
import { TrendsPage } from './TrendsPage'
import { useTrend } from './useTrend'

test('requests the selected range and keeps missing values as chart gaps', async () => {
  const user = userEvent.setup()
  const load = vi
    .fn()
    .mockImplementation(async ({ range }: { range: 7 | 30 | 90 }) =>
      trendViewModel({
        range,
        points: [
          { date: '2026-07-30', value: 7_100 },
          { date: '2026-07-31', value: null },
          { date: '2026-08-01', value: 8_300 },
        ],
      }),
    )
  render(
    <TrendsPage
      loadTrend={load}
      endDate="2026-08-01"
      timeZone="Asia/Shanghai"
    />,
  )

  await screen.findByLabelText('步数趋势，3 天中有 2 个数据点')
  await user.click(screen.getByRole('button', { name: '30 天' }))
  expect(load).toHaveBeenLastCalledWith({
    metric: 'steps',
    range: 30,
    endDate: '2026-08-01',
    timeZone: 'Asia/Shanghai',
  })
  expect(screen.getByLabelText('步数趋势，3 天中有 2 个数据点')).toBeVisible()
})

test('offers every approved single metric and reloads the selected metric', async () => {
  const user = userEvent.setup()
  const load = vi
    .fn()
    .mockImplementation(
      async ({ metric }: { metric: TrendViewModel['metric'] }) =>
        trendViewModel({ metric }),
    )
  render(
    <TrendsPage
      loadTrend={load}
      endDate="2026-08-01"
      timeZone="Asia/Shanghai"
    />,
  )

  expect(
    screen.getAllByRole('button', {
      name: /步数|活动能量|锻炼时间|睡眠时长|睡眠评分|静息心率|心率变异性|体重|体脂率|训练次数|游泳距离/,
    }),
  ).toHaveLength(11)
  await user.click(screen.getByRole('button', { name: '体重' }))
  await waitFor(() =>
    expect(load).toHaveBeenLastCalledWith(
      expect.objectContaining({ metric: 'weightKg' }),
    ),
  )
  expect(screen.getByRole('heading', { name: '体重' })).toBeVisible()
})

test('densifies the inclusive selected window with null gaps while preserving covered zeroes and sparse statistics', () => {
  const viewModel = buildTrendViewModel({
    snapshot: snapshot(),
    metric: 'workoutCount',
    range: 7,
    endDate: '2026-08-02',
    timeZone: 'Asia/Shanghai',
  })

  expect(viewModel.points).toEqual([
    { date: '2026-07-27', value: null },
    { date: '2026-07-28', value: null },
    { date: '2026-07-29', value: null },
    { date: '2026-07-30', value: null },
    { date: '2026-07-31', value: 0 },
    { date: '2026-08-01', value: null },
    { date: '2026-08-02', value: null },
  ])
  expect(viewModel.summary).toEqual({
    average: 0,
    minimum: 0,
    maximum: 0,
    previousPeriodChange: null,
    dataPointCount: 1,
  })
})

test('reloads the trend after the local data revision changes', async () => {
  const first = trendViewModel({
    points: [{ date: '2026-08-01', value: 1_000 }],
  })
  const second = trendViewModel({
    points: [{ date: '2026-08-01', value: 2_000 }],
  })
  const load = vi
    .fn()
    .mockResolvedValueOnce(first)
    .mockResolvedValueOnce(second)
  const { result, rerender } = renderHook(
    ({ revision }) =>
      useTrend(
        {
          metric: 'steps',
          range: 7,
          endDate: '2026-08-01',
          timeZone: 'Asia/Shanghai',
        },
        revision,
        load,
      ),
    { initialProps: { revision: 0 } },
  )

  await waitFor(() =>
    expect(result.current).toMatchObject({ status: 'ready', viewModel: first }),
  )
  rerender({ revision: 1 })
  await waitFor(() =>
    expect(result.current).toMatchObject({
      status: 'ready',
      viewModel: second,
    }),
  )
  expect(load).toHaveBeenCalledTimes(2)
})

function snapshot(): HealthSnapshot {
  return {
    revision: 1,
    dailyRecords: [],
    workouts: [],
    bodyMeasurements: [],
    coverage: {
      workouts: [{ startDate: '2026-07-31', endDate: '2026-07-31' }],
    },
    lastImportedAt: null,
  }
}

function trendViewModel(
  overrides: Partial<TrendViewModel> = {},
): TrendViewModel {
  return {
    metric: 'steps',
    metricLabel: '步数',
    unit: '步',
    range: 7,
    startDate: '2026-07-26',
    endDate: '2026-08-01',
    points: [
      { date: '2026-07-30', value: 7_100 },
      { date: '2026-07-31', value: null },
      { date: '2026-08-01', value: 8_300 },
    ],
    summary: {
      average: 7_700,
      minimum: 7_100,
      maximum: 8_300,
      previousPeriodChange: 4.2,
      dataPointCount: 2,
    },
    ...overrides,
  }
}
