import { formatTrendValue, type TrendViewModel } from './trend-view-model'
import styles from './trends.module.css'

export function TrendSummary({ viewModel }: { viewModel: TrendViewModel }) {
  const { summary } = viewModel
  if (summary.dataPointCount === 0) return null
  return (
    <section className={styles.summary} aria-label="趋势统计摘要">
      <SummaryItem
        label="平均值"
        value={formatNullable(viewModel, summary.average)}
      />
      <SummaryItem
        label="最小值"
        value={formatNullable(viewModel, summary.minimum)}
      />
      <SummaryItem
        label="最大值"
        value={formatNullable(viewModel, summary.maximum)}
      />
      <SummaryItem
        label="较上一周期"
        value={formatChange(summary.previousPeriodChange)}
      />
      <SummaryItem
        label="有效覆盖"
        value={`${summary.dataPointCount} 个数据点`}
      />
    </section>
  )
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function formatNullable(
  viewModel: TrendViewModel,
  value: number | null,
): string {
  return value === null ? '数据不足' : formatTrendValue(viewModel, value)
}

function formatChange(value: number | null): string {
  if (value === null) return '数据不足'
  const formatted = new Intl.NumberFormat('zh-CN', {
    maximumFractionDigits: 1,
  }).format(Math.abs(value))
  if (value === 0) return '0%'
  return `${value > 0 ? '+' : '-'}${formatted}%`
}
