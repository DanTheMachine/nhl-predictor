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
- `src/nhl-predictor/EvaluationPanel.tsx`
- `src/nhl-predictor/evaluation.ts`
- `src/nhl-predictor/export.ts`
- `src/nhl-core/data.ts`
- `src/nhl-core/types.ts`
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
- Current passing local status at last handoff:
  - `npm run lint`
  - `npm test`
  - `npm run build`
  - `npm run test:e2e`
- Most recent passing counts:
  - Vitest: 27 tests
  - Playwright: 2 E2E tests

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

Docs updated:
- `RUNNING_THE_MODEL.md`
  - added testing section
  - added model evaluation instructions
  - updated workflow summary to include evaluation step
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

4. Accessibility / UX hardening
- better labels and semantics
- keyboard friendliness
- clearer loading/error states
- improve giant lines table behavior on smaller screens

5. Encoding cleanup
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
- Optional future naming cleanup:
  - rename `src/nhl-predictor.tsx` to something like `NHLPredictorApp.tsx` to reduce confusion with the folder name.
