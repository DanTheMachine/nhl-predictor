import { useEffect, useRef, useState } from "react";

import { NHL_ABBR_MAP, TEAMS } from "../nhl-core/data";
import type {
  EspnMap,
  ExportRow,
  GoalieInfo,
  LinesRow,
  LiveTeamStats,
  OddsData,
  PredictResult,
} from "../nhl-core/types";
import {
  fetchGameOdds,
  fetchLiveTeamStats,
  fetchNHLData,
  fetchTodaySchedule,
  normalizeAbbr,
  parseOddsFromEvent,
} from "./api";
import { analyzeBetting, mlAmerican, predictGame } from "./engine";
import { applyBulkPasteToLinesRows, resolveBulkPasteTeamName } from "./bulkPaste";
import { buildExportRow, downloadCSV, rowsToCSV } from "./export";
import { applyEstimatedGoalieOverrides } from "./goalieSelection";

const TEAM_NAME_MAP: Record<string, string> = {
  "anaheim ducks": "ANA",
  ducks: "ANA",
  "boston bruins": "BOS",
  bruins: "BOS",
  "buffalo sabres": "BUF",
  sabres: "BUF",
  "calgary flames": "CGY",
  flames: "CGY",
  "carolina hurricanes": "CAR",
  hurricanes: "CAR",
  "chicago blackhawks": "CHI",
  blackhawks: "CHI",
  "colorado avalanche": "COL",
  avalanche: "COL",
  "columbus blue jackets": "CBJ",
  "blue jackets": "CBJ",
  "dallas stars": "DAL",
  stars: "DAL",
  "detroit red wings": "DET",
  "red wings": "DET",
  "edmonton oilers": "EDM",
  oilers: "EDM",
  "florida panthers": "FLA",
  panthers: "FLA",
  "los angeles kings": "LAK",
  kings: "LAK",
  "la kings": "LAK",
  "minnesota wild": "MIN",
  wild: "MIN",
  "montreal canadiens": "MTL",
  canadiens: "MTL",
  "nashville predators": "NAS",
  predators: "NAS",
  "new jersey devils": "NJD",
  devils: "NJD",
  "new york islanders": "NYI",
  islanders: "NYI",
  "new york rangers": "NYR",
  rangers: "NYR",
  "ottawa senators": "OTT",
  senators: "OTT",
  "philadelphia flyers": "PHI",
  flyers: "PHI",
  "pittsburgh penguins": "PIT",
  penguins: "PIT",
  "san jose sharks": "SJS",
  sharks: "SJS",
  "seattle kraken": "SEA",
  kraken: "SEA",
  "st. louis blues": "STL",
  "st louis blues": "STL",
  blues: "STL",
  "tampa bay lightning": "TBL",
  lightning: "TBL",
  "toronto maple leafs": "TOR",
  "maple leafs": "TOR",
  "utah mammoth": "UTA",
  mammoth: "UTA",
  "vancouver canucks": "VAN",
  canucks: "VAN",
  "vegas golden knights": "VGK",
  "golden knights": "VGK",
  "washington capitals": "WSH",
  capitals: "WSH",
  "winnipeg jets": "WPG",
  jets: "WPG",
};

void TEAM_NAME_MAP;

function resolveTeamName(raw: string): string | null {
  const cleaned = raw
    .toLowerCase()
    .replace(/^\d{3,}\s*/, "")
    .replace(/\s+\d{3,}$/, "")
    .replace(/[*•]/g, "")
    .trim();

  return resolveBulkPasteTeamName(cleaned) ?? TEAM_NAME_MAP[cleaned] ?? null;
}

void resolveTeamName;

function normalizeOddsText(raw: string): string {
  return raw
    .replace(/Ã‚Â½|Â½/g, ".5")
    .replace(/[â€“â€”âˆ’]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function parseOddsValue(raw: string): number {
  const normalized = raw.replace(/\s/g, "").replace("Â½", ".5");
  if (/^even$/i.test(normalized)) return 100;

  const value = parseFloat(normalized.replace(/[^0-9.+-]/g, ""));
  return Number.isNaN(value) ? 0 : value;
}

function parsePuckLine(raw: string): number {
  const normalized = raw.replace(/\s/g, "").replace("Â½", ".5");
  const match = normalized.match(/([+-]?\d+\.?\d*)/);
  return match ? parseFloat(match[1]) : -1.5;
}

void normalizeOddsText;
void parseOddsValue;
void parsePuckLine;

function isOddsLine(value: string): boolean {
  const trimmed = value.trim();
  return (
    /^[+-]?\s*\d/.test(trimmed) ||
    /^even$/i.test(trimmed) ||
    /^[ou]\s*\d/i.test(trimmed) ||
    /^[+-]\s*1\s*[Â½]/.test(trimmed)
  );
}

function isGameNumber(value: string): boolean {
  return /^\d{3,4}$/.test(value.trim());
}

function isTvOrTime(value: string): boolean {
  return (
    /\d:\d\d\s*(AM|PM)/i.test(value) ||
    /ESPN|TSN|SNE|SNP|SNW|RDS|NBC|CBS|ABC|TNT|TBS|FDSN|VICTORY|CHSN|ALTITUDE|KCOP|SCRIPPS/i.test(
      value,
    )
  );
}

void isOddsLine;
void isGameNumber;
void isTvOrTime;

export function useNhlPredictorController() {
  const [homeTeam, setHomeTeam] = useState<string>("BOS");
  const [awayTeam, setAwayTeam] = useState<string>("TOR");
  const homeTeamRef = useRef("BOS");
  const awayTeamRef = useRef("TOR");

  useEffect(() => {
    homeTeamRef.current = homeTeam;
  }, [homeTeam]);

  useEffect(() => {
    awayTeamRef.current = awayTeam;
  }, [awayTeam]);

  const [gameType, setGameType] = useState<string>("Regular Season");
  const [homeB2B, setHomeB2B] = useState<boolean>(false);
  const [awayB2B, setAwayB2B] = useState<boolean>(false);
  const [result, setResult] = useState<PredictResult | null>(null);
  const [running, setRunning] = useState<boolean>(false);
  const [simCount, setSimCount] = useState<number>(0);
  const [espnData, setEspnData] = useState<EspnMap | null>(null);
  const [dataSource, setDataSource] = useState<"estimated" | "fetching" | "live">("estimated");
  const [fetchStatus, setFetchStatus] = useState<string>("");
  const [fetchError, setFetchError] = useState<string>("");
  const [liveStats, setLiveStats] = useState<Record<string, LiveTeamStats>>({});
  const [statsLastUpdated, setStatsLastUpdated] = useState<string>("");
  const [nstPaste, setNstPaste] = useState<string>("");
  const [nstStatus, setNstStatus] = useState<string>("");
  const [showNstPanel, setShowNstPanel] = useState<boolean>(false);
  const [divFilter, setDivFilter] = useState<string>("ALL");

  const [odds, setOdds] = useState<OddsData | null>(null);
  const [oddsSource, setOddsSource] = useState<"none" | "fetching" | "espn" | "manual">("none");
  const [oddsStatus, setOddsStatus] = useState<string>("");
  const [manualOdds, setManualOdds] = useState({
    homeMoneyline: "-160",
    awayMoneyline: "+135",
    homePuckLine: "-1.5",
    puckLineHomeOdds: "+145",
    puckLineAwayOdds: "-175",
    overUnder: "5.5",
    overOdds: "-110",
    underOdds: "-110",
  });

  const [linesRows, setLinesRows] = useState<LinesRow[]>([]);
  const [scheduleStatus, setScheduleStatus] = useState<string>("");
  const [scheduleLoading, setScheduleLoading] = useState<boolean>(false);
  const [simsRunning, setSimsRunning] = useState<boolean>(false);
  const [exportRunning, setExportRunning] = useState<boolean>(false);
  const [resultsRunning, setResultsRunning] = useState<boolean>(false);
  const [goalieRoster, setGoalieRoster] = useState<Record<string, GoalieInfo[]>>({});
  const [goalieLoading, setGoalieLoading] = useState<boolean>(false);
  const [resultsStatus, setResultsStatus] = useState<string>("");
  const [showLinesTable, setShowLinesTable] = useState<boolean>(false);
  const [showBulkPaste, setShowBulkPaste] = useState<boolean>(false);
  const [bulkPasteText, setBulkPasteText] = useState<string>("");
  const [bulkPasteStatus, setBulkPasteStatus] = useState<string>("");

  const getColor = (abbr: string, which: "primary" | "alt" = "primary"): string => {
    if (espnData?.[abbr]) {
      return which === "primary" ? espnData[abbr].color : espnData[abbr].altColor;
    }

    return which === "primary" ? (TEAMS[abbr]?.color ?? "#888") : (TEAMS[abbr]?.alt ?? "#444");
  };

  const parseNSTData = () => {
    const lines = nstPaste
      .trim()
      .split("\n")
      .filter((line) => line.trim());

    if (lines.length < 2) {
      setNstStatus("Paste at least 2 lines (header + 1 team)");
      return;
    }

    const delimiter = lines[0].includes("\t") ? "\t" : ",";
    const headers = lines[0]
      .split(delimiter)
      .map((header) => header.trim().replace(/"/g, "").toLowerCase());

    const idx = (names: string[]): number => {
      for (const name of names) {
        const index = headers.findIndex((header) => header.toLowerCase() === name.toLowerCase());
        if (index >= 0) return index;
      }
      return -1;
    };

    const iTeam = idx(["team"]);
    const iGP = idx(["gp", "games played", "games"]);
    const iCF = idx(["cf%", "cf %", "corsi for %", "corsi%"]);
    const iFF = idx(["ff%", "ff %", "fenwick for %", "fenwick%"]);
    const iXGF = idx(["xgf%", "xgf %", "expected goals for %", "xg for %"]);
    const iSV = idx(["sv%", "save%", "save %", "goalie sv%", "fsv%", "sv %", "% sv", "svpct", "save pct"]);
    const iPP = idx(["pp%", "power play %", "powerplay%"]);
    const iPK = idx(["pk%", "penalty kill %", "penaltykill%"]);
    const iPDO = idx(["pdo"]);
    const iShoot = idx(["sh%", "shooting%", "shooting %", "shoot%"]);
    const iSRS = idx(["srs", "simple rating", "srspg"]);

    if (iTeam < 0) {
      setNstStatus("Could not find 'Team' column - check format");
      return;
    }

    if (iCF < 0 && iXGF < 0) {
      setNstStatus("Could not find CF% or xGF% columns - check format");
      return;
    }

    let updated = 0;
    const now = new Date().toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
    const newLiveStats = { ...liveStats };

    for (let index = 1; index < lines.length; index += 1) {
      const cols = lines[index].split(delimiter).map((column) => column.trim().replace(/"/g, ""));
      if (cols.length < 3) continue;

      const hasRankCol = /^\d+$/.test((cols[0] ?? "").trim()) && iTeam === 0;
      const dataCols = hasRankCol ? cols.slice(1) : cols;
      const rawTeam = dataCols[iTeam] ?? "";
      const abbr =
        NHL_ABBR_MAP[rawTeam.toUpperCase()] ??
        Object.entries(TEAMS).find(([, team]) => {
          const rawLower = rawTeam.toLowerCase();
          const nameLower = team.name.toLowerCase();
          return (
            nameLower === rawLower ||
            rawLower.includes(nameLower) ||
            nameLower.includes(rawLower)
          );
        })?.[0] ??
        rawTeam.toUpperCase();

      if (!TEAMS[abbr]) continue;

      const parse = (colIndex: number) =>
        colIndex >= 0 && dataCols[colIndex] ? parseFloat(dataCols[colIndex]) || null : null;

      const cf = parse(iCF);
      const ff = parse(iFF);
      const xgf = parse(iXGF);
      const sv = parse(iSV);
      const pdo = parse(iPDO);
      const pp = parse(iPP);
      const pk = parse(iPK);
      const gp = parse(iGP);
      const shoot = parse(iShoot);
      const srs = parse(iSRS);

      const existing =
        newLiveStats[abbr] ??
        ({
          ...TEAMS[abbr],
          gp: 60,
          lastUpdated: now,
          cf: TEAMS[abbr].cf,
          xgf: TEAMS[abbr].xgf,
          pdo: TEAMS[abbr].pdo,
          srs: TEAMS[abbr].srs,
        } as LiveTeamStats);

      newLiveStats[abbr] = {
        ...existing,
        ...(cf !== null ? { cf: +cf.toFixed(1) } : {}),
        ...(ff !== null ? { ff: +ff.toFixed(1) } : {}),
        ...(xgf !== null ? { xgf: +xgf.toFixed(1) } : {}),
        ...(sv !== null
          ? { goalieSV: sv > 1 ? +(sv / 100).toFixed(4) : +sv.toFixed(4) }
          : {}),
        ...(pdo !== null
          ? { pdo: pdo < 2 ? +(pdo * 100).toFixed(1) : +pdo.toFixed(1) }
          : {}),
        ...(pp !== null ? { ppPct: +pp.toFixed(1) } : {}),
        ...(shoot !== null ? { shootingPct: +shoot.toFixed(2) } : {}),
        ...(srs !== null ? { srs: +srs.toFixed(2) } : {}),
        ...(pk !== null ? { pkPct: +pk.toFixed(1) } : {}),
        ...(gp !== null ? { gp: Math.round(gp) } : {}),
        lastUpdated: `NST · ${now}`,
      };
      updated += 1;
    }

    if (updated === 0) {
      setNstStatus("No teams matched - check team names in paste");
      return;
    }

    setLiveStats(newLiveStats);
    setStatsLastUpdated(`NST · ${now}`);
    setNstStatus(`Updated ${updated} teams with Natural Stat Trick data (${now})`);
    setNstPaste("");
  };

  const fetchB2BTeams = async (gameAbbrs: string[]): Promise<Set<string>> => {
    try {
      const proxy = "http://localhost:3001/proxy?url=";
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, "0")}-${String(
        yesterday.getDate(),
      ).padStart(2, "0")}`;

      const url = `https://api-web.nhle.com/v1/schedule/${yStr}`;
      const res = await fetch(`${proxy}${encodeURIComponent(url)}`);
      if (!res.ok) return new Set();

      const data = await res.json();
      const playedYesterday = new Set<string>();
      const gameWeek:
        | { date?: string; games?: { homeTeam?: { abbrev?: string }; awayTeam?: { abbrev?: string } }[] }[]
        | undefined = data?.gameWeek;

      for (const day of gameWeek ?? []) {
        if (day.date !== yStr) continue;
        for (const game of day.games ?? []) {
          const homeAbbr = game.homeTeam?.abbrev?.toUpperCase();
          const awayAbbr = game.awayTeam?.abbrev?.toUpperCase();
          if (homeAbbr) playedYesterday.add(homeAbbr);
          if (awayAbbr) playedYesterday.add(awayAbbr);
        }
      }

      const ourToNhlAbbrs: Record<string, Set<string>> = {};
      for (const [altAbbr, ourAbbr] of Object.entries(NHL_ABBR_MAP)) {
        if (!ourToNhlAbbrs[ourAbbr]) ourToNhlAbbrs[ourAbbr] = new Set();
        ourToNhlAbbrs[ourAbbr].add(altAbbr);
        ourToNhlAbbrs[ourAbbr].add(ourAbbr);
      }

      const b2b = new Set<string>();
      for (const abbr of gameAbbrs) {
        const possibleNhlAbbrs = ourToNhlAbbrs[abbr] ?? new Set([abbr]);
        for (const nhlAbbr of possibleNhlAbbrs) {
          if (playedYesterday.has(nhlAbbr)) {
            b2b.add(abbr);
            break;
          }
        }

        if (playedYesterday.has(abbr)) b2b.add(abbr);
      }

      return b2b;
    } catch (error) {
      console.warn("[B2B] NHL schedule fetch failed:", error);
      return new Set();
    }
  };

  const handleFetch = async () => {
    setDataSource("fetching");
    setFetchError("");
    setFetchStatus("Connecting...");

    try {
      const [espnMap, fetchedLiveStats] = await Promise.all([
        fetchNHLData(setFetchStatus),
        fetchLiveTeamStats(setFetchStatus).catch((error: Error) => {
          console.warn("Live stats fetch failed:", error.message);
          return {} as Record<string, LiveTeamStats>;
        }),
      ]);

      setEspnData(espnMap);
      setResult(null);

      if (Object.keys(fetchedLiveStats).length >= 20) {
        setLiveStats(fetchedLiveStats);
        const sample = Object.values(fetchedLiveStats)[0];
        setStatsLastUpdated(sample?.lastUpdated ?? "");
        setFetchStatus(
          `Live stats + colors loaded for ${Object.keys(fetchedLiveStats).length} teams · ${sample?.lastUpdated ?? ""}`,
        );
      } else {
        setFetchStatus("ESPN colors loaded · NHL stats API unavailable (using estimates)");
      }

      setDataSource("live");

      if (linesRows.length > 0) {
        setFetchStatus("Refreshing back-to-back detection...");
        const allAbbrs = [...new Set(linesRows.flatMap((row) => [row.game.homeAbbr, row.game.awayAbbr]))];
        const b2bTeams = await fetchB2BTeams(allAbbrs);
        setLinesRows((prev) => {
          const refreshedRows = prev.map((row) => ({
            ...row,
            homeB2B: b2bTeams.has(row.game.homeAbbr),
            awayB2B: b2bTeams.has(row.game.awayAbbr),
            simResult: null,
          }));
          return Object.keys(goalieRoster).length > 0 ? applyEstimatedGoalieOverrides(refreshedRows, goalieRoster, prev) : refreshedRows;
        });
        setFetchStatus(b2bTeams.size > 0 ? `B2B updated: ${[...b2bTeams].join(", ")}` : "B2B refreshed: no back-to-backs detected");
      }
    } catch (error) {
      setFetchError((error as Error).message);
      setDataSource("estimated");
      setFetchStatus("");
    }
  };

  const runSim = () => {
    setRunning(true);
    setSimCount(0);
    setResult(null);

    let counter = 0;
    const interval = setInterval(() => {
      counter += Math.floor(Math.random() * 2800 + 1200);
      setSimCount(Math.min(counter, 100000));

      if (counter >= 100000) {
        clearInterval(interval);
        setTimeout(() => {
          setResult(predictGame({ homeTeam, awayTeam, gameType, homeB2B, awayB2B, liveStats }));
          setRunning(false);
        }, 100);
      }
    }, 38);
  };

  const handleFetchOdds = async () => {
    setOddsSource("fetching");
    setOddsStatus("Checking ESPN for today's lines...");

    try {
      const fetchedOdds = await fetchGameOdds(homeTeamRef.current, awayTeamRef.current, setOddsStatus);

      if (fetchedOdds) {
        setOdds(fetchedOdds);
        setOddsSource("espn");

        const homeML = `${fetchedOdds.homeMoneyline > 0 ? "+" : ""}${fetchedOdds.homeMoneyline}`;
        const awayML = `${fetchedOdds.awayMoneyline > 0 ? "+" : ""}${fetchedOdds.awayMoneyline}`;
        const puckLine = `PL ${fetchedOdds.puckLine > 0 ? "+" : ""}${fetchedOdds.puckLine} (${fetchedOdds.puckLineHomeOdds > 0 ? "+" : ""}${fetchedOdds.puckLineHomeOdds} / ${fetchedOdds.puckLineAwayOdds > 0 ? "+" : ""}${fetchedOdds.puckLineAwayOdds})`;
        const overUnder = `O/U ${fetchedOdds.overUnder} (${fetchedOdds.overOdds > 0 ? "+" : ""}${fetchedOdds.overOdds} / ${fetchedOdds.underOdds > 0 ? "+" : ""}${fetchedOdds.underOdds})`;
        setOddsStatus(`ESPN · ${homeTeamRef.current} ${homeML} · ${awayTeamRef.current} ${awayML} · ${puckLine} · ${overUnder}`);

        if (!result) runSim();
      } else {
        setOddsSource("manual");
        setOddsStatus("Game not found on ESPN slate - enter lines manually below");
      }
    } catch {
      setOddsSource("manual");
      setOddsStatus("Could not reach ESPN - enter lines manually below");
    }
  };

  const applyManualOdds = () => {
    const nextOdds: OddsData = {
      source: "manual",
      homeMoneyline: parseFloat(manualOdds.homeMoneyline),
      awayMoneyline: parseFloat(manualOdds.awayMoneyline),
      puckLine: parseFloat(manualOdds.homePuckLine) || -1.5,
      puckLineHomeOdds: parseFloat(manualOdds.puckLineHomeOdds),
      puckLineAwayOdds: parseFloat(manualOdds.puckLineAwayOdds),
      overUnder: parseFloat(manualOdds.overUnder),
      overOdds: parseFloat(manualOdds.overOdds),
      underOdds: parseFloat(manualOdds.underOdds),
    };

    setOdds(nextOdds);
    setOddsSource("manual");
    setOddsStatus("Manual lines applied");

    if (!result) runSim();
  };

  const fetchGoalieRoster = async () => {
    setGoalieLoading(true);

    try {
      const proxy = "http://localhost:3001/proxy?url=";
      const url =
        "https://api.nhle.com/stats/rest/en/goalie/summary?isAggregate=false&isGame=false" +
        "&sort=%5B%7B%22property%22%3A%22gamesStarted%22%2C%22direction%22%3A%22DESC%22%7D%5D" +
        "&start=0&limit=200" +
        "&cayenneExp=gameTypeId%3D2%20and%20seasonId%3C%3D20252026%20and%20seasonId%3E%3D20252026%20and%20gamesPlayed%3E%3D1";
      const res = await fetch(`${proxy}${encodeURIComponent(url)}`);
      if (!res.ok) throw new Error(`NHL goalie API: ${res.status}`);

      const data = await res.json();
      const rows:
        | {
            goalieFullName?: string;
            teamAbbrevs?: string;
            savePct?: number;
            gamesPlayed?: number;
            gamesStarted?: number;
          }[]
        | undefined = data?.data;
      const roster: Record<string, GoalieInfo[]> = {};

      for (const row of rows ?? []) {
        const rawAbbr = (row.teamAbbrevs ?? "").toUpperCase().trim();
        const abbr = NHL_ABBR_MAP[rawAbbr] ?? rawAbbr;
        if (!abbr || !TEAMS[abbr]) continue;

        const sv = row.savePct ?? 0;
        const svFinal = sv > 1 ? sv / 100 : sv;
        if (svFinal < 0.8 || svFinal > 1.0) continue;

        const info: GoalieInfo = {
          name: row.goalieFullName ?? "Unknown",
          sv: +svFinal.toFixed(4),
          gp: row.gamesStarted ?? row.gamesPlayed ?? 0,
        };

        if (!roster[abbr]) roster[abbr] = [];
        roster[abbr].push(info);
      }

      for (const abbr of Object.keys(roster)) {
        roster[abbr].sort((a, b) => b.gp - a.gp);
      }

      setGoalieRoster(roster);
      setLinesRows((prev) => applyEstimatedGoalieOverrides(prev, roster));
      setScheduleStatus(`Goalie roster loaded for ${Object.keys(roster).length} teams · estimated starters applied`);
    } catch (error) {
      setScheduleStatus(`Goalie fetch failed: ${(error as Error).message}`);
    }

    setGoalieLoading(false);
  };

  const fetchYesterdayResults = async () => {
    setResultsRunning(true);
    setResultsStatus("Fetching yesterday's final scores...");

    try {
      const proxy = "http://localhost:3001/proxy?url=";
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, "0")}-${String(
        yesterday.getDate(),
      ).padStart(2, "0")}`;
      const dateLabel = yesterday
        .toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" })
        .replace(/\//g, "-");

      const url = `https://api-web.nhle.com/v1/score/${yStr}`;
      const res = await fetch(`${proxy}${encodeURIComponent(url)}`);
      if (!res.ok) throw new Error(`NHL score API: ${res.status}`);

      const data = await res.json();
      const games:
        | {
            gameState?: string;
            homeTeam?: { abbrev?: string; score?: number };
            awayTeam?: { abbrev?: string; score?: number };
          }[]
        | undefined = data?.games;

      const finished = (games ?? []).filter((game) => game.gameState === "OFF" || game.gameState === "FINAL");
      if (finished.length === 0) {
        setResultsStatus(`No final scores found for ${yStr}`);
        setResultsRunning(false);
        return;
      }

      const resultRows = finished.map((game) => {
        const homeAbbr = normalizeAbbr(game.homeTeam?.abbrev?.toUpperCase() ?? "");
        const awayAbbr = normalizeAbbr(game.awayTeam?.abbrev?.toUpperCase() ?? "");
        const homeGoals = game.homeTeam?.score ?? 0;
        const awayGoals = game.awayTeam?.score ?? 0;
        const winner = homeGoals > awayGoals ? homeAbbr : awayAbbr;
        const total = homeGoals + awayGoals;
        const lookupKey = `${yesterday.getFullYear()}${String(yesterday.getMonth() + 1).padStart(2, "0")}${String(
          yesterday.getDate(),
        ).padStart(2, "0")}${homeAbbr}${awayAbbr}`;

        return [dateLabel, homeAbbr, awayAbbr, String(homeGoals), String(awayGoals), winner, String(total), lookupKey];
      });

      const headers = ["Date", "Home", "Away", "Home Goals", "Away Goals", "Winner", "Total", "LookupKey"];
      const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
      const csv = [headers.map(escape).join(","), ...resultRows.map((row) => row.map(escape).join(","))].join("\n");

      downloadCSV(csv, `nhl-results-${yStr}.csv`);
      setResultsStatus(`Exported ${finished.length} results for ${yStr} · Paste into your Results tab in Google Sheets`);
    } catch (error) {
      setResultsStatus(`Error: ${(error as Error).message}`);
    }

    setResultsRunning(false);
  };

  const handleLoadSchedule = async () => {
    setScheduleLoading(true);
    setScheduleStatus("Fetching today's schedule...");
    setLinesRows([]);
    setShowLinesTable(false);

    try {
      const { games, rawEvents } = await fetchTodaySchedule(setScheduleStatus);
      if (games.length === 0) {
        setScheduleStatus("No NHL games found on today's schedule.");
        setScheduleLoading(false);
        return;
      }

      const rows: LinesRow[] = games.map((game) => {
        let espnOdds: OddsData | null = null;
        for (const event of rawEvents) {
          espnOdds = parseOddsFromEvent(event, game.homeAbbr, game.awayAbbr);
          if (espnOdds) break;
        }

        return {
          game,
          espnOdds,
          editedOdds: espnOdds ? { ...espnOdds } : null,
          simResult: null,
          isEditing: false,
          homeB2B: false,
          awayB2B: false,
          homeSVOverride: null,
          awaySVOverride: null,
        };
      });

      setScheduleStatus("Checking for back-to-back games via AI...");
      const allAbbrs = [...new Set(rows.flatMap((row) => [row.game.homeAbbr, row.game.awayAbbr]))];
      const b2bTeams = await fetchB2BTeams(allAbbrs);

      const rowsWithB2B =
        b2bTeams.size > 0
          ? rows.map((row) => ({
              ...row,
              homeB2B: b2bTeams.has(row.game.homeAbbr),
              awayB2B: b2bTeams.has(row.game.awayAbbr),
            }))
          : rows;

      setLinesRows(Object.keys(goalieRoster).length > 0 ? applyEstimatedGoalieOverrides(rowsWithB2B, goalieRoster) : rowsWithB2B);
      setShowLinesTable(true);

      const withOdds = rows.filter((row) => row.espnOdds).length;
      const b2bNote =
        b2bTeams.size > 0 ? ` · B2B: ${[...b2bTeams].join(", ")}` : " · No B2B games detected";
      setScheduleStatus(`${games.length} games loaded · ${withOdds} with ESPN lines${b2bNote}`);
    } catch (error) {
      setScheduleStatus(`Error: ${(error as Error).message}`);
    }

    setScheduleLoading(false);
  };

  const updateLinesField = (idx: number, field: keyof OddsData, raw: string) => {
    setLinesRows((prev) =>
      prev.map((row, index) => {
        if (index !== idx) return row;

        const base: OddsData =
          row.editedOdds ?? {
            source: "manual",
            homeMoneyline: 0,
            awayMoneyline: 0,
            puckLine: -1.5,
            puckLineHomeOdds: -110,
            puckLineAwayOdds: -110,
            overUnder: 5.5,
            overOdds: -110,
            underOdds: -110,
          };

        const value = parseFloat(raw);
        return {
          ...row,
          editedOdds: {
            ...base,
            [field]: Number.isNaN(value) ? base[field] : value,
            source: "manual",
          },
        };
      }),
    );
  };

  const toggleEditing = (idx: number) => {
    setLinesRows((prev) =>
      prev.map((row, index) => (index === idx ? { ...row, isEditing: !row.isEditing } : row)),
    );
  };

  const handleRunOneSim = (idx: number) => {
    setLinesRows((prev) =>
      prev.map((row, index) => {
        if (index !== idx) return row;

        return {
          ...row,
          simResult: predictGame({
            homeTeam: row.game.homeAbbr,
            awayTeam: row.game.awayAbbr,
            gameType: "Regular Season",
            homeB2B: row.homeB2B ?? false,
            awayB2B: row.awayB2B ?? false,
            liveStats,
            homeSVOverride: row.homeSVOverride,
            awaySVOverride: row.awaySVOverride,
          }),
        };
      }),
    );

    const game = linesRows[idx]?.game;
    if (game) setScheduleStatus(`Ran sim for ${game.homeAbbr} vs ${game.awayAbbr}`);
  };

  const handleBulkPaste = () => {
    if (!bulkPasteText.trim()) {
      setBulkPasteStatus("Nothing to parse");
      return;
    }

    if (linesRows.length === 0) {
      setBulkPasteStatus("Load today's games first");
      return;
    }
    const result = applyBulkPasteToLinesRows(linesRows, bulkPasteText);
    setLinesRows(result.updatedRows);
    setBulkPasteStatus(result.status);

    if (result.updatedGames > 0) {
      setShowBulkPaste(false);
      setBulkPasteText("");
    }
  };

  const handleRunAllSims = () => {
    setSimsRunning(true);
    setScheduleStatus("Running all simulations...");

    setTimeout(() => {
      setLinesRows((prev) =>
        prev.map((row) => ({
          ...row,
          simResult: predictGame({
            homeTeam: row.game.homeAbbr,
            awayTeam: row.game.awayAbbr,
            gameType: "Regular Season",
            homeB2B: row.homeB2B,
            awayB2B: row.awayB2B,
            liveStats,
            homeSVOverride: row.homeSVOverride,
            awaySVOverride: row.awaySVOverride,
          }),
        })),
      );
      setSimsRunning(false);
      setScheduleStatus("All simulations complete - ready to export");
    }, 80);
  };

  const exportSingleGame = () => {
    if (!result) return;

    const bettingAnalysis = odds ? analyzeBetting(result, odds) : null;
    const today = new Date()
      .toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" })
      .replace(/\//g, "-");
    const headers = [
      "Game",
      "Home",
      "Away",
      "Home Win %",
      "Away Win %",
      "Home Proj Goals",
      "Away Proj Goals",
      "Model Total",
      "Vegas O/U",
      "O/U Rec",
      "O/U Edge",
      "Home ML (Model)",
      "Away ML (Model)",
      "Vegas Home ML",
      "Vegas Away ML",
      "Home ML Edge",
      "Away ML Edge",
      "ML Value Side",
      "ML Kelly %",
      "Puck Line Rec",
      "Puck Line Edge",
      "Home CF%",
      "Away CF%",
      "Home xGF%",
      "Away xGF%",
      "Home SV%",
      "Away SV%",
      "Home PP%",
      "Away PP%",
      "Home PK%",
      "Away PK%",
      "Home PDO",
      "Away PDO",
    ];
    const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
    const gameLabel = `${hTeam.name} vs ${aTeam.name}`;
    const fmt = (value: number | undefined | null, dec = 1, suffix = "") =>
      value != null && Number.isFinite(value) ? value.toFixed(dec) + suffix : "";

    const row = [
      gameLabel,
      hTeam.name,
      aTeam.name,
      fmt(result.hWinProb * 100, 1, "%"),
      fmt(result.aWinProb * 100, 1, "%"),
      result.hGoals,
      result.aGoals,
      (parseFloat(result.hGoals) + parseFloat(result.aGoals)).toFixed(2),
      fmt(odds?.overUnder, 1),
      bettingAnalysis && bettingAnalysis.ouRec !== "pass" ? bettingAnalysis.ouRec.toUpperCase() : "",
      bettingAnalysis ? fmt(bettingAnalysis.ouEdge * 100, 1, "%") : "",
      mlAmerican(result.hWinProb),
      mlAmerican(result.aWinProb),
      fmt(odds?.homeMoneyline, 0),
      fmt(odds?.awayMoneyline, 0),
      bettingAnalysis ? fmt(bettingAnalysis.homeEdge * 100, 1, "%") : "",
      bettingAnalysis ? fmt(bettingAnalysis.awayEdge * 100, 1, "%") : "",
      bettingAnalysis
        ? bettingAnalysis.mlValueSide === "home"
          ? hTeam.name
          : bettingAnalysis.mlValueSide === "away"
            ? aTeam.name
            : ""
        : "",
      bettingAnalysis ? fmt(Math.max(bettingAnalysis.kellyHome, bettingAnalysis.kellyAway) * 100, 1, "%") : "",
      "",
      "",
      fmt(hTeam.cf, 1, "%"),
      fmt(aTeam.cf, 1, "%"),
      fmt(hTeam.xgf, 1, "%"),
      fmt(aTeam.xgf, 1, "%"),
      `.${fmt(hTeam.goalieSV * 1000, 0)}`,
      `.${fmt(aTeam.goalieSV * 1000, 0)}`,
      fmt(hTeam.ppPct, 1, "%"),
      fmt(aTeam.ppPct, 1, "%"),
      fmt(hTeam.pkPct, 1, "%"),
      fmt(aTeam.pkPct, 1, "%"),
      fmt(hTeam.pdo, 1),
      fmt(aTeam.pdo, 1),
    ];

    const csv = [headers.map(escape).join(","), row.map(escape).join(",")].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `nhl-${hTeam.name.replace(/\s+/g, "-")}-vs-${aTeam.name.replace(/\s+/g, "-")}-${today}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleExport = () => {
    if (linesRows.length === 0) return;

    setExportRunning(true);
    const rows: ExportRow[] = linesRows.map((row) => buildExportRow(row, liveStats));
    const etNow = new Date(new Date().toLocaleString("en-US", { timeZone: "America/New_York" }));
    const today = `${etNow.getFullYear()}-${String(etNow.getMonth() + 1).padStart(2, "0")}-${String(
      etNow.getDate(),
    ).padStart(2, "0")}`;

    downloadCSV(rowsToCSV(rows), `nhl-predictions-${today}.csv`);
    setExportRunning(false);
    setScheduleStatus(`Exported nhl-predictions-${today}.csv · ${rows.length} game${rows.length !== 1 ? "s" : ""}`);
  };

  const hColor = getColor(homeTeam);
  const aColor = getColor(awayTeam);
  const hTeam = liveStats[homeTeam] ? { ...TEAMS[homeTeam], ...liveStats[homeTeam] } : TEAMS[homeTeam];
  const aTeam = liveStats[awayTeam] ? { ...TEAMS[awayTeam], ...liveStats[awayTeam] } : TEAMS[awayTeam];

  return {
    homeTeam,
    setHomeTeam,
    awayTeam,
    setAwayTeam,
    gameType,
    setGameType,
    homeB2B,
    setHomeB2B,
    awayB2B,
    setAwayB2B,
    result,
    setResult,
    running,
    simCount,
    espnData,
    dataSource,
    fetchStatus,
    fetchError,
    liveStats,
    setLiveStats,
    statsLastUpdated,
    setStatsLastUpdated,
    nstPaste,
    setNstPaste,
    nstStatus,
    setNstStatus,
    showNstPanel,
    setShowNstPanel,
    divFilter,
    setDivFilter,
    odds,
    setOdds,
    oddsSource,
    setOddsSource,
    oddsStatus,
    setOddsStatus,
    manualOdds,
    setManualOdds,
    linesRows,
    setLinesRows,
    scheduleStatus,
    setScheduleStatus,
    scheduleLoading,
    simsRunning,
    exportRunning,
    resultsRunning,
    goalieRoster,
    goalieLoading,
    resultsStatus,
    showLinesTable,
    showBulkPaste,
    setShowBulkPaste,
    bulkPasteText,
    setBulkPasteText,
    bulkPasteStatus,
    setBulkPasteStatus,
    parseNSTData,
    handleFetch,
    runSim,
    handleFetchOdds,
    applyManualOdds,
    fetchGoalieRoster,
    fetchYesterdayResults,
    handleLoadSchedule,
    updateLinesField,
    toggleEditing,
    handleRunOneSim,
    handleBulkPaste,
    handleRunAllSims,
    exportSingleGame,
    handleExport,
    hColor,
    aColor,
    hTeam,
    aTeam,
  };
}
