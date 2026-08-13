import { useEffect, useState } from 'react'
import { withTemporaryDatabase } from '../../app/import-connection'
import { openFitInsightDb } from '../../db/database'
import {
  getHealthSnapshot,
  getPrivateProfile,
} from '../../db/health-repository'
import {
  buildWorkoutsViewModel,
  type AsyncWorkoutsState,
  type WorkoutsViewModel,
} from './workout-view-model'

export type WorkoutsLoader = () => Promise<WorkoutsViewModel>

export function useWorkouts(
  dataRevision: number,
  load: WorkoutsLoader = loadWorkouts,
): AsyncWorkoutsState {
  const [result, setResult] = useState<{
    revision: number
    state: AsyncWorkoutsState
  }>(() => ({ revision: dataRevision, state: { status: 'loading' } }))

  useEffect(() => {
    let alive = true
    void load().then(
      (viewModel) => {
        if (!alive) return
        setResult({
          revision: dataRevision,
          state:
            viewModel.items.length === 0
              ? {
                  status: 'empty',
                  lastImportedAt: viewModel.lastImportedAt,
                }
              : { status: 'ready', viewModel },
        })
      },
      () => {
        if (alive)
          setResult({
            revision: dataRevision,
            state: {
              status: 'error',
              message: '本地训练数据读取失败，请稍后重试。',
            },
          })
      },
    )
    return () => {
      alive = false
    }
  }, [dataRevision, load])

  return result.revision === dataRevision ? result.state : { status: 'loading' }
}

export async function loadWorkouts(): Promise<WorkoutsViewModel> {
  return withTemporaryDatabase(openFitInsightDb, async (database) => {
    const [snapshot, profile] = await Promise.all([
      getHealthSnapshot(database),
      getPrivateProfile(database),
    ])
    return buildWorkoutsViewModel(
      snapshot.workouts,
      profile,
      snapshot.lastImportedAt,
    )
  })
}
