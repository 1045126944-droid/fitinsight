import type { TrendMetric } from '../../types/analysis'
import { TREND_METRICS } from './trend-view-model'
import styles from './trends.module.css'

export function TrendMetricPicker({
  selected,
  onChange,
}: {
  selected: TrendMetric
  onChange: (metric: TrendMetric) => void
}) {
  return (
    <div className={styles.metricPicker} aria-label="趋势指标">
      {TREND_METRICS.map((metric) => (
        <button
          key={metric.id}
          type="button"
          aria-pressed={selected === metric.id}
          onClick={() => onChange(metric.id)}
        >
          {metric.label}
        </button>
      ))}
    </div>
  )
}
