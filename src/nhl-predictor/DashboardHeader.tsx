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
      <div style={{ marginBottom: 24, paddingTop: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: "#38bdf8",
              boxShadow: "0 0 12px #38bdf8",
              animation: "pulse 2s infinite",
            }}
          />
          <span style={{ fontSize: 11, color: "#38bdf8", letterSpacing: 5, fontFamily: "'Barlow Condensed',monospace" }}>
            NHL ANALYTICS ENGINE
          </span>
        </div>
        <h1
          style={{
            fontFamily: "'Barlow Condensed',Impact,sans-serif",
            fontSize: "clamp(34px,6vw,62px)",
            fontWeight: 900,
            margin: "4px 0 2px",
            lineHeight: 1,
            letterSpacing: 3,
            color: "#c8e8ff",
            textShadow: "0 0 40px rgba(56,189,248,0.2)",
          }}
        >
          POWER PLAY <span style={{ color: "#38bdf8" }}>PREDICTOR</span>
        </h1>
        <p style={{ fontSize: 11, color: "#8faabf", letterSpacing: 4, margin: 0 }}>
          CORSI - FENWICK - XGF% - GOALIE SV% - PDO REGRESSION - 100,000 SIMULATIONS
        </p>
        {activeTab && onTabChange && (
          <div
            style={{
              marginTop: 14,
              display: "inline-flex",
              padding: 4,
              borderRadius: 999,
              background: "rgba(13,17,23,0.85)",
              border: "1px solid rgba(125,211,252,0.16)",
            }}
          >
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
                    borderRadius: 999,
                    padding: "10px 18px",
                    background: active ? "linear-gradient(135deg,#0f766e,#14b8a6)" : "transparent",
                    color: active ? "#ecfeff" : "#9fb3c8",
                    fontSize: 11,
                    fontWeight: 900,
                    letterSpacing: 2,
                    fontFamily: "monospace",
                    cursor: "pointer",
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div
        className="nhl-card"
        style={{
          border: `1px solid ${
            dataSource === "live"
              ? "rgba(125,211,252,0.3)"
              : dataSource === "fetching"
                ? "rgba(56,189,248,0.3)"
                : "rgba(100,180,255,0.2)"
          }`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <div>
          <div style={{ fontSize: 11, color: "#8faabf", letterSpacing: 3, marginBottom: 5 }}>DATA SOURCE</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: dataSource === "live" ? "#4ade80" : dataSource === "fetching" ? "#38bdf8" : "#475569",
                boxShadow: dataSource === "live" ? "0 0 8px #4ade80" : "none",
                animation: dataSource === "fetching" ? "pulse 0.8s infinite" : "none",
              }}
            />
            <span style={{ fontSize: 12, color: dataSource === "live" ? "#4ade80" : dataSource === "fetching" ? "#38bdf8" : "#94a8bf" }}>
              {dataSource === "live"
                ? fetchStatus
                : dataSource === "fetching"
                  ? fetchStatus
                  : Object.keys(liveStats).length > 0
                    ? `LIVE - ${Object.keys(liveStats).length} teams - updated ${statsLastUpdated}`
                    : "ESTIMATED - 2024-25 approximations - click Fetch to load live stats"}
            </span>
          </div>
          {fetchError && <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>Warning: {fetchError}</div>}
        </div>
        <button
          onClick={onFetch}
          disabled={dataSource === "fetching"}
          style={{
            background: dataSource === "live" ? "rgba(125,211,252,0.07)" : "linear-gradient(135deg,#0284c7,#0369a1)",
            border: dataSource === "live" ? "1px solid rgba(125,211,252,0.25)" : "none",
            borderRadius: 4,
            padding: "9px 18px",
            color: dataSource === "live" ? "#7dd3fc" : "#e0f2fe",
            fontSize: 11,
            fontWeight: 900,
            letterSpacing: 2,
            fontFamily: "monospace",
            cursor: dataSource === "fetching" ? "not-allowed" : "pointer",
            whiteSpace: "nowrap",
          }}
        >
          {dataSource === "fetching" ? "LOADING..." : dataSource === "live" ? "REFRESH" : "FETCH ESPN DATA"}
        </button>
      </div>

      <div className="nhl-card" style={{ border: "1px solid rgba(251,191,36,0.2)", background: "rgba(251,191,36,0.02)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: showNstPanel ? 14 : 0 }}>
          <div>
            <div style={{ fontSize: 11, color: "#c4a84a", letterSpacing: 3, marginBottom: 4 }}>ADVANCED STATS IMPORT</div>
            <div style={{ fontSize: 11, color: nstStatus ? "#4ade80" : "#b3c0cc" }}>
              {nstStatus || "Paste Natural Stat Trick CSV to update CF% / xGF% / SV%"}
            </div>
          </div>
          <button
            onClick={onToggleNstPanel}
            style={{
              background: "rgba(251,191,36,0.08)",
              border: "1px solid rgba(251,191,36,0.2)",
              borderRadius: 4,
              padding: "7px 14px",
              color: "#c4a84a",
              fontSize: 11,
              fontWeight: 900,
              letterSpacing: 2,
              fontFamily: "monospace",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            {showNstPanel ? "HIDE" : "IMPORT"}
          </button>
        </div>

        {showNstPanel && (
          <div>
            <div style={{ fontSize: 11, color: "#b3c0cc", marginBottom: 10, lineHeight: 1.7 }}>
              <span style={{ color: "#c4a84a", fontWeight: 700 }}>How to get data: </span>
              Go to{" "}
              <a
                href="https://www.naturalstattrick.com/teamtable.php"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "#7dd3fc", textDecoration: "underline", cursor: "pointer" }}
              >
                naturalstattrick.com
              </a>
              , then Team Summary, then select current season, then All Situations or 5v5, then copy the entire table and paste below. Columns auto-detected. Imports: CF%, FF%, xGF%, SV%, PP%, PK%, PDO.
            </div>
            <textarea
              value={nstPaste}
              onChange={(e) => onNstPasteChange(e.target.value)}
              placeholder="Team  GP  CF%  FF%  xGF%  SV%  PP%  PK%  PDO...  (paste NST table here)"
              style={{
                width: "100%",
                height: 120,
                background: "#0d1117",
                border: "1px solid rgba(251,191,36,0.2)",
                borderRadius: 4,
                color: "#c8e8ff",
                fontSize: 11,
                fontFamily: "monospace",
                padding: 10,
                resize: "vertical",
                boxSizing: "border-box",
              }}
            />
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button
                onClick={onParseNstData}
                disabled={!nstPaste.trim()}
                style={{
                  flex: 1,
                  padding: "9px 0",
                  background: nstPaste.trim() ? "linear-gradient(135deg,#b45309,#92400e)" : "rgba(100,180,255,0.04)",
                  border: nstPaste.trim() ? "none" : "1px solid rgba(100,180,255,0.08)",
                  borderRadius: 4,
                  color: nstPaste.trim() ? "#fef3c7" : "#3d444d",
                  fontSize: 11,
                  fontWeight: 900,
                  letterSpacing: 3,
                  fontFamily: "monospace",
                  cursor: nstPaste.trim() ? "pointer" : "not-allowed",
                }}
              >
                APPLY NST DATA
              </button>
              {hasNstData && (
                <button
                  onClick={onClearNstData}
                  style={{
                    padding: "9px 14px",
                    background: "rgba(248,81,73,0.08)",
                    border: "1px solid rgba(248,81,73,0.2)",
                    borderRadius: 4,
                    color: "#f85149",
                    fontSize: 11,
                    fontWeight: 900,
                    letterSpacing: 2,
                    fontFamily: "monospace",
                    cursor: "pointer",
                  }}
                >
                  CLEAR
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
