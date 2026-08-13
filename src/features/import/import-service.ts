import type { IDBPDatabase } from 'idb'
import {
  commitImportPlan,
  replaceHealthData,
} from '../../db/import-transaction'
import type { HealthRepository } from '../../db/health-repository'
import type {
  FitInsightDb,
  ImportHistoryEntry,
  ImportPlan,
  ImportSummary,
} from '../../types/storage'
import type { HealthDataEnvelope } from '../../types/health-data'
import type { ImportWarning } from './import-types'
import { parseHealthDataJson } from './parse-health-data'

const MAX_FILE_BYTES = 25 * 1024 * 1024
export type ImportPreviewSummary = Omit<ImportSummary, 'lastImportedAt'>
export type PreparedImport = {
  fileName: string
  schemaVersion: string
  data: HealthDataEnvelope
  baseRevision: number
  replaceBundledDemo: boolean
  plan: ImportPlan
  summary: ImportPreviewSummary
  warnings: ImportWarning[]
}
export type ImportFailureCode =
  | 'unreadable_file'
  | 'invalid_json'
  | 'invalid_envelope'
  | 'unsupported_version'
  | 'storage_unavailable'
  | 'stale_preview'
  | 'transaction_failed'

export class ImportServiceError extends Error {
  constructor(public readonly code: ImportFailureCode) {
    super(errorMessage(code))
    this.name = 'ImportServiceError'
  }
}

export async function inspectHealthFile(
  file: File,
  repository: HealthRepository,
): Promise<PreparedImport> {
  if (
    !file.name.toLowerCase().endsWith('.json') ||
    (file.type !== '' && file.type !== 'application/json') ||
    file.size > MAX_FILE_BYTES
  )
    throw new ImportServiceError('unreadable_file')
  let text: string
  try {
    text = await readFileText(file)
  } catch {
    throw new ImportServiceError('unreadable_file')
  }
  const parsed = parseHealthDataJson(text)
  if (!parsed.ok) throw new ImportServiceError(parsed.error.code)
  let plan: ImportPlan
  let importHistory: ImportHistoryEntry[]
  try {
    ;[plan, importHistory] = await Promise.all([
      repository.prepareImport(parsed.data, parsed.warnings),
      repository.getImportHistory(),
    ])
  } catch {
    throw new ImportServiceError('storage_unavailable')
  }
  const replaceBundledDemo = containsOnlyBundledDemoImports(importHistory)
  return {
    fileName: file.name,
    schemaVersion: parsed.data.schemaVersion,
    data: structuredClone(parsed.data),
    baseRevision: plan.baseRevision,
    replaceBundledDemo,
    plan,
    summary: replaceBundledDemo
      ? replacementPreview(parsed.data, parsed.warnings)
      : structuredClone(plan.counts),
    warnings: structuredClone(parsed.warnings),
  }
}

export async function commitPreparedImport(
  prepared: PreparedImport,
  db: IDBPDatabase<FitInsightDb>,
): Promise<ImportSummary> {
  if (prepared.baseRevision !== prepared.plan.baseRevision)
    throw new ImportServiceError('stale_preview')
  try {
    if (prepared.replaceBundledDemo)
      return await replaceHealthData(
        db,
        prepared.data,
        prepared.warnings,
        prepared.baseRevision,
      )
    return await commitImportPlan(db, prepared.plan)
  } catch (error) {
    if (error instanceof Error && error.message === 'stale import plan')
      throw new ImportServiceError('stale_preview')
    throw new ImportServiceError('transaction_failed')
  }
}

function containsOnlyBundledDemoImports(
  history: readonly ImportHistoryEntry[],
): boolean {
  return (
    history.length > 0 &&
    history.every((entry) => entry.source.includes('demo-synthetic'))
  )
}

function replacementPreview(
  data: HealthDataEnvelope,
  warnings: readonly ImportWarning[],
): ImportPreviewSummary {
  return {
    daily: replacementCounts(
      data.dailyRecords.length,
      warnings,
      'dailyRecords',
    ),
    workouts: replacementCounts(data.workouts.length, warnings, 'workouts'),
    body: replacementCounts(
      data.bodyMeasurements.length,
      warnings,
      'bodyMeasurements',
    ),
    warningCount: warnings.length,
  }
}

function replacementCounts(
  added: number,
  warnings: readonly ImportWarning[],
  collection: string,
) {
  return {
    added,
    updated: 0,
    unchanged: 0,
    skipped: warnings.filter(
      (warning) =>
        warning.code === 'skipped_record' &&
        warning.path.startsWith(`${collection}[`),
    ).length,
  }
}

export function errorMessage(code: ImportFailureCode): string {
  switch (code) {
    case 'unreadable_file':
      return '无法读取该文件，请选择不超过 25 MiB 的 JSON 文件。'
    case 'invalid_json':
      return '无法读取该文件，请确认它是有效的 JSON。'
    case 'invalid_envelope':
      return '该文件不是 FitInsight 健康数据格式。'
    case 'unsupported_version':
      return '该文件版本暂不受支持。'
    case 'storage_unavailable':
      return '本地存储暂不可用，请稍后再试。'
    case 'stale_preview':
      return '数据已发生变化，请重新检查文件后再导入。'
    case 'transaction_failed':
      return '导入未完成，原有数据没有改变。'
  }
}

function readFileText(file: File): Promise<string> {
  if (typeof file.text === 'function') return file.text()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(reader.error)
    reader.onload = () =>
      typeof reader.result === 'string' ? resolve(reader.result) : reject()
    reader.readAsText(file)
  })
}
