import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test, vi } from 'vitest'
import type { PreparedBackup } from '../../db/backup'
import { BackupRestoreDialog } from './BackupRestoreDialog'

test('surfaces restore failure without an unhandled rejection', async () => {
  const user = userEvent.setup()
  render(
    <BackupRestoreDialog
      prepared={preparedBackup()}
      onRestore={vi.fn().mockRejectedValue(new Error('transaction failed'))}
    />,
  )

  await user.click(screen.getByRole('button', { name: '确认替换并恢复' }))

  expect(await screen.findByRole('alert')).toHaveTextContent('恢复失败')
})

test('states honestly when restore succeeds but refresh does not', async () => {
  const user = userEvent.setup()
  render(
    <BackupRestoreDialog
      prepared={preparedBackup()}
      onRestore={async () => ({ refreshed: false })}
    />,
  )

  await user.click(screen.getByRole('button', { name: '确认替换并恢复' }))

  expect(await screen.findByRole('status')).toHaveTextContent(
    '备份已恢复，但界面未能刷新',
  )
})

function preparedBackup(): PreparedBackup {
  return {
    backup: {} as PreparedBackup['backup'],
    counts: {
      dailyRecords: 0,
      workouts: 0,
      bodyMeasurements: 0,
      importHistory: 0,
      hasProfile: false,
    },
  }
}
