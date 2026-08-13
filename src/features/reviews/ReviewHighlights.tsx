import type { ReviewViewModel } from './review-view-model'
import styles from './reviews.module.css'

export function ReviewHighlights({ review }: { review: ReviewViewModel }) {
  if (
    review.highlights.length === 0 &&
    review.gaps.length === 0 &&
    review.nextAction === null
  ) {
    return null
  }
  return (
    <section className={styles.insights} aria-label="回顾重点">
      {review.highlights.length > 0 ? (
        <InsightList title="亮点" values={review.highlights} />
      ) : null}
      {review.gaps.length > 0 ? (
        <InsightList title="待关注" values={review.gaps} />
      ) : null}
      {review.nextAction !== null ? (
        <div className={styles.nextAction}>
          <h2>下一步</h2>
          <p>{review.nextAction}</p>
        </div>
      ) : null}
    </section>
  )
}

function InsightList({
  title,
  values,
}: {
  title: string
  values: readonly string[]
}) {
  return (
    <div>
      <h2>{title}</h2>
      <ul>
        {values.map((value) => (
          <li key={value}>{value}</li>
        ))}
      </ul>
    </div>
  )
}
