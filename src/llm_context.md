Project: nhl-predictor

Purpose:
Build and validate an NHL prediction app that supports single-game analysis, daily slate simulation, CSV export, and model-performance evaluation.

Current stack:
- React 19
- TypeScript
- Vite
- Vitest
- Playwright
- GitHub Actions

Current architecture:
- `src/nhl-core`
  - shared domain layer
  - team data, types, shared stat components, core tests
- `src/nhl-predictor`
  - app feature layer
  - panels, controller hook, API fetch logic, export logic, evaluation logic
- `src/nhl-predictor.tsx`
  - app composition entry for the predictor UI
  - now also controls the top-level predictor vs evaluation tab view

Important files:
- `src/nhl-predictor.tsx`
- `src/nhl-predictor/useNhlPredictorController.ts`
- `src/nhl-predictor/AnalysisPanel.tsx`
- `src/nhl-predictor/SchedulePanel.tsx`
- `src/nhl-predictor/goalieSelection.ts`
- `src/nhl-predictor/EvaluationPanel.tsx`
- `src/nhl-predictor/evaluation.ts`
- `src/nhl-predictor/export.ts`
- `src/nhl-core/data.ts`
- `src/nhl-core/types.ts`
- `src/nhl-core/engine.ts`
- `.github/workflows/ci.yml`
- `playwright.config.ts`
- `RUNNING_THE_MODEL.md`

Major work completed:

1. Architecture cleanup
- Broke the old monolithic predictor UI into focused modules:
  - `DashboardHeader.tsx`
  - `ModelSetupPanel.tsx`
  - `SingleGamePanel.tsx`
  - `SingleGameResults.tsx`
  - `SchedulePanel.tsx`
  - `AnalysisPanel.tsx`
- Extracted logic into:
  - `api.ts`
  - `engine.ts`
  - `export.ts`
  - `useNhlPredictorController.ts`
- Renamed `src/nhl` to `src/nhl-core` to clarify the shared domain boundary.

2. Testing
- Added Vitest unit and component tests.
- Added Playwright E2E tests.
- Most recent focused passing status for the latest changes:
  - `npm run test -- --run src\nhl-predictor\AnalysisPanel.test.tsx src\nhl-predictor\goalieSelection.test.ts src\nhl-core\engine.test.ts`
- New focused tests added recently:
  - `src/nhl-predictor/AnalysisPanel.test.tsx`
  - `src/nhl-predictor/goalieSelection.test.ts`

3. Model evaluation / backtesting first pass
- Added in-app `MODEL EVALUATION` section via `EvaluationPanel.tsx`.
- Supports paste or file upload for Predictions CSV and Results CSV.
- Matches by `LookupKey`.
- Computes:
  - ROI by market
  - units by market
  - hit rate by market
  - edge-threshold summaries
  - calibration buckets
  - matched vs unmatched game counts
- Core logic lives in `src/nhl-predictor/evaluation.ts`.
- Tests for this logic live in `src/nhl-predictor/evaluation.test.ts`.

4. CSV export improvements
- Prediction export now includes additional market columns needed for evaluation:
  - `Vegas Puck Line`
  - `Home PL Odds`
  - `Away PL Odds`
  - `Over Odds`
  - `Under Odds`
- This enables real puck-line and O/U ROI grading in the evaluation panel.
- Decision made for historical records:
  - older prediction exports that never stored these fields will not be backfilled with guessed values
  - unrecoverable legacy fields should remain blank
  - evaluation logic should stay tolerant of partial legacy rows

5. CI / GitHub Actions
- Added `.github/workflows/ci.yml`
- Workflow runs on push to `main` and on pull requests.
- Steps:
  - `npm ci`
  - install Playwright Chromium
  - `npm run lint`
  - `npm test`
  - `npm run build`
  - `npm run test:e2e`
- GitHub Actions has already run successfully after push.

6. Goalie-selection workflow improvements
- Added automatic goalie-selection helpers in `src/nhl-predictor/goalieSelection.ts`.
- `LOAD GOALIES` now:
  - loads goalie save percentage and games started by team
  - auto-applies estimated goalie overrides to loaded schedule rows
  - uses the top games-started goalie on normal rest
  - uses the second-most-started goalie on B2B teams when available
- Reapplied estimated goalie overrides when:
  - the schedule is loaded after goalies are already loaded
  - B2B status is refreshed later
  - a B2B flag is toggled in the schedule table
- Fixed a real active-goalie UI bug:
  - if the top two goalies shared the same save percentage, both could appear active
  - the open row editor now uses estimated slot/index logic so only the intended goalie is highlighted
- Goalie UI now uses clearer labels:
  - compact schedule tags show values like `BUF 9.10 - 2nd`
  - editor labels say `Estimated Regular Starting Goalie` / `Estimated Backup Goalie`
  - only the active goalie chip is highlighted green

7. Best Bets / betting-threshold tuning
- Fixed a real O/U display bug in `AnalysisPanel.tsx`:
  - game cards showed O/U edge as percent correctly
  - Best Bets was scaling O/U edge by `* 10` instead of `* 100`
  - this caused examples like `8.0%` on the game card to appear as `0.8%` in Best Bets
- Added a regression test in `src/nhl-predictor/AnalysisPanel.test.tsx`.
- Tightened ML recommendation qualification in both engine copies:
  - `src/nhl-predictor/engine.ts`
  - `src/nhl-core/engine.ts`
  - ML edge threshold is now `7%`
  - ML quarter-Kelly threshold is now `4%`
- Added an engine regression test showing a modest `6%` ML edge no longer qualifies as a play.
- Best Bets strength grading is now market-specific in `AnalysisPanel.tsx`:
  - ML: `MED` at `8.5%`, `STRONG` at `11%`
  - PL: `MED` at `6%`, `STRONG` at `8%`
  - O/U: `MED` at `4%`, `STRONG` at `8%`
- This was tuned iteratively to reduce overclassification of ML bets as `STRONG` on large slates while keeping ML medium strength slightly looser than the first conservative pass.

Important fixes made recently:
- Playwright config was changed from `npm.cmd` to `npm run ...` for GitHub Linux runner compatibility.
- Fixed a real UI bug in `ModelSetupPanel.tsx`:
  - team select used `"Eastern"` / `"Western"`
  - team data actually uses `"East"` / `"West"`
  - this caused team dropdowns to render with no options in E2E runs
  - fixed by deriving conference groups directly from `TEAMS`
- Moved `SingleGamePanel` and `SingleGameResults` below the daily `SchedulePanel`
  - current predictor page order is:
    - header
    - model setup
    - today's lines / export workflow
    - single game tools
    - analysis
- Bulk pasted sportsbook lines were hardened:
  - extracted bulk paste parsing into tested helpers in `src/nhl-predictor/bulkPaste.ts`
  - added regression coverage for pasted multiline sportsbook formats and team matching
  - fixed a parsing bug where single-digit rotation numbers like `1`, `2`, `3` were treated as odds data instead of game numbers
  - made home/away puck-line direction derive from the loaded home team block
  - improved schedule-table rendering so puck-line odds display more clearly and edit inputs refresh after bulk updates

Docs updated:
- `README.md`
  - replaced the default Vite template with a project-specific overview and quick-start
- `RUNNING_THE_MODEL.md`
  - documents the goalie auto-selection workflow
  - documents current goalie UI labels
  - notes B2B goalie troubleshooting
  - mentions the new focused test areas
- `NHL_MODEL_PREDICTION_ALGORITHMS.md`
  - definitions now include practical score bands like average / good / elite for major inputs

Current state:
- Project is on GitHub
- GitHub Actions is set up and passing
- Evaluation workflow exists in-app
- Architecture is much cleaner than the original monolith
- Naming is clearer with `nhl-core`
- Single-game tools now sit below the today's-lines/export workflow
- Legacy CSV rows may have blank evaluation columns where the old export format lacked recoverable market odds
- Bulk odds paste now supports single-digit and multi-digit rotation numbers and surfaces unmatched loaded games more clearly
- Loaded goalie rosters now directly influence the daily slate workflow through estimated overrides
- B2B teams can automatically switch to the second-most-started goalie
- Best Bets strength labels are now less aggressive for ML than they were previously

Known follow-up priorities discussed:
1. Cleaner data boundary / typed adapters
- normalize raw ESPN / NHL / manual / pasted-book data into one stable internal model
- likely the best next major engineering step

2. Durable local storage
- save prior exports
- save manual line edits
- save goalie overrides
- save pasted books
- save historical run metadata

3. Error handling / resilience
- clearer retry and timeout handling
- clearer confidence/fallback states when APIs partially fail

4. Better starter-source integration
- current goalie auto-selection is heuristic only
- it is not a confirmed-starter feed
- future improvement would be a real projected/confirmed starter source instead of:
  - top games-started goalie on normal rest
  - second games-started goalie on B2B

5. Accessibility / UX hardening
- better labels and semantics
- keyboard friendliness
- clearer loading/error states
- improve giant lines table behavior on smaller screens

6. Encoding cleanup
- there are still some mojibake / text-encoding artifacts in UI strings and docs

Recommended next step:
- Introduce a normalized data layer between raw fetch/parsing code and model/app usage.
- Good target areas:
  - normalized team stats
  - normalized schedule game objects
  - normalized odds objects
  - normalized results objects

Notes for next session:
- The repo currently has both `src/nhl-core/*` and `src/nhl-predictor/*`.
- This is intentional and now reasonably clean:
  - `nhl-core` = shared domain code
  - `nhl-predictor` = app feature
- There are still duplicate engine implementations in:
  - `src/nhl-core/engine.ts`
  - `src/nhl-predictor/engine.ts`
  Threshold changes were intentionally mirrored in both.
- Optional future naming cleanup:
  - rename `src/nhl-predictor.tsx` to something like `NHLPredictorApp.tsx` to reduce confusion with the folder name.
