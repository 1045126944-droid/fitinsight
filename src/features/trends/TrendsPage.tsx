import { ArrowsClockwise } from '@phosphor-icons/react'
import { useState } from 'react'
import type { TrendMetric, TrendRange } from '../../types/analysis'
import { TrendChart } from './TrendChart'
import { TrendMetricPicker } from './TrendMetricPicker'
import { TrendSummary } from './TrendSummary'
import { TREND_METRICS } from './trend-view-model'
import { useTrend, type TrendLoader } from './useTrend'
import styles from './trends.module.css'

const ranges: readonly TrendRange[] = [7, 30, 90]

export function TrendsPage({
  dataRevision = 0,
  endDate = runtimeLocalDate(),
  timeZone = runtimeTimeZone(),
  loadTrend,
  openSyncSheet,
}: {
  dataRevision?: number
  endDate?: string
  timeZone?: string
  loadTrend?: TrendLoader
  openSyncSheet?: () => void
}) {
  const [metric, setMetric] = useState<TrendMetric>('steps')
  const [range, setRange] = useState<TrendRange>(7)
  const state = useTrend(
    { metric, range, endDate, timeZone },
    dataRevision,
    loadTrend,
  )
  const metricLabel = TREND_METRICS.find((item) => item.id === metric)!.label

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <p>单指标本地趋势</p>
          <h1>趋势</h1>
        </div>
        {openSyncSheet ? (
          <button type="button" onClick={openSyncSheet}>
            <ArrowsClockwise size={22} weight="regular" aria-hidden="true" />
            同步
          </button>
        ) : null}
      </header>

      <div className={styles.rangePicker} aria-label="趋势范围">
        {ranges.map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={range === option}
            onClick={() => setRange(option)}
          >
            {option} 天
          </button>
        ))}
      </div>
      <TrendMetricPicker selected={metric} onChange={setMetric} />

      <section className={styles.trendPanel}>
        <div className={styles.panelHeader}>
          <h2>{metricLabel}</h2>
          <span>{range} 天</span>
        </div>
        {state.status === 'loading' ? (
          <p className={styles.status} aria-busy="true">
            正在读取本地趋势
          </p>
        ) : null}
        {state.status === 'error' ? (
          <p className={styles.error} role="alert">
            {state.message}
          </p>
        ) : null}
        {state.status === 'ready' ? (
          <>
            <TrendChart viewModel={state.viewModel} />
            <TrendSummary viewModel={state.viewModel} />
          </>
        ) : null}
      </section>
    </div>
  )
}

function runtimeLocalDate(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  )
  return `${values.year!}-${values.month!}-${values.day!}`
}

function runtimeTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
}
