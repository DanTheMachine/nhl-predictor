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
  mlBetUnits: number | null;
  ouBetUnits: number | null;
  puckLineBetUnits: number | null;
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
  stake: number;
  hasExplicitStake: boolean;
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
  actualBets: number;
  actualWins: number;
  actualLosses: number;
  actualPushes: number;
  actualHitRate: number;
  actualUnits: number;
  actualRoi: number;
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

export interface OuRecommendationSummary {
  recommendation: "over" | "under" | "pass";
  games: number;
  wins: number;
  losses: number;
  pushes: number;
  hitRate: number;
  avgEdgePct: number;
  units: number;
  roi: number;
}

export interface OuEdgeBucketSummary {
  label: string;
  bets: number;
  wins: number;
  losses: number;
  pushes: number;
  hitRate: number;
  avgEdgePct: number;
  units: number;
  roi: number;
}

export interface EvaluationSummary {
  matchedGames: number;
  unmatchedPredictions: number;
  unmatchedResults: number;
  bets: EvaluatedBet[];
  marketSummaries: MarketSummary[];
  thresholdSummaries: ThresholdSummary[];
  calibration: CalibrationBucket[];
  ouRecommendationSummaries: OuRecommendationSummary[];
  ouEdgeBuckets: OuEdgeBucketSummary[];
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

    if ((char === "," || char === "\t") && !inQuotes) {
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

function normalizeHeader(value: string): string {
  return value.trim().replace(/^\uFEFF/, "");
}

function findHeaderRowIndex(rows: string[][], requiredHeaders: string[]): number {
  return rows.findIndex((row) => {
    const headers = new Set(row.map(normalizeHeader));
    return requiredHeaders.every((header) => headers.has(header));
  });
}

function rowsToObjects(text: string, requiredHeaders: string[]): Record<string, string>[] {
  const rows = parseCSV(text.trim());
  if (rows.length < 2) return [];

  const headerRowIndex = findHeaderRowIndex(rows, requiredHeaders);
  if (headerRowIndex < 0) return [];

  const headers = rows[headerRowIndex].map(normalizeHeader);
  return rows.slice(headerRowIndex + 1).map((row) => {
    const record: Record<string, string> = {};
    headers.forEach((header, index) => {
      record[header] = row[index]?.trim() ?? "";
    });
    return record;
  });
}

function isLikelyHeaderlessResultsRow(row: string[]): boolean {
  if (row.length < 8) return false;
  const [date, home, away, homeGoals, awayGoals, winner, total, lookupKey] = row.map((cell) => cell.trim());
  return (
    /^\d{2}[-/]\d{2}[-/]\d{4}$/.test(date) &&
    /^[A-Z]{2,4}$/.test(home) &&
    /^[A-Z]{2,4}$/.test(away) &&
    /^-?\d+(\.\d+)?$/.test(homeGoals) &&
    /^-?\d+(\.\d+)?$/.test(awayGoals) &&
    /^[A-Z]{2,4}$/.test(winner) &&
    /^-?\d+(\.\d+)?$/.test(total) &&
    /^\d{8}[A-Z]{6,8}$/.test(lookupKey)
  );
}

function parseNumber(value: string | undefined): number | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed === "-" || trimmed === "—") return null;
  const normalized = trimmed.replace(/[%,$]/g, "");
  const parsed = parseFloat(normalized);
  return Number.isNaN(parsed) ? null : parsed;
}

function parseAbbr(teamLabel: string | undefined): string {
  return (teamLabel?.trim().split(/\s+/)[0] ?? "").toUpperCase();
}

function normalizeOuEdgePct(value: number | null): number | null {
  if (value == null) return null;
  return Math.abs(value) <= 1 ? value * 100 : value;
}

function calcProfit(odds: number, won: boolean, push: boolean): number {
  if (push) return 0;
  if (!won) return -1;
  return odds > 0 ? odds / 100 : 100 / Math.abs(odds);
}

function summarizeBetGroup(bets: EvaluatedBet[]) {
  const wins = bets.filter((bet) => bet.won && !bet.push).length;
  const pushes = bets.filter((bet) => bet.push).length;
  const losses = bets.length - wins - pushes;
  const graded = wins + losses;
  const units = bets.reduce((sum, bet) => sum + bet.profit, 0);
  const riskedUnits = bets.reduce((sum, bet) => sum + bet.stake, 0);

  return {
    bets: bets.length,
    wins,
    losses,
    pushes,
    hitRate: graded > 0 ? wins / graded : 0,
    units,
    roi: riskedUnits > 0 ? units / riskedUnits : 0,
  };
}

function summarizeMarket(market: MarketSummary["market"], bets: EvaluatedBet[]): MarketSummary {
  const marketBets = bets.filter((bet) => bet.market === market);
  const actualMarketBets = marketBets.filter((bet) => bet.hasExplicitStake);
  const summary = summarizeBetGroup(marketBets);
  const actualSummary = summarizeBetGroup(actualMarketBets);

  return {
    market,
    bets: summary.bets,
    wins: summary.wins,
    losses: summary.losses,
    pushes: summary.pushes,
    hitRate: summary.hitRate,
    units: summary.units,
    roi: summary.roi,
    actualBets: actualSummary.bets,
    actualWins: actualSummary.wins,
    actualLosses: actualSummary.losses,
    actualPushes: actualSummary.pushes,
    actualHitRate: actualSummary.hitRate,
    actualUnits: actualSummary.units,
    actualRoi: actualSummary.roi,
  };
}

export function parsePredictionCsv(text: string): PredictionRecord[] {
  return rowsToObjects(text, ["LookupKey", "Home", "Away"])
    .filter((row) => row["LookupKey"]?.trim())
    .map((row) => ({
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
      ouEdge: normalizeOuEdgePct(parseNumber(row["O/U Edge"])),
      puckLineRec:
        row["Puck Line Rec"]?.toLowerCase() === "home -1.5" ||
        row["Puck Line Rec"]?.toLowerCase() === "home +1.5" ||
        row["Puck Line Rec"]?.toLowerCase() === "away -1.5" ||
        row["Puck Line Rec"]?.toLowerCase() === "away +1.5"
          ? (row["Puck Line Rec"].toLowerCase() as PredictionRecord["puckLineRec"])
          : "pass",
      puckLineEdge: parseNumber(row["Puck Line Edge"]),
      mlBetUnits: parseNumber(row["ML Bet"]),
      ouBetUnits: parseNumber(row["O/U Bet"]),
      puckLineBetUnits: parseNumber(row["PL Bet"]),
    }));
}

export function parseResultsCsv(text: string): ResultRecord[] {
  const structuredRows = rowsToObjects(text, ["LookupKey"]);
  if (structuredRows.length > 0) {
    return structuredRows
      .filter((row) => row["LookupKey"]?.trim())
      .map((row) => {
        const homeGoalsColumn = "Actual Home Goals" in row ? "Actual Home Goals" : "Home Goals";
        const awayGoalsColumn = "Actual Away Goals" in row ? "Actual Away Goals" : "Away Goals";
        const winnerColumn = "Actual Winner" in row ? "Actual Winner" : "Winner";
        const totalColumn = "Actual Total" in row ? "Actual Total" : "Total";

        return {
          lookupKey: row["LookupKey"] ?? "",
          homeGoals: parseNumber(row[homeGoalsColumn]) ?? 0,
          awayGoals: parseNumber(row[awayGoalsColumn]) ?? 0,
          winner: (row[winnerColumn] ?? "").toUpperCase(),
          total: parseNumber(row[totalColumn]) ?? 0,
        };
      });
  }

  return parseCSV(text.trim())
    .filter(isLikelyHeaderlessResultsRow)
    .map((row) => ({
      lookupKey: row[7]?.trim() ?? "",
      homeGoals: parseNumber(row[3]) ?? 0,
      awayGoals: parseNumber(row[4]) ?? 0,
      winner: (row[5] ?? "").trim().toUpperCase(),
      total: parseNumber(row[6]) ?? 0,
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
        const stake = prediction.mlBetUnits ?? 1;
        bets.push({
          market: "ML",
          lookupKey: prediction.lookupKey,
          label: `${prediction.mlValueSide.toUpperCase()} ML`,
          edgePct,
          odds,
          stake,
          hasExplicitStake: prediction.mlBetUnits != null,
          won,
          push: false,
          profit: calcProfit(odds, won, false) * stake,
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
        const stake = prediction.ouBetUnits ?? 1;
        bets.push({
          market: "O/U",
          lookupKey: prediction.lookupKey,
          label: `${prediction.ouRec.toUpperCase()} ${prediction.vegaOU.toFixed(1)}`,
          edgePct: Math.abs(prediction.ouEdge ?? 0),
          odds,
          stake,
          hasExplicitStake: prediction.ouBetUnits != null,
          won,
          push,
          profit: calcProfit(odds, won, push) * stake,
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
        const stake = prediction.puckLineBetUnits ?? 1;

        bets.push({
          market: "PL",
          lookupKey: prediction.lookupKey,
          label: prediction.puckLineRec.toUpperCase(),
          edgePct: prediction.puckLineEdge ?? 0,
          odds,
          stake,
          hasExplicitStake: prediction.puckLineBetUnits != null,
          won,
          push,
          profit: calcProfit(odds, won, push) * stake,
        });
      }
    }
  }

  const thresholdSummaries: ThresholdSummary[] = [2, 4, 6, 8].map((threshold) => {
    const thresholdBets = bets.filter((bet) => bet.edgePct >= threshold);
    const summary = summarizeBetGroup(thresholdBets);

    return {
      threshold,
      bets: summary.bets,
      wins: summary.wins,
      losses: summary.losses,
      pushes: summary.pushes,
      hitRate: summary.hitRate,
      units: summary.units,
      roi: summary.roi,
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

  const ouRecommendationSummaries: OuRecommendationSummary[] = (["over", "under", "pass"] as const).map((recommendation) => {
    const recommendationGames = matchedPredictions.filter((prediction) => prediction.ouRec === recommendation);
    const recommendationBets = bets.filter(
      (bet) =>
        bet.market === "O/U" &&
        ((recommendation === "over" && bet.label.startsWith("OVER")) ||
          (recommendation === "under" && bet.label.startsWith("UNDER"))),
    );
    const summary = summarizeBetGroup(recommendationBets);
    const avgEdgePct =
      recommendationGames.length > 0
        ? recommendationGames.reduce((sum, prediction) => sum + Math.abs(prediction.ouEdge ?? 0), 0) / recommendationGames.length
        : 0;

    return {
      recommendation,
      games: recommendationGames.length,
      wins: summary.wins,
      losses: summary.losses,
      pushes: summary.pushes,
      hitRate: summary.hitRate,
      avgEdgePct,
      units: summary.units,
      roi: summary.roi,
    };
  });

  const ouEdgeRanges = [
    { min: 0, max: 5, label: "0-5%" },
    { min: 5, max: 10, label: "5-10%" },
    { min: 10, max: 1000, label: "10%+" },
  ];

  const ouEdgeBuckets: OuEdgeBucketSummary[] = ouEdgeRanges.map((range) => {
    const bucketBets = bets.filter(
      (bet) => bet.market === "O/U" && bet.edgePct >= range.min && bet.edgePct < range.max,
    );
    const summary = summarizeBetGroup(bucketBets);
    const avgEdgePct =
      bucketBets.length > 0 ? bucketBets.reduce((sum, bet) => sum + bet.edgePct, 0) / bucketBets.length : 0;

    return {
      label: range.label,
      bets: summary.bets,
      wins: summary.wins,
      losses: summary.losses,
      pushes: summary.pushes,
      hitRate: summary.hitRate,
      avgEdgePct,
      units: summary.units,
      roi: summary.roi,
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
    ouRecommendationSummaries,
    ouEdgeBuckets,
  };
}
