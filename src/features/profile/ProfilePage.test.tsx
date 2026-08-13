import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, test } from 'vitest'
import { AppProvider } from '../../app/AppProvider'
import { openFitInsightDb } from '../../db/database'
import { savePrivateProfile } from '../../db/health-repository'
import { EMPTY_PROFILE } from '../../types/profile'
import { ProfilePage } from './ProfilePage'

const databases: Array<{
  name: string
  close(): void
}> = []

afterEach(() => {
  for (const database of databases.splice(0)) {
    database.close()
    indexedDB.deleteDatabase(database.name)
  }
})

test('keeps personal-profile save feedback visible after data refresh', async () => {
  const user = userEvent.setup()
  const name = `fitinsight-profile-feedback-${crypto.randomUUID()}`
  const db = await openFitInsightDb(name)
  databases.push({ name, close: () => db.close() })
  const view = render(
    <AppProvider database={Promise.resolve(db)}>
      <ProfilePage loadSyntheticData={() => Promise.resolve()} />
    </AppProvider>,
  )

  await user.type(await screen.findByLabelText('身高（厘米）'), '175')
  await user.click(screen.getByRole('button', { name: '保存到本机' }))

  expect(await screen.findByRole('status')).toHaveTextContent('已保存到本机。')

  view.unmount()
})

test('confirms that analysis goals remain saved after data refresh', async () => {
  const user = userEvent.setup()
  const name = `fitinsight-goals-feedback-${crypto.randomUUID()}`
  const db = await openFitInsightDb(name)
  databases.push({ name, close: () => db.close() })
  const view = render(
    <AppProvider database={Promise.resolve(db)}>
      <ProfilePage loadSyntheticData={() => Promise.resolve()} />
    </AppProvider>,
  )

  await user.selectOptions(
    await screen.findByLabelText('当前目标'),
    'generalFitness',
  )
  await user.click(screen.getByRole('button', { name: '保存目标' }))

  expect(await screen.findByRole('status')).toHaveTextContent(
    '目标已保存到本机。',
  )

  view.unmount()
})

test('hydrates profile and goals from the persisted profile', async () => {
  const name = `fitinsight-profile-hydration-${crypto.randomUUID()}`
  const db = await openFitInsightDb(name)
  databases.push({ name, close: () => db.close() })
  await savePrivateProfile(db, {
    ...structuredClone(EMPTY_PROFILE),
    heightCm: 181,
    goals: {
      ...EMPTY_PROFILE.goals,
      objective: 'generalFitness',
      dailySteps: 9000,
    },
    updatedAt: '2026-08-08T12:00:00.000Z',
  })
  const view = render(
    <AppProvider database={Promise.resolve(db)}>
      <ProfilePage loadSyntheticData={() => Promise.resolve()} />
    </AppProvider>,
  )

  await waitFor(() => {
    expect(screen.getByLabelText('身高（厘米）')).toHaveValue(181)
    expect(screen.getByLabelText('当前目标')).toHaveValue('generalFitness')
    expect(screen.getByLabelText('每日步数')).toHaveValue(9000)
  })

  view.unmount()
})
