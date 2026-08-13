import { Barbell, Footprints, Heart, Moon, Pulse } from '@phosphor-icons/react'
import { MetricValue } from '../../components/MetricValue'
import type { MetricDisplay } from './dashboard-view-model'
import styles from './dashboard.module.css'

export function EvidenceSummary({ metrics }: { metrics: MetricDisplay[] }) {
  if (metrics.length === 0) return null
  return (
    <section
      className={styles.evidence}
      id="today-evidence"
      aria-label="今日依据"
    >
      {metrics.map((metric) => (
        <MetricValue
          key={metric.id}
          icon={iconFor(metric.id)}
          label={metric.label}
          value={metric.value!}
          statusText={metric.statusText}
          accent={metric.accent}
        />
      ))}
    </section>
  )
}

function iconFor(id: string) {
  if (id === 'steps') return <Footprints size={28} weight="regular" />
  if (id === 'exercise-minutes') return <Barbell size={28} weight="regular" />
  if (id === 'sleep') return <Moon size={28} weight="regular" />
  if (id === 'workout') return <Barbell size={28} weight="regular" />
  if (id === 'recovery') return <Heart size={28} weight="regular" />
  return <Pulse size={28} weight="regular" />
}
