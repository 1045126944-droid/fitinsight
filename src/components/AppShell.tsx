import type { ReactNode } from 'react'

type AppShellProps = {
  children: ReactNode
  navigation: ReactNode
  notice?: ReactNode
}

export function AppShell({ children, navigation, notice }: AppShellProps) {
  return (
    <div className="app-shell">
      <main className="app-shell__content" id="main-content">
        {notice}
        {children}
      </main>
      <div className="app-shell__navigation">{navigation}</div>
    </div>
  )
}
