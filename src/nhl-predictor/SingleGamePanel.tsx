import type { OddsData } from "../nhl-core/types";

interface ManualOddsForm {
  homeMoneyline: string;
  awayMoneyline: string;
  homePuckLine: string;
  puckLineHomeOdds: string;
  puckLineAwayOdds: string;
  overUnder: string;
  overOdds: string;
  underOdds: string;
}

interface SingleGamePanelProps {
  running: boolean;
  simCount: number;
  onRunSim: () => void;
  odds: OddsData | null;
  oddsSource: "none" | "fetching" | "espn" | "manual";
  oddsStatus: string;
  onFetchOdds: () => void;
  manualOdds: ManualOddsForm;
  setManualOdds: React.Dispatch<React.SetStateAction<ManualOddsForm>>;
  setOddsSource: React.Dispatch<React.SetStateAction<"none" | "fetching" | "espn" | "manual">>;
  setOddsStatus: React.Dispatch<React.SetStateAction<string>>;
  setOdds: React.Dispatch<React.SetStateAction<OddsData | null>>;
  onApplyManualOdds: () => void;
}

export function SingleGamePanel(props: SingleGamePanelProps) {
  const {
    running,
    simCount,
    onRunSim,
    odds,
    oddsSource,
    oddsStatus,
    onFetchOdds,
    manualOdds,
    setManualOdds,
    setOddsSource,
    setOddsStatus,
    setOdds,
    onApplyManualOdds,
  } = props;

  return (
    <>
      <button
        data-testid="run-simulation-button"
        onClick={onRunSim}
        disabled={running}
        style={{ width: "100%", padding: 16, background: running ? "rgba(100,180,255,0.04)" : "linear-gradient(135deg,#0284c7,#0369a1)", border: running ? "1px solid rgba(100,180,255,0.08)" : "1px solid rgba(56,189,248,0.4)", borderRadius: 4, color: running ? "#8faabf" : "#e0f2fe", fontSize: 14, fontWeight: 900, letterSpacing: 5, fontFamily: "'Barlow Condensed',Impact,monospace", cursor: running ? "not-allowed" : "pointer", marginBottom: 20, transition: "all 0.3s", textShadow: running ? "none" : "0 0 20px rgba(56,189,248,0.4)", boxShadow: running ? "none" : "0 0 30px rgba(2,132,199,0.2)" }}
      >
        {running ? `SIMULATING  ${simCount.toLocaleString()} / 100,000` : "RUN SIMULATION"}
      </button>

      <div className="nhl-card" style={{ border: `1px solid ${oddsSource === "espn" ? "rgba(74,222,128,0.25)" : oddsSource === "manual" && odds ? "rgba(251,191,36,0.2)" : "rgba(100,180,255,0.2)"}` }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: oddsSource === "manual" ? 14 : 0 }}>
          <div>
            <div style={{ fontSize: 11, color: "#8faabf", letterSpacing: 3, marginBottom: 5 }}>LIVE ODDS / LINES</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: oddsSource === "espn" ? "#4ade80" : oddsSource === "fetching" ? "#38bdf8" : oddsSource === "manual" && odds ? "#fbbf24" : "#475569", animation: oddsSource === "fetching" ? "pulse 0.8s infinite" : "none" }} />
              <span data-testid="odds-status" style={{ fontSize: 12, color: oddsSource === "espn" ? "#4ade80" : oddsSource === "manual" && odds ? "#fbbf24" : "#94a8bf" }}>
                {oddsSource === "none" ? "Fetch today's lines or enter manually" : oddsStatus}
              </span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={onFetchOdds} disabled={oddsSource === "fetching"} style={{ background: oddsSource === "espn" ? "rgba(74,222,128,0.08)" : "linear-gradient(135deg,#0284c7,#0369a1)", border: oddsSource === "espn" ? "1px solid rgba(74,222,128,0.25)" : "none", borderRadius: 4, padding: "8px 14px", color: oddsSource === "espn" ? "#4ade80" : "#e0f2fe", fontSize: 11, fontWeight: 900, letterSpacing: 2, fontFamily: "monospace", cursor: oddsSource === "fetching" ? "not-allowed" : "pointer", whiteSpace: "nowrap" }}>
              {oddsSource === "fetching" ? "CHECKING..." : oddsSource === "espn" ? "REFRESH" : "FETCH LINES"}
            </button>
            <button
              data-testid="manual-odds-button"
              onClick={() => {
                setOddsSource("manual");
                setOddsStatus("Enter lines below and click Apply");
                if (odds) {
                  setManualOdds({
                    homeMoneyline: String(odds.homeMoneyline),
                    awayMoneyline: String(odds.awayMoneyline),
                    homePuckLine: odds.puckLine <= 0 ? "-1.5" : "+1.5",
                    puckLineHomeOdds: String(odds.puckLineHomeOdds),
                    puckLineAwayOdds: String(odds.puckLineAwayOdds),
                    overUnder: String(odds.overUnder),
                    overOdds: String(odds.overOdds),
                    underOdds: String(odds.underOdds),
                  });
                } else {
                  setOdds(null);
                }
              }}
              style={{ background: "rgba(100,180,255,0.04)", border: "1px solid rgba(100,180,255,0.15)", borderRadius: 4, padding: "8px 14px", color: "#7aaac8", fontSize: 11, letterSpacing: 2, fontFamily: "monospace", cursor: "pointer" }}
            >
              MANUAL
            </button>
          </div>
        </div>

        {oddsSource === "manual" && (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <span style={{ fontSize: 11, color: "#8fa8bf", fontFamily: "monospace", letterSpacing: 1 }}>PUCK LINE DIRECTION:</span>
              {(["-1.5", "+1.5"] as const).map((val) => {
                const active = (manualOdds.homePuckLine ?? "-1.5") === val;
                return (
                  <button data-testid={`manual-puck-line-${val === "-1.5" ? "home-favorite" : "away-favorite"}`} key={val} onClick={() => setManualOdds((prev) => ({ ...prev, homePuckLine: val }))} style={{ background: active ? "rgba(100,180,255,0.15)" : "transparent", border: `1px solid ${active ? "#58a6ff" : "#30363d"}`, borderRadius: 4, padding: "4px 14px", color: active ? "#cae8ff" : "#6e7681", fontSize: 11, fontWeight: 700, fontFamily: "monospace", cursor: "pointer" }}>
                    HOME {val} / AWAY {val === "-1.5" ? "+1.5" : "-1.5"}
                  </button>
                );
              })}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 10 }}>
              {([
                ["HOME ML", "homeMoneyline", "-160"],
                ["AWAY ML", "awayMoneyline", "+135"],
                ["O/U LINE", "overUnder", "5.5"],
                [`HOME ${manualOdds.homePuckLine ?? "-1.5"} ODDS`, "puckLineHomeOdds", "+145"],
                [`AWAY ${manualOdds.homePuckLine === "+1.5" ? "-1.5" : "+1.5"} ODDS`, "puckLineAwayOdds", "-175"],
                ["OVER ODDS", "overOdds", "-110"],
              ] as [string, keyof ManualOddsForm, string][]).map(([label, key, placeholder]) => (
                <div key={key}>
                  <div style={{ fontSize: 11, color: "#8fa8bf", letterSpacing: 2, marginBottom: 4 }}>{label}</div>
                  <input data-testid={`manual-odds-${key}`} value={manualOdds[key]} onChange={(e) => setManualOdds((prev) => ({ ...prev, [key]: e.target.value }))} placeholder={placeholder} style={{ background: "rgba(100,180,255,0.05)", border: "1px solid rgba(100,180,255,0.15)", borderRadius: 4, padding: "7px 10px", color: "#c8e8ff", fontFamily: "monospace", fontSize: 13, width: "100%", boxSizing: "border-box" }} />
                </div>
              ))}
            </div>
            <button data-testid="apply-manual-odds-button" onClick={onApplyManualOdds} style={{ width: "100%", padding: "9px", background: "linear-gradient(135deg,#065f46,#047857)", border: "none", borderRadius: 4, color: "#d1fae5", fontSize: 12, fontWeight: 900, letterSpacing: 3, fontFamily: "monospace", cursor: "pointer" }}>
              APPLY MANUAL LINES
            </button>
          </div>
        )}
      </div>
    </>
  );
}
