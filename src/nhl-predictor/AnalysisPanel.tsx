import { analyzeBetting, normCDF } from "./engine";
import type { LinesRow } from "../nhl-core/types";

interface AnalysisPanelProps {
  linesRows: LinesRow[];
  resultsStatus: string;
  resultsRunning: boolean;
}

interface BetEntry {
  gameLabel: string;
  gameTime: string;
  betType: string;
  side: string;
  modelProb: string;
  odds: number;
  edgePct: number;
  kelly: number;
}

function getStrengthThresholds(betType: string): { med: number; strong: number } {
  if (betType === "ML") return { med: 8.5, strong: 11 };
  if (betType === "PL") return { med: 6, strong: 8 };
  return { med: 4, strong: 8 };
}

function edgeColorDirect(edgePct: number, betType?: string): string {
  const med = betType ? getStrengthThresholds(betType).med : 4;
  const strong = betType ? getStrengthThresholds(betType).strong : 8;
  if (edgePct < 0) return "var(--red)";
  if (edgePct < med) return "var(--amber)";
  if (edgePct < strong) return "var(--blue)";
  return "var(--green)";
}

function edgeBorderColor(edgePct: number, betType?: string): string {
  const med = betType ? getStrengthThresholds(betType).med : 4;
  const strong = betType ? getStrengthThresholds(betType).strong : 8;
  if (edgePct < 0) return "var(--red-border)";
  if (edgePct < med) return "var(--amber-border)";
  if (edgePct < strong) return "var(--blue-border)";
  return "var(--green-border)";
}

function recColorDirect(rec: string, edgePct: number): string {
  if (rec === "pass") return "var(--text-3)";
  if (edgePct < 0) return "var(--red)";
  if (edgePct < 4) return "var(--amber)";
  if (edgePct < 8) return "var(--blue)";
  return "var(--green)";
}

export function AnalysisPanel({ linesRows, resultsStatus, resultsRunning }: AnalysisPanelProps) {
  const simmedRows = linesRows.filter((row) => row.simResult && row.editedOdds);
  const hasSimResults = simmedRows.length > 0;

  const bets: BetEntry[] = [];
  simmedRows.forEach((row) => {
    const sim = row.simResult!;
    const odds = row.editedOdds!;
    const betting = analyzeBetting(sim, odds);
    const gameLabel = `${row.game.awayAbbr} @ ${row.game.homeAbbr}`;
    const gameTime = row.game.gameTime;

    if (betting.mlValueSide !== "none") {
      const isHome = betting.mlValueSide === "home";
      const moneyline = isHome ? odds.homeMoneyline : odds.awayMoneyline;
      const kelly = isHome ? betting.kellyHome : betting.kellyAway;
      const prob = isHome ? sim.hWinProb : sim.aWinProb;
      bets.push({
        gameLabel, gameTime,
        betType: "ML",
        side: `${betting.mlValueSide.toUpperCase()} ML`,
        modelProb: `${(prob * 100).toFixed(0)}% win`,
        odds: moneyline,
        edgePct: betting.mlValuePct,
        kelly,
      });
    }

    if (betting.puckLineRec !== "pass") {
      const isHomePL = betting.puckLineRec.startsWith("home");
      const moneyline = isHomePL ? odds.puckLineHomeOdds : odds.puckLineAwayOdds;
      const projDiff = parseFloat(sim.hGoals) - parseFloat(sim.aGoals);
      const homeFav = odds.puckLine <= 0;
      const favDiff = homeFav ? projDiff : -projDiff;
      const cover =
        isHomePL === homeFav ? 1 - normCDF((1.5 - favDiff) / 1.65) : normCDF((1.5 - favDiff) / 1.65);
      bets.push({
        gameLabel, gameTime,
        betType: "PL",
        side: betting.puckLineRec.toUpperCase(),
        modelProb: `${(cover * 100).toFixed(0)}% cover`,
        odds: moneyline,
        edgePct: betting.puckLineEdge,
        kelly: 0,
      });
    }

    if (betting.ouRec !== "pass") {
      bets.push({
        gameLabel, gameTime,
        betType: "O/U",
        side: `${betting.ouRec.toUpperCase()} ${odds.overUnder.toFixed(1)}`,
        modelProb: `${sim.total} proj`,
        odds: betting.ouRec === "over" ? odds.overOdds : odds.underOdds,
        edgePct: Math.abs(betting.ouEdge) * 100,
        kelly: 0,
      });
    }
  });
  bets.sort((a, b) => b.edgePct - a.edgePct);

  const resultsOk =
    (resultsStatus.startsWith("✓") || resultsStatus.includes("Exported") || resultsStatus.includes("Results CSV")) &&
    !resultsStatus.startsWith("Error:") &&
    !resultsStatus.startsWith("No ");

  return (
    <>
      {/* ── Sim Results Grid ── */}
      {hasSimResults && (
        <div style={{ marginTop: 24 }}>
          <div className="label" style={{ marginBottom: 14 }}>Sim Results Summary</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(340px,1fr))", gap: 14 }}>
            {simmedRows.map((row, index) => {
              const sim = row.simResult!;
              const odds = row.editedOdds!;
              const vegasLabel = odds.source === "manual" ? "Vegas (Edited)" : "Vegas";
              const betting = analyzeBetting(sim, odds);
              const hProb = sim.hWinProb * 100;
              const aProb = sim.aWinProb * 100;
              const projDiff = parseFloat(sim.hGoals) - parseFloat(sim.aGoals);
              const mlToProb = (moneyline: number) =>
                moneyline < 0 ? (-moneyline / (-moneyline + 100)) * 100 : (100 / (moneyline + 100)) * 100;
              const vegasHomeProb = odds.homeMoneyline ? mlToProb(odds.homeMoneyline) : null;
              const vegasAwayProb = odds.awayMoneyline ? mlToProb(odds.awayMoneyline) : null;
              const hasEdge = betting.mlValueSide !== "none" || betting.puckLineRec !== "pass" || betting.ouRec !== "pass";

              return (
                <div
                  key={index}
                  style={{
                    background: hasEdge
                      ? "linear-gradient(135deg, rgba(74,222,128,0.04), var(--bg-card))"
                      : "var(--bg-card)",
                    border: `1px solid ${hasEdge ? "var(--green-border)" : "var(--border-1)"}`,
                    borderRadius: "var(--r-lg)",
                    padding: 18,
                    fontFamily: "var(--font-mono)",
                    boxShadow: hasEdge ? "0 4px 16px rgba(74,222,128,0.06)" : "var(--shadow-card)",
                  }}
                >
                  {/* Game header */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                    <div>
                      <div style={{
                        fontFamily: "var(--font-display)",
                        fontSize: 16, fontWeight: 700,
                        color: "var(--text)", letterSpacing: "-0.01em",
                      }}>
                        {row.game.awayAbbr}{" "}
                        <span style={{ color: "var(--text-2)", fontWeight: 400, fontSize: 13 }}>at</span>{" "}
                        {row.game.homeAbbr}
                      </div>
                      <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 2 }}>{row.game.gameTime}</div>
                    </div>
                    <div style={{ display: "flex", gap: 5, flexWrap: "wrap", justifyContent: "flex-end" }}>
                      {row.homeB2B && <span className="chip chip--red">{row.game.homeAbbr} B2B</span>}
                      {row.awayB2B && <span className="chip chip--red">{row.game.awayAbbr} B2B</span>}
                      {hasEdge && <span className="chip chip--green">Value</span>}
                    </div>
                  </div>

                  {/* Win probability bar */}
                  <div style={{ marginBottom: 14 }}>
                    <div className="label" style={{ marginBottom: 7 }}>Win Probability</div>
                    <div style={{ display: "flex", borderRadius: "var(--r)", overflow: "hidden", height: 30, border: "1px solid var(--border-0)" }}>
                      <div style={{
                        width: `${hProb}%`,
                        background: "linear-gradient(90deg, #1e3a8a, #2563eb)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        transition: "width 1s ease",
                      }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: "#fff", fontFamily: "var(--font-display)" }}>
                          {hProb.toFixed(1)}%
                        </span>
                      </div>
                      <div style={{
                        flex: 1,
                        background: "linear-gradient(90deg, #5b21b6, #7c3aed)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        transition: "width 1s ease",
                      }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: "#fff", fontFamily: "var(--font-display)" }}>
                          {aProb.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "var(--text-3)", marginTop: 4 }}>
                      <span>{row.game.homeAbbr} (home)</span>
                      <span>{row.game.awayAbbr} (away)</span>
                    </div>
                  </div>

                  {/* Bet type cards */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 10 }}>
                    {/* Moneyline */}
                    <div style={{
                      background: "rgba(0,0,0,0.25)",
                      borderRadius: "var(--r)",
                      padding: "10px 8px",
                      border: `1px solid ${betting.mlValueSide !== "none" ? "var(--green-border)" : "var(--border-0)"}`,
                    }}>
                      <div className="label" style={{ marginBottom: 6 }}>ML</div>
                      <div style={{ fontSize: 9, color: "var(--text-3)", marginBottom: 2 }}>{vegasLabel}</div>
                      <div style={{ fontSize: 10, color: "var(--text)", marginBottom: 6, lineHeight: 1.4 }}>
                        {row.game.homeAbbr} {odds.homeMoneyline > 0 ? "+" : ""}{odds.homeMoneyline}<br />
                        {row.game.awayAbbr} {odds.awayMoneyline > 0 ? "+" : ""}{odds.awayMoneyline}
                      </div>
                      {vegasHomeProb && (
                        <div style={{ fontSize: 9, color: "var(--text-3)", marginBottom: 4 }}>
                          Impl: {vegasHomeProb.toFixed(0)}% / {vegasAwayProb!.toFixed(0)}%
                        </div>
                      )}
                      <div style={{ fontSize: 9, color: "var(--text-3)", marginBottom: 2 }}>Model</div>
                      <div style={{ fontSize: 10, color: "var(--cyan)", marginBottom: 6 }}>
                        {hProb.toFixed(1)}% / {aProb.toFixed(1)}%
                      </div>
                      <div style={{ borderTop: "1px solid var(--border-0)", paddingTop: 6 }}>
                        {betting.mlValueSide === "none" ? (
                          <span style={{ fontSize: 9, color: "var(--text-3)" }}>Pass</span>
                        ) : (
                          <span style={{ fontSize: 10, fontWeight: 700, color: "var(--green)" }}>
                            {betting.mlValueSide === "home" ? row.game.homeAbbr : row.game.awayAbbr} +{betting.mlValuePct.toFixed(1)}%
                            {Math.max(betting.kellyHome, betting.kellyAway) > 0 && (
                              <span style={{ color: "var(--amber)", fontWeight: 400 }}>
                                {" "}({(Math.max(betting.kellyHome, betting.kellyAway) * 100).toFixed(1)}% K)
                              </span>
                            )}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Puck line */}
                    <div style={{
                      background: "rgba(0,0,0,0.25)",
                      borderRadius: "var(--r)",
                      padding: "10px 8px",
                      border: `1px solid ${betting.puckLineRec !== "pass" ? "var(--green-border)" : "var(--border-0)"}`,
                    }}>
                      <div className="label" style={{ marginBottom: 6 }}>Puck Line</div>
                      <div style={{ fontSize: 9, color: "var(--text-3)", marginBottom: 2 }}>{vegasLabel}</div>
                      <div style={{ fontSize: 10, color: "var(--text)", marginBottom: 6 }}>
                        {row.game.homeAbbr} {odds.puckLine <= 0 ? "-1.5" : "+1.5"} ({odds.puckLineHomeOdds > 0 ? "+" : ""}{odds.puckLineHomeOdds})
                      </div>
                      <div style={{ fontSize: 9, color: "var(--text-3)", marginBottom: 2 }}>Model cover%</div>
                      <div style={{ fontSize: 10, color: "var(--cyan)", marginBottom: 6 }}>{(() => {
                        const homeFav = (odds.puckLine ?? -1.5) <= 0;
                        const favDiff = homeFav ? projDiff : -projDiff;
                        const favCover = 1 - normCDF((1.5 - favDiff) / 1.65);
                        const homeCover = homeFav ? favCover : 1 - favCover;
                        return `H${homeFav ? "-" : "+"}1.5: ${(homeCover * 100).toFixed(1)}%`;
                      })()}</div>
                      <div style={{ borderTop: "1px solid var(--border-0)", paddingTop: 6 }}>
                        <span style={{
                          fontSize: 10,
                          fontWeight: betting.puckLineRec !== "pass" ? 700 : 400,
                          color: recColorDirect(betting.puckLineRec, betting.puckLineEdge),
                        }}>
                          {betting.puckLineRec === "pass" ? "Pass" : `${betting.puckLineRec.replace(/^home/, row.game.homeAbbr).replace(/^away/, row.game.awayAbbr).toUpperCase()} +${betting.puckLineEdge.toFixed(1)}%`}
                        </span>
                      </div>
                    </div>

                    {/* Over/Under */}
                    <div style={{
                      background: "rgba(0,0,0,0.25)",
                      borderRadius: "var(--r)",
                      padding: "10px 8px",
                      border: `1px solid ${betting.ouRec !== "pass" ? "var(--green-border)" : "var(--border-0)"}`,
                    }}>
                      <div className="label" style={{ marginBottom: 6 }}>O/U</div>
                      <div style={{ fontSize: 9, color: "var(--text-3)", marginBottom: 2 }}>{vegasLabel}</div>
                      <div style={{ fontSize: 10, color: "var(--text)", marginBottom: 6 }}>
                        {odds.overUnder.toFixed(1)} ({odds.overOdds > 0 ? "+" : ""}{odds.overOdds} / {odds.underOdds > 0 ? "+" : ""}{odds.underOdds})
                      </div>
                      <div style={{ fontSize: 9, color: "var(--text-3)", marginBottom: 2 }}>Model total</div>
                      <div style={{ fontSize: 10, color: "var(--cyan)", marginBottom: 6 }}>
                        {sim.total}{" "}
                        <span style={{ color: edgeColorDirect(Math.abs(betting.ouEdge) * 100) }}>
                          ({(Math.abs(betting.ouEdge) * 100).toFixed(1)}%)
                        </span>
                      </div>
                      <div style={{ borderTop: "1px solid var(--border-0)", paddingTop: 6 }}>
                        <span style={{
                          fontSize: 10,
                          fontWeight: betting.ouRec !== "pass" ? 700 : 400,
                          color: recColorDirect(betting.ouRec, Math.abs(betting.ouEdge) * 100),
                        }}>
                          {betting.ouRec === "pass" ? "Pass" : `${betting.ouRec.toUpperCase()} +${(Math.abs(betting.ouEdge) * 100).toFixed(1)}%`}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Score + Edge summary */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <div style={{
                      background: "rgba(0,0,0,0.25)",
                      borderRadius: "var(--r)", padding: "10px 10px",
                      border: "1px solid var(--border-0)",
                    }}>
                      <div className="label" style={{ marginBottom: 7 }}>Projected Score</div>
                      <div style={{
                        fontFamily: "var(--font-display)",
                        fontSize: 22, fontWeight: 700,
                        color: "var(--text)", letterSpacing: "-0.02em",
                      }}>
                        {sim.hGoals} – {sim.aGoals}
                      </div>
                      <div style={{ fontSize: 10, color: "var(--text-2)", marginTop: 5 }}>
                        Diff:{" "}
                        <span style={{ color: projDiff > 0 ? "var(--blue)" : "var(--purple)" }}>
                          {projDiff > 0 ? "+" : ""}{projDiff.toFixed(2)}
                        </span>
                        {" · "}OT: {(sim.otProb * 100).toFixed(1)}%
                      </div>
                    </div>
                    <div style={{
                      background: "rgba(0,0,0,0.25)",
                      borderRadius: "var(--r)", padding: "10px 10px",
                      border: "1px solid var(--border-0)",
                    }}>
                      <div className="label" style={{ marginBottom: 7 }}>Edge Summary</div>
                      <div style={{ fontSize: 10, lineHeight: 2 }}>
                        <div>
                          <span style={{ color: "var(--text-2)" }}>ML: </span>
                          <span style={{ color: recColorDirect(betting.mlValueSide === "none" ? "pass" : "val", betting.mlValuePct) }}>
                            {betting.mlValueSide === "none" ? "No edge" : `${betting.mlValueSide === "home" ? row.game.homeAbbr : row.game.awayAbbr} +${betting.mlValuePct.toFixed(1)}%`}
                          </span>
                        </div>
                        <div>
                          <span style={{ color: "var(--text-2)" }}>PL: </span>
                          <span style={{ color: recColorDirect(betting.puckLineRec, betting.puckLineEdge) }}>
                            {betting.puckLineRec === "pass" ? "No edge" : `${betting.puckLineRec.replace(/^home/, row.game.homeAbbr).replace(/^away/, row.game.awayAbbr).toUpperCase()} +${betting.puckLineEdge.toFixed(1)}%`}
                          </span>
                        </div>
                        <div>
                          <span style={{ color: "var(--text-2)" }}>O/U: </span>
                          <span style={{ color: recColorDirect(betting.ouRec, Math.abs(betting.ouEdge) * 100) }}>
                            {betting.ouRec === "pass" ? "No edge" : `${betting.ouRec.toUpperCase()} +${(Math.abs(betting.ouEdge) * 100).toFixed(1)}%`}
                          </span>
                        </div>
                        {(betting.kellyHome > 0 || betting.kellyAway > 0) && (
                          <div style={{ marginTop: 4, paddingTop: 4, borderTop: "1px solid var(--border-0)" }}>
                            <span style={{ color: "var(--text-2)" }}>Kelly: </span>
                            <span style={{ color: "var(--amber)", fontWeight: 700 }}>
                              {betting.mlValueSide === "home"
                                ? `${(betting.kellyHome * 100).toFixed(1)}%`
                                : betting.mlValueSide === "away"
                                  ? `${(betting.kellyAway * 100).toFixed(1)}%`
                                  : `${(Math.max(betting.kellyHome, betting.kellyAway) * 100).toFixed(1)}%`}
                            </span>
                            <span style={{ color: "var(--text-3)", fontSize: 9 }}> of bankroll</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Best Bets Table ── */}
      {bets.length > 0 && (
        <div style={{ marginTop: 24, marginBottom: 8 }}>
          <div className="label" style={{ marginBottom: 10 }}>Best Bets — Ranked by Edge</div>

          {/* Table header */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 110px 52px 60px 60px 72px",
            gap: 8,
            padding: "5px 12px",
            fontFamily: "var(--font-mono)",
            fontSize: 9, fontWeight: 700,
            color: "var(--text-3)",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            borderBottom: "1px solid var(--border-1)",
            marginBottom: 6,
          }}>
            <div>Game – Pick</div>
            <div style={{ textAlign: "right" }}>Model</div>
            <div style={{ textAlign: "right" }}>Odds</div>
            <div style={{ textAlign: "right" }}>Edge</div>
            <div style={{ textAlign: "right" }}>Kelly</div>
            <div style={{ textAlign: "right" }}>Strength</div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {bets.map((bet, index) => (
              <div
                key={index}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 110px 52px 60px 60px 72px",
                  alignItems: "center",
                  gap: 8,
                  padding: "9px 12px",
                  background: "var(--bg-card)",
                  border: `1px solid ${edgeBorderColor(bet.edgePct, bet.betType)}`,
                  borderRadius: "var(--r)",
                  fontFamily: "var(--font-mono)",
                  transition: "border-color 0.15s",
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <span style={{
                    fontSize: 12, fontWeight: 700,
                    color: edgeColorDirect(bet.edgePct, bet.betType),
                  }}>
                    {bet.betType} — {bet.side}
                  </span>
                  <span style={{ fontSize: 10, color: "var(--text-3)" }}>
                    {" "}· {bet.gameLabel} · {bet.gameTime}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: "var(--cyan)", textAlign: "right" }}>{bet.modelProb}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text)", textAlign: "right" }}>
                  {bet.odds > 0 ? "+" : ""}{bet.odds}
                </div>
                <div style={{
                  fontSize: 11, fontWeight: 700, textAlign: "right",
                  color: edgeColorDirect(bet.edgePct, bet.betType),
                }}>
                  +{bet.edgePct.toFixed(1)}%
                </div>
                <div style={{
                  fontSize: 11, fontWeight: 700, textAlign: "right",
                  color: bet.kelly > 0 ? "var(--amber)" : "var(--text-3)",
                }}>
                  {bet.kelly > 0 ? `${(bet.kelly * 100).toFixed(1)}%` : "—"}
                </div>
                <div style={{ textAlign: "right" }}>
                  <span style={{
                    display: "inline-block",
                    fontSize: 9, fontWeight: 700,
                    color: edgeColorDirect(bet.edgePct, bet.betType),
                    background: edgeBorderColor(bet.edgePct, bet.betType).replace(")", ", 0.15)").replace("rgba", "rgba"),
                    border: `1px solid ${edgeBorderColor(bet.edgePct, bet.betType)}`,
                    borderRadius: "var(--r-sm)",
                    padding: "2px 7px",
                    letterSpacing: "0.08em",
                    whiteSpace: "nowrap",
                  }}>
                    {bet.edgePct >= getStrengthThresholds(bet.betType).strong
                      ? "STRONG"
                      : bet.edgePct >= getStrengthThresholds(bet.betType).med
                        ? "MED"
                        : "THIN"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Results status */}
      {resultsStatus && (
        <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 8 }}>
          <span className={`dot ${resultsRunning ? "dot--fetch" : resultsOk ? "dot--live" : "dot--idle"}`}
            style={{ background: resultsRunning ? undefined : resultsOk ? undefined : "var(--purple)" }}
          />
          <span style={{
            fontSize: 11, fontFamily: "var(--font-mono)",
            color: resultsRunning ? "var(--purple)" : resultsOk ? "var(--green)" : "var(--purple)",
          }}>{resultsStatus}</span>
        </div>
      )}

      {/* Tracking workflow */}
      {hasSimResults && (
        <div style={{
          marginTop: 16,
          padding: "16px 18px",
          background: "rgba(167,139,250,0.04)",
          border: "1px solid var(--purple-border)",
          borderRadius: "var(--r-lg)",
          fontSize: 11, color: "var(--text-2)",
          lineHeight: 1.9,
        }}>
          <div style={{
            fontFamily: "var(--font-display)",
            fontWeight: 600, color: "var(--purple)",
            marginBottom: 10, fontSize: 13,
          }}>Google Sheets Tracking Workflow</div>
          <div>
            <span style={{ color: "var(--text)" }}>1. Pre-game:</span> Click{" "}
            <strong style={{ color: "var(--green)" }}>Predictions CSV</strong> and paste into the <em>Predictions</em> tab.
          </div>
          <div>
            <span style={{ color: "var(--text)" }}>2. Next morning:</span> Click{" "}
            <strong style={{ color: "var(--purple)" }}>Results CSV</strong> and paste into the <em>Results</em> tab.
          </div>
          <div><span style={{ color: "var(--text)" }}>3. In Predictions tab</span> add these formula columns:</div>
          <div style={{
            marginLeft: 16, marginTop: 6,
            background: "rgba(0,0,0,0.4)",
            borderRadius: "var(--r)", padding: "10px 14px",
            fontFamily: "var(--font-mono)", fontSize: 10,
            color: "var(--cyan)", lineHeight: 2.2,
            border: "1px solid var(--border-1)",
          }}>
            <div style={{ color: "var(--purple)", marginBottom: 2 }}>Predictions tab: add these columns once, drag to row 2000</div>
            <div><span style={{ color: "var(--text-2)" }}>LookupKey</span> <span style={{ color: "var(--amber)" }}>=C2&D2</span></div>
            <div><span style={{ color: "var(--text-2)" }}>Actual Home Goals</span> <span style={{ color: "var(--amber)" }}>{'=IFERROR(INDEX(Results!$A:$Z,MATCH(C2&D2,INDEX(Results!$A:$Z,,MATCH("LookupKey",Results!$1:$1,0)),0),MATCH("Home Goals",Results!$1:$1,0)),"")'}</span></div>
            <div><span style={{ color: "var(--text-2)" }}>Actual Away Goals</span> <span style={{ color: "var(--amber)" }}>{'=IFERROR(INDEX(Results!$A:$Z,MATCH(C2&D2,INDEX(Results!$A:$Z,,MATCH("LookupKey",Results!$1:$1,0)),0),MATCH("Away Goals",Results!$1:$1,0)),"")'}</span></div>
            <div><span style={{ color: "var(--text-2)" }}>Actual Winner</span> <span style={{ color: "var(--amber)" }}>{'=IFERROR(INDEX(Results!$A:$Z,MATCH(C2&D2,INDEX(Results!$A:$Z,,MATCH("LookupKey",Results!$1:$1,0)),0),MATCH("Winner",Results!$1:$1,0)),"")'}</span></div>
            <div><span style={{ color: "var(--text-2)" }}>Actual Total</span> <span style={{ color: "var(--amber)" }}>{'=IFERROR(INDEX(Results!$A:$Z,MATCH(C2&D2,INDEX(Results!$A:$Z,,MATCH("LookupKey",Results!$1:$1,0)),0),MATCH("Total",Results!$1:$1,0)),"")'}</span></div>
            <div style={{ color: "var(--purple)", marginTop: 6, marginBottom: 2 }}>Hit or miss (1=correct, 0=wrong, blank=no prediction)</div>
            <div><span style={{ color: "var(--text-2)" }}>ML Hit</span> <span style={{ color: "var(--amber)" }}>{'=IF(OR(ActualWinner_col="",MLValueSide_col=""),"",IF(ActualWinner_col=MLValueSide_col,1,0))'}</span></div>
            <div><span style={{ color: "var(--text-2)" }}>O/U Hit</span> <span style={{ color: "var(--amber)" }}>{'=IF(OR(ActualTotal_col="",OURec_col="",OURec_col="pass"),"",IF((ActualTotal_col>VegasOU_col)=(OURec_col="over"),1,0))'}</span></div>
            <div><span style={{ color: "var(--text-2)" }}>PL Hit</span> <span style={{ color: "var(--amber)" }}>{'=IF(OR(ActualHomeDiff_col="",PLRec_col="",PLRec_col="pass"),"",IF(PLRec_col="home -1.5",(ActualHomeDiff_col>1)*1,(ActualHomeDiff_col<-1)*1))'}</span></div>
            <div style={{ color: "var(--text-3)", fontSize: 9, marginTop: 4 }}>Replace `_col` references with actual column letters after setup.</div>
          </div>
          <div style={{
            marginTop: 10, padding: "8px 12px",
            background: "var(--green-lo)", border: "1px solid var(--green-border)",
            borderRadius: "var(--r-sm)", fontSize: 10, color: "var(--text-2)",
            lineHeight: 1.8,
          }}>
            <span style={{ color: "var(--green)" }}>One-time setup:</span> formulas use header names via MATCH, so they still work if CSV columns shift later.
          </div>
          <div style={{ marginTop: 6, color: "var(--text-3)", fontSize: 11 }}>
            First import: File → Import → Upload. After that, paste into the existing sheet at the next empty row.
          </div>
        </div>
      )}
    </>
  );

}
