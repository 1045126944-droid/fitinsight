import { expect, test } from 'vitest'
import { EMPTY_PROFILE } from '../types/profile'
import { appReducer, type AppState } from './app-reducer'

test('keeps newer profile and revision when an older refresh resolves last', () => {
  const current: AppState = {
    activeTab: 'today',
    dataRevision: 3,
    isDemoData: false,
    profile: {
      ...EMPTY_PROFILE,
      name: 'New synthetic profile',
      updatedAt: '2026-08-01T10:00:00+08:00',
    },
    syncSheetOpen: false,
  }
  const olderProfile = {
    ...EMPTY_PROFILE,
    name: 'Old synthetic profile',
    updatedAt: '2026-08-01T09:00:00+08:00',
  }

  expect(
    appReducer(current, {
      type: 'data-refreshed',
      revision: 2,
      isDemoData: true,
      profile: olderProfile,
    }),
  ).toEqual(current)
})
