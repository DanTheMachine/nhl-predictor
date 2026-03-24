import { TEAMS } from "../nhl-core/data";

const TEAM_LOCATION_MAP: Record<string, string> = {
  ANA: "Anaheim",
  BOS: "Boston",
  BUF: "Buffalo",
  CAR: "Carolina",
  CBJ: "Columbus",
  CGY: "Calgary",
  CHI: "Chicago",
  COL: "Colorado",
  DAL: "Dallas",
  DET: "Detroit",
  EDM: "Edmonton",
  FLA: "Florida",
  LAK: "Los Angeles",
  MIN: "Minnesota",
  MTL: "Montreal",
  NAS: "Nashville",
  NJD: "New Jersey",
  NYI: "New York",
  NYR: "New York",
  OTT: "Ottawa",
  PHI: "Philadelphia",
  PIT: "Pittsburgh",
  SEA: "Seattle",
  SJS: "San Jose",
  STL: "St. Louis",
  TBL: "Tampa Bay",
  TOR: "Toronto",
  UTA: "Utah",
  VAN: "Vancouver",
  VGK: "Las Vegas",
  WPG: "Winnipeg",
  WSH: "Washington",
};

const EXTRA_TEAM_ALIASES: Record<string, string> = {
  "la kings": "LAK",
  "los angeles kings": "LAK",
  "new jersey devils": "NJD",
  "new york islanders": "NYI",
  "new york rangers": "NYR",
  "ny islanders": "NYI",
  "ny rangers": "NYR",
  "st louis": "STL",
  "st louis blues": "STL",
  "st. louis": "STL",
  "st. louis blues": "STL",
  "tampa bay lightning": "TBL",
  "vegas": "VGK",
  "vegas golden knights": "VGK",
};

const cityAliasCounts = Object.values(TEAM_LOCATION_MAP).reduce<Record<string, number>>((counts, city) => {
  const key = city.toLowerCase();
  counts[key] = (counts[key] ?? 0) + 1;
  return counts;
}, {});

function normalizeTeamLookupKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/^\d{2,4}\s*/, "")
    .replace(/\s+\d{2,4}$/, "")
    .replace(/[\u00A9*\u2022]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const TEAM_NAME_MAP: Record<string, string> = Object.entries(TEAMS).reduce<Record<string, string>>((map, [abbr, team]) => {
  const city = TEAM_LOCATION_MAP[abbr];
  const mascot = team.name;

  if (city && cityAliasCounts[city.toLowerCase()] === 1) {
    map[normalizeTeamLookupKey(city)] = abbr;
  }

  if (city) {
    map[normalizeTeamLookupKey(`${city} ${mascot}`)] = abbr;
  }

  map[normalizeTeamLookupKey(mascot)] = abbr;
  return map;
}, { ...EXTRA_TEAM_ALIASES });

export function resolveBulkPasteTeamName(raw: string): string | null {
  const cleaned = normalizeTeamLookupKey(raw);
  return TEAM_NAME_MAP[cleaned] ?? null;
}

export function isBulkPasteErrorStatus(status: string): boolean {
  const normalized = status.trim().toLowerCase();
  return (
    normalized.length > 0 &&
    (normalized.startsWith("error:") ||
      normalized.startsWith("could") ||
      normalized.startsWith("load ") ||
      normalized.startsWith("nothing") ||
      normalized.startsWith("no "))
  );
}
