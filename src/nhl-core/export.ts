import { TEAMS } from "./data";
import { analyzeBetting, mlAmerican, predictGame } from "./engine";
import type { BettingAnalysis, ExportRow, LinesRow, LiveTeamStats } from "./types";

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

  const h = TEAMS[game.homeAbbr];
  const a = TEAMS[game.awayAbbr];
  const oddsData = row.editedOdds ?? row.espnOdds;
  const ba: BettingAnalysis | null = oddsData && oddsData.homeMoneyline !== 0 ? analyzeBetting(pred, oddsData) : null;

  return {
    date: etDateDisplay,
    gameTime: game.gameTime,
    home: `${game.homeAbbr} ${h.name}`,
    away: `${game.awayAbbr} ${a.name}`,
    homeWinProb: `${(pred.hWinProb * 100).toFixed(1)}%`,
    awayWinProb: `${(pred.aWinProb * 100).toFixed(1)}%`,
    homeGoals: pred.hGoals,
    awayGoals: pred.aGoals,
    total: pred.total,
    vegaOU: oddsData?.overUnder?.toFixed(1) ?? "-",
    ouRec: ba?.ouRec.toUpperCase() ?? "-",
    ouEdge: ba ? `${ba.ouEdge > 0 ? "+" : ""}${ba.ouEdge.toFixed(2)}` : "-",
    homeML: mlAmerican(pred.hWinProb),
    awayML: mlAmerican(pred.aWinProb),
    vegaHomeML: oddsData?.homeMoneyline ? `${oddsData.homeMoneyline > 0 ? "+" : ""}${oddsData.homeMoneyline}` : "-",
    vegaAwayML: oddsData?.awayMoneyline ? `${oddsData.awayMoneyline > 0 ? "+" : ""}${oddsData.awayMoneyline}` : "-",
    vegaPuckLine: oddsData?.puckLine != null ? `${oddsData.puckLine > 0 ? "+" : ""}${oddsData.puckLine.toFixed(1)}` : "-",
    vegaPuckLineHomeOdds: oddsData?.puckLineHomeOdds ? `${oddsData.puckLineHomeOdds > 0 ? "+" : ""}${oddsData.puckLineHomeOdds}` : "-",
    vegaPuckLineAwayOdds: oddsData?.puckLineAwayOdds ? `${oddsData.puckLineAwayOdds > 0 ? "+" : ""}${oddsData.puckLineAwayOdds}` : "-",
    vegaOverOdds: oddsData?.overOdds ? `${oddsData.overOdds > 0 ? "+" : ""}${oddsData.overOdds}` : "-",
    vegaUnderOdds: oddsData?.underOdds ? `${oddsData.underOdds > 0 ? "+" : ""}${oddsData.underOdds}` : "-",
    homeEdgePct: ba ? `${ba.homeEdge > 0 ? "+" : ""}${(ba.homeEdge * 100).toFixed(1)}%` : "-",
    awayEdgePct: ba ? `${ba.awayEdge > 0 ? "+" : ""}${(ba.awayEdge * 100).toFixed(1)}%` : "-",
    mlValueSide: ba ? (ba.mlValueSide === "none" ? "PASS" : `${ba.mlValueSide.toUpperCase()} ML`) : "-",
    mlKelly: ba && ba.mlValueSide !== "none" ? `${(Math.max(ba.kellyHome, ba.kellyAway) * 100).toFixed(1)}%` : "-",
    puckLineRec: ba ? (ba.puckLineRec === "pass" ? "PASS" : ba.puckLineRec.toUpperCase()) : "-",
    puckLineEdge: ba && ba.puckLineRec !== "pass" ? `+${ba.puckLineEdge.toFixed(1)}%` : "-",
    homeCorsi: `${h.cf.toFixed(1)}%`,
    awayCorsi: `${a.cf.toFixed(1)}%`,
    homeXGF: `${h.xgf.toFixed(1)}%`,
    awayXGF: `${a.xgf.toFixed(1)}%`,
    homeSV: `.${(h.goalieSV * 1000).toFixed(0)}`,
    awaySV: `.${(a.goalieSV * 1000).toFixed(0)}`,
    homeSVOverrideExport: row.homeSVOverride != null ? `.${(row.homeSVOverride * 1000).toFixed(0)}` : "-",
    awaySVOverrideExport: row.awaySVOverride != null ? `.${(row.awaySVOverride * 1000).toFixed(0)}` : "-",
    homePP: `${h.ppPct.toFixed(1)}%`,
    awayPP: `${a.ppPct.toFixed(1)}%`,
    homePK: `${h.pkPct.toFixed(1)}%`,
    awayPK: `${a.pkPct.toFixed(1)}%`,
    homePDO: h.pdo.toFixed(1),
    awayPDO: a.pdo.toFixed(1),
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
  const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
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
