import type { WorkoutCategory } from './workout-view-model'
import styles from './workouts.module.css'

const filters: readonly { id: WorkoutCategory; label: string }[] = [
  { id: 'all', label: '全部' },
  { id: 'swimming', label: '游泳' },
  { id: 'strength', label: '力量' },
  { id: 'walking', label: '步行' },
  { id: 'running', label: '跑步' },
  { id: 'other', label: '其他' },
]

export function WorkoutFilters({
  selected,
  onChange,
}: {
  selected: WorkoutCategory
  onChange: (category: WorkoutCategory) => void
}) {
  return (
    <div className={styles.filters} aria-label="训练分类">
      {filters.map((filter) => (
        <button
          key={filter.id}
          type="button"
          aria-pressed={selected === filter.id}
          onClick={() => onChange(filter.id)}
        >
          {filter.label}
        </button>
      ))}
    </div>
  )
}
