import type { PreparedImport } from './import-service'

export function ImportPreview({ prepared }: { prepared: PreparedImport }) {
  const entityCounts = [
    prepared.summary.daily,
    prepared.summary.workouts,
    prepared.summary.body,
  ]
  const added = entityCounts.reduce((total, counts) => total + counts.added, 0)
  const updated = entityCounts.reduce(
    (total, counts) => total + counts.updated,
    0,
  )
  const skipped = entityCounts.reduce(
    (total, counts) => total + counts.skipped,
    0,
  )
  return (
    <section
      className="sync-sheet__preview"
      aria-labelledby="import-preview-title"
    >
      <h2 id="import-preview-title">导入预览</h2>
      <p className="sync-sheet__file-name">{prepared.fileName}</p>
      <dl>
        <div>
          <dt>新增</dt>
          <dd>{added} 条</dd>
        </div>
        <div>
          <dt>更新</dt>
          <dd>{updated} 条</dd>
        </div>
        <div>
          <dt>跳过</dt>
          <dd>{skipped} 条</dd>
        </div>
      </dl>
      {prepared.warnings.length > 0 && (
        <p>发现 {prepared.warnings.length} 项提示</p>
      )}
    </section>
  )
}
