import { StatBar, TeamCard } from "../nhl-core/components";
import { DIVISIONS, GAME_TYPES, TEAMS } from "../nhl-core/data";
import type { EspnMap, LiveTeamStats } from "../nhl-core/types";

interface TeamSelectProps {
  value: string;
  onChange: (v: string) => void;
  excludeKey?: string;
  label: string;
  testId?: string;
  divFilter: string;
}

function TeamSelect({ value, onChange, excludeKey, label, testId, divFilter }: TeamSelectProps) {
  const confs = [...new Set(Object.values(TEAMS).map((team) => team.conf))];
  return (
    <div>
      <div className="label" style={{ marginBottom: 6 }}>{label}</div>
      <select
        data-testid={testId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input"
      >
        {confs.map((conf) => {
          const teams = Object.entries(TEAMS).filter(
            ([abbr, team]) => team.conf === conf && abbr !== excludeKey && (divFilter === "ALL" || team.div === divFilter)
          );
          if (teams.length === 0) return null;
          return (
            <optgroup key={conf} label={conf}>
              {teams.map(([abbr, team]) => (
                <option key={abbr} value={abbr}>{abbr} – {team.name}</option>
              ))}
            </optgroup>
          );
        })}
      </select>
    </div>
  );
}

interface ModelSetupPanelProps {
  showSingleGameExtras: boolean;
  divFilter: string;
  onDivFilterChange: (value: string) => void;
  homeTeam: string;
  awayTeam: string;
  onHomeTeamChange: (value: string) => void;
  onAwayTeamChange: (value: string) => void;
  espnData: EspnMap | null;
  liveStats: Record<string, LiveTeamStats>;
  gameType: string;
  onGameTypeChange: (value: string) => void;
  homeB2B: boolean;
  awayB2B: boolean;
  onHomeB2BChange: (value: boolean) => void;
  onAwayB2BChange: (value: boolean) => void;
  hColor: string;
  aColor: string;
  hTeam: typeof TEAMS[string];
  aTeam: typeof TEAMS[string];
}

export function ModelSetupPanel({
  showSingleGameExtras,
  divFilter,
  onDivFilterChange,
  homeTeam,
  awayTeam,
  onHomeTeamChange,
  onAwayTeamChange,
  espnData,
  liveStats,
  gameType,
  onGameTypeChange,
  homeB2B,
  awayB2B,
  onHomeB2BChange,
  onAwayB2BChange,
  hColor,
  aColor,
  hTeam,
  aTeam,
}: ModelSetupPanelProps) {
  if (!showSingleGameExtras) {
    return null;
  }

  return (
    <>
      <div className="nhl-card">
        {/* Division filter */}
        <div style={{ marginBottom: 16 }}>
          <div className="label" style={{ marginBottom: 8 }}>Filter by Division</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
            {["ALL", ...DIVISIONS].map((division) => (
              <button
                key={division}
                onClick={() => onDivFilterChange(division)}
                style={{
                  padding: "4px 12px",
                  borderRadius: "var(--r-sm)",
                  fontSize: 10,
                  fontFamily: "var(--font-mono)",
                  cursor: "pointer",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  fontWeight: 700,
                  background: divFilter === division ? "var(--blue)" : "transparent",
                  color: divFilter === division ? "#dbeafe" : "var(--text-2)",
                  border: divFilter === division
                    ? "1px solid var(--blue-border)"
                    : "1px solid var(--border-1)",
                  transition: "all 0.15s",
                }}
              >
                {division}
              </button>
            ))}
          </div>
        </div>

        {/* Team selects */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
          <TeamSelect value={homeTeam} onChange={onHomeTeamChange} excludeKey={awayTeam} label="Home Team" testId="home-team-select" divFilter={divFilter} />
          <TeamSelect value={awayTeam} onChange={onAwayTeamChange} excludeKey={homeTeam} label="Away Team" testId="away-team-select" divFilter={divFilter} />
        </div>

        {/* Team cards */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
          <TeamCard abbr={homeTeam} side="HOME" espnData={espnData} liveStats={liveStats} />
          <TeamCard abbr={awayTeam} side="AWAY" espnData={espnData} liveStats={liveStats} />
        </div>

        {/* Game type + B2B */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          <div>
            <div className="label" style={{ marginBottom: 6 }}>Game Type</div>
            <select
              data-testid="game-type-select"
              value={gameType}
              onChange={(e) => onGameTypeChange(e.target.value)}
              className="input"
            >
              {GAME_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
          </div>
          {([
            [homeTeam, homeB2B, onHomeB2BChange],
            [awayTeam, awayB2B, onAwayB2BChange],
          ] as [string, boolean, (value: boolean) => void][]).map(([abbr, value, setter]) => (
            <div
              key={abbr}
              onClick={() => setter(!value)}
              style={{
                background: value ? "var(--cyan-lo)" : "rgba(255,255,255,0.02)",
                border: `1px solid ${value ? "var(--cyan-border)" : "var(--border-1)"}`,
                borderRadius: "var(--r)",
                padding: "11px 13px",
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              <div className="label" style={{ marginBottom: 7 }}>Back-to-Back</div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 11, color: value ? "var(--cyan)" : "var(--text-2)", fontFamily: "var(--font-mono)" }}>
                  {TEAMS[abbr].name}
                </span>
                <span style={{
                  fontSize: 9, padding: "2px 8px", borderRadius: "var(--r-sm)",
                  fontWeight: 700, fontFamily: "var(--font-mono)", letterSpacing: "0.08em",
                  background: value ? "var(--cyan-lo)" : "rgba(255,255,255,0.04)",
                  color: value ? "var(--cyan)" : "var(--text-3)",
                  border: `1px solid ${value ? "var(--cyan-border)" : "var(--border-0)"}`,
                }}>
                  {value ? "YES" : "NO"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Advanced stats comparison */}
      <div className="nhl-card">
        <div className="label" style={{ marginBottom: 14 }}>Advanced Stats Comparison</div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
          <span style={{ fontSize: 11, color: hColor, fontFamily: "var(--font-mono)", letterSpacing: "0.06em" }}>{hTeam.name}</span>
          <span style={{ fontSize: 11, color: aColor, fontFamily: "var(--font-mono)", letterSpacing: "0.06em" }}>{aTeam.name}</span>
        </div>
        <StatBar label="Corsi For %" hVal={hTeam.cf} aVal={aTeam.cf} hColor={hColor} aColor={aColor} lo={42} hi={58} format="pct" />
        <StatBar label="Expected Goals For %" hVal={hTeam.xgf} aVal={aTeam.xgf} hColor={hColor} aColor={aColor} lo={43} hi={57} format="pct" />
        <StatBar label="Goalie Save %" hVal={hTeam.goalieSV} aVal={aTeam.goalieSV} hColor={hColor} aColor={aColor} lo={0.895} hi={0.93} format="sv" />
        <StatBar label="Power Play %" hVal={hTeam.ppPct} aVal={aTeam.ppPct} hColor={hColor} aColor={aColor} lo={16} hi={28} format="pct" />
        <StatBar label="Penalty Kill %" hVal={hTeam.pkPct} aVal={aTeam.pkPct} hColor={hColor} aColor={aColor} lo={76} hi={86} format="pct" />
        <StatBar label="PDO (100 = neutral)" hVal={hTeam.pdo} aVal={aTeam.pdo} hColor={hColor} aColor={aColor} lo={97} hi={103} />
      </div>
    </>
  );
}
