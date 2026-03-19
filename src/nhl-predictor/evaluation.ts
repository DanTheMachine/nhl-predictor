export interface PredictionRecord {
  lookupKey: string;
  homeAbbr: string;
  awayAbbr: string;
  homeWinProb: number;
  awayWinProb: number;
  homeEdgePct: number | null;
  awayEdgePct: number | null;
  mlValueSide: "home" | "away" | "pass";
  mlKellyPct: number | null;
  vegaHomeML: number | null;
  vegaAwayML: number | null;
  vegaPuckLine: number | null;
  vegaPuckLineHomeOdds: number | null;
  vegaPuckLineAwayOdds: number | null;
  vegaOU: number | null;
  vegaOverOdds: number | null;
  vegaUnderOdds: number | null;
  ouRec: "over" | "under" | "pass";
  ouEdge: number | null;
  puckLineRec: "home -1.5" | "home +1.5" | "away -1.5" | "away +1.5" | "pass";
  puckLineEdge: number | null;
}

export interface ResultRecord {
  lookupKey: string;
  homeGoals: number;
  awayGoals: number;
  winner: string;
  total: number;
}

export interface EvaluatedBet {
  market: "ML" | "O/U" | "PL";
  lookupKey: string;
  label: string;
  edgePct: number;
  odds: number;
  won: boolean;
  push: boolean;
  profit: number;
}

export interface MarketSummary {
  market: "ML" | "O/U" | "PL";
  bets: number;
  wins: number;
  losses: number;
  pushes: number;
  hitRate: number;
  units: number;
  roi: number;
}

export interface ThresholdSummary {
  threshold: number;
  bets: number;
  wins: number;
  losses: number;
  pushes: number;
  hitRate: number;
  units: number;
  roi: number;
}

export interface CalibrationBucket {
  label: string;
  games: number;
  wins: number;
  accuracy: number;
  avgPredicted: number;
}

export interface EvaluationSummary {
  matchedGames: number;
  unmatchedPredictions: number;
  unmatchedResults: number;
  bets: EvaluatedBet[];
  marketSummaries: MarketSummary[];
  thresholdSummaries: ThresholdSummary[];
  calibration: CalibrationBucket[];
}

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let currentCell = "";
  let currentRow: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        currentCell += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      currentRow.push(currentCell);
      currentCell = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") i += 1;
      currentRow.push(currentCell);
      if (currentRow.some((cell) => cell.length > 0)) rows.push(currentRow);
      currentRow = [];
      currentCell = "";
      continue;
    }

    currentCell += char;
  }

  currentRow.push(currentCell);
  if (currentRow.some((cell) => cell.length > 0)) rows.push(currentRow);

  return rows;
}

function rowsToObjects(text: string): Record<string, string>[] {
  const rows = parseCSV(text.trim());
  if (rows.length < 2) return [];

  const headers = rows[0].map((header) => header.trim());
  return rows.slice(1).map((row) => {
    const record: Record<string, string> = {};
    headers.forEach((header, index) => {
      record[header] = row[index]?.trim() ?? "";
    });
    return record;
  });
}

function parseNumber(value: string | undefined): number | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed === "-") return null;
  const normalized = trimmed.replace(/[%,$]/g, "");
  const parsed = parseFloat(normalized);
  return Number.isNaN(parsed) ? null : parsed;
}

function parseAbbr(teamLabel: string | undefined): string {
  return (teamLabel?.trim().split(/\s+/)[0] ?? "").toUpperCase();
}

function calcProfit(odds: number, won: boolean, push: boolean): number {
  if (push) return 0;
  if (!won) return -1;
  return odds > 0 ? odds / 100 : 100 / Math.abs(odds);
}

function summarizeMarket(market: MarketSummary["market"], bets: EvaluatedBet[]): MarketSummary {
  const marketBets = bets.filter((bet) => bet.market === market);
  const wins = marketBets.filter((bet) => bet.won && !bet.push).length;
  const pushes = marketBets.filter((bet) => bet.push).length;
  const losses = marketBets.length - wins - pushes;
  const graded = wins + losses;
  const units = marketBets.reduce((sum, bet) => sum + bet.profit, 0);

  return {
    market,
    bets: marketBets.length,
    wins,
    losses,
    pushes,
    hitRate: graded > 0 ? wins / graded : 0,
    units,
    roi: marketBets.length > 0 ? units / marketBets.length : 0,
  };
}

export function parsePredictionCsv(text: string): PredictionRecord[] {
  return rowsToObjects(text).map((row) => ({
    lookupKey: row["LookupKey"] ?? "",
    homeAbbr: parseAbbr(row["Home"]),
    awayAbbr: parseAbbr(row["Away"]),
    homeWinProb: (parseNumber(row["Home Win %"]) ?? 0) / 100,
    awayWinProb: (parseNumber(row["Away Win %"]) ?? 0) / 100,
    homeEdgePct: parseNumber(row["Home ML Edge"]),
    awayEdgePct: parseNumber(row["Away ML Edge"]),
    mlValueSide:
      row["ML Value Side"] === "HOME ML"
        ? "home"
        : row["ML Value Side"] === "AWAY ML"
          ? "away"
          : "pass",
    mlKellyPct: parseNumber(row["ML Kelly %"]),
    vegaHomeML: parseNumber(row["Vegas Home ML"]),
    vegaAwayML: parseNumber(row["Vegas Away ML"]),
    vegaPuckLine: parseNumber(row["Vegas Puck Line"]),
    vegaPuckLineHomeOdds: parseNumber(row["Home PL Odds"]),
    vegaPuckLineAwayOdds: parseNumber(row["Away PL Odds"]),
    vegaOU: parseNumber(row["Vegas O/U"]),
    vegaOverOdds: parseNumber(row["Over Odds"]),
    vegaUnderOdds: parseNumber(row["Under Odds"]),
    ouRec:
      row["O/U Rec"]?.toLowerCase() === "over"
        ? "over"
        : row["O/U Rec"]?.toLowerCase() === "under"
          ? "under"
          : "pass",
    ouEdge: parseNumber(row["O/U Edge"]),
    puckLineRec:
      row["Puck Line Rec"]?.toLowerCase() === "home -1.5" ||
      row["Puck Line Rec"]?.toLowerCase() === "home +1.5" ||
      row["Puck Line Rec"]?.toLowerCase() === "away -1.5" ||
      row["Puck Line Rec"]?.toLowerCase() === "away +1.5"
        ? (row["Puck Line Rec"].toLowerCase() as PredictionRecord["puckLineRec"])
        : "pass",
    puckLineEdge: parseNumber(row["Puck Line Edge"]),
  }));
}

export function parseResultsCsv(text: string): ResultRecord[] {
  return rowsToObjects(text).map((row) => ({
    lookupKey: row["LookupKey"] ?? "",
    homeGoals: parseNumber(row["Home Goals"]) ?? 0,
    awayGoals: parseNumber(row["Away Goals"]) ?? 0,
    winner: (row["Winner"] ?? "").toUpperCase(),
    total: parseNumber(row["Total"]) ?? 0,
  }));
}

export function evaluatePredictionResults(
  predictions: PredictionRecord[],
  results: ResultRecord[],
): EvaluationSummary {
  const resultMap = new Map(results.map((result) => [result.lookupKey, result]));
  const matchedPredictions = predictions.filter((prediction) => resultMap.has(prediction.lookupKey));
  const matchedKeys = new Set(matchedPredictions.map((prediction) => prediction.lookupKey));
  const bets: EvaluatedBet[] = [];

  for (const prediction of matchedPredictions) {
    const result = resultMap.get(prediction.lookupKey);
    if (!result) continue;

    if (prediction.mlValueSide !== "pass") {
      const isHome = prediction.mlValueSide === "home";
      const odds = isHome ? prediction.vegaHomeML : prediction.vegaAwayML;
      const edgePct = isHome ? prediction.homeEdgePct : prediction.awayEdgePct;

      if (odds != null && edgePct != null) {
        const won = isHome ? result.winner === prediction.homeAbbr : result.winner === prediction.awayAbbr;
        bets.push({
          market: "ML",
          lookupKey: prediction.lookupKey,
          label: `${prediction.mlValueSide.toUpperCase()} ML`,
          edgePct,
          odds,
          won,
          push: false,
          profit: calcProfit(odds, won, false),
        });
      }
    }

    if (prediction.ouRec !== "pass" && prediction.vegaOU != null) {
      const odds = prediction.ouRec === "over" ? prediction.vegaOverOdds : prediction.vegaUnderOdds;
      if (odds != null) {
        const push = result.total === prediction.vegaOU;
        const won =
          prediction.ouRec === "over"
            ? result.total > prediction.vegaOU
            : result.total < prediction.vegaOU;
        bets.push({
          market: "O/U",
          lookupKey: prediction.lookupKey,
          label: `${prediction.ouRec.toUpperCase()} ${prediction.vegaOU.toFixed(1)}`,
          edgePct: Math.abs(prediction.ouEdge ?? 0) * 10,
          odds,
          won,
          push,
          profit: calcProfit(odds, won, push),
        });
      }
    }

    if (prediction.puckLineRec !== "pass") {
      const isHome = prediction.puckLineRec.startsWith("home");
      const handicapMatch = prediction.puckLineRec.match(/([+-]\d+(\.\d+)?)/);
      const handicap = handicapMatch ? parseFloat(handicapMatch[1]) : null;
      const odds = isHome ? prediction.vegaPuckLineHomeOdds : prediction.vegaPuckLineAwayOdds;

      if (odds != null && handicap != null) {
        const adjustedHome = isHome ? result.homeGoals + handicap : result.homeGoals;
        const adjustedAway = isHome ? result.awayGoals : result.awayGoals + handicap;
        const push = adjustedHome === adjustedAway;
        const won = adjustedHome > adjustedAway;

        bets.push({
          market: "PL",
          lookupKey: prediction.lookupKey,
          label: prediction.puckLineRec.toUpperCase(),
          edgePct: prediction.puckLineEdge ?? 0,
          odds,
          won,
          push,
          profit: calcProfit(odds, won, push),
        });
      }
    }
  }

  const thresholdSummaries: ThresholdSummary[] = [2, 4, 6, 8].map((threshold) => {
    const thresholdBets = bets.filter((bet) => bet.edgePct >= threshold);
    const wins = thresholdBets.filter((bet) => bet.won && !bet.push).length;
    const pushes = thresholdBets.filter((bet) => bet.push).length;
    const losses = thresholdBets.length - wins - pushes;
    const graded = wins + losses;
    const units = thresholdBets.reduce((sum, bet) => sum + bet.profit, 0);

    return {
      threshold,
      bets: thresholdBets.length,
      wins,
      losses,
      pushes,
      hitRate: graded > 0 ? wins / graded : 0,
      units,
      roi: thresholdBets.length > 0 ? units / thresholdBets.length : 0,
    };
  });

  const calibrationRanges = [
    { min: 0.5, max: 0.55, label: "50-55%" },
    { min: 0.55, max: 0.6, label: "55-60%" },
    { min: 0.6, max: 0.65, label: "60-65%" },
    { min: 0.65, max: 0.7, label: "65-70%" },
    { min: 0.7, max: 1.01, label: "70%+" },
  ];

  const calibration: CalibrationBucket[] = calibrationRanges.map((range) => {
    const bucketGames = matchedPredictions.filter((prediction) => {
      const favoredProb = Math.max(prediction.homeWinProb, prediction.awayWinProb);
      return favoredProb >= range.min && favoredProb < range.max;
    });

    const wins = bucketGames.filter((prediction) => {
      const result = resultMap.get(prediction.lookupKey);
      if (!result) return false;
      const homeFavored = prediction.homeWinProb >= prediction.awayWinProb;
      return homeFavored ? result.winner === prediction.homeAbbr : result.winner === prediction.awayAbbr;
    }).length;

    const avgPredicted =
      bucketGames.length > 0
        ? bucketGames.reduce((sum, prediction) => sum + Math.max(prediction.homeWinProb, prediction.awayWinProb), 0) /
          bucketGames.length
        : 0;

    return {
      label: range.label,
      games: bucketGames.length,
      wins,
      accuracy: bucketGames.length > 0 ? wins / bucketGames.length : 0,
      avgPredicted,
    };
  });

  return {
    matchedGames: matchedPredictions.length,
    unmatchedPredictions: predictions.length - matchedPredictions.length,
    unmatchedResults: results.length - matchedKeys.size,
    bets,
    marketSummaries: (["ML", "O/U", "PL"] as const).map((market) => summarizeMarket(market, bets)),
    thresholdSummaries,
    calibration,
  };
}
