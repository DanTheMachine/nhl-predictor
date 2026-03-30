# Running The NHL Predictor

This guide explains how to run the NHL predictor locally, from starting the servers to using the main workflow inside the app.

## 1. Project Location

Workspace:

- `C:\projects\game_sims\nhl-predictor`

Main app file:

- [nhl-predictor.tsx](C:\projects\game_sims\nhl-predictor\src\nhl-predictor.tsx)

Local proxy:

- [proxy.cjs](C:\projects\game_sims\nhl-predictor\proxy.cjs)

## 2. What You Need Running

The NHL predictor uses two local processes:

1. the Vite React app
2. the local proxy server

Why both are needed:

- the React app serves the browser UI
- the proxy forwards ESPN and NHL API requests through `http://localhost:3001`
- features like live stats, schedule loading, odds fetches, goalie loading, and results export depend on the proxy

## 3. First-Time Setup

Open a terminal in:

- `C:\projects\game_sims\nhl-predictor`

Install dependencies if needed:

```powershell
npm install
```

If `node_modules` already exists, you usually do not need to run this again.

## 4. Start The Proxy Server

Open Terminal 1 in:

- `C:\projects\game_sims\nhl-predictor`

Run:

```powershell
node proxy.cjs
```

Expected success message:

```text
NHL Predictor proxy running on http://localhost:3001
```

Keep this terminal running while you use the app.

## 5. Start The React App

Open Terminal 2 in:

- `C:\projects\game_sims\nhl-predictor`

Run:

```powershell
npm run dev
```

Vite will start a local dev server, usually at:

- `http://localhost:5173`

Keep this terminal running too.

## 6. Open The Browser App

Open your browser and go to:

- [http://localhost:5173](http://localhost:5173)

If Vite chooses a different port, use the URL shown in the terminal output.

## 7. Recommended Daily Workflow

This is the most common end-to-end pipeline for using the NHL model.

### 7.1 Load live team data

Click:

- `FETCH LIVE STATS`

What it does:

- loads ESPN team colors
- loads live team stat updates
- updates the current model inputs from API data when available

Typical success state:

- live stats loaded
- fetch status turns green

### 7.2 Load today's games

Click:

- `LOAD TODAY'S GAMES`

What it does:

- pulls today's NHL slate
- attempts to attach ESPN odds to each game
- checks which teams are on a back-to-back
- creates the lines table for the current day

Typical success message:

- `11 games loaded · 11 with ESPN lines · B2B: OTT, NYR, PHI`

### 7.3 Load goalie roster

Click:

- `LOAD GOALIES`

What it does:

- loads goalie save percentage and games played by team
- auto-applies an estimated goalie override for loaded schedule rows
- uses the top games-started goalie on normal rest
- uses the second-most-started goalie on B2B teams when available
- makes goalie override selection easier in the lines table

Typical success message:

- `Goalie roster loaded for 32 teams · estimated starters applied`

### 7.4 If sportsbook lines need manual updates

Use either:

- inline row editing in the lines table
- bulk paste import

For bulk paste:

1. open the bulk paste panel
2. paste sportsbook lines text
3. click `APPLY`

What it does:

- parses pasted team blocks
- matches them to loaded games
- updates Money Line, puck line, and total fields

### 7.5 Set optional goalie overrides

If you know the confirmed goalie or want to model a backup:

- choose or enter the home goalie override
- choose or enter the away goalie override

This changes the projected `goalieSV` used by the model for that row.

Current UI notes:

- compact schedule tags show goalie overrides like `BUF 9.10 - 2nd`
- in the row editor, auto-applied estimates are labeled as:
  - `Estimated Regular Starting Goalie`
  - `Estimated Backup Goalie`
- only the currently active goalie button is highlighted green

### 7.6 Run all simulations

Click:

- `RUN ALL SIMS`

What it does:

- runs `predictGame(...)` for every loaded matchup
- fills the table with:
  - projected goals
  - projected total
  - win probabilities
  - betting edges
  - puck line and total recommendations

### 7.7 Export predictions

Click:

- `EXPORT CSV`

What it does:

- builds a CSV from all current rows using `buildExportRow(...)`
- includes model outputs, market terms, edges, and lookup keys

Typical success message:

- `Exported nhl-predictions-MM-DD-YYYY.csv · X games`

### 7.8 Export next-day results

The next day, click:

- `RESULTS CSV`

What it does:

- fetches yesterday's final NHL scores
- exports a results CSV
- gives you a file you can paste into your tracking sheet

Typical success message:

- `Exported X results for YYYY-MM-DD · Paste into your Results tab in Google Sheets`

### 7.9 Evaluate model performance

After you have both the Predictions CSV and the Results CSV, scroll to:

- `MODEL EVALUATION`

What it does:

- lets you paste or upload both CSV files directly in the app
- matches games by `LookupKey`
- grades moneyline, puck line, and over/under bets
- shows ROI, units, and hit rate by market
- shows summaries by edge threshold
- shows simple calibration buckets for predicted win probabilities
- accepts more than just clean exported CSVs:
  - merged tracking sheets with prepended summary rows and appended actual-result columns
  - tab-delimited spreadsheet pastes
  - headerless tab-delimited results rows in the results panel when they are in the shape:
    - `date, home, away, home goals, away goals, winner, total, lookupKey`

Recommended workflow:

1. export `PREDICTIONS CSV`
2. export `RESULTS CSV` the next day
3. in the app, paste or upload both files into `MODEL EVALUATION`
4. click `EVALUATE CSVs`

What to look at:

- `ROI BY MARKET` for ML, O/U, and PL performance
- `EDGE THRESHOLDS` to see whether stronger edges are actually performing better
- `CALIBRATION` to compare predicted favorite win bands against actual outcomes
- matched and unmatched game counts to catch missing or stale CSV rows

Important note:

- O/U and puck-line ROI depend on the newer predictions export format that includes the added market odds columns
- if you evaluate older prediction exports, moneyline grading may still work, but O/U and puck-line ROI can be incomplete
- the estimated fallback dataset shown before live fetches now reflects 2026 values as of `3/30/26`

## 8. Single-Game Workflow

The app also supports one-off matchup analysis.

Typical flow:

1. choose home team
2. choose away team
3. set game type
4. set back-to-back flags if needed
5. fetch live stats if desired
6. fetch odds or enter them manually
7. run the simulation

This is useful for:

- testing one game quickly
- checking a goalie change
- comparing live stats versus baseline numbers

## 9. Full Workflow Pipeline Summary

Use this sequence for most days:

1. start `proxy.cjs`
2. start `npm run dev`
3. open `http://localhost:5173`
4. click `FETCH LIVE STATS`
5. click `LOAD TODAY'S GAMES`
6. click `LOAD GOALIES`
7. paste or edit lines if needed
8. set goalie overrides if needed
9. click `RUN ALL SIMS`
10. click `EXPORT CSV`
11. next day, click `RESULTS CSV`
12. paste or upload both files into `MODEL EVALUATION`
13. click `EVALUATE CSVs`

## 10. Common Problems

### Proxy not running

Symptoms:

- live fetches fail
- schedule fails
- odds fail
- goalie load fails

Fix:

```powershell
node proxy.cjs
```

### App not loading

Symptoms:

- browser page does not open
- `localhost:5173` does not respond

Fix:

```powershell
npm run dev
```

### Bulk paste parser does not match lines

Symptoms:

- bulk paste says it parsed too few teams
- lines table does not update

Fixes:

- load today's games first
- use the standard team-block paste format
- confirm the pasted teams match the same slate already loaded in the app

### Goalie data loaded but not used

Symptoms:

- goalie roster is present
- projections do not change

Fix:

- run `LOAD GOALIES` after loading the schedule so estimated overrides are applied automatically
- or set / edit a goalie override manually for any row if you want to force a specific goalie value

### B2B goalie switch looks wrong

Symptoms:

- a B2B team is loaded but the wrong goalie appears selected

Fixes:

- confirm the team is marked `B2B` in the schedule table
- reload today's games to refresh B2B detection
- load goalies again if you want estimated overrides reapplied from the latest roster
- manually click a goalie chip if you want to override the heuristic

## 11. Running Tests

The repo now has two test layers:

1. Vitest for unit and component tests
2. Playwright for end-to-end browser tests

### 11.1 Unit and component tests

Run:

```powershell
npm test
```

What this covers:

- prediction engine logic in `src/nhl/*.test.ts`
- React component tests in `src/nhl/*.test.tsx`

Current examples include:

- `predictGame(...)`
- `analyzeBetting(...)`
- export helpers
- reusable UI components like `TeamCard`, `StatBar`, and `IceRink`
- Best Bets threshold grading in `AnalysisPanel`
- goalie selection heuristics and B2B switching

### 11.2 E2E browser tests

Install Playwright's Chromium browser if needed:

```powershell
npm run test:e2e:install
```

Run the end-to-end suite:

```powershell
npm run test:e2e
```

Run E2E in headed mode:

```powershell
npm run test:e2e:headed
```

What the E2E suite currently covers:

- selecting teams and running a simulation
- switching to playoff mode
- entering manual odds
- exporting a single-game CSV

### 11.3 Notes for local test runs

- `npm test` uses Vitest with the `threads` pool because forked workers were unreliable on this Windows setup
- Playwright starts the Vite dev server automatically through `playwright.config.ts`
- the proxy is not required for the current local E2E tests because they focus on the app's manual and simulated workflows

## 12. Useful Commands

Start proxy:

```powershell
node proxy.cjs
```

Start app:

```powershell
npm run dev
```

Build production bundle:

```powershell
npm run build
```

Run lint:

```powershell
npm run lint
```

Run unit/component tests:

```powershell
npm test
```

Run Playwright E2E:

```powershell
npm run test:e2e
```

## 13. Key Files

- [nhl-predictor.tsx](C:\projects\game_sims\nhl-predictor\src\nhl-predictor.tsx)
- [proxy.cjs](C:\projects\game_sims\nhl-predictor\proxy.cjs)
- [package.json](C:\projects\game_sims\nhl-predictor\package.json)
- [vitest.config.ts](C:\projects\game_sims\nhl-predictor\vitest.config.ts)
- [playwright.config.ts](C:\projects\game_sims\nhl-predictor\playwright.config.ts)
- [NHL_MODEL_PREDICTION_ALGORITHMS.md](C:\projects\game_sims\nhl-predictor\NHL_MODEL_PREDICTION_ALGORITHMS.md)
