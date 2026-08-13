import { useEffect, useState } from 'react'
import { loadPreferences } from '../../app/preferences'
import { withTemporaryDatabase } from '../../app/import-connection'
import { openFitInsightDb } from '../../db/database'
import {
  getHealthSnapshot,
  getPrivateProfile,
} from '../../db/health-repository'
import { EMPTY_PROFILE } from '../../types/profile'
import { buildMonthlyReview } from '../analysis/monthly-review'
import { buildWeeklyReview } from '../analysis/weekly-review'
import { buildReviewViewModel, type ReviewViewModel } from './review-view-model'

export type ReviewSelection = 'week' | 'month'
export type AsyncReviewState =
  | { status: 'loading' }
  | { status: 'empty' }
  | { status: 'error'; message: string }
  | { status: 'ready'; viewModel: ReviewViewModel }
export type ReviewLoader = (input: ReviewLoadInput) => Promise<ReviewViewModel>
export type ReviewLoadInput = {
  period: ReviewSelection
  today: string
  timeZone: string
  weekStartsOn: 0 | 1
}

export function useReview(
  selection: ReviewSelection,
  today: string,
  timeZone: string,
  dataRevision: number,
  load: ReviewLoader = loadReview,
): AsyncReviewState {
  const preference = loadWeekStartsOn()
  const key = `${selection}:${today}:${timeZone}:${preference}:${dataRevision}`
  const [result, setResult] = useState<{
    key: string
    state: AsyncReviewState
  }>(() => ({ key, state: { status: 'loading' } }))

  useEffect(() => {
    let alive = true
    void load({
      period: selection,
      today,
      timeZone,
      weekStartsOn: preference,
    }).then(
      (viewModel) => {
        if (!alive) return
        setResult({
          key,
          state:
            viewModel.periodStatus === 'insufficient'
              ? { status: 'empty' }
              : { status: 'ready', viewModel },
        })
      },
      () => {
        if (alive)
          setResult({
            key,
            state: {
              status: 'error',
              message: '本地回顾数据读取失败，请稍后重试。',
            },
          })
      },
    )
    return () => {
      alive = false
    }
  }, [key, load, preference, selection, timeZone, today])

  return result.key === key ? result.state : { status: 'loading' }
}

export async function loadReview(
  input: ReviewLoadInput,
): Promise<ReviewViewModel> {
  return withTemporaryDatabase(openFitInsightDb, async (database) => {
    const [snapshot, profile] = await Promise.all([
      getHealthSnapshot(database),
      getPrivateProfile(database),
    ])
    const goals = profile?.goals ?? EMPTY_PROFILE.goals
    const review =
      input.period === 'week'
        ? buildWeeklyReview({
            snapshot,
            goals,
            today: input.today,
            timeZone: input.timeZone,
            weekStartsOn: input.weekStartsOn,
          })
        : buildMonthlyReview({
            snapshot,
            goals,
            today: input.today,
            timeZone: input.timeZone,
          })
    return buildReviewViewModel(review)
  })
}

function loadWeekStartsOn(): 0 | 1 {
  if (typeof window === 'undefined') return 1
  try {
    return loadPreferences(window.localStorage).weekStartsOn
  } catch {
    return 1
  }
}
