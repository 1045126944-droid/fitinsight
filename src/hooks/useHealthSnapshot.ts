import { useEffect, useState } from 'react'
import type { IDBPDatabase } from 'idb'
import { getHealthSnapshot } from '../db/health-repository'
import type { FitInsightDb, HealthSnapshot } from '../types/storage'

export function useHealthSnapshot(
  database: Promise<IDBPDatabase<FitInsightDb>>,
  dataRevision: number,
): HealthSnapshot | null {
  const [snapshot, setSnapshot] = useState<HealthSnapshot | null>(null)
  useEffect(() => {
    let alive = true
    void database.then(getHealthSnapshot).then(
      (next) => {
        if (alive) setSnapshot(next)
      },
      () => {
        if (alive) setSnapshot(null)
      },
    )
    return () => {
      alive = false
    }
  }, [database, dataRevision])
  return snapshot
}
