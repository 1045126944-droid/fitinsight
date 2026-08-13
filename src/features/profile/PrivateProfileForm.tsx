import { useState } from 'react'
import { EMPTY_PROFILE, type UserProfile } from '../../types/profile'
import { profileSaveMessage } from './profile-save-message'
import styles from './profile.module.css'

type PrivateProfileFormProps = {
  initialProfile: UserProfile | null
  onSave(profile: UserProfile): void | Promise<void>
}

export function PrivateProfileForm({
  initialProfile,
  onSave,
}: PrivateProfileFormProps) {
  const seed = cloneProfile(initialProfile)
  const [name, setName] = useState(seed.name)
  const [sex, setSex] = useState(seed.sex)
  const [birthDate, setBirthDate] = useState(seed.birthDate ?? '')
  const [age, setAge] = useState(seed.ageAsOf?.age?.toString() ?? '')
  const [ageAsOfDate, setAgeAsOfDate] = useState(
    seed.ageAsOf?.date ?? localDateToday(),
  )
  const [heightCm, setHeightCm] = useState(value(seed.heightCm))
  const [maximumHeartRateBpm, setMaximumHeartRateBpm] = useState(
    value(seed.maximumHeartRateBpm),
  )
  const [weightKg, setWeightKg] = useState(value(seed.bodyContext.weightKg))
  const [bodyFatMassKg, setBodyFatMassKg] = useState(
    value(seed.bodyContext.bodyFatMassKg),
  )
  const [bodyFatPercentage, setBodyFatPercentage] = useState(
    value(seed.bodyContext.bodyFatPercentage),
  )
  const [skeletalMuscleMassKg, setSkeletalMuscleMassKg] = useState(
    value(seed.bodyContext.skeletalMuscleMassKg),
  )
  const [bmi, setBmi] = useState(value(seed.bodyContext.bmi))
  const [waistHipRatio, setWaistHipRatio] = useState(
    value(seed.bodyContext.waistHipRatio),
  )
  const [visceralFatLevel, setVisceralFatLevel] = useState(
    value(seed.bodyContext.visceralFatLevel),
  )
  const [basalMetabolicRateKcal, setBasalMetabolicRateKcal] = useState(
    value(seed.bodyContext.basalMetabolicRateKcal),
  )
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const localToday = localDateToday()
    const parsedBirthDate = birthDate || null
    setError('')
    setNotice('')
    const parsedAge = numberOrNull(age, true)
    if (parsedBirthDate && parsedBirthDate > localToday) {
      setError('出生日期不能晚于今天。')
      return
    }
    if (!parsedBirthDate && parsedAge !== null && !ageAsOfDate) {
      setError('年龄截至日期不能为空。')
      return
    }
    if (!parsedBirthDate && parsedAge !== null && ageAsOfDate > localToday) {
      setError('年龄截至日期不能晚于今天。')
      return
    }
    const profile: UserProfile = {
      ...seed,
      name: name.trim(),
      sex,
      birthDate: parsedBirthDate,
      ageAsOf: parsedBirthDate
        ? ageForBirthDate(parsedBirthDate, localToday)
        : parsedAge === null
          ? null
          : { age: parsedAge, date: ageAsOfDate },
      heightCm: numberOrNull(heightCm),
      maximumHeartRateBpm: numberOrNull(maximumHeartRateBpm),
      bodyContext: {
        weightKg: numberOrNull(weightKg),
        bodyFatMassKg: nonNegativeNumberOrNull(bodyFatMassKg),
        bodyFatPercentage: nonNegativeNumberOrNull(bodyFatPercentage),
        skeletalMuscleMassKg: nonNegativeNumberOrNull(skeletalMuscleMassKg),
        bmi: numberOrNull(bmi),
        waistHipRatio: numberOrNull(waistHipRatio),
        visceralFatLevel: numberOrNull(visceralFatLevel, true),
        basalMetabolicRateKcal: numberOrNull(basalMetabolicRateKcal),
      },
      updatedAt: new Date().toISOString(),
    }
    setSaving(true)
    try {
      await onSave(profile)
      setNotice(profileSaveMessage(profile))
    } catch {
      setError('保存失败；个人资料未确认写入本机。')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className={styles.panel} aria-labelledby="private-profile-title">
      <h2 id="private-profile-title">仅在此设备保存的个人资料</h2>
      <p>所有项目均可留空；它们只会保存在本机的 IndexedDB。</p>
      <form className={styles.form} onSubmit={(event) => void submit(event)}>
        <label>
          姓名
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <label>
          生理性别
          <select
            value={sex}
            onChange={(event) =>
              setSex(event.target.value as UserProfile['sex'])
            }
          >
            <option value="unspecified">未说明</option>
            <option value="female">女性</option>
            <option value="male">男性</option>
            <option value="other">其他</option>
          </select>
        </label>
        <label>
          出生日期
          <input
            type="date"
            value={birthDate}
            onChange={(event) => setBirthDate(event.target.value)}
          />
        </label>
        {!birthDate ? (
          <>
            <label>
              年龄（截至 {ageAsOfDate}）
              <input
                inputMode="numeric"
                type="number"
                min="0"
                max="130"
                value={age}
                onChange={(event) => setAge(event.target.value)}
              />
            </label>
            <label>
              年龄截至日期
              <input
                type="date"
                value={ageAsOfDate}
                onChange={(event) => setAgeAsOfDate(event.target.value)}
              />
            </label>
          </>
        ) : (
          <p className={styles.hint}>
            年龄会按本地日期计算：{displayAge(birthDate)}。
          </p>
        )}
        <label>
          身高（厘米）
          <input
            inputMode="decimal"
            type="number"
            min="1"
            max="300"
            step="any"
            value={heightCm}
            onChange={(event) => setHeightCm(event.target.value)}
          />
        </label>
        <label>
          最大心率（次/分钟）
          <input
            inputMode="numeric"
            type="number"
            min="1"
            max="300"
            value={maximumHeartRateBpm}
            onChange={(event) => setMaximumHeartRateBpm(event.target.value)}
          />
        </label>
        <label>
          当前体重（公斤）
          <input
            inputMode="decimal"
            type="number"
            min="1"
            max="500"
            step="any"
            value={weightKg}
            onChange={(event) => setWeightKg(event.target.value)}
          />
        </label>
        <label>
          体脂肪量（公斤）
          <input
            inputMode="decimal"
            type="number"
            min="0"
            max="500"
            step="any"
            value={bodyFatMassKg}
            onChange={(event) => setBodyFatMassKg(event.target.value)}
          />
        </label>
        <label>
          体脂率（%）
          <input
            inputMode="decimal"
            type="number"
            min="0"
            max="100"
            step="any"
            value={bodyFatPercentage}
            onChange={(event) => setBodyFatPercentage(event.target.value)}
          />
        </label>
        <label>
          骨骼肌量（公斤）
          <input
            inputMode="decimal"
            type="number"
            min="0"
            max="500"
            step="any"
            value={skeletalMuscleMassKg}
            onChange={(event) => setSkeletalMuscleMassKg(event.target.value)}
          />
        </label>
        <label>
          BMI
          <input
            inputMode="decimal"
            type="number"
            min="1"
            max="100"
            step="any"
            value={bmi}
            onChange={(event) => setBmi(event.target.value)}
          />
        </label>
        <label>
          腰臀比
          <input
            inputMode="decimal"
            type="number"
            min="0.1"
            max="5"
            step="any"
            value={waistHipRatio}
            onChange={(event) => setWaistHipRatio(event.target.value)}
          />
        </label>
        <label>
          内脏脂肪等级
          <input
            inputMode="numeric"
            type="number"
            min="0"
            max="100"
            step="1"
            value={visceralFatLevel}
            onChange={(event) => setVisceralFatLevel(event.target.value)}
          />
        </label>
        <label>
          基础代谢估算（千卡）
          <input
            inputMode="numeric"
            type="number"
            min="1"
            max="10000"
            step="1"
            value={basalMetabolicRateKcal}
            onChange={(event) => setBasalMetabolicRateKcal(event.target.value)}
          />
        </label>
        {notice ? (
          <p role="status" className={styles.warning}>
            {notice}
          </p>
        ) : null}
        {error ? <p role="alert">{error}</p> : null}
        <button
          className={styles.primaryButton}
          type="submit"
          disabled={saving}
        >
          {saving ? '正在保存' : '保存到本机'}
        </button>
      </form>
    </section>
  )
}

function cloneProfile(profile: UserProfile | null): UserProfile {
  return structuredClone({
    ...EMPTY_PROFILE,
    ...(profile ?? {}),
    updatedAt: profile?.updatedAt ?? '',
  })
}

function value(number: number | null): string {
  return number === null ? '' : String(number)
}

function numberOrNull(input: string, integer = false): number | null {
  if (input.trim() === '') return null
  const parsed = Number(input)
  return Number.isFinite(parsed) &&
    (integer ? parsed >= 0 : parsed > 0) &&
    (!integer || Number.isInteger(parsed))
    ? parsed
    : null
}

function nonNegativeNumberOrNull(input: string): number | null {
  if (input.trim() === '') return null
  const parsed = Number(input)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null
}

function ageForBirthDate(
  birthDate: string,
  today: string,
): { age: number; date: string } | null {
  const [birthYear, birthMonth, birthDay] = birthDate.split('-').map(Number)
  const [year, month, day] = today.split('-').map(Number)
  if (!birthYear || !birthMonth || !birthDay || !year || !month || !day)
    return null
  const age =
    year -
    birthYear -
    (month < birthMonth || (month === birthMonth && day < birthDay) ? 1 : 0)
  return age >= 0 ? { age, date: today } : null
}

function localDateToday(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  )
  return `${values.year!}-${values.month!}-${values.day!}`
}

function displayAge(birthDate: string): string {
  const age = ageForBirthDate(birthDate, localDateToday())
  return age ? `${age.age} 岁（截至 ${age.date}）` : '无法计算'
}
