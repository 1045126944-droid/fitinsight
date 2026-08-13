# FitInsight MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a reliable, private, installable FitInsight PWA that completes Apple Shortcuts JSON import, local persistence, conservative personal analysis, and useful today/week/month views on iPhone.

**Architecture:** A static React client accepts versioned JSON through the File API, normalizes it into stable domain types, and commits an import atomically to IndexedDB. Pure analysis functions consume repository snapshots; React Context and feature hooks expose the results to five mobile-first views styled from the selected “行动处方” reference.

**Tech Stack:** React, TypeScript, Vite, Vitest, React Testing Library, IndexedDB through `idb`, Zod envelope validation, Recharts, Phosphor Icons, `vite-plugin-pwa`, ESLint, and Prettier.

## Global Constraints

- Build a real responsive PWA, not a device-frame simulator or native application.
- Use no account, backend, cloud database, telemetry, social feature, subscription, advertisement, payment, AI API, or API key.
- Store health records and the private profile only in IndexedDB; localStorage may contain theme, selected tab, week start, and onboarding state only.
- Commit synthetic fixtures only. Never copy the user’s exact body measurements or imported health timeline into source, docs, tests, screenshots, console output, or the production bundle.
- Treat missing data as unknown, not zero. Import patches never let null or omitted fields erase an existing valid value.
- Do not show an aggregate numeric score below 60% applicable evidence coverage.
- Do not invent heart-rate zones, sleep stages, strength sets/reps/weights, or medical conclusions.
- Use one primary conclusion and one primary action on the Today screen; keep score and metrics secondary.
- Support light and dark color schemes, at least 44px touch targets, `viewport-fit=cover`, iPhone safe areas, and a maximum content width of 720px.
- Keep production code free of imported-data console logging and third-party runtime requests.
- Every production behavior starts with a failing Vitest or React Testing Library test, then the minimum passing implementation, then refactoring with the suite green.
- Each task ends with `npm test`, `npm run lint`, `npm run typecheck`, and `npm run build` appropriate to the files changed.
- The final acceptance commands are exactly `npm test` and `npm run build`, in addition to lint, typecheck, and format checks.

## File Responsibility Map

```text
src/app/                    application bootstrap, provider, navigation state
src/components/             shared presentational and feedback components
src/db/                     IndexedDB schema, repositories, atomic imports, backups
src/features/import/        parse, validate, normalize, import UI and result copy
src/features/analysis/      pure baseline, score, recommendation, trend, review functions
src/features/dashboard/     selected Today experience
src/features/workouts/      filters, list, detail, swimming analysis
src/features/trends/        range/metric selection and one-metric charts
src/features/reviews/       weekly/monthly summaries and report serialization
src/features/profile/       private local profile, targets, data controls
src/hooks/                  feature orchestration hooks
src/mocks/                  synthetic development-only data builders
src/styles/                 tokens, reset, shell, print and shared responsive rules
src/tests/                  global test setup and reusable synthetic fixtures
src/types/                  normalized health, profile, analysis and storage contracts
public/examples/            synthetic Shortcut-compatible example JSON
public/icons/               generated PWA and Apple touch icons
docs/                       schema, analysis, privacy and Shortcut setup documentation
```

---

### Task 1: Toolchain, test harness, and accessible app shell

**Files:**
- Create: `package.json`
- Create: `package-lock.json`
- Create: `index.html`
- Create: `tsconfig.json`
- Create: `tsconfig.app.json`
- Create: `tsconfig.node.json`
- Create: `vite.config.ts`
- Create: `eslint.config.js`
- Create: `.prettierrc.json`
- Create: `src/vite-env.d.ts`
- Create: `src/main.tsx`
- Create: `src/app/App.tsx`
- Create: `src/app/navigation.ts`
- Create: `src/components/AppShell.tsx`
- Create: `src/components/BottomNavigation.tsx`
- Create: `src/styles/tokens.css`
- Create: `src/styles/base.css`
- Create: `src/tests/setup.ts`
- Test: `src/app/App.test.tsx`
- Modify: `.gitignore`

**Interfaces:**
- Produces: `type AppTab = 'today' | 'workouts' | 'trends' | 'reviews' | 'profile'`
- Produces: `const APP_TABS: readonly AppTabDefinition[]`
- Produces: `<App />`, `<AppShell />`, and `<BottomNavigation activeTab onChange />`
- Consumes: none

- [ ] **Step 1: Create the manifest and install the exact dependency families**

Use this script surface in `package.json`:

```json
{
  "name": "fitinsight",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "eslint . --max-warnings 0",
    "typecheck": "tsc -b --pretty false",
    "format": "prettier --write .",
    "format:check": "prettier --check ."
  }
}
```

Run:

```bash
npm install react react-dom idb zod recharts @phosphor-icons/react
npm install --save-dev typescript vite @vitejs/plugin-react vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event fake-indexeddb vite-plugin-pwa workbox-window eslint @eslint/js typescript-eslint eslint-plugin-react-hooks eslint-plugin-react-refresh prettier @types/node @types/react @types/react-dom
```

Expected: `package-lock.json` exists and `npm ls --depth=0` exits 0.

- [ ] **Step 2: Configure TypeScript, Vite, Vitest, ESLint, Prettier, and the DOM test setup**

Use `vite.config.ts` with `base: './'`, React, `environment: 'jsdom'`, `setupFiles: ['./src/tests/setup.ts']`, CSS enabled, and coverage excluded from production dependencies. Put this exact setup in `src/tests/setup.ts`:

```ts
import '@testing-library/jest-dom/vitest'
import 'fake-indexeddb/auto'
```

Use strict TypeScript with `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, and `noFallthroughCasesInSwitch` enabled.

- [ ] **Step 3: Write the failing app-shell test**

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { App } from './App'

test('starts on Today and changes destination through the bottom navigation', async () => {
  const user = userEvent.setup()
  render(<App />)

  expect(screen.getByRole('heading', { name: '今天' })).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: '训练' }))
  expect(screen.getByRole('heading', { name: '训练' })).toBeInTheDocument()
})
```

- [ ] **Step 4: Run the focused test and confirm RED**

Run: `npm test -- src/app/App.test.tsx`

Expected: FAIL because `./App` and the navigation components do not exist.

- [ ] **Step 5: Implement the smallest accessible shell**

Define the navigation contract exactly:

```ts
export type AppTab = 'today' | 'workouts' | 'trends' | 'reviews' | 'profile'

export type AppTabDefinition = {
  id: AppTab
  label: '今天' | '训练' | '趋势' | '回顾' | '我的'
}

export const APP_TABS: readonly AppTabDefinition[] = [
  { id: 'today', label: '今天' },
  { id: 'workouts', label: '训练' },
  { id: 'trends', label: '趋势' },
  { id: 'reviews', label: '回顾' },
  { id: 'profile', label: '我的' },
]
```

`BottomNavigation` uses buttons with `aria-current="page"` on the active item. `App` stores only the current tab for now and renders an `h1` with the selected label.

- [ ] **Step 6: Add foundational visual tokens without implementing feature layouts**

Create CSS variables for `--surface`, `--surface-raised`, `--text-primary`, `--text-secondary`, `--activity`, `--training`, `--sleep`, `--recovery`, `--warning`, `--radius-section: 20px`, `--radius-control: 14px`, `--content-max: 720px`, and all four safe-area insets. Use system fonts only and no gradient declarations.

- [ ] **Step 7: Verify and commit the foundation**

Run:

```bash
npm test -- src/app/App.test.tsx
npm run lint
npm run typecheck
npm run build
git diff --check
```

Expected: all commands exit 0.

```bash
git add package.json package-lock.json index.html tsconfig*.json vite.config.ts eslint.config.js .prettierrc.json .gitignore src
git commit -m "chore: initialize FitInsight web app"
```

---

### Task 2: Versioned health-data contract, validation, and normalization

**Files:**
- Create: `src/types/health-data.ts`
- Create: `src/features/import/import-types.ts`
- Create: `src/features/import/workout-key.ts`
- Create: `src/features/import/normalizers.ts`
- Create: `src/features/import/parse-health-data.ts`
- Create: `src/tests/fixtures/health-envelope.ts`
- Test: `src/features/import/parse-health-data.test.ts`
- Test: `src/features/import/workout-key.test.ts`

**Interfaces:**
- Produces: `HealthDataEnvelope`, `DailyRecord`, `Workout`, `BodyMeasurement`, `HeartRateSample`, `Coverage`
- Produces: `parseHealthDataJson(text: string): ParseHealthDataResult`
- Produces: `createWorkoutKey(workout: WorkoutIdentityInput): string`
- Produces: `normalizeWorkoutType(rawType: string | null): WorkoutType`
- Consumes: no database or React code

- [ ] **Step 1: Define the public types in the tests before production types exist**

Use this normalized contract in test imports:

```ts
export type WorkoutType =
  | 'poolSwimming'
  | 'openWaterSwimming'
  | 'traditionalStrength'
  | 'functionalStrength'
  | 'walking'
  | 'running'
  | 'other'

export type HeartRateSample = { timestamp: string; bpm: number }

export type Coverage = {
  startDate: string
  endDate: string
  includedMetrics: string[]
  mode: 'patch'
}

export type SleepRecord = {
  start: string | null
  end: string | null
  totalMinutes: number | null
  awakeMinutes: number | null
  coreMinutes: number | null
  deepMinutes: number | null
  remMinutes: number | null
  source: string | null
}

export type DailyRecord = {
  date: string
  steps: number | null
  activeEnergyKcal: number | null
  exerciseMinutes: number | null
  standHours: number | null
  walkingRunningDistanceKm: number | null
  restingHeartRateBpm: number | null
  hrvSdnnMs: number | null
  sleep: SleepRecord | null
}

export type Workout = {
  id: string
  externalId: string | null
  type: WorkoutType
  rawType: string | null
  localDate: string
  start: string
  end: string | null
  durationMinutes: number | null
  activeEnergyKcal: number | null
  distanceMeters: number | null
  swimmingStrokeCount: number | null
  averageHeartRateBpm: number | null
  maximumHeartRateBpm: number | null
  heartRateSamples: HeartRateSample[] | null
  source: string | null
  device: string | null
}

export type BodyMeasurement = {
  key: string
  date: string
  measuredAt: string | null
  weightKg: number | null
  bodyFatPercentage: number | null
  skeletalMuscleMassKg: number | null
  waistCm: number | null
  source: string | null
}

export type HealthDataEnvelope = {
  schemaVersion: string
  generatedAt: string
  timezone: string
  source: string
  coverage: Coverage | null
  dailyRecords: DailyRecord[]
  workouts: Workout[]
  bodyMeasurements: BodyMeasurement[]
}
```

Input `profile` metadata is accepted for compatibility but is not copied into `HealthDataEnvelope`; the parser emits a sanitized `profile_ignored` warning instead.

- [ ] **Step 2: Write parsing and normalization failures first**

```ts
import { parseHealthDataJson } from './parse-health-data'
import { syntheticEnvelope } from '../../tests/fixtures/health-envelope'

test('accepts a valid patch with nullable optional values', () => {
  const result = parseHealthDataJson(JSON.stringify(syntheticEnvelope))
  expect(result.ok).toBe(true)
  if (result.ok) {
    expect(result.data.dailyRecords[0]?.hrvSdnnMs).toBeNull()
    expect(result.warnings).toEqual([])
  }
})

test('rejects an unsupported schema major version', () => {
  const result = parseHealthDataJson(
    JSON.stringify({ ...syntheticEnvelope, schemaVersion: '2.0.0' }),
  )
  expect(result).toEqual({
    ok: false,
    error: { code: 'unsupported_version', message: '该文件版本暂不受支持。' },
  })
})

test('keeps valid records and converts one invalid optional metric to null with a warning', () => {
  const input = structuredClone(syntheticEnvelope)
  input.dailyRecords[0] = { ...input.dailyRecords[0], steps: -1 }
  const result = parseHealthDataJson(JSON.stringify(input))
  expect(result.ok).toBe(true)
  if (result.ok) {
    expect(result.data.dailyRecords[0]?.steps).toBeNull()
    expect(result.warnings[0]?.code).toBe('invalid_optional_metric')
  }
})

test('rejects an envelope whose collection sizes exceed the local safety limits', () => {
  const result = parseHealthDataJson(
    JSON.stringify({ ...syntheticEnvelope, dailyRecords: Array.from({ length: 401 }, () => syntheticEnvelope.dailyRecords[0]!) }),
  )
  expect(result).toMatchObject({ ok: false, error: { code: 'invalid_envelope' } })
})
```

- [ ] **Step 3: Write stable workout identity tests**

```ts
import { createWorkoutKey } from './workout-key'

test('fallback workout identity ignores later calorie corrections', () => {
  const identity = {
    type: 'poolSwimming' as const,
    start: '2026-07-28T18:30:00+08:00',
    source: 'Apple Watch',
    device: 'Apple Watch',
  }
  expect(createWorkoutKey(identity)).toBe(createWorkoutKey(identity))
  expect(createWorkoutKey(identity)).toBe(
    'fallback:poolSwimming|2026-07-28T18%3A30%3A00%2B08%3A00|Apple%20Watch|Apple%20Watch',
  )
})
```

- [ ] **Step 4: Run both focused files and confirm RED**

Run:

```bash
npm test -- src/features/import/parse-health-data.test.ts src/features/import/workout-key.test.ts
```

Expected: FAIL because the parser, types, normalizers, and workout-key module do not exist.

- [ ] **Step 5: Implement two-layer validation**

Use Zod only for the envelope and collection shapes; normalize each record manually so one invalid optional field cannot reject the whole file. The envelope schema requires semver matching `/^\d+\.\d+\.\d+$/`, an offset-bearing ISO `generatedAt`, a non-empty source, a timezone accepted by `Intl.DateTimeFormat`, and all three arrays. Define the result exactly:

```ts
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
  | { ok: true; data: HealthDataEnvelope; warnings: ImportWarning[] }
  | {
      ok: false
      error: {
        code: 'invalid_json' | 'invalid_envelope' | 'unsupported_version'
        message: string
      }
    }
```

The parser must:

```ts
export function parseHealthDataJson(text: string): ParseHealthDataResult {
  let unknownValue: unknown
  try {
    unknownValue = JSON.parse(text)
  } catch {
    return {
      ok: false,
      error: { code: 'invalid_json', message: '无法读取该文件，请确认它是有效的 JSON。' },
    }
  }

  const envelope = envelopeSchema.safeParse(unknownValue)
  if (!envelope.success) {
    return {
      ok: false,
      error: { code: 'invalid_envelope', message: '该文件不是 FitInsight 健康数据格式。' },
    }
  }
  if (envelope.data.schemaVersion.split('.')[0] !== '1') {
    return {
      ok: false,
      error: { code: 'unsupported_version', message: '该文件版本暂不受支持。' },
    }
  }

  return normalizeEnvelope(envelope.data)
}
```

Reject negative durations, distances, calories, heart rates, and counts. Values that are unusual but physically possible produce warnings rather than rejection. Accept plain finite numeric strings, but reject strings containing units or locale commas. Cap one import at 400 daily records, 5,000 workouts, 2,000 body measurements, 20,000 heart-rate samples per workout, and 200 characters for source/device/raw-type strings; exceeding a collection cap is an envelope error, while excess samples or text on one record skip or null that optional field with a warning.

- [ ] **Step 6: Implement deterministic workout and body-measurement keys**

`createWorkoutKey` uses the external ID when available. Otherwise join encoded normalized type, original offset-bearing start timestamp, source, and device exactly as the test requires. A body measurement key is `measuredAt ?? date`.

- [ ] **Step 7: Verify, scan for private values, and commit**

Run:

```bash
npm test -- src/features/import/parse-health-data.test.ts src/features/import/workout-key.test.ts
npm run lint
npm run typecheck
npm run build
git diff --check
```

Expected: tests and build pass; the privacy scan prints no source match.

```bash
git add src/types src/features/import src/tests/fixtures
git commit -m "feat: add versioned health data parser"
```

---

### Task 3: Atomic IndexedDB import, patch merge, backup, and clearing

**Files:**
- Create: `src/types/storage.ts`
- Create: `src/types/profile.ts`
- Create: `src/db/database.ts`
- Create: `src/db/merge-non-null.ts`
- Create: `src/db/health-repository.ts`
- Create: `src/db/import-transaction.ts`
- Create: `src/db/backup.ts`
- Test: `src/db/import-transaction.test.ts`
- Test: `src/db/backup.test.ts`

**Interfaces:**
- Produces: `openFitInsightDb(name?: string): Promise<IDBPDatabase<FitInsightDb>>`
- Produces: `prepareImport(db, data, warnings): Promise<ImportPlan>`
- Produces: `commitImportPlan(db, plan): Promise<ImportSummary>`
- Produces: `importHealthData(db, data, warnings): Promise<ImportSummary>` as a test/dev convenience that prepares then commits
- Produces: `getHealthSnapshot(db): Promise<HealthSnapshot>`
- Produces: `exportBackup(db): Promise<FitInsightBackup>`
- Produces: `restoreBackup(db, backup): Promise<void>` using replace semantics
- Produces: `clearAllLocalData(db): Promise<void>`
- Consumes: normalized types and warnings from Task 2

- [ ] **Step 1: Write IndexedDB merge tests using a unique database per test**

```ts
import { deleteDB } from 'idb'
import { afterEach, beforeEach, expect, test } from 'vitest'
import { openFitInsightDb } from './database'
import { getHealthSnapshot } from './health-repository'
import { importHealthData } from './import-transaction'
import { makeNormalizedEnvelope } from '../tests/fixtures/health-envelope'

let dbName: string

beforeEach(() => {
  dbName = `fitinsight-test-${crypto.randomUUID()}`
})

afterEach(async () => {
  await deleteDB(dbName)
})

test('reimport is idempotent and null does not erase a prior value', async () => {
  const db = await openFitInsightDb(dbName)
  const first = makeNormalizedEnvelope({ steps: 6400, workoutCalories: 420 })
  const patch = makeNormalizedEnvelope({ steps: null, workoutCalories: 440 })

  expect(await importHealthData(db, first, [])).toMatchObject({
    daily: { added: 1, updated: 0 },
    workouts: { added: 1, updated: 0 },
  })
  expect(await importHealthData(db, patch, [])).toMatchObject({
    daily: { added: 0, updated: 0, unchanged: 1 },
    workouts: { added: 0, updated: 1 },
  })

  const snapshot = await getHealthSnapshot(db)
  expect(snapshot.dailyRecords[0]?.steps).toBe(6400)
  expect(snapshot.workouts[0]?.activeEnergyKcal).toBe(440)
})
```

- [ ] **Step 2: Write backup, restore, and clear failures first**

```ts
test('backup round-trips all stores and clear removes them', async () => {
  const db = await openFitInsightDb(dbName)
  await importHealthData(db, makeNormalizedEnvelope({ steps: 7200 }), [])
  const backup = await exportBackup(db)

  await clearAllLocalData(db)
  expect((await getHealthSnapshot(db)).dailyRecords).toEqual([])

  await restoreBackup(db, backup)
  expect((await getHealthSnapshot(db)).dailyRecords[0]?.steps).toBe(7200)
})
```

- [ ] **Step 3: Run the database tests and confirm RED**

Run: `npm test -- src/db/import-transaction.test.ts src/db/backup.test.ts`

Expected: FAIL because the database and repository modules do not exist.

- [ ] **Step 4: Implement the database schema and non-null deep merge**

Use database version 1 and these stores. Define the complete `UserProfile` contract in `src/types/profile.ts` here so the database task compiles without relying on a later task:

```ts
export interface FitInsightDb extends DBSchema {
  dailyRecords: { key: string; value: DailyRecord }
  workouts: { key: string; value: Workout; indexes: { byLocalDate: string; byType: WorkoutType } }
  bodyMeasurements: { key: string; value: BodyMeasurement; indexes: { byDate: string } }
  importHistory: { key: string; value: ImportHistoryEntry; indexes: { byImportedAt: string } }
  meta: { key: 'database-state'; value: DatabaseState }
  privateProfile: { key: 'current'; value: UserProfile }
}
```

```ts
export type PersonalGoals = {
  objective: 'fatLossPreserveMuscle' | 'generalFitness' | null
  dailySteps: number | null
  weeklyWorkoutDays: number | null
  weeklySwimmingSessions: number | null
  weeklyStrengthSessions: number | null
  weeklyModerateMinutes: number | null
  sleepMinMinutes: number | null
  sleepMaxMinutes: number | null
  targetWeightRangeKg: [number, number] | null
  longTermWeightRangeKg: [number, number] | null
  targetWeeklyWeightLossKg: [number, number] | null
  targetBodyFatPercentage: number | null
}

export type UserProfile = {
  id: 'current'
  name: string
  sex: 'male' | 'female' | 'other' | 'unspecified'
  birthDate: string | null
  ageAsOf: { age: number; date: string } | null
  heightCm: number | null
  maximumHeartRateBpm: number | null
  bodyContext: {
    weightKg: number | null
    bodyFatMassKg: number | null
    bodyFatPercentage: number | null
    skeletalMuscleMassKg: number | null
    bmi: number | null
    waistHipRatio: number | null
    visceralFatLevel: number | null
    basalMetabolicRateKcal: number | null
  }
  goals: PersonalGoals
  updatedAt: string
}
```

Implement arrays as replacement values and plain nested objects recursively:

```ts
export function mergeNonNull<T extends Record<string, unknown>>(current: T, patch: Partial<T>): T {
  const result: Record<string, unknown> = { ...current }
  for (const [key, value] of Object.entries(patch)) {
    if (value === null || value === undefined) continue
    const previous = result[key]
    result[key] =
      isPlainObject(previous) && isPlainObject(value)
        ? mergeNonNull(previous, value)
        : value
  }
  return result as T
}
```

- [ ] **Step 5: Implement one-transaction import and exact counts**

`prepareImport` reads the current database revision and existing keys, applies the non-null merge in memory, and returns exact counts plus `baseRevision` without writing. `commitImportPlan` opens a single read-write transaction across daily records, workouts, body measurements, import history, and meta. It rejects a plan when the in-transaction revision differs from `baseRevision`, compares normalized records after merge, counts `added`, `updated`, and `unchanged`, records only warning code/path (never raw values), increments revision, and writes `lastImportedAt` only immediately before a successful commit. Imported `profile` metadata is ignored. `importHealthData` is a thin prepare-then-commit convenience used by focused tests and development fixtures.

Define the summary:

```ts
export type EntityImportCounts = {
  added: number
  updated: number
  unchanged: number
  skipped: number
}

export type ImportSummary = {
  daily: EntityImportCounts
  workouts: EntityImportCounts
  body: EntityImportCounts
  warningCount: number
  lastImportedAt: string
}

export type UpsertChange<T> = {
  kind: 'add' | 'update'
  key: string
  value: T
}

export type ImportPlan = {
  baseRevision: number
  generatedAt: string
  timezone: string
  source: string
  coverage: Coverage | null
  dailyChanges: UpsertChange<DailyRecord>[]
  workoutChanges: UpsertChange<Workout>[]
  bodyChanges: UpsertChange<BodyMeasurement>[]
  counts: Omit<ImportSummary, 'lastImportedAt'>
  warnings: ImportWarning[]
}

export type DatabaseState = {
  key: 'database-state'
  revision: number
  lastImportedAt: string | null
}

export type ImportHistoryEntry = {
  id: string
  importedAt: string
  generatedAt: string
  timezone: string
  source: string
  coverage: Coverage | null
  counts: Omit<ImportSummary, 'lastImportedAt'>
  warnings: Pick<ImportWarning, 'code' | 'path'>[]
}

export type HealthSnapshot = {
  revision: number
  dailyRecords: DailyRecord[]
  workouts: Workout[]
  bodyMeasurements: BodyMeasurement[]
  coverage: Readonly<Partial<Record<string, readonly { startDate: string; endDate: string }[]>>>
  lastImportedAt: string | null
}
```

Each successful import appends an `ImportHistoryEntry` containing metadata, counts, sanitized warnings, and the optional coverage range. `getHealthSnapshot` unions overlapping or adjacent coverage ranges per metric. This lets analysis distinguish “queried and found none” from “not queried”.

- [ ] **Step 6: Implement versioned backup replacement**

The backup envelope is `{ backupVersion: '1.0.0', exportedAt, snapshot, importHistory, profile }`. Validate every canonical record before opening a write transaction. Restore uses explicit replace semantics: clear all data stores inside one transaction, write the backup, then set revision to the pre-restore current revision plus one so an older prepared import cannot become valid again. Health-file import remains patch semantics. Backup files intentionally exclude localStorage preferences because IndexedDB and localStorage cannot share one atomic transaction.

- [ ] **Step 7: Verify and commit local persistence**

Run:

```bash
npm test -- src/db
npm run lint
npm run typecheck
npm run build
git diff --check
```

Expected: all commands exit 0 and repeated import remains idempotent.

```bash
git add src/db src/types/storage.ts src/types/profile.ts src/tests/fixtures/health-envelope.ts
git commit -m "feat: add local health data persistence"
```

---

### Task 4: Date-only helpers, personal baselines, swimming pace, and heart-rate zones

**Files:**
- Create: `src/types/analysis.ts`
- Create: `src/utils/date-only.ts`
- Create: `src/features/analysis/math.ts`
- Create: `src/features/analysis/personal-baseline.ts`
- Create: `src/features/analysis/swimming.ts`
- Create: `src/features/analysis/heart-rate-zones.ts`
- Test: `src/utils/date-only.test.ts`
- Test: `src/features/analysis/personal-baseline.test.ts`
- Test: `src/features/analysis/swimming.test.ts`
- Test: `src/features/analysis/heart-rate-zones.test.ts`

**Interfaces:**
- Produces: `localDateAt`, `addDays`, `differenceInCalendarDays`, `getWeekRange`, `getMonthRange`
- Produces: `calculatePersonalBaseline(input): PersonalBaseline`
- Produces: `calculateSwimPaceSecondsPer100m(durationMinutes, distanceMeters): number | null`
- Produces: `resolveMaximumHeartRate(profile): number | null`
- Produces: `summarizeHeartRateZones(samples, maximumHeartRate): HeartRateZoneSummary[] | null`
- Consumes: normalized records and profile types from Tasks 2–3

- [ ] **Step 1: Write date-only tests that prevent UTC date drift**

```ts
import { addDays, getWeekRange, localDateAt } from './date-only'

test('uses the configured IANA timezone for local health dates', () => {
  expect(localDateAt('2026-08-01T16:30:00Z', 'Asia/Shanghai')).toBe('2026-08-02')
  expect(localDateAt('2026-08-01T07:10:00+08:00', 'Asia/Shanghai')).toBe('2026-08-01')
})

test('calculates a Monday-start week without local timezone conversion', () => {
  expect(getWeekRange('2026-08-01', 1)).toEqual({
    start: '2026-07-27',
    end: '2026-08-02',
  })
  expect(addDays('2026-08-01', 1)).toBe('2026-08-02')
})
```

- [ ] **Step 2: Write personal-baseline tests per metric**

```ts
test('requires seven valid observations per metric and excludes today', () => {
  const records = makeDailySeries('2026-07-25', 8, (index) => ({
    restingHeartRateBpm: index === 0 ? null : 60 + index,
    hrvSdnnMs: index < 2 ? null : 45 + index,
    steps: 7000 + index * 100,
  }))

  const baseline = calculatePersonalBaseline({
    today: '2026-08-01',
    timeZone: 'Asia/Shanghai',
    dailyRecords: records,
    workouts: [],
  })

  expect(baseline.restingHeartRate.status).toBe('ready')
  expect(baseline.hrv.status).toBe('building')
  expect(baseline.hrv.sampleCount).toBe(6)
})
```

- [ ] **Step 3: Write swimming and heart-rate boundary tests**

```ts
test('calculates elapsed swimming pace and rejects zero distance', () => {
  expect(calculateSwimPaceSecondsPer100m(45, 1500)).toBe(180)
  expect(calculateSwimPaceSecondsPer100m(45, 0)).toBeNull()
})

test('uses inclusive lower bounds, exclusive upper bounds, and includes max in zone 5', () => {
  const samples = [
    { timestamp: '2026-08-01T18:00:00+08:00', bpm: 100 },
    { timestamp: '2026-08-01T18:00:05+08:00', bpm: 120 },
    { timestamp: '2026-08-01T18:00:10+08:00', bpm: 193 },
  ]
  const zones = summarizeHeartRateZones(samples, 193)
  expect(zones?.map((zone) => zone.sampleCount)).toEqual([1, 1, 0, 0, 1])
  expect(summarizeHeartRateZones(null, 193)).toBeNull()
})
```

- [ ] **Step 4: Run all four focused files and confirm RED**

Run:

```bash
npm test -- src/utils/date-only.test.ts src/features/analysis/personal-baseline.test.ts src/features/analysis/swimming.test.ts src/features/analysis/heart-rate-zones.test.ts
```

Expected: FAIL because the date and analysis helpers do not exist.

- [ ] **Step 5: Implement safe date-only arithmetic**

Validate date-only strings with `/^\d{4}-\d{2}-\d{2}$/`. Parse date-only components into `Date.UTC`, perform calendar arithmetic in UTC, and format back from UTC components. For an instant, derive the grouping date with `Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(instant))`; do not use the host timezone or `toISOString().slice(0, 10)` for health-data grouping.

- [ ] **Step 6: Implement the typed baseline contract**

```ts
export type BaselineMetric = {
  value: number | null
  sampleCount: number
  status: 'building' | 'ready'
}

export type PersonalBaseline = {
  restingHeartRate: BaselineMetric
  hrv: BaselineMetric
  sleepMinutes: BaselineMetric
  sleepMidpointMinutes: BaselineMetric
  steps: BaselineMetric
  workoutCount28d: BaselineMetric
  workoutMinutes28d: BaselineMetric
}
```

Use medians for resting heart rate and HRV; means for sleep duration and steps; circular minute distance in the configured timezone for sleep midpoint regularity; count and sum for workouts. Filter all observations to local dates before `today`. Mark each metric ready only at seven valid observations, and use the coverage index to distinguish an observed no-workout day from an unqueried day.

- [ ] **Step 7: Implement heart-rate and swimming calculations**

`resolveMaximumHeartRate` prefers the user’s local override. Otherwise it rounds `208 - 0.7 * age`, where age comes from local `birthDate` or `ageAsOf`. Zone thresholds are 50%, 60%, 70%, 80%, 90%, and 100% of maximum heart rate. Values below 50% and above maximum are counted as unzoned, not forced into Zone 1 or 5.

Only timestamped samples produce zone output. Cap the attributed duration between adjacent samples at 30 seconds so sparse samples cannot fabricate long zone duration.

- [ ] **Step 8: Verify and commit analysis foundations**

Run:

```bash
npm test -- src/utils/date-only.test.ts src/features/analysis/personal-baseline.test.ts src/features/analysis/swimming.test.ts src/features/analysis/heart-rate-zones.test.ts
npm run lint
npm run typecheck
npm run build
git diff --check
```

```bash
git add src/types/analysis.ts src/utils src/features/analysis src/tests/fixtures
git commit -m "feat: add personal baseline and workout metrics"
```

---

### Task 5: Sleep, recovery, activity, daily score, and recommendations

**Files:**
- Create: `src/features/analysis/score-utils.ts`
- Create: `src/features/analysis/sleep-score.ts`
- Create: `src/features/analysis/recovery-score.ts`
- Create: `src/features/analysis/activity-score.ts`
- Create: `src/features/analysis/workout-score.ts`
- Create: `src/features/analysis/weekly-structure-score.ts`
- Create: `src/features/analysis/day-classification.ts`
- Create: `src/features/analysis/daily-score.ts`
- Create: `src/features/analysis/recommendations.ts`
- Test: `src/features/analysis/sleep-score.test.ts`
- Test: `src/features/analysis/recovery-score.test.ts`
- Test: `src/features/analysis/daily-score.test.ts`
- Test: `src/features/analysis/weekly-structure-score.test.ts`
- Test: `src/features/analysis/recommendations.test.ts`

**Interfaces:**
- Produces: `calculateSleepScore(input): ScoreResult`
- Produces: `calculateRecoveryScore(input): ScoreResult`
- Produces: `calculateActivityScore(record, goals): ScoreResult`
- Produces: `calculateWorkoutScore(workouts, goals): ScoreResult`
- Produces: `calculateWeeklyStructureScore(input): ScoreResult`
- Produces: `classifyDay(input): DayClassification`
- Produces: `calculateDailyAnalysis(input): DailyAnalysis`
- Produces: `generateRecommendations(input): Recommendation[]`
- Consumes: `PersonalBaseline`, normalized daily/workout data, and local profile goals

- [ ] **Step 1: Lock score and evidence types before implementing formulas**

```ts
export type Confidence = 'building' | 'low' | 'medium' | 'high'

export type EvidenceItem = {
  metric: string
  observed: number | string | null
  target: number | string | null
  reason: string
}

export type ScoreResult = {
  score: number | null
  coverage: number
  confidence: Confidence
  evidence: EvidenceItem[]
}

export type Recommendation = {
  id: string
  priority: 1 | 2 | 3
  title: string
  reason: string
  confidence: Confidence
  evidence: EvidenceItem[]
}

export type DayClassification = 'training' | 'activeRecovery' | 'rest' | 'insufficientData'

export type DailyAnalysisInput = {
  dayType: DayClassification
  plannedRestDay: boolean
  activityScore: ScoreResult
  workoutScore: ScoreResult
  sleepScore: ScoreResult
  recoveryScore: ScoreResult
  weeklyStructureScore: ScoreResult
}

export type DailyAnalysis = {
  classification: DayClassification
  score: ScoreResult
  status: '状态很好' | '基本达标' | '部分不足' | '明显不足' | '活动或恢复不足' | '数据不足'
}
```

- [ ] **Step 2: Write sleep-stage redistribution and recovery-without-HRV tests**

```ts
test('missing sleep stages redistributes weight instead of scoring them as zero', () => {
  const result = calculateSleepScore({
    sleep: makeSleep({ totalMinutes: 450, coreMinutes: null, deepMinutes: null, remMinutes: null }),
    baselineSleepMidpointMinutes: 30,
  })
  expect(result.score).not.toBeNull()
  expect(result.score).toBeGreaterThanOrEqual(80)
  expect(result.coverage).toBeCloseTo(0.9)
})

test('missing HRV redistributes recovery weight and lowers confidence', () => {
  const result = calculateRecoveryScore({
    sleepScore: scoreResult(85),
    restingHeartRateBpm: 63,
    restingHeartRateBaselineBpm: 62,
    hrvSdnnMs: null,
    hrvBaselineMs: 48,
    workoutMinutesLast72h: 95,
    consecutiveTrainingDays: 2,
  })
  expect(result.score).not.toBeNull()
  expect(result.coverage).toBeCloseTo(0.8)
  expect(result.confidence).toBe('low')
})
```

- [ ] **Step 3: Write rest-day and low-coverage daily-score tests**

```ts
test('a planned rest day is not penalized for having no workout', () => {
  const analysis = calculateDailyAnalysis(
    makeDailyAnalysisInput({
      dayType: 'rest',
      plannedRestDay: true,
      activityScore: scoreResult(78),
      workoutScore: unavailableScore(),
      sleepScore: scoreResult(82),
      recoveryScore: scoreResult(80),
      weeklyStructureScore: scoreResult(70),
    }),
  )
  expect(analysis.score.score).toBeGreaterThanOrEqual(70)
  expect(analysis.score.evidence.map((item) => item.metric)).not.toContain('workoutMissing')
})

test('weekly structure uses covered local days and distinct workout dates', () => {
  const result = calculateWeeklyStructureScore(
    makeWeeklyStructureInput({
      coveredDates: ['2026-07-27', '2026-07-28', '2026-07-29'],
      workoutDates: ['2026-07-27', '2026-07-27', '2026-07-29'],
      weeklyWorkoutDaysGoal: 4,
      weeklyModerateMinutesGoal: 240,
    }),
  )
  expect(result.evidence).toEqual(
    expect.arrayContaining([expect.objectContaining({ metric: 'distinctWorkoutDays', observed: 2 })]),
  )
})

test('does not show a number when evidence coverage is below sixty percent', () => {
  const analysis = calculateDailyAnalysis(
    makeDailyAnalysisInput({
      activityScore: scoreResult(75),
      sleepScore: unavailableScore(),
      recoveryScore: unavailableScore(),
      weeklyStructureScore: unavailableScore(),
      workoutScore: unavailableScore(),
    }),
  )
  expect(analysis.score.score).toBeNull()
  expect(analysis.status).toBe('数据不足')
})
```

- [ ] **Step 4: Write deterministic recommendation ordering tests**

```ts
test('returns at most three evidence-backed recommendations in priority order', () => {
  const recommendations = generateRecommendations(
    makeRecommendationInput({
      sleepConcern: true,
      recoveryConcernSignals: 2,
      strengthSessionsRemaining: 1,
      stepsRemaining: 1800,
    }),
  )
  expect(recommendations).toHaveLength(3)
  expect(recommendations.map((item) => item.priority)).toEqual([1, 2, 3])
  expect(recommendations.every((item) => item.reason.length > 0)).toBe(true)
})
```

- [ ] **Step 5: Run all scoring tests and confirm RED**

Run:

```bash
npm test -- src/features/analysis/sleep-score.test.ts src/features/analysis/recovery-score.test.ts src/features/analysis/weekly-structure-score.test.ts src/features/analysis/daily-score.test.ts src/features/analysis/recommendations.test.ts
```

Expected: FAIL because the scoring engine has not been implemented.

- [ ] **Step 6: Implement one reusable weighted-score combiner**

```ts
export type WeightedPart = {
  score: number | null
  weight: number
  coverage: number
  applicable: boolean
  evidence: EvidenceItem[]
}

export function combineWeightedScores(parts: WeightedPart[]): ScoreResult {
  const applicable = parts.filter((part) => part.applicable)
  const totalWeight = applicable.reduce((sum, part) => sum + part.weight, 0)
  const available = applicable.filter((part) => part.score !== null)
  const effectiveWeight = available.reduce(
    (sum, part) => sum + part.weight * part.coverage,
    0,
  )
  const coverage = totalWeight === 0 ? 0 : effectiveWeight / totalWeight
  const evidence = available.flatMap((part) => part.evidence)
  if (coverage < 0.6 || effectiveWeight === 0) {
    return { score: null, coverage, confidence: 'building', evidence }
  }
  const weighted = available.reduce(
    (sum, part) => sum + (part.score ?? 0) * part.weight * part.coverage,
    0,
  )
  return {
    score: Math.round(weighted / effectiveWeight),
    coverage,
    confidence: coverage >= 0.9 ? 'high' : coverage >= 0.75 ? 'medium' : 'low',
    evidence,
  }
}
```

- [ ] **Step 7: Implement exact sleep and recovery weights**

```ts
export const SLEEP_WEIGHTS = {
  duration: 0.4,
  regularity: 0.2,
  efficiency: 0.2,
  awake: 0.1,
  stageCompleteness: 0.1,
} as const

export const RECOVERY_WEIGHTS = {
  sleep: 0.4,
  restingHeartRate: 0.25,
  hrv: 0.2,
  recentLoad: 0.15,
} as const
```

Sleep duration scores 420–540 minutes at 100; 360 at 70 with linear interpolation to 420; 300 at 40 with linear interpolation to 360; below 300 decreases toward zero; above 540 declines gently to a floor of 80. Regularity compares the current sleep midpoint with the ready 14-day baseline. Efficiency is asleep minutes divided by the start/end interval and is marked lower confidence when an explicit in-bed duration is unavailable. Stage completeness measures data presence and internal duration consistency only, never whether a stage proportion is healthy.

Resting-heart-rate scoring uses bpm difference from the median baseline. HRV scoring uses the ratio to median baseline. Recent load uses only the prior 72 hours of workout minutes and consecutive training days; it is labeled a simple proxy.

- [ ] **Step 8: Implement activity, workout, classification, and daily weights**

```ts
export const DAILY_WEIGHTS = {
  activity: 25,
  workout: 25,
  sleep: 25,
  recovery: 15,
  weeklyStructure: 10,
} as const

export const WEEKLY_STRUCTURE_WEIGHTS = {
  workoutDays: 0.25,
  moderateMinutes: 0.25,
  swimmingSessions: 0.25,
  strengthSessions: 0.25,
} as const
```

Activity is primarily `min(steps / stepGoal, 1) * 100`, with stand hours as an optional supporting signal; the evidence UI may display progress up to 110%, but component scores never exceed 100. Workout minutes are scored separately so they are not counted through exercise minutes again. Weekly structure prorates the user’s workout-day, moderate-minute, swimming-session, and strength-session goals by elapsed covered days, counts distinct workout local dates, groups pool/open-water types as swimming and both strength types as strength, and lowers coverage when the Shortcut did not query workouts for part of the period. The moderate-minute subcomponent sums Apple exercise minutes from daily records; it does not label all elapsed workout time as moderate intensity. A null goal makes that subcomponent not applicable; present goals use the four equal nominal weights above and re-normalize the applicable set. `classifyDay` receives `workoutsCovered`; it returns `training`, `activeRecovery`, `rest`, or `insufficientData`. An empty workout array counts as rest evidence only when coverage confirms workouts were queried for that date. A planned rest day marks the workout component not applicable, then normalizes remaining weights.

Map numeric scores to the approved states only when a numeric score exists: 85–100 状态很好, 70–84 基本达标, 55–69 部分不足, 40–54 明显不足, below 40 活动或恢复不足. Insufficient evidence always says 数据不足 or 个人基线建立中.

- [ ] **Step 9: Implement recommendation gates**

Generate at most three stable-ID recommendations. Require two independent weak-recovery signals before recommending complete rest. Use recovery/sleep first, weekly swim/strength structure second, and remaining steps third. Every item includes the concrete observed value or explicitly says the baseline is still building. Avoid “必须”, “一定”, and diagnostic language.

- [ ] **Step 10: Verify and commit the daily analysis engine**

Run:

```bash
npm test -- src/features/analysis
npm run lint
npm run typecheck
npm run build
git diff --check
```

```bash
git add src/features/analysis src/types/analysis.ts src/tests/fixtures
git commit -m "feat: add personal daily analysis"
```

---

### Task 6: Trends, weekly/monthly reviews, and weight-change confidence

**Files:**
- Create: `src/features/analysis/trend-analysis.ts`
- Create: `src/features/analysis/periods.ts`
- Create: `src/features/analysis/weekly-review.ts`
- Create: `src/features/analysis/monthly-review.ts`
- Create: `src/features/analysis/weight-trend.ts`
- Test: `src/features/analysis/trend-analysis.test.ts`
- Test: `src/features/analysis/weekly-review.test.ts`
- Test: `src/features/analysis/monthly-review.test.ts`
- Test: `src/features/analysis/weight-trend.test.ts`

**Interfaces:**
- Produces: `buildTrend(input): TrendResult`
- Produces: `buildWeeklyReview(input): WeeklyReview`
- Produces: `buildMonthlyReview(input): MonthlyReview`
- Produces: `estimateWeightChangePerWeek(measurements): WeightTrend`
- Consumes: date-only helpers, normalized snapshot including coverage index, local goals, and score functions

- [ ] **Step 1: Define trend and review output contracts in the tests**

```ts
export type TrendRange = 7 | 30 | 90
export type TrendMetric =
  | 'steps'
  | 'activeEnergyKcal'
  | 'exerciseMinutes'
  | 'sleepMinutes'
  | 'sleepScore'
  | 'restingHeartRateBpm'
  | 'hrvSdnnMs'
  | 'weightKg'
  | 'bodyFatPercentage'
  | 'workoutCount'
  | 'swimmingDistanceMeters'

export type TrendResult = {
  points: { date: string; value: number }[]
  average: number | null
  minimum: number | null
  maximum: number | null
  previousPeriodChange: number | null
  dataPointCount: number
}
```

- [ ] **Step 2: Write no-data and previous-period trend tests**

```ts
test('returns no statistics or invented points when a metric has no data', () => {
  const result = buildTrend({ snapshot: emptySnapshot(), metric: 'hrvSdnnMs', range: 30, endDate: '2026-08-01' })
  expect(result).toEqual({
    points: [],
    average: null,
    minimum: null,
    maximum: null,
    previousPeriodChange: null,
    dataPointCount: 0,
  })
})
```

- [ ] **Step 3: Write distinct-day weekly and partial-month comparison tests**

```ts
test('counts distinct workout dates rather than workout rows', () => {
  const review = buildWeeklyReview(
    makeWeeklyInput({
      today: '2026-08-01',
      weekStartsOn: 1,
      workoutStarts: [
        '2026-07-27T07:00:00+08:00',
        '2026-07-27T18:00:00+08:00',
        '2026-07-29T18:00:00+08:00',
      ],
    }),
  )
  expect(review.workoutCount).toBe(3)
  expect(review.workoutDayCount).toBe(2)
})

test('an unfinished month compares only equal elapsed days', () => {
  const review = buildMonthlyReview(makeMonthlyInput({ today: '2026-08-05' }))
  expect(review.periodStatus).toBe('inProgress')
  expect(review.comparison.current.end).toBe('2026-08-05')
  expect(review.comparison.previous.end).toBe('2026-07-05')
})
```

- [ ] **Step 4: Write weight-trend evidence thresholds**

```ts
test('does not judge weekly weight change with fewer than six points or fourteen days', () => {
  const result = estimateWeightChangePerWeek([
    measurement('2026-07-26', 80.4),
    measurement('2026-07-30', 80.1),
    measurement('2026-08-01', 79.9),
  ])
  expect(result.kgPerWeek).toBeNull()
  expect(result.confidence).toBe('building')
})
```

- [ ] **Step 5: Run the four files and confirm RED**

Run:

```bash
npm test -- src/features/analysis/trend-analysis.test.ts src/features/analysis/weekly-review.test.ts src/features/analysis/monthly-review.test.ts src/features/analysis/weight-trend.test.ts
```

Expected: FAIL because trend and review modules do not exist.

- [ ] **Step 6: Implement range extraction and comparison rules**

For an N-day trend, include the end date and the preceding N−1 date-only values. The previous period is the immediately preceding N dates. Exclude missing values from statistics. Calculate percentage change only when both period means exist and the previous mean is nonzero. For event metrics such as workout count, emit a real zero only when coverage confirms that date was queried; otherwise preserve null.

Weeks use the local configured start day. Months use calendar months. An in-progress period compares against the same number of elapsed days in the previous period and carries `periodStatus: 'inProgress'`. Review coverage is the covered-day ratio for each metric, not the ratio of nonzero observations.

- [ ] **Step 7: Implement weekly and monthly result fields**

Weekly output includes workout count, distinct workout days, workout minutes, average steps, activity energy, swim count/distance, strength count, average sleep minutes/score, average resting heart rate, goal days, recovery days, previous-period deltas, one evidence-backed highlight, one gap, and one next action.

Monthly output includes workout count/minutes, activity energy, average steps/sleep, swim count/distance, strength count, weight/body-fat/waist changes, resting-heart-rate trend, previous-period deltas, summary, and next-month target. If and only if the weight-pacing evidence threshold is met and the user set a target weekly range, compare the regression slope with that local range using non-absolute language. Nullable fields remain null and are omitted from generated prose.

- [ ] **Step 8: Implement robust weight pace**

Require at least six valid weights spanning at least 14 days. Use ordinary least-squares slope over date-only day offsets and multiply by seven. Return `confidence: 'medium'` for 14–20 days and `high` at 21 or more days. Never infer fat or muscle change from weight alone.

- [ ] **Step 9: Verify and commit period analysis**

Run:

```bash
npm test -- src/features/analysis
npm run lint
npm run typecheck
npm run build
git diff --check
```

```bash
git add src/features/analysis src/types/analysis.ts src/tests/fixtures
git commit -m "feat: add trends and personal reviews"
```

---

### Task 7: Application state, private profile, and preview-before-commit import flow

**Files:**
- Modify: `src/types/profile.ts`
- Create: `src/app/app-context.ts`
- Create: `src/app/app-reducer.ts`
- Create: `src/app/AppProvider.tsx`
- Create: `src/app/preferences.ts`
- Create: `src/hooks/useHealthSnapshot.ts`
- Create: `src/features/import/import-service.ts`
- Create: `src/features/import/import-flow-reducer.ts`
- Create: `src/features/import/SyncSheet.tsx`
- Create: `src/features/import/ImportPreview.tsx`
- Create: `src/features/import/ImportResult.tsx`
- Create: `src/features/import/import.css`
- Test: `src/app/preferences.test.ts`
- Test: `src/features/import/import-service.test.ts`
- Test: `src/features/import/SyncSheet.test.tsx`
- Modify: `src/app/App.tsx`
- Modify: `src/db/database.ts`
- Modify: `src/db/health-repository.ts`
- Modify: `src/db/import-transaction.ts`

**Interfaces:**
- Produces: `UserProfile`, `PersonalGoals`, `UiPreferences`, `AppContextValue`
- Produces: `inspectHealthFile(file, repository): Promise<PreparedImport>`
- Produces: `commitPreparedImport(prepared, db): Promise<ImportSummary>`
- Produces: `SyncSheet` state machine `idle → inspecting → preview → committing → complete | fatalError`
- Consumes: parser, normalized types, repository, transaction, analyses, and five-tab shell

```ts
export type ThemeChoice = 'system' | 'light' | 'dark'

export type UiPreferences = {
  theme: ThemeChoice
  selectedTab: AppTab
  weekStartsOn: 0 | 1
  onboardingComplete: boolean
}

export type ImportPreviewSummary = Omit<ImportSummary, 'lastImportedAt'>

export type PreparedImport = {
  fileName: string
  schemaVersion: string
  plan: ImportPlan
  summary: ImportPreviewSummary
  warnings: ImportWarning[]
}
```

- [ ] **Step 1: Define a private profile with no committed personal defaults**

```ts
export type PersonalGoals = {
  objective: 'fatLossPreserveMuscle' | 'generalFitness' | null
  dailySteps: number | null
  weeklyWorkoutDays: number | null
  weeklySwimmingSessions: number | null
  weeklyStrengthSessions: number | null
  weeklyModerateMinutes: number | null
  sleepMinMinutes: number | null
  sleepMaxMinutes: number | null
  targetWeightRangeKg: [number, number] | null
  longTermWeightRangeKg: [number, number] | null
  targetWeeklyWeightLossKg: [number, number] | null
  targetBodyFatPercentage: number | null
}

export type UserProfile = {
  id: 'current'
  name: string
  sex: 'male' | 'female' | 'other' | 'unspecified'
  birthDate: string | null
  ageAsOf: { age: number; date: string } | null
  heightCm: number | null
  maximumHeartRateBpm: number | null
  bodyContext: {
    weightKg: number | null
    bodyFatMassKg: number | null
    bodyFatPercentage: number | null
    skeletalMuscleMassKg: number | null
    bmi: number | null
    waistHipRatio: number | null
    visceralFatLevel: number | null
    basalMetabolicRateKcal: number | null
  }
  goals: PersonalGoals
  updatedAt: string
}

export const EMPTY_PROFILE: Omit<UserProfile, 'updatedAt'> = {
  id: 'current',
  name: '',
  sex: 'unspecified',
  birthDate: null,
  ageAsOf: null,
  heightCm: null,
  maximumHeartRateBpm: null,
  bodyContext: {
    weightKg: null,
    bodyFatMassKg: null,
    bodyFatPercentage: null,
    skeletalMuscleMassKg: null,
    bmi: null,
    waistHipRatio: null,
    visceralFatLevel: null,
    basalMetabolicRateKcal: null,
  },
  goals: {
    objective: null,
    dailySteps: null,
    weeklyWorkoutDays: null,
    weeklySwimmingSessions: null,
    weeklyStrengthSessions: null,
    weeklyModerateMinutes: null,
    sleepMinMinutes: null,
    sleepMaxMinutes: null,
    targetWeightRangeKg: null,
    longTermWeightRangeKg: null,
    targetWeeklyWeightLossKg: null,
    targetBodyFatPercentage: null,
  },
}
```

Store the profile only in IndexedDB. Do not serialize it to localStorage.

- [ ] **Step 2: Write preference-boundary tests**

```ts
test('persists only approved UI preference keys', () => {
  const storage = createMemoryStorage()
  savePreferences(storage, {
    theme: 'dark',
    selectedTab: 'today',
    weekStartsOn: 1,
    onboardingComplete: true,
  })
  expect(Object.keys(storage.snapshot()).sort()).toEqual([
    'fitinsight.onboardingComplete',
    'fitinsight.selectedTab',
    'fitinsight.theme',
    'fitinsight.weekStartsOn',
  ])
})
```

- [ ] **Step 3: Write import inspection and profile-isolation tests**

```ts
test('inspects a health file without committing it or applying envelope profile metadata', async () => {
  const file = new File([JSON.stringify(syntheticEnvelope)], 'fitinsight.json', {
    type: 'application/json',
  })
  const prepared = await inspectHealthFile(file, repository)

  expect(prepared.summary.daily.added).toBe(1)
  expect(await repository.getHealthSnapshot()).toEqual(emptySnapshot())
  expect(await repository.getPrivateProfile()).toBeNull()

  await commitPreparedImport(prepared, db)
  expect((await repository.getHealthSnapshot()).dailyRecords).toHaveLength(1)
  expect(await repository.getPrivateProfile()).toBeNull()
})
```

The file gate accepts `.json` when iOS supplies an empty MIME type, rejects files above 25 MiB before reading, and maps failures to `unreadable_file`, `invalid_json`, `invalid_envelope`, `unsupported_version`, `storage_unavailable`, `stale_preview`, or `transaction_failed`.

- [ ] **Step 4: Write the complete import-dialog interaction test**

```tsx
test('shows exact preview counts and writes only after confirmation', async () => {
  const user = userEvent.setup()
  const inspect = vi.fn().mockResolvedValue(makePreparedImport({ added: 3, updated: 1, skipped: 1 }))
  const commit = vi.fn().mockResolvedValue(makeImportSummary({ added: 3, updated: 1, skipped: 1 }))

  render(<SyncSheet open onClose={vi.fn()} inspectFile={inspect} commitImport={commit} />)
  await user.upload(
    screen.getByLabelText('选择 JSON 文件'),
    new File(['{}'], 'health.json', { type: 'application/json' }),
  )

  expect(await screen.findByText('新增 3 条')).toBeVisible()
  expect(screen.getByText('更新 1 条')).toBeVisible()
  expect(screen.getByText('跳过 1 条')).toBeVisible()
  expect(commit).not.toHaveBeenCalled()

  await user.click(screen.getByRole('button', { name: '确认导入' }))
  expect(await screen.findByText('同步完成')).toBeVisible()
  expect(commit).toHaveBeenCalledOnce()
})
```

- [ ] **Step 5: Run the three focused files and confirm RED**

Run:

```bash
npm test -- src/app/preferences.test.ts src/features/import/import-service.test.ts src/features/import/SyncSheet.test.tsx
```

Expected: FAIL because the private profile, app provider, service, and import UI do not exist.

- [ ] **Step 6: Implement stale-preview protection and app revision refresh**

Add `revision` to database meta and `baseRevision` to `PreparedImport`. Inspection reads the current revision and builds counts against that snapshot. Commit checks `baseRevision` inside the same write transaction; a mismatch returns `stale_preview` and asks the user to inspect the file again.

The app context is:

```ts
export type AppContextValue = {
  activeTab: AppTab
  setActiveTab(tab: AppTab): void
  dataRevision: number
  refreshData(): void
  profile: UserProfile | null
  saveProfile(profile: UserProfile): Promise<void>
  syncSheetOpen: boolean
  openSyncSheet(): void
  closeSyncSheet(): void
}
```

Successful import, profile save, backup restore, and clear-all increment `dataRevision`; feature hooks re-query IndexedDB from that revision. Closing the sync sheet discards the prepared file and warnings from memory.

- [ ] **Step 7: Implement actionable synchronization copy**

The sheet exposes two actions: `运行 FitInsight 同步快捷指令` using a user-configurable `shortcuts://run-shortcut?name=FitInsight%20同步` URL, and `选择 JSON 文件`. Copy explicitly says that the Shortcut saves a file and the user returns to select it; do not promise automatic HealthKit access or file return.

Transaction failure copy says `导入未完成，原有数据没有改变。` and never includes the thrown error or raw record.

- [ ] **Step 8: Verify and commit state plus import experience**

Run:

```bash
npm test -- src/app src/features/import src/db
npm run lint
npm run typecheck
npm run build
git diff --check
```

```bash
git add src/app src/hooks src/types/profile.ts src/features/import src/db
git commit -m "feat: add stable health data import flow"
```

---

### Task 8: Selected “行动处方” Today experience

**Files:**
- Create: `src/features/dashboard/dashboard-view-model.ts`
- Create: `src/features/dashboard/useToday.ts`
- Create: `src/features/dashboard/TodayPage.tsx`
- Create: `src/features/dashboard/ActionPrescription.tsx`
- Create: `src/features/dashboard/EvidenceSummary.tsx`
- Create: `src/features/dashboard/TodayDetails.tsx`
- Create: `src/features/dashboard/dashboard.module.css`
- Create: `src/components/EmptyState.tsx`
- Create: `src/components/MetricValue.tsx`
- Test: `src/features/dashboard/dashboard-view-model.test.ts`
- Test: `src/features/dashboard/TodayPage.test.tsx`
- Modify: `src/app/App.tsx`
- Modify: `src/components/AppShell.tsx`
- Modify: `src/components/BottomNavigation.tsx`
- Modify: `src/styles/tokens.css`
- Modify: `src/styles/base.css`

**Interfaces:**
- Produces: `buildTodayViewModel(input): TodayViewModel`
- Produces: `useToday(localDate, dataRevision): AsyncTodayState`
- Produces: selected-direction Today UI and its loading, empty, building, partial, and ready states
- Consumes: repository snapshot, profile, baseline, daily analysis, and import-sheet controls

- [ ] **Step 1: Define the exact view model in the failing test**

```ts
export type MetricDisplay = {
  id: string
  label: string
  value: string | null
  statusText: string
  accent: 'activity' | 'training' | 'sleep' | 'recovery' | 'neutral'
}

export type TodayViewModel = {
  dateLabel: string
  greeting: string
  lastImportedLabel: string | null
  prescription: {
    title: string
    reason: string
    actionLabel: string
    confidence: Confidence
  } | null
  score: ScoreResult
  statusLabel: string
  evidence: MetricDisplay[]
  recommendations: Recommendation[]
}

export type AsyncTodayState =
  | { status: 'loading' }
  | { status: 'empty'; lastImportedAt: string | null }
  | { status: 'ready'; viewModel: TodayViewModel }
  | { status: 'error'; message: string }
```

- [ ] **Step 2: Write view-model tests for no profile, low coverage, and ready data**

```ts
test('low coverage shows building copy and never formats a zero score', () => {
  const viewModel = buildTodayViewModel(
    makeDashboardInput({ dailyScore: unavailableScore(), profile: null }),
  )
  expect(viewModel.score.score).toBeNull()
  expect(viewModel.statusLabel).toBe('个人基线建立中')
  expect(viewModel.prescription?.actionLabel).toBe('先完善本地档案')
})

test('ready data leads with one action and no more than four evidence metrics', () => {
  const viewModel = buildTodayViewModel(makeReadyDashboardInput())
  expect(viewModel.prescription?.title).toBeTruthy()
  expect(viewModel.prescription?.reason).toBeTruthy()
  expect(viewModel.evidence.length).toBeLessThanOrEqual(4)
})
```

- [ ] **Step 3: Write Today UI behavior before its components**

```tsx
test('renders the action before supporting score and opens synchronization', async () => {
  const user = userEvent.setup()
  const openSyncSheet = vi.fn()
  render(<TodayPage state={readyTodayState()} openSyncSheet={openSyncSheet} />)

  const action = screen.getByRole('heading', { name: /今天怎么练/ })
  const score = screen.getByText(/基本达标/)
  expect(action.compareDocumentPosition(score) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()

  await user.click(screen.getByRole('button', { name: '同步' }))
  expect(openSyncSheet).toHaveBeenCalledOnce()
})
```

- [ ] **Step 4: Run dashboard tests and confirm RED**

Run: `npm test -- src/features/dashboard`

Expected: FAIL because the view model and Today components do not exist.

- [ ] **Step 5: Implement the selected visual hierarchy faithfully**

Use the reference `docs/design/fitinsight-action-prescription-reference.png` as the target. Lock these dark tokens:

```css
:root {
  --canvas: #11181f;
  --surface: #1b232a;
  --text-primary: #f4f6f8;
  --text-secondary: #a8afb7;
  --divider: #343d46;
  --activity: #79db82;
  --action: #ff7b70;
  --sleep: #7b83ff;
  --recovery: #67d5c2;
  --primary-action: #3f6fd8;
}

[data-theme='light'] {
  --canvas: #f4f0ea;
  --surface: #fffcf7;
  --text-primary: #172029;
  --text-secondary: #65707b;
  --divider: #dad4cc;
  --activity: #397a42;
  --action: #b54840;
  --sleep: #4f56b8;
  --recovery: #24766b;
  --primary-action: #315cb8;
}
```

Use 18px horizontal page padding, 16–20px vertical gaps, 20px section radius, extremely restrained shadow, and `-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "PingFang SC", sans-serif`. The `system` theme follows `prefers-color-scheme` without flashing the wrong scheme on startup. Do not use gradients, health rings, decorative charts, nested cards, fake device chrome, or the reference image itself in the UI.

The fixed bottom navigation consumes `env(safe-area-inset-bottom)` and the scrolling content reserves its full height. The top content consumes `env(safe-area-inset-top)`. Keep all controls at least 44px.

- [ ] **Step 6: Implement loading and honest empty states**

Loading uses text and neutral blocks with `aria-busy`, not a fabricated score. With no imported day, say `尚未导入今天的健康数据` and show the sync button. With partial data, render only known metrics. `TodayDetails` shows known step, active-energy, exercise-minute, stand-hour, walking-distance, sleep duration/stages/awake time, and today-workout type/duration/energy/heart-rate fields below the primary prescription. With missing heart-rate or sleep stages, omit those rows rather than inserting zero.

- [ ] **Step 7: Verify and commit the primary experience**

Run:

```bash
npm test -- src/features/dashboard src/app/App.test.tsx
npm run lint
npm run typecheck
npm run build
git diff --check
```

```bash
git add src/features/dashboard src/components src/styles src/app/App.tsx
git commit -m "feat: add action-first today dashboard"
```

---

### Task 9: Workout browsing and single-metric trends

**Files:**
- Create: `src/features/workouts/workout-view-model.ts`
- Create: `src/features/workouts/useWorkouts.ts`
- Create: `src/features/workouts/WorkoutsPage.tsx`
- Create: `src/features/workouts/WorkoutFilters.tsx`
- Create: `src/features/workouts/WorkoutList.tsx`
- Create: `src/features/workouts/WorkoutDetailDialog.tsx`
- Create: `src/features/workouts/workouts.module.css`
- Create: `src/features/trends/trend-view-model.ts`
- Create: `src/features/trends/useTrend.ts`
- Create: `src/features/trends/TrendsPage.tsx`
- Create: `src/features/trends/TrendMetricPicker.tsx`
- Create: `src/features/trends/TrendChart.tsx`
- Create: `src/features/trends/TrendSummary.tsx`
- Create: `src/features/trends/trends.module.css`
- Test: `src/features/workouts/WorkoutsPage.test.tsx`
- Test: `src/features/workouts/WorkoutDetailDialog.test.tsx`
- Test: `src/features/trends/TrendsPage.test.tsx`
- Test: `src/features/trends/TrendChart.test.tsx`
- Modify: `src/app/App.tsx`

**Interfaces:**
- Produces: workout category `all | swimming | strength | walking | running | other`
- Produces: `buildWorkoutListItems`, `buildWorkoutDetail`, and accessible filter/list/detail UI
- Produces: `buildTrendViewModel` and 7/30/90-day one-metric UI
- Consumes: repository workouts, pace/zones, and Task 6 trend results

- [ ] **Step 1: Write workout category and missing-heart-rate behavior tests**

```tsx
test('filters swimming and does not fabricate zones without timestamped samples', async () => {
  const user = userEvent.setup()
  render(<WorkoutsPage state={workoutsStateWithSwimmingAndStrength()} />)

  await user.click(screen.getByRole('button', { name: '游泳' }))
  expect(screen.getAllByRole('article')).toHaveLength(1)
  await user.click(screen.getByRole('button', { name: /泳池游泳/ }))
  expect(screen.getByText('平均配速（含休息）')).toBeVisible()
  expect(screen.queryByText('心率区间')).not.toBeInTheDocument()
})
```

- [ ] **Step 2: Write trend range, gaps, and empty-chart tests**

```tsx
test('requests the selected range and keeps missing values as chart gaps', async () => {
  const user = userEvent.setup()
  const load = vi.fn().mockResolvedValue(makeTrendViewModel({ points: [
    { date: '2026-07-30', value: 7100 },
    { date: '2026-07-31', value: null },
    { date: '2026-08-01', value: 8300 },
  ] }))
  render(<TrendsPage loadTrend={load} />)

  await user.click(screen.getByRole('button', { name: '30 天' }))
  expect(load).toHaveBeenLastCalledWith(expect.objectContaining({ range: 30 }))
  expect(screen.getByLabelText('步数趋势，3 天中有 2 个数据点')).toBeVisible()
})

test('does not mount a chart line when all points are missing', () => {
  render(<TrendChart viewModel={emptyTrendViewModel()} />)
  expect(screen.getByText('这段时间还没有可用数据')).toBeVisible()
  expect(screen.queryByTestId('trend-line')).not.toBeInTheDocument()
})
```

- [ ] **Step 3: Run workout and trend tests and confirm RED**

Run:

```bash
npm test -- src/features/workouts src/features/trends
```

Expected: FAIL because these views do not exist.

- [ ] **Step 4: Implement honest workout details**

Group list items by local workout start date and sort newest first. The detail dialog includes type, local start, duration, active calories, distance, average/maximum heart rate, source, and device only when present. Swimming pace is labeled `含休息的平均配速`; compare with the most recent four workouts of the same pool/open-water type only. Strength shows frequency, duration, energy, heart rate, and progress toward the local weekly goal, never exercises or weights.

Use Phosphor outline icons with `aria-hidden="true"`; labels remain visible. The detail is a native accessible dialog or a focus-trapped component with labelled title, close button, Escape support, and focus restoration.

- [ ] **Step 5: Implement one-metric Recharts views**

The metric picker includes all approved metrics. Each view renders one line, `connectNulls={false}`, no gradient fill, and an accessible text summary of average/min/max/change/data-point count. Missing values remain null. An all-null series renders only the empty state.

- [ ] **Step 6: Verify and commit browsing plus trends**

Run:

```bash
npm test -- src/features/workouts src/features/trends
npm run lint
npm run typecheck
npm run build
git diff --check
```

```bash
git add src/features/workouts src/features/trends src/app/App.tsx
git commit -m "feat: add workout and trend views"
```

---

### Task 10: Weekly/monthly review UI and aggregate report exports

**Files:**
- Create: `src/features/reviews/review-view-model.ts`
- Create: `src/features/reviews/useReview.ts`
- Create: `src/features/reviews/ReviewsPage.tsx`
- Create: `src/features/reviews/ReviewComparison.tsx`
- Create: `src/features/reviews/ReviewHighlights.tsx`
- Create: `src/features/reviews/ReviewExportMenu.tsx`
- Create: `src/features/reviews/review-export.ts`
- Create: `src/features/reviews/reviews.module.css`
- Create: `src/styles/print.css`
- Test: `src/features/reviews/ReviewsPage.test.tsx`
- Test: `src/features/reviews/review-export.test.ts`
- Modify: `src/app/App.tsx`
- Modify: `src/main.tsx`

**Interfaces:**
- Produces: `buildReviewViewModel(review): ReviewViewModel`
- Produces: weekly/monthly selector, in-progress comparison caption, highlights, gap, and next action
- Produces: `serializeReviewJson`, `serializeReviewCsv`, `reviewFileName`, `downloadTextFile`
- Consumes: Task 6 weekly/monthly analyses; never consumes raw imported JSON in export serializers

Use this exact presentation contract:

```ts
export type ReviewMetricDisplay = {
  id: string
  label: string
  current: string | null
  previous: string | null
  change: string | null
  unit: string | null
}

export type ReviewViewModel = {
  exportVersion: '1.0.0'
  period: 'week' | 'month'
  startDate: string
  endDate: string
  periodStatus: 'complete' | 'inProgress' | 'insufficient'
  comparisonCaption: string
  metrics: ReviewMetricDisplay[]
  highlights: string[]
  gaps: string[]
  nextAction: string | null
}
```

- [ ] **Step 1: Write unfinished-period and missing-metric UI tests**

```tsx
test('labels an unfinished month and explains equal-elapsed-day comparison', () => {
  render(<ReviewsPage state={readyMonthlyReviewState({ periodStatus: 'inProgress' })} />)
  expect(screen.getByText('进行中')).toBeVisible()
  expect(screen.getByText('与上月相同已过天数比较')).toBeVisible()
})

test('omits a missing body metric instead of displaying zero', () => {
  render(<ReviewsPage state={readyMonthlyReviewState({ bodyFatChange: null })} />)
  expect(screen.queryByText(/体脂变化/)).not.toBeInTheDocument()
  expect(screen.queryByText('0%')).not.toBeInTheDocument()
})
```

- [ ] **Step 2: Write exact JSON and CSV serializer tests**

```ts
test('exports aggregate review data without raw health records', () => {
  const review = makeReviewViewModel()
  const json = JSON.parse(serializeReviewJson(review))
  expect(json).toMatchObject({ exportType: 'fitinsight-review', period: review.period })
  expect(json).not.toHaveProperty('dailyRecords')
  expect(json).not.toHaveProperty('workouts')
})

test('writes UTF-8 BOM and RFC-4180 escaping for Chinese CSV', () => {
  const csv = serializeReviewCsv(
    makeReviewViewModel({ nextAction: '睡眠优先，力量训练保持 2 次' }),
  )
  expect(csv.startsWith('\uFEFF')).toBe(true)
  expect(csv).toContain('"睡眠优先，力量训练保持 2 次"')
})
```

- [ ] **Step 3: Run review files and confirm RED**

Run:

```bash
npm test -- src/features/reviews/ReviewsPage.test.tsx src/features/reviews/review-export.test.ts
```

Expected: FAIL because review views and serializers do not exist.

- [ ] **Step 4: Implement review presentation and export**

`ReviewViewModel` contains `period`, `startDate`, `endDate`, `periodStatus`, `comparisonCaption`, formatted known metrics, `highlights`, `gaps`, and `nextAction`. Preserve nullable domain values until formatting; never convert null to zero or `暂无` in serialized JSON.

`serializeReviewJson` writes a versioned aggregate object. `serializeReviewCsv` produces rows `类别,指标,当前周期,上一周期,变化,单位`, then summary rows for highlights, gaps, and the next action. Escape quotes by doubling them and wrap fields containing comma, quote, or newline.

`downloadTextFile` creates a Blob, clicks a temporary download anchor, revokes the object URL, and never logs the contents. The print action calls `window.print()`; print CSS shows the selected review only and hides navigation, buttons, filters, and dialogs.

- [ ] **Step 5: Verify and commit review UI**

Run:

```bash
npm test -- src/features/reviews
npm run lint
npm run typecheck
npm run build
git diff --check
```

```bash
git add src/features/reviews src/styles/print.css src/app/App.tsx src/main.tsx
git commit -m "feat: add weekly and monthly review exports"
```

---

### Task 11: Private profile, goals, backup/restore, and clear-all controls

**Files:**
- Create: `src/features/profile/useProfile.ts`
- Create: `src/features/profile/ProfilePage.tsx`
- Create: `src/features/profile/OnboardingPanel.tsx`
- Create: `src/features/profile/PrivateProfileForm.tsx`
- Create: `src/features/profile/GoalsForm.tsx`
- Create: `src/features/profile/ThemeControl.tsx`
- Create: `src/features/profile/DataManagementPanel.tsx`
- Create: `src/features/profile/BackupRestoreDialog.tsx`
- Create: `src/features/profile/ClearDataDialog.tsx`
- Create: `src/features/profile/PrivacyPanel.tsx`
- Create: `src/features/profile/DevelopmentMockPanel.tsx`
- Create: `src/features/profile/profile.module.css`
- Test: `src/features/profile/PrivateProfileForm.test.tsx`
- Test: `src/features/profile/DataManagementPanel.test.tsx`
- Test: `src/features/profile/ClearDataDialog.test.tsx`
- Modify: `src/app/App.tsx`
- Modify: `src/app/AppProvider.tsx`

**Interfaces:**
- Produces: explicit private-profile save, goals, theme, week start, maximum heart rate, backup/restore, and clear UI
- Produces: development-only synthetic data loader guarded by `import.meta.env.DEV && VITE_ENABLE_MOCKS === 'true'`
- Consumes: profile repository, backup functions, restore replacement, clear-all, preferences, and app refresh

- [ ] **Step 1: Write a privacy-first profile-form test**

```tsx
test('does not prefill committed personal measurements and saves only after submit', async () => {
  const user = userEvent.setup()
  const save = vi.fn()
  render(<PrivateProfileForm initialProfile={null} onSave={save} />)

  expect(screen.getByLabelText('姓名')).toHaveValue('')
  expect(screen.getByLabelText('身高（厘米）')).toHaveValue(null)
  expect(screen.getByLabelText('目标体重下限（公斤）')).toHaveValue(null)

  await user.type(screen.getByLabelText('姓名'), '本地用户')
  await user.click(screen.getByRole('button', { name: '保存到本机' }))
  expect(save).toHaveBeenCalledWith(expect.objectContaining({ name: '本地用户' }))
})
```

- [ ] **Step 2: Write backup warning and replacement-confirmation tests**

```tsx
test('warns that a backup is sensitive plaintext before download', async () => {
  const user = userEvent.setup()
  const createBackup = vi.fn()
  render(<DataManagementPanel createBackup={createBackup} />)

  await user.click(screen.getByRole('button', { name: '导出本地数据备份' }))
  expect(screen.getByText('备份文件包含敏感的明文健康数据')).toBeVisible()
  expect(createBackup).not.toHaveBeenCalled()
})

test('requires explicit confirmation before replacing data from a backup', async () => {
  const user = userEvent.setup()
  const restore = vi.fn()
  render(<BackupRestoreDialog prepared={makePreparedBackup()} onRestore={restore} />)
  expect(screen.getByText('恢复会替换当前全部本地数据')).toBeVisible()
  expect(restore).not.toHaveBeenCalled()
  await user.click(screen.getByRole('button', { name: '确认替换并恢复' }))
  expect(restore).toHaveBeenCalledOnce()
})
```

- [ ] **Step 3: Write clear-all scope and cancellation tests**

```tsx
test('cancel leaves data untouched and confirmation clears known local stores', async () => {
  const user = userEvent.setup()
  const clearAll = vi.fn()
  const { rerender } = render(<ClearDataDialog open onCancel={vi.fn()} onConfirm={clearAll} />)
  await user.click(screen.getByRole('button', { name: '取消' }))
  expect(clearAll).not.toHaveBeenCalled()

  rerender(<ClearDataDialog open onCancel={vi.fn()} onConfirm={clearAll} />)
  await user.click(screen.getByRole('button', { name: '清除全部本地数据' }))
  expect(clearAll).toHaveBeenCalledOnce()
})
```

- [ ] **Step 4: Run profile tests and confirm RED**

Run: `npm test -- src/features/profile`

Expected: FAIL because settings and data-management views do not exist.

- [ ] **Step 5: Implement profile validation and age handling**

All fields are optional until the user saves. If `birthDate` is provided, calculate current age locally; otherwise use `ageAsOf` and visibly label the as-of date. Validate positive finite numbers and sensible UI ranges, but use warnings rather than medical judgments. Imported health-envelope `profile` metadata never updates these settings.

Save the profile through the IndexedDB repository. localStorage stores theme, route/tab, week start, and onboarding completion only. Onboarding asks for the minimum values needed for useful analysis and can be skipped; skipped fields remain unknown.

- [ ] **Step 6: Implement backup, restore, and clear behavior**

Backup download uses the versioned plaintext backup from Task 3. Restore validates before showing counts and performs explicit replace semantics inside one transaction. Clear-all removes all IndexedDB health/profile/meta stores and the four approved preference keys; it cannot and does not claim to remove files in Files or iCloud Drive.

Development mock mode only appears when both `import.meta.env.DEV` and `VITE_ENABLE_MOCKS === 'true'`; its dataset is synthetic and imported through the same parser/transaction path as a user file.

- [ ] **Step 7: Verify and commit local profile plus controls**

Run:

```bash
npm test -- src/features/profile src/db
npm run lint
npm run typecheck
npm run build
git diff --check
```

Expected: tests and build pass. Inspect the staged diff and confirm fixtures remain explicitly synthetic and no user-provided profile values appear in product or documentation files.

```bash
git add src/features/profile src/app src/db src/types/profile.ts
git commit -m "feat: add private profile and local data controls"
```

---

### Task 12: Installable PWA, offline shell, update prompt, and original icons

**Files:**
- Create: `src/pwa/pwa-options.ts`
- Create: `src/pwa/usePwaUpdate.ts`
- Create: `src/components/UpdatePrompt.tsx`
- Create: `src/components/UpdatePrompt.test.tsx`
- Create: `src/pwa/pwa-options.test.ts`
- Create: `public/theme-init.js`
- Create: `public/icons/fitinsight-icon-source.png`
- Create: `public/icons/icon-192.png`
- Create: `public/icons/icon-512.png`
- Create: `public/icons/icon-maskable-512.png`
- Create: `public/icons/apple-touch-icon.png`
- Create: `public/icons/favicon-32.png`
- Create: `scripts/verify-pwa.mjs`
- Modify: `vite.config.ts`
- Modify: `index.html`
- Modify: `src/main.tsx`
- Modify: `src/app/App.tsx`
- Modify: `src/vite-env.d.ts`

**Interfaces:**
- Produces: `PWA_OPTIONS: Partial<VitePWAOptions>`
- Produces: `usePwaUpdate()` and user-triggered `<UpdatePrompt />`
- Produces: installable manifest at `manifest.webmanifest`, generated service worker, Apple touch icon, and offline app shell
- Consumes: completed static app; caches no imported health data

- [ ] **Step 1: Write PWA configuration tests before enabling the plugin**

```ts
test('uses prompt updates and no runtime cache for health data', () => {
  expect(PWA_OPTIONS.registerType).toBe('prompt')
  expect(PWA_OPTIONS.manifest).toMatchObject({
    name: 'FitInsight 个人健康分析',
    short_name: 'FitInsight',
    lang: 'zh-CN',
    start_url: './',
    scope: './',
    display: 'standalone',
    orientation: 'portrait-primary',
  })
  expect(PWA_OPTIONS.workbox?.runtimeCaching).toEqual([])
})
```

- [ ] **Step 2: Write the user-controlled update test**

```tsx
test('applies a waiting service worker only after the user accepts', async () => {
  const user = userEvent.setup()
  const applyUpdate = vi.fn().mockResolvedValue(undefined)
  render(
    <UpdatePrompt
      needRefresh
      offlineReady={false}
      applyUpdate={applyUpdate}
      dismiss={vi.fn()}
    />,
  )
  expect(applyUpdate).not.toHaveBeenCalled()
  await user.click(screen.getByRole('button', { name: '立即更新' }))
  expect(applyUpdate).toHaveBeenCalledOnce()
})
```

- [ ] **Step 3: Run PWA tests and confirm RED**

Run: `npm test -- src/pwa src/components/UpdatePrompt.test.tsx`

Expected: FAIL because PWA configuration and update UI do not exist.

- [ ] **Step 4: Generate one original project-bound icon source**

Use the built-in ImageGen tool with this exact art direction, then inspect it before copying it to `public/icons/fitinsight-icon-source.png`:

```text
Use case: logo-brand
Asset type: square PWA app icon source
Primary request: an original minimal abstract symbol for a private fitness insight app, combining a calm forward path and a subtle swimming motion without resembling Apple activity rings or protected Apple icons
Style/medium: flat, crisp, premium mobile app icon
Composition/framing: single centered symbol, generous padding, all meaningful content inside the central 66% maskable safe area
Color palette: charcoal #11181F background; restrained coral #FF7B70 and calm blue #3F6FD8 symbol
Constraints: 1024 x 1024; no text; no letter; no gradient; no device; no health ring; no trademark; no watermark; strong silhouette
```

Derive exact sizes without stretching:

```bash
sips -z 192 192 public/icons/fitinsight-icon-source.png --out public/icons/icon-192.png
sips -z 512 512 public/icons/fitinsight-icon-source.png --out public/icons/icon-512.png
sips -z 512 512 public/icons/fitinsight-icon-source.png --out public/icons/icon-maskable-512.png
sips -z 180 180 public/icons/fitinsight-icon-source.png --out public/icons/apple-touch-icon.png
sips -z 32 32 public/icons/fitinsight-icon-source.png --out public/icons/favicon-32.png
```

- [ ] **Step 5: Implement prompt-update PWA behavior**

Configure `VitePWA` with `filename: 'manifest.webmanifest'`, `strategies: 'generateSW'`, `registerType: 'prompt'`, `start_url: './'`, `scope: './'`, and Workbox precache patterns for built JS/CSS/HTML, icons, and the synthetic example file. Manifest icons declare 192 and 512 `purpose: 'any'`, plus the safe-area 512 icon with `purpose: 'maskable'`. Set `runtimeCaching: []`; never cache selected JSON, Blob URLs, IndexedDB values, or report downloads.

`public/theme-init.js` reads only `fitinsight.theme`, resolves `system` through `matchMedia`, and sets `document.documentElement.dataset.theme` before React paints. `index.html` loads it from a relative local path and contains `viewport-fit=cover`, theme-color, mobile-web-app-capable, Apple touch icon, and no remote font, CDN, analytics, or tracker. The update prompt distinguishes `可离线使用` from `有新版本`, can dismiss, and reloads only after explicit acceptance.

- [ ] **Step 6: Create a deterministic PWA verification script**

`scripts/verify-pwa.mjs` exits nonzero unless `dist/manifest.webmanifest`, `dist/sw.js`, all five icons, `viewport-fit=cover`, standalone display, and the synthetic example are present. It parses built `index.html` and fails when a script, stylesheet, image, or manifest URL is cross-origin; it also scans source imports for known analytics packages. It does not blanket-reject harmless URL strings embedded inside third-party build code.

- [ ] **Step 7: Verify and commit PWA support**

Run:

```bash
npm test -- src/pwa src/components/UpdatePrompt.test.tsx
npm run lint
npm run typecheck
npm run build
node scripts/verify-pwa.mjs
git diff --check
```

```bash
git add vite.config.ts index.html src/pwa src/components/UpdatePrompt* src/main.tsx src/app/App.tsx src/vite-env.d.ts public/theme-init.js public/icons scripts/verify-pwa.mjs
git commit -m "feat: make FitInsight installable and offline ready"
```

---

### Task 13: Shortcut/schema/privacy documentation, synthetic sample, and final browser/design QA

**Files:**
- Create: `public/examples/sample-health-data.json`
- Create: `src/tests/sample-health-data.test.ts`
- Create: `docs/data-schema.md`
- Create: `docs/analysis-rules.md`
- Create: `docs/privacy.md`
- Create: `docs/shortcuts-setup-zh.md`
- Create: `README.md`
- Create: `design-qa.md`
- Modify: `package.json`
- Modify: `.gitignore`
- Modify: product files only when QA finds a verified mismatch or functional defect

**Interfaces:**
- Produces: a copyable Shortcut procedure, public schema, analysis explanation, privacy policy, full operating guide, and passing design QA record
- Produces: one synthetic sample that is validated by the production parser
- Consumes: every prior task, the selected reference, production build, and local browser preview

- [ ] **Step 1: Write a failing production-parser test for the public sample**

```ts
import sample from '../../public/examples/sample-health-data.json'
import { parseHealthDataJson } from '../features/import/parse-health-data'

test('the public synthetic example passes the production parser without warnings', () => {
  const result = parseHealthDataJson(JSON.stringify(sample))
  expect(result.ok).toBe(true)
  if (result.ok) expect(result.warnings).toEqual([])
})
```

Run: `npm test -- src/tests/sample-health-data.test.ts`

Expected: FAIL because the public sample does not exist.

- [ ] **Step 2: Add a clearly synthetic, complete schema example**

Use fictional profile metadata or omit profile entirely; use dates and values not copied from the brief or selected mock. Include at least seven daily records, one swimming workout, one strength workout, one body measurement, explicit offset timestamps, timestamped synthetic heart-rate samples, and `coverage.mode: 'patch'`. The fixture must be useful for every page without resembling the user’s real history.

Run: `npm test -- src/tests/sample-health-data.test.ts`

Expected: PASS with zero parser warnings.

- [ ] **Step 3: Write the four product documents with exact required sections**

`docs/data-schema.md` headings:

```text
# FitInsight JSON 1.0.0 数据规范
## 顶层结构
## coverage 与“未查询/查询为空”语义
## DailyRecord
## SleepRecord 与醒来日归属
## Workout、类型映射与稳定标识
## HeartRateSample
## BodyMeasurement
## 单位、null、空数组和 patch 合并
## 致命错误、记录跳过和警告
## 版本兼容策略
## 合成示例
```

`docs/analysis-rules.md` states every window, minimum sample count, weight, score threshold, coverage gate, rest-day rule, HRV/stage redistribution, heart-rate boundary, swimming pace formula, partial-period comparison, weight-trend evidence threshold, and the non-medical disclaimer.

`docs/privacy.md` states no upload/account/telemetry, IndexedDB scope, sensitive plaintext backups, iCloud Drive reality, service-worker cache scope, clearing limitations, and the exact disclaimer from the approved brief.

Use this disclaimer verbatim:

```text
本系统基于 Apple 健康、Apple Watch 及用户录入数据生成，仅供个人健身与生活方式参考，不构成医疗诊断或治疗建议。
```

`docs/shortcuts-setup-zh.md` headings:

```text
# 在 iPhone 创建“FitInsight 同步”快捷指令
## 适用范围与 iOS 动作名称差异
## 首次健康权限
## 创建日期范围与 7–14 天日常回补
## 查询步数、活动能量、锻炼时间和站立小时
## 查询静息心率与 HRV
## 查询并聚合睡眠，避免阶段重复相加
## 查询 Workout、游泳距离、体重和体脂
## 固定单位与 ISO 8601 日期
## 使用“词典/Dictionary”和“列表/List”组装 JSON
## 保存到“在我的 iPhone 上”或 iCloud Drive
## 打开 FitInsight 并选择 JSON
## 手动运行与每日自动化
## 首次授权和系统确认
## 数据为空、重复来源、数量异常和字段缺失排查
## 已知限制
```

The Shortcut guide names likely Chinese and English actions, uses Dictionary/List rather than hand-built JSON text, explains Apple Watch source filtering, never adds In Bed and sleep stages together, distinguishes Stand Hour from Stand Time, and states that complex workout heart-rate details may remain null. It never claims Codex can create or install the Shortcut.

- [ ] **Step 4: Write the complete README**

Include exact commands `npm install`, `npm run dev`, `npm test`, and `npm run build`; static deployment of `dist/` to GitHub Pages/Cloudflare Pages/Netlify; HTTPS requirement for service workers; Safari Add to Home Screen; import/update/offline/backup/restore/clear steps; storage-purge risk; repository privacy rules; project structure; test coverage; and the non-medical disclaimer.

- [ ] **Step 5: Run clean automated verification before browser work**

Run:

```bash
npm ci
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
node scripts/verify-pwa.mjs
git diff --check
```

Expected: every command exits 0 with no test warning, TypeScript error, lint warning, or build error.

- [ ] **Step 6: Start the production-like preview and inspect it in the in-app browser**

Run:

```bash
npm run preview -- --host 0.0.0.0 --port 4173 --strictPort
```

Open `http://localhost:4173/` in the Codex in-app browser. Keep the server alive. Verify 390×844 and 430×932 mobile viewports plus a 1280×900 desktop viewport.

Use the public synthetic example to verify:

1. Empty Today state before import.
2. File inspection preview counts before any write.
3. Confirmed import and immediate Today refresh.
4. Reload persistence.
5. Workout filters and honest missing-zone behavior.
6. Trend range/metric changes and gaps.
7. Weekly/monthly in-progress labels and exports.
8. Local profile save, theme switch, backup warning, restore confirmation, and clear cancellation.
9. Keyboard focus, visible focus rings, labels, 44px targets, reduced motion, and no console error.
10. Safe-area simulation: fixed bottom navigation does not cover the final control.

- [ ] **Step 7: Verify offline and update behavior**

After one online production-build preview, confirm the service worker is active, switch the browser offline, reload, and verify the shell plus IndexedDB-backed data remain readable. Return online and simulate a waiting worker; verify no refresh occurs until `立即更新` is pressed.

- [ ] **Step 8: Run blocking visual QA against Option 2**

Capture the Today view at the same 390×844 content viewport and dark state as `docs/design/fitinsight-action-prescription-reference.png`. Open the reference and implementation capture together in the same QA context. Compare hierarchy, margins, typography, 20px radii, charcoal surfaces, coral/blue accents, flat depth, primary action, metric restraint, and fixed navigation.

Create `design-qa.md` with severity-tagged findings and `final result: blocked` until the comparison is possible. Fix every P0/P1/P2. For each functional defect, first add a failing regression test; for visual defects, recapture after the CSS correction. Repeat the comparison until the file says exactly `final result: passed`. Record remaining P3 polish notes without blocking.

- [ ] **Step 9: Re-run the complete fresh gate after all QA fixes**

Run:

```bash
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
node scripts/verify-pwa.mjs
! rg -n 'console\\.(log|debug|info)' src
git diff --check
git status --short
```

Expected: all verification exits 0; the console scan prints no product match; a manual staged-diff privacy review confirms no real profile or timeline data; `design-qa.md` says `final result: passed`.

- [ ] **Step 10: Commit documentation and verified polish intentionally**

```bash
git add README.md docs/data-schema.md docs/analysis-rules.md docs/privacy.md docs/shortcuts-setup-zh.md public/examples/sample-health-data.json src/tests/sample-health-data.test.ts design-qa.md
git commit -m "docs: add Apple Shortcuts setup guide"
```

If QA changed product files, stage those exact paths separately and commit:

```bash
git commit -m "fix: align FitInsight mobile experience"
```

## Execution Order and Review Gates

1. Execute tasks strictly in numerical order because later interfaces consume earlier ones.
2. For each task, watch the new test fail for the expected missing behavior before writing production code.
3. After GREEN, review against this plan’s interfaces and the approved design before committing.
4. Run the task’s focused suite, then lint, typecheck, and build before moving on.
5. Never stage `work/`, `outputs/`, imported JSON, browser downloads, real health data, or temporary screenshots.
6. Before final handoff, require both the fresh automated gate and `design-qa.md` with `final result: passed`.
