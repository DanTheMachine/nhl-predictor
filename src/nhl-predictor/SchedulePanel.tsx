import { Fragment } from "react";

import { TEAMS } from "../nhl-core/data";
import type { GoalieInfo, LinesRow, LiveTeamStats, OddsData } from "../nhl-core/types";
import { isBulkPasteErrorStatus } from "./bulkPaste";
import { analyzeBetting } from "./engine";
import { formatGoalieOverrideTag, getEstimatedGoalieIndex, getEstimatedGoalieLabel, reconcileGoalieOverride } from "./goalieSelection";

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
    <div className="nhl-card" style={{ marginTop: 4, marginBottom: 14 }}>
      {/* Header row */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexWrap: "wrap", gap: 12,
        marginBottom: scheduleStatus ? 14 : 0,
      }}>
        <div>
          <div className="label" style={{ marginBottom: 4 }}>Today's Lines & Export</div>
          <div style={{ fontSize: 12, color: "var(--text-2)", fontFamily: "var(--font-mono)" }}>
            Load schedule, edit any line, run all sims, export CSV
          </div>
        </div>
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
          <button
            onClick={onLoadSchedule}
            disabled={scheduleLoading}
            className="btn btn-primary"
            style={{ fontSize: 10 }}
          >
            {scheduleLoading ? "Loading…" : linesRows.length > 0 ? "Reload" : "Load Today's Games"}
          </button>
          <button
            onClick={onLoadGoalies}
            disabled={goalieLoading}
            className={`btn ${hasLoadedGoalies ? "btn-amber-ghost" : "btn-ghost"}`}
            style={{ fontSize: 10 }}
          >
            {goalieLoading ? "Loading…" : hasLoadedGoalies ? "Goalies Loaded" : "Load Goalies"}
          </button>
          {linesRows.length > 0 && (
            <button
              onClick={onToggleBulkPaste}
              className={`btn ${showBulkPaste ? "btn-purple-ghost" : "btn-ghost"}`}
              style={{ fontSize: 10 }}
            >
              Paste Lines
            </button>
          )}
          {linesRows.length > 0 && (
            <button
              onClick={onRunAllSims}
              disabled={simsRunning}
              className={`btn ${hasSimResults ? "btn-primary" : "btn-cyan"}`}
              style={{ fontSize: 10 }}
            >
              {simsRunning ? "Running…" : "Run All Sims"}
            </button>
          )}
          {hasSimResults && (
            <button
              onClick={onExport}
              disabled={exportRunning}
              className="btn btn-success"
              style={{ fontSize: 10 }}
            >
              {exportRunning ? "Exporting…" : "Predictions CSV"}
            </button>
          )}
          <button
            onClick={onFetchResults}
            disabled={resultsRunning}
            className="btn btn-primary"
            style={{ fontSize: 10 }}
          >
            {resultsRunning ? "Fetching…" : "Results CSV"}
          </button>
        </div>
      </div>

      {/* Status line */}
      {scheduleStatus && (
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          marginBottom: showLinesTable && linesRows.length > 0 ? 14 : 0,
        }}>
          <span
            className={`dot ${
              scheduleLoading || simsRunning
                ? "dot--fetch"
                : statusIsSuccess
                  ? "dot--live"
                  : "dot--idle"
            }`}
          />
          <span style={{
            fontSize: 11,
            fontFamily: "var(--font-mono)",
            color: scheduleLoading || simsRunning
              ? "var(--cyan)"
              : statusIsSuccess
                ? "var(--green)"
                : "var(--text-2)",
          }}>{scheduleStatus}</span>
        </div>
      )}

      {/* Bulk paste panel */}
      {showBulkPaste && linesRows.length > 0 && (
        <div style={{
          margin: "12px 0",
          background: "rgba(0,0,0,0.3)",
          border: "1px solid var(--purple-border)",
          borderRadius: "var(--r-lg)",
          padding: 16,
        }}>
          <div style={{
            display: "flex", justifyContent: "space-between",
            alignItems: "center", marginBottom: 12,
          }}>
            <div>
              <div className="label" style={{ color: "var(--purple)", marginBottom: 4 }}>Paste Lines – Bulk Odds Import</div>
              <div style={{ fontSize: 11, color: "var(--text-2)", fontFamily: "var(--font-mono)" }}>
                Paste DraftKings odds text below. Teams are matched to loaded games automatically.
              </div>
            </div>
            <button
              onClick={onCloseBulkPaste}
              style={{
                background: "transparent", border: "none",
                color: "var(--text-2)", fontSize: 18, cursor: "pointer", padding: "0 4px",
              }}
            >×</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12, alignItems: "start" }}>
            <textarea
              value={bulkPasteText}
              onChange={(e) => onBulkPasteTextChange(e.target.value)}
              placeholder={"FLORIDA PANTHERS 001\n* + 1 1/2 - 190\n* O 6 - 110\n* + 145\nDETROIT RED WINGS 002\n* - 1 1/2 + 170\n* U 6 Even\n* - 155\n..."}
              style={{
                width: "100%", minHeight: 200,
                background: "rgba(0,0,0,0.4)",
                border: "1px solid var(--border-1)",
                borderRadius: "var(--r)",
                padding: "10px 12px",
                color: "var(--text)",
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                resize: "vertical",
                boxSizing: "border-box",
                lineHeight: 1.6,
                outline: "none",
              }}
            />
            <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 130 }}>
              <button onClick={onApplyBulkPaste} className="btn btn-purple-ghost" style={{ fontSize: 10, whiteSpace: "nowrap" }}>
                Apply
              </button>
              <button onClick={onClearBulkPaste} className="btn btn-ghost" style={{ fontSize: 10 }}>
                Clear
              </button>
              <div style={{
                fontSize: 10, color: "var(--text-2)",
                fontFamily: "var(--font-mono)",
                lineHeight: 1.7, marginTop: 4,
              }}>
                <div style={{ fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>Format:</div>
                <div>TEAM NAME NNN</div>
                <div>* +/- 1 1/2 ODDS</div>
                <div>* O/U LINE ODDS</div>
                <div>* MONEYLINE</div>
                <div style={{ marginTop: 6, color: "var(--text-3)" }}>TV and time lines are skipped automatically.</div>
              </div>
            </div>
          </div>
          {bulkPasteStatus && (
            <div style={{
              marginTop: 10, fontSize: 11,
              fontFamily: "var(--font-mono)",
              color: isBulkPasteErrorStatus(bulkPasteStatus) ? "var(--red)" : "var(--green)",
            }}>
              {bulkPasteStatus}
            </div>
          )}
        </div>
      )}

      {/* Lines table */}
      {showLinesTable && linesRows.length > 0 && (
        <div style={{ overflowX: "auto", borderRadius: "var(--r)", border: "1px solid var(--border-1)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--font-mono)", fontSize: 11 }}>
            <thead>
              <tr style={{ background: "rgba(0,0,0,0.35)" }}>
                {["Time", "Matchup", "H ML", "A ML", "O/U", "H PL", "A PL", "H Win%", "A Win%", "Total", "ML Edge", "PL Rec", "O/U Rec", "B2B", "Sim", "Edit"].map((header) => (
                  <th key={header} style={{
                    padding: "8px 8px", textAlign: "left",
                    fontSize: 9, fontWeight: 700, color: "var(--text-2)",
                    letterSpacing: "0.1em", textTransform: "uppercase",
                    borderBottom: "1px solid var(--border-1)",
                    whiteSpace: "nowrap",
                  }}>{header}</th>
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
                const rowBg = hasValue
                  ? "rgba(74,222,128,0.04)"
                  : idx % 2 === 0
                    ? "rgba(255,255,255,0.015)"
                    : "transparent";
                const edited =
                  odds &&
                  row.espnOdds &&
                  (odds.homeMoneyline !== row.espnOdds.homeMoneyline ||
                    odds.awayMoneyline !== row.espnOdds.awayMoneyline ||
                    odds.overUnder !== row.espnOdds.overUnder);

                const puckLineDirection = odds?.puckLine ?? -1.5;
                const homePuckLineLabel = puckLineDirection <= 0 ? "H -1.5 odds" : "H +1.5 odds";
                const awayPuckLineLabel = puckLineDirection <= 0 ? "A +1.5 odds" : "A -1.5 odds";
                const homeGoalieLabel = getEstimatedGoalieLabel(goalieRoster, row.game.homeAbbr, row.homeB2B, row.homeSVOverride);
                const awayGoalieLabel = getEstimatedGoalieLabel(goalieRoster, row.game.awayAbbr, row.awayB2B, row.awaySVOverride);
                const oddsFields: { field: keyof OddsData; label: string; placeholder: string }[] = [
                  { field: "homeMoneyline", label: "Home ML", placeholder: "-160" },
                  { field: "awayMoneyline", label: "Away ML", placeholder: "+140" },
                  { field: "overUnder", label: "O/U", placeholder: "5.5" },
                  { field: "puckLineHomeOdds", label: homePuckLineLabel, placeholder: "+145" },
                  { field: "puckLineAwayOdds", label: awayPuckLineLabel, placeholder: "-175" },
                  { field: "overOdds", label: "Over odds", placeholder: "-110" },
                  { field: "underOdds", label: "Under odds", placeholder: "-110" },
                ];

                const tdStyle = {
                  padding: "7px 8px",
                  borderBottom: "1px solid var(--border-0)",
                  fontFamily: "var(--font-mono)",
                };

                return (
                  <Fragment key={`r${idx}`}>
                    <tr style={{ background: rowBg }}>
                      <td style={{ ...tdStyle, color: "var(--text-2)", whiteSpace: "nowrap", fontSize: 10 }}>
                        {row.game.gameTime}
                      </td>
                      <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>
                        <span style={{ fontWeight: 700, color: "var(--text)" }}>{row.game.awayAbbr}</span>
                        <span style={{ color: "var(--text-2)", margin: "0 5px" }}>at</span>
                        <span style={{ fontWeight: 700, color: "var(--text)" }}>{row.game.homeAbbr}</span>
                        {edited && <span className="chip chip--amber" style={{ marginLeft: 6 }}>Edited</span>}
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
                          <td key={valueIndex} style={{
                            ...tdStyle,
                            color: value !== undefined ? "var(--cyan)" : "var(--text-3)",
                            whiteSpace: "nowrap",
                          }}>
                            {formattedValue}
                          </td>
                        );
                      })}
                      <td style={{ ...tdStyle, color: hasSim ? "var(--green)" : "var(--text-3)", fontWeight: hasSim ? 700 : 400 }}>
                        {hasSim ? `${(sim!.hWinProb * 100).toFixed(1)}%` : "-"}
                      </td>
                      <td style={{ ...tdStyle, color: hasSim ? "var(--green)" : "var(--text-3)", fontWeight: hasSim ? 700 : 400 }}>
                        {hasSim ? `${(sim!.aWinProb * 100).toFixed(1)}%` : "-"}
                      </td>
                      <td style={{ ...tdStyle, color: hasSim ? "var(--blue)" : "var(--text-3)", fontWeight: hasSim ? 700 : 400 }}>
                        {hasSim ? sim!.total : "-"}
                      </td>
                      <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>
                        {betting ? (
                          <span style={{ color: hasValue ? "var(--green)" : "var(--text-3)", fontWeight: hasValue ? 700 : 400 }}>
                            {hasValue ? `${betting.mlValueSide === "home" ? row.game.homeAbbr : row.game.awayAbbr} +${betting.mlValuePct.toFixed(1)}%` : "PASS"}
                          </span>
                        ) : "-"}
                      </td>
                      <td style={{ ...tdStyle, color: betting && betting.puckLineRec !== "pass" ? "var(--green)" : "var(--text-3)", fontWeight: betting && betting.puckLineRec !== "pass" ? 700 : 400, whiteSpace: "nowrap" }}>
                        {betting ? (betting.puckLineRec === "pass" ? "PASS" : betting.puckLineRec.replace(/^home/, row.game.homeAbbr).replace(/^away/, row.game.awayAbbr).toUpperCase()) : "-"}
                      </td>
                      <td style={{ ...tdStyle, color: betting && betting.ouRec !== "pass" ? "var(--green)" : "var(--text-3)", fontWeight: betting && betting.ouRec !== "pass" ? 700 : 400 }}>
                        {betting ? (betting.ouRec === "pass" ? "PASS" : `${betting.ouRec.toUpperCase()} (+${(Math.abs(betting.ouEdge) * 100).toFixed(1)}%)`) : "-"}
                      </td>
                      <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>
                        <button
                          onClick={() => onRunOneSim(idx)}
                          style={{
                            background: hasSim ? "var(--green-lo)" : "var(--blue-lo)",
                            border: `1px solid ${hasSim ? "var(--green-border)" : "var(--blue-border)"}`,
                            borderRadius: "var(--r-sm)",
                            padding: "3px 9px",
                            color: hasSim ? "var(--green)" : "var(--blue)",
                            fontSize: 9, fontWeight: 700,
                            fontFamily: "var(--font-mono)",
                            cursor: "pointer",
                            transition: "all 0.15s",
                          }}
                        >
                          {hasSim ? "Re-Run" : "Run"}
                        </button>
                      </td>
                      <td style={tdStyle}>
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
                                      entryIndex === idx
                                        ? (() => {
                                            const nextB2B = !entry[field];
                                            const isHomeField = field === "homeB2B";
                                            return {
                                              ...entry,
                                              [field]: nextB2B,
                                              [isHomeField ? "homeSVOverride" : "awaySVOverride"]: reconcileGoalieOverride(
                                                isHomeField ? entry.homeSVOverride : entry.awaySVOverride,
                                                entry[field],
                                                nextB2B,
                                                goalieRoster,
                                                isHomeField ? entry.game.homeAbbr : entry.game.awayAbbr,
                                              ),
                                              simResult: null,
                                            };
                                          })()
                                        : entry,
                                    ),
                                  )
                                }
                                style={{
                                  background: active ? "var(--red-lo)" : "transparent",
                                  border: `1px solid ${active ? "var(--red-border)" : "var(--border-0)"}`,
                                  borderRadius: "var(--r-sm)",
                                  padding: "2px 6px",
                                  color: active ? "var(--red)" : "var(--text-3)",
                                  fontSize: 9, fontWeight: 700,
                                  fontFamily: "var(--font-mono)",
                                  cursor: "pointer",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {abbr} B2B
                              </button>
                            );
                          })}
                          {row.homeSVOverride != null && (
                            <span className="chip chip--amber" style={{ fontSize: 9 }}>
                              {formatGoalieOverrideTag(row.game.homeAbbr, row.homeSVOverride, homeGoalieLabel)}
                            </span>
                          )}
                          {row.awaySVOverride != null && (
                            <span className="chip chip--amber" style={{ fontSize: 9 }}>
                              {formatGoalieOverrideTag(row.game.awayAbbr, row.awaySVOverride, awayGoalieLabel)}
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={tdStyle}>
                        <button
                          onClick={() => onToggleEditing(idx)}
                          style={{
                            background: row.isEditing ? "var(--amber-lo)" : "transparent",
                            border: `1px solid ${row.isEditing ? "var(--amber-border)" : "var(--border-1)"}`,
                            borderRadius: "var(--r-sm)",
                            padding: "3px 10px",
                            color: row.isEditing ? "var(--amber)" : "var(--text-2)",
                            fontSize: 9, fontWeight: 700,
                            fontFamily: "var(--font-mono)",
                            cursor: "pointer",
                            transition: "all 0.15s",
                          }}
                        >
                          {row.isEditing ? "Done" : "Edit"}
                        </button>
                      </td>
                    </tr>
                    {row.isEditing && (
                      <tr style={{ background: "rgba(251,191,36,0.03)" }}>
                        <td colSpan={15} style={{ padding: "14px 16px", borderBottom: "1px solid var(--border-1)" }}>
                          <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
                            <span className="label" style={{ color: "var(--amber)" }}>
                              Edit Lines — {row.game.homeAbbr} vs {row.game.awayAbbr}
                            </span>
                            <span className="label">Puck Line:</span>
                            {([-1.5, 1.5] as const).map((value) => {
                              const active = (odds?.puckLine ?? -1.5) === value;
                              return (
                                <button
                                  key={value}
                                  onClick={() => onUpdateLinesField(idx, "puckLine", String(value))}
                                  style={{
                                    background: active ? "var(--blue-lo)" : "transparent",
                                    border: `1px solid ${active ? "var(--blue-border)" : "var(--border-1)"}`,
                                    borderRadius: "var(--r-sm)",
                                    padding: "3px 10px",
                                    color: active ? "var(--blue)" : "var(--text-2)",
                                    fontSize: 9, fontWeight: 700,
                                    fontFamily: "var(--font-mono)",
                                    cursor: "pointer",
                                  }}
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
                                style={{
                                  marginLeft: 4, fontSize: 9, padding: "2px 8px",
                                  background: "transparent", border: "1px solid var(--border-1)",
                                  borderRadius: "var(--r-sm)", color: "var(--text-2)",
                                  cursor: "pointer", fontFamily: "var(--font-mono)",
                                }}
                              >
                                Reset to ESPN
                              </button>
                            )}
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 10 }}>
                            {oddsFields.map(({ field, label, placeholder }) => (
                              <div key={field}>
                                <div style={{ fontSize: 9, fontWeight: 600, color: "var(--text-2)", marginBottom: 5, letterSpacing: "0.08em", textTransform: "uppercase" }}>{label}</div>
                                <input
                                  type="text"
                                  key={`${idx}-${field}-${odds?.[field] ?? ""}`}
                                  defaultValue={odds?.[field] != null && odds[field] !== 0 ? String(odds[field]) : ""}
                                  placeholder={placeholder}
                                  onBlur={(e) => onUpdateLinesField(idx, field, e.target.value)}
                                  className="input"
                                  style={{ fontSize: 12 }}
                                />
                              </div>
                            ))}
                          </div>

                          {/* Goalie override */}
                          <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--amber-border)" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                              <div className="label" style={{ color: "var(--amber)" }}>Goalie Override</div>
                              {!hasLoadedGoalies && (
                                <span style={{ fontSize: 10, color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>
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
                                const isB2B = field === "homeSVOverride" ? row.homeB2B : row.awayB2B;
                                const estimatedLabel = getEstimatedGoalieLabel(goalieRoster, abbr, isB2B, currentValue);
                                const estimatedIndex = getEstimatedGoalieIndex(goalieRoster, abbr, isB2B);

                                return (
                                  <div key={field}>
                                    <div style={{ fontSize: 10, fontWeight: 700, color: "var(--amber)", marginBottom: 4, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                                      {abbr} Goalie
                                      {currentValue != null && (
                                        <span style={{ marginLeft: 8, color: "var(--amber)", fontWeight: 400, opacity: 0.7 }}>
                                          Active .{(currentValue * 1000).toFixed(0)}
                                        </span>
                                      )}
                                    </div>
                                    {estimatedLabel && (
                                      <div style={{ fontSize: 9, color: "var(--green)", marginBottom: 6, fontFamily: "var(--font-mono)" }}>
                                        {estimatedLabel === "1st" ? "Estimated Regular Starting Goalie" : "Estimated Backup Goalie"}
                                      </div>
                                    )}
                                    <div style={{ fontSize: 9, color: "var(--text-3)", marginBottom: 6, fontFamily: "var(--font-mono)" }}>
                                      Team default SV%: .{defaultSV ? (defaultSV * 1000).toFixed(0) : "???"}
                                    </div>

                                    {goalies.length > 0 && (
                                      <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 8 }}>
                                        {goalies.slice(0, 4).map((goalie, goalieIndex) => {
                                          const isEstimatedActive =
                                            estimatedLabel != null &&
                                            estimatedIndex != null &&
                                            goalieIndex === estimatedIndex;
                                          const isActive = isEstimatedActive || (estimatedLabel == null && currentValue != null && Math.abs(currentValue - goalie.sv) < 0.0005);
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
                                              style={{
                                                background: isActive ? "var(--green-lo)" : isStarter ? "rgba(74,222,128,0.04)" : "var(--blue-lo)",
                                                border: `1px solid ${isActive ? "var(--green-border)" : isStarter ? "rgba(74,222,128,0.15)" : "var(--blue-border)"}`,
                                                borderRadius: "var(--r-sm)",
                                                padding: "4px 9px",
                                                cursor: "pointer",
                                                fontFamily: "var(--font-mono)",
                                                fontSize: 10,
                                                color: isActive ? "var(--green)" : "var(--blue)",
                                                whiteSpace: "nowrap",
                                              }}
                                            >
                                              {goalie.name.split(" ").pop()} .{(goalie.sv * 1000).toFixed(0)}
                                              <span style={{ fontSize: 9, marginLeft: 4, opacity: 0.6 }}>({goalie.gp}GS)</span>
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
                                            className="btn-ghost"
                                            style={{
                                              background: "transparent",
                                              border: "1px solid var(--border-1)",
                                              borderRadius: "var(--r-sm)",
                                              padding: "4px 9px",
                                              color: "var(--text-3)",
                                              fontSize: 10,
                                              cursor: "pointer",
                                              fontFamily: "var(--font-mono)",
                                            }}
                                          >
                                            Clear
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
                                        style={{
                                          background: "rgba(0,0,0,0.35)",
                                          border: `1px solid ${currentValue != null ? "var(--amber-border)" : "var(--border-1)"}`,
                                          borderRadius: "var(--r-sm)",
                                          padding: "5px 8px",
                                          color: currentValue != null ? "var(--amber)" : "var(--text)",
                                          fontFamily: "var(--font-mono)",
                                          fontSize: 12, width: 100,
                                          boxSizing: "border-box",
                                          outline: "none",
                                        }}
                                      />
                                      <span style={{ fontSize: 9, color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>or type SV% (e.g. 905)</span>
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
