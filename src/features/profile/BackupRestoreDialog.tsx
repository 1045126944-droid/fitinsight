import { useEffect, useRef, useState } from 'react'
import type { PreparedBackup } from '../../db/backup'
import styles from './profile.module.css'

export function BackupRestoreDialog({
  prepared,
  onRestore,
  onClose = () => undefined,
}: {
  prepared: PreparedBackup
  onRestore():
    void | { refreshed: boolean } | Promise<void | { refreshed: boolean }>
  onClose?(): void
}) {
  const closeButton = useRef<HTMLButtonElement>(null)
  const previousFocus = useRef<HTMLElement | null>(null)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  useEffect(() => {
    previousFocus.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null
    closeButton.current?.focus()
    return () => previousFocus.current?.focus()
  }, [])
  const restore = async () => {
    setBusy(true)
    setStatus('')
    setError('')
    try {
      const outcome = await onRestore()
      setStatus(
        outcome?.refreshed === false
          ? '备份已恢复，但界面未能刷新；请重新打开应用确认。'
          : '恢复完成。',
      )
    } catch {
      setError('恢复失败；当前数据未确认发生变化。')
    } finally {
      setBusy(false)
    }
  }
  return (
    <div
      className={styles.backdrop}
      role="dialog"
      aria-modal="true"
      aria-labelledby="restore-title"
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault()
          onClose()
        }
        if (event.key === 'Tab') trapFocus(event)
      }}
    >
      <section className={styles.dialog}>
        <button
          ref={closeButton}
          className={styles.closeButton}
          type="button"
          aria-label="关闭恢复"
          onClick={onClose}
        >
          关闭
        </button>
        <h2 id="restore-title">恢复本地备份</h2>
        <p>恢复会替换当前全部本地数据</p>
        <p>
          备份含有敏感的明文健康数据。将替换：{prepared.counts.dailyRecords}{' '}
          条每日记录、{prepared.counts.workouts} 条训练、
          {prepared.counts.bodyMeasurements} 条身体测量、
          {prepared.counts.importHistory} 条导入记录
          {prepared.counts.hasProfile ? '和个人资料' : ''}。
        </p>
        {status ? <p role="status">{status}</p> : null}
        {error ? <p role="alert">{error}</p> : null}
        <button
          className={styles.dangerButton}
          type="button"
          disabled={busy || Boolean(status)}
          onClick={() => void restore()}
        >
          {busy ? '正在恢复' : '确认替换并恢复'}
        </button>
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
