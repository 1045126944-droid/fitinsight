import { useEffect, useRef, useState } from 'react'
import styles from './profile.module.css'

export function ClearDataDialog({
  open,
  onCancel,
  onConfirm,
}: ClearDataDialogProps) {
  if (!open) return null
  return <ClearDataDialogSession onCancel={onCancel} onConfirm={onConfirm} />
}

type ClearDataDialogProps = {
  open: boolean
  onCancel(): void
  onConfirm():
    | void
    | { preferencesCleared: boolean; refreshed: boolean }
    | Promise<void | { preferencesCleared: boolean; refreshed: boolean }>
}

function ClearDataDialogSession({
  onCancel,
  onConfirm,
}: Omit<ClearDataDialogProps, 'open'>) {
  const confirmButton = useRef<HTMLButtonElement>(null)
  const previousFocus = useRef<HTMLElement | null>(null)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  useEffect(() => {
    previousFocus.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null
    confirmButton.current?.focus()
    return () => previousFocus.current?.focus()
  }, [])
  const confirm = async () => {
    setBusy(true)
    setStatus('')
    setError('')
    try {
      const outcome = await onConfirm()
      setStatus(
        outcome?.refreshed === false
          ? '本地数据已清除，但界面未能刷新；请重新打开应用确认。'
          : outcome?.preferencesCleared === false
            ? '本地数据库已清除，但界面偏好未能移除。'
            : '清除完成。',
      )
    } catch {
      setError('清除失败；本地数据未确认发生变化。')
    } finally {
      setBusy(false)
    }
  }
  return (
    <div
      className={styles.backdrop}
      role="dialog"
      aria-modal="true"
      aria-labelledby="clear-data-title"
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault()
          onCancel()
        }
        if (event.key === 'Tab') trapFocus(event)
      }}
    >
      <section className={styles.dialog}>
        <h2 id="clear-data-title">清除全部本地数据</h2>
        <p>
          这会清除本机 IndexedDB 中的健康数据、个人资料和导入记录，以及
          FitInsight 的四项界面偏好。
        </p>
        <p>无法清除你已存到“文件”或 iCloud Drive 的备份副本。</p>
        {status ? <p role="status">{status}</p> : null}
        {error ? <p role="alert">{error}</p> : null}
        <div className={styles.dialogActions}>
          <button type="button" onClick={onCancel}>
            取消
          </button>
          <button
            ref={confirmButton}
            className={styles.dangerButton}
            type="button"
            disabled={busy || Boolean(status)}
            onClick={() => void confirm()}
          >
            {busy ? '正在清除' : '清除全部本地数据'}
          </button>
        </div>
      </section>
    </div>
  )
}

function trapFocus(event: React.KeyboardEvent<HTMLDivElement>): void {
  const focusable = [
    ...event.currentTarget.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), select:not([disabled]), a[href]',
    ),
  ]
  const first = focusable.at(0)
  const last = focusable.at(-1)
  if (!first || !last) return
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}
