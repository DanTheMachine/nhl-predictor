import { Fragment } from "react";

import { TEAMS } from "../nhl-core/data";
import type { GoalieInfo, LinesRow, LiveTeamStats, OddsData } from "../nhl-core/types";
import { isBulkPasteErrorStatus } from "./bulkPaste";
import { analyzeBetting } from "./engine";

interface SchedulePanelProps {
  linesRows: LinesRow[];
  scheduleStatus: string;
  scheduleLoading: boolean;
  goalieLoading: boolean;
  goalieRoster: Record<string, GoalieInfo[]>;
  showBulkPaste: boolean;
  bulkPasteText: string;
  bulkPasteStatus: string;
  showLinesTable: boolean;
  simsRunning: boolean;
  exportRunning: boolean;
  resultsRunning: boolean;
  liveStats: Record<string, LiveTeamStats>;
  onLoadSchedule: () => void;
  onLoadGoalies: () => void;
  onToggleBulkPaste: () => void;
  onRunAllSims: () => void;
  onExport: () => void;
  onFetchResults: () => void;
  onCloseBulkPaste: () => void;
  onBulkPasteTextChange: (value: string) => void;
  onApplyBulkPaste: () => void;
  onClearBulkPaste: () => void;
  onRunOneSim: (idx: number) => void;
  onToggleEditing: (idx: number) => void;
  onUpdateLinesField: (idx: number, field: keyof OddsData, raw: string) => void;
  setLinesRows: React.Dispatch<React.SetStateAction<LinesRow[]>>;
}

export function SchedulePanel({
  linesRows,
  scheduleStatus,
  scheduleLoading,
  goalieLoading,
  goalieRoster,
  showBulkPaste,
  bulkPasteText,
  bulkPasteStatus,
  showLinesTable,
  simsRunning,
  exportRunning,
  resultsRunning,
  liveStats,
  onLoadSchedule,
  onLoadGoalies,
  onToggleBulkPaste,
  onRunAllSims,
  onExport,
  onFetchResults,
  onCloseBulkPaste,
  onBulkPasteTextChange,
  onApplyBulkPaste,
  onClearBulkPaste,
  onRunOneSim,
  onToggleEditing,
  onUpdateLinesField,
  setLinesRows,
}: SchedulePanelProps) {
  const hasSimResults = linesRows.some((row) => row.simResult);
  const hasLoadedGoalies = Object.keys(goalieRoster).length > 0;
  const statusIsSuccess =
    (scheduleStatus.startsWith("✓") ||
      scheduleStatus.includes("loaded") ||
      scheduleStatus.includes("Exported") ||
      hasSimResults) &&
    !scheduleStatus.startsWith("Error:") &&
    !scheduleStatus.startsWith("No ");

  return (
    <div style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 8, padding: 18, marginTop: 8, marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: scheduleStatus ? 12 : 0 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#c3ced8", letterSpacing: 3, fontFamily: "monospace", marginBottom: 4 }}>TODAY'S LINES & EXPORT</div>
          <div style={{ fontSize: 12, color: "#b3c0cc" }}>Load schedule, edit any line, run all sims, export CSV</div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={onLoadSchedule} disabled={scheduleLoading} style={{ background: scheduleLoading ? "#161b22" : "#58a6ff", border: "none", borderRadius: 6, padding: "9px 16px", color: scheduleLoading ? "#6e7681" : "#0d1117", fontSize: 11, fontWeight: 900, letterSpacing: 2, fontFamily: "monospace", cursor: scheduleLoading ? "not-allowed" : "pointer", whiteSpace: "nowrap" }}>
            {scheduleLoading ? "LOADING..." : linesRows.length > 0 ? "RELOAD" : "LOAD TODAY'S GAMES"}
          </button>
          <button onClick={onLoadGoalies} disabled={goalieLoading} style={{ background: goalieLoading ? "#161b22" : hasLoadedGoalies ? "rgba(245,158,11,0.15)" : "#374151", border: `1px solid ${hasLoadedGoalies ? "rgba(245,158,11,0.4)" : "#4b5563"}`, borderRadius: 6, padding: "9px 16px", color: goalieLoading ? "#6e7681" : hasLoadedGoalies ? "#fde68a" : "#9ca3af", fontSize: 11, fontWeight: 900, letterSpacing: 2, fontFamily: "monospace", cursor: goalieLoading ? "not-allowed" : "pointer", whiteSpace: "nowrap" }}>
            {goalieLoading ? "LOADING..." : hasLoadedGoalies ? "GOALIES LOADED" : "LOAD GOALIES"}
          </button>
          {linesRows.length > 0 && (
            <button onClick={onToggleBulkPaste} style={{ background: showBulkPaste ? "rgba(168,85,247,0.2)" : "#1f2937", border: `1px solid ${showBulkPaste ? "rgba(168,85,247,0.5)" : "#374151"}`, borderRadius: 6, padding: "9px 16px", color: showBulkPaste ? "#c084fc" : "#9ca3af", fontSize: 11, fontWeight: 900, letterSpacing: 2, fontFamily: "monospace", cursor: "pointer", whiteSpace: "nowrap" }}>
              PASTE LINES
            </button>
          )}
          {linesRows.length > 0 && (
            <button onClick={onRunAllSims} disabled={simsRunning} style={{ background: simsRunning ? "#161b22" : "#d29922", border: "none", borderRadius: 6, padding: "9px 16px", color: simsRunning ? "#6e7681" : "#0d1117", fontSize: 11, fontWeight: 900, letterSpacing: 2, fontFamily: "monospace", cursor: simsRunning ? "not-allowed" : "pointer", whiteSpace: "nowrap" }}>
              {simsRunning ? "RUNNING..." : "RUN ALL SIMS"}
            </button>
          )}
          {hasSimResults && (
            <button onClick={onExport} disabled={exportRunning} style={{ background: exportRunning ? "#161b22" : "#3fb950", border: "none", borderRadius: 6, padding: "9px 16px", color: exportRunning ? "#6e7681" : "#0d1117", fontSize: 11, fontWeight: 900, letterSpacing: 2, fontFamily: "monospace", cursor: exportRunning ? "not-allowed" : "pointer", whiteSpace: "nowrap" }}>
              {exportRunning ? "EXPORTING..." : "PREDICTIONS CSV"}
            </button>
          )}
          <button onClick={onFetchResults} disabled={resultsRunning} style={{ background: resultsRunning ? "#161b22" : "linear-gradient(135deg,#0284c7,#0369a1)", border: "none", borderRadius: 6, padding: "9px 16px", color: resultsRunning ? "#6e7681" : "#e0f2fe", fontSize: 11, fontWeight: 900, letterSpacing: 2, fontFamily: "monospace", cursor: resultsRunning ? "not-allowed" : "pointer", whiteSpace: "nowrap" }}>
            {resultsRunning ? "FETCHING..." : "RESULTS CSV"}
          </button>
        </div>
      </div>

      {scheduleStatus && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: showLinesTable && linesRows.length > 0 ? 14 : 0, marginTop: 4 }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", flexShrink: 0, background: scheduleLoading || simsRunning ? "#58a6ff" : statusIsSuccess ? "#3fb950" : "#8b949e", animation: scheduleLoading || simsRunning ? "pulse 0.8s infinite" : "none" }} />
          <span style={{ fontSize: 12, color: scheduleLoading || simsRunning ? "#58a6ff" : statusIsSuccess ? "#3fb950" : "#8b949e", fontFamily: "monospace" }}>{scheduleStatus}</span>
        </div>
      )}

      {showBulkPaste && linesRows.length > 0 && (
        <div style={{ margin: "12px 0", background: "#0d1117", border: "1px solid rgba(168,85,247,0.35)", borderRadius: 8, padding: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 900, color: "#c084fc", letterSpacing: 2, fontFamily: "monospace" }}>PASTE LINES - BULK ODDS IMPORT</div>
              <div style={{ fontSize: 11, color: "#b3c0cc", marginTop: 3 }}>Paste DraftKings odds text below. Teams are matched to loaded games automatically.</div>
            </div>
            <button onClick={onCloseBulkPaste} style={{ background: "transparent", border: "none", color: "#b3c0cc", fontSize: 16, cursor: "pointer", padding: "0 4px" }}>x</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12, alignItems: "start" }}>
            <textarea
              value={bulkPasteText}
              onChange={(e) => onBulkPasteTextChange(e.target.value)}
              placeholder={"FLORIDA PANTHERS 001\n* + 1 1/2 - 190\n* O 6 - 110\n* + 145\nDETROIT RED WINGS 002\n* - 1 1/2 + 170\n* U 6 Even\n* - 155\n..."}
              style={{ width: "100%", minHeight: 200, background: "#161b22", border: "1px solid #30363d", borderRadius: 6, padding: "10px 12px", color: "#e6edf3", fontFamily: "monospace", fontSize: 12, resize: "vertical", boxSizing: "border-box", lineHeight: 1.5 }}
            />
            <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 140 }}>
              <button onClick={onApplyBulkPaste} style={{ background: "rgba(168,85,247,0.2)", border: "1px solid rgba(168,85,247,0.5)", borderRadius: 6, padding: "10px 16px", color: "#c084fc", fontSize: 11, fontWeight: 900, letterSpacing: 2, fontFamily: "monospace", cursor: "pointer", whiteSpace: "nowrap" }}>
                APPLY
              </button>
              <button onClick={onClearBulkPaste} style={{ background: "transparent", border: "1px solid #30363d", borderRadius: 6, padding: "10px 16px", color: "#b3c0cc", fontSize: 11, fontWeight: 900, letterSpacing: 2, fontFamily: "monospace", cursor: "pointer" }}>
                CLEAR
              </button>
              <div style={{ fontSize: 10, color: "#b3c0cc", lineHeight: 1.5, marginTop: 4 }}>
                <div style={{ fontWeight: 700, color: "#c3ced8", marginBottom: 4 }}>FORMAT:</div>
                <div>TEAM NAME NNN</div>
                <div>* +/- 1 1/2 ODDS</div>
                <div>* O/U LINE ODDS</div>
                <div>* MONEYLINE</div>
                <div style={{ marginTop: 6, color: "#8fa3b7" }}>TV and time lines are skipped automatically.</div>
              </div>
            </div>
          </div>
          {bulkPasteStatus && (
            <div style={{ marginTop: 10, fontSize: 12, color: isBulkPasteErrorStatus(bulkPasteStatus) ? "#f87171" : "#3fb950", fontFamily: "monospace" }}>
              {bulkPasteStatus}
            </div>
          )}
        </div>
      )}

      {showLinesTable && linesRows.length > 0 && (
        <div style={{ overflowX: "auto", borderRadius: 6, border: "1px solid #30363d" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "monospace", fontSize: 12 }}>
            <thead>
              <tr style={{ background: "#0d1117" }}>
                {["Time", "Matchup", "H ML", "A ML", "O/U", "H PL", "A PL", "H Win%", "A Win%", "Total", "ML Edge", "PL Rec", "O/U Rec", "B2B", "Sim", "Edit"].map((header) => (
                  <th key={header} style={{ padding: "7px 7px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "#c3ced8", letterSpacing: 1, borderBottom: "1px solid #30363d", whiteSpace: "nowrap" }}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {linesRows.map((row, idx) => {
                const odds = row.editedOdds;
                const sim = row.simResult;
                const betting = odds && odds.homeMoneyline !== 0 && sim ? analyzeBetting(sim, odds) : null;
                const hasSim = !!sim;
                const hasValue = betting && betting.mlValueSide !== "none";
                const rowBg = idx % 2 === 0 ? "#161b22" : "#0d1117";
                const edited =
                  odds &&
                  row.espnOdds &&
                  (odds.homeMoneyline !== row.espnOdds.homeMoneyline ||
                    odds.awayMoneyline !== row.espnOdds.awayMoneyline ||
                    odds.overUnder !== row.espnOdds.overUnder);

                const puckLineDirection = odds?.puckLine ?? -1.5;
                const homePuckLineLabel = puckLineDirection <= 0 ? "H -1.5 odds" : "H +1.5 odds";
                const awayPuckLineLabel = puckLineDirection <= 0 ? "A +1.5 odds" : "A -1.5 odds";
                const oddsFields: { field: keyof OddsData; label: string; placeholder: string }[] = [
                  { field: "homeMoneyline", label: "Home ML", placeholder: "-160" },
                  { field: "awayMoneyline", label: "Away ML", placeholder: "+140" },
                  { field: "overUnder", label: "O/U", placeholder: "5.5" },
                  { field: "puckLineHomeOdds", label: homePuckLineLabel, placeholder: "+145" },
                  { field: "puckLineAwayOdds", label: awayPuckLineLabel, placeholder: "-175" },
                  { field: "overOdds", label: "Over odds", placeholder: "-110" },
                  { field: "underOdds", label: "Under odds", placeholder: "-110" },
                ];

                return (
                  <Fragment key={`r${idx}`}>
                    <tr style={{ background: hasValue ? `linear-gradient(90deg,rgba(63,185,80,0.1),${rowBg})` : rowBg }}>
                      <td style={{ padding: "6px 7px", borderBottom: "1px solid #21262d", color: "#c3ced8", whiteSpace: "nowrap", fontSize: 11 }}>{row.game.gameTime}</td>
                      <td style={{ padding: "6px 7px", borderBottom: "1px solid #21262d", whiteSpace: "nowrap" }}>
                        <span style={{ fontWeight: 700, color: "#e6edf3" }}>{row.game.homeAbbr}</span>
                        <span style={{ color: "#b3c0cc", margin: "0 5px" }}>vs</span>
                        <span style={{ fontWeight: 700, color: "#e6edf3" }}>{row.game.awayAbbr}</span>
                        {edited && <span style={{ marginLeft: 6, fontSize: 9, color: "#d29922", background: "rgba(210,153,34,0.12)", padding: "1px 5px", borderRadius: 3 }}>EDITED</span>}
                      </td>
                      {([odds?.homeMoneyline, odds?.awayMoneyline, odds?.overUnder, odds?.puckLineHomeOdds, odds?.puckLineAwayOdds] as (number | undefined)[]).map((value, valueIndex) => {
                        const direction = odds?.puckLine ?? -1.5;
                        let label = "";
                        if (valueIndex === 3) label = direction <= 0 ? "H-1.5 " : "H+1.5 ";
                        if (valueIndex === 4) label = direction <= 0 ? "A+1.5 " : "A-1.5 ";
                        const formattedValue =
                          value == null
                            ? "-"
                            : valueIndex === 2
                              ? value.toFixed(1)
                              : valueIndex >= 3
                                ? `${value > 0 ? "+" : ""}${value} (${label.trim()})`
                                : `${value > 0 ? "+" : ""}${value}`;
                        return (
                          <td key={valueIndex} style={{ padding: "6px 7px", borderBottom: "1px solid #21262d", color: value !== undefined ? "#cae8ff" : "#3d444d", fontFamily: "monospace", whiteSpace: "nowrap", fontSize: 11 }}>
                            {formattedValue}
                          </td>
                        );
                      })}
                      <td style={{ padding: "6px 7px", borderBottom: "1px solid #21262d", color: hasSim ? "#3fb950" : "#3d444d", fontWeight: hasSim ? 700 : 400 }}>{hasSim ? `${(sim!.hWinProb * 100).toFixed(1)}%` : "-"}</td>
                      <td style={{ padding: "6px 7px", borderBottom: "1px solid #21262d", color: hasSim ? "#3fb950" : "#3d444d", fontWeight: hasSim ? 700 : 400 }}>{hasSim ? `${(sim!.aWinProb * 100).toFixed(1)}%` : "-"}</td>
                      <td style={{ padding: "6px 7px", borderBottom: "1px solid #21262d", color: hasSim ? "#58a6ff" : "#3d444d", fontWeight: hasSim ? 700 : 400 }}>{hasSim ? sim!.total : "-"}</td>
                      <td style={{ padding: "6px 7px", borderBottom: "1px solid #21262d", whiteSpace: "nowrap" }}>
                        {betting ? <span style={{ color: hasValue ? "#3fb950" : "#6e7681", fontWeight: hasValue ? 700 : 400 }}>{hasValue ? `${betting.mlValueSide.toUpperCase()} +${betting.mlValuePct.toFixed(1)}%` : "PASS"}</span> : "-"}
                      </td>
                      <td style={{ padding: "6px 7px", borderBottom: "1px solid #21262d", color: betting && betting.puckLineRec !== "pass" ? "#3fb950" : "#6e7681", fontWeight: betting && betting.puckLineRec !== "pass" ? 700 : 400, whiteSpace: "nowrap" }}>
                        {betting ? (betting.puckLineRec === "pass" ? "PASS" : betting.puckLineRec.toUpperCase()) : "-"}
                      </td>
                      <td style={{ padding: "6px 7px", borderBottom: "1px solid #21262d", color: betting && betting.ouRec !== "pass" ? "#3fb950" : "#6e7681", fontWeight: betting && betting.ouRec !== "pass" ? 700 : 400 }}>
                        {betting ? (betting.ouRec === "pass" ? "PASS" : `${betting.ouRec.toUpperCase()} (+${(Math.abs(betting.ouEdge) * 100).toFixed(1)}%)`) : "-"}
                      </td>
                      <td style={{ padding: "6px 10px", borderBottom: "1px solid #21262d", whiteSpace: "nowrap" }}>
                        <button onClick={() => onRunOneSim(idx)} style={{ background: hasSim ? "rgba(63,185,80,0.1)" : "rgba(88,166,255,0.1)", border: `1px solid ${hasSim ? "#3fb95055" : "#58a6ff55"}`, borderRadius: 4, padding: "3px 9px", color: hasSim ? "#3fb950" : "#58a6ff", fontSize: 10, fontWeight: 700, fontFamily: "monospace", cursor: "pointer" }}>
                          {hasSim ? "RE-RUN" : "RUN"}
                        </button>
                      </td>
                      <td style={{ padding: "6px 7px", borderBottom: "1px solid #21262d" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                          {([
                            ["homeB2B", row.game.homeAbbr],
                            ["awayB2B", row.game.awayAbbr],
                          ] as const).map(([field, abbr]) => {
                            const active = row[field];
                            return (
                              <button
                                key={`${idx}-${field}`}
                                onClick={() =>
                                  setLinesRows((prev) =>
                                    prev.map((entry, entryIndex) =>
                                      entryIndex === idx ? { ...entry, [field]: !entry[field], simResult: null } : entry,
                                    ),
                                  )
                                }
                                style={{ background: active ? "rgba(251,113,133,0.15)" : "transparent", border: `1px solid ${active ? "rgba(251,113,133,0.4)" : "#30363d"}`, borderRadius: 3, padding: "2px 6px", color: active ? "#fda4af" : "#6e7681", fontSize: 9, fontWeight: 700, fontFamily: "monospace", cursor: "pointer", whiteSpace: "nowrap" }}
                              >
                                {abbr} B2B
                              </button>
                            );
                          })}
                          {row.homeSVOverride != null && <span style={{ fontSize: 9, color: "#f59e0b", fontFamily: "monospace", background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)", borderRadius: 3, padding: "1px 5px", whiteSpace: "nowrap" }}>{row.game.homeAbbr} .{(row.homeSVOverride * 1000).toFixed(0)}</span>}
                          {row.awaySVOverride != null && <span style={{ fontSize: 9, color: "#f59e0b", fontFamily: "monospace", background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)", borderRadius: 3, padding: "1px 5px", whiteSpace: "nowrap" }}>{row.game.awayAbbr} .{(row.awaySVOverride * 1000).toFixed(0)}</span>}
                        </div>
                      </td>
                      <td style={{ padding: "6px 7px", borderBottom: "1px solid #21262d" }}>
                        <button onClick={() => onToggleEditing(idx)} style={{ background: row.isEditing ? "rgba(210,153,34,0.15)" : "transparent", border: `1px solid ${row.isEditing ? "#d29922" : "#30363d"}`, borderRadius: 4, padding: "3px 10px", color: row.isEditing ? "#d29922" : "#6e7681", fontSize: 10, fontWeight: 700, fontFamily: "monospace", cursor: "pointer" }}>
                          {row.isEditing ? "DONE" : "EDIT"}
                        </button>
                      </td>
                    </tr>
                    {row.isEditing && (
                      <tr style={{ background: "rgba(210,153,34,0.05)" }}>
                        <td colSpan={15} style={{ padding: "12px 14px", borderBottom: "1px solid #30363d" }}>
                          <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
                            <span style={{ fontSize: 10, fontWeight: 700, color: "#d29922", letterSpacing: 2, fontFamily: "monospace" }}>
                              EDIT LINES - {row.game.homeAbbr} vs {row.game.awayAbbr}
                            </span>
                            <span style={{ fontSize: 10, color: "#8b949e", fontFamily: "monospace", marginLeft: 4 }}>PUCK LINE:</span>
                            {([-1.5, 1.5] as const).map((value) => {
                              const active = (odds?.puckLine ?? -1.5) === value;
                              return (
                                <button
                                  key={value}
                                  onClick={() => onUpdateLinesField(idx, "puckLine", String(value))}
                                  style={{ background: active ? "rgba(100,180,255,0.15)" : "transparent", border: `1px solid ${active ? "#58a6ff" : "#30363d"}`, borderRadius: 3, padding: "2px 10px", color: active ? "#cae8ff" : "#6e7681", fontSize: 10, fontWeight: 700, fontFamily: "monospace", cursor: "pointer" }}
                                >
                                  {value < 0 ? `${row.game.homeAbbr} -1.5` : `${row.game.awayAbbr} -1.5`}
                                </button>
                              );
                            })}
                            {row.espnOdds && (
                              <button
                                onClick={() =>
                                  setLinesRows((prev) =>
                                    prev.map((entry, entryIndex) =>
                                      entryIndex === idx ? { ...entry, editedOdds: { ...entry.espnOdds! } } : entry,
                                    ),
                                  )
                                }
                                style={{ marginLeft: 4, fontSize: 9, padding: "2px 8px", background: "transparent", border: "1px solid #30363d", borderRadius: 3, color: "#8b949e", cursor: "pointer", fontFamily: "monospace" }}
                              >
                                RESET TO ESPN
                              </button>
                            )}
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 10 }}>
                            {oddsFields.map(({ field, label, placeholder }) => (
                              <div key={field}>
                                <div style={{ fontSize: 9, fontWeight: 600, color: "#8b949e", marginBottom: 4, letterSpacing: 1 }}>{label}</div>
                                <input
                                  type="text"
                                  key={`${idx}-${field}-${odds?.[field] ?? ""}`}
                                  defaultValue={odds?.[field] != null && odds[field] !== 0 ? String(odds[field]) : ""}
                                  placeholder={placeholder}
                                  onBlur={(e) => onUpdateLinesField(idx, field, e.target.value)}
                                  style={{ background: "#0d1117", border: "1px solid #30363d", borderRadius: 4, padding: "6px 9px", color: "#cae8ff", fontFamily: "monospace", fontSize: 13, width: "100%", boxSizing: "border-box" }}
                                />
                              </div>
                            ))}
                          </div>

                          <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid rgba(245,158,11,0.15)" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                              <div style={{ fontSize: 10, fontWeight: 700, color: "#f59e0b", letterSpacing: 2, fontFamily: "monospace" }}>GOALIE OVERRIDE</div>
                              {!hasLoadedGoalies && (
                                <span style={{ fontSize: 10, color: "#6e7681", fontFamily: "monospace" }}>
                                  load goalies above for quick-pick, or enter manually below
                                </span>
                              )}
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                              {([
                                { abbr: row.game.homeAbbr, field: "homeSVOverride" as const },
                                { abbr: row.game.awayAbbr, field: "awaySVOverride" as const },
                              ]).map(({ abbr, field }) => {
                                const currentValue = row[field];
                                const defaultSV = liveStats[abbr]?.goalieSV ?? TEAMS[abbr]?.goalieSV;
                                const goalies = goalieRoster[abbr] ?? [];

                                return (
                                  <div key={field}>
                                    <div style={{ fontSize: 10, fontWeight: 700, color: "#f59e0b", marginBottom: 4, letterSpacing: 1 }}>
                                      {abbr} GOALIE
                                      {currentValue != null && <span style={{ marginLeft: 8, color: "#fde68a", fontWeight: 400 }}>ACTIVE .{(currentValue * 1000).toFixed(0)}</span>}
                                    </div>
                                    <div style={{ fontSize: 9, color: "#6e7681", marginBottom: 6 }}>
                                      Team default SV%: .{defaultSV ? (defaultSV * 1000).toFixed(0) : "???"}
                                    </div>

                                    {goalies.length > 0 && (
                                      <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 8 }}>
                                        {goalies.slice(0, 4).map((goalie, goalieIndex) => {
                                          const isActive = currentValue != null && Math.abs(currentValue - goalie.sv) < 0.0005;
                                          const isStarter = goalieIndex === 0;
                                          return (
                                            <button
                                              key={goalieIndex}
                                              onClick={() =>
                                                setLinesRows((prev) =>
                                                  prev.map((entry, entryIndex) =>
                                                    entryIndex === idx ? { ...entry, [field]: isActive ? null : goalie.sv, simResult: null } : entry,
                                                  ),
                                                )
                                              }
                                              style={{ background: isActive ? "rgba(245,158,11,0.2)" : isStarter ? "rgba(63,185,80,0.08)" : "rgba(100,180,255,0.06)", border: `1px solid ${isActive ? "#f59e0b" : isStarter ? "rgba(63,185,80,0.3)" : "rgba(100,180,255,0.2)"}`, borderRadius: 4, padding: "4px 8px", cursor: "pointer", fontFamily: "monospace", fontSize: 10, color: isActive ? "#fde68a" : isStarter ? "#86efac" : "#93c5fd", whiteSpace: "nowrap" }}
                                            >
                                              {goalie.name.split(" ").pop()} .{(goalie.sv * 1000).toFixed(0)}
                                              <span style={{ fontSize: 9, marginLeft: 4, opacity: 0.7 }}>({goalie.gp}GS)</span>
                                            </button>
                                          );
                                        })}
                                        {currentValue != null && (
                                          <button
                                            onClick={() =>
                                              setLinesRows((prev) =>
                                                prev.map((entry, entryIndex) =>
                                                  entryIndex === idx ? { ...entry, [field]: null, simResult: null } : entry,
                                                ),
                                              )
                                            }
                                            style={{ background: "transparent", border: "1px solid #30363d", borderRadius: 4, padding: "4px 8px", color: "#6e7681", fontSize: 10, cursor: "pointer", fontFamily: "monospace" }}
                                          >
                                            CLEAR
                                          </button>
                                        )}
                                      </div>
                                    )}

                                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                      <input
                                        type="text"
                                        key={`${idx}-${field}-${currentValue}`}
                                        defaultValue={currentValue != null ? String((currentValue * 1000).toFixed(0)) : ""}
                                        placeholder={defaultSV ? `${(defaultSV * 1000).toFixed(0)} (default)` : "e.g. 905"}
                                        onBlur={(e) => {
                                          const raw = e.target.value.trim();
                                          if (!raw) {
                                            setLinesRows((prev) =>
                                              prev.map((entry, entryIndex) =>
                                                entryIndex === idx ? { ...entry, [field]: null, simResult: null } : entry,
                                              ),
                                            );
                                            return;
                                          }
                                          let value = parseFloat(raw);
                                          if (value > 1) value = value / 1000;
                                          if (value >= 0.85 && value <= 0.99) {
                                            setLinesRows((prev) =>
                                              prev.map((entry, entryIndex) =>
                                                entryIndex === idx ? { ...entry, [field]: value, simResult: null } : entry,
                                              ),
                                            );
                                          }
                                        }}
                                        style={{ background: "#0d1117", border: `1px solid ${currentValue != null ? "#f59e0b" : "#30363d"}`, borderRadius: 4, padding: "5px 8px", color: "#fde68a", fontFamily: "monospace", fontSize: 12, width: 100, boxSizing: "border-box" }}
                                      />
                                      <span style={{ fontSize: 9, color: "#6e7681" }}>or type SV% (e.g. 905)</span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
