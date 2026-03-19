import { ICE_CONDITIONS, TEAMS } from "./data";
import type { BettingAnalysis, OddsData, PredictInput, PredictResult, TeamData } from "./types";

export function predictGame({
  homeTeam,
  awayTeam,
  gameType,
  homeB2B,
  awayB2B,
  liveStats,
  homeSVOverride,
  awaySVOverride,
}: PredictInput): PredictResult {
  const hBase = TEAMS[homeTeam];
  const aBase = TEAMS[awayTeam];
  const hLive = liveStats?.[homeTeam];
  const aLive = liveStats?.[awayTeam];
  const h: TeamData = hLive ? { ...hBase, ...hLive } : { ...hBase };
  const a: TeamData = aLive ? { ...aBase, ...aLive } : { ...aBase };

  if (homeSVOverride != null) h.goalieSV = homeSVOverride;
  if (awaySVOverride != null) a.goalieSV = awaySVOverride;

  const isPlayoff = gameType !== "Regular Season";
  const playoffFactor = isPlayoff ? 0.94 : 1.0;
  const hfa = 0.045;
  const hB2BPenalty = homeB2B ? -0.018 : 0;
  const aB2BPenalty = awayB2B ? -0.018 : 0;

  const iceAdj = ICE_CONDITIONS[h.ice]?.scoringAdj ?? 1.0;
  const ppAdj = ICE_CONDITIONS[h.ice]?.ppAdj ?? 1.0;
  const cfDiff = (h.cf - a.cf) / 100;
  const xgfDiff = (h.xgf - a.xgf) / 100;

  const hExpGoals =
    ((h.gf + a.ga) / 2) * (1 + xgfDiff * 1.2 + cfDiff * 0.4) * iceAdj * playoffFactor * (1 + hB2BPenalty) +
    (h.ppPct - a.pkPct) * 0.004 * ppAdj;

  const aExpGoals =
    ((a.gf + h.ga) / 2) * (1 - xgfDiff * 1.2 - cfDiff * 0.4) * iceAdj * playoffFactor * (1 + aB2BPenalty) +
    (a.ppPct - h.pkPct) * 0.004 * ppAdj;

  const hGoals = Math.max(0.8, hExpGoals);
  const aGoals = Math.max(0.8, aExpGoals);
  const goalDiff = hGoals - aGoals + hfa;
  const hWinProb = 1 / (1 + Math.exp(-goalDiff * 1.35));
  const aWinProb = 1 - hWinProb;
  const total = hGoals + aGoals;
  const otProb = Math.min(0.32, Math.max(0.16, 0.24 - Math.abs(goalDiff) * 0.05 + (isPlayoff ? 0.03 : 0)));
  const goalieEdge = (h.goalieSV - a.goalieSV) * 1000;
  const pdoEdge = h.pdo - a.pdo;

  return {
    hWinProb: +hWinProb.toFixed(4),
    aWinProb: +aWinProb.toFixed(4),
    hGoals: hGoals.toFixed(2),
    aGoals: aGoals.toFixed(2),
    total: total.toFixed(2),
    otProb: +otProb.toFixed(3),
    goalieEdge: `${goalieEdge >= 0 ? "+" : ""}${goalieEdge.toFixed(1)} SV pts`,
    hPDOLuck: h.pdo >= 100 ? "Running hot" : "Running cold",
    aPDOLuck: a.pdo >= 100 ? "Running hot" : "Running cold",
    isPlayoff,
    features: [
      { label: "Corsi", detail: `${h.cf.toFixed(1)}% vs ${a.cf.toFixed(1)}%`, good: h.cf >= a.cf },
      { label: "xGF", detail: `${h.xgf.toFixed(1)}% vs ${a.xgf.toFixed(1)}%`, good: h.xgf >= a.xgf },
      { label: "Goalie", detail: `${(h.goalieSV * 100).toFixed(2)}% vs ${(a.goalieSV * 100).toFixed(2)}%`, good: h.goalieSV >= a.goalieSV },
      { label: "Special Teams", detail: `PP ${h.ppPct.toFixed(1)} / PK ${h.pkPct.toFixed(1)}`, good: h.ppPct + h.pkPct >= a.ppPct + a.pkPct },
      { label: "PDO", detail: `${h.pdo.toFixed(1)} vs ${a.pdo.toFixed(1)}`, good: pdoEdge >= 0 },
      { label: "Schedule", detail: `${homeB2B ? "Home B2B" : "Home Rested"} / ${awayB2B ? "Away B2B" : "Away Rested"}`, good: !homeB2B || awayB2B },
    ],
  };
}

export function americanToImplied(american: number): number {
  if (!american || Number.isNaN(american)) return 0.5;
  if (american < 0) return (-american) / (-american + 100);
  return 100 / (american + 100);
}

function normCDF(z: number): number {
  return 0.5 * (1 + Math.sign(z) * (1 - Math.exp(-0.7071 * z * z * (1 + 0.2316419 * Math.abs(z)))));
}

export function analyzeBetting(result: PredictResult, odds: OddsData): BettingAnalysis {
  const homeImplied = americanToImplied(odds.homeMoneyline);
  const awayImplied = americanToImplied(odds.awayMoneyline);
  const vigSum = homeImplied + awayImplied;
  const homeImpliedClean = homeImplied / vigSum;
  const awayImpliedClean = awayImplied / vigSum;
  const homeEdge = result.hWinProb - homeImpliedClean;
  const awayEdge = result.aWinProb - awayImpliedClean;
  const mlValueSide = homeEdge > 0.02 ? "home" : awayEdge > 0.02 ? "away" : "none";
  const mlValuePct = Math.max(homeEdge, awayEdge) * 100;

  const projDiff = parseFloat(result.hGoals) - parseFloat(result.aGoals);
  const stdDev = 1.65;
  const homeFav = odds.puckLine <= 0;
  const favDiff = homeFav ? projDiff : -projDiff;
  const z = (1.5 - favDiff) / stdDev;
  const favCover = 1 - normCDF(z);
  const dogCover = 1 - favCover;
  const homeCoverProb = homeFav ? favCover : dogCover;
  const awayCoverProb = homeFav ? dogCover : favCover;

  const plHomeRaw = americanToImplied(odds.puckLineHomeOdds || -110);
  const plAwayRaw = americanToImplied(odds.puckLineAwayOdds || -110);
  const plSum = plHomeRaw + plAwayRaw;
  const plHomeImplied = plSum > 0 ? plHomeRaw / plSum : 0.5;
  const plAwayImplied = plSum > 0 ? plAwayRaw / plSum : 0.5;
  const plHomeEdge = homeCoverProb - plHomeImplied;
  const plAwayEdge = awayCoverProb - plAwayImplied;
  const homePLLabel = homeFav ? "home -1.5" : "home +1.5";
  const awayPLLabel = homeFav ? "away +1.5" : "away -1.5";
  const puckLineRec = plHomeEdge > 0.03 ? homePLLabel : plAwayEdge > 0.03 ? awayPLLabel : "pass";
  const puckLineEdge = Math.max(plHomeEdge, plAwayEdge) * 100;

  const projTotal = parseFloat(result.total);
  const ouEdge = projTotal - odds.overUnder;
  const ouRec = ouEdge > 0.3 ? "over" : ouEdge < -0.3 ? "under" : "pass";
  const kellyHome = homeEdge > 0 ? (homeEdge / (1 - homeImpliedClean)) * 0.25 : 0;
  const kellyAway = awayEdge > 0 ? (awayEdge / (1 - awayImpliedClean)) * 0.25 : 0;

  return {
    homeImpliedProb: homeImpliedClean,
    awayImpliedProb: awayImpliedClean,
    homeEdge,
    awayEdge,
    mlValueSide,
    mlValuePct,
    puckLineRec,
    puckLineEdge,
    ouRec,
    ouEdge,
    kellyHome,
    kellyAway,
  };
}

export function mlAmerican(prob: number): string {
  if (prob <= 0 || prob >= 1) return "N/A";
  return prob >= 0.5 ? `-${Math.round((prob / (1 - prob)) * 100)}` : `+${Math.round(((1 - prob) / prob) * 100)}`;
}
