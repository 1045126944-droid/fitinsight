export interface UpdatePromptProps {
  needRefresh: boolean
  offlineReady: boolean
  applyUpdate: () => Promise<void>
  dismiss: () => void
}

export function UpdatePrompt({
  needRefresh,
  offlineReady,
  applyUpdate,
  dismiss,
}: UpdatePromptProps) {
  if (!needRefresh && !offlineReady) {
    return null
  }

  return (
    <aside className="update-prompt" role="status" aria-live="polite">
      <p>{needRefresh ? '有新版本' : '可离线使用'}</p>
      <div className="update-prompt__actions">
        {needRefresh ? (
          <button type="button" onClick={() => void applyUpdate()}>
            立即更新
          </button>
        ) : null}
        <button type="button" onClick={dismiss}>
          稍后
        </button>
      </div>
    </aside>
  )
}
