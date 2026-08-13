import { DownloadSimple, Printer } from '@phosphor-icons/react'
import {
  downloadTextFile,
  reviewFileName,
  serializeReviewCsv,
  serializeReviewJson,
} from './review-export'
import type { ReviewViewModel } from './review-view-model'
import styles from './reviews.module.css'

export function ReviewExportMenu({ review }: { review: ReviewViewModel }) {
  return (
    <div className={styles.exportMenu} aria-label="导出回顾" data-review-export>
      <button
        type="button"
        onClick={() =>
          downloadTextFile(
            serializeReviewJson(review),
            reviewFileName(review, 'json'),
            'application/json;charset=utf-8',
          )
        }
      >
        <DownloadSimple size={20} aria-hidden="true" />
        导出 JSON
      </button>
      <button
        type="button"
        onClick={() =>
          downloadTextFile(
            serializeReviewCsv(review),
            reviewFileName(review, 'csv'),
            'text/csv;charset=utf-8',
          )
        }
      >
        <DownloadSimple size={20} aria-hidden="true" />
        导出 CSV
      </button>
      <button type="button" onClick={() => window.print()}>
        <Printer size={20} aria-hidden="true" />
        打印
      </button>
    </div>
  )
}
