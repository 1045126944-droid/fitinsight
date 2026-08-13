import { useState } from 'react'
import type { PreparedBackup } from '../../db/backup'
import type { FitInsightBackup } from '../../types/storage'
import { BackupRestoreDialog } from './BackupRestoreDialog'
import { ClearDataDialog } from './ClearDataDialog'
import styles from './profile.module.css'

const MAX_BACKUP_FILE_BYTES = 100 * 1024 * 1024

export function DataManagementPanel({
  createBackup,
  prepareBackup,
  restoreBackup,
  clearData,
}: {
  createBackup(): Promise<FitInsightBackup> | void
  prepareBackup?(text: string): PreparedBackup
  restoreBackup?(prepared: PreparedBackup): Promise<{ refreshed: boolean }>
  clearData?(): Promise<{ preferencesCleared: boolean; refreshed: boolean }>
}) {
  const [exportWarning, setExportWarning] = useState(false)
  const [prepared, setPrepared] = useState<PreparedBackup | null>(null)
  const [clearOpen, setClearOpen] = useState(false)
  const [status, setStatus] = useState('')
  const [exportError, setExportError] = useState('')
  const [exportBusy, setExportBusy] = useState(false)
  const exportData = async () => {
    setExportBusy(true)
    setExportError('')
    setStatus('')
    try {
      const backup = await createBackup()
      if (!backup) throw new Error('backup unavailable')
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(backup, null, 2)], {
          type: 'application/json',
        }),
      )
      const link = document.createElement('a')
      link.href = url
      link.download = 'fitinsight-local-backup.json'
      link.click()
      URL.revokeObjectURL(url)
      setExportWarning(false)
      setStatus('备份已导出；请妥善保存这个敏感的明文文件。')
    } catch {
      setExportError('导出失败；未生成备份文件。请重试。')
    } finally {
      setExportBusy(false)
    }
  }
  const selectBackup = async (file: File) => {
    if (!prepareBackup) return
    if (file.size > MAX_BACKUP_FILE_BYTES) {
      setPrepared(null)
      setStatus(
        '备份文件超过 100 MiB；为避免 iPhone 内存不足，已在读取前停止。当前数据未改变。',
      )
      return
    }
    try {
      setStatus('')
      setPrepared(prepareBackup(await file.text()))
    } catch {
      setStatus('无法读取该备份文件；当前数据未改变。')
    }
  }
  return (
    <section className={styles.panel} aria-labelledby="data-management-title">
      <h2 id="data-management-title">本地数据管理</h2>
      <p>备份和恢复都只在此设备进行，不会上传到服务器。</p>
      <button
        className={styles.secondaryButton}
        type="button"
        onClick={() => setExportWarning(true)}
      >
        导出本地数据备份
      </button>
      {exportWarning ? (
        <div className={styles.warning}>
          <p>备份文件包含敏感的明文健康数据</p>
          <button
            className={styles.primaryButton}
            type="button"
            disabled={exportBusy}
            onClick={() => void exportData()}
          >
            {exportBusy ? '正在导出' : '我了解，继续导出'}
          </button>
          {exportError ? <p role="alert">{exportError}</p> : null}
          <button type="button" onClick={() => setExportWarning(false)}>
            取消
          </button>
        </div>
      ) : null}
      <label className={styles.filePicker}>
        选择要恢复的备份文件
        <input
          aria-label="选择要恢复的备份文件"
          type="file"
          accept="application/json,.json"
          onChange={(event) => {
            const file = event.currentTarget.files?.item(0)
            if (file) void selectBackup(file)
            event.currentTarget.value = ''
          }}
        />
      </label>
      <button
        className={styles.dangerButton}
        type="button"
        onClick={() => setClearOpen(true)}
      >
        清除全部本地数据
      </button>
      {status ? <p role="status">{status}</p> : null}
      {prepared && restoreBackup ? (
        <BackupRestoreDialog
          prepared={prepared}
          onRestore={() => restoreBackup(prepared)}
          onClose={() => setPrepared(null)}
        />
      ) : null}
      <ClearDataDialog
        open={clearOpen}
        onCancel={() => setClearOpen(false)}
        onConfirm={clearData ?? (() => undefined)}
      />
    </section>
  )
}
