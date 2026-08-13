import { CheckCircle } from '@phosphor-icons/react'
import type { CoverageMetricKey } from '../../types/health-data'
import type { ImportSummary } from '../../types/storage'
import { errorMessage, type ImportFailureCode } from './import-service'

export function ImportResult({
  status,
  code,
  summary,
  includedMetrics = [],
}: {
  status: 'complete' | 'error'
  code?: ImportFailureCode
  summary?: ImportSummary
  includedMetrics?: readonly CoverageMetricKey[]
}) {
  if (status === 'complete' && summary) {
    const dailyChanged = summary.daily.added + summary.daily.updated
    const bodyChanged = summary.body.added + summary.body.updated
    return (
      <section className="sync-sheet__result" role="status">
        <CheckCircle size={30} weight="fill" aria-hidden="true" />
        <div>
          <h2>同步完成</h2>
          <ul>
            {dailyChanged > 0 ? (
              <li>健康日记录已更新 {dailyChanged} 条</li>
            ) : null}
            {summary.workouts.added > 0 ? (
              <li>新增 {summary.workouts.added} 条训练</li>
            ) : null}
            {includedMetrics.includes('sleep') && dailyChanged > 0 ? (
              <li>睡眠数据已更新</li>
            ) : null}
            {bodyChanged > 0 ? <li>身体测量已更新 {bodyChanged} 条</li> : null}
          </ul>
          <p>最近同步：{formatSyncTime(summary.lastImportedAt)}</p>
        </div>
      </section>
    )
  }
  if (status === 'complete') return <p role="status">同步完成</p>
  return <p role="alert">{errorMessage(code ?? 'transaction_failed')}</p>
}

function formatSyncTime(timestamp: string): string {
  const value = new Date(timestamp)
  if (Number.isNaN(value.getTime())) return '刚刚'
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  const dateFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  const day = dateFormatter.format(value)
  const today = dateFormatter.format(new Date())
  const time = new Intl.DateTimeFormat('zh-CN', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(value)
  return `${day === today ? '今天' : day} ${time}`
}
