# FitInsight UI 2.0 Design Specification

**Status:** Approved visual direction, pending written-spec review

**Date:** 2026-08-15

**Selected direction:** Option 3 — Notion Calm Reflection

**Product principle:** Less Interface. More Insight.

## 1. Objective

FitInsight UI 2.0 is a presentation-layer redesign of the existing React, TypeScript, and PWA application. It does not add product capabilities. Its purpose is to make the current personal health analysis feel calm, native, trustworthy, and useful on iPhone.

The first screen answers three questions in order:

1. How am I today?
2. Why?
3. What evidence supports that conclusion?

Apple Health continues to record health data. Apple Fitness continues to provide activity presentation. FitInsight explains the user's current state using the data and analysis that already exist locally.

## 2. Scope

### In scope

- Rebuild the visual hierarchy of the five existing tabs: 今天, 训练, 趋势, 回顾, 我的.
- Introduce a coherent token-based visual system for color, type, spacing, radius, elevation, motion, and responsive behavior.
- Restructure Today into a card-light editorial reading flow based on the selected Option 3 concept.
- Replace the current dynamic first-four evidence slice with four fixed presentation categories: Activity, Sleep, Workout, and Recovery.
- Restyle existing loading, empty, error, import, update, modal, form, and destructive-confirmation states.
- Standardize visible icons on Lucide line icons while preserving the current fixed FitInsight logo assets exactly.
- Preserve and extend automated and visual regression coverage for the redesign.

### Out of scope

- New pages, routes, accounts, servers, sync backends, social functions, leaderboards, subscriptions, or AI APIs.
- New score formulas, health interpretations, baselines, comparisons, workout evaluations, or recommendation algorithms.
- Changes to IndexedDB schemas, import transaction behavior, backup formats, PWA caching policy, or Shortcut JSON contracts.
- Homepage charts, multi-series charts, historical feeds, or dashboard-style metric inventories.
- Any modification, redraw, recolor, or replacement of the latest two-rounded-bars logo or the shipped PWA icon assets.

## 3. Selected visual direction

The selected direction is an almost cardless editorial interface. It uses typography, alignment, whitespace, and hairline dividers as the primary hierarchy tools. Cards are reserved for true standalone objects or modal surfaces.

The UI should feel like an Apple-native personal health companion with Notion's reading rhythm:

- calm rather than energetic;
- human interpretation before raw metrics;
- large, readable type instead of decorative graphics;
- one dominant semantic accent per context;
- open sections instead of nested cards;
- a single-column mobile reading flow rather than a dashboard grid.

The generated Option 3 mockup is a hierarchy and proportion reference, not a source of truth for the logo, data values, or health conclusions. Runtime values and copy must always come from the existing application data and view models.

## 4. Information architecture

The five existing tab IDs, order, labels, and internal state-based navigation remain unchanged:

1. `today` — 今天
2. `workouts` — 训练
3. `trends` — 趋势
4. `reviews` — 回顾
5. `profile` — 我的

There is no URL router migration. Only one destination remains mounted at a time. The global Sync sheet and PWA update prompt remain single instances outside the destination content.

The bottom navigation remains fixed and safe-area aware. It uses exactly five real buttons inside `nav[aria-label="主导航"]`. The active destination retains `aria-current="page"` and is indicated by weight and one accent color, not a colored capsule or glow.

## 5. Design system

### 5.1 Color

Neutral roles establish the permanent interface. Semantic accents are contextual and must not be displayed together merely for decoration.

Light mode:

- canvas: `#FAF9F7` (Warm White)
- surface: `#FFFFFF`
- primary text: `#1C1C1E`
- secondary text: `#636366`
- divider: `#E5E5E7`

Dark mode:

- canvas: `#000000`
- surface: `#1C1C1E`
- primary text: `#F2F2F7`, never pure white
- secondary text: `#98989D`
- divider: `#38383A`

Semantic roles:

- Health Green: positive state, completion, success, and the Today score
- Muted Indigo: sleep-only context
- Soft Blue: recovery-only context
- Orange: warnings and incomplete attention states
- System red: destructive confirmations only; it is not part of daily health visualization

A normal screen uses neutral colors plus one dominant semantic accent. At most five visibly distinct colors appear in one screen state: canvas or surface, primary text, secondary text, divider, and one semantic accent. Today defaults to Health Green. Sleep and Recovery colors appear only where those metrics are the active subject. No red, green, and blue combination is used as a decorative palette.

### 5.2 Typography

Use only the native stack:

```css
-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "PingFang SC", sans-serif
```

Core mobile scale:

- greeting/meta: 17–20px, regular or medium
- page display title: 48–56px, semibold, tight tracking
- score: 80–88px, regular/medium, tabular numerals
- state label: 26–30px, medium
- personal insight: 18–20px with 1.55–1.65 line height
- section title: 24–28px, semibold
- metric label: 17–19px, medium
- body: 15–17px
- caption: 12–14px

Chinese insight copy must remain easy to scan. Long lines are capped at approximately 32 Chinese characters on wide screens and use a comfortable line height.

### 5.3 Spacing and sizing

All spacing resolves to the token set:

`4, 8, 12, 16, 20, 24, 32, 40, 48, 64`.

- iPhone horizontal page inset: 20px
- compact vertical section gap: 24px
- major editorial section gap: 40–48px
- minimum interactive target: 44×44px
- standard control radius: 14px
- true standalone surface radius: 20px
- bottom sheet radius: 24px on top corners

Arbitrary one-off margins are not introduced. Safe-area insets remain part of the shell and bottom navigation calculations.

### 5.4 Surfaces and elevation

- Base page sections do not receive cards merely for separation.
- Lists use open backgrounds and hairline row dividers.
- One grouped surface may be used when rows are conceptually one object.
- Shadows are reserved for bottom sheets, dialogs, and temporary update prompts.
- Glassmorphism, glow, gradients, heavy borders, nested cards, and decorative blurs are prohibited.

### 5.5 Icons and logo

- Visible functional icons use `lucide-react` with consistent optical size and line weight.
- Icons remain monochrome; semantic color is applied only when it communicates state.
- Icons are removed when a text label is sufficient.
- The latest FitInsight logo and all files under `public/icons/` remain byte-for-byte unchanged.
- The generated mockup's logo rendering is illustrative only. Implementation uses an existing approved, UI-ready source asset without recreating it in CSS or SVG. If the repository does not contain an appropriate inline asset, the header shows the `FitInsight` text wordmark and omits the mark instead of fabricating one or repurposing a backed app icon.

### 5.6 Motion

Allowed motion:

- fade;
- 4–8px slide;
- press scale to approximately `0.98`;
- Today score count-up.

Timing tokens:

- fast interaction: 150–180ms
- page/section transition: 200–220ms
- maximum: 250ms

Score count-up runs only for a real numeric score, ends at the existing analysis result, and does not change the accessible final text. Tab content may fade/slide on mount without delaying interaction. `prefers-reduced-motion: reduce` disables count-up and removes non-essential movement.

## 6. Application shell

The shell remains a centered single-column reading surface. It does not become a desktop dashboard.

- iPhone is the reference layout.
- iPad increases whitespace and line length within a restrained single column.
- Desktop centers the same product experience rather than introducing sidebars or multi-column panels.
- The bottom navigation remains visually light, uses a subtle solid or translucent native surface, and preserves safe-area clearance.
- Demo-data and PWA update notices remain perceptible but become quieter, compact system notices.

## 7. Today

### 7.1 Reading order

The ready state uses this order:

1. compact brand/sync row using the `FitInsight` wordmark, the approved logo mark only when a UI-ready source asset exists, and a restrained sync control;
2. `Good Morning, Lu` or the existing profile-derived name;
3. current local date and last successful import time;
4. display heading `Today`;
5. small structural label `Today's Score`;
6. existing numeric score, or an honest non-numeric establishing state;
7. Chinese state label;
8. concise Chinese personal insight;
9. at most one contextual action derived from the existing prescription action;
10. fixed Activity, Sleep, Workout, and Recovery evidence rows;
11. existing detailed data, restyled as open sections below the first-screen conclusion.

No chart, historical feed, recent-workout inventory, or multi-card dashboard appears on Today.

### 7.2 Natural-language insight

The insight reuses existing analysis and recommendation output. The presentation may combine the existing status, prescription title, reason, and action wording into a readable two-to-three-sentence block, but it must not infer a new conclusion.

- No UI component recalculates health scores.
- No comparison is claimed unless the current analysis already produced it.
- Confidence and the non-medical disclaimer remain available, but move to a quiet supporting note below the primary conclusion so they do not interrupt the first read.

### 7.3 Fixed core metrics

Create a presentation adapter that maps existing `MetricDisplay` IDs into exactly four stable categories:

- Activity: prefer Steps; if Steps are absent, use Active Energy; if that is absent, use Exercise Minutes.
- Sleep: use the existing Sleep metric.
- Workout: use the existing Workout metric only.
- Recovery: use the existing Recovery metric only.

The adapter changes presentation selection only. It does not change any formula, stored value, confidence, status, or target.

Each category is always present as a row:

- available value: show the existing formatted value and status text;
- unavailable value: show an em dash and `数据不足`;
- null is never converted to zero;
- additional activity, sleep, workout, and recovery facts remain available in the detailed section.

### 7.4 Loading, empty, partial, and error states

- Loading uses a quiet text label and open skeleton lines; it does not display a fake score.
- Empty leads with a privacy reassurance and one primary Sync action.
- Partial data renders the honest score/state supplied by the current analysis and marks missing core rows as `数据不足`.
- Error states keep the current message and retry/sync path.
- All state variants preserve heading order, focus behavior, and reachable actions.

## 8. Workouts

The Workouts tab follows an Apple Fitness-style grouped list without becoming a table.

- Header: `Workouts` with a Chinese supporting line and compact Sync action.
- Existing category filters remain horizontally scrollable and use neutral segmented controls.
- Workouts remain grouped by authoritative `localDate`.
- Each workout is a full-width row or standalone item with type, date/time, duration, calories when present, and the existing summary/evaluation when present.
- Missing duration, calories, heart-rate samples, swim fields, or strength fields are omitted or labeled honestly; they are never fabricated.
- The existing detail dialog becomes a native bottom sheet on iPhone and centered dialog on larger screens.
- Focus trap, Escape close, trigger-focus restoration, and accessible dialog naming remain unchanged.

No new workout-comparison algorithm is introduced to manufacture sentences such as “best of the last four” unless that conclusion already exists in the view model.

## 9. Trends

Trends is the only destination centered on charts.

- One selected metric per chart.
- Existing 7, 30, and 90 day ranges remain.
- Existing approved metric list and missing-date gaps remain.
- The page leads with the selected metric's current context and summary, followed by one chart.
- Average, minimum, maximum, previous-period change, and coverage become restrained rows instead of dashboard tiles.
- Chart color follows the selected metric's semantic role; unrelated accents stay neutral.
- Accessible text equivalents remain available for every plotted point and gap.

Multiple metrics are never overlaid on one chart.

## 10. Reviews

The existing Chinese tab label `回顾` remains. Visible structural titles use `Weekly Review` and `Monthly Review` with Chinese explanatory copy.

- Narrative conclusion and period status come before the numbers.
- Current-period versus prior-period metrics become readable comparison rows, not an Excel-like tile grid.
- Highlights, attention items, and next action use open editorial sections with restrained dividers.
- Existing export actions remain secondary controls at the end.
- In-progress period comparison, missing-value handling, and export serialization remain unchanged.

## 11. Profile

The `我的` destination keeps every existing form and local-data control but removes the backend-settings appearance.

- Header: `My FitInsight` with Chinese privacy reassurance.
- Profile, Goals, Appearance, Local Data, Privacy, and development-only content become clear editorial sections.
- Forms remain single-column and explicitly submitted; no autosave is introduced.
- Inputs use native-sized controls, quiet fills, and hairline boundaries.
- Backup, restore, and clear-data confirmations retain all current warnings and atomic behavior.
- Destructive red appears only inside explicit destructive actions and confirmations.

No new route, accordion, account concept, or server preference is added.

## 12. Sync and system surfaces

The Sync sheet keeps its current two-step workflow:

1. open the FitInsight Shortcut;
2. choose a JSON file, inspect it, preview changes, and confirm import.

The redesign may change spacing, type, button style, and surface treatment only. It must preserve:

- the real `shortcuts://` link;
- file type acceptance;
- preview-before-write behavior;
- stale inspection protection;
- transaction and revision validation;
- success `role="status"` and error `role="alert"`;
- focus trap, initial focus, Escape close, and focus restoration.

PWA update and offline-ready prompts remain explicit and never force a refresh.

## 13. Data and component boundaries

The runtime flow stays:

`Shortcut JSON → parser/normalizer → import inspection → confirmed IndexedDB transaction → repository → existing analysis/view models → UI 2.0 presentation`.

Permitted structural changes:

- add presentation-only design tokens;
- add small reusable typography, button, section, metric-row, and motion primitives where they reduce duplication;
- add the fixed Today core-metric adapter at the dashboard view-model/presentation boundary;
- replace Phosphor icon imports with Lucide after all visible icon consumers are accounted for;
- reorganize JSX to match the approved information hierarchy.

Prohibited changes:

- moving score formulas into components;
- changing database names, versions, stores, keys, transactions, merge semantics, or backup formats;
- changing import size limits, error codes, JSON coverage semantics, or Shortcut URLs;
- changing tab IDs, preference keys, or the single-destination mounting model;
- caching imported health data in the Service Worker.

## 14. Accessibility

- Use semantic headings in reading order, with one destination-level `h1`.
- Preserve `main#main-content`, landmark names, dialog semantics, status/alert live regions, and `aria-current`.
- All interactive targets are at least 44×44px.
- Focus indicators meet contrast requirements and remain visible in light and dark modes.
- Color is never the only indicator of state.
- Count-up and transitions do not repeatedly announce intermediate values.
- At 200% text zoom, content reflows without horizontal scrolling or clipped actions.
- Screenshot review can identify visual risks, but keyboard, screen-reader, contrast, and reduced-motion behavior require implementation-level verification.

## 15. Responsive behavior

Reference viewports:

- primary: 390×844
- wide iPhone: 430×932
- iPad portrait: 834×1194
- desktop verification: 1280×900

Rules:

- 320px remains the minimum supported width.
- Mobile stays one column.
- iPad and desktop increase whitespace and maximum readable width; they do not turn Today, Reviews, or Profile into dashboards.
- Modals move from bottom sheets to centered dialogs only when sufficient space exists.
- Fixed navigation never covers the final content row.
- Safe-area padding remains valid in standalone PWA mode.

## 16. Testing strategy

### Existing behavior gate

All existing automated tests must continue to pass. The redesign keeps protection for:

- import inspection and atomic commit;
- IndexedDB revision and merge behavior;
- score, baseline, confidence, missing-value, and date-only semantics;
- workouts grouping and detail accessibility;
- one-metric trends and gap handling;
- review period comparison and missing values;
- explicit profile/goal saves, backup, restore, and clear-data flows;
- PWA install, offline shell, and explicit update behavior.

### New presentation tests

Add targeted semantic tests for:

- mixed-language Today structure and reading order;
- exactly four stable core metric categories in the required order;
- Activity fallback priority;
- `数据不足` for missing core metrics and no null-to-zero conversion;
- no chart in Today;
- exactly one main navigation and five tab buttons;
- one selected trend metric per chart;
- Weekly Review and Monthly Review naming;
- reduced-motion count-up behavior;
- loading, empty, partial, error, and ready states.

Tests should assert roles, accessible names, visible states, focus, and data outcomes. They should not lock the redesign to CSS class names or broad snapshots.

### Visual and build gate

Before completion, run:

- formatting check;
- ESLint with zero warnings;
- TypeScript typecheck;
- complete Vitest suite;
- production build;
- PWA output verification;
- `git diff --check`;
- light/dark visual review at all reference viewports;
- safe-area, no-overflow, 44px target, focus, reduced-motion, and bottom-navigation clearance checks.

## 17. Acceptance criteria

UI 2.0 is accepted when:

1. the first iPhone viewport reads as a calm personal conclusion, not a dashboard;
2. Today visibly follows conclusion → explanation → evidence → details;
3. Today contains no chart or history feed;
4. Activity, Sleep, Workout, and Recovery are stable, honest rows;
5. the five existing destinations and all current user workflows remain usable;
6. the latest logo and PWA icons are unchanged;
7. light and dark modes feel deliberately designed rather than inverted;
8. all interactive motion is restrained and reduced-motion safe;
9. no new product capability or health algorithm has been introduced;
10. automated, build, PWA, accessibility, and responsive verification gates pass.

## 18. Implementation sequence

The later implementation plan should preserve this order:

1. characterization tests and fixed Today metric mapping;
2. global tokens, typography, shell, navigation, icon system, and motion primitives;
3. Today hierarchy and all Today states;
4. Sync and system surfaces;
5. Workouts;
6. Trends;
7. Reviews;
8. Profile and destructive dialogs;
9. dark mode, responsive refinement, accessibility checks, and full regression verification.

Each stage must leave import, IndexedDB, analysis, and PWA behavior intact.
