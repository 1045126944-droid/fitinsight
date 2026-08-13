import { useEffect, useReducer, useRef } from 'react'
import { ArrowSquareOut, UploadSimple, X } from '@phosphor-icons/react'
import type { ImportSummary } from '../../types/storage'
import { ImportPreview } from './ImportPreview'
import { ImportResult } from './ImportResult'
import {
  importFlowReducer,
  initialImportFlowState,
} from './import-flow-reducer'
import {
  ImportServiceError,
  type ImportFailureCode,
  type PreparedImport,
} from './import-service'
import './import.css'

export const DEFAULT_SHORTCUT_URL =
  'shortcuts://run-shortcut?name=FitInsight%20同步'

type SyncSheetProps = {
  open: boolean
  onClose(): void
  inspectFile(file: File): Promise<PreparedImport>
  commitImport(prepared: PreparedImport): Promise<ImportSummary>
  onImported?(): void
  shortcutUrl?: string
}

export function SyncSheet({
  open,
  onClose,
  inspectFile,
  commitImport,
  onImported,
  shortcutUrl = DEFAULT_SHORTCUT_URL,
}: SyncSheetProps) {
  const [state, dispatch] = useReducer(
    importFlowReducer,
    initialImportFlowState,
  )
  const inspectionId = useRef(0)
  const closeButton = useRef<HTMLButtonElement>(null)
  const previousFocus = useRef<HTMLElement | null>(null)
  useEffect(() => {
    if (!open) dispatch({ type: 'reset' })
  }, [open])
  useEffect(() => {
    if (!open) return
    previousFocus.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null
    closeButton.current?.focus()
    return () => previousFocus.current?.focus()
  }, [open])
  if (!open) return null

  const inspect = async (file: File) => {
    const requestId = ++inspectionId.current
    dispatch({ type: 'inspect', requestId, file })
    try {
      dispatch({
        type: 'preview-ready',
        requestId,
        prepared: await inspectFile(file),
      })
    } catch (error) {
      dispatch({
        type: 'inspection-failed',
        requestId,
        error: failureCode(error),
      })
    }
  }
  const commit = async () => {
    if (state.phase !== 'preview') return
    dispatch({ type: 'commit' })
    try {
      const result = await commitImport(state.prepared)
      dispatch({ type: 'complete', result })
      onImported?.()
    } catch (error) {
      dispatch({
        type: 'commit-failed',
        requestId: state.requestId,
        error: failureCode(error),
      })
    }
  }
  const close = () => {
    dispatch({ type: 'reset' })
    onClose()
  }

  return (
    <div
      className="sync-sheet"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sync-sheet-title"
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault()
          close()
        }
        if (event.key === 'Tab') trapFocus(event)
      }}
    >
      <div className="sync-sheet__panel">
        <header className="sync-sheet__header">
          <div>
            <p>更新健康数据</p>
            <h1 id="sync-sheet-title">同步健康数据</h1>
          </div>
          <button
            ref={closeButton}
            className="sync-sheet__close"
            type="button"
            aria-label="关闭同步"
            onClick={close}
          >
            <X size={22} weight="bold" aria-hidden="true" />
          </button>
        </header>
        <p className="sync-sheet__intro">
          两步完成同步。健康数据只会写入这台设备的浏览器。
        </p>
        <section className="sync-sheet__step" aria-labelledby="sync-step-one">
          <span aria-hidden="true">1</span>
          <div>
            <h2 id="sync-step-one">运行 FitInsight 同步快捷指令</h2>
            <p>让快捷指令读取健康数据并保存最新 JSON。</p>
            <a className="sync-sheet__shortcut" href={shortcutUrl}>
              <ArrowSquareOut size={20} weight="bold" aria-hidden="true" />
              打开快捷指令
            </a>
          </div>
        </section>
        <section className="sync-sheet__step" aria-labelledby="sync-step-two">
          <span aria-hidden="true">2</span>
          <div>
            <h2 id="sync-step-two">导入刚刚生成的数据文件</h2>
            <p>先预览变化，确认后才会写入本地数据。</p>
            {(state.phase === 'preview' || state.phase === 'committing') && (
              <>
                <ImportPreview prepared={state.prepared} />
                <button
                  className="sync-sheet__primary"
                  type="button"
                  disabled={state.phase === 'committing'}
                  onClick={() => void commit()}
                >
                  {state.phase === 'committing' ? '正在导入' : '确认导入'}
                </button>
              </>
            )}
            {state.phase === 'complete' && (
              <ImportResult
                status="complete"
                summary={state.result}
                includedMetrics={
                  state.prepared.plan.coverage?.includedMetrics ?? []
                }
              />
            )}
            {state.phase === 'fatalError' && (
              <ImportResult status="error" code={state.error} />
            )}
            {state.phase !== 'preview' &&
              state.phase !== 'committing' &&
              state.phase !== 'complete' && (
                <label className="sync-sheet__file-picker">
                  <UploadSimple size={20} weight="bold" aria-hidden="true" />
                  选择健康数据
                  <input
                    className="sync-sheet__file-input"
                    type="file"
                    accept="application/json,.json"
                    aria-label="选择 JSON 文件"
                    disabled={state.phase === 'inspecting'}
                    onChange={(event) => {
                      const file = event.currentTarget.files?.item(0)
                      if (file) void inspect(file)
                      event.currentTarget.value = ''
                    }}
                  />
                </label>
              )}
          </div>
        </section>
      </div>
    </div>
  )
}

function failureCode(error: unknown): ImportFailureCode {
  return error instanceof ImportServiceError ? error.code : 'transaction_failed'
}

function trapFocus(event: React.KeyboardEvent<HTMLDivElement>): void {
  const container = event.currentTarget
  const focusable = [
    ...container.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled])',
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
