import { ICE_CONDITIONS, TEAMS } from "../nhl-core/data";
import type {
  BettingAnalysis,
  OddsData,
  PredictInput,
  PredictResult,
  TeamData,
} from "../nhl-core/types";

const ESTIMATED_TOTAL_SCORING_CALIBRATION = 1.3;
const LIVE_TOTAL_SCORING_CALIBRATION = 1.08;
const ML_EDGE_THRESHOLD = 0.05;
const ML_KELLY_THRESHOLD = 0.025;
const WIN_PROB_REGRESSION = 0.6;

function regressWinProbability(rawProb: number): number {
  return 0.5 + (rawProb - 0.5) * WIN_PROB_REGRESSION;
}

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
  const h: TeamData = hLive ? { ...hBase, ...hLive } : hBase;
  const a: TeamData = aLive ? { ...aBase, ...aLive } : aBase;
  const totalScoringCalibration = hLive && aLive ? LIVE_TOTAL_SCORING_CALIBRATION : ESTIMATED_TOTAL_SCORING_CALIBRATION;

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

  const hGoals = Math.max(0.8, hExpGoals * totalScoringCalibration);
  const aGoals = Math.max(0.8, aExpGoals * totalScoringCalibration);

  const goalieEdge = (h.goalieSV - a.goalieSV) * 18;
  const netGoalDiff = hGoals - aGoals + goalieEdge + hfa;
  const rawHWinProb = 1 / (1 + Math.exp(-netGoalDiff * 1.62));
  const hWinProb = Math.min(0.78, Math.max(0.22, regressWinProbability(rawHWinProb)));
  const otProb = Math.max(0.04, 0.24 - Math.abs(netGoalDiff) * 0.07);
  const hPDOLuck = ((h.pdo - 100) / 100).toFixed(3);
  const aPDOLuck = ((a.pdo - 100) / 100).toFixed(3);
  const total = (hGoals + aGoals).toFixed(2);

  return {
    hWinProb,
    aWinProb: 1 - hWinProb,
    hGoals: hGoals.toFixed(2),
    aGoals: aGoals.toFixed(2),
    total,
    otProb,
    goalieEdge: goalieEdge.toFixed(3),
    hPDOLuck,
    aPDOLuck,
    isPlayoff,
    features: [
      { label: `${homeTeam} Corsi For %`, good: h.cf >= 52, detail: `${h.cf.toFixed(1)}%` },
      { label: `${homeTeam} xGF %`, good: h.xgf >= 52, detail: `${h.xgf.toFixed(1)}%` },
      { label: `${awayTeam} Corsi For %`, good: a.cf >= 52, detail: `${a.cf.toFixed(1)}%` },
      { label: `${awayTeam} xGF %`, good: a.xgf >= 52, detail: `${a.xgf.toFixed(1)}%` },
      { label: `${homeTeam} Goalie SV%`, good: h.goalieSV >= 0.915, detail: `.${(h.goalieSV * 1000).toFixed(0)}` },
      { label: `${awayTeam} Goalie SV%`, good: a.goalieSV >= 0.915, detail: `.${(a.goalieSV * 1000).toFixed(0)}` },
      { label: `${homeTeam} Power Play %`, good: h.ppPct >= 23, detail: `${h.ppPct.toFixed(1)}%` },
      { label: `${awayTeam} Penalty Kill %`, good: a.pkPct >= 82, detail: `${a.pkPct.toFixed(1)}%` },
      { label: `${homeTeam} PDO`, good: Math.abs(h.pdo - 100) <= 1.5, detail: `${h.pdo.toFixed(1)} ${h.pdo > 100 ? "(hot)" : "(cold)"}` },
      { label: `${awayTeam} PDO`, good: Math.abs(a.pdo - 100) <= 1.5, detail: `${a.pdo.toFixed(1)} ${a.pdo > 100 ? "(hot)" : "(cold)"}` },
      { label: "Home Ice Advantage", good: true, detail: `+${(hfa * 100).toFixed(1)}% win rate` },
      { label: "Game Type", good: !isPlayoff, detail: gameType },
    ],
  };
}

export function americanToImplied(american: number): number {
  if (!american || Number.isNaN(american)) return 0.5;
  if (american < 0) return -american / (-american + 100);
  return 100 / (american + 100);
}

export function normCDF(z: number): number {
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
  const rawKellyHome = homeEdge > 0 ? (homeEdge / (1 - homeImpliedClean)) * 0.25 : 0;
  const rawKellyAway = awayEdge > 0 ? (awayEdge / (1 - awayImpliedClean)) * 0.25 : 0;
  const homeMlQualified = homeEdge > ML_EDGE_THRESHOLD && rawKellyHome > ML_KELLY_THRESHOLD;
  const awayMlQualified = awayEdge > ML_EDGE_THRESHOLD && rawKellyAway > ML_KELLY_THRESHOLD;
  const mlValueSide = homeMlQualified ? "home" : awayMlQualified ? "away" : "none";
  const mlValuePct = Math.max(homeMlQualified ? homeEdge : 0, awayMlQualified ? awayEdge : 0) * 100;

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
  const totalStdDev = 1.15;
  const totalZ = (odds.overUnder - projTotal) / totalStdDev;
  const overProb = 1 - normCDF(totalZ);
  const underProb = 1 - overProb;
  const overRaw = americanToImplied(odds.overOdds || -110);
  const underRaw = americanToImplied(odds.underOdds || -110);
  const ouSum = overRaw + underRaw;
  const overImplied = ouSum > 0 ? overRaw / ouSum : 0.5;
  const underImplied = ouSum > 0 ? underRaw / ouSum : 0.5;
  const overEdge = overProb - overImplied;
  const underEdge = underProb - underImplied;
  const ouRec = overEdge > 0.035 ? "over" : underEdge > 0.035 ? "under" : "pass";
  const ouEdge = ouRec === "over" ? overEdge : ouRec === "under" ? -underEdge : 0;
  const kellyHome = homeMlQualified ? rawKellyHome : 0;
  const kellyAway = awayMlQualified ? rawKellyAway : 0;

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
