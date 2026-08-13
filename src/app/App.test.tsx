import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { App } from './App'

vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: () => ({
    needRefresh: [true, vi.fn()],
    offlineReady: [false, vi.fn()],
    updateServiceWorker: vi.fn().mockResolvedValue(undefined),
  }),
}))

test('starts on Today with clearly labelled demo data and changes destination through the bottom navigation', async () => {
  const user = userEvent.setup()
  render(<App />)

  expect(await screen.findByText('演示数据')).toBeVisible()
  expect(
    await screen.findByRole('heading', {
      name: /Lu|尚未导入今天的健康数据/,
    }),
  ).toBeInTheDocument()
  expect(screen.getByRole('button', { name: '今天' })).toHaveAttribute(
    'aria-current',
    'page',
  )
  await user.click(screen.getByRole('button', { name: '训练' }))
  expect(screen.getByRole('heading', { name: '训练' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: '今天' })).not.toHaveAttribute(
    'aria-current',
  )
  expect(screen.getByRole('button', { name: '训练' })).toHaveAttribute(
    'aria-current',
    'page',
  )
})

test('keeps focus in the sync dialog and restores its trigger after Escape', async () => {
  const user = userEvent.setup()
  render(<App />)

  const trigger = await screen.findByRole('button', { name: '同步' })
  await user.click(trigger)
  expect(screen.getByRole('button', { name: '关闭同步' })).toHaveFocus()

  await user.tab({ shift: true })
  expect(screen.getByLabelText('选择 JSON 文件')).toHaveFocus()
  await user.tab()
  expect(screen.getByRole('button', { name: '关闭同步' })).toHaveFocus()

  await user.keyboard('{Escape}')
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(trigger).toHaveFocus()
})

test('uses real workout and trend destinations while keeping the five-tab shell', async () => {
  const user = userEvent.setup()
  render(<App />)

  await user.click(await screen.findByRole('button', { name: '今天' }))
  await screen.findByRole('heading', {
    name: /Lu|尚未导入今天的健康数据/,
  })
  expect(screen.getAllByRole('navigation')).toHaveLength(1)
  expect(
    screen.getAllByRole('button', { name: /今天|训练|趋势|回顾|我的/ }),
  ).toHaveLength(5)

  await user.click(screen.getByRole('button', { name: '训练' }))
  expect(await screen.findByRole('button', { name: '游泳' })).toBeVisible()

  await user.click(screen.getByRole('button', { name: '趋势' }))
  expect(await screen.findByRole('button', { name: '30 天' })).toBeVisible()
  expect(screen.getByRole('button', { name: '体重' })).toBeVisible()
})

test('mounts one user-controlled update prompt beside the app shell', async () => {
  render(<App />)

  await screen.findByRole('navigation', { name: '主导航' })
  expect(screen.getAllByText('有新版本')).toHaveLength(1)
  expect(screen.getAllByRole('button', { name: '立即更新' })).toHaveLength(1)
})
