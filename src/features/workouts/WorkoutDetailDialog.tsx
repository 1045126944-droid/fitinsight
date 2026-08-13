import { Heartbeat, X } from '@phosphor-icons/react'
import { useEffect, useRef } from 'react'
import type { WorkoutDetail } from './workout-view-model'
import styles from './workouts.module.css'

export function WorkoutDetailDialog({
  detail,
  onClose,
  restoreFocus,
}: {
  detail: WorkoutDetail
  onClose: () => void
  restoreFocus: HTMLElement | null
}) {
  const closeButton = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    closeButton.current?.focus()
    return () => restoreFocus?.focus()
  }, [restoreFocus])

  return (
    <div
      className={styles.dialogBackdrop}
      role="dialog"
      aria-modal="true"
      aria-labelledby="workout-detail-title"
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault()
          onClose()
        }
        if (event.key === 'Tab') trapFocus(event)
      }}
    >
      <section className={styles.dialogPanel}>
        <header className={styles.dialogHeader}>
          <div>
            <p>训练详情</p>
            <h1 id="workout-detail-title">{detail.title}</h1>
          </div>
          <button
            ref={closeButton}
            type="button"
            aria-label="关闭训练详情"
            onClick={onClose}
          >
            <X size={22} weight="regular" aria-hidden="true" />
          </button>
        </header>

        <dl className={styles.detailList}>
          {detail.metrics.map((item) => (
            <div key={item.label}>
              <dt>{item.label}</dt>
              <dd>{item.value}</dd>
            </div>
          ))}
        </dl>

        {detail.swimming ? (
          <section className={styles.detailSection}>
            <h2>游泳配速</h2>
            <dl className={styles.detailList}>
              <div>
                <dt>平均配速（含休息）</dt>
                <dd>{detail.swimming.pace}</dd>
              </div>
              {detail.swimming.comparison ? (
                <div>
                  <dt>同类训练比较</dt>
                  <dd>{detail.swimming.comparison}</dd>
                </div>
              ) : null}
            </dl>
          </section>
        ) : null}

        {detail.heartRateZones ? (
          <section className={styles.detailSection}>
            <h2>
              <Heartbeat size={20} weight="regular" aria-hidden="true" />
              心率区间
            </h2>
            <ul className={styles.zoneList}>
              {detail.heartRateZones.map((zone) => (
                <li key={zone.zone}>
                  <strong>{zone.zone}</strong>
                  <span>{zone.duration}</span>
                  <small>{zone.sampleCount} 个采样点</small>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {detail.strengthSummary ? (
          <section className={styles.detailSection}>
            <h2>本周力量概览</h2>
            <dl className={styles.detailList}>
              {detail.strengthSummary.map((item) => (
                <div key={item.label}>
                  <dt>{item.label}</dt>
                  <dd>{item.value}</dd>
                </div>
              ))}
            </dl>
          </section>
        ) : null}
      </section>
    </div>
  )
}

function trapFocus(event: React.KeyboardEvent<HTMLDivElement>): void {
  const focusable = [
    ...event.currentTarget.querySelectorAll<HTMLElement>(
      'button:not([disabled]), a[href], input:not([disabled])',
    ),
  ]
  const first = focusable.at(0)
  const last = focusable.at(-1)
  if (!first || !last) return
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}
