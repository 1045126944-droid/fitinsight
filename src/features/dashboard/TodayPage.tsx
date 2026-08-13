import { ArrowsClockwise, Database } from '@phosphor-icons/react'
import { EmptyState } from '../../components/EmptyState'
import { ActionPrescription } from './ActionPrescription'
import type { AsyncTodayState, TodayViewModel } from './dashboard-view-model'
import { EvidenceSummary } from './EvidenceSummary'
import { TodayDetails } from './TodayDetails'
import styles from './dashboard.module.css'

type TodayPageProps = {
  state: AsyncTodayState
  openSyncSheet: () => void
  openProfile?: () => void
  openTraining?: () => void
}

export function TodayPage({
  state,
  openSyncSheet,
  openProfile,
  openTraining,
}: TodayPageProps) {
  if (state.status === 'loading') return <TodayLoading />
  if (state.status === 'empty') {
    return (
      <div className={styles.statePage}>
        <EmptyState
          icon={<Database size={32} weight="regular" aria-hidden="true" />}
          title="尚未导入今天的健康数据"
          description={
            state.lastImportedAt
              ? '已有历史记录；同步后可查看今天的行动建议。'
              : '数据只在这台设备上处理；请选择健康数据 JSON 文件开始。'
          }
          action={<SyncButton onClick={openSyncSheet} />}
        />
      </div>
    )
  }
  if (state.status === 'error') {
    return (
      <div className={styles.statePage}>
        <EmptyState
          title="暂时无法读取本地数据"
          description={state.message}
          action={<SyncButton onClick={openSyncSheet} />}
        />
      </div>
    )
  }

  const { viewModel } = state
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.date}>{viewModel.dateLabel}</p>
          <h1>{viewModel.greeting}</h1>
          {viewModel.lastImportedLabel ? (
            <p className={styles.lastImported}>
              上次同步：{viewModel.lastImportedLabel}
            </p>
          ) : null}
        </div>
        <SyncButton onClick={openSyncSheet} />
      </header>

      <section className={styles.score} aria-labelledby="today-status-heading">
        <h2 className={styles.scoreEyebrow} id="today-status-heading">
          今日状态
        </h2>
        <div className={styles.scoreSummary}>
          {viewModel.score.score === null ? null : (
            <strong>{viewModel.score.score}</strong>
          )}
          <div>
            <p>{viewModel.statusLabel}</p>
            <span>
              今日评分置信度：{confidenceLabel(viewModel.score.confidence)}
            </span>
            <span>个人目标与恢复启发式，不是健康评级</span>
          </div>
        </div>
      </section>

      {viewModel.prescription ? (
        <ActionPrescription
          prescription={viewModel.prescription}
          onSync={openSyncSheet}
          onProfile={openProfile}
          onTraining={openTraining}
        />
      ) : null}

      <EvidenceSummary metrics={viewModel.evidence} />
      <TodayDetails groups={viewModel.details} />
    </div>
  )
}

function confidenceLabel(
  confidence: TodayViewModel['score']['confidence'],
): string {
  if (confidence === 'high') return '高'
  if (confidence === 'medium') return '中'
  if (confidence === 'low') return '低'
  return '建立中'
}

function SyncButton({ onClick }: { onClick: () => void }) {
  return (
    <button className={styles.syncButton} type="button" onClick={onClick}>
      <ArrowsClockwise size={22} weight="regular" aria-hidden="true" />
      同步
    </button>
  )
}

function TodayLoading() {
  return (
    <div className={`${styles.statePage} ${styles.loading}`} aria-busy="true">
      <p aria-busy="true">正在读取本地健康数据</p>
      <div className={styles.loadingBlock} />
      <div className={styles.loadingBlock} />
    </div>
  )
}
