import { useState } from 'react'
import type { PersonalGoals } from '../../types/profile'
import styles from './profile.module.css'

type RangeGoalInputKey =
  'targetWeightRangeKg' | 'longTermWeightRangeKg' | 'targetWeeklyWeightLossKg'
type ScalarGoalInputKey = Exclude<
  keyof PersonalGoals,
  'objective' | RangeGoalInputKey
>
type GoalInputs = Record<ScalarGoalInputKey, string> &
  Record<RangeGoalInputKey, [string, string]>

export function GoalsForm({
  initialGoals,
  onSave,
}: {
  initialGoals: PersonalGoals
  onSave(goals: PersonalGoals): void | Promise<void>
}) {
  const [objective, setObjective] = useState(initialGoals.objective ?? '')
  const [inputs, setInputs] = useState(() => goalInputs(initialGoals))
  const [error, setError] = useState('')
  const update = (key: ScalarGoalInputKey, next: string) =>
    setInputs((current) => ({ ...current, [key]: next }))
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    const sleepMinMinutes = optionalNumber(inputs.sleepMinMinutes)
    const sleepMaxMinutes = optionalNumber(inputs.sleepMaxMinutes)
    if (
      sleepMinMinutes !== null &&
      sleepMaxMinutes !== null &&
      sleepMinMinutes > sleepMaxMinutes
    ) {
      setError('睡眠下限不能高于上限。')
      return
    }
    const ranges = [
      optionalRange(inputs.targetWeightRangeKg, '阶段目标体重范围', true),
      optionalRange(inputs.longTermWeightRangeKg, '长期参考体重范围', true),
      optionalRange(inputs.targetWeeklyWeightLossKg, '每周减重范围', false),
    ] as const
    const invalidRange = ranges.find((range) => range.error)
    if (invalidRange?.error) {
      setError(invalidRange.error)
      return
    }
    await onSave({
      objective:
        objective === 'fatLossPreserveMuscle' || objective === 'generalFitness'
          ? objective
          : null,
      dailySteps: optionalNumber(inputs.dailySteps),
      weeklyWorkoutDays: optionalNumber(inputs.weeklyWorkoutDays),
      weeklySwimmingSessions: optionalNumber(inputs.weeklySwimmingSessions),
      weeklyStrengthSessions: optionalNumber(inputs.weeklyStrengthSessions),
      weeklyModerateMinutes: optionalNumber(inputs.weeklyModerateMinutes),
      sleepMinMinutes,
      sleepMaxMinutes,
      targetWeightRangeKg: ranges[0].value,
      longTermWeightRangeKg: ranges[1].value,
      targetWeeklyWeightLossKg: ranges[2].value,
      targetBodyFatPercentage: optionalNumber(inputs.targetBodyFatPercentage),
    })
  }
  return (
    <section className={styles.panel} aria-labelledby="goals-title">
      <h2 id="goals-title">目标</h2>
      <p>所有目标均可留空；留空会按未知处理，不会自动填入通用值。</p>
      <form className={styles.form} onSubmit={(event) => void submit(event)}>
        <label>
          当前目标
          <select
            value={objective}
            onChange={(event) => setObjective(event.target.value)}
          >
            <option value="">未设置</option>
            <option value="fatLossPreserveMuscle">减脂并尽量保留肌肉</option>
            <option value="generalFitness">一般体能</option>
          </select>
        </label>
        <GoalInput
          label="每日步数"
          value={inputs.dailySteps}
          onChange={(value) => update('dailySteps', value)}
          min={0}
          max={100000}
          integer
        />
        <GoalInput
          label="每周训练天数"
          value={inputs.weeklyWorkoutDays}
          onChange={(value) => update('weeklyWorkoutDays', value)}
          min={0}
          max={7}
          integer
        />
        <GoalInput
          label="每周游泳次数"
          value={inputs.weeklySwimmingSessions}
          onChange={(value) => update('weeklySwimmingSessions', value)}
          min={0}
          max={49}
          integer
        />
        <GoalInput
          label="每周力量训练次数"
          value={inputs.weeklyStrengthSessions}
          onChange={(value) => update('weeklyStrengthSessions', value)}
          min={0}
          max={49}
          integer
        />
        <GoalInput
          label="每周中等强度运动（分钟）"
          value={inputs.weeklyModerateMinutes}
          onChange={(value) => update('weeklyModerateMinutes', value)}
          min={0}
          max={10080}
          integer
        />
        <GoalInput
          label="睡眠下限（分钟）"
          value={inputs.sleepMinMinutes}
          onChange={(value) => update('sleepMinMinutes', value)}
          min={0}
          max={1440}
          integer
        />
        <GoalInput
          label="睡眠上限（分钟）"
          value={inputs.sleepMaxMinutes}
          onChange={(value) => update('sleepMaxMinutes', value)}
          min={0}
          max={1440}
          integer
        />
        <GoalInput
          label="阶段目标体重下限（公斤）"
          value={inputs.targetWeightRangeKg[0]}
          onChange={(value) =>
            updateRange(setInputs, 'targetWeightRangeKg', 0, value)
          }
          min={1}
          max={500}
        />
        <GoalInput
          label="阶段目标体重上限（公斤）"
          value={inputs.targetWeightRangeKg[1]}
          onChange={(value) =>
            updateRange(setInputs, 'targetWeightRangeKg', 1, value)
          }
          min={1}
          max={500}
        />
        <GoalInput
          label="长期参考体重下限（公斤）"
          value={inputs.longTermWeightRangeKg[0]}
          onChange={(value) =>
            updateRange(setInputs, 'longTermWeightRangeKg', 0, value)
          }
          min={1}
          max={500}
        />
        <GoalInput
          label="长期参考体重上限（公斤）"
          value={inputs.longTermWeightRangeKg[1]}
          onChange={(value) =>
            updateRange(setInputs, 'longTermWeightRangeKg', 1, value)
          }
          min={1}
          max={500}
        />
        <GoalInput
          label="每周减重下限（公斤）"
          value={inputs.targetWeeklyWeightLossKg[0]}
          onChange={(value) =>
            updateRange(setInputs, 'targetWeeklyWeightLossKg', 0, value)
          }
          min={0}
          max={10}
        />
        <GoalInput
          label="每周减重上限（公斤）"
          value={inputs.targetWeeklyWeightLossKg[1]}
          onChange={(value) =>
            updateRange(setInputs, 'targetWeeklyWeightLossKg', 1, value)
          }
          min={0}
          max={10}
        />
        <GoalInput
          label="目标体脂率（%）"
          value={inputs.targetBodyFatPercentage}
          onChange={(value) => update('targetBodyFatPercentage', value)}
          min={0}
          max={100}
        />
        {error ? <p role="alert">{error}</p> : null}
        <button className={styles.secondaryButton} type="submit">
          保存目标
        </button>
      </form>
    </section>
  )
}

function GoalInput({
  label,
  value,
  onChange,
  min,
  max,
  integer = false,
}: {
  label: string
  value: string
  onChange(value: string): void
  min: number
  max: number
  integer?: boolean
}) {
  return (
    <label>
      {label}
      <input
        type="number"
        min={min}
        max={max}
        step={integer ? 1 : 'any'}
        inputMode={integer ? 'numeric' : 'decimal'}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  )
}

function goalInputs(goals: PersonalGoals): GoalInputs {
  return {
    dailySteps: value(goals.dailySteps),
    weeklyWorkoutDays: value(goals.weeklyWorkoutDays),
    weeklySwimmingSessions: value(goals.weeklySwimmingSessions),
    weeklyStrengthSessions: value(goals.weeklyStrengthSessions),
    weeklyModerateMinutes: value(goals.weeklyModerateMinutes),
    sleepMinMinutes: value(goals.sleepMinMinutes),
    sleepMaxMinutes: value(goals.sleepMaxMinutes),
    targetWeightRangeKg: rangeValues(goals.targetWeightRangeKg),
    longTermWeightRangeKg: rangeValues(goals.longTermWeightRangeKg),
    targetWeeklyWeightLossKg: rangeValues(goals.targetWeeklyWeightLossKg),
    targetBodyFatPercentage: value(goals.targetBodyFatPercentage),
  }
}

function updateRange(
  setInputs: React.Dispatch<React.SetStateAction<GoalInputs>>,
  key: RangeGoalInputKey,
  index: 0 | 1,
  next: string,
) {
  setInputs((current) => {
    const range: [string, string] = [...current[key]]
    range[index] = next
    return { ...current, [key]: range }
  })
}

function optionalRange(
  input: [string, string],
  label: string,
  positive: boolean,
): { value: [number, number] | null; error: string } {
  if (input[0].trim() === '' && input[1].trim() === '')
    return { value: null, error: '' }
  const low = optionalNumber(input[0])
  const high = optionalNumber(input[1])
  if (low === null || high === null || (positive && (low <= 0 || high <= 0)))
    return { value: null, error: `${label}需要同时填写有效的上下限。` }
  if (low > high) return { value: null, error: `${label}的下限不能高于上限。` }
  return { value: [low, high], error: '' }
}

function optionalNumber(input: string): number | null {
  if (input.trim() === '') return null
  const parsed = Number(input)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null
}
function value(input: number | null): string {
  return input === null ? '' : String(input)
}
function rangeValues(input: [number, number] | null): [string, string] {
  return input ? [String(input[0]), String(input[1])] : ['', '']
}
