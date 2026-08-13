import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import type { PreparedImport } from './import-service'
import { SyncSheet } from './SyncSheet'
import { makeNormalizedEnvelope } from '../../tests/fixtures/health-envelope'

beforeEach(() => {
  const shanghaiOptions = new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
  }).resolvedOptions()
  vi.spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions').mockReturnValue(
    shanghaiOptions,
  )
  vi.useFakeTimers({ shouldAdvanceTime: true })
  vi.setSystemTime(new Date('2026-08-09T18:00:00+08:00'))
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

function makePreparedImport(
  counts: Partial<PreparedImport['summary']['daily']>,
): PreparedImport {
  const data = makeNormalizedEnvelope()
  return {
    fileName: 'synthetic.json',
    schemaVersion: '1.0.0',
    data,
    baseRevision: 0,
    replaceBundledDemo: false,
    plan: {
      baseRevision: 0,
      generatedAt: '2026-07-29T10:15:00+08:00',
      timezone: 'Asia/Shanghai',
      source: 'Synthetic Shortcut',
      coverage: {
        startDate: '2026-07-28',
        endDate: '2026-07-29',
        includedMetrics: ['steps', 'sleep', 'workouts'],
        mode: 'patch',
      },
      dailyChanges: [],
      workoutChanges: [],
      bodyChanges: [],
      counts: {
        daily: { added: 0, updated: 0, unchanged: 0, skipped: 0, ...counts },
        workouts: { added: 0, updated: 0, unchanged: 0, skipped: 0 },
        body: { added: 0, updated: 0, unchanged: 0, skipped: 0 },
        warningCount: 0,
      },
      warnings: [],
    },
    summary: {
      daily: { added: 0, updated: 0, unchanged: 0, skipped: 0, ...counts },
      workouts: { added: 0, updated: 0, unchanged: 0, skipped: 0 },
      body: { added: 0, updated: 0, unchanged: 0, skipped: 0 },
      warningCount: 0,
    },
    warnings: [],
  }
}

function deferred<T>() {
  let resolve: (value: T) => void
  let reject: (reason?: unknown) => void
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve
    reject = nextReject
  })
  return { promise, resolve: resolve!, reject: reject! }
}

test('shows exact preview counts and writes only after confirmation', async () => {
  const user = userEvent.setup()
  const inspect = vi
    .fn()
    .mockResolvedValue(makePreparedImport({ added: 3, updated: 1, skipped: 1 }))
  const commit = vi.fn().mockResolvedValue({
    daily: { added: 3, updated: 1, unchanged: 0, skipped: 1 },
    workouts: { added: 1, updated: 0, unchanged: 0, skipped: 0 },
    body: { added: 0, updated: 1, unchanged: 0, skipped: 0 },
    warningCount: 0,
    lastImportedAt: '2026-08-09T17:24:00+08:00',
  })

  render(
    <SyncSheet
      open
      onClose={vi.fn()}
      inspectFile={inspect}
      commitImport={commit}
    />,
  )
  expect(screen.getByText('选择健康数据')).toBeVisible()
  await user.upload(
    screen.getByLabelText('选择 JSON 文件'),
    new File(['{}'], 'health.json', { type: 'application/json' }),
  )

  expect((await screen.findByText('新增')).closest('div')).toHaveTextContent(
    '新增3 条',
  )
  expect(screen.getByText('更新').closest('div')).toHaveTextContent('更新1 条')
  expect(screen.getByText('跳过').closest('div')).toHaveTextContent('跳过1 条')
  expect(commit).not.toHaveBeenCalled()

  await user.click(screen.getByRole('button', { name: '确认导入' }))
  expect(await screen.findByRole('status')).toHaveTextContent('同步完成')
  expect(screen.getByText('健康日记录已更新 4 条')).toBeVisible()
  expect(screen.getByText('新增 1 条训练')).toBeVisible()
  expect(screen.getByText('睡眠数据已更新')).toBeVisible()
  expect(screen.getByText('身体测量已更新 1 条')).toBeVisible()
  expect(screen.getByText('最近同步：今天 17:24')).toBeVisible()
  expect(commit).toHaveBeenCalledOnce()
})

test('shows the safe transaction failure copy when confirmation fails', async () => {
  const user = userEvent.setup()
  render(
    <SyncSheet
      open
      onClose={vi.fn()}
      inspectFile={vi.fn().mockResolvedValue(makePreparedImport({ added: 1 }))}
      commitImport={vi.fn().mockRejectedValue(new Error('raw failure'))}
    />,
  )
  await user.upload(
    screen.getByLabelText('选择 JSON 文件'),
    new File(['{}'], 'health.json', { type: 'application/json' }),
  )
  await user.click(await screen.findByRole('button', { name: '确认导入' }))

  expect(await screen.findByRole('alert')).toHaveTextContent(
    '导入未完成，原有数据没有改变。',
  )
})

test('closing the sheet discards the prepared file and warnings', async () => {
  const user = userEvent.setup()
  const inspect = vi.fn().mockResolvedValue(makePreparedImport({ added: 1 }))
  const { rerender } = render(
    <SyncSheet
      open
      onClose={vi.fn()}
      inspectFile={inspect}
      commitImport={vi.fn()}
    />,
  )
  await user.upload(
    screen.getByLabelText('选择 JSON 文件'),
    new File(['{}'], 'health.json', { type: 'application/json' }),
  )
  await expectAddedCount(1)

  rerender(
    <SyncSheet
      open={false}
      onClose={vi.fn()}
      inspectFile={inspect}
      commitImport={vi.fn()}
    />,
  )
  rerender(
    <SyncSheet
      open
      onClose={vi.fn()}
      inspectFile={inspect}
      commitImport={vi.fn()}
    />,
  )

  expect(screen.queryByText('新增')).not.toBeInTheDocument()
})

test('ignores a previous sheet session inspection that resolves after a newer file', async () => {
  const user = userEvent.setup()
  const first = deferred<PreparedImport>()
  const second = deferred<PreparedImport>()
  const inspect = vi
    .fn()
    .mockImplementationOnce(() => first.promise)
    .mockImplementationOnce(() => second.promise)
  const onClose = vi.fn()
  const { rerender } = render(
    <SyncSheet
      open
      onClose={onClose}
      inspectFile={inspect}
      commitImport={vi.fn()}
    />,
  )

  await user.upload(
    screen.getByLabelText('选择 JSON 文件'),
    new File(['{}'], 'first.json', { type: 'application/json' }),
  )
  await user.click(screen.getByRole('button', { name: '关闭同步' }))
  await act(async () => {
    rerender(
      <SyncSheet
        open={false}
        onClose={onClose}
        inspectFile={inspect}
        commitImport={vi.fn()}
      />,
    )
  })
  rerender(
    <SyncSheet
      open
      onClose={onClose}
      inspectFile={inspect}
      commitImport={vi.fn()}
    />,
  )
  await user.upload(
    screen.getByLabelText('选择 JSON 文件'),
    new File(['{}'], 'second.json', { type: 'application/json' }),
  )

  second.resolve(makePreparedImport({ added: 2 }))
  await expectAddedCount(2)
  await act(async () => {
    first.resolve(makePreparedImport({ added: 1 }))
    await first.promise
  })

  expect(screen.getByText('新增').closest('div')).toHaveTextContent('新增2 条')
})

test('ignores a previous sheet session inspection rejection after a newer preview', async () => {
  const user = userEvent.setup()
  const first = deferred<PreparedImport>()
  const second = deferred<PreparedImport>()
  const inspect = vi
    .fn()
    .mockImplementationOnce(() => first.promise)
    .mockImplementationOnce(() => second.promise)
  const { rerender } = render(
    <SyncSheet
      open
      onClose={vi.fn()}
      inspectFile={inspect}
      commitImport={vi.fn()}
    />,
  )

  await user.upload(
    screen.getByLabelText('选择 JSON 文件'),
    new File(['{}'], 'first.json'),
  )
  await act(async () => {
    rerender(
      <SyncSheet
        open={false}
        onClose={vi.fn()}
        inspectFile={inspect}
        commitImport={vi.fn()}
      />,
    )
  })
  rerender(
    <SyncSheet
      open
      onClose={vi.fn()}
      inspectFile={inspect}
      commitImport={vi.fn()}
    />,
  )
  await user.upload(
    screen.getByLabelText('选择 JSON 文件'),
    new File(['{}'], 'second.json'),
  )

  second.resolve(makePreparedImport({ added: 2 }))
  await expectAddedCount(2)
  await act(async () => {
    first.reject(new Error('late failure'))
    await first.promise.catch(() => undefined)
  })

  expect(screen.getByText('新增').closest('div')).toHaveTextContent('新增2 条')
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
})

async function expectAddedCount(count: number) {
  expect((await screen.findByText('新增')).closest('div')).toHaveTextContent(
    `新增${count} 条`,
  )
}
