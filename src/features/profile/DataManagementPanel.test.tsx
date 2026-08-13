import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, test, vi } from 'vitest'
import type { FitInsightBackup } from '../../types/storage'
import type { PreparedBackup } from '../../db/backup'
import { DataManagementPanel } from './DataManagementPanel'

test('warns that a backup is sensitive plaintext before download', async () => {
  const user = userEvent.setup()
  const createBackup = vi.fn()
  render(<DataManagementPanel createBackup={createBackup} />)

  await user.click(screen.getByRole('button', { name: '导出本地数据备份' }))

  expect(screen.getByText('备份文件包含敏感的明文健康数据')).toBeVisible()
  expect(createBackup).not.toHaveBeenCalled()
})

afterEach(() => vi.unstubAllGlobals())

test('surfaces backup export failure and allows a successful retry', async () => {
  const user = userEvent.setup()
  const createBackup = vi
    .fn()
    .mockRejectedValueOnce(new Error('storage unavailable'))
    .mockResolvedValueOnce({} as FitInsightBackup)
  vi.stubGlobal('URL', {
    createObjectURL: () => 'blob:fitinsight-test',
    revokeObjectURL: () => undefined,
  })
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
  render(<DataManagementPanel createBackup={createBackup} />)

  await user.click(screen.getByRole('button', { name: '导出本地数据备份' }))
  await user.click(screen.getByRole('button', { name: '我了解，继续导出' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('导出失败')
  expect(screen.getByRole('button', { name: '我了解，继续导出' })).toBeEnabled()

  await user.click(screen.getByRole('button', { name: '我了解，继续导出' }))
  expect(await screen.findByRole('status')).toHaveTextContent('备份已导出')
})

test('rejects an oversized backup before reading or preparing it', async () => {
  const read = vi.fn().mockResolvedValue('{}')
  const prepareBackup = vi.fn().mockReturnValue({} as PreparedBackup)
  const file = new File([], 'oversized-backup.json', {
    type: 'application/json',
  })
  Object.defineProperties(file, {
    size: { value: 100 * 1024 * 1024 + 1 },
    text: { value: read },
  })
  render(
    <DataManagementPanel
      createBackup={vi.fn()}
      prepareBackup={prepareBackup}
    />,
  )

  fireEvent.change(screen.getByLabelText('选择要恢复的备份文件'), {
    target: {
      files: {
        0: file,
        length: 1,
        item: (index: number) => (index === 0 ? file : null),
      },
    },
  })

  expect(await screen.findByRole('status')).toHaveTextContent(
    '备份文件超过 100 MiB',
  )
  expect(read).not.toHaveBeenCalled()
  expect(prepareBackup).not.toHaveBeenCalled()
})
