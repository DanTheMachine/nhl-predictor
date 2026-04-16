import type { LiveTeamStats } from "../nhl-core/types";

interface DashboardHeaderProps {
  dataSource: "estimated" | "fetching" | "live";
  fetchStatus: string;
  fetchError: string;
  liveStats: Record<string, LiveTeamStats>;
  statsLastUpdated: string;
  onFetch: () => void;
  showNstPanel: boolean;
  onToggleNstPanel: () => void;
  nstStatus: string;
  nstPaste: string;
  onNstPasteChange: (value: string) => void;
  onParseNstData: () => void;
  onClearNstData: () => void;
  activeTab?: "predictor" | "evaluation";
  onTabChange?: (tab: "predictor" | "evaluation") => void;
}

export function DashboardHeader({
  dataSource,
  fetchStatus,
  fetchError,
  liveStats,
  statsLastUpdated,
  onFetch,
  showNstPanel,
  onToggleNstPanel,
  nstStatus,
  nstPaste,
  onNstPasteChange,
  onParseNstData,
  onClearNstData,
  activeTab,
  onTabChange,
}: DashboardHeaderProps) {
  const hasNstData = Object.values(liveStats).some((stats) => stats.lastUpdated?.startsWith("NST"));

  return (
    <>
      {/* ── Hero Header ── */}
      <div style={{ marginBottom: 28, paddingTop: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <span className="dot dot--header" />
          <span style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            color: "var(--cyan)",
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            fontWeight: 500,
          }}>
            NHL Analytics Engine
          </span>
        </div>

        <h1 style={{
          fontFamily: "'Big Shoulders Display', var(--font-display)",
          fontSize: "clamp(38px, 7vw, 76px)",
          fontWeight: 900,
          margin: "0 0 6px",
          lineHeight: 0.95,
          letterSpacing: "0.01em",
          textTransform: "uppercase",
          color: "var(--text)",
        }}>
          Power Play{" "}
          <span style={{
            background: "linear-gradient(120deg, #3b82f6, #22d3ee)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}>
            Predictor
          </span>
        </h1>

        <p style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          color: "var(--text-3)",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          margin: "0 0 16px",
        }}>
          Corsi · Fenwick · xGF% · Goalie SV% · PDO Regression · 100,000 Simulations
        </p>

        {/* Tab switcher */}
        {activeTab && onTabChange && (
          <div style={{
            display: "inline-flex",
            padding: 3,
            borderRadius: "var(--r-full)",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid var(--border-1)",
          }}>
            {[
              { id: "predictor", label: "Predictor" },
              { id: "evaluation", label: "Model Eval" },
            ].map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id as "predictor" | "evaluation")}
                  style={{
                    border: "none",
                    borderRadius: "var(--r-full)",
                    padding: "9px 20px",
                    background: active
                      ? "linear-gradient(135deg, #1e3a8a, #1d4ed8)"
                      : "transparent",
                    color: active ? "#dbeafe" : "var(--text-2)",
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    fontFamily: "var(--font-mono)",
                    cursor: "pointer",
                    transition: "all 0.18s ease",
                    boxShadow: active ? "0 2px 10px rgba(29,78,216,0.4)" : "none",
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Data Source Card ── */}
      <div
        className="nhl-card"
        style={{
          border: `1px solid ${
            dataSource === "live"
              ? "var(--green-border)"
              : dataSource === "fetching"
                ? "var(--cyan-border)"
                : "var(--border-1)"
          }`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
          padding: "16px 20px",
        }}
      >
        <div>
          <div className="label" style={{ marginBottom: 7 }}>Data Source</div>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <span
              className={`dot ${
                dataSource === "live"
                  ? "dot--live"
                  : dataSource === "fetching"
                    ? "dot--fetch"
                    : "dot--idle"
              }`}
            />
            <span style={{
              fontSize: 12,
              fontFamily: "var(--font-mono)",
              color: dataSource === "live"
                ? "var(--green)"
                : dataSource === "fetching"
                  ? "var(--cyan)"
                  : "var(--text-2)",
            }}>
              {dataSource === "live"
                ? fetchStatus
                : dataSource === "fetching"
                  ? fetchStatus
                  : Object.keys(liveStats).length > 0
                    ? `Live · ${Object.keys(liveStats).length} teams · updated ${statsLastUpdated}`
                    : "Estimated · 2026 values as of 3/30/26 · click Fetch to load live stats"}
            </span>
          </div>
          {fetchError && (
            <div style={{ fontSize: 11, color: "var(--text-2)", marginTop: 5, fontFamily: "var(--font-mono)" }}>
              Warning: {fetchError}
            </div>
          )}
        </div>
        <button
          onClick={onFetch}
          disabled={dataSource === "fetching"}
          className={`btn ${dataSource === "live" ? "btn-cyan" : "btn-primary"}`}
        >
          {dataSource === "fetching" ? "Loading…" : dataSource === "live" ? "Refresh" : "Fetch ESPN Data"}
        </button>
      </div>

      {/* ── Advanced Stats Import Card ── */}
      <div
        className="nhl-card"
        style={{
          border: "1px solid var(--amber-border)",
          background: "rgba(251,191,36,0.018)",
          padding: "16px 20px",
        }}
      >
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: showNstPanel ? 16 : 0,
        }}>
          <div>
            <div className="label" style={{ color: "#c4a84a", marginBottom: 5 }}>Advanced Stats Import</div>
            <div style={{
              fontSize: 11,
              fontFamily: "var(--font-mono)",
              color: nstStatus ? "var(--green)" : "var(--text-2)",
            }}>
              {nstStatus || "Paste Natural Stat Trick CSV to update CF% / xGF% / SV%"}
            </div>
          </div>
          <button onClick={onToggleNstPanel} className="btn btn-amber-ghost" style={{ fontSize: 10 }}>
            {showNstPanel ? "Hide" : "Import"}
          </button>
        </div>

        {showNstPanel && (
          <div>
            <div style={{
              fontSize: 11,
              fontFamily: "var(--font-mono)",
              color: "var(--text-2)",
              marginBottom: 12,
              lineHeight: 1.7,
            }}>
              <span style={{ color: "var(--amber)", fontWeight: 700 }}>How to get data: </span>
              Go to{" "}
              <a
                href="https://www.naturalstattrick.com/teamtable.php"
                target="_blank"
                rel="noopener noreferrer"
              >
                naturalstattrick.com
              </a>
              {" "}→ Team Summary → current season → All Situations or 5v5 → copy entire table and paste below.
              Columns auto-detected. Imports: CF%, FF%, xGF%, SV%, PP%, PK%, PDO.
            </div>
            <textarea
              value={nstPaste}
              onChange={(e) => onNstPasteChange(e.target.value)}
              placeholder="Team  GP  CF%  FF%  xGF%  SV%  PP%  PK%  PDO…  (paste NST table here)"
              style={{
                width: "100%",
                height: 120,
                background: "rgba(0,0,0,0.35)",
                border: "1px solid var(--amber-border)",
                borderRadius: "var(--r)",
                color: "var(--text)",
                fontSize: 11,
                fontFamily: "var(--font-mono)",
                padding: "10px 12px",
                resize: "vertical",
                boxSizing: "border-box",
                outline: "none",
              }}
            />
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button
                onClick={onParseNstData}
                disabled={!nstPaste.trim()}
                className="btn btn-amber"
                style={{ flex: 1, padding: "9px 0" }}
              >
                Apply NST Data
              </button>
              {hasNstData && (
                <button onClick={onClearNstData} className="btn btn-ghost" style={{ color: "var(--red)" }}>
                  Clear
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
