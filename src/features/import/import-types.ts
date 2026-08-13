import type { WorkoutType } from '../../types/health-data'

export type ImportWarning = {
  code:
    | 'invalid_optional_metric'
    | 'skipped_record'
    | 'duplicate_record_in_file'
    | 'unknown_workout_type'
    | 'profile_ignored'
  path: string
  message: string
}

export type ParseHealthDataResult =
  | {
      ok: true
      data: import('../../types/health-data').HealthDataEnvelope
      warnings: ImportWarning[]
    }
  | {
      ok: false
      error: {
        code: 'invalid_json' | 'invalid_envelope' | 'unsupported_version'
        message: string
      }
    }

export type WorkoutIdentityInput = {
  externalId?: string | null
  type: WorkoutType
  start: string
  source: string | null
  device: string | null
}
