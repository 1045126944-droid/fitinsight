import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test, vi } from 'vitest'
import { EMPTY_PROFILE, type UserProfile } from '../../types/profile'
import { PrivateProfileForm } from './PrivateProfileForm'

test('does not prefill committed personal measurements and saves only after submit', async () => {
  const user = userEvent.setup()
  const save = vi.fn()
  render(<PrivateProfileForm initialProfile={null} onSave={save} />)

  expect(screen.getByLabelText('姓名')).toHaveValue('')
  expect(screen.getByLabelText('身高（厘米）')).toHaveValue(null)
  expect(screen.getByLabelText('当前体重（公斤）')).toHaveValue(null)

  await user.type(screen.getByLabelText('姓名'), '本地用户')
  await user.click(screen.getByRole('button', { name: '保存到本机' }))

  expect(save).toHaveBeenCalledWith(
    expect.objectContaining({ name: '本地用户' }),
  )
})

test('persists every optional body-context field only after explicit submit', async () => {
  const user = userEvent.setup()
  const save = vi.fn()
  render(<PrivateProfileForm initialProfile={null} onSave={save} />)

  const values = [
    ['当前体重（公斤）', '81.2'],
    ['体脂肪量（公斤）', '21.4'],
    ['体脂率（%）', '26.3'],
    ['骨骼肌量（公斤）', '34.1'],
    ['BMI', '26.5'],
    ['腰臀比', '0.91'],
    ['内脏脂肪等级', '8'],
    ['基础代谢估算（千卡）', '1680'],
  ] as const
  for (const [label, input] of values) {
    await user.type(screen.getByLabelText(label), input)
  }

  expect(save).not.toHaveBeenCalled()
  await user.click(screen.getByRole('button', { name: '保存到本机' }))

  expect(save).toHaveBeenCalledWith(
    expect.objectContaining({
      bodyContext: {
        weightKg: 81.2,
        bodyFatMassKg: 21.4,
        bodyFatPercentage: 26.3,
        skeletalMuscleMassKg: 34.1,
        bmi: 26.5,
        waistHipRatio: 0.91,
        visceralFatLevel: 8,
        basalMetabolicRateKcal: 1680,
      },
    }),
  )
})

test('preserves and displays an existing manual-age as-of date', async () => {
  const user = userEvent.setup()
  const save = vi.fn()
  const profile = profileWithManualAge()
  render(<PrivateProfileForm initialProfile={profile} onSave={save} />)

  expect(screen.getByLabelText('年龄（截至 2001-02-03）')).toHaveValue(18)
  expect(screen.getByLabelText('年龄截至日期')).toHaveValue('2001-02-03')

  await user.click(screen.getByRole('button', { name: '保存到本机' }))
  expect(save).toHaveBeenCalledWith(
    expect.objectContaining({ ageAsOf: { age: 18, date: '2001-02-03' } }),
  )
})

test('rejects a future birth date before saving', async () => {
  const user = userEvent.setup()
  const save = vi.fn()
  render(<PrivateProfileForm initialProfile={null} onSave={save} />)

  await user.type(screen.getByLabelText('出生日期'), '2999-01-01')
  await user.click(screen.getByRole('button', { name: '保存到本机' }))

  expect(await screen.findByRole('alert')).toHaveTextContent(
    '出生日期不能晚于今天。',
  )
  expect(save).not.toHaveBeenCalled()
})

test('does not persist a manual age with a blank as-of date', async () => {
  const user = userEvent.setup()
  const save = vi.fn()
  render(
    <PrivateProfileForm
      initialProfile={profileWithManualAge()}
      onSave={save}
    />,
  )

  await user.clear(screen.getByLabelText('年龄截至日期'))
  await user.click(screen.getByRole('button', { name: '保存到本机' }))

  expect(await screen.findByRole('alert')).toHaveTextContent(
    '年龄截至日期不能为空。',
  )
  expect(save).not.toHaveBeenCalled()
})

test('waits for saving to complete and surfaces a save failure', async () => {
  const user = userEvent.setup()
  let resolveSave: (() => void) | undefined
  const save = vi.fn(
    () => new Promise<void>((resolve) => (resolveSave = resolve)),
  )
  const { rerender } = render(
    <PrivateProfileForm initialProfile={null} onSave={save} />,
  )

  await user.type(screen.getByLabelText('身高（厘米）'), '75')
  await user.click(screen.getByRole('button', { name: '保存到本机' }))
  expect(screen.queryByText(/已保存/)).not.toBeInTheDocument()

  resolveSave?.()
  expect(await screen.findByRole('status')).toHaveTextContent('已保存')

  rerender(
    <PrivateProfileForm
      initialProfile={null}
      onSave={vi.fn().mockRejectedValue(new Error('storage unavailable'))}
    />,
  )
  await user.click(screen.getByRole('button', { name: '保存到本机' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('保存失败')
})

function profileWithManualAge(): UserProfile {
  return {
    ...structuredClone(EMPTY_PROFILE),
    ageAsOf: { age: 18, date: '2001-02-03' },
    updatedAt: '2001-02-03T00:00:00Z',
  }
}
