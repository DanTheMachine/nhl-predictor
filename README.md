# NHL Predictor

An NHL simulation and betting-analysis app built with React, TypeScript, and Vite.

It supports:
- single-game simulation
- daily slate loading and run-all-sims workflow
- manual and bulk odds entry
- estimated goalie selection with B2B-aware backup switching
- CSV export for predictions and results
- in-app model evaluation / backtesting

## Main Docs

- [RUNNING_THE_MODEL.md](C:\projects\game_sims\nhl-predictor\RUNNING_THE_MODEL.md)
- [NHL_MODEL_PREDICTION_ALGORITHMS.md](C:\projects\game_sims\nhl-predictor\NHL_MODEL_PREDICTION_ALGORITHMS.md)
- [src/llm_context.md](C:\projects\game_sims\nhl-predictor\src\llm_context.md)

## Quick Start

Install dependencies:

```powershell
npm install
```

Start the proxy:

```powershell
node proxy.cjs
```

Start the app:

```powershell
npm run dev
```

Then open:

- [http://localhost:5173](http://localhost:5173)

## Useful Commands

```powershell
npm run dev
npm run build
npm run lint
npm test
npm run test:e2e
```

## Recent Product Behavior

- `LOAD GOALIES` now auto-applies estimated goalie overrides.
- Normal-rest teams use the top games-started goalie.
- B2B teams use the second-most-started goalie when available.
- The schedule table shows compact goalie tags like `BUF 9.10 - 2nd`.
- The goalie editor highlights only the active goalie in green, even when two goalies share the same save percentage.
- Best Bets strength grading is now market-specific:
  - ML: `MED` at `8.5%`, `STRONG` at `11%`
  - PL: `MED` at `6%`, `STRONG` at `8%`
  - O/U: `MED` at `4%`, `STRONG` at `8%`
