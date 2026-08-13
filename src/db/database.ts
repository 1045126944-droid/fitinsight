import { openDB, type IDBPDatabase } from 'idb'
import type { FitInsightDb } from '../types/storage'

const DATABASE_VERSION = 1
const DEFAULT_DATABASE_NAME = 'fitinsight'

export function openFitInsightDb(
  name = DEFAULT_DATABASE_NAME,
): Promise<IDBPDatabase<FitInsightDb>> {
  return openDB<FitInsightDb>(name, DATABASE_VERSION, {
    upgrade(db) {
      db.createObjectStore('dailyRecords')

      const workouts = db.createObjectStore('workouts')
      workouts.createIndex('byLocalDate', 'localDate')
      workouts.createIndex('byType', 'type')

      const bodyMeasurements = db.createObjectStore('bodyMeasurements')
      bodyMeasurements.createIndex('byDate', 'date')

      const importHistory = db.createObjectStore('importHistory')
      importHistory.createIndex('byImportedAt', 'importedAt')

      const meta = db.createObjectStore('meta')
      meta.put(
        { key: 'database-state', revision: 0, lastImportedAt: null },
        'database-state',
      )

      db.createObjectStore('privateProfile')
    },
  })
}
