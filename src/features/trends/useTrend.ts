import { useEffect, useState } from 'react'
import { withTemporaryDatabase } from '../../app/import-connection'
import { openFitInsightDb } from '../../db/database'
import { getHealthSnapshot } from '../../db/health-repository'
import type { TrendMetric, TrendRange } from '../../types/analysis'
import {
  buildTrendViewModel,
  type AsyncTrendState,
  type TrendViewModel,
} from './trend-view-model'

export type TrendRequest = {
  metric: TrendMetric
  range: TrendRange
  endDate: string
  timeZone: string
}

export type TrendLoader = (request: TrendRequest) => Promise<TrendViewModel>

export function useTrend(
  request: TrendRequest,
  dataRevision: number,
  load: TrendLoader = loadTrend,
): AsyncTrendState {
  const { metric, range, endDate, timeZone } = request
  const requestKey = `${request.metric}:${request.range}:${request.endDate}:${request.timeZone}:${dataRevision}`
  const [result, setResult] = useState<{
    key: string
    state: AsyncTrendState
  }>(() => ({ key: requestKey, state: { status: 'loading' } }))

  useEffect(() => {
    let alive = true
    void load({ metric, range, endDate, timeZone }).then(
      (viewModel) => {
        if (alive)
          setResult({ key: requestKey, state: { status: 'ready', viewModel } })
      },
      () => {
        if (alive)
          setResult({
            key: requestKey,
            state: {
              status: 'error',
              message: '本地趋势数据读取失败，请稍后重试。',
            },
          })
      },
    )
    return () => {
      alive = false
    }
  }, [endDate, load, metric, range, requestKey, timeZone])

  return result.key === requestKey ? result.state : { status: 'loading' }
}

export async function loadTrend(
  request: TrendRequest,
): Promise<TrendViewModel> {
  return withTemporaryDatabase(openFitInsightDb, async (database) =>
    buildTrendViewModel({
      snapshot: await getHealthSnapshot(database),
      ...request,
    }),
  )
}
