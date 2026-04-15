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
      {/* Playoff notice */}
      {result.isPlayoff && (
        <div style={{
          background: "var(--cyan-lo)", border: "1px solid var(--cyan-border)",
          borderRadius: "var(--r)", padding: "10px 16px", marginBottom: 12,
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <span style={{ fontSize: 11, color: "var(--cyan)", fontFamily: "var(--font-mono)", letterSpacing: "0.08em" }}>
            Playoff Mode — Reduced scoring, goaltending amplified
          </span>
        </div>
      )}

      {/* PDO regression warning */}
      {(Math.abs(hTeam.pdo - 100) > 2 || Math.abs(aTeam.pdo - 100) > 2) && (
        <div style={{
          background: "var(--amber-lo)", border: "1px solid var(--amber-border)",
          borderRadius: "var(--r)", padding: "10px 16px", marginBottom: 12,
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <span style={{ fontSize: 11, color: "var(--amber)", fontFamily: "var(--font-mono)", letterSpacing: "0.06em" }}>
            PDO Regression Warning —{" "}
            {hTeam.pdo > 102
              ? `${hTeam.name} running hot`
              : aTeam.pdo > 102
                ? `${aTeam.name} running hot`
                : `${hTeam.name} running cold`}
            {" "}· Expect mean reversion
          </span>
        </div>
      )}

      {/* Win probability card */}
      <div className="nhl-card">
        <div className="label" style={{ marginBottom: 14 }}>Win Probability (Regulation)</div>
        <IceRink
          hProb={result.hWinProb}
          hColor={hColor}
          aColor={aColor}
          hName={`${hTeam.name} ${(result.hWinProb * 100).toFixed(1)}%`}
          aName={`${aTeam.name} ${(result.aWinProb * 100).toFixed(1)}%`}
        />
        <div style={{ marginTop: 10, fontSize: 10, color: "var(--text-3)", textAlign: "center", fontFamily: "var(--font-mono)" }}>
          Note: NHL games end in OT/SO ~24% of the time · regulation win prob shown above
        </div>
      </div>

      {/* Projected Goals card */}
      <div className="nhl-card">
        <div className="label" style={{ marginBottom: 16 }}>Projected Goals</div>
        <div style={{
          display: "grid", gridTemplateColumns: "1fr auto 1fr",
          alignItems: "center", gap: 20, marginBottom: 18,
        }}>
          {/* Home */}
          <div>
            <div style={{ fontSize: 10, color: hColor, fontFamily: "var(--font-mono)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 4 }}>
              {homeTeam}
            </div>
            <div style={{
              fontFamily: "'Big Shoulders Display', var(--font-display)",
              fontSize: 80, lineHeight: 0.92, fontWeight: 900,
              color: "var(--text)", letterSpacing: "0.01em",
            }}>{result.hGoals}</div>
          </div>

          {/* Center / O/U */}
          <div style={{ textAlign: "center" }}>
            <div className="label" style={{ marginBottom: 6 }}>Model O/U</div>
            <div style={{
              fontFamily: "'Big Shoulders Display', var(--font-display)",
              fontSize: 42, fontWeight: 900,
              color: "var(--cyan)", letterSpacing: "0.01em",
            }}>{result.total}</div>
            {odds ? (
              (() => {
                const betting = analyzeBetting(result, odds);
                const ouRec = betting.ouRec === "pass" ? "Pass" : betting.ouRec.toUpperCase();
                const recCol = ouRec === "OVER" ? "var(--blue)" : ouRec === "UNDER" ? "var(--red)" : "var(--text-3)";
                return (
                  <>
                    <div style={{ fontSize: 10, color: "var(--text-3)", letterSpacing: "0.06em", marginTop: 10, marginBottom: 3, fontFamily: "var(--font-mono)", textTransform: "uppercase" }}>Vegas Line</div>
                    <div style={{
                      fontFamily: "'Big Shoulders Display', var(--font-display)",
                      fontSize: 24, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.01em",
                    }}>{odds.overUnder.toFixed(1)}</div>
                    <div style={{ display: "flex", gap: 6, justifyContent: "center", marginTop: 4 }}>
                      <span style={{ fontSize: 9, color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>
                        o{odds.overUnder.toFixed(1)} {odds.overOdds > 0 ? "+" : ""}{odds.overOdds}
                      </span>
                      <span style={{ color: "var(--border-1)" }}>|</span>
                      <span style={{ fontSize: 9, color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>
                        u{odds.overUnder.toFixed(1)} {odds.underOdds > 0 ? "+" : ""}{odds.underOdds}
                      </span>
                    </div>
                    <div style={{
                      marginTop: 8, fontSize: 11, fontWeight: 700,
                      color: recCol, fontFamily: "var(--font-mono)", letterSpacing: "0.06em",
                    }}>
                      {ouRec}{ouRec !== "Pass" ? ` (+${(Math.abs(betting.ouEdge) * 100).toFixed(1)}%)` : ""}
                    </div>
                  </>
                );
              })()
            ) : (
              <>
                <div style={{ fontSize: 11, color: "var(--text-2)", marginTop: 8, letterSpacing: "0.06em", fontFamily: "var(--font-mono)" }}>Goalie Edge</div>
                <div style={{ fontSize: 12, color: "var(--text)", fontFamily: "var(--font-mono)" }}>
                  {parseFloat(result.goalieEdge) > 0 ? homeTeam : awayTeam} +{Math.abs(parseFloat(result.goalieEdge)).toFixed(3)}
                </div>
              </>
            )}
          </div>

          {/* Away */}
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 10, color: aColor, fontFamily: "var(--font-mono)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 4 }}>
              {awayTeam}
            </div>
            <div style={{
              fontFamily: "'Big Shoulders Display', var(--font-display)",
              fontSize: 80, lineHeight: 0.92, fontWeight: 900,
              color: "var(--text)", letterSpacing: "0.01em",
            }}>{result.aGoals}</div>
          </div>
        </div>

        {/* Moneyline comparison */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 8, marginBottom: 8 }}>
          {([
            { label: homeTeam, modelProb: result.hWinProb, color: hColor, vegaML: odds?.homeMoneyline },
            { label: awayTeam, modelProb: result.aWinProb, color: aColor, vegaML: odds?.awayMoneyline },
          ] as { label: string; modelProb: number; color: string; vegaML?: number }[]).map(({ label, modelProb, color, vegaML }) => {
            const modelML = modelProb >= 0.5
              ? `-${Math.round((modelProb / (1 - modelProb)) * 100)}`
              : `+${Math.round(((1 - modelProb) / modelProb) * 100)}`;
            const vegaStr = vegaML ? (vegaML > 0 ? `+${vegaML}` : `${vegaML}`) : null;
            const vegaImplied = vegaML ? (vegaML < 0 ? (-vegaML) / (-vegaML + 100) : 100 / (vegaML + 100)) : null;
            const edge = vegaImplied ? (modelProb - vegaImplied) * 100 : null;
            return (
              <div key={label} style={{
                background: "rgba(0,0,0,0.2)",
                border: `1px solid ${color}22`,
                borderRadius: "var(--r)",
                padding: "12px 12px",
              }}>
                <div className="label" style={{ marginBottom: 10 }}>{label} Moneyline</div>
                <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontSize: 9, color: "var(--text-3)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 2, fontFamily: "var(--font-mono)" }}>Model</div>
                    <div style={{
                      fontFamily: "'Big Shoulders Display', var(--font-display)",
                      fontSize: 24, fontWeight: 800, color, letterSpacing: "-0.02em",
                    }}>{modelML}</div>
                    <div style={{ fontSize: 10, color: "var(--text-2)", fontFamily: "var(--font-mono)" }}>
                      {(modelProb * 100).toFixed(1)}% win
                    </div>
                  </div>
                  {vegaStr ? (
                    <>
                      <div style={{ color: "var(--border-1)", fontSize: 20, alignSelf: "center" }}>|</div>
                      <div>
                        <div style={{ fontSize: 9, color: "var(--text-3)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 2, fontFamily: "var(--font-mono)" }}>Vegas</div>
                        <div style={{
                          fontFamily: "'Big Shoulders Display', var(--font-display)",
                          fontSize: 24, fontWeight: 800, color: "var(--text)", letterSpacing: "-0.02em",
                        }}>{vegaStr}</div>
                        {edge !== null && (
                          <div style={{
                            fontSize: 10, fontWeight: 700,
                            color: edge > 2 ? "var(--green)" : edge < -2 ? "var(--red)" : "var(--text-2)",
                            fontFamily: "var(--font-mono)",
                          }}>
                            {edge > 0 ? "+" : ""}{edge.toFixed(1)}% edge
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <div style={{ fontSize: 10, color: "var(--text-3)", fontFamily: "var(--font-mono)", alignSelf: "center" }}>
                      fetch lines<br />for Vegas
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Puck line comparison */}
        {odds && (() => {
          const ba2 = analyzeBetting(result, odds);
          return (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 8, marginBottom: 8 }}>
              {[
                { abbr: homeTeam, plLine: odds.puckLine <= 0 ? "-1.5" : "+1.5", plOdds: odds.puckLineHomeOdds, color: hColor },
                { abbr: awayTeam, plLine: odds.puckLine <= 0 ? "+1.5" : "-1.5", plOdds: odds.puckLineAwayOdds, color: aColor },
              ].map(({ abbr, plLine, plOdds, color }) => {
                const isRec = ba2.puckLineRec.startsWith(abbr === homeTeam ? "home" : "away") && ba2.puckLineRec !== "pass";
                return (
                  <div key={abbr} style={{
                    background: isRec ? "var(--green-lo)" : "rgba(0,0,0,0.2)",
                    border: `1px solid ${isRec ? "var(--green-border)" : "var(--border-1)"}`,
                    borderRadius: "var(--r)", padding: "10px 12px",
                  }}>
                    <div className="label" style={{ marginBottom: 8 }}>{abbr} Puck Line</div>
                    <div style={{ display: "flex", alignItems: "flex-end", gap: 10 }}>
                      <div>
                        <div style={{ fontSize: 9, color: "var(--text-3)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 2, fontFamily: "var(--font-mono)" }}>Line</div>
                        <div style={{
                          fontFamily: "'Big Shoulders Display', var(--font-display)",
                          fontSize: 22, fontWeight: 700, color, letterSpacing: "-0.02em",
                        }}>{plLine}</div>
                      </div>
                      <div style={{ color: "var(--border-1)", fontSize: 16, alignSelf: "center" }}>|</div>
                      <div>
                        <div style={{ fontSize: 9, color: "var(--text-3)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 2, fontFamily: "var(--font-mono)" }}>Odds</div>
                        <div style={{
                          fontFamily: "'Big Shoulders Display', var(--font-display)",
                          fontSize: 22, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.02em",
                        }}>{plOdds > 0 ? "+" : ""}{plOdds}</div>
                      </div>
                      {isRec && (
                        <div style={{ marginLeft: "auto" }}>
                          <div style={{ fontSize: 9, color: "var(--green)", letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: "var(--font-mono)", marginBottom: 2 }}>Edge</div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--green)", fontFamily: "var(--font-mono)" }}>
                            +{ba2.puckLineEdge.toFixed(1)}%
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}

        {/* PDO indicators */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 8 }}>
          {([
            ["H PDO", hTeam.pdo.toFixed(1), Math.abs(hTeam.pdo - 100) > 2 ? "var(--amber)" : "var(--cyan)"],
            ["A PDO", aTeam.pdo.toFixed(1), Math.abs(aTeam.pdo - 100) > 2 ? "var(--amber)" : "var(--cyan)"],
          ] as [string, string, string][]).map(([label, value, color]) => (
            <div key={label} style={{
              background: "rgba(0,0,0,0.2)", border: "1px solid var(--border-0)",
              borderRadius: "var(--r-sm)", padding: "8px", textAlign: "center",
            }}>
              <div className="label" style={{ marginBottom: 4 }}>{label}</div>
              <div style={{
                fontFamily: "'Big Shoulders Display', var(--font-display)",
                fontSize: 18, fontWeight: 700, color, letterSpacing: "-0.01em",
              }}>{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Model Inputs */}
      <div className="nhl-card">
        <div className="label" style={{ marginBottom: 14 }}>Model Inputs</div>
        {result.features.map((feature) => <FeatureRow key={feature.label} {...feature} />)}
      </div>

      {/* Betting Analysis */}
      {odds && (() => {
        const ba = analyzeBetting(result, odds);
        const edgeColor = (edge: number) => edge > 3 ? "var(--green)" : edge > 1 ? "var(--amber)" : "var(--text-3)";
        const recColor = (rec: string) => rec === "pass" ? "var(--text-3)" : "var(--green)";
        return (
          <div
            data-testid="betting-analysis"
            className="nhl-card"
            style={{ border: "1px solid var(--green-border)", background: "rgba(74,222,128,0.018)" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
              <div className="label" style={{ color: "var(--green)" }}>Betting Analysis</div>
              <span
                className={`chip ${odds.source === "espn" ? "chip--green" : "chip--amber"}`}
              >
                {odds.source === "espn" ? "Live ESPN Lines" : "Manual Lines"}
              </span>
            </div>

            {/* Implied vs model */}
            <div style={{ marginBottom: 16 }}>
              <div className="label" style={{ marginBottom: 10 }}>Implied Probability vs Model</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {([
                  [homeTeam, odds.homeMoneyline, ba.homeImpliedProb, result.hWinProb, ba.homeEdge, hColor],
                  [awayTeam, odds.awayMoneyline, ba.awayImpliedProb, result.aWinProb, ba.awayEdge, aColor],
                ] as [string, number, number, number, number, string][]).map(([abbr, ml, implied, model, edge, color]) => (
                  <div key={abbr} style={{
                    background: "rgba(0,0,0,0.2)",
                    border: `1px solid ${color}22`,
                    borderRadius: "var(--r)", padding: "14px 14px",
                  }}>
                    <div style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 11, fontWeight: 700, color,
                      letterSpacing: "0.1em", textTransform: "uppercase",
                      marginBottom: 12,
                    }}>{abbr}</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
                      <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: "var(--r-sm)", padding: "8px 10px" }}>
                        <div style={{ fontSize: 9, color: "var(--text-3)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4, fontFamily: "var(--font-mono)" }}>Vegas ML</div>
                        <div style={{
                          fontFamily: "'Big Shoulders Display', var(--font-display)",
                          fontSize: 22, fontWeight: 800, color: "var(--text)", letterSpacing: "-0.02em",
                        }}>{ml > 0 ? "+" : ""}{ml}</div>
                        <div style={{ fontSize: 10, color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>
                          {(implied * 100).toFixed(1)}% impl.
                        </div>
                      </div>
                      <div style={{ background: `${color}14`, borderRadius: "var(--r-sm)", padding: "8px 10px" }}>
                        <div style={{ fontSize: 9, color: "var(--text-3)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4, fontFamily: "var(--font-mono)" }}>Model ML</div>
                        <div style={{
                          fontFamily: "'Big Shoulders Display', var(--font-display)",
                          fontSize: 22, fontWeight: 800, color, letterSpacing: "-0.02em",
                        }}>
                          {model >= 0.5 ? `-${Math.round((model / (1 - model)) * 100)}` : `+${Math.round(((1 - model) / model) * 100)}`}
                        </div>
                        <div style={{ fontSize: 10, color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>
                          {(model * 100).toFixed(1)}% prob.
                        </div>
                      </div>
                    </div>
                    {/* Progress bar comparison */}
                    <div style={{ height: 3, background: "var(--border-0)", borderRadius: 2, marginBottom: 8, position: "relative" }}>
                      <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${implied * 100}%`, background: "var(--text-3)", borderRadius: 2 }} />
                      <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${model * 100}%`, background: color, borderRadius: 2, opacity: 0.8 }} />
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 10, color: "var(--text-3)", fontFamily: "var(--font-mono)", letterSpacing: "0.06em", textTransform: "uppercase" }}>Edge</span>
                      <span style={{
                        fontFamily: "'Big Shoulders Display', var(--font-display)",
                        fontSize: 16, fontWeight: 700, color: edgeColor(edge * 100),
                      }}>
                        {edge > 0 ? "+" : ""}{(edge * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bet rec cards */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              <div style={{
                background: "rgba(0,0,0,0.2)",
                border: `1px solid ${ba.mlValueSide !== "none" ? "var(--green-border)" : "var(--border-1)"}`,
                borderRadius: "var(--r)", padding: "12px 10px",
              }}>
                <div className="label" style={{ color: "var(--green)", marginBottom: 8 }}>Moneyline Value</div>
                <div style={{
                  fontFamily: "'Big Shoulders Display', var(--font-display)",
                  fontSize: 16, fontWeight: 700,
                  color: recColor(ba.mlValueSide === "none" ? "pass" : "bet"),
                  marginBottom: 5,
                }}>
                  {ba.mlValueSide === "none" ? "No Edge" : `${ba.mlValueSide.toUpperCase()} ML`}
                </div>
                {ba.mlValueSide !== "none" && (
                  <div style={{ fontSize: 11, color: "var(--green)", fontFamily: "var(--font-mono)" }}>
                    +{ba.mlValuePct.toFixed(1)}% edge
                  </div>
                )}
                {ba.mlValueSide !== "none" && (
                  <div style={{ fontSize: 11, color: "var(--text-2)", marginTop: 5, fontFamily: "var(--font-mono)" }}>
                    ¼ Kelly: {(Math.max(ba.kellyHome, ba.kellyAway) * 100).toFixed(1)}% bankroll
                  </div>
                )}
              </div>

              <div style={{
                background: "rgba(0,0,0,0.2)",
                border: `1px solid ${ba.puckLineRec !== "pass" ? "var(--green-border)" : "var(--border-1)"}`,
                borderRadius: "var(--r)", padding: "12px 10px",
              }}>
                <div className="label" style={{ color: "var(--green)", marginBottom: 8 }}>Puck Line</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 10 }}>
                  {[
                    [homeTeam, odds.puckLine <= 0 ? "-1.5" : "+1.5", odds.puckLineHomeOdds],
                    [awayTeam, odds.puckLine <= 0 ? "+1.5" : "-1.5", odds.puckLineAwayOdds],
                  ].map(([abbr, line, odds_val]) => (
                    <div key={String(abbr)} style={{ background: "rgba(255,255,255,0.04)", borderRadius: "var(--r-sm)", padding: "6px 8px" }}>
                      <div style={{ fontSize: 9, color: "var(--text-3)", marginBottom: 3, fontFamily: "var(--font-mono)", textTransform: "uppercase" }}>
                        {abbr} {line}
                      </div>
                      <div style={{
                        fontFamily: "'Big Shoulders Display', var(--font-display)",
                        fontSize: 18, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.01em",
                      }}>
                        {Number(odds_val) > 0 ? "+" : ""}{odds_val}
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{
                    fontFamily: "'Big Shoulders Display', var(--font-display)",
                    fontSize: 15, fontWeight: 700, color: recColor(ba.puckLineRec),
                  }}>
                    {ba.puckLineRec === "pass" ? "Pass" : ba.puckLineRec.toUpperCase()}
                  </div>
                  {ba.puckLineRec !== "pass" && (
                    <div style={{ fontSize: 11, color: "var(--green)", fontFamily: "var(--font-mono)", fontWeight: 700 }}>
                      +{ba.puckLineEdge.toFixed(1)}%
                    </div>
                  )}
                </div>
                <div style={{ fontSize: 10, color: "var(--text-3)", fontFamily: "var(--font-mono)", marginTop: 4 }}>
                  Proj diff: {(parseFloat(result.hGoals) - parseFloat(result.aGoals) > 0 ? "+" : "")}{(parseFloat(result.hGoals) - parseFloat(result.aGoals)).toFixed(2)} goals
                </div>
              </div>

              <div style={{
                background: "rgba(0,0,0,0.2)",
                border: `1px solid ${ba.ouRec !== "pass" ? "var(--green-border)" : "var(--border-1)"}`,
                borderRadius: "var(--r)", padding: "12px 10px",
              }}>
                <div className="label" style={{ color: "var(--green)", marginBottom: 8 }}>O/U {odds.overUnder}</div>
                <div style={{
                  fontFamily: "'Big Shoulders Display', var(--font-display)",
                  fontSize: 16, fontWeight: 700,
                  color: recColor(ba.ouRec), marginBottom: 5,
                }}>
                  {ba.ouRec === "pass" ? "Pass" : ba.ouRec.toUpperCase()}
                </div>
                <div style={{
                  fontSize: 11, fontFamily: "var(--font-mono)",
                  color: ba.ouRec === "over" ? "var(--cyan)" : ba.ouRec === "under" ? "var(--red)" : "var(--text-2)",
                }}>
                  Model: {result.total} ({(Math.abs(ba.ouEdge) * 100).toFixed(1)}% edge)
                </div>
                <div style={{ fontSize: 11, color: "var(--text-2)", marginTop: 5, fontFamily: "var(--font-mono)" }}>
                  {ba.ouRec === "pass" ? "Within margin" : "Price-adjusted total edge"}
                </div>
              </div>
            </div>

            <div style={{
              marginTop: 14, padding: "9px 12px",
              background: "var(--amber-lo)", border: "1px solid var(--amber-border)",
              borderRadius: "var(--r-sm)", fontSize: 10, color: "var(--amber)",
              fontFamily: "var(--font-mono)",
            }}>
              For entertainment only. Edge calculations assume a 50% efficient market. Always verify lines with your sportsbook before wagering.
            </div>
          </div>
        );
      })()}

      {/* Model note */}
      <div style={{
        background: "rgba(0,0,0,0.15)", border: "1px solid var(--border-0)",
        borderRadius: "var(--r)", padding: "12px 16px",
        fontSize: 11, color: "var(--text-2)", lineHeight: 1.8,
        fontFamily: "var(--font-mono)",
      }}>
        <span style={{ color: "var(--cyan)" }}>Model Note: </span>
        Corsi (shot attempt share) measures puck possession. xGF% weights shot quality.{" "}
        <strong style={{ color: "var(--text)" }}>Goalie SV% is the single most predictive variable</strong> — a .010 difference translates to ~1 expected goal.
        PDO above 101 or below 99 signals unsustainable luck. Playoff games suppress scoring ~6%.
        Ratings are{" "}
        {dataSource === "live"
          ? <span style={{ color: "var(--cyan)" }}>live — ESPN NHL API connected</span>
          : <span style={{ color: "var(--text-3)" }}>estimated 2024-25 values — click Fetch ESPN Data for live stats</span>
        }.
      </div>

      {/* Export button */}
      <button
        data-testid="export-single-game-button"
        onClick={onExportSingleGame}
        className="btn btn-success"
        style={{
          width: "100%", marginTop: 16, padding: "13px 0",
          fontSize: 12, letterSpacing: "0.14em",
        }}
      >
        Export to CSV · Google Sheets
      </button>
    </div>
  );
}
