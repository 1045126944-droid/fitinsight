import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test, vi } from 'vitest'
import { EMPTY_PROFILE } from '../../types/profile'
import { GoalsForm } from './GoalsForm'

test('persists every optional analysis goal from explicit form input', async () => {
  const user = userEvent.setup()
  const save = vi.fn()
  render(<GoalsForm initialGoals={EMPTY_PROFILE.goals} onSave={save} />)

  await user.selectOptions(
    screen.getByLabelText('当前目标'),
    'fatLossPreserveMuscle',
  )
  const values = [
    ['每日步数', '8200'],
    ['每周训练天数', '4'],
    ['每周游泳次数', '2'],
    ['每周力量训练次数', '2'],
    ['每周中等强度运动（分钟）', '210'],
    ['睡眠下限（分钟）', '420'],
    ['睡眠上限（分钟）', '540'],
    ['阶段目标体重下限（公斤）', '74'],
    ['阶段目标体重上限（公斤）', '77'],
    ['长期参考体重下限（公斤）', '70'],
    ['长期参考体重上限（公斤）', '73'],
    ['每周减重下限（公斤）', '0.3'],
    ['每周减重上限（公斤）', '0.6'],
    ['目标体脂率（%）', '24'],
  ] as const
  for (const [label, input] of values) {
    await user.type(screen.getByLabelText(label), input)
  }

  await user.click(screen.getByRole('button', { name: '保存目标' }))

  expect(save).toHaveBeenCalledWith({
    objective: 'fatLossPreserveMuscle',
    dailySteps: 8200,
    weeklyWorkoutDays: 4,
    weeklySwimmingSessions: 2,
    weeklyStrengthSessions: 2,
    weeklyModerateMinutes: 210,
    sleepMinMinutes: 420,
    sleepMaxMinutes: 540,
    targetWeightRangeKg: [74, 77],
    longTermWeightRangeKg: [70, 73],
    targetWeeklyWeightLossKg: [0.3, 0.6],
    targetBodyFatPercentage: 24,
  })
})

test('rejects an incomplete or reversed range instead of silently discarding it', async () => {
  const user = userEvent.setup()
  const save = vi.fn()
  render(<GoalsForm initialGoals={EMPTY_PROFILE.goals} onSave={save} />)

  await user.type(screen.getByLabelText('每周减重下限（公斤）'), '0.6')
  await user.type(screen.getByLabelText('每周减重上限（公斤）'), '0.3')
  await user.click(screen.getByRole('button', { name: '保存目标' }))

  expect(await screen.findByRole('alert')).toHaveTextContent(
    '每周减重范围的下限不能高于上限',
  )
  expect(save).not.toHaveBeenCalled()
})

test('rejects a sleep minimum above its maximum', async () => {
  const user = userEvent.setup()
  const save = vi.fn()
  render(<GoalsForm initialGoals={EMPTY_PROFILE.goals} onSave={save} />)

  await user.type(screen.getByLabelText('睡眠下限（分钟）'), '540')
  await user.type(screen.getByLabelText('睡眠上限（分钟）'), '420')
  await user.click(screen.getByRole('button', { name: '保存目标' }))

  expect(await screen.findByRole('alert')).toHaveTextContent(
    '睡眠下限不能高于上限',
  )
  expect(save).not.toHaveBeenCalled()
})
