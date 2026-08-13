import type { TodayDetailGroup } from './dashboard-view-model'
import styles from './dashboard.module.css'

export function TodayDetails({ groups }: { groups: TodayDetailGroup[] }) {
  if (groups.length === 0) return null
  return (
    <section
      className={styles.details}
      id="today-details"
      aria-labelledby="today-details-heading"
    >
      <h2 id="today-details-heading">今日记录</h2>
      {groups.map((group) => (
        <div className={styles.detailGroup} key={group.id}>
          <h3 data-accent={group.accent}>{group.title}</h3>
          <dl>
            {group.items.map((item) => (
              <div className={styles.detailRow} key={item.id}>
                <dt>{item.label}</dt>
                <dd>{item.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      ))}
    </section>
  )
}
