import type { ReactNode } from 'react'

type MetricValueProps = {
  icon: ReactNode
  label: string
  value: string
  statusText: string
  accent: 'activity' | 'training' | 'sleep' | 'recovery' | 'neutral'
}

export function MetricValue({
  icon,
  label,
  value,
  statusText,
  accent,
}: MetricValueProps) {
  return (
    <div className="metric-value" data-accent={accent}>
      <div className="metric-value__icon" aria-hidden="true">
        {icon}
      </div>
      <p className="metric-value__number">{value}</p>
      <p className="metric-value__label">{label}</p>
      <p className="metric-value__status">{statusText}</p>
    </div>
  )
}
