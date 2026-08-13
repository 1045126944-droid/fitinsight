import type { ImportFailureCode, PreparedImport } from './import-service'
import type { ImportSummary } from '../../types/storage'

export type ImportFlowState =
  | {
      phase: 'idle'
      requestId: number
      file: null
      prepared: null
      error: null
    }
  | {
      phase: 'inspecting'
      requestId: number
      file: File
      prepared: null
      error: null
    }
  | {
      phase: 'preview'
      requestId: number
      file: File
      prepared: PreparedImport
      error: null
    }
  | {
      phase: 'committing'
      requestId: number
      file: File
      prepared: PreparedImport
      error: null
    }
  | {
      phase: 'complete'
      requestId: number
      file: null
      prepared: PreparedImport
      result: ImportSummary
      error: null
    }
  | {
      phase: 'fatalError'
      requestId: number
      file: null
      prepared: null
      error: ImportFailureCode
    }

export const initialImportFlowState: ImportFlowState = {
  phase: 'idle',
  requestId: 0,
  file: null,
  prepared: null,
  error: null,
}

export type ImportFlowAction =
  | { type: 'inspect'; requestId: number; file: File }
  | { type: 'preview-ready'; requestId: number; prepared: PreparedImport }
  | { type: 'commit' }
  | { type: 'complete'; result: ImportSummary }
  | { type: 'inspection-failed'; requestId: number; error: ImportFailureCode }
  | { type: 'commit-failed'; requestId: number; error: ImportFailureCode }
  | { type: 'reset' }

export function importFlowReducer(
  state: ImportFlowState,
  action: ImportFlowAction,
): ImportFlowState {
  switch (action.type) {
    case 'inspect':
      return {
        phase: 'inspecting',
        requestId: action.requestId,
        file: action.file,
        prepared: null,
        error: null,
      }
    case 'preview-ready':
      return state.phase === 'inspecting' &&
        state.requestId === action.requestId
        ? {
            phase: 'preview',
            requestId: action.requestId,
            file: state.file,
            prepared: action.prepared,
            error: null,
          }
        : state
    case 'commit':
      return state.phase === 'preview'
        ? {
            phase: 'committing',
            requestId: state.requestId,
            file: state.file,
            prepared: state.prepared,
            error: null,
          }
        : state
    case 'complete':
      return state.phase === 'committing'
        ? {
            phase: 'complete',
            requestId: state.requestId,
            file: null,
            prepared: state.prepared,
            result: action.result,
            error: null,
          }
        : state
    case 'inspection-failed':
      return state.phase === 'inspecting' &&
        state.requestId === action.requestId
        ? {
            phase: 'fatalError',
            requestId: action.requestId,
            file: null,
            prepared: null,
            error: action.error,
          }
        : state
    case 'commit-failed':
      return state.phase === 'committing' &&
        state.requestId === action.requestId
        ? {
            phase: 'fatalError',
            requestId: action.requestId,
            file: null,
            prepared: null,
            error: action.error,
          }
        : state
    case 'reset':
      return initialImportFlowState
  }
}
