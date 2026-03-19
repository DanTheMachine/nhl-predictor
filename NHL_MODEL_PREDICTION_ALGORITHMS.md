# NHL Predictor Model Algorithms

This document explains how the current NHL model in [nhl-predictor.tsx](C:\projects\game_sims\nhl-predictor\src\nhl-predictor.tsx) produces:

- projected goals
- projected game total
- Money Line win probabilities
- puck line cover recommendations
- over/under recommendations
- betting recommendations versus sportsbook terms

## 1. Inputs

For each matchup, the engine starts with team-level ratings.

- `cf`: Corsi For percentage, a puck-possession proxy
- `ff`: Fenwick For percentage, a shot-attempt proxy that excludes blocked shots
- `xgf`: expected goals for percentage
- `pdo`: shooting plus save percentage on a 100-scale
- `goalieSV`: team or projected goalie save percentage
- `shootingPct`: team shooting percentage
- `ppPct`: power play conversion rate
- `pkPct`: penalty kill success rate
- `gf`: goals scored per game
- `ga`: goals allowed per game
- `srs`: simple rating style goal differential metric
- `ice`: arena scoring environment, such as `standard`, `altitude`, or `hybrid`

These come from:

- baseline hardcoded team estimates in [nhl-predictor.tsx](C:\projects\game_sims\nhl-predictor\src\nhl-predictor.tsx)
- optionally overwritten by fetched live team stats
- optionally adjusted by goalie overrides and pasted stat updates

The model also uses matchup context.

- `gameType`: regular season or playoff round
- `homeB2B`: whether the home team is on a back-to-back
- `awayB2B`: whether the away team is on a back-to-back
- `homeSVOverride`: manual home goalie save percentage override
- `awaySVOverride`: manual away goalie save percentage override
- `odds`: sportsbook terms such as Money Line, puck line, and total

## 2. Goal And Total Projection

The core projection engine lives in `predictGame(...)`.

### 2.1 Context adjustments

- Playoff games reduce expected scoring with `playoffFactor = 0.94`.
- Regular season games use `playoffFactor = 1.0`.
- Home ice advantage is modeled as `hfa = 0.045` in the win-probability stage.
- Each back-to-back applies a scoring penalty:
  - `homeB2B -> -0.018`
  - `awayB2B -> -0.018`

### 2.2 Arena adjustment

Each home arena has an `ice` type that affects scoring.

- `standard`: `scoringAdj = 1.00`, `ppAdj = 1.00`
- `altitude`: `scoringAdj = 1.04`, `ppAdj = 1.02`
- `hybrid`: `scoringAdj = 1.01`, `ppAdj = 1.00`

This lets the model slightly raise or lower scoring based on rink environment.

### 2.3 Possession and chance differential

The model uses two core matchup differentials:

- `cfDiff = (home.cf - away.cf) / 100`
- `xgfDiff = (home.xgf - away.xgf) / 100`

These act as possession and chance-quality adjustments on top of baseline goals for and against.

### 2.4 Expected goals per team

Home expected goals:

- `((home.gf + away.ga) / 2) * (1 + xgfDiff * 1.2 + cfDiff * 0.4) * iceAdj * playoffFactor * (1 + hB2BPenalty) + (home.ppPct - away.pkPct) * 0.004 * ppAdj`

Away expected goals:

- `((away.gf + home.ga) / 2) * (1 - xgfDiff * 1.2 - cfDiff * 0.4) * iceAdj * playoffFactor * (1 + aB2BPenalty) + (away.ppPct - home.pkPct) * 0.004 * ppAdj`

Interpretation:

- `gf` and `ga` provide the baseline scoring expectation
- `xgfDiff` gets more weight than `cfDiff`
- special teams contribute an additive adjustment through `ppPct - opponent pkPct`
- playoffs and back-to-backs pull scoring down
- rink effects push scoring up or down

### 2.5 Goal floor and total

Each side has a minimum goal floor:

- `hGoals = max(0.8, hExpGoals)`
- `aGoals = max(0.8, aExpGoals)`

Then:

- `total = hGoals + aGoals`

The model returns projected goals rounded to two decimals.

## 3. Win Probability

After projected goals are created, the model converts them into a home win probability.

### 3.1 Goalie edge

Goalie difference is converted into a goal-margin adjustment:

- `goalieEdge = (home.goalieSV - away.goalieSV) * 18`

This means a stronger projected home goalie pushes the net margin upward.

### 3.2 Net goal differential

- `netGoalDiff = (hGoals - aGoals) + goalieEdge + hfa`

This is the main matchup-strength number used for win probability.

### 3.3 Logistic win probability

The model uses a logistic transform:

- `homeWinProb = 1 / (1 + exp(-netGoalDiff * 1.62))`

Then it bounds the result:

- minimum `18%`
- maximum `82%`

Away win probability is:

- `awayWinProb = 1 - homeWinProb`

## 4. Overtime Probability

The model estimates overtime chance directly from game closeness.

- `otProb = max(0.04, 0.24 - abs(netGoalDiff) * 0.07)`

This means:

- very close projected games have higher OT probability
- wider matchup edges reduce OT probability
- OT probability is floored at `4%`

## 5. PDO And Feature Flags

The prediction output also includes readable feature explanations.

### 5.1 PDO luck tags

- `hPDOLuck = (home.pdo - 100) / 100`
- `aPDOLuck = (away.pdo - 100) / 100`

These are displayed as indicators of whether a team is running hot or cold around a neutral PDO baseline of `100`.

### 5.2 Feature list

The model emits feature rows based on threshold checks, including:

- CF%
- xGF%
- goalie SV%
- power play
- penalty kill
- PDO
- home ice
- game type

These are explanatory outputs, not separate prediction engines.

## 6. Live Stat And Goalie Overrides

The model can replace baseline team stats before projecting.

### 6.1 Live stats

`fetchLiveTeamStats(...)` can overwrite defaults using API-fetched values for:

- `cf`
- `xgf`
- `pdo`
- `goalieSV`
- `shootingPct`
- `ppPct`
- `pkPct`
- `gf`
- `ga`
- `srs`

If live stats exist for a team:

- `liveStats[abbr]` is merged over the hardcoded baseline

### 6.2 Goalie override

If a manual goalie save percentage is entered:

- `homeSVOverride` replaces `home.goalieSV`
- `awaySVOverride` replaces `away.goalieSV`

This lets the model reflect starter versus backup goalie scenarios without changing the base team card.

## 7. Sportsbook Odds Parsing

The app supports:

- ESPN-fetched odds from scoreboard data
- manual single-game entry
- bulk pasted sportsbook text for the daily slate

The model ultimately normalizes these into:

- `homeMoneyline`
- `awayMoneyline`
- `puckLine`
- `puckLineHomeOdds`
- `puckLineAwayOdds`
- `overUnder`
- `overOdds`
- `underOdds`

## 8. Converting Sportsbook Terms Into Fair Probabilities

Before comparing model outputs to sportsbook prices, the model removes vig.

### 8.1 American odds to implied probability

Handled by `americanToImplied(...)`.

- negative odds: `-150 -> 150 / (150 + 100)`
- positive odds: `+130 -> 100 / (130 + 100)`

### 8.2 Vig removal

For two-way markets:

1. convert each side to implied probability
2. add both implied probabilities
3. divide each side by that total

This creates vig-adjusted fair market probabilities for:

- Money Line
- puck line price
- over/under price

## 9. Money Line Bet Recommendation

The Money Line comparison lives in `analyzeBetting(...)`.

### 9.1 Model edges

- `homeEdge = modelHomeProb - marketHomeProb`
- `awayEdge = modelAwayProb - marketAwayProb`

### 9.2 Recommendation rule

- bet `home` if `homeEdge > 2.0%`
- bet `away` if `awayEdge > 2.0%`
- otherwise `none`

Displayed value:

- `mlValuePct = max(homeEdge, awayEdge) * 100`

## 10. Puck Line Recommendation

The puck line model treats scoring margin as a simple normal-style distribution around projected goal difference.

### 10.1 Projected margin

- `projDiff = projectedHomeGoals - projectedAwayGoals`

### 10.2 Standard deviation

- `stdDev = 1.65`

### 10.3 Favorite cover probability

If `odds.puckLine <= 0`, the home team is laying `-1.5`.

The model computes:

- `favDiff = homeFav ? projDiff : -projDiff`
- `z = (1.5 - favDiff) / stdDev`
- `favCover = 1 - normCDF(z)`
- `dogCover = 1 - favCover`

Then it maps those back to home and away cover probabilities.

### 10.4 Puck line recommendation rule

After vig removal on puck line prices:

- bet `home` side if edge exceeds `3.0%`
- bet `away` side if edge exceeds `3.0%`
- otherwise `pass`

Displayed value:

- `puckLineEdge = max(plHomeEdge, plAwayEdge) * 100`

## 11. Total Bet Recommendation

The model compares:

- `projectedTotal`
- sportsbook `overUnder`

### 11.1 Point-gap edge

- `ouEdge = projectedTotal - overUnder`

### 11.2 Recommendation rule

- `over` if `ouEdge > 0.3`
- `under` if `ouEdge < -0.3`
- `pass` otherwise

This threshold is much tighter than the NCAAM model because the NHL total scale is lower.

## 12. Kelly Sizing

The model calculates fractional Kelly-style staking suggestions for Money Line only.

- `kellyHome`
- `kellyAway`

Formula:

- positive edges only
- scaled to approximately 25% Kelly

Specifically:

- `kellyHome = (homeEdge / (1 - marketHomeProb)) * 0.25`
- `kellyAway = (awayEdge / (1 - marketAwayProb)) * 0.25`

If an edge is negative, Kelly is `0`.

## 13. CSV Export Logic

`buildExportRow(...)` creates a daily export row for each loaded game.

It includes:

- projected goals
- projected total
- model Money Line
- sportsbook Money Line
- Money Line edge
- Kelly percentage
- puck line recommendation
- puck line edge
- over/under recommendation
- over/under edge
- team stat snapshot
- goalie override snapshot

If a simulation has not already been run for a row, `buildExportRow(...)` will generate one on demand using the same `predictGame(...)` engine.

## 14. Worked Example

This example uses rounded values to explain the NHL flow. It is illustrative, not a promise of a live output.

### 14.1 Example inputs

Home team:

- `gf = 3.20`
- `ga = 2.70`
- `cf = 52.0`
- `xgf = 53.0`
- `ppPct = 24.0`
- `pkPct = 81.0`
- `goalieSV = 0.915`
- `pdo = 101.0`
- `ice = standard`

Away team:

- `gf = 2.80`
- `ga = 3.00`
- `cf = 48.0`
- `xgf = 47.0`
- `ppPct = 20.0`
- `pkPct = 78.0`
- `goalieSV = 0.905`
- `pdo = 99.0`
- `ice = standard`

Game context:

- regular season
- no back-to-back penalties

Sportsbook terms:

- home Money Line `-150`
- away Money Line `+130`
- home puck line `-1.5`
- puck line odds `+160 / -180`
- total `6.0`
- over `-110`
- under `-110`

### 14.2 Step 1: Compute possession and chance differentials

`cfDiff`

- `home_cf = 52.0`
- `away_cf = 48.0`
- `cfDiff = (home_cf - away_cf) / 100`
- `(52.0 - 48.0) / 100`
- `0.04`

`xgfDiff`

- `home_xgf = 53.0`
- `away_xgf = 47.0`
- `xgfDiff = (home_xgf - away_xgf) / 100`
- `(53.0 - 47.0) / 100`
- `0.06`

### 14.3 Step 2: Estimate home goals

Baseline scoring midpoint:

- `home_gf = 3.20`
- `away_ga = 3.00`
- `home_baseline = (home_gf + away_ga) / 2`
- `(3.20 + 3.00) / 2`
- `3.10`

Chance and possession multiplier:

- `xgfDiff = 0.06`
- `cfDiff = 0.04`
- `home_multiplier = 1 + xgfDiff * 1.2 + cfDiff * 0.4`
- `1 + 0.06 * 1.2 + 0.04 * 0.4`
- `1 + 0.072 + 0.016`
- `1.088`

Special teams term:

- `home_ppPct = 24.0`
- `away_pkPct = 78.0`
- `home_special_teams = (home_ppPct - away_pkPct) * 0.004`
- `(24.0 - 78.0) * 0.004`
- `-0.216`

Expected home goals:

- `home_baseline = 3.10`
- `home_multiplier = 1.088`
- `home_special_teams = -0.216`
- `home_expected_goals = home_baseline * home_multiplier + home_special_teams`
- `3.10 * 1.088 + (-0.216)`
- `3.3728 - 0.216`
- `3.1568`
- rounded result: `3.15`

### 14.4 Step 3: Estimate away goals

Baseline scoring midpoint:

- `away_gf = 2.80`
- `home_ga = 2.70`
- `away_baseline = (away_gf + home_ga) / 2`
- `(2.80 + 2.70) / 2`
- `2.75`

Chance and possession multiplier:

- `xgfDiff = 0.06`
- `cfDiff = 0.04`
- `away_multiplier = 1 - xgfDiff * 1.2 - cfDiff * 0.4`
- `1 - 0.06 * 1.2 - 0.04 * 0.4`
- `1 - 0.072 - 0.016`
- `0.912`

Special teams term:

- `away_ppPct = 20.0`
- `home_pkPct = 81.0`
- `away_special_teams = (away_ppPct - home_pkPct) * 0.004`
- `(20.0 - 81.0) * 0.004`
- `-0.244`

Expected away goals:

- `away_baseline = 2.75`
- `away_multiplier = 0.912`
- `away_special_teams = -0.244`
- `away_expected_goals = away_baseline * away_multiplier + away_special_teams`
- `2.75 * 0.912 + (-0.244)`
- `2.508 - 0.244`
- `2.264`
- rounded result: `2.27`

### 14.5 Step 4: Total and projected margin

Projected total:

- `home_goals = 3.15`
- `away_goals = 2.27`
- `projectedTotal = home_goals + away_goals`
- `3.15 + 2.27`
- `5.42`

Raw goal margin:

- `home_goals = 3.15`
- `away_goals = 2.27`
- `raw_goal_margin = home_goals - away_goals`
- `3.15 - 2.27`
- `0.88`

### 14.6 Step 5: Goalie edge and win probability

Goalie edge:

- `home_goalieSV = 0.915`
- `away_goalieSV = 0.905`
- `goalieEdge = (home_goalieSV - away_goalieSV) * 18`
- `(0.915 - 0.905) * 18`
- `0.010 * 18`
- `0.18`

Net goal differential:

- `raw_goal_margin = 0.88`
- `goalieEdge = 0.18`
- `hfa = 0.045`
- `netGoalDiff = raw_goal_margin + goalieEdge + hfa`
- `0.88 + 0.18 + 0.045`
- `1.105`

Win probability:

- `netGoalDiff = 1.105`
- `logistic_factor = 1.62`
- `homeWinProb_raw = 1 / (1 + exp(-netGoalDiff * logistic_factor))`
- `1 / (1 + exp(-1.105 * 1.62))`
- approximately `0.857`

Then the model bounds this at `0.82`, so:

- `homeWinProb = 82.0%`
- `awayWinProb = 18.0%`

### 14.7 Step 6: Compare to Money Line market

Raw implied probabilities:

- `home_moneyline = -150`
- `away_moneyline = +130`
- `home_implied = 150 / (150 + 100)`
- `150 / 250 = 0.600`
- `away_implied = 100 / (130 + 100)`
- `100 / 230 = 0.435`

Vig-adjusted:

- `vig_total = home_implied + away_implied`
- `0.600 + 0.435`
- `1.035`
- `home_market_prob = home_implied / vig_total`
- `0.600 / 1.035`
- `0.580`
- `away_market_prob = away_implied / vig_total`
- `0.435 / 1.035`
- `0.420`

Model edges:

- `home_model_prob = 0.820`
- `away_model_prob = 0.180`
- `home_edge = home_model_prob - home_market_prob`
- `0.820 - 0.580`
- `0.240`
- `away_edge = away_model_prob - away_market_prob`
- `0.180 - 0.420`
- `-0.240`

Decision:

- home Money Line is positive by `24.0%`
- threshold is `2.0%`
- recommendation: `home ML`

### 14.8 Step 7: Compare to puck line

Projected goal margin:

- `home_goals = 3.15`
- `away_goals = 2.27`
- `projected_margin = home_goals - away_goals`
- `3.15 - 2.27`
- `0.88`

With home `-1.5`:

- the model asks how often the home team wins by `2+`
- it uses `stdDev = 1.65`
- computes favorite cover probability from `normCDF`

If the resulting vig-adjusted edge exceeds `3.0%`, the puck line becomes a play. Otherwise it is a pass.

### 14.9 Step 8: Compare to total

Projected total:

- `projectedTotal = 5.42`

Sportsbook total:

- `sportsbook_total = 6.0`

Edge:

- `ouEdge = projectedTotal - sportsbook_total`
- `5.42 - 6.0`
- `-0.58`

Decision:

- since `-0.58 < -0.3`
- recommendation: `under 6.0`

## 15. Summary Of Decision Rules

### Money Line

- Project goals for each side
- Convert goal differential plus goalie edge into home win probability
- Remove vig from sportsbook Money Line
- Bet side only if model edge exceeds `2.0%`

### Puck Line

- Use projected goal margin
- Estimate favorite/dog cover probability with `stdDev = 1.65`
- Remove vig from puck line prices
- Bet side only if edge exceeds `3.0%`

### Total

- Project total from goals-for, goals-against, xGF%, CF%, special teams, rink, and schedule context
- Compare projected total to sportsbook O/U
- Recommend over/under only if the gap exceeds `0.3` goals

## 16. Important Notes

- This is a lightweight handcrafted model, not a trained machine-learning model.
- Projected goals come from blended team scoring rates plus possession and special-team modifiers.
- Win probability is logistic, not Poisson.
- Puck line probability uses a simplified normal-style scoring margin assumption with fixed `stdDev = 1.65`.
- Live API data and goalie overrides can materially change outputs versus the hardcoded baselines.
- The model caps home win probability between `18%` and `82%`, so extreme mismatches are intentionally compressed.

## 17. Definitions

### `cf`

Corsi For percentage. Share of all shot attempts taken by a team.

Quick interpretation:

- below `47%`: poor
- `47%` to `49%`: below average
- `49%` to `51%`: average
- `51%` to `53%`: good
- above `53%`: elite

### `ff`

Fenwick For percentage. Similar to Corsi, but excludes blocked shots.

Quick interpretation:

- below `47%`: poor
- `47%` to `49%`: below average
- `49%` to `51%`: average
- `51%` to `53%`: good
- above `53%`: elite

### `xgf`

Expected goals for percentage. Share of expected-goal quality earned by a team.

Quick interpretation:

- below `47%`: poor
- `47%` to `49%`: below average
- `49%` to `51%`: average
- `51%` to `53%`: good
- above `53%`: elite

### `pdo`

Team shooting percentage plus save percentage, shown on a `100` scale. Often used as a puck-luck indicator.

Quick interpretation:

- below `98.5`: very cold / likely running badly
- `98.5` to `99.5`: somewhat cold
- `99.5` to `100.5`: neutral
- `100.5` to `101.5`: somewhat hot
- above `101.5`: very hot / possible regression risk

### `goalieSV`

Projected goalie save percentage. This is one of the most important direct side inputs in the model.

Quick interpretation:

- below `.900`: poor
- `.900` to `.909`: below average
- `.910` to `.914`: average to solid
- `.915` to `.919`: good
- `.920` and up: elite

### `ppPct`

Power play percentage. Share of power plays converted into goals.

Quick interpretation:

- below `17%`: poor
- `17%` to `20%`: below average
- `20%` to `23%`: average
- `23%` to `26%`: good
- above `26%`: elite

### `pkPct`

Penalty kill percentage. Share of opponent power plays successfully killed off.

Quick interpretation:

- below `75%`: poor
- `75%` to `79%`: below average
- `79%` to `82%`: average
- `82%` to `85%`: good
- above `85%`: elite

### `shootingPct`

Team shooting percentage. Share of shots on goal converted into goals.

Quick interpretation:

- below `8%`: poor or cold finishing
- `8%` to `9%`: below average
- `9%` to `10%`: average
- `10%` to `11%`: good
- above `11%`: elite or potentially unsustainably hot

### `gf`

Goals scored per game.

Quick interpretation:

- below `2.5`: poor offense
- `2.5` to `2.9`: below average
- `2.9` to `3.2`: average
- `3.2` to `3.5`: good
- above `3.5`: elite offense

### `ga`

Goals allowed per game. Lower is better.

Quick interpretation:

- above `3.5`: poor defense
- `3.1` to `3.5`: below average
- `2.8` to `3.1`: average
- `2.5` to `2.8`: good
- below `2.5`: elite defense

### `srs`

Simple rating style goal-differential metric. Positive is better, negative is worse.

Quick interpretation:

- below `-0.5`: poor
- `-0.5` to `-0.15`: below average
- `-0.15` to `+0.15`: average
- `+0.15` to `+0.5`: good
- above `+0.5`: elite

### `hfa`

Home ice advantage, modeled as a small additive term in net goal differential.

### `playoffFactor`

Scoring reduction factor applied in playoff games.

### Vig

The sportsbook's built-in margin. Raw implied probabilities add to more than 100% because of vig.

### Vig-adjusted implied probability

The sportsbook probability after normalizing both sides to sum to 100%. This is what the model compares itself against.

### Kelly sizing

A bankroll sizing method based on edge and payout. This model uses a conservative fractional Kelly approach rather than full Kelly.

## 18. Main Source Files

- [nhl-predictor.tsx](C:\projects\game_sims\nhl-predictor\src\nhl-predictor.tsx)
- [NHL_MODEL_PREDICTION_ALGORITHMS.md](C:\projects\game_sims\nhl-predictor\NHL_MODEL_PREDICTION_ALGORITHMS.md)
