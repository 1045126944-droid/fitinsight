import type { ReviewViewModel } from './review-view-model'
import styles from './reviews.module.css'

export function ReviewComparison({ review }: { review: ReviewViewModel }) {
  if (review.metrics.length === 0) return null
  return (
    <section className={styles.comparison} aria-label="周期指标比较">
      <h2>周期比较</h2>
      <p>{review.comparisonCaption}</p>
      <div className={styles.metricList}>
        {review.metrics.map((metric) => (
          <article key={metric.id} className={styles.metric}>
            <h3>{metric.label}</h3>
            <strong>
              {metric.current}
              {metric.unit ? ` ${metric.unit}` : ''}
            </strong>
            {metric.previous !== null ? (
              <p>
                上一周期：{metric.previous}
                {metric.unit ? ` ${metric.unit}` : ''}
              </p>
            ) : null}
            {metric.change !== null ? (
              <p>
                变化：{metric.change}
                {metric.unit ? ` ${metric.unit}` : ''}
              </p>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  )
}
