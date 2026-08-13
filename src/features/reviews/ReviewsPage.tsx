import { ArrowsClockwise, Database } from '@phosphor-icons/react'
import { EmptyState } from '../../components/EmptyState'
import type { AsyncReviewState, ReviewSelection } from './useReview'
import { ReviewComparison } from './ReviewComparison'
import { ReviewExportMenu } from './ReviewExportMenu'
import { ReviewHighlights } from './ReviewHighlights'
import styles from './reviews.module.css'

export function ReviewsPage({
  state,
  selection = 'month',
  onSelectionChange = () => undefined,
  openSyncSheet,
}: {
  state: AsyncReviewState
  selection?: ReviewSelection
  onSelectionChange?: (selection: ReviewSelection) => void
  openSyncSheet?: () => void
}) {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <p>本地健康数据汇总</p>
          <h1>回顾</h1>
        </div>
        {openSyncSheet ? <SyncButton onClick={openSyncSheet} /> : null}
      </header>
      <div className={styles.picker} aria-label="回顾周期" data-review-controls>
        <button
          type="button"
          aria-pressed={selection === 'week'}
          onClick={() => onSelectionChange('week')}
        >
          本周
        </button>
        <button
          type="button"
          aria-pressed={selection === 'month'}
          onClick={() => onSelectionChange('month')}
        >
          本月
        </button>
      </div>
      {state.status === 'loading' ? <Loading /> : null}
      {state.status === 'empty' ? (
        <Empty openSyncSheet={openSyncSheet} />
      ) : null}
      {state.status === 'error' ? (
        <Error message={state.message} openSyncSheet={openSyncSheet} />
      ) : null}
      {state.status === 'ready' ? (
        <article className={styles.review} data-review-print>
          <div className={styles.reviewHeader}>
            <div>
              <p>{state.viewModel.period === 'week' ? '周回顾' : '月回顾'}</p>
              <h2>
                {state.viewModel.startDate} 至 {state.viewModel.endDate}
              </h2>
            </div>
            <span
              className={styles.status}
              data-status={state.viewModel.periodStatus}
            >
              {statusLabel(state.viewModel.periodStatus)}
            </span>
          </div>
          <ReviewComparison review={state.viewModel} />
          <ReviewHighlights review={state.viewModel} />
          <ReviewExportMenu review={state.viewModel} />
        </article>
      ) : null}
    </div>
  )
}

function Loading() {
  return (
    <div className={styles.statePage} aria-busy="true">
      <p>正在读取本地回顾</p>
    </div>
  )
}

function Empty({ openSyncSheet }: { openSyncSheet: (() => void) | undefined }) {
  return (
    <div className={styles.statePage}>
      <EmptyState
        icon={<Database size={32} aria-hidden="true" />}
        title="回顾数据不足"
        description="同步更多健康数据后，可生成周期回顾。"
        action={
          openSyncSheet ? <SyncButton onClick={openSyncSheet} /> : undefined
        }
      />
    </div>
  )
}

function Error({
  message,
  openSyncSheet,
}: {
  message: string
  openSyncSheet: (() => void) | undefined
}) {
  return (
    <div className={styles.statePage}>
      <EmptyState
        title="暂时无法读取本地回顾"
        description={message}
        action={
          openSyncSheet ? <SyncButton onClick={openSyncSheet} /> : undefined
        }
      />
    </div>
  )
}

function SyncButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}>
      <ArrowsClockwise size={22} aria-hidden="true" />
      同步
    </button>
  )
}

function statusLabel(
  status: 'complete' | 'inProgress' | 'insufficient',
): string {
  if (status === 'complete') return '已完成'
  if (status === 'inProgress') return '进行中'
  return '数据不足'
}
