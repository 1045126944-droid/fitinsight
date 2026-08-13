import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test, vi } from 'vitest'
import type { AsyncTodayState, TodayViewModel } from './dashboard-view-model'
import { TodayPage } from './TodayPage'

test('leads with today status before the supporting action and opens synchronization', async () => {
  const user = userEvent.setup()
  const openSyncSheet = vi.fn()
  render(<TodayPage state={readyTodayState()} openSyncSheet={openSyncSheet} />)

  const score = screen.getByRole('region', { name: '今日状态' })
  const action = screen.getByRole('heading', { name: /今天怎么练/ })
  expect(screen.getByRole('heading', { name: '今日状态' })).toBeVisible()
  expect(
    score.compareDocumentPosition(action) & Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy()

  await user.click(screen.getByRole('button', { name: '同步' }))
  expect(openSyncSheet).toHaveBeenCalledOnce()
})

test('loading announces progress without fabricating a numeric score', () => {
  render(<TodayPage state={{ status: 'loading' }} openSyncSheet={vi.fn()} />)

  expect(screen.getByText('正在读取本地健康数据')).toHaveAttribute(
    'aria-busy',
    'true',
  )
  expect(screen.queryByText(/\d+\s*分/)).not.toBeInTheDocument()
})

test('empty state explains that today is missing and keeps synchronization available', async () => {
  const user = userEvent.setup()
  const openSyncSheet = vi.fn()
  render(
    <TodayPage
      state={{ status: 'empty', lastImportedAt: null }}
      openSyncSheet={openSyncSheet}
    />,
  )

  expect(screen.getByText('尚未导入今天的健康数据')).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: '同步' }))
  expect(openSyncSheet).toHaveBeenCalledOnce()
})

test('ready partial data renders only the detail values present in the view model', () => {
  const state = readyTodayState()
  state.viewModel.details = [
    {
      id: 'sleep',
      title: '睡眠',
      accent: 'sleep',
      items: [{ id: 'sleep-duration', label: '睡眠时长', value: '6小时58分' }],
    },
  ]
  render(<TodayPage state={state} openSyncSheet={vi.fn()} />)

  expect(screen.getByText('睡眠时长')).toBeInTheDocument()
  expect(screen.queryByText('深度睡眠')).not.toBeInTheDocument()
  expect(screen.queryByText('平均心率')).not.toBeInTheDocument()
})

test('prescription sync intent opens the existing synchronization sheet', async () => {
  const user = userEvent.setup()
  const openSyncSheet = vi.fn()
  const state = readyTodayState()
  state.viewModel.prescription = {
    title: '继续记录，先建立个人基线',
    reason: '当前覆盖不足，暂不生成强训练处方。',
    actionLabel: '导入本地数据',
    action: { intent: 'sync' },
    confidence: 'building',
  }

  render(<TodayPage state={state} openSyncSheet={openSyncSheet} />)
  await user.click(screen.getByRole('button', { name: '导入本地数据' }))

  expect(openSyncSheet).toHaveBeenCalledOnce()
})

test('prescription profile intent switches to the local profile destination', async () => {
  const user = userEvent.setup()
  const openProfile = vi.fn()
  const state = readyTodayState()
  state.viewModel.prescription = {
    title: '完善档案后再生成今日建议',
    reason: '目标和身体信息只保存在这台设备上。',
    actionLabel: '前往我的档案',
    action: { intent: 'profile' },
    confidence: 'building',
  }

  render(
    <TodayPage
      state={state}
      openSyncSheet={vi.fn()}
      openProfile={openProfile}
    />,
  )
  await user.click(screen.getByRole('button', { name: '前往我的档案' }))

  expect(openProfile).toHaveBeenCalledOnce()
})

test('prescription training intent switches to the workouts destination', async () => {
  const user = userEvent.setup()
  const openTraining = vi.fn()
  const state = readyTodayState()
  state.viewModel.prescription = {
    title: '补齐本周训练结构',
    reason: '本周目标还剩力量 1 次。',
    actionLabel: '查看本周训练安排',
    action: { intent: 'training' },
    confidence: 'high',
  }

  render(
    <TodayPage
      state={state}
      openSyncSheet={vi.fn()}
      openTraining={openTraining}
    />,
  )
  await user.click(screen.getByRole('button', { name: '查看本周训练安排' }))

  expect(openTraining).toHaveBeenCalledOnce()
})

test('evidence intent links only to the rendered evidence section', () => {
  const state = readyTodayState()
  state.viewModel.prescription = {
    title: '可考虑完整休息',
    reason: '当前有两项恢复信号偏弱。',
    actionLabel: '查看今日恢复依据',
    action: { intent: 'evidence', targetId: 'today-evidence' },
    confidence: 'medium',
  }

  render(<TodayPage state={state} openSyncSheet={vi.fn()} />)

  expect(
    screen.getByRole('link', { name: '查看今日恢复依据' }),
  ).toHaveAttribute('href', '#today-evidence')
  expect(document.getElementById('today-evidence')).toBeInTheDocument()
})

test('renders textual prescription and score confidence for building and low states', () => {
  const state = readyTodayState()
  state.viewModel.prescription = {
    ...state.viewModel.prescription!,
    action: { intent: 'details', targetId: 'today-details' },
    confidence: 'building',
  }
  state.viewModel.score = {
    ...state.viewModel.score,
    confidence: 'low',
  }

  render(<TodayPage state={state} openSyncSheet={vi.fn()} />)

  expect(screen.getByText('建议置信度：建立中')).toBeInTheDocument()
  expect(screen.getByText('今日评分置信度：低')).toBeInTheDocument()
})

function readyTodayState(): Extract<AsyncTodayState, { status: 'ready' }> {
  return { status: 'ready', viewModel: readyViewModel() }
}

function readyViewModel(): TodayViewModel {
  return {
    dateLabel: '7月29日 周三',
    greeting: '下午好，Lu',
    lastImportedLabel: '今天 13:42',
    prescription: {
      title: '用轻松步行接近日目标',
      reason: '距离个人步数目标还剩 1574 步，可按当日感受分段完成。',
      actionLabel: '分段完成剩余步数',
      action: { intent: 'details', targetId: 'today-details' },
      confidence: 'high',
    },
    score: {
      score: 82,
      coverage: 0.94,
      confidence: 'high',
      evidence: [],
    },
    statusLabel: '基本达标',
    evidence: [
      {
        id: 'steps',
        label: '步数',
        value: '8,426 步',
        statusText: '个人目标 10,000 步',
        accent: 'activity',
      },
      {
        id: 'sleep',
        label: '睡眠',
        value: '6小时58分',
        statusText: '昨夜记录',
        accent: 'sleep',
      },
      {
        id: 'recovery',
        label: '恢复',
        value: '78 分',
        statusText: '高置信度',
        accent: 'recovery',
      },
    ],
    recommendations: [
      {
        id: 'steps-progress',
        priority: 1,
        title: '用轻松步行接近日目标',
        reason: '距离个人步数目标还剩 1574 步，可按当日感受分段完成。',
        confidence: 'high',
        evidence: [
          {
            metric: 'stepsRemaining',
            observed: 1_574,
            target: 0,
            reason: '依据今日已记录步数与个人步数目标之差',
          },
        ],
      },
    ],
    details: [
      {
        id: 'activity',
        title: '活动',
        accent: 'activity',
        items: [
          { id: 'steps', label: '步数', value: '8,426 步' },
          { id: 'active-energy', label: '活动能量', value: '540 千卡' },
        ],
      },
    ],
  }
}
