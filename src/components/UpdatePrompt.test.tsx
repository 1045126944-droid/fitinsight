import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { UpdatePrompt } from './UpdatePrompt'

test('applies a waiting service worker only after the user accepts', async () => {
  const user = userEvent.setup()
  const applyUpdate = vi.fn().mockResolvedValue(undefined)
  render(
    <UpdatePrompt
      needRefresh
      offlineReady={false}
      applyUpdate={applyUpdate}
      dismiss={vi.fn()}
    />,
  )

  expect(applyUpdate).not.toHaveBeenCalled()
  await user.click(screen.getByRole('button', { name: '立即更新' }))
  expect(applyUpdate).toHaveBeenCalledOnce()
})

test('distinguishes offline readiness from an available update', () => {
  const { rerender } = render(
    <UpdatePrompt
      needRefresh={false}
      offlineReady
      applyUpdate={vi.fn()}
      dismiss={vi.fn()}
    />,
  )

  expect(screen.getByText('可离线使用')).toBeVisible()
  expect(
    screen.queryByRole('button', { name: '立即更新' }),
  ).not.toBeInTheDocument()

  rerender(
    <UpdatePrompt
      needRefresh
      offlineReady={false}
      applyUpdate={vi.fn()}
      dismiss={vi.fn()}
    />,
  )

  expect(screen.getByText('有新版本')).toBeVisible()
  expect(screen.getByRole('button', { name: '立即更新' })).toBeVisible()
})

test('dismisses the visible prompt from its close control', async () => {
  const user = userEvent.setup()
  const dismiss = vi.fn()
  render(
    <UpdatePrompt
      needRefresh
      offlineReady={false}
      applyUpdate={vi.fn()}
      dismiss={dismiss}
    />,
  )

  await user.click(screen.getByRole('button', { name: '稍后' }))
  expect(dismiss).toHaveBeenCalledOnce()
})
