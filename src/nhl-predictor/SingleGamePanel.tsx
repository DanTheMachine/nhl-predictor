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
  isOpen: boolean;
  onToggleOpen: () => void;
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
    isOpen,
    onToggleOpen,
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
    <div className="nhl-card" style={{ marginBottom: 20 }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        gap: 12, flexWrap: "wrap",
      }}>
        <div>
          <div className="label" style={{ marginBottom: 5 }}>Single Game Tools</div>
          <div style={{ fontSize: 12, color: "var(--text-2)", fontFamily: "var(--font-mono)" }}>
            Run one matchup manually and fetch or edit its lines.
          </div>
        </div>
        <button
          data-testid="single-game-toggle"
          onClick={onToggleOpen}
          className={`btn ${isOpen ? "btn-cyan" : "btn-ghost"}`}
        >
          {isOpen ? "Hide Single Game" : "Open Single Game"}
        </button>
      </div>

      {isOpen && (
        <div style={{ marginTop: 18 }}>
          {/* Run Simulation button */}
          <button
            data-testid="run-simulation-button"
            onClick={onRunSim}
            disabled={running}
            style={{
              width: "100%",
              padding: "16px",
              background: running
                ? "rgba(255,255,255,0.03)"
                : "linear-gradient(135deg, #1e3a8a, #1d4ed8)",
              border: running
                ? "1px solid var(--border-1)"
                : "1px solid rgba(59,130,246,0.45)",
              borderRadius: "var(--r)",
              color: running ? "var(--text-2)" : "#dbeafe",
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              fontFamily: "var(--font-display)",
              cursor: running ? "not-allowed" : "pointer",
              marginBottom: 16,
              transition: "all 0.25s",
              boxShadow: running ? "none" : "0 4px 20px rgba(29,78,216,0.3), 0 0 0 1px rgba(59,130,246,0.2) inset",
            }}
          >
            {running ? `Simulating  ${simCount.toLocaleString()} / 100,000` : "Run Simulation"}
          </button>

          {/* Odds card */}
          <div
            className="nhl-card"
            style={{
              marginBottom: 0,
              border: `1px solid ${
                oddsSource === "espn"
                  ? "var(--green-border)"
                  : oddsSource === "manual" && odds
                    ? "var(--amber-border)"
                    : "var(--border-1)"
              }`,
            }}
          >
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              flexWrap: "wrap", gap: 10,
              marginBottom: oddsSource === "manual" ? 16 : 0,
            }}>
              <div>
                <div className="label" style={{ marginBottom: 6 }}>Live Odds / Lines</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span
                    className={`dot ${
                      oddsSource === "espn"
                        ? "dot--live"
                        : oddsSource === "fetching"
                          ? "dot--fetch"
                          : oddsSource === "manual" && odds
                            ? ""
                            : "dot--idle"
                    }`}
                    style={oddsSource === "manual" && odds
                      ? { background: "var(--amber)", width: 7, height: 7, borderRadius: "50%", flexShrink: 0 }
                      : undefined
                    }
                  />
                  <span
                    data-testid="odds-status"
                    style={{
                      fontSize: 12,
                      fontFamily: "var(--font-mono)",
                      color: oddsSource === "espn"
                        ? "var(--green)"
                        : oddsSource === "manual" && odds
                          ? "var(--amber)"
                          : "var(--text-2)",
                    }}
                  >
                    {oddsSource === "none" ? "Fetch today's lines or enter manually" : oddsStatus}
                  </span>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={onFetchOdds}
                  disabled={oddsSource === "fetching"}
                  className={`btn ${oddsSource === "espn" ? "btn-green-ghost" : "btn-primary"}`}
                  style={{ fontSize: 10 }}
                >
                  {oddsSource === "fetching" ? "Checking…" : oddsSource === "espn" ? "Refresh" : "Fetch Lines"}
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
                  className="btn btn-ghost"
                  style={{ fontSize: 10 }}
                >
                  Manual
                </button>
              </div>
            </div>

            {oddsSource === "manual" && (
              <div>
                {/* Puck line direction */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                  <span className="label">Puck Line Direction:</span>
                  {(["-1.5", "+1.5"] as const).map((val) => {
                    const active = (manualOdds.homePuckLine ?? "-1.5") === val;
                    return (
                      <button
                        data-testid={`manual-puck-line-${val === "-1.5" ? "home-favorite" : "away-favorite"}`}
                        key={val}
                        onClick={() => setManualOdds((prev) => ({ ...prev, homePuckLine: val }))}
                        style={{
                          background: active ? "var(--blue-lo)" : "transparent",
                          border: `1px solid ${active ? "var(--blue-border)" : "var(--border-1)"}`,
                          borderRadius: "var(--r-sm)",
                          padding: "5px 14px",
                          color: active ? "var(--blue)" : "var(--text-2)",
                          fontSize: 10,
                          fontWeight: 700,
                          fontFamily: "var(--font-mono)",
                          letterSpacing: "0.06em",
                          cursor: "pointer",
                          transition: "all 0.15s",
                        }}
                      >
                        Home {val} / Away {val === "-1.5" ? "+1.5" : "-1.5"}
                      </button>
                    );
                  })}
                </div>

                {/* Odds inputs */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 12 }}>
                  {([
                    ["Home ML", "homeMoneyline", "-160"],
                    ["Away ML", "awayMoneyline", "+135"],
                    ["O/U Line", "overUnder", "5.5"],
                    [`Home ${manualOdds.homePuckLine ?? "-1.5"} Odds`, "puckLineHomeOdds", "+145"],
                    [`Away ${manualOdds.homePuckLine === "+1.5" ? "-1.5" : "+1.5"} Odds`, "puckLineAwayOdds", "-175"],
                    ["Over Odds", "overOdds", "-110"],
                  ] as [string, keyof ManualOddsForm, string][]).map(([label, key, placeholder]) => (
                    <div key={key}>
                      <div className="label" style={{ marginBottom: 5 }}>{label}</div>
                      <input
                        data-testid={`manual-odds-${key}`}
                        value={manualOdds[key]}
                        onChange={(e) => setManualOdds((prev) => ({ ...prev, [key]: e.target.value }))}
                        placeholder={placeholder}
                        className="input"
                      />
                    </div>
                  ))}
                </div>
                <button
                  data-testid="apply-manual-odds-button"
                  onClick={onApplyManualOdds}
                  className="btn btn-success"
                  style={{ width: "100%", padding: "10px 0", fontSize: 11 }}
                >
                  Apply Manual Lines
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
