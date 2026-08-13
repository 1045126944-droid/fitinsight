import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts'
import { formatTrendValue, type TrendViewModel } from './trend-view-model'
import { trendYAxisWidth } from './trend-chart-axis'
import styles from './trends.module.css'

export function TrendChart({ viewModel }: { viewModel: TrendViewModel }) {
  if (viewModel.summary.dataPointCount === 0) {
    return <p className={styles.emptyChart}>这段时间还没有可用数据</p>
  }
  const showSparseDots =
    viewModel.summary.dataPointCount < viewModel.points.length
  const accessibleLabel = `${viewModel.metricLabel}趋势，${viewModel.points.length} 天中有 ${viewModel.summary.dataPointCount} 个数据点`
  return (
    <figure className={styles.chart} aria-label={accessibleLabel}>
      <LineChart
        responsive
        data={viewModel.points}
        margin={{ top: 12, right: 12, bottom: 4, left: 0 }}
        style={{ width: '100%', height: 260 }}
        accessibilityLayer
      >
        <CartesianGrid stroke="var(--divider)" vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={formatAxisDate}
          stroke="var(--text-secondary)"
          tickLine={false}
          axisLine={false}
          minTickGap={28}
        />
        <YAxis
          width={trendYAxisWidth(viewModel.points)}
          stroke="var(--text-secondary)"
          tickLine={false}
          axisLine={false}
        />
        <Line
          type="monotone"
          dataKey="value"
          connectNulls={false}
          stroke="var(--activity)"
          strokeWidth={3}
          fill="none"
          dot={
            showSparseDots
              ? { r: 3, fill: 'var(--activity)', strokeWidth: 0 }
              : false
          }
          activeDot={{ r: 5 }}
          isAnimationActive={false}
        />
      </LineChart>
      <figcaption className={styles.screenReaderOnly}>
        {viewModel.points
          .map((point) =>
            point.value === null
              ? `${formatTextDate(point.date)} 缺少数据`
              : `${formatTextDate(point.date)} ${formatTrendValue(viewModel, point.value)}`,
          )
          .join('；')}
      </figcaption>
    </figure>
  )
}

function formatAxisDate(date: string): string {
  const [, month, day] = date.split('-').map(Number)
  return `${month}/${day}`
}

function formatTextDate(date: string): string {
  const [, month, day] = date.split('-').map(Number)
  return `${month}月${day}日`
}
