import { FeatureRow, IceRink } from "../nhl-core/components";
import type { OddsData, PredictResult, TeamData } from "../nhl-core/types";
import { analyzeBetting } from "./engine";

interface SingleGameResultsProps {
  result: PredictResult;
  odds: OddsData | null;
  homeTeam: string;
  awayTeam: string;
  hColor: string;
  aColor: string;
  hTeam: TeamData;
  aTeam: TeamData;
  dataSource: "estimated" | "fetching" | "live";
  onExportSingleGame: () => void;
}

export function SingleGameResults({
  result,
  odds,
  homeTeam,
  awayTeam,
  hColor,
  aColor,
  hTeam,
  aTeam,
  dataSource,
  onExportSingleGame,
}: SingleGameResultsProps) {
  return (
    <div data-testid="simulation-results" style={{ animation: "fadeUp 0.5s ease" }}>
      {result.isPlayoff && (
        <div style={{ background: "rgba(125,211,252,0.06)", border: "1px solid rgba(125,211,252,0.2)", borderRadius: 5, padding: "9px 16px", marginBottom: 14, display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 11, color: "#7dd3fc", fontFamily: "monospace", letterSpacing: 2 }}>PLAYOFF MODE - Reduced scoring, goaltending amplified</span>
        </div>
      )}

      {(Math.abs(hTeam.pdo - 100) > 2 || Math.abs(aTeam.pdo - 100) > 2) && (
        <div style={{ background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.2)", borderRadius: 5, padding: "9px 16px", marginBottom: 14, display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 11, color: "#fbbf24", fontFamily: "monospace", letterSpacing: 1 }}>
            PDO REGRESSION WARNING - {hTeam.pdo > 102 ? `${hTeam.name} running hot` : aTeam.pdo > 102 ? `${aTeam.name} running hot` : `${hTeam.name} running cold`} · Expect mean reversion
          </span>
        </div>
      )}

      <div className="nhl-card">
        <div style={{ fontSize: 11, color: "#8faabf", letterSpacing: 3, marginBottom: 14 }}>WIN PROBABILITY (REGULATION)</div>
        <IceRink hProb={result.hWinProb} hColor={hColor} aColor={aColor} hName={`${hTeam.name} ${(result.hWinProb * 100).toFixed(1)}%`} aName={`${aTeam.name} ${(result.aWinProb * 100).toFixed(1)}%`} />
        <div style={{ marginTop: 12, fontSize: 10, color: "#8fa8bf", textAlign: "center", fontFamily: "monospace" }}>
          Note: NHL games end in OT/SO ~24% of the time · regulation win prob shown above
        </div>
      </div>

      <div className="nhl-card">
        <div style={{ fontSize: 11, color: "#8faabf", letterSpacing: 3, marginBottom: 16 }}>PROJECTED GOALS</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 16, marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 10, color: hColor, fontFamily: "monospace", letterSpacing: 2, marginBottom: 4 }}>{homeTeam}</div>
            <div style={{ fontFamily: "'Barlow Condensed',Impact,sans-serif", fontSize: 62, lineHeight: 1, color: "#c8e8ff", fontWeight: 900 }}>{result.hGoals}</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 11, color: "#8faabf", letterSpacing: 2, marginBottom: 4 }}>MODEL O/U</div>
            <div style={{ fontFamily: "'Barlow Condensed',Impact,sans-serif", fontSize: 34, color: "#38bdf8", fontWeight: 900 }}>{result.total}</div>
            {odds ? (
              (() => {
                const betting = analyzeBetting(result, odds);
                const ouRec = betting.ouRec === "pass" ? "PASS" : betting.ouRec.toUpperCase();
                const recCol = ouRec === "OVER" ? "#38bdf8" : ouRec === "UNDER" ? "#f87171" : "#6e7681";
                return (
                  <>
                    <div style={{ fontSize: 10, color: "#6e7681", letterSpacing: 1, marginTop: 8, marginBottom: 2, fontFamily: "monospace" }}>VEGAS LINE</div>
                    <div style={{ fontFamily: "'Barlow Condensed',Impact,sans-serif", fontSize: 22, color: "#cae8ff", fontWeight: 900 }}>{odds.overUnder.toFixed(1)}</div>
                    <div style={{ display: "flex", gap: 6, justifyContent: "center", marginTop: 4 }}>
                      <span style={{ fontSize: 10, color: "#6e7681", fontFamily: "monospace" }}>o{odds.overUnder.toFixed(1)} {odds.overOdds > 0 ? "+" : ""}{odds.overOdds}</span>
                      <span style={{ color: "#30363d" }}>|</span>
                      <span style={{ fontSize: 10, color: "#6e7681", fontFamily: "monospace" }}>u{odds.overUnder.toFixed(1)} {odds.underOdds > 0 ? "+" : ""}{odds.underOdds}</span>
                    </div>
                    <div style={{ marginTop: 6, fontSize: 11, fontWeight: 700, color: recCol, fontFamily: "monospace", letterSpacing: 1 }}>
                      {ouRec}{ouRec !== "PASS" ? ` (+${(Math.abs(betting.ouEdge) * 100).toFixed(1)}%)` : ""}
                    </div>
                  </>
                );
              })()
            ) : (
              <>
                <div style={{ fontSize: 11, color: "#8faabf", marginTop: 6, letterSpacing: 1 }}>GOALIE EDGE</div>
                <div style={{ fontSize: 12, color: "#c8e8ff", fontFamily: "monospace" }}>
                  {parseFloat(result.goalieEdge) > 0 ? homeTeam : awayTeam} +{Math.abs(parseFloat(result.goalieEdge)).toFixed(3)}
                </div>
              </>
            )}
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 10, color: aColor, fontFamily: "monospace", letterSpacing: 2, marginBottom: 4 }}>{awayTeam}</div>
            <div style={{ fontFamily: "'Barlow Condensed',Impact,sans-serif", fontSize: 62, lineHeight: 1, color: "#c8e8ff", fontWeight: 900 }}>{result.aGoals}</div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 8, marginBottom: 0 }}>
          {([
            { label: homeTeam, modelProb: result.hWinProb, color: hColor, vegaML: odds?.homeMoneyline },
            { label: awayTeam, modelProb: result.aWinProb, color: aColor, vegaML: odds?.awayMoneyline },
          ] as { label: string; modelProb: number; color: string; vegaML?: number }[]).map(({ label, modelProb, color, vegaML }) => {
            const modelML = modelProb >= 0.5 ? `-${Math.round((modelProb / (1 - modelProb)) * 100)}` : `+${Math.round(((1 - modelProb) / modelProb) * 100)}`;
            const vegaStr = vegaML ? (vegaML > 0 ? `+${vegaML}` : `${vegaML}`) : null;
            const vegaImplied = vegaML ? (vegaML < 0 ? (-vegaML) / (-vegaML + 100) : 100 / (vegaML + 100)) : null;
            const edge = vegaImplied ? (modelProb - vegaImplied) * 100 : null;
            return (
              <div key={label} style={{ background: "rgba(100,180,255,0.07)", border: "1px solid rgba(100,180,255,0.15)", borderRadius: 6, padding: "12px 10px" }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#8faabf", letterSpacing: 2, marginBottom: 8, fontFamily: "monospace" }}>{label} MONEYLINE</div>
                <div style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontSize: 9, color: "#6e7681", letterSpacing: 1, marginBottom: 2, fontFamily: "monospace" }}>MODEL</div>
                    <div style={{ fontSize: 22, fontWeight: 900, color, fontFamily: "'Barlow Condensed',Impact,monospace" }}>{modelML}</div>
                    <div style={{ fontSize: 10, color: "#6e7681", fontFamily: "monospace" }}>{(modelProb * 100).toFixed(1)}% win</div>
                  </div>
                  {vegaStr ? (
                    <>
                      <div style={{ color: "#30363d", fontSize: 18, fontWeight: 300, alignSelf: "center" }}>|</div>
                      <div>
                        <div style={{ fontSize: 9, color: "#6e7681", letterSpacing: 1, marginBottom: 2, fontFamily: "monospace" }}>VEGAS</div>
                        <div style={{ fontSize: 22, fontWeight: 900, color: "#cae8ff", fontFamily: "'Barlow Condensed',Impact,monospace" }}>{vegaStr}</div>
                        {edge !== null && (
                          <div style={{ fontSize: 10, fontWeight: 700, color: edge > 2 ? "#3fb950" : edge < -2 ? "#f85149" : "#8faabf", fontFamily: "monospace" }}>
                            {edge > 0 ? "+" : ""}{edge.toFixed(1)}% edge
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <div style={{ fontSize: 10, color: "#3d444d", fontFamily: "monospace", alignSelf: "center" }}>
                      fetch lines<br />for Vegas
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {odds && (
          (() => {
            const ba2 = analyzeBetting(result, odds);
            return (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 8 }}>
                {[
                  { abbr: homeTeam, plLine: odds.puckLine <= 0 ? "-1.5" : "+1.5", plOdds: odds.puckLineHomeOdds, color: hColor },
                  { abbr: awayTeam, plLine: odds.puckLine <= 0 ? "+1.5" : "-1.5", plOdds: odds.puckLineAwayOdds, color: aColor },
                ].map(({ abbr, plLine, plOdds, color }) => {
                  const isRec = ba2.puckLineRec.startsWith(abbr === homeTeam ? "home" : "away") && ba2.puckLineRec !== "pass";
                  return (
                    <div key={abbr} style={{ background: isRec ? "rgba(63,185,80,0.08)" : "rgba(100,180,255,0.07)", border: `1px solid ${isRec ? "rgba(63,185,80,0.3)" : "rgba(100,180,255,0.15)"}`, borderRadius: 6, padding: "10px" }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "#8faabf", letterSpacing: 2, marginBottom: 6, fontFamily: "monospace" }}>{abbr} PUCK LINE</div>
                      <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
                        <div>
                          <div style={{ fontSize: 9, color: "#6e7681", letterSpacing: 1, marginBottom: 2, fontFamily: "monospace" }}>LINE</div>
                          <div style={{ fontSize: 20, fontWeight: 900, color, fontFamily: "'Barlow Condensed',Impact,monospace" }}>{plLine}</div>
                        </div>
                        <div style={{ color: "#30363d", fontSize: 16, alignSelf: "center" }}>|</div>
                        <div>
                          <div style={{ fontSize: 9, color: "#6e7681", letterSpacing: 1, marginBottom: 2, fontFamily: "monospace" }}>ODDS</div>
                          <div style={{ fontSize: 20, fontWeight: 900, color: "#cae8ff", fontFamily: "'Barlow Condensed',Impact,monospace" }}>{plOdds > 0 ? "+" : ""}{plOdds}</div>
                        </div>
                        {isRec && (
                          <div style={{ marginLeft: "auto" }}>
                            <div style={{ fontSize: 9, color: "#3fb950", letterSpacing: 1, fontFamily: "monospace", marginBottom: 2 }}>EDGE</div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: "#3fb950", fontFamily: "monospace" }}>+{ba2.puckLineEdge.toFixed(1)}%</div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 8 }}>
          {([
            ["H PDO", hTeam.pdo.toFixed(1), Math.abs(hTeam.pdo - 100) > 2 ? "#fbbf24" : "#7dd3fc"],
            ["A PDO", aTeam.pdo.toFixed(1), Math.abs(aTeam.pdo - 100) > 2 ? "#fbbf24" : "#7dd3fc"],
          ] as [string, string, string][]).map(([label, value, color]) => (
            <div key={label} style={{ background: "rgba(100,180,255,0.07)", border: "1px solid rgba(100,180,255,0.08)", borderRadius: 4, padding: "8px", textAlign: "center" }}>
              <div style={{ fontSize: 10, color: "#8faabf", letterSpacing: 2, marginBottom: 3, fontFamily: "monospace" }}>{label}</div>
              <div style={{ fontSize: 16, fontWeight: 900, color, fontFamily: "'Barlow Condensed',Impact,monospace" }}>{value}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="nhl-card">
        <div style={{ fontSize: 11, color: "#8faabf", letterSpacing: 3, marginBottom: 12 }}>MODEL INPUTS</div>
        {result.features.map((feature) => <FeatureRow key={feature.label} {...feature} />)}
      </div>

      {odds && (
        (() => {
          const ba = analyzeBetting(result, odds);
          const edgeColor = (edge: number) => edge > 3 ? "#4ade80" : edge > 1 ? "#fbbf24" : "#64748b";
          const recColor = (rec: string) => (rec === "pass" ? "#64748b" : "#4ade80");
          return (
            <div data-testid="betting-analysis" className="nhl-card" style={{ border: "1px solid rgba(74,222,128,0.2)", background: "rgba(74,222,128,0.03)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div style={{ fontSize: 11, color: "#7aaa5a", letterSpacing: 3 }}>BETTING ANALYSIS</div>
                <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 2, fontFamily: "monospace", background: odds.source === "espn" ? "rgba(74,222,128,0.12)" : "rgba(251,191,36,0.1)", color: odds.source === "espn" ? "#4ade80" : "#fbbf24", border: `1px solid ${odds.source === "espn" ? "rgba(74,222,128,0.25)" : "rgba(251,191,36,0.2)"}` }}>
                  {odds.source === "espn" ? "LIVE ESPN LINES" : "MANUAL LINES"}
                </span>
              </div>

              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, color: "#7aaa5a", letterSpacing: 2, marginBottom: 8 }}>IMPLIED PROBABILITY vs MODEL</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {([
                    [homeTeam, odds.homeMoneyline, ba.homeImpliedProb, result.hWinProb, ba.homeEdge, hColor],
                    [awayTeam, odds.awayMoneyline, ba.awayImpliedProb, result.aWinProb, ba.awayEdge, aColor],
                  ] as [string, number, number, number, number, string][]).map(([abbr, ml, implied, model, edge, color]) => (
                    <div key={abbr} style={{ background: "rgba(100,180,255,0.07)", border: `1px solid ${color}33`, borderRadius: 5, padding: "12px 14px" }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color, letterSpacing: 2, marginBottom: 10, fontFamily: "monospace" }}>{abbr}</div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
                        <div style={{ background: "rgba(100,180,255,0.08)", borderRadius: 4, padding: "8px 10px" }}>
                          <div style={{ fontSize: 9, color: "#6e7681", letterSpacing: 1, marginBottom: 4, fontFamily: "monospace" }}>VEGAS ML</div>
                          <div style={{ fontSize: 22, fontWeight: 900, color: "#cae8ff", fontFamily: "'Barlow Condensed',Impact,monospace" }}>{ml > 0 ? "+" : ""}{ml}</div>
                          <div style={{ fontSize: 10, color: "#6e7681", fontFamily: "monospace" }}>{(implied * 100).toFixed(1)}% impl.</div>
                        </div>
                        <div style={{ background: `${color}18`, borderRadius: 4, padding: "8px 10px" }}>
                          <div style={{ fontSize: 9, color: "#6e7681", letterSpacing: 1, marginBottom: 4, fontFamily: "monospace" }}>MODEL ML</div>
                          <div style={{ fontSize: 22, fontWeight: 900, color, fontFamily: "'Barlow Condensed',Impact,monospace" }}>{model >= 0.5 ? `-${Math.round((model / (1 - model)) * 100)}` : `+${Math.round(((1 - model) / model) * 100)}`}</div>
                          <div style={{ fontSize: 10, color: "#6e7681", fontFamily: "monospace" }}>{(model * 100).toFixed(1)}% prob.</div>
                        </div>
                      </div>
                      <div style={{ height: 3, background: "rgba(100,180,255,0.15)", borderRadius: 2, marginBottom: 8, position: "relative" }}>
                        <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${implied * 100}%`, background: "#475569", borderRadius: 2 }} />
                        <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${model * 100}%`, background: color, borderRadius: 2, opacity: 0.8 }} />
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 10, color: "#6e7681", fontFamily: "monospace", letterSpacing: 1 }}>EDGE</span>
                        <span style={{ fontSize: 14, fontWeight: 900, color: edgeColor(edge * 100), fontFamily: "monospace" }}>{edge > 0 ? "+" : ""}{(edge * 100).toFixed(1)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                <div style={{ background: "rgba(100,180,255,0.2)", border: `1px solid ${ba.mlValueSide !== "none" ? "rgba(74,222,128,0.2)" : "rgba(100,180,255,0.2)"}`, borderRadius: 5, padding: "12px 10px" }}>
                  <div style={{ fontSize: 11, color: "#7aaa5a", letterSpacing: 2, marginBottom: 8 }}>MONEYLINE VALUE</div>
                  <div style={{ fontSize: 15, fontWeight: 900, fontFamily: "'Barlow Condensed',Impact,monospace", color: recColor(ba.mlValueSide === "none" ? "pass" : "bet"), marginBottom: 4 }}>{ba.mlValueSide === "none" ? "NO EDGE" : `${ba.mlValueSide.toUpperCase()} ML`}</div>
                  {ba.mlValueSide !== "none" && <div style={{ fontSize: 11, color: "#4ade80", fontFamily: "monospace" }}>+{ba.mlValuePct.toFixed(1)}% edge</div>}
                  {ba.mlValueSide !== "none" && <div style={{ fontSize: 11, color: "#7aaa5a", marginTop: 6 }}>1/4 Kelly: {(Math.max(ba.kellyHome, ba.kellyAway) * 100).toFixed(1)}% bankroll</div>}
                </div>

                <div style={{ background: "rgba(100,180,255,0.07)", border: `1px solid ${ba.puckLineRec !== "pass" ? "rgba(74,222,128,0.3)" : "rgba(100,180,255,0.15)"}`, borderRadius: 5, padding: "12px 10px" }}>
                  <div style={{ fontSize: 11, color: "#7aaa5a", letterSpacing: 2, marginBottom: 8 }}>PUCK LINE</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 10 }}>
                    <div style={{ background: "rgba(100,180,255,0.08)", borderRadius: 4, padding: "6px 8px" }}>
                      <div style={{ fontSize: 9, color: "#6e7681", letterSpacing: 1, marginBottom: 3, fontFamily: "monospace" }}>{homeTeam} {odds.puckLine <= 0 ? "-1.5" : "+1.5"}</div>
                      <div style={{ fontSize: 18, fontWeight: 900, color: "#cae8ff", fontFamily: "'Barlow Condensed',Impact,monospace" }}>{odds.puckLineHomeOdds > 0 ? "+" : ""}{odds.puckLineHomeOdds}</div>
                    </div>
                    <div style={{ background: "rgba(100,180,255,0.08)", borderRadius: 4, padding: "6px 8px" }}>
                      <div style={{ fontSize: 9, color: "#6e7681", letterSpacing: 1, marginBottom: 3, fontFamily: "monospace" }}>{awayTeam} {odds.puckLine <= 0 ? "+1.5" : "-1.5"}</div>
                      <div style={{ fontSize: 18, fontWeight: 900, color: "#cae8ff", fontFamily: "'Barlow Condensed',Impact,monospace" }}>{odds.puckLineAwayOdds > 0 ? "+" : ""}{odds.puckLineAwayOdds}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontSize: 14, fontWeight: 900, fontFamily: "'Barlow Condensed',Impact,monospace", color: recColor(ba.puckLineRec) }}>{ba.puckLineRec === "pass" ? "PASS" : ba.puckLineRec.toUpperCase()}</div>
                    {ba.puckLineRec !== "pass" && <div style={{ fontSize: 11, color: "#4ade80", fontFamily: "monospace", fontWeight: 700 }}>+{ba.puckLineEdge.toFixed(1)}% edge</div>}
                  </div>
                  <div style={{ fontSize: 10, color: "#6e7681", fontFamily: "monospace", marginTop: 4 }}>Proj diff: {(parseFloat(result.hGoals) - parseFloat(result.aGoals) > 0 ? "+" : "")}{(parseFloat(result.hGoals) - parseFloat(result.aGoals)).toFixed(2)} goals</div>
                </div>

                <div style={{ background: "rgba(100,180,255,0.2)", border: `1px solid ${ba.ouRec !== "pass" ? "rgba(74,222,128,0.2)" : "rgba(100,180,255,0.2)"}`, borderRadius: 5, padding: "12px 10px" }}>
                  <div style={{ fontSize: 11, color: "#7aaa5a", letterSpacing: 2, marginBottom: 8 }}>O/U {odds.overUnder}</div>
                  <div style={{ fontSize: 15, fontWeight: 900, fontFamily: "'Barlow Condensed',Impact,monospace", color: recColor(ba.ouRec), marginBottom: 4 }}>{ba.ouRec === "pass" ? "PASS" : ba.ouRec.toUpperCase()}</div>
                  <div style={{ fontSize: 11, color: ba.ouRec === "over" ? "#7dd3fc" : ba.ouRec === "under" ? "#f87171" : "#94a3b8", fontFamily: "monospace" }}>Model: {result.total} ({(Math.abs(ba.ouEdge) * 100).toFixed(1)}% edge)</div>
                  <div style={{ fontSize: 11, color: "#7aaa5a", marginTop: 6 }}>{ba.ouRec === "pass" ? "Within margin" : "Price-adjusted total edge"}</div>
                </div>
              </div>

              <div style={{ marginTop: 12, padding: "8px 10px", background: "rgba(251,191,36,0.05)", border: "1px solid rgba(251,191,36,0.1)", borderRadius: 4, fontSize: 10, color: "#c4a84a" }}>
                For entertainment only. Edge calculations assume a 50% efficient market. Always verify lines with your sportsbook before wagering.
              </div>
            </div>
          );
        })()
      )}

      <div style={{ background: "rgba(100,180,255,0.02)", border: "1px solid rgba(100,180,255,0.06)", borderRadius: 4, padding: "12px 16px", fontSize: 11, color: "#8faabf", lineHeight: 1.8 }}>
        <span style={{ color: "#38bdf8" }}>MODEL NOTE: </span>
        Corsi (shot attempt share) measures puck possession. xGF% weights shot quality.
        <strong style={{ color: "#7dd3fc" }}> Goalie SV% is the single most predictive variable</strong> - a .010 difference translates to ~1 expected goal.
        PDO above 101 or below 99 signals unsustainable luck. Playoff games suppress scoring ~6%.
        Ratings are {dataSource === "live" ? <span style={{ color: "#7dd3fc" }}>live - ESPN NHL API connected</span> : <span style={{ color: "#94a3b8" }}>estimated 2024-25 values - click Fetch ESPN Data for live colors</span>}.
      </div>

      <button data-testid="export-single-game-button" onClick={onExportSingleGame} style={{ width: "100%", marginTop: 16, padding: "12px 0", background: "linear-gradient(135deg,#14532d,#166534)", border: "1px solid rgba(74,222,128,0.3)", borderRadius: 4, color: "#86efac", fontSize: 12, fontWeight: 900, letterSpacing: 4, fontFamily: "monospace", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
        EXPORT TO CSV · GOOGLE SHEETS
      </button>
    </div>
  );
}
