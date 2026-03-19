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
      <div style={{ fontSize: 11, color: "#8faabf", letterSpacing: 3, marginBottom: 5 }}>{label}</div>
      <select data-testid={testId} value={value} onChange={(e) => onChange(e.target.value)} style={{ background: "rgba(100,180,255,0.04)", border: "1px solid rgba(100,180,255,0.08)", borderRadius: 4, padding: "12px 10px", color: "#c8e8ff", fontSize: 13, width: "100%", outline: "none" }}>
        {confs.map((conf) => {
          const teams = Object.entries(TEAMS).filter(([abbr, team]) => team.conf === conf && abbr !== excludeKey && (divFilter === "ALL" || team.div === divFilter));
          if (teams.length === 0) return null;
          return (
            <optgroup key={conf} label={conf}>
              {teams.map(([abbr, team]) => (
                <option key={abbr} value={abbr}>
                  {abbr} - {team.name}
                </option>
              ))}
            </optgroup>
          );
        })}
      </select>
    </div>
  );
}

interface ModelSetupPanelProps {
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
  return (
    <>
      <div className="nhl-card">
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: "#8faabf", letterSpacing: 3, marginBottom: 6 }}>FILTER BY DIVISION</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
            {["ALL", ...DIVISIONS].map((division) => (
              <button key={division} onClick={() => onDivFilterChange(division)} style={{ padding: "3px 10px", borderRadius: 3, fontSize: 11, fontFamily: "monospace", cursor: "pointer", letterSpacing: 1, background: divFilter === division ? "#0284c7" : "rgba(100,180,255,0.04)", color: divFilter === division ? "#e0f2fe" : "#94a8bf", border: divFilter === division ? "none" : "1px solid rgba(100,180,255,0.1)", fontWeight: divFilter === division ? 900 : 400 }}>
                {division}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
          <TeamSelect value={homeTeam} onChange={onHomeTeamChange} excludeKey={awayTeam} label="Home Team" testId="home-team-select" divFilter={divFilter} />
          <TeamSelect value={awayTeam} onChange={onAwayTeamChange} excludeKey={homeTeam} label="Away Team" testId="away-team-select" divFilter={divFilter} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
          <TeamCard abbr={homeTeam} side="HOME" espnData={espnData} liveStats={liveStats} />
          <TeamCard abbr={awayTeam} side="AWAY" espnData={espnData} liveStats={liveStats} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          <div>
            <div style={{ fontSize: 11, color: "#8faabf", letterSpacing: 3, marginBottom: 5 }}>GAME TYPE</div>
            <select data-testid="game-type-select" value={gameType} onChange={(e) => onGameTypeChange(e.target.value)} style={{ background: "rgba(100,180,255,0.04)", border: "1px solid rgba(100,180,255,0.08)", borderRadius: 4, padding: "12px 10px", color: "#c8e8ff", fontSize: 13, width: "100%", outline: "none" }}>
              {GAME_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
          </div>
          {([
            [homeTeam, homeB2B, onHomeB2BChange],
            [awayTeam, awayB2B, onAwayB2BChange],
          ] as [string, boolean, (value: boolean) => void][]).map(([abbr, value, setter]) => (
            <div key={abbr} onClick={() => setter(!value)} style={{ background: value ? "rgba(125,211,252,0.06)" : "rgba(100,180,255,0.2)", border: `1px solid ${value ? "rgba(125,211,252,0.25)" : "rgba(100,180,255,0.2)"}`, borderRadius: 4, padding: "10px 12px", cursor: "pointer" }}>
              <div style={{ fontSize: 11, color: "#8faabf", letterSpacing: 2, marginBottom: 6 }}>BACK-TO-BACK</div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 11, color: value ? "#7dd3fc" : "#94a8bf" }}>{TEAMS[abbr].name}</span>
                <span style={{ fontSize: 10, padding: "1px 7px", borderRadius: 2, background: value ? "rgba(125,211,252,0.12)" : "rgba(100,180,255,0.25)", color: value ? "#7dd3fc" : "#8fa8bf" }}>{value ? "YES" : "NO"}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="nhl-card">
        <div style={{ fontSize: 11, color: "#8faabf", letterSpacing: 3, marginBottom: 14 }}>ADVANCED STATS COMPARISON</div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
          <span style={{ fontSize: 11, color: hColor, fontFamily: "'Barlow Condensed',monospace", letterSpacing: 1 }}>{hTeam.name}</span>
          <span style={{ fontSize: 11, color: aColor, fontFamily: "'Barlow Condensed',monospace", letterSpacing: 1 }}>{aTeam.name}</span>
        </div>
        <StatBar label="CORSI FOR %" hVal={hTeam.cf} aVal={aTeam.cf} hColor={hColor} aColor={aColor} lo={42} hi={58} format="pct" />
        <StatBar label="EXPECTED GOALS FOR %" hVal={hTeam.xgf} aVal={aTeam.xgf} hColor={hColor} aColor={aColor} lo={43} hi={57} format="pct" />
        <StatBar label="GOALIE SAVE %" hVal={hTeam.goalieSV} aVal={aTeam.goalieSV} hColor={hColor} aColor={aColor} lo={0.895} hi={0.93} format="sv" />
        <StatBar label="POWER PLAY %" hVal={hTeam.ppPct} aVal={aTeam.ppPct} hColor={hColor} aColor={aColor} lo={16} hi={28} format="pct" />
        <StatBar label="PENALTY KILL %" hVal={hTeam.pkPct} aVal={aTeam.pkPct} hColor={hColor} aColor={aColor} lo={76} hi={86} format="pct" />
        <StatBar label="PDO (100 = NEUTRAL)" hVal={hTeam.pdo} aVal={aTeam.pdo} hColor={hColor} aColor={aColor} lo={97} hi={103} />
      </div>
    </>
  );
}
