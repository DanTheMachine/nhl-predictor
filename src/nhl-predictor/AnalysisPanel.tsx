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

export function AnalysisPanel({ linesRows, resultsStatus, resultsRunning }: AnalysisPanelProps) {
  const simmedRows = linesRows.filter((row) => row.simResult && row.editedOdds);
  const hasSimResults = simmedRows.length > 0;

  const edgeColor = (value: number) => (value > 3 ? "#3fb950" : value > 1 ? "#d29922" : "#6e7681");
  const recColor = (rec: string, edgePct: number) => {
    if (rec === "pass") return "#6e7681";
    if (edgePct < 0) return "#f87171";
    if (edgePct < 4) return "#d29922";
    if (edgePct < 8) return "#58a6ff";
    return "#3fb950";
  };
  const betColor = (edgePct: number) => {
    if (edgePct < 0) return "#f87171";
    if (edgePct < 4) return "#d29922";
    if (edgePct < 8) return "#58a6ff";
    return "#3fb950";
  };
  const betBorder = (edgePct: number) => {
    if (edgePct < 0) return "rgba(248,113,113,0.25)";
    if (edgePct < 4) return "rgba(210,153,34,0.25)";
    if (edgePct < 8) return "rgba(88,166,255,0.25)";
    return "rgba(63,185,80,0.3)";
  };

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
        gameLabel,
        gameTime,
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
        gameLabel,
        gameTime,
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
        gameLabel,
        gameTime,
        betType: "O/U",
        side: `${betting.ouRec.toUpperCase()} ${odds.overUnder.toFixed(1)}`,
        modelProb: `${sim.total} proj`,
        odds: betting.ouRec === "over" ? odds.overOdds : odds.underOdds,
        edgePct: Math.abs(betting.ouEdge) * 10,
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
      {hasSimResults && (
        <div style={{ marginTop: 20 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#c3ced8", letterSpacing: 3, fontFamily: "monospace", marginBottom: 12 }}>
            SIM RESULTS SUMMARY
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(340px,1fr))", gap: 12 }}>
            {simmedRows.map((row, index) => {
              const sim = row.simResult!;
              const odds = row.editedOdds!;
              const betting = analyzeBetting(sim, odds);
              const hProb = sim.hWinProb * 100;
              const aProb = sim.aWinProb * 100;
              const projDiff = parseFloat(sim.hGoals) - parseFloat(sim.aGoals);
              const mlToProb = (moneyline: number) => (moneyline < 0 ? (-moneyline / (-moneyline + 100)) * 100 : (100 / (moneyline + 100)) * 100);
              const vegasHomeProb = odds.homeMoneyline ? mlToProb(odds.homeMoneyline) : null;
              const vegasAwayProb = odds.awayMoneyline ? mlToProb(odds.awayMoneyline) : null;
              const hasEdge = betting.mlValueSide !== "none" || betting.puckLineRec !== "pass" || betting.ouRec !== "pass";

              return (
                <div
                  key={index}
                  style={{ background: hasEdge ? "linear-gradient(135deg,rgba(63,185,80,0.06),#161b22)" : "#161b22", border: `1px solid ${hasEdge ? "rgba(63,185,80,0.25)" : "#30363d"}`, borderRadius: 8, padding: 16, fontFamily: "monospace" }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <div style={{ fontSize: 15, fontWeight: 900, color: "#e6edf3", letterSpacing: 1 }}>
                      {row.game.homeAbbr} <span style={{ color: "#b3c0cc", fontWeight: 400 }}>vs</span> {row.game.awayAbbr}
                    </div>
                    <div style={{ display: "flex", gap: 5 }}>
                      {row.homeB2B && <span style={{ fontSize: 9, background: "rgba(251,113,133,0.15)", border: "1px solid rgba(251,113,133,0.4)", borderRadius: 3, padding: "2px 6px", color: "#fda4af" }}>{row.game.homeAbbr} B2B</span>}
                      {row.awayB2B && <span style={{ fontSize: 9, background: "rgba(251,113,133,0.15)", border: "1px solid rgba(251,113,133,0.4)", borderRadius: 3, padding: "2px 6px", color: "#fda4af" }}>{row.game.awayAbbr} B2B</span>}
                      {hasEdge && <span style={{ fontSize: 9, background: "rgba(63,185,80,0.12)", border: "1px solid rgba(63,185,80,0.3)", borderRadius: 3, padding: "2px 6px", color: "#3fb950" }}>VALUE</span>}
                    </div>
                  </div>

                  <div style={{ marginBottom: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#c3ced8", marginBottom: 4 }}>
                      <span>WIN PROBABILITY</span>
                      <span style={{ color: "#b3c0cc", fontSize: 10 }}>{row.game.gameTime}</span>
                    </div>
                    <div style={{ display: "flex", borderRadius: 4, overflow: "hidden", height: 28 }}>
                      <div style={{ width: `${hProb}%`, background: "linear-gradient(90deg,#1d4ed8,#3b82f6)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <span style={{ fontSize: 11, fontWeight: 900, color: "#fff" }}>{hProb.toFixed(1)}%</span>
                      </div>
                      <div style={{ flex: 1, background: "linear-gradient(90deg,#7c3aed,#a855f7)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <span style={{ fontSize: 11, fontWeight: 900, color: "#fff" }}>{aProb.toFixed(1)}%</span>
                      </div>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#6e7681", marginTop: 3 }}>
                      <span>{row.game.homeAbbr} (home)</span>
                      <span>{row.game.awayAbbr} (away)</span>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
                    <div style={{ background: "#0d1117", borderRadius: 6, padding: "10px 8px", border: `1px solid ${betting.mlValueSide !== "none" ? "rgba(63,185,80,0.3)" : "#21262d"}` }}>
                      <div style={{ fontSize: 9, color: "#c3ced8", letterSpacing: 2, marginBottom: 6 }}>MONEYLINE</div>
                      <div style={{ fontSize: 10, color: "#b3c0cc", marginBottom: 2 }}>Vegas</div>
                      <div style={{ fontSize: 11, color: "#cae8ff", marginBottom: 6 }}>
                        {row.game.homeAbbr} {odds.homeMoneyline > 0 ? "+" : ""}{odds.homeMoneyline} / {row.game.awayAbbr} {odds.awayMoneyline > 0 ? "+" : ""}{odds.awayMoneyline}
                      </div>
                      {vegasHomeProb && <div style={{ fontSize: 10, color: "#b3c0cc", marginBottom: 4 }}>Implied: {vegasHomeProb.toFixed(1)}% / {vegasAwayProb!.toFixed(1)}%</div>}
                      <div style={{ fontSize: 10, color: "#b3c0cc", marginBottom: 2 }}>Model</div>
                      <div style={{ fontSize: 11, color: "#7dd3fc", marginBottom: 6 }}>{hProb.toFixed(1)}% / {aProb.toFixed(1)}%</div>
                      <div style={{ borderTop: "1px solid #21262d", paddingTop: 6, marginTop: 2 }}>
                        <span style={{ fontSize: 10, color: "#b3c0cc" }}>Edge: </span>
                        {betting.mlValueSide === "none" ? <span style={{ fontSize: 10, color: "#b3c0cc" }}>PASS</span> : <span style={{ fontSize: 11, fontWeight: 700, color: "#3fb950" }}>{betting.mlValueSide.toUpperCase()} +{betting.mlValuePct.toFixed(1)}%{Math.max(betting.kellyHome, betting.kellyAway) > 0 && <span style={{ color: "#d29922" }}> ({(Math.max(betting.kellyHome, betting.kellyAway) * 100).toFixed(1)}% Kelly)</span>}</span>}
                      </div>
                    </div>

                    <div style={{ background: "#0d1117", borderRadius: 6, padding: "10px 8px", border: `1px solid ${betting.puckLineRec !== "pass" ? "rgba(63,185,80,0.3)" : "#21262d"}` }}>
                      <div style={{ fontSize: 9, color: "#c3ced8", letterSpacing: 2, marginBottom: 6 }}>PUCK LINE</div>
                      <div style={{ fontSize: 10, color: "#b3c0cc", marginBottom: 2 }}>Vegas</div>
                      <div style={{ fontSize: 11, color: "#cae8ff", marginBottom: 6 }}>
                        {row.game.homeAbbr} {odds.puckLine <= 0 ? "-1.5" : "+1.5"} ({odds.puckLineHomeOdds > 0 ? "+" : ""}{odds.puckLineHomeOdds})
                      </div>
                      <div style={{ fontSize: 10, color: "#b3c0cc", marginBottom: 2 }}>Model cover%</div>
                      <div style={{ fontSize: 11, color: "#7dd3fc", marginBottom: 6 }}>{(() => {
                        const homeFav = (odds.puckLine ?? -1.5) <= 0;
                        const favDiff = homeFav ? projDiff : -projDiff;
                        const favCover = 1 - normCDF((1.5 - favDiff) / 1.65);
                        const homeCover = homeFav ? favCover : 1 - favCover;
                        return `H${homeFav ? "-" : "+"}1.5: ${(homeCover * 100).toFixed(1)}%`;
                      })()}</div>
                      <div style={{ borderTop: "1px solid #21262d", paddingTop: 6, marginTop: 2 }}>
                        <span style={{ fontSize: 10, color: "#b3c0cc" }}>Rec: </span>
                        <span style={{ fontSize: 11, fontWeight: betting.puckLineRec !== "pass" ? 700 : 400, color: recColor(betting.puckLineRec, betting.puckLineEdge) }}>
                          {betting.puckLineRec === "pass" ? "PASS" : `${betting.puckLineRec.toUpperCase()} +${betting.puckLineEdge.toFixed(1)}%`}
                        </span>
                      </div>
                    </div>

                    <div style={{ background: "#0d1117", borderRadius: 6, padding: "10px 8px", border: `1px solid ${betting.ouRec !== "pass" ? "rgba(63,185,80,0.3)" : "#21262d"}` }}>
                      <div style={{ fontSize: 9, color: "#c3ced8", letterSpacing: 2, marginBottom: 6 }}>OVER / UNDER</div>
                      <div style={{ fontSize: 10, color: "#b3c0cc", marginBottom: 2 }}>Vegas line</div>
                      <div style={{ fontSize: 11, color: "#cae8ff", marginBottom: 6 }}>{odds.overUnder.toFixed(1)} ({odds.overOdds > 0 ? "+" : ""}{odds.overOdds} / {odds.underOdds > 0 ? "+" : ""}{odds.underOdds})</div>
                      <div style={{ fontSize: 10, color: "#b3c0cc", marginBottom: 2 }}>Model total</div>
                      <div style={{ fontSize: 11, color: "#7dd3fc", marginBottom: 6 }}>{sim.total} <span style={{ color: edgeColor(Math.abs(betting.ouEdge) * 100) }}>({(Math.abs(betting.ouEdge) * 100).toFixed(1)}% edge)</span></div>
                      <div style={{ borderTop: "1px solid #21262d", paddingTop: 6, marginTop: 2 }}>
                        <span style={{ fontSize: 10, color: "#b3c0cc" }}>Rec: </span>
                        <span style={{ fontSize: 11, fontWeight: betting.ouRec !== "pass" ? 700 : 400, color: recColor(betting.ouRec, Math.abs(betting.ouEdge) * 100) }}>
                          {betting.ouRec === "pass" ? "PASS" : `${betting.ouRec.toUpperCase()} +${(Math.abs(betting.ouEdge) * 100).toFixed(1)}%`}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <div style={{ background: "#0d1117", borderRadius: 6, padding: "10px 8px", border: "1px solid #21262d" }}>
                      <div style={{ fontSize: 9, color: "#c3ced8", letterSpacing: 2, marginBottom: 6 }}>PROJECTED SCORE</div>
                      <div style={{ fontSize: 18, fontWeight: 900, color: "#e6edf3", letterSpacing: 2 }}>{sim.hGoals} - {sim.aGoals}</div>
                      <div style={{ fontSize: 10, color: "#b3c0cc", marginTop: 4 }}>
                        Diff: <span style={{ color: projDiff > 0 ? "#3b82f6" : "#a855f7" }}>{projDiff > 0 ? "+" : ""}{projDiff.toFixed(2)}</span>
                        {" · "}OT prob: {(sim.otProb * 100).toFixed(1)}%
                      </div>
                    </div>
                    <div style={{ background: "#0d1117", borderRadius: 6, padding: "10px 8px", border: "1px solid #21262d" }}>
                      <div style={{ fontSize: 9, color: "#c3ced8", letterSpacing: 2, marginBottom: 6 }}>MODEL EDGE SUMMARY</div>
                      <div style={{ fontSize: 10, lineHeight: 1.8 }}>
                        <div><span style={{ color: "#b3c0cc" }}>ML: </span><span style={{ color: recColor(betting.mlValueSide === "none" ? "pass" : "val", betting.mlValuePct) }}>{betting.mlValueSide === "none" ? "No edge" : `${betting.mlValueSide.toUpperCase()} +${betting.mlValuePct.toFixed(1)}%`}</span></div>
                        <div><span style={{ color: "#b3c0cc" }}>PL: </span><span style={{ color: recColor(betting.puckLineRec, betting.puckLineEdge) }}>{betting.puckLineRec === "pass" ? "No edge" : `${betting.puckLineRec.toUpperCase()} +${betting.puckLineEdge.toFixed(1)}%`}</span></div>
                        <div><span style={{ color: "#b3c0cc" }}>O/U: </span><span style={{ color: recColor(betting.ouRec, Math.abs(betting.ouEdge) * 100) }}>{betting.ouRec === "pass" ? "No edge" : `${betting.ouRec.toUpperCase()} +${(Math.abs(betting.ouEdge) * 100).toFixed(1)}%`}</span></div>
                        {(betting.kellyHome > 0 || betting.kellyAway > 0) && <div style={{ marginTop: 4, paddingTop: 4, borderTop: "1px solid #21262d" }}><span style={{ color: "#b3c0cc" }}>Kelly (this bet): </span><span style={{ color: "#f97316", fontWeight: 700 }}>{betting.mlValueSide === "home" ? `${(betting.kellyHome * 100).toFixed(1)}%` : betting.mlValueSide === "away" ? `${(betting.kellyAway * 100).toFixed(1)}%` : `${(Math.max(betting.kellyHome, betting.kellyAway) * 100).toFixed(1)}%`}</span><span style={{ color: "#4b5563", fontSize: 9 }}> of bankroll (1/4 Kelly)</span></div>}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {bets.length > 0 && (
        <div style={{ marginTop: 20, marginBottom: 8 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#8b949e", letterSpacing: 3, fontFamily: "monospace", marginBottom: 8 }}>
            BEST BETS - RANKED BY EDGE
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 110px 52px 52px 52px 52px 70px", gap: 8, padding: "4px 10px", fontFamily: "monospace", fontSize: 9, fontWeight: 700, color: "#4b5563", letterSpacing: 1, borderBottom: "1px solid #21262d", marginBottom: 4 }}>
            <div>GAME - PICK</div>
            <div style={{ textAlign: "right" }}>MODEL</div>
            <div style={{ textAlign: "right" }}>ODDS</div>
            <div style={{ textAlign: "right" }}>EDGE</div>
            <div style={{ textAlign: "right" }}>KELLY</div>
            <div style={{ textAlign: "right" }} />
            <div style={{ textAlign: "right" }}>STRENGTH</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {bets.map((bet, index) => (
              <div key={index} style={{ display: "grid", gridTemplateColumns: "1fr 110px 52px 52px 52px 52px 70px", alignItems: "center", gap: 8, padding: "7px 10px", background: "#161b22", border: `1px solid ${betBorder(bet.edgePct)}`, borderRadius: 5, fontFamily: "monospace" }}>
                <div style={{ minWidth: 0 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: betColor(bet.edgePct) }}>{bet.betType} - {bet.side}</span>
                  <span style={{ fontSize: 10, color: "#6e7681" }}> &nbsp;{bet.gameLabel} - {bet.gameTime}</span>
                </div>
                <div style={{ fontSize: 11, color: "#7dd3fc", textAlign: "right" }}>{bet.modelProb}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#cae8ff", textAlign: "right" }}>{bet.odds > 0 ? "+" : ""}{bet.odds}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: betColor(bet.edgePct), textAlign: "right" }}>+{bet.edgePct.toFixed(1)}%</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: bet.kelly > 0 ? "#f97316" : "#4b5563", textAlign: "right" }}>{bet.kelly > 0 ? `${(bet.kelly * 100).toFixed(1)}%` : "-"}</div>
                <div />
                <div style={{ fontSize: 9, fontWeight: 700, color: betColor(bet.edgePct), background: betBorder(bet.edgePct), borderRadius: 3, padding: "2px 5px", textAlign: "center", whiteSpace: "nowrap" }}>
                  {bet.edgePct >= 8 ? "STRONG" : bet.edgePct >= 4 ? "MED" : "THIN"}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {resultsStatus && (
        <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", flexShrink: 0, background: resultsRunning ? "#a855f7" : resultsOk ? "#3fb950" : "#7c3aed" }} />
          <span style={{ fontSize: 11, color: resultsRunning ? "#a78bfa" : resultsOk ? "#3fb950" : "#a78bfa", fontFamily: "monospace" }}>{resultsStatus}</span>
        </div>
      )}

      {hasSimResults && (
        <div style={{ marginTop: 12, padding: "14px 16px", background: "rgba(124,58,237,0.06)", border: "1px solid rgba(124,58,237,0.2)", borderRadius: 6, fontSize: 11, color: "#8b949e", lineHeight: 1.9 }}>
          <div style={{ fontWeight: 700, color: "#c4b5fd", marginBottom: 8, fontSize: 12 }}>Google Sheets Tracking Workflow</div>
          <div><span style={{ color: "#e9d5ff" }}>1. Pre-game:</span> Click <strong style={{ color: "#3fb950" }}>PREDICTIONS CSV</strong> and paste into the <em>Predictions</em> tab.</div>
          <div><span style={{ color: "#e9d5ff" }}>2. Next morning:</span> Click <strong style={{ color: "#a855f7" }}>RESULTS CSV</strong> and paste into the <em>Results</em> tab.</div>
          <div><span style={{ color: "#e9d5ff" }}>3. In Predictions tab</span> add these formula columns:</div>
          <div style={{ marginLeft: 16, marginTop: 4, background: "rgba(0,0,0,0.3)", borderRadius: 4, padding: "8px 12px", fontFamily: "monospace", fontSize: 10, color: "#7dd3fc", lineHeight: 2.1 }}>
            <div style={{ color: "#a78bfa", marginBottom: 2 }}>Predictions tab: add these columns once, drag to row 2000</div>
            <div><span style={{ color: "#94a3b8" }}>LookupKey</span> <span style={{ color: "#fde68a" }}>=C2&D2</span></div>
            <div><span style={{ color: "#94a3b8" }}>Actual Home Goals</span> <span style={{ color: "#fde68a" }}>{'=IFERROR(INDEX(Results!$A:$Z,MATCH(C2&D2,INDEX(Results!$A:$Z,,MATCH("LookupKey",Results!$1:$1,0)),0),MATCH("Home Goals",Results!$1:$1,0)),"")'}</span></div>
            <div><span style={{ color: "#94a3b8" }}>Actual Away Goals</span> <span style={{ color: "#fde68a" }}>{'=IFERROR(INDEX(Results!$A:$Z,MATCH(C2&D2,INDEX(Results!$A:$Z,,MATCH("LookupKey",Results!$1:$1,0)),0),MATCH("Away Goals",Results!$1:$1,0)),"")'}</span></div>
            <div><span style={{ color: "#94a3b8" }}>Actual Winner</span> <span style={{ color: "#fde68a" }}>{'=IFERROR(INDEX(Results!$A:$Z,MATCH(C2&D2,INDEX(Results!$A:$Z,,MATCH("LookupKey",Results!$1:$1,0)),0),MATCH("Winner",Results!$1:$1,0)),"")'}</span></div>
            <div><span style={{ color: "#94a3b8" }}>Actual Total</span> <span style={{ color: "#fde68a" }}>{'=IFERROR(INDEX(Results!$A:$Z,MATCH(C2&D2,INDEX(Results!$A:$Z,,MATCH("LookupKey",Results!$1:$1,0)),0),MATCH("Total",Results!$1:$1,0)),"")'}</span></div>
            <div style={{ color: "#a78bfa", marginTop: 4, marginBottom: 2 }}>Hit or miss (1=correct, 0=wrong, blank=no prediction)</div>
            <div><span style={{ color: "#94a3b8" }}>ML Hit</span> <span style={{ color: "#fde68a" }}>{'=IF(OR(ActualWinner_col="",MLValueSide_col=""),"",IF(ActualWinner_col=MLValueSide_col,1,0))'}</span></div>
            <div><span style={{ color: "#94a3b8" }}>O/U Hit</span> <span style={{ color: "#fde68a" }}>{'=IF(OR(ActualTotal_col="",OURec_col="",OURec_col="pass"),"",IF((ActualTotal_col>VegasOU_col)=(OURec_col="over"),1,0))'}</span></div>
            <div><span style={{ color: "#94a3b8" }}>PL Hit</span> <span style={{ color: "#fde68a" }}>{'=IF(OR(ActualHomeDiff_col="",PLRec_col="",PLRec_col="pass"),"",IF(PLRec_col="home -1.5",(ActualHomeDiff_col>1)*1,(ActualHomeDiff_col<-1)*1))'}</span></div>
            <div style={{ color: "#6e7681", fontSize: 9, marginTop: 4 }}>Replace `_col` references with actual column letters after setup, for example `ActualWinner_col` to `Z2`.</div>
          </div>
          <div style={{ marginTop: 8, padding: "8px 12px", background: "rgba(63,185,80,0.05)", border: "1px solid rgba(63,185,80,0.15)", borderRadius: 4, fontSize: 10, color: "#6e7681", lineHeight: 1.8 }}>
            <span style={{ color: "#3fb950" }}>One-time setup:</span> formulas use header names via `MATCH`, so they still work if CSV columns shift later.
          </div>
          <div style={{ marginTop: 6, color: "#6e7681" }}>First import: File -&gt; Import -&gt; Upload. After that, paste into the existing sheet at the next empty row.</div>
        </div>
      )}
    </>
  );
}
