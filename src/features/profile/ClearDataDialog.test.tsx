import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test, vi } from 'vitest'
import { ClearDataDialog } from './ClearDataDialog'

test('cancel leaves data untouched and confirmation clears known local stores', async () => {
  const user = userEvent.setup()
  const clearAll = vi.fn()
  const { rerender } = render(
    <ClearDataDialog open onCancel={vi.fn()} onConfirm={clearAll} />,
  )

  await user.click(screen.getByRole('button', { name: '取消' }))
  expect(clearAll).not.toHaveBeenCalled()

  rerender(<ClearDataDialog open onCancel={vi.fn()} onConfirm={clearAll} />)
  await user.click(screen.getByRole('button', { name: '清除全部本地数据' }))
  expect(clearAll).toHaveBeenCalledOnce()
})

test('surfaces clear failure and confirms successful clearing', async () => {
  const user = userEvent.setup()
  const { rerender } = render(
    <ClearDataDialog
      open
      onCancel={vi.fn()}
      onConfirm={vi.fn().mockRejectedValue(new Error('transaction failed'))}
    />,
  )

  await user.click(screen.getByRole('button', { name: '清除全部本地数据' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('清除失败')

  rerender(
    <ClearDataDialog
      open
      onCancel={vi.fn()}
      onConfirm={async () => ({ preferencesCleared: true, refreshed: true })}
    />,
  )
  await user.click(screen.getByRole('button', { name: '清除全部本地数据' }))
  expect(await screen.findByRole('status')).toHaveTextContent('清除完成')
})

test('clears stale success state when the same dialog is reopened', async () => {
  const user = userEvent.setup()
  const clearData = vi.fn(async () => ({
    preferencesCleared: true,
    refreshed: true,
  }))
  const { rerender } = render(
    <ClearDataDialog open onCancel={vi.fn()} onConfirm={clearData} />,
  )

  await user.click(screen.getByRole('button', { name: '清除全部本地数据' }))
  expect(await screen.findByRole('status')).toHaveTextContent('清除完成')

  rerender(
    <ClearDataDialog open={false} onCancel={vi.fn()} onConfirm={clearData} />,
  )
  rerender(<ClearDataDialog open onCancel={vi.fn()} onConfirm={clearData} />)

  expect(screen.queryByRole('status')).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: '清除全部本地数据' })).toBeEnabled()
  await user.click(screen.getByRole('button', { name: '清除全部本地数据' }))
  expect(clearData).toHaveBeenCalledTimes(2)
})
