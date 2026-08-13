export type AppTab = 'today' | 'workouts' | 'trends' | 'reviews' | 'profile'

export type AppTabDefinition = {
  id: AppTab
  label: '今天' | '训练' | '趋势' | '回顾' | '我的'
}

export const APP_TABS: readonly AppTabDefinition[] = [
  { id: 'today', label: '今天' },
  { id: 'workouts', label: '训练' },
  { id: 'trends', label: '趋势' },
  { id: 'reviews', label: '回顾' },
  { id: 'profile', label: '我的' },
]
