# NHL Predictor — Claude Code Guide

## Project Overview

React + TypeScript + Vite app for NHL game simulation and betting analysis. No backend — all logic runs in the browser. A small Node proxy (`proxy.cjs`) handles CORS for ESPN and NHL API calls.

## Commands

```bash
npm run dev        # start Vite dev server
node proxy.cjs     # start CORS proxy (required for ESPN/NHL API fetch)
npm test           # run Vitest unit tests
npm run build      # production build
```

## Key Source Files

| File | Purpose |
|------|---------|
| `src/nhl-predictor/engine.ts` | Core prediction engine: `predictGame`, `analyzeBetting` |
| `src/nhl-core/data.ts` | Hardcoded team baselines (5v5 per-60 rates) and ICE_CONDITIONS |
| `src/nhl-predictor/api.ts` | ESPN/NHL API fetching: schedule, live stats, odds, goalie roster |
| `src/nhl-predictor/export.ts` | `buildExportRow`, CSV generation |
| `src/nhl-predictor/evaluation.ts` | CSV import and backtesting/evaluation logic |
| `src/nhl-predictor/SchedulePanel.tsx` | Today's Lines table and daily workflow UI |
| `src/nhl-predictor/AnalysisPanel.tsx` | Sim Results cards, Best Bets table |
| `src/nhl-predictor/DashboardHeader.tsx` | Top header, ESPN fetch, NST data import |
| `src/nhl-core/components.tsx` | Shared UI: IceRink, TeamStatsCard |
| `src/index.css` | All CSS custom properties and button/chip classes |

## Architecture

- `useNhlPredictorController.ts` owns all state; panels are pure-display components receiving props/callbacks
- `predictGame()` runs synchronously — the "100,000 simulations" counter is cosmetic
- Live stats from ESPN replace the hardcoded `gf`/`ga`/`pdo`/`sv` baselines when fetched; ESPN has no Corsi data so `cf`/`ff`/`xgf` are **not** overwritten by the ESPN fetch — baseline values are preserved
- NST paste data overwrites `cf`/`ff`/`xgf`/`sv%`/`pp%`/`pk%` on top of whatever is currently loaded

## Model — Critical Details

See [NHL_MODEL_PREDICTION_ALGORITHMS.md](NHL_MODEL_PREDICTION_ALGORITHMS.md) for the full spec. Key things to know:

- **`gf`/`ga` in `data.ts` are 5v5 per-60 rates (~1.6–2.7), not goals-per-game.** The engine multiplies by `ESTIMATED_TOTAL_SCORING_CALIBRATION = 1.45` to scale them. Live ESPN stats are already goals-per-game, so they use `LIVE_TOTAL_SCORING_CALIBRATION = 1.0`.
- **ESPN live stats use `?seasontype=2`** to force regular-season data year-round. Without this, the endpoint switches to playoff-only stats once the postseason begins, producing wildly skewed per-game averages from 1–2 games.
- **ESPN gf/ga guard**: live gf/ga are only accepted if `gamesPlayed >= 10` and the per-game rate is within `[0.8, 5.0]`; otherwise the baseline value is used.
- **`clampPct`**: both engines clamp `cf`/`xgf` to `[30, 75]%` before computing the multiplier, preventing corrupt or out-of-range values (e.g. decimal-form `0.6` or raw count `600`) from blowing up projections.
- **NST paste normalization**: `normPct` in the paste parser detects decimal-form CF% (value `< 5`) and multiplies by 100 before storing.
- **PP formula**: `(ppPct - (100 - opponentPkPct)) * 0.01` — compares PP% against the opponent's *allowed* PP rate (`100 - pkPct`). A league-average PP (21%) vs a league-average PK-allowed rate (20%) gives near-zero adjustment, which is correct.
- **Win probability**: logistic transform → regress toward 50% with factor 0.6 → cap at [22%, 78%].
- **ML edge threshold**: 7% (`ML_EDGE_THRESHOLD = 0.07`) plus a minimum Kelly threshold.

## Display Conventions

- Game matchups shown as **AWAY at HOME** (e.g. `STL at UTA`) — home team is always on the right.
- Bet recommendation labels use **team abbreviations** not `HOME`/`AWAY` (e.g. `COL ML`, `COL -1.5`).
- The evaluation CSV parser handles both old format (`HOME ML`, `AWAY ML`) and new abbreviation format for backwards compatibility.

## CSS Design System

Theme: "Deep Ice" — dark navy background (`#060d1a`), cyan accent, Big Shoulders Display + JetBrains Mono fonts.

Key CSS variables:
- `--text` `#edf2f7` — primary text
- `--text-2` `#7e8fa3` — secondary labels, hints (use this, not `--text-3`, for visible UI text)
- `--text-3` `#3a4d62` — intentionally muted: "Pass/PASS", empty-state dashes only
- `--cyan` — light blue accent
- `--green` / `--amber` / `--red` / `--purple` — edge strength colors

Button classes: `btn-primary` (dark blue), `btn-cyan` (light blue), `btn-amber` (solid amber / black text), `btn-amber-ghost` (dim amber), `btn-ghost`, `btn-success` (green).

## Tests

Tests live in `src/**/*.test.{ts,tsx}`. Run with `npm test`. Currently **99 tests across 11 files**.

- `src/nhl-core/engine.test.ts` — legacy engine: predictions, betting analysis, ice conditions, PDO labels, `clampPct` with extreme inputs
- `src/nhl-predictor/engine.test.ts` — production engine: win prob caps, playoff suppression, B2B penalty, live calibration switch, `clampPct`, goalie overrides, PP symmetry, full `analyzeBetting` suite
- `evaluation.test.ts` — CSV fixture strings; parser handles both old (`HOME ML`) and new (`COL ML`) label formats
- `export.test.ts` — `buildExportRow` and `rowsToCSV`
- `AnalysisPanel.test.tsx` — edge-strength thresholds and O/U consistency
