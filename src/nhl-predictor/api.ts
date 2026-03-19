import { NHL_ABBR_MAP, TEAMS } from "../nhl-core/data";
import type { EspnMap, LiveTeamStats, OddsData, ScheduleGame } from "../nhl-core/types";

const PROXY = "http://localhost:3001/proxy?url=";

const ESPN_ABBR_MAP: Record<string, string> = {
  WSH: "WSH",
  TB: "TBL",
  SJ: "SJS",
  NJ: "NJD",
  LA: "LAK",
  NSH: "NAS",
  ARI: "ARI",
  CBJ: "CBJ",
  WPG: "WPG",
  VAN: "VAN",
};

export function normalizeAbbr(espn: string): string {
  return ESPN_ABBR_MAP[espn] ?? espn;
}

export function oddsValueToText(value: unknown, fallback: string): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return fallback;
}

export async function fetchLiveTeamStats(onStatus: (msg: string) => void): Promise<Record<string, LiveTeamStats>> {
  const now = new Date().toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  const result: Record<string, LiveTeamStats> = {};

  onStatus("Fetching team list from ESPN…");

  const teamsUrl = "https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/teams?limit=40";
  const teamsRes = await fetch(`${PROXY}${encodeURIComponent(teamsUrl)}`);
  if (!teamsRes.ok) throw new Error(`ESPN teams list: ${teamsRes.status}`);
  const teamsData = await teamsRes.json();

  const teamList: { team: { id?: string; abbreviation?: string } }[] = teamsData?.sports?.[0]?.leagues?.[0]?.teams ?? [];
  if (teamList.length < 20) throw new Error("ESPN returned too few teams");

  onStatus(`Fetching stats for ${teamList.length} teams…`);

  let fetched = 0;

  for (const { team } of teamList) {
    const rawAbbr = (team.abbreviation ?? "").toUpperCase();
    const abbr = NHL_ABBR_MAP[rawAbbr] ?? rawAbbr;
    if (!abbr || !TEAMS[abbr] || !team.id) continue;

    try {
      const statsUrl = `https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/teams/${team.id}/statistics`;
      const statsRes = await fetch(`${PROXY}${encodeURIComponent(statsUrl)}`);
      if (!statsRes.ok) continue;
      const statsData = await statsRes.json();

      const categories: { name: string; stats: { name: string; value: number; displayValue: string }[] }[] =
        statsData?.results?.stats?.categories ?? statsData?.splits?.categories ?? [];

      const getStat = (statName: string): number | null => {
        for (const category of categories) {
          const stat = category.stats?.find((entry) => entry.name === statName);
          if (stat !== undefined) return typeof stat.value === "number" ? stat.value : parseFloat(stat.displayValue) || null;
        }
        return null;
      };

      const gamesPlayed = getStat("games") ?? 1;
      const goalsForTotal = getStat("goals");
      const goalsAgainstTotal = getStat("goalsAgainst");
      const savePct = getStat("savePct");
      const shootingPct = getStat("shootingPct");
      const base = TEAMS[abbr];
      const savePctFinal = savePct !== null ? (savePct > 1 ? savePct / 100 : savePct) : base.goalieSV;
      const shootingPctFinal = shootingPct !== null ? shootingPct : base.shootingPct;
      const goalsForPerGame = goalsForTotal !== null ? goalsForTotal / gamesPlayed : base.gf;
      const goalsAgainstPerGame = goalsAgainstTotal !== null ? goalsAgainstTotal / gamesPlayed : base.ga;
      const pdo = shootingPctFinal + savePctFinal * 100;
      const goalsForShare = (goalsForPerGame / (goalsForPerGame + goalsAgainstPerGame)) * 100;
      const regressionWeight = Math.min(gamesPlayed / 60, 1);
      const corsiProxy = goalsForShare * regressionWeight + 50 * (1 - regressionWeight);
      const simpleRating = goalsForPerGame - goalsAgainstPerGame;

      result[abbr] = {
        cf: +corsiProxy.toFixed(1),
        ff: +corsiProxy.toFixed(1),
        xgf: +corsiProxy.toFixed(1),
        pdo: +pdo.toFixed(1),
        goalieSV: +savePctFinal.toFixed(4),
        shootingPct: +shootingPctFinal.toFixed(1),
        ppPct: +base.ppPct.toFixed(1),
        pkPct: +base.pkPct.toFixed(1),
        gf: +goalsForPerGame.toFixed(2),
        ga: +goalsAgainstPerGame.toFixed(2),
        srs: +simpleRating.toFixed(2),
        gp: Math.round(gamesPlayed),
        lastUpdated: now,
      };

      fetched += 1;
      if (fetched % 8 === 0) onStatus(`Loaded ${fetched} / ${teamList.length} teams…`);
    } catch {
      // Ignore per-team failures and continue.
    }
  }

  if (fetched < 15) {
    throw new Error(`Only ${fetched} teams loaded — ESPN stats unavailable, using estimates`);
  }

  onStatus("Fetching PP% / PK% from NHL API…");

  try {
    const powerPlayUrl = "https://api.nhle.com/stats/rest/en/team/powerplay?isAggregate=false&isGame=false&sort=%5B%7B%22property%22%3A%22powerPlayPct%22%2C%22direction%22%3A%22DESC%22%7D%5D&start=0&limit=40&cayenneExp=gameTypeId%3D2%20and%20seasonId%3C%3D20252026%20and%20seasonId%3E%3D20252026";
    const powerPlayRes = await fetch(`${PROXY}${encodeURIComponent(powerPlayUrl)}`);
    if (powerPlayRes.ok) {
      const powerPlayData = await powerPlayRes.json();
      const rows: { powerPlayPct?: number; teamFullName?: string }[] = powerPlayData?.data ?? [];

      for (const row of rows) {
        const fullName = (row.teamFullName ?? "").trim();
        const abbr = Object.entries(TEAMS).find(([, team]) =>
          fullName.toLowerCase().includes(team.name.toLowerCase()) ||
          team.name.toLowerCase().includes(fullName.toLowerCase()) ||
          fullName.toLowerCase().endsWith(team.name.toLowerCase()),
        )?.[0];

        if (!abbr || !result[abbr] || row.powerPlayPct === undefined) continue;
        const powerPlayPct = row.powerPlayPct > 1 ? row.powerPlayPct : row.powerPlayPct * 100;
        result[abbr].ppPct = +powerPlayPct.toFixed(1);
      }

      const penaltyKillUrl = "https://api.nhle.com/stats/rest/en/team/penaltykill?isAggregate=false&isGame=false&sort=%5B%7B%22property%22%3A%22penaltyKillPct%22%2C%22direction%22%3A%22DESC%22%7D%5D&start=0&limit=40&cayenneExp=gameTypeId%3D2%20and%20seasonId%3C%3D20252026%20and%20seasonId%3E%3D20252026";
      const penaltyKillRes = await fetch(`${PROXY}${encodeURIComponent(penaltyKillUrl)}`);

      if (penaltyKillRes.ok) {
        const penaltyKillData = await penaltyKillRes.json();
        const penaltyKillRows: { penaltyKillPct?: number; teamFullName?: string }[] = penaltyKillData?.data ?? [];

        for (const row of penaltyKillRows) {
          const fullName = (row.teamFullName ?? "").trim();
          const abbr = Object.entries(TEAMS).find(([, team]) =>
            fullName.toLowerCase().includes(team.name.toLowerCase()) ||
            team.name.toLowerCase().includes(fullName.toLowerCase()) ||
            fullName.toLowerCase().endsWith(team.name.toLowerCase()),
          )?.[0];

          if (!abbr || !result[abbr] || row.penaltyKillPct === undefined) continue;
          const penaltyKillPct = row.penaltyKillPct > 1 ? row.penaltyKillPct : row.penaltyKillPct * 100;
          result[abbr].pkPct = +penaltyKillPct.toFixed(1);
        }
      }
    }
  } catch {
    // Keep the baseline PP/PK values when NHL API is unavailable.
  }

  onStatus(`✓ Live stats loaded for ${fetched} teams from ESPN (${now})`);
  return result;
}

export async function fetchNHLData(onStatus: (msg: string) => void): Promise<EspnMap> {
  onStatus("Connecting to ESPN NHL API…");
  const url = "https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/teams?limit=40";
  const res = await fetch(`${PROXY}${encodeURIComponent(url)}`);
  if (!res.ok) throw new Error(`ESPN API: ${res.status}`);
  const data = await res.json();
  onStatus("Parsing team data…");

  const teams: { team: { abbreviation?: string; color?: string; alternateColor?: string; displayName?: string } }[] =
    data?.sports?.[0]?.leagues?.[0]?.teams ?? [];

  if (teams.length < 28) throw new Error("Too few teams — try again");

  const map: EspnMap = {};
  for (const { team } of teams) {
    const abbr = team.abbreviation?.toUpperCase();
    if (!abbr) continue;
    map[abbr] = {
      color: `#${team.color ?? "111122"}`,
      altColor: `#${team.alternateColor ?? "888888"}`,
      displayName: team.displayName ?? abbr,
    };
  }

  onStatus(`Loaded ${teams.length} NHL teams from ESPN`);
  return map;
}

export async function fetchGameOdds(
  homeAbbr: string,
  awayAbbr: string,
  onStatus: (msg: string) => void,
): Promise<OddsData | null> {
  const etNow = new Date(new Date().toLocaleString("en-US", { timeZone: "America/New_York" }));
  const etDate = `${etNow.getFullYear()}${String(etNow.getMonth() + 1).padStart(2, "0")}${String(etNow.getDate()).padStart(2, "0")}`;
  const etDateDisplay = etNow.toLocaleDateString("en-US", { timeZone: "America/New_York", weekday: "short", month: "short", day: "numeric" });

  onStatus(`Checking ESPN scoreboard for ${etDateDisplay}…`);

  const url = `https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/scoreboard?dates=${etDate}`;
  const res = await fetch(`${PROXY}${encodeURIComponent(url)}`);
  if (!res.ok) throw new Error(`ESPN scoreboard: ${res.status}`);
  const data = await res.json();
  const events: Record<string, unknown>[] = data?.events ?? [];

  for (const event of events) {
    const competitions = (event.competitions as Record<string, unknown>[] | undefined) ?? [];
    const comp = competitions[0];
    if (!comp) continue;

    const competitors = (comp.competitors as Record<string, unknown>[]) ?? [];
    const homeComp = competitors.find((entry) => entry.homeAway === "home");
    const awayComp = competitors.find((entry) => entry.homeAway === "away");
    if (!homeComp || !awayComp) continue;

    const homeTeamObj = homeComp.team as Record<string, string> | undefined;
    const awayTeamObj = awayComp.team as Record<string, string> | undefined;
    const espnHome = normalizeAbbr(homeTeamObj?.abbreviation?.toUpperCase() ?? "");
    const espnAway = normalizeAbbr(awayTeamObj?.abbreviation?.toUpperCase() ?? "");

    if (espnHome !== homeAbbr || espnAway !== awayAbbr) continue;

    const odds = (comp.odds as Record<string, unknown>[])?.[0];
    if (!odds) {
      onStatus("Game found but no odds available yet");
      return null;
    }

    const moneyline = odds.moneyline as Record<string, Record<string, Record<string, unknown>>> | undefined;
    const pointSpread = odds.pointSpread as Record<string, Record<string, Record<string, unknown>>> | undefined;
    const total = odds.total as Record<string, Record<string, Record<string, unknown>>> | undefined;

    const homeMLStr = oddsValueToText(moneyline?.home?.close?.odds ?? moneyline?.home?.open?.odds, "");
    const awayMLStr = oddsValueToText(moneyline?.away?.close?.odds ?? moneyline?.away?.open?.odds, "");
    const homeML = parseFloat(homeMLStr.replace("+", "")) || 0;
    const awayML = parseFloat(awayMLStr.replace("+", "")) || 0;

    if (!homeML || !awayML) {
      onStatus("Odds found but moneylines not available yet — enter manually");
      return null;
    }

    const homePLLine = parseFloat(oddsValueToText(pointSpread?.home?.close?.line ?? pointSpread?.home?.open?.line, "-1.5"));
    const homePLOdds = parseFloat(oddsValueToText(pointSpread?.home?.close?.odds ?? pointSpread?.home?.open?.odds, "-110").replace("+", "")) || -110;
    const awayPLOdds = parseFloat(oddsValueToText(pointSpread?.away?.close?.odds ?? pointSpread?.away?.open?.odds, "-110").replace("+", "")) || -110;
    const overUnder = parseFloat(oddsValueToText(total?.over?.close?.line ?? total?.over?.open?.line, "5.5").replace(/[ou]/gi, ""));
    const overOdds = parseFloat(oddsValueToText(total?.over?.close?.odds ?? total?.over?.open?.odds, "-110").replace("+", "")) || -110;
    const underOdds = parseFloat(oddsValueToText(total?.under?.close?.odds ?? total?.under?.open?.odds, "-110").replace("+", "")) || -110;

    return {
      source: "espn",
      homeMoneyline: homeML,
      awayMoneyline: awayML,
      puckLine: homePLLine,
      puckLineHomeOdds: homePLOdds,
      puckLineAwayOdds: awayPLOdds,
      overUnder,
      overOdds,
      underOdds,
    };
  }

  onStatus(`${homeAbbr} vs ${awayAbbr} not found on ESPN slate for ${etDateDisplay} — enter lines manually`);
  return null;
}

export async function fetchTodaySchedule(
  onStatus: (msg: string) => void,
): Promise<{ games: ScheduleGame[]; rawEvents: Record<string, unknown>[] }> {
  onStatus("Fetching today's NHL schedule…");
  const etNow = new Date(new Date().toLocaleString("en-US", { timeZone: "America/New_York" }));
  const etDate = `${etNow.getFullYear()}${String(etNow.getMonth() + 1).padStart(2, "0")}${String(etNow.getDate()).padStart(2, "0")}`;
  const url = `https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/scoreboard?dates=${etDate}`;
  const res = await fetch(`${PROXY}${encodeURIComponent(url)}`);
  if (!res.ok) throw new Error(`ESPN scoreboard: ${res.status}`);
  const data = await res.json();
  const events: Record<string, unknown>[] = data?.events ?? [];
  const games: ScheduleGame[] = [];

  for (const event of events) {
    const competitions = (event.competitions as Record<string, unknown>[] | undefined) ?? [];
    const comp = competitions[0];
    if (!comp) continue;

    const competitors = (comp.competitors as Record<string, unknown>[]) ?? [];
    const homeComp = competitors.find((entry) => entry.homeAway === "home");
    const awayComp = competitors.find((entry) => entry.homeAway === "away");
    if (!homeComp || !awayComp) continue;

    const homeAbbr = normalizeAbbr(((homeComp.team as Record<string, string>)?.abbreviation ?? "").toUpperCase());
    const awayAbbr = normalizeAbbr(((awayComp.team as Record<string, string>)?.abbreviation ?? "").toUpperCase());
    if (!TEAMS[homeAbbr] || !TEAMS[awayAbbr]) continue;

    let gameTime = (event.date as string) ?? "";
    try {
      gameTime = new Date(gameTime).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        timeZoneName: "short",
        timeZone: "America/New_York",
      });
    } catch {
      // Keep the raw value if formatting fails.
    }

    const broadcasts = (comp.broadcasts as { names?: string[] }[]) ?? [];
    const tvInfo = broadcasts.flatMap((broadcast) => broadcast.names ?? []).join(", ") || "—";
    games.push({ homeAbbr, awayAbbr, gameTime, tvInfo });
  }

  onStatus(`Found ${games.length} game${games.length !== 1 ? "s" : ""} on today's schedule`);
  return { games, rawEvents: events };
}

export function parseOddsFromEvent(event: Record<string, unknown>, homeAbbr: string, awayAbbr: string): OddsData | null {
  const competitions = (event.competitions as Record<string, unknown>[] | undefined) ?? [];
  const comp = competitions[0];
  if (!comp) return null;

  const competitors = (comp.competitors as Record<string, unknown>[]) ?? [];
  const homeComp = competitors.find((entry) => entry.homeAway === "home");
  const awayComp = competitors.find((entry) => entry.homeAway === "away");
  if (!homeComp || !awayComp) return null;

  const espnHome = normalizeAbbr((((homeComp.team as Record<string, string> | undefined)?.abbreviation) ?? "").toUpperCase());
  const espnAway = normalizeAbbr((((awayComp.team as Record<string, string> | undefined)?.abbreviation) ?? "").toUpperCase());
  if (espnHome !== homeAbbr || espnAway !== awayAbbr) return null;

  const odds = (comp.odds as Record<string, unknown>[])?.[0];
  if (!odds) return null;

  const moneyline = odds.moneyline as Record<string, Record<string, Record<string, unknown>>> | undefined;
  const pointSpread = odds.pointSpread as Record<string, Record<string, Record<string, unknown>>> | undefined;
  const total = odds.total as Record<string, Record<string, Record<string, unknown>>> | undefined;

  const homeML = parseFloat(oddsValueToText(moneyline?.home?.close?.odds ?? moneyline?.home?.open?.odds, "0").replace("+", "")) || 0;
  const awayML = parseFloat(oddsValueToText(moneyline?.away?.close?.odds ?? moneyline?.away?.open?.odds, "0").replace("+", "")) || 0;
  if (!homeML && !awayML) return null;

  const homePLLine = parseFloat(oddsValueToText(pointSpread?.home?.close?.line ?? pointSpread?.home?.open?.line, "-1.5"));
  const homePLOdds = parseFloat(oddsValueToText(pointSpread?.home?.close?.odds, "-110").replace("+", "")) || -110;
  const awayPLOdds = parseFloat(oddsValueToText(pointSpread?.away?.close?.odds, "-110").replace("+", "")) || -110;
  const overUnder = parseFloat(oddsValueToText(total?.over?.close?.line, "5.5").replace(/[ou]/gi, ""));
  const overOdds = parseFloat(oddsValueToText(total?.over?.close?.odds, "-110").replace("+", "")) || -110;
  const underOdds = parseFloat(oddsValueToText(total?.under?.close?.odds, "-110").replace("+", "")) || -110;

  return {
    source: "espn",
    homeMoneyline: homeML,
    awayMoneyline: awayML,
    puckLine: homePLLine,
    puckLineHomeOdds: homePLOdds,
    puckLineAwayOdds: awayPLOdds,
    overUnder: overUnder || 5.5,
    overOdds,
    underOdds,
  };
}
