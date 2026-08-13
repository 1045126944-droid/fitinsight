import type { ThemeChoice } from '../../app/preferences'
import styles from './profile.module.css'

export function ThemeControl({
  theme,
  weekStartsOn,
  onThemeChange,
  onWeekStartChange,
}: {
  theme: ThemeChoice
  weekStartsOn: 0 | 1
  onThemeChange(theme: ThemeChoice): void
  onWeekStartChange(day: 0 | 1): void
}) {
  return (
    <section className={styles.panel} aria-labelledby="appearance-title">
      <h2 id="appearance-title">显示与习惯</h2>
      <div className={styles.form}>
        <label>
          外观
          <select
            aria-label="外观"
            value={theme}
            onChange={(event) =>
              onThemeChange(event.target.value as ThemeChoice)
            }
          >
            <option value="system">跟随系统</option>
            <option value="light">浅色</option>
            <option value="dark">深色</option>
          </select>
        </label>
        <label>
          每周开始日
          <select
            aria-label="每周开始日"
            value={weekStartsOn}
            onChange={(event) =>
              onWeekStartChange(Number(event.target.value) as 0 | 1)
            }
          >
            <option value={1}>星期一</option>
            <option value={0}>星期日</option>
          </select>
        </label>
      </div>
    </section>
  )
}
