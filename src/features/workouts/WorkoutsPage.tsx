import { ArrowsClockwise, Database } from '@phosphor-icons/react'
import { useState } from 'react'
import { EmptyState } from '../../components/EmptyState'
import type { AsyncWorkoutsState, WorkoutCategory } from './workout-view-model'
import { WorkoutDetailDialog } from './WorkoutDetailDialog'
import { WorkoutFilters } from './WorkoutFilters'
import { WorkoutList } from './WorkoutList'
import styles from './workouts.module.css'

export function WorkoutsPage({
  state,
  openSyncSheet,
}: {
  state: AsyncWorkoutsState
  openSyncSheet: () => void
}) {
  const [category, setCategory] = useState<WorkoutCategory>('all')
  const [selected, setSelected] = useState<{
    id: string
    trigger: HTMLButtonElement
  } | null>(null)
  const items = state.status === 'ready' ? state.viewModel.items : []
  const filtered =
    category === 'all'
      ? items
      : items.filter((item) => item.category === category)
  const detail =
    state.status === 'ready' && selected
      ? state.viewModel.detailsById[selected.id]
      : undefined

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <p>本地训练记录</p>
          <h1>训练</h1>
        </div>
        <button type="button" onClick={openSyncSheet}>
          <ArrowsClockwise size={22} weight="regular" aria-hidden="true" />
          同步
        </button>
      </header>
      <WorkoutFilters selected={category} onChange={setCategory} />

      {state.status === 'loading' ? (
        <p className={styles.status} aria-busy="true">
          正在读取本地训练记录
        </p>
      ) : null}
      {state.status === 'empty' ? (
        <div className={styles.statePage}>
          <EmptyState
            icon={<Database size={32} weight="regular" aria-hidden="true" />}
            title="尚未导入训练记录"
            description="同步健康数据后，可按本地日期浏览训练详情。"
            action={<SyncAction onClick={openSyncSheet} />}
          />
        </div>
      ) : null}
      {state.status === 'error' ? (
        <div className={styles.statePage}>
          <EmptyState
            title="暂时无法读取本地训练"
            description={state.message}
            action={<SyncAction onClick={openSyncSheet} />}
          />
        </div>
      ) : null}
      {state.status === 'ready' ? (
        <WorkoutList
          items={filtered}
          onSelect={(id, trigger) => setSelected({ id, trigger })}
        />
      ) : null}

      {detail && selected ? (
        <WorkoutDetailDialog
          detail={detail}
          restoreFocus={selected.trigger}
          onClose={() => setSelected(null)}
        />
      ) : null}
    </div>
  )
}

function SyncAction({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}>
      <ArrowsClockwise size={22} weight="regular" aria-hidden="true" />
      同步
    </button>
  )
}
