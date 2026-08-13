# FitInsight MVP Design

**Date:** 2026-08-01
**Status:** Ready for user review
**Product:** FitInsight / 个人健康分析
**Selected visual direction:** Option 2, “行动处方”

## 1. Purpose

FitInsight is a private, mobile-first progressive web app for one user. Its first release must complete one dependable loop:

1. Apple Health and Apple Watch collect health and workout data.
2. An iPhone Shortcut exports a versioned JSON file.
3. The user imports that file in FitInsight.
4. The app validates, normalizes, merges, and stores the data locally.
5. The app explains today, the current week, and the current month with conservative, evidence-backed personal analysis.

The release is useful only if the import is repeatable, partial data is safe, analysis is transparent, and the app remains comfortable to use from iPhone Safari or the home screen.

## 2. Product Principles

- Local-first: the application has no account, backend, cloud database, telemetry, advertising, or AI API.
- Stable before broad: importing, merging, persistence, and recovery from malformed input take priority over advanced charts.
- Honest analysis: missing data is unknown, not zero; low coverage never becomes a negative health conclusion.
- Action before metrics: the home page leads with one conclusion and one recommended next action.
- Personal but private: real profile and body measurements are entered or imported on the user’s device and are never committed to the repository.
- Fitness guidance only: all output is lifestyle guidance, never diagnosis or treatment advice.
- iPhone first: touch targets, safe areas, standalone mode, offline use, and file import are first-class requirements.

## 3. Scope

### 3.1 First usable release

The first release includes:

- React, TypeScript, and Vite application foundations.
- Five working destinations: 今天、训练、趋势、回顾、我的.
- Versioned JSON schema, TypeScript types, synthetic example data, and Chinese schema documentation.
- File selection, two-layer validation, normalization, import preview, atomic local merge, and a human-readable result summary.
- IndexedDB persistence for daily records, workouts, body measurements, import metadata, and the private profile.
- Light local preferences in localStorage, limited to theme, selected tab, week start, and onboarding state.
- Today view for activity, sleep, workout, recovery coverage, daily score, and at most three recommendations.
- Workout list, category filtering, basic detail, swimming pace, and honest handling of missing heart-rate samples.
- Seven-day, 30-day, and 90-day single-metric trends with no-data states.
- Minimal but real weekly and monthly aggregates, including previous-period comparison.
- Data backup export/import and clear-all-local-data.
- JSON, CSV, and print-friendly review export.
- Installable PWA, offline app shell, update prompt, safe-area support, and dark/light modes.
- Chinese Apple Shortcuts setup guide and practical limitations.
- Automated tests for critical parsing, merging, persistence, date handling, scoring, and aggregation behavior.

### 3.2 Deliberately excluded

- Accounts, authentication, servers, social features, leaderboards, subscriptions, advertising, payments, and API keys.
- HealthKit access from the browser or claims of fully automatic browser import.
- Medical diagnosis, disease inference, treatment advice, or high-confidence conclusions from one day.
- Fabricated workout sets, repetitions, weights, heart-rate zones, sleep stages, or missing values.
- Advanced training-load models such as TRIMP or ACWR without the required reliable signals.
- Native App Store distribution.

## 4. Approaches Considered

### 4.1 Recommended: vertical reliability slice

Build the smallest complete path first: schema → validator → merge transaction → persistence → today analysis → mobile UI → PWA. Add the remaining destinations on top of the same tested data and analysis services.

This is the selected approach because it proves the user’s real workflow early and contains the highest risks: duplicated workouts, partial updates, timezone errors, missing metrics, and IndexedDB persistence.

### 4.2 Breadth-first page shell

Build all five destinations and visual states first, then connect real data. This makes the product look complete sooner, but delays evidence that import and analysis are trustworthy. It is not selected.

### 4.3 Full specification in one pass

Implement every chart, report, export, and analysis rule before testing the end-to-end loop. This increases integration risk and makes failures harder to isolate. It is not selected.

## 5. Architecture

FitInsight is a static client application. It uses React Context plus `useReducer` for application state, focused feature hooks for async behavior, and pure modules for analysis. No global state framework is needed.

```text
Apple Health / Apple Watch
  → FitInsight 同步 Shortcut
  → versioned JSON file
  → File API
  → parser and validator
  → normalizer and import plan
  → one IndexedDB transaction
  → repository query layer
  → pure analysis engine
  → React views and exports
```

The visual mock is a design reference, not an image embedded in the product:

`docs/design/fitinsight-action-prescription-reference.png`

The implementation remains a real responsive PWA rather than a device-frame prototype because Safari installation, file import, IndexedDB, and offline behavior are core product requirements.

## 6. Proposed Project Structure

```text
src/
  app/
    App.tsx
    AppProvider.tsx
    navigation.ts
  components/
    AppShell.tsx
    BottomNavigation.tsx
    EmptyState.tsx
    MetricValue.tsx
    UpdatePrompt.tsx
  features/
    analysis/
    dashboard/
    import/
    profile/
    reviews/
    trends/
    workouts/
  db/
    database.ts
    health-repository.ts
    import-transaction.ts
  hooks/
  mocks/
  styles/
  tests/
  types/
    health-data.ts
    analysis.ts
  utils/
docs/
  analysis-rules.md
  data-schema.md
  privacy.md
  shortcuts-setup-zh.md
  superpowers/
public/
  examples/
  icons/
  manifest.webmanifest
```

Each analysis file exposes pure functions and knows nothing about React or IndexedDB. Each view receives already-normalized domain objects.

## 7. Data Contract

### 7.1 Envelope

The supported envelope has `schemaVersion`, `generatedAt`, `timezone`, `source`, `dailyRecords`, `workouts`, and `bodyMeasurements`. Arrays are required but may be empty. An optional `coverage` object records the queried date range, included metrics, and whether the file is a patch.

`profile` in an imported health file is source metadata. It never silently overwrites the local private profile or goals.

### 7.2 Null, empty, and omitted values

- `null` or an omitted optional field means unavailable and does not erase an existing valid value during a health-data patch.
- `[]` means the Shortcut queried that collection and found no entries.
- Zero is a real value only where zero is physically meaningful.
- Dates use `YYYY-MM-DD`; timestamps use ISO 8601 with an explicit offset; `timezone` uses an IANA name.

### 7.3 Identifiers and upserts

- Daily records upsert by local calendar `date`.
- Body measurements use `measuredAt` when available; the compatibility fallback is local `date`, with the last valid entry winning for that date.
- Workouts prefer an external stable identifier. When none is available, the importer derives a deterministic key from normalized workout type, start timestamp, source, and device.
- Mutable measurements such as calories and distance are not part of the fallback key, so corrected Apple Health values update the existing workout.
- Incoming non-null fields replace older values; incoming null or omitted fields do not erase them.

### 7.4 Workout and heart-rate normalization

Workout types map from common Chinese and English Apple labels into controlled internal values while preserving `rawType`. Pool and open-water swimming remain distinguishable; strength variants can be grouped in the UI.

Heart-rate samples are `{ timestamp, bpm }[] | null`. Without timestamped samples, the app may show average and maximum heart rate but does not claim time spent in zones.

## 8. Import Pipeline

The importer is a staged, atomic workflow:

1. Check file type and size before reading.
2. Parse JSON and reject syntax failures with a friendly message.
3. Validate the envelope, schema major version, required arrays, dates, and identity fields.
4. Normalize units, workout types, numeric strings that are unambiguous, and optional values.
5. Skip invalid individual records while retaining valid siblings; collect warnings.
6. Build an import plan with new, updated, unchanged, skipped, and warning counts.
7. Present the summary before persistence when warnings are material.
8. Commit all stores in one IndexedDB transaction.
9. Update `lastImportedAt` only after the transaction succeeds.
10. Refresh repository queries and analysis immediately.

An unsupported schema version, malformed envelope, or transaction failure imports nothing. The UI never exposes a raw stack trace.

The home-screen synchronization action may open the configured Shortcuts URL scheme, but the documented dependable flow remains: run Shortcut → save to Files → return to FitInsight → select JSON.

## 9. Persistence and Privacy

IndexedDB stores health records, import history, private profile values, targets, and backups. localStorage stores only non-health UI preferences.

The repository contains synthetic sample data only. Exact personal body values supplied in the original brief are not copied into committed source, documentation, fixtures, screenshots, or the production bundle. First launch offers a short local profile form and an optional private settings import. This resolves the conflict between “use my values by default” and “do not place real health data in Git” in favor of privacy.

Backup files contain sensitive plaintext JSON. The UI states this before download or restore. Clearing browser data cannot remove copies already saved in Files or iCloud Drive. The privacy copy says “FitInsight does not upload your data”; it does not claim that iCloud Drive is purely local.

The service worker caches the application shell and static synthetic assets only. Imported JSON and IndexedDB records never enter Cache Storage.

## 10. Analysis Model

Every score-producing function returns a structured result:

```ts
type ScoreResult = {
  score: number | null
  coverage: number
  confidence: 'building' | 'low' | 'medium' | 'high'
  evidence: EvidenceItem[]
}
```

No aggregate score is shown when available evidence covers less than 60% of its applicable weight. The UI shows “数据不足” or “个人基线建立中” instead.

### 10.1 Personal baselines

Baselines exclude the current day and are calculated independently per metric. A metric needs at least seven valid observations before it supports a comparative conclusion.

- 14-day resting heart-rate median.
- 14-day HRV median.
- 14-day sleep-duration mean.
- 14-day sleep-midpoint regularity.
- 14-day step mean.
- 28-day workout count and duration.

### 10.2 Day classification and score

The day is classified as training, active recovery, rest, or insufficient data. Absence of a workout never automatically receives zero points.

Applicable components retain the requested nominal weights: activity 25, formal training 25, sleep 25, recovery 15, and weekly structure 10. On a planned rest day the formal-training component is not applicable and remaining weights are normalized. The UI labels this as a personal goal/readiness heuristic, not a health grade.

### 10.3 Sleep and recovery

Sleep uses duration, regularity, efficiency, awake time, and stage-data completeness. Missing stages remove the completeness component and redistribute its weight; they do not score zero. Sleep belongs to the local date on which the user wakes.

Recovery uses sleep, resting heart rate relative to baseline, HRV relative to baseline, and a transparent recent-workout-duration proxy. Missing HRV redistributes the remaining weight and reduces confidence. Full-rest advice requires at least two independent low-recovery signals.

### 10.4 Activity, workouts, and recommendations

Activity emphasizes progress toward the personal step goal, with standing as optional support. Workout minutes are scored separately to avoid double counting.

Swimming pace is `durationSeconds / (distanceMeters / 100)` and returns null for non-positive distance or duration. Pace using elapsed workout time is labeled as including rest. Heart-rate zones use the local maximum-heart-rate setting or the age formula, fixed inclusive/exclusive boundaries, and only timestamped samples.

The deterministic recommendation engine emits at most three items. Each has an identifier, priority, reason, evidence, and confidence. Priority order is recovery/sleep, weekly training structure, then remaining activity. Weak evidence produces gentle data-collection guidance, not a strong training prescription.

### 10.5 Weekly and monthly reviews

Aggregation uses the configured week start and local dates. Workout days are distinct dates, not workout counts. Missing observations are excluded from means rather than treated as zero.

An unfinished week or month compares only with the same elapsed portion of the previous period and is visibly marked “进行中”. Weight-loss pace requires at least six measurements spanning at least 14 days; weaker series show the raw trend without a pace judgment.

## 11. Experience Design

### 11.1 Visual system

The selected “行动处方” direction uses a sophisticated charcoal dark mode, off-white typography, restrained coral/green/indigo/blue semantic accents, 20px section radii, generous spacing, and minimal shadow. Light mode uses the same hierarchy on warm neutral surfaces. There are no gradients, activity rings, ornamental dashboards, or nested cards.

The home hierarchy is:

1. Date, greeting, last import, and sync action.
2. “今天怎么练” action panel with one primary recommendation and its reasons.
3. Score and confidence as supporting information.
4. Three or four quiet evidence summaries.
5. Fixed safe-area-aware bottom navigation.

All interactive targets are at least 44px. Status text never relies on color alone.

### 11.2 Destinations

- **今天:** action, explanation, score/coverage, activity, last-night sleep, today’s workout, and import entry.
- **训练:** recent workouts, category filters, honest detail, swimming pace, and strength-frequency analysis.
- **趋势:** 7/30/90-day selector and one metric per chart, with summary statistics and empty states.
- **回顾:** weekly/monthly selector, current-period status, comparisons, highlights, gaps, next action, and export.
- **我的:** local profile, goals, week start, maximum heart rate, import/backup/restore/clear, privacy, help, and development-only mock mode.

## 12. PWA and iPhone Behavior

- Manifest uses standalone display, theme colors, Apple touch icons, and portrait-friendly sizing.
- `viewport-fit=cover` and `env(safe-area-inset-*)` protect top and bottom content.
- The app shell, local icon assets, and synthetic example file work offline after the first successful load.
- A waiting service worker triggers an explicit “有新版本” prompt rather than silently replacing the running app.
- IndexedDB remains the data source offline.
- README explains Safari installation, import, backup, restore, offline limitations, and free static hosting.

## 13. Error and Empty States

Errors are grouped into user-actionable categories: unreadable file, invalid JSON, unsupported version, invalid records with partial import, storage unavailable, transaction failed, and backup mismatch.

Each destination has a useful empty state. No chart, trend arrow, score, or comparison is rendered from invented points. The import result states exact new, updated, unchanged, skipped, and warning counts.

## 14. Test Strategy

Core production logic is developed test-first. The first suite covers at least:

1. Valid partial JSON with null values.
2. Syntax and envelope rejection with no partial database writes.
3. Unsupported schema major version.
4. Invalid optional fields becoming warnings while valid sibling records survive.
5. Same-date deep merge and null-does-not-erase semantics.
6. Stable workout fallback key, idempotent reimport, and corrected-value update.
7. Cross-midnight sleep assigned to wake date without UTC drift.
8. Missing sleep stages redistribute weight.
9. Baselines require seven observations per metric and exclude today.
10. Missing HRV redistributes recovery weight and lowers confidence.
11. A rest day is not scored as a failed workout day.
12. Low overall coverage returns no numeric aggregate score.
13. Swimming pace and zero-distance behavior.
14. Heart-rate zone boundaries and missing samples.
15. Weekly aggregation by distinct local workout dates and configured week start.
16. Monthly partial-period comparison.
17. IndexedDB round trip, atomic import, backup restore, and clear-all.
18. Recommendation limit, priority, evidence, and weak-confidence wording.
19. Primary UI navigation, import success, empty state, and update prompt.

Build, lint, unit tests, UI tests, PWA assets, and a browser-based iPhone-size smoke test are required before completion. Visual QA compares the selected reference against the rendered Today view at the same viewport.

## 15. Success Criteria

The MVP is accepted when:

- A Shortcut-produced compatible JSON file can be imported repeatedly without duplicate workouts or accidental data loss.
- New data appears immediately and remains after the page is closed and reopened.
- Missing metrics and malformed individual records do not crash the app or fabricate analysis.
- Today, week, and month provide useful conservative conclusions for the locally configured profile.
- The five destinations, dark/light modes, safe areas, backup/restore, clear-all, print export, offline shell, and update prompt work.
- The app builds and the complete automated test suite passes from a clean dependency install.
- The Chinese Shortcut guide explains setup, permissions, daily automation, file handoff, supported fields, source duplication risk, and troubleshooting without claiming that Codex can install the Shortcut.

## 16. Known Platform Limits

- A browser cannot read HealthKit directly.
- A `shortcuts://` link can launch a Shortcut but cannot reliably return a generated file to the browser without user interaction.
- Shortcut action names and accessible fields vary by iOS version and language.
- Apple Health source-priority and overlap handling cannot always be reproduced perfectly in Shortcuts; the guide favors stable sources and warns about implausible totals.
- iOS may purge site storage under pressure or when site data is cleared, so user-managed backups remain essential.
- A file saved to iCloud Drive is stored in the user’s iCloud account even though FitInsight itself never uploads it.
