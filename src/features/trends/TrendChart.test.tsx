import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import type { TrendViewModel } from './trend-view-model'
import { trendYAxisWidth } from './trend-chart-axis'
import { TrendChart } from './TrendChart'
import { TrendSummary } from './TrendSummary'

test('renders one disconnected line and an accessible textual point summary', () => {
  const { container } = render(<TrendChart viewModel={trendViewModel()} />)

  expect(container.querySelectorAll('.recharts-line-curve')).toHaveLength(1)
  expect(screen.getByLabelText('步数趋势，3 天中有 2 个数据点')).toBeVisible()
  expect(
    screen.getByText('7月30日 7,100 步；7月31日 缺少数据；8月1日 8,300 步'),
  ).toBeInTheDocument()
})

test('renders visible markers for sparse measurements without connecting missing days', () => {
  const { container } = render(<TrendChart viewModel={trendViewModel()} />)

  expect(container.querySelectorAll('.recharts-line-dot')).toHaveLength(2)
})

test('does not mount a chart line when all points are missing', () => {
  render(
    <TrendChart
      viewModel={trendViewModel({
        points: [
          { date: '2026-07-30', value: null },
          { date: '2026-07-31', value: null },
          { date: '2026-08-01', value: null },
        ],
        summary: {
          average: null,
          minimum: null,
          maximum: null,
          previousPeriodChange: null,
          dataPointCount: 0,
        },
      })}
    />,
  )

  expect(screen.getByText('这段时间还没有可用数据')).toBeVisible()
  expect(document.querySelector('.recharts-line-curve')).not.toBeInTheDocument()
})

test('keeps summary statistics available as text outside the chart SVG', () => {
  render(<TrendSummary viewModel={trendViewModel()} />)

  expect(screen.getByText('平均值')).toBeVisible()
  expect(screen.getByText('7,700 步')).toBeVisible()
  expect(screen.getByText('最小值')).toBeVisible()
  expect(screen.getByText('7,100 步')).toBeVisible()
  expect(screen.getByText('最大值')).toBeVisible()
  expect(screen.getByText('8,300 步')).toBeVisible()
  expect(screen.getByText('较上一周期')).toBeVisible()
  expect(screen.getByText('+4.2%')).toBeVisible()
  expect(screen.getByText('2 个数据点')).toBeVisible()
})

test('reserves enough y-axis width for five-digit values on an iPhone chart', () => {
  expect(
    trendYAxisWidth([
      { date: '2026-07-30', value: 12_000 },
      { date: '2026-07-31', value: 9_800 },
      { date: '2026-08-01', value: 10_400 },
    ]),
  ).toBe(52)
})

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
