import { TEAMS } from "../nhl-core/data";
import type { BettingAnalysis, ExportRow, LinesRow, LiveTeamStats } from "../nhl-core/types";
import { analyzeBetting, mlAmerican, predictGame } from "./engine";

export function buildExportRow(row: LinesRow, liveStats?: Record<string, LiveTeamStats>): ExportRow {
  const etNow = new Date(new Date().toLocaleString("en-US", { timeZone: "America/New_York" }));
  const etDateDisplay = etNow.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" });
  const etDateKey = `${etNow.getFullYear()}${String(etNow.getMonth() + 1).padStart(2, "0")}${String(etNow.getDate()).padStart(2, "0")}`;
  const game = row.game;
  const pred =
    row.simResult ??
    predictGame({
      homeTeam: game.homeAbbr,
      awayTeam: game.awayAbbr,
      gameType: "Regular Season",
      homeB2B: row.homeB2B ?? false,
      awayB2B: row.awayB2B ?? false,
      liveStats,
      homeSVOverride: row.homeSVOverride,
      awaySVOverride: row.awaySVOverride,
    });

  const homeTeam = TEAMS[game.homeAbbr];
  const awayTeam = TEAMS[game.awayAbbr];
  const oddsData = row.editedOdds ?? row.espnOdds;
  const analysis: BettingAnalysis | null = oddsData && oddsData.homeMoneyline !== 0 ? analyzeBetting(pred, oddsData) : null;

  return {
    date: etDateDisplay,
    gameTime: game.gameTime,
    home: `${game.homeAbbr} ${homeTeam.name}`,
    away: `${game.awayAbbr} ${awayTeam.name}`,
    homeWinProb: `${(pred.hWinProb * 100).toFixed(1)}%`,
    awayWinProb: `${(pred.aWinProb * 100).toFixed(1)}%`,
    homeGoals: pred.hGoals,
    awayGoals: pred.aGoals,
    total: pred.total,
    vegaOU: oddsData?.overUnder?.toFixed(1) ?? "—",
    ouRec: analysis ? (analysis.ouRec === "pass" ? "PASS" : analysis.ouRec.toUpperCase()) : "—",
    ouEdge: analysis ? `${analysis.ouEdge > 0 ? "+" : ""}${(analysis.ouEdge * 100).toFixed(1)}%` : "—",
    homeML: mlAmerican(pred.hWinProb),
    awayML: mlAmerican(pred.aWinProb),
    vegaHomeML: oddsData?.homeMoneyline ? `${oddsData.homeMoneyline > 0 ? "+" : ""}${oddsData.homeMoneyline}` : "—",
    vegaAwayML: oddsData?.awayMoneyline ? `${oddsData.awayMoneyline > 0 ? "+" : ""}${oddsData.awayMoneyline}` : "—",
    vegaPuckLine: oddsData?.puckLine != null ? `${oddsData.puckLine > 0 ? "+" : ""}${oddsData.puckLine.toFixed(1)}` : "—",
    vegaPuckLineHomeOdds: oddsData?.puckLineHomeOdds ? `${oddsData.puckLineHomeOdds > 0 ? "+" : ""}${oddsData.puckLineHomeOdds}` : "—",
    vegaPuckLineAwayOdds: oddsData?.puckLineAwayOdds ? `${oddsData.puckLineAwayOdds > 0 ? "+" : ""}${oddsData.puckLineAwayOdds}` : "—",
    vegaOverOdds: oddsData?.overOdds ? `${oddsData.overOdds > 0 ? "+" : ""}${oddsData.overOdds}` : "—",
    vegaUnderOdds: oddsData?.underOdds ? `${oddsData.underOdds > 0 ? "+" : ""}${oddsData.underOdds}` : "—",
    homeEdgePct: analysis ? `${analysis.homeEdge > 0 ? "+" : ""}${(analysis.homeEdge * 100).toFixed(1)}%` : "—",
    awayEdgePct: analysis ? `${analysis.awayEdge > 0 ? "+" : ""}${(analysis.awayEdge * 100).toFixed(1)}%` : "—",
    mlValueSide: analysis ? (analysis.mlValueSide === "none" ? "PASS" : `${analysis.mlValueSide.toUpperCase()} ML`) : "—",
    mlKelly: analysis && analysis.mlValueSide !== "none" ? `${(Math.max(analysis.kellyHome, analysis.kellyAway) * 100).toFixed(1)}%` : "—",
    puckLineRec: analysis ? (analysis.puckLineRec === "pass" ? "PASS" : analysis.puckLineRec.toUpperCase()) : "—",
    puckLineEdge: analysis && analysis.puckLineRec !== "pass" ? `+${analysis.puckLineEdge.toFixed(1)}%` : "—",
    homeCorsi: `${homeTeam.cf.toFixed(1)}%`,
    awayCorsi: `${awayTeam.cf.toFixed(1)}%`,
    homeXGF: `${homeTeam.xgf.toFixed(1)}%`,
    awayXGF: `${awayTeam.xgf.toFixed(1)}%`,
    homeSV: `.${(homeTeam.goalieSV * 1000).toFixed(0)}`,
    awaySV: `.${(awayTeam.goalieSV * 1000).toFixed(0)}`,
    homeSVOverrideExport: row.homeSVOverride != null ? `.${(row.homeSVOverride * 1000).toFixed(0)}` : "",
    awaySVOverrideExport: row.awaySVOverride != null ? `.${(row.awaySVOverride * 1000).toFixed(0)}` : "",
    homePP: `${homeTeam.ppPct.toFixed(1)}%`,
    awayPP: `${awayTeam.ppPct.toFixed(1)}%`,
    homePK: `${homeTeam.pkPct.toFixed(1)}%`,
    awayPK: `${awayTeam.pkPct.toFixed(1)}%`,
    homePDO: homeTeam.pdo.toFixed(1),
    awayPDO: awayTeam.pdo.toFixed(1),
    oddsSource: oddsData ? "ESPN" : "No odds",
    lookupKey: `${etDateKey}${game.homeAbbr}${game.awayAbbr}`,
  };
}

export const CSV_HEADERS: (keyof ExportRow)[] = [
  "date", "gameTime", "home", "away",
  "homeWinProb", "awayWinProb",
  "homeGoals", "awayGoals", "total",
  "vegaOU", "ouRec", "ouEdge",
  "homeML", "awayML", "vegaHomeML", "vegaAwayML", "vegaPuckLine", "vegaPuckLineHomeOdds", "vegaPuckLineAwayOdds", "vegaOverOdds", "vegaUnderOdds",
  "homeEdgePct", "awayEdgePct", "mlValueSide", "mlKelly",
  "puckLineRec", "puckLineEdge",
  "homeCorsi", "awayCorsi", "homeXGF", "awayXGF",
  "homeSV", "awaySV", "homeSVOverrideExport", "awaySVOverrideExport", "homePP", "awayPP", "homePK", "awayPK",
  "homePDO", "awayPDO", "oddsSource", "lookupKey",
];

export const CSV_HEADER_LABELS: string[] = [
  "Date", "Game Time", "Home", "Away",
  "Home Win %", "Away Win %",
  "Home Goals", "Away Goals", "Model Total",
  "Vegas O/U", "O/U Rec", "O/U Edge",
  "Home ML (Model)", "Away ML (Model)", "Vegas Home ML", "Vegas Away ML", "Vegas Puck Line", "Home PL Odds", "Away PL Odds", "Over Odds", "Under Odds",
  "Home ML Edge", "Away ML Edge", "ML Value Side", "ML Kelly %",
  "Puck Line Rec", "Puck Line Edge",
  "Home CF%", "Away CF%", "Home xGF%", "Away xGF%",
  "Home SV%", "Away SV%", "Home Goalie Override", "Away Goalie Override", "Home PP%", "Away PP%", "Home PK%", "Away PK%",
  "Home PDO", "Away PDO", "Odds Source", "LookupKey",
];

export function rowsToCSV(rows: ExportRow[]): string {
  const escape = (value: string) => `"${value.replace(/"/g, "\"\"")}"`;
  const header = CSV_HEADER_LABELS.map(escape).join(",");
  const body = rows.map((row) => CSV_HEADERS.map((key) => escape(row[key] ?? "")).join(",")).join("\n");
  return `${header}\n${body}`;
}

export function downloadCSV(csv: string, filename: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
