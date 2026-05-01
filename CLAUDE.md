# NHL Predictor — Claude Code Guide

## Project Overview

React + TypeScript + Vite app for NHL game simulation and betting analysis. The browser UI handles the interactive daily workflow. A separate Node.js server layer (`server/`) provides a CLI pipeline, REST API, PostgreSQL persistence via Prisma, and Playwright-based odds capture. A small Node proxy (`proxy.cjs`) handles CORS for ESPN and NHL API calls in the browser.

## Commands

```bash
# Browser UI
npm run dev        # start Vite dev server
node proxy.cjs     # start CORS proxy (required for ESPN/NHL API fetch)
npm run build      # production build

# Server-side pipeline (requires .env with DATABASE_URL)
npx tsx cli.ts nhl:run-daily-pipeline     # predict today + ingest yesterday
npx tsx cli.ts nhl:capture-odds-overrides # scrape sportsbook odds via Playwright
npx tsx api.ts                            # start Express REST API on NHL_API_PORT

# Tests & database
npm test                  # run Vitest unit tests (112 tests across 12 files)
npm run prisma:push        # apply schema to shared PostgreSQL DB
npm run prisma:generate    # regenerate Prisma client after schema changes
```

## Key Source Files

| File | Purpose |
|------|---------|
| `src/nhl-predictor/engine.ts` | Core prediction engine: `predictGame`, `analyzeBetting` |
| `src/nhl-core/data.ts` | Hardcoded team baselines (5v5 per-60 rates) and ICE_CONDITIONS |
| `src/nhl-predictor/api.ts` | ESPN/NHL API fetching: schedule, live stats, odds, goalie roster |
| `src/nhl-predictor/export.ts` | `buildExportRow`, CSV generation |
| `src/nhl-predictor/bulkOddsParser.ts` | Server-side sportsbook text parser: `parseBulkOdds` |
| `src/nhl-predictor/evaluation.ts` | CSV import and backtesting/evaluation logic |
| `src/nhl-predictor/SchedulePanel.tsx` | Today's Lines table and daily workflow UI |
| `src/nhl-predictor/AnalysisPanel.tsx` | Sim Results cards, Best Bets table |
| `src/nhl-predictor/DashboardHeader.tsx` | Top header, ESPN fetch, NST data import |
| `src/nhl-core/components.tsx` | Shared UI: IceRink, TeamStatsCard |
| `src/index.css` | All CSS custom properties and button/chip classes |
| `server/config.ts` | All env-var config: DB, ports, odds capture settings |
| `server/db/repositories.ts` | All Prisma queries for the NHL pipeline |
| `server/services/nhl/nhlAutomation.ts` | Pipeline orchestration: slate → predict → persist → export |
| `server/services/nhl/oddsCapture.ts` | Playwright browser scraper for sportsbook odds |
| `server/services/nhl/oddsOverrides.ts` | Staged-override workflow: import → list → approve/reject |
| `prisma/schema.prisma` | Full shared DB schema (MLB + NBA + NHL tables) |

## Architecture

### Browser UI
- `useNhlPredictorController.ts` owns all state; panels are pure-display components receiving props/callbacks
- `predictGame()` runs synchronously — the "100,000 simulations" counter is cosmetic
- Live stats from ESPN replace the hardcoded `gf`/`ga`/`pdo`/`sv` baselines when fetched; ESPN has no Corsi data so `cf`/`ff`/`xgf` are **not** overwritten by the ESPN fetch — baseline values are preserved
- NST paste data overwrites `cf`/`ff`/`xgf`/`sv%`/`pp%`/`pk%` on top of whatever is currently loaded

### Server-Side Pipeline
- `server/config.ts` reads all env vars; `assertDateInput` validates date strings
- `nhlAutomation.ts` imports `predictGame`/`analyzeBetting` directly from `src/nhl-predictor/engine.ts` — the same model runs in both browser and Node
- The Prisma schema at `prisma/schema.prisma` is a **superset** — it declares all MLB, NBA, and NHL tables to avoid `prisma db push` dropping other sports' tables when run from this project
- Odds overrides use a shared `OddsOverride` table filtered by `sport = 'NHL'`; the Prisma model name `MlbOddsOverride` is a historical artifact from the first implementation — it maps to the shared table via `@@map("OddsOverride")`
- Lookup key format: `YYYYMMDD + homeAbbr + awayAbbr` (e.g. `20260430ANAEDM`)

### Odds Capture Flow
1. `nhl:capture-odds-overrides` — Playwright logs into sportsbook, navigates to NHL page, extracts text, parses with `parseBulkOdds`, saves rows with `status: 'staged'`
2. `nhl:list-odds-overrides` — inspect staged rows before promoting
3. `nhl:approve-odds-overrides` — flip status to `'approved'`; predictions will use these odds
4. `nhl:reject-odds-overrides` — discard bad or stale captures

Debug artifacts (HTML snapshot, screenshot, error log) are written to `{NHL_EXPORT_DIR}/odds-capture-debug/` on capture failure. Successful captures write `-raw.txt`, `-parsed.json`, and `-meta.txt` to the same directory.

### `parseBulkOdds` — Two Parse Modes
- **Line-block mode** (preferred): triggered when any line is an exact team name match in `BULK_NAME_MAP`. Expects each team on its own line, 3-digit rotation number optionally below (skipped), then spread/odds/total/ML lines. Period-specific entries like `1P EDMONTON` are ignored because they don't match as bare team names.
- **Inline mode** (fallback): regex-scans a continuous string for team name tokens. Used when the sportsbook renders text as a single block.
- **2-digit rotation caveat**: betlotus uses 2-digit rotation numbers (e.g. `45`, `46`). The rotation-skip logic only fires for 3–4 digit numbers, so the 2-digit number occupies the puck-line slot and most odds fall back to defaults. Team matching is still correct.

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

Tests live in `src/**/*.test.{ts,tsx}`. Run with `npm test`. Currently **112 tests across 12 files**.

- `src/nhl-core/engine.test.ts` — legacy engine: predictions, betting analysis, ice conditions, PDO labels, `clampPct` with extreme inputs
- `src/nhl-predictor/engine.test.ts` — production engine: win prob caps, playoff suppression, B2B penalty, live calibration switch, `clampPct`, goalie overrides, PP symmetry, full `analyzeBetting` suite
- `evaluation.test.ts` — CSV fixture strings; parser handles both old (`HOME ML`) and new (`COL ML`) label formats
- `export.test.ts` — `buildExportRow` and `rowsToCSV`
- `AnalysisPanel.test.tsx` — edge-strength thresholds and O/U consistency
- `bulkOddsParser.test.ts` — `parseBulkOdds`: line-block mode (3-digit rotation), inline mode, team name aliases, betlotus 2-digit rotation, period-line filtering, defaults
