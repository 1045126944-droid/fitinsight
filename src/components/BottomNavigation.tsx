import {
  Barbell,
  ChartBar,
  ClipboardText,
  House,
  UserCircle,
} from '@phosphor-icons/react'
import { APP_TABS, type AppTab } from '../app/navigation'

type BottomNavigationProps = {
  activeTab: AppTab
  onChange: (tab: AppTab) => void
}

export function BottomNavigation({
  activeTab,
  onChange,
}: BottomNavigationProps) {
  return (
    <nav className="bottom-navigation" aria-label="主导航">
      {APP_TABS.map((tab) => {
        const isActive = tab.id === activeTab

        return (
          <button
            key={tab.id}
            className="bottom-navigation__item"
            type="button"
            aria-current={isActive ? 'page' : undefined}
            onClick={() => onChange(tab.id)}
          >
            <span aria-hidden="true">{iconFor(tab.id)}</span>
            <span>{tab.label}</span>
          </button>
        )
      })}
    </nav>
  )
}

function iconFor(tab: AppTab) {
  if (tab === 'today') return <House size={25} weight="fill" />
  if (tab === 'workouts') return <Barbell size={25} weight="fill" />
  if (tab === 'trends') return <ChartBar size={25} weight="fill" />
  if (tab === 'reviews') return <ClipboardText size={25} weight="fill" />
  return <UserCircle size={25} weight="fill" />
}
