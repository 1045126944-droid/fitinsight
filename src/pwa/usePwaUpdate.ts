import { useCallback } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'

export interface PwaUpdateState {
  needRefresh: boolean
  offlineReady: boolean
  applyUpdate: () => Promise<void>
  dismiss: () => void
}

export function usePwaUpdate(): PwaUpdateState {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW()

  const applyUpdate = useCallback(
    () => updateServiceWorker(true),
    [updateServiceWorker],
  )
  const dismiss = useCallback(() => {
    setNeedRefresh(false)
    setOfflineReady(false)
  }, [setNeedRefresh, setOfflineReady])

  return { needRefresh, offlineReady, applyUpdate, dismiss }
}
