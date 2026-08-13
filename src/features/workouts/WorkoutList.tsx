import { Pulse } from '@phosphor-icons/react'
import type { WorkoutListItem } from './workout-view-model'
import styles from './workouts.module.css'

export function WorkoutList({
  items,
  onSelect,
}: {
  items: readonly WorkoutListItem[]
  onSelect: (id: string, trigger: HTMLButtonElement) => void
}) {
  const groups = groupByLocalDate(items)
  if (groups.length === 0)
    return <p className={styles.filteredEmpty}>这个分类还没有训练记录。</p>

  return (
    <div className={styles.list}>
      {groups.map((group) => (
        <section
          key={group.localDate}
          aria-labelledby={`workouts-${group.localDate}`}
        >
          <h2 id={`workouts-${group.localDate}`}>
            {formatGroupDate(group.localDate)}
          </h2>
          <div className={styles.group}>
            {group.items.map((item) => (
              <article key={item.id} className={styles.card}>
                <button
                  type="button"
                  onClick={(event) => onSelect(item.id, event.currentTarget)}
                >
                  <span className={styles.icon}>
                    <Pulse size={24} weight="regular" aria-hidden="true" />
                  </span>
                  <span className={styles.cardCopy}>
                    <strong>{item.typeLabel}</strong>
                    <span>{item.startLabel}</span>
                    {item.summary ? <small>{item.summary}</small> : null}
                  </span>
                  <span className={styles.disclosure} aria-hidden="true">
                    ›
                  </span>
                </button>
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

function groupByLocalDate(items: readonly WorkoutListItem[]) {
  const groups: { localDate: string; items: WorkoutListItem[] }[] = []
  for (const item of items) {
    const previous = groups.at(-1)
    if (previous?.localDate === item.localDate) previous.items.push(item)
    else groups.push({ localDate: item.localDate, items: [item] })
  }
  return groups
}

function formatGroupDate(date: string): string {
  const [year, month, day] = date.split('-').map(Number)
  const weekday = new Intl.DateTimeFormat('zh-CN', {
    weekday: 'short',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year!, month! - 1, day!)))
  return `${month}月${day}日 ${weekday}`
}
