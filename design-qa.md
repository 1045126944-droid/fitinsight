# FitInsight final browser and design QA

## Gate status

Controller-owned QA completed in the Codex in-app Browser against the production build on port 4173. The complete import, persistence, page, profile, accessibility, offline, explicit-update, viewport, console, and Option 2 comparison matrix passed. No P0/P1/P2 mismatch was found, so no CSS or product-code repair was required.

## Automated and sample evidence

- Baseline: branch `feat/fitinsight-mvp`, starting commit `69e0af3`.
- Automated gate: format, ESLint with zero warnings, TypeScript, 46 Vitest files / 189 tests, production build, `scripts/verify-pwa.mjs`, console scan, and `git diff --check` exited 0.
- The production-parser test validates 15 consecutive synthetic Asia/Shanghai days with zero warnings, swimming and strength workouts, timestamped heart-rate samples, six body measurements over 14 days, and patch coverage.
- Browser `dev.logs()` was empty at the end of QA.

## Import, persistence, and page behavior

- Verified the empty Today state before import.
- Selecting `public/examples/sample-health-data.json`, the public synthetic fixture, showed `新增 29 / 更新 0 / 跳过 0`. Inspection caused no write; confirming import refreshed Today immediately, and a reload preserved the IndexedDB data.
- Verified workout classification, pool-swimming detail, and honest missing heart-rate-zone behavior when no private profile exists.
- Verified Trend 7/30-day switching, gaps for missing dates rather than invented zeros, and six body-weight points.
- Weekly and monthly reviews both displayed “进行中” and compared equal elapsed days.
- JSON and CSV export buttons were clicked successfully with no console error. The Browser surface does not expose Blob download events: the JSON `waitForEvent` timed out, so no download event is claimed as captured. The 189-test suite's serialization/download unit tests provide supplementary evidence.
- Verified local profile save, dark-theme persistence after reload, the sensitive-plaintext backup warning, valid empty-backup restore counts and replacement confirmation, and both confirmation and cancellation paths for clearing all local data.

## Synthetic QA-state provenance

All rendered health values cited below are browser-only synthetic QA state imported from `public/examples/sample-health-data.json`; they are not user data or private health data. The profile name “小林” was entered separately as a fictional synthetic profile used only for browser QA. In particular, score `97` and the “泳池游泳 · 46 分钟” record are synthetic rendered test values derived from that fixture/QA state, not a real person's results.

## Responsive viewport and safe-area evidence

### 390×844 mobile

- Browser reported `innerWidth/innerHeight = 390/844`; no horizontal overflow.
- The synthetic-QA profile greeting “小林” h1 was one line at 38.398px high with 38.4px line-height; the sync control was also one line. The older screenshot represented an older/narrower state, not a CSS defect.
- All seven Today interactive targets were at least 44px.
- Main bottom padding was 92px and fixed navigation height was 68px. After scrolling to the bottom, the final body content remained 23.86px above the navigation top.
- Capture: `outputs/fitinsight-today-390x844.png`.

### 430×932 mobile

- The greeting remained one line and there was no horizontal overflow.
- Capture: `outputs/fitinsight-today-430x932.png`.

### 1280×900 desktop

- Main and navigation were both centered at 720px wide (`x = 280`), with 684px internal content and no horizontal overflow.
- Capture: `outputs/fitinsight-today-1280x900.png`.

## Offline and explicit-update evidence

- After confirming port 4173 had no listener, an offline reload completed (`readyState = complete`). The synthetic-QA greeting, score `97`, fictional profile “小林”, and synthetic “泳池游泳 · 46 分钟” record all remained available, proving the cached shell and IndexedDB persistence together. Capture: `outputs/fitinsight-offline-390x844.png`.
- A waiting worker was manufactured with a revision present only in temporary `dist/`. The “有新版本 / 立即更新” prompt appeared; after two seconds it remained visible and data was unchanged, proving no automatic refresh. Pressing `立即更新` removed the prompt while the page and IndexedDB data remained intact.
- The formal Service Worker was then restored by rebuilding and applying it through the same explicit waiting-worker flow. No QA marker remains in source or the working tree.
- Update capture: `outputs/fitinsight-update-prompt-390x844.png`.

## Accessibility and motion evidence

- Keyboard focus on the bottom Today control showed a visible 3px solid `rgb(121, 219, 130)` ring with 2px offset. Capture: `outputs/fitinsight-focus-ring-390x844.png`.
- Every visible control had an accessible name; mobile targets and safe-area clearance met the measurements above.
- Reduced-motion review found no CSS animation, transition, or `scroll-behavior`; Recharts `TrendChart` explicitly uses `isAnimationActive={false}`. There is therefore no active motion requiring an additional reduced-motion override.

## Option 2 visual comparison

The 853×1844 Option 2 reference and the new 390×844 dark implementation were opened at original size in the same QA context. The implementation preserves the intended conclusion → reason → primary action → secondary score/metrics hierarchy, 18px page margins, 20px radii, charcoal flat surfaces, coral title, blue CTA, restrained four-item evidence, and fixed five-column navigation.

No P0/P1/P2 visual or functional finding remained, and no CSS correction or recapture loop was necessary.

## Non-blocking finding

- **[P3, carried from Task 12]** The strict pure-color icon constraint remains the previously adjudicated gradient/halo polish finding after five ImageGen rounds. It is non-content-bearing, does not affect the Today reference match, and does not block the already-passing PWA functional gate.

final result: passed
