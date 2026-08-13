import type { ReviewViewModel } from './review-view-model'

const CSV_HEADER = ['类别', '指标', '当前周期', '上一周期', '变化', '单位']

export function serializeReviewJson(review: ReviewViewModel): string {
  return JSON.stringify({ exportType: 'fitinsight-review', ...review }, null, 2)
}

export function serializeReviewCsv(review: ReviewViewModel): string {
  const rows = [
    CSV_HEADER,
    ...review.metrics.map((metric) => [
      '指标',
      metric.label,
      metric.current,
      metric.previous,
      metric.change,
      metric.unit,
    ]),
    ...review.highlights.map((highlight) => [
      '亮点',
      '亮点',
      highlight,
      null,
      null,
      null,
    ]),
    ...review.gaps.map((gap) => ['差距', '差距', gap, null, null, null]),
    ...(review.nextAction === null
      ? []
      : [['下一步', '下一步', review.nextAction, null, null, null]]),
  ]
  return `\uFEFF${rows.map((row) => row.map(escapeCsv).join(',')).join('\r\n')}\r\n`
}

export function reviewFileName(
  review: ReviewViewModel,
  extension: 'json' | 'csv',
): string {
  return `fitinsight-${review.period}-${review.startDate}-${review.endDate}.${extension}`
}

export function downloadTextFile(
  text: string,
  fileName: string,
  type: string,
): void {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  anchor.style.display = 'none'
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

function escapeCsv(value: string | null): string {
  const text = value ?? ''
  return /[",，\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}
