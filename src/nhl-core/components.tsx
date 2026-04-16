import { ICE_CONDITIONS, TEAMS } from "./data";
import type { EspnMap, Feature, LiveTeamStats } from "./types";

interface IceRinkProps {
  hProb: number;
  hColor: string;
  aColor: string;
  hName: string;
  aName: string;
}

export function IceRink({ hProb, hColor, aColor, hName, aName }: IceRinkProps) {
  return (
    <div>
      <div style={{
        position: "relative",
        height: 64,
        borderRadius: 32,
        overflow: "hidden",
        border: "1px solid var(--border-1)",
        boxShadow: "0 0 24px rgba(59,130,246,0.08) inset",
        background: "rgba(0,0,0,0.2)",
      }}>
        {/* Center line */}
        <div style={{
          position: "absolute", left: "50%", top: 0, bottom: 0,
          width: 1, background: "rgba(255,255,255,0.12)", zIndex: 3,
        }} />
        {/* Center circle */}
        <div style={{
          position: "absolute", left: "50%", top: "50%",
          transform: "translate(-50%,-50%)",
          width: 28, height: 28, borderRadius: "50%",
          border: "1px solid rgba(255,255,255,0.1)", zIndex: 3,
        }} />
        {/* Ice lines overlay */}
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: "repeating-linear-gradient(90deg,transparent,transparent 9.8%,rgba(255,255,255,0.02) 9.8%,rgba(255,255,255,0.02) 10%)",
          zIndex: 2, pointerEvents: "none",
        }} />
        {/* Home bar */}
        <div style={{
          width: `${hProb * 100}%`,
          background: `linear-gradient(90deg, ${hColor}dd, ${hColor}88)`,
          height: "100%",
          transition: "width 1.5s cubic-bezier(.4,0,.2,1)",
          display: "flex", alignItems: "center", paddingLeft: 20,
          position: "relative", zIndex: 1,
        }}>
          <span style={{
            fontSize: 15, fontWeight: 700,
            color: "#fff",
            fontFamily: "var(--font-display)",
            textShadow: "0 1px 8px rgba(0,0,0,0.8)",
            letterSpacing: "-0.02em",
          }}>
            {(hProb * 100).toFixed(1)}%
          </span>
        </div>
        {/* Away bar */}
        <div style={{
          position: "absolute", right: 0, top: 0,
          width: `${(1 - hProb) * 100}%`,
          background: `linear-gradient(90deg, ${aColor}88, ${aColor}dd)`,
          height: "100%",
          transition: "width 1.5s cubic-bezier(.4,0,.2,1)",
          display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: 20,
          zIndex: 1,
        }}>
          <span style={{
            fontSize: 15, fontWeight: 700,
            color: "#fff",
            fontFamily: "var(--font-display)",
            textShadow: "0 1px 8px rgba(0,0,0,0.8)",
            letterSpacing: "-0.02em",
          }}>
            {((1 - hProb) * 100).toFixed(1)}%
          </span>
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
        <span style={{
          fontSize: 10, color: hColor,
          fontFamily: "var(--font-mono)", letterSpacing: "0.1em", textTransform: "uppercase",
        }}>{hName} (Home)</span>
        <span style={{
          fontSize: 10, color: aColor,
          fontFamily: "var(--font-mono)", letterSpacing: "0.1em", textTransform: "uppercase",
        }}>{aName} (Away)</span>
      </div>
    </div>
  );
}

type StatFormat = "pct" | "sv" | "default";

interface StatBarProps {
  label: string;
  hVal: number;
  aVal: number;
  hColor: string;
  aColor: string;
  lo: number;
  hi: number;
  invert?: boolean;
  format?: StatFormat;
}

export function StatBar({ label, hVal, aVal, hColor, aColor, lo, hi, invert = false, format = "default" }: StatBarProps) {
  const norm = (value: number) => Math.max(0, Math.min(100, ((value - lo) / (hi - lo)) * 100));
  const fmt = (value: number): string => {
    if (format === "pct") return `${value.toFixed(1)}%`;
    if (format === "sv") return `.${(value * 1000).toFixed(0)}`;
    return value.toFixed(2);
  };
  const mid = (lo + hi) / 2;
  const hGood = invert ? hVal <= mid : hVal >= mid;
  const aGood = invert ? aVal <= mid : aVal >= mid;

  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{
        fontSize: 10, color: "var(--text-2)",
        letterSpacing: "0.1em", textTransform: "uppercase",
        marginBottom: 6, fontFamily: "var(--font-mono)",
      }}>{label}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{
          fontSize: 11, fontWeight: 700, fontFamily: "var(--font-mono)",
          color: hGood ? "var(--cyan)" : "var(--text-3)",
          width: 54, textAlign: "right",
        }}>{fmt(hVal)}</span>
        <div style={{
          flex: 1, height: 4,
          background: "rgba(255,255,255,0.06)",
          borderRadius: 2, position: "relative",
        }}>
          <div style={{
            position: "absolute", left: 0, top: 0, height: "100%",
            width: `${norm(hVal)}%`,
            background: hColor, opacity: 0.9,
            borderRadius: 2, transition: "width 1s ease",
          }} />
        </div>
        <div style={{
          flex: 1, height: 4,
          background: "rgba(255,255,255,0.06)",
          borderRadius: 2, position: "relative",
        }}>
          <div style={{
            position: "absolute", left: 0, top: 0, height: "100%",
            width: `${norm(aVal)}%`,
            background: aColor, opacity: 0.9,
            borderRadius: 2, transition: "width 1s ease",
          }} />
        </div>
        <span style={{
          fontSize: 11, fontWeight: 700, fontFamily: "var(--font-mono)",
          color: aGood ? "var(--cyan)" : "var(--text-3)",
          width: 54,
        }}>{fmt(aVal)}</span>
      </div>
    </div>
  );
}

export function FeatureRow({ label, detail, good }: Feature) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "7px 0",
      borderBottom: "1px solid var(--border-0)",
    }}>
      <span style={{ fontSize: 11, color: "var(--text-2)", fontFamily: "var(--font-mono)" }}>{label}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 11, color: "var(--text)", fontFamily: "var(--font-mono)" }}>{detail}</span>
        <span style={{
          fontSize: 10, padding: "2px 6px", borderRadius: "var(--r-sm)",
          fontFamily: "var(--font-mono)",
          background: good ? "var(--cyan-lo)" : "rgba(255,255,255,0.04)",
          color: good ? "var(--cyan)" : "var(--text-3)",
          border: `1px solid ${good ? "var(--cyan-border)" : "var(--border-0)"}`,
        }}>
          {good ? "▲" : "▼"}
        </span>
      </div>
    </div>
  );
}

interface TeamCardProps {
  abbr: string;
  side: string;
  espnData: EspnMap | null;
  liveStats?: Record<string, LiveTeamStats>;
}

export function TeamCard({ abbr, side, espnData, liveStats }: TeamCardProps) {
  const team = TEAMS[abbr];
  const live = liveStats?.[abbr];
  const stats = live ? { ...team, ...live } : team;
  const color = espnData?.[abbr]?.color ?? team.color;

  return (
    <div style={{
      background: `linear-gradient(135deg, ${color}12, transparent)`,
      border: `1px solid ${color}28`,
      borderRadius: "var(--r-lg)",
      padding: "14px 16px",
    }}>
      <div style={{
        fontSize: 10, color, letterSpacing: "0.15em", textTransform: "uppercase",
        fontFamily: "var(--font-mono)", marginBottom: 4,
      }}>{side} · {team.div}</div>
      <div style={{
        fontFamily: "var(--font-display)",
        fontSize: 18, fontWeight: 700,
        color: "var(--text)", marginBottom: 10,
        display: "flex", alignItems: "center", gap: 8,
        letterSpacing: "-0.01em",
      }}>
        {team.name}
        {live && (
          <span className="chip chip--green">Live</span>
        )}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 7 }}>
        {([
          ["CF%",  `${stats.cf.toFixed(1)}%`],
          ["FF%",  `${stats.ff.toFixed(1)}%`],
          ["xGF%", `${stats.xgf.toFixed(1)}%`],
          ["SV%",  `.${(stats.goalieSV * 1000).toFixed(0)}`],
          ["SH%",  `${stats.shootingPct.toFixed(1)}%`],
          ["PP%",  `${stats.ppPct.toFixed(1)}%`],
          ["PK%",  `${stats.pkPct.toFixed(1)}%`],
          ["PDO",  `${stats.pdo.toFixed(1)}`],
          ["SRS",  `${stats.srs >= 0 ? "+" : ""}${stats.srs.toFixed(2)}`],
        ] as [string, string][]).map(([label, value]) => (
          <div key={label}>
            <div style={{ fontSize: 9, color: "var(--text-2)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 1 }}>{label}</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", fontFamily: "var(--font-mono)" }}>{value}</div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 10, display: "flex", gap: 6 }}>
        <span style={{
          fontSize: 10, padding: "2px 8px", borderRadius: "var(--r-sm)",
          background: "rgba(255,255,255,0.04)", color: "var(--text-2)",
          fontFamily: "var(--font-mono)", border: "1px solid var(--border-0)",
        }}>{team.arena}</span>
        {team.ice !== "standard" && (
          <span className="chip chip--cyan">{ICE_CONDITIONS[team.ice].label}</span>
        )}
      </div>
    </div>
  );
}
