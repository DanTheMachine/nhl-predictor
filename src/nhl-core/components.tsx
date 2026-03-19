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
      <div style={{ position: "relative", height: 60, borderRadius: 30, overflow: "hidden", border: "1px solid rgba(180,220,255,0.15)", boxShadow: "0 0 30px rgba(100,180,255,0.18) inset" }}>
        <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: 1, background: "rgba(180,220,255,0.2)", zIndex: 3 }} />
        <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)", width: 32, height: 32, borderRadius: "50%", border: "1px solid rgba(180,220,255,0.2)", zIndex: 3 }} />
        <div style={{ position: "absolute", inset: 0, backgroundImage: "repeating-linear-gradient(90deg,transparent,transparent 9.8%,rgba(180,220,255,0.04) 9.8%,rgba(180,220,255,0.04) 10%)", zIndex: 2, pointerEvents: "none" }} />
        <div style={{ width: `${hProb * 100}%`, background: `linear-gradient(90deg,${hColor}dd,${hColor}99)`, height: "100%", transition: "width 1.4s cubic-bezier(.4,0,.2,1)", display: "flex", alignItems: "center", paddingLeft: 18, position: "relative", zIndex: 1 }}>
          <span style={{ fontSize: 16, fontWeight: 900, color: "#fff", fontFamily: "'Barlow Condensed',Impact,sans-serif", letterSpacing: 2, textShadow: "0 2px 8px rgba(0,0,0,0.9)" }}>
            {(hProb * 100).toFixed(1)}%
          </span>
        </div>
        <div style={{ position: "absolute", right: 0, top: 0, width: `${(1 - hProb) * 100}%`, background: `linear-gradient(90deg,${aColor}99,${aColor}dd)`, height: "100%", transition: "width 1.4s cubic-bezier(.4,0,.2,1)", display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: 18, zIndex: 1 }}>
          <span style={{ fontSize: 16, fontWeight: 900, color: "#fff", fontFamily: "'Barlow Condensed',Impact,sans-serif", letterSpacing: 2, textShadow: "0 2px 8px rgba(0,0,0,0.9)" }}>
            {((1 - hProb) * 100).toFixed(1)}%
          </span>
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
        <span style={{ fontSize: 11, color: hColor, fontFamily: "'Barlow Condensed',monospace", letterSpacing: 2 }}>{hName} (HOME)</span>
        <span style={{ fontSize: 11, color: aColor, fontFamily: "'Barlow Condensed',monospace", letterSpacing: 2 }}>{aName} (AWAY)</span>
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
    <div style={{ marginBottom: 11 }}>
      <div style={{ fontSize: 11, color: "#94a8bf", letterSpacing: 2, marginBottom: 5, fontFamily: "monospace" }}>{label}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 700, fontFamily: "monospace", color: hGood ? "#7dd3fc" : "#64748b", width: 54, textAlign: "right" }}>{fmt(hVal)}</span>
        <div style={{ flex: 1, height: 5, background: "rgba(100,180,255,0.25)", borderRadius: 3, position: "relative" }}>
          <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${norm(hVal)}%`, background: hColor, opacity: 0.85, borderRadius: 3, transition: "width 1s ease" }} />
        </div>
        <div style={{ flex: 1, height: 5, background: "rgba(100,180,255,0.25)", borderRadius: 3, position: "relative" }}>
          <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${norm(aVal)}%`, background: aColor, opacity: 0.85, borderRadius: 3, transition: "width 1s ease" }} />
        </div>
        <span style={{ fontSize: 12, fontWeight: 700, fontFamily: "monospace", color: aGood ? "#7dd3fc" : "#64748b", width: 54 }}>{fmt(aVal)}</span>
      </div>
    </div>
  );
}

export function FeatureRow({ label, detail, good }: Feature) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid rgba(100,180,255,0.05)" }}>
      <span style={{ fontSize: 11, color: "#94a8bf", fontFamily: "monospace" }}>{label}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 11, color: "#c8e8ff", fontFamily: "monospace" }}>{detail}</span>
        <span
          style={{
            fontSize: 11,
            padding: "2px 6px",
            borderRadius: 2,
            fontFamily: "monospace",
            background: good ? "rgba(125,211,252,0.1)" : "rgba(148,163,184,0.1)",
            color: good ? "#7dd3fc" : "#64748b",
            border: `1px solid ${good ? "rgba(125,211,252,0.2)" : "rgba(148,163,184,0.15)"}`,
          }}
        >
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
    <div style={{ background: `linear-gradient(135deg,${color}14,transparent)`, border: `1px solid ${color}30`, borderRadius: 6, padding: "12px 14px" }}>
      <div style={{ fontSize: 11, color, letterSpacing: 3, fontFamily: "monospace", marginBottom: 3 }}>{side} · {team.div}</div>
      <div style={{ fontFamily: "'Barlow Condensed',Impact,sans-serif", fontSize: 20, color: "#c8e8ff", letterSpacing: 2, marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
        {team.name.toUpperCase()}
        {live && <span style={{ fontSize: 9, fontWeight: 700, color: "#3fb950", background: "rgba(63,185,80,0.12)", border: "1px solid rgba(63,185,80,0.3)", borderRadius: 3, padding: "1px 5px", letterSpacing: 1, fontFamily: "monospace" }}>LIVE</span>}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6 }}>
        {([
          ["CF%", `${stats.cf.toFixed(1)}%`],
          ["FF%", `${stats.ff.toFixed(1)}%`],
          ["xGF%", `${stats.xgf.toFixed(1)}%`],
          ["SV%", `.${(stats.goalieSV * 1000).toFixed(0)}`],
          ["SH%", `${stats.shootingPct.toFixed(1)}%`],
          ["PP%", `${stats.ppPct.toFixed(1)}%`],
          ["PK%", `${stats.pkPct.toFixed(1)}%`],
          ["PDO", `${stats.pdo.toFixed(1)}`],
          ["SRS", `${stats.srs >= 0 ? "+" : ""}${stats.srs.toFixed(2)}`],
        ] as [string, string][]).map(([label, value]) => (
          <div key={label}>
            <div style={{ fontSize: 11, color: "#8fa8bf", letterSpacing: 1 }}>{label}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#c8e8ff", fontFamily: "monospace" }}>{value}</div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
        <span style={{ fontSize: 11, padding: "2px 7px", borderRadius: 2, background: "rgba(100,180,255,0.07)", color: "#7ab8d8", fontFamily: "monospace" }}>{team.arena}</span>
        {team.ice !== "standard" && (
          <span style={{ fontSize: 11, padding: "2px 7px", borderRadius: 2, background: "rgba(125,211,252,0.1)", color: "#7dd3fc", fontFamily: "monospace" }}>
            {ICE_CONDITIONS[team.ice].label}
          </span>
        )}
      </div>
    </div>
  );
}
