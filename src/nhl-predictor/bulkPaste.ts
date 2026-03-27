import { TEAMS } from "../nhl-core/data";
import type { LinesRow, OddsData } from "../nhl-core/types";
import {
  normalizePastedOddsText,
  parsePastedOddsValue,
  parsePastedPuckLine,
  parsePastedTotalLine,
} from "./oddsParsing";

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
    .replace(/^\d{1,4}\s*/, "")
    .replace(/\s+\d{1,4}$/, "")
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

function isOddsLine(value: string): boolean {
  const trimmed = value.trim();
  return /^[+-]?\s*\d/.test(trimmed) || /^even$/i.test(trimmed) || /^[ou]\s*\d/i.test(trimmed);
}

function isGameNumber(value: string): boolean {
  return /^\d{1,4}$/.test(value.trim());
}

function isTvOrTime(value: string): boolean {
  return (
    /\d:\d\d\s*(AM|PM)/i.test(value) ||
    /ESPN|TSN|SNE|SNP|SNW|RDS|NBC|CBS|ABC|TNT|TBS|FDSN|VICTORY|CHSN|ALTITUDE|KCOP|SCRIPPS|TVA|MSG/i.test(
      value,
    )
  );
}

export interface BulkPasteTeamBlock {
  abbr: string;
  plLine: number;
  plOdds: number;
  ouLine: number;
  ouOdds: number;
  isOver: boolean;
  ml: number;
}

export function parseBulkPasteTeamBlocks(rawText: string): BulkPasteTeamBlock[] {
  const rawLines = rawText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const blocks: BulkPasteTeamBlock[] = [];
  let cursor = 0;

  while (cursor < rawLines.length) {
    const line = rawLines[cursor];

    if (isTvOrTime(line) || isGameNumber(line)) {
      cursor += 1;
      continue;
    }

    const abbr = resolveBulkPasteTeamName(line);
    if (!abbr) {
      cursor += 1;
      continue;
    }

    cursor += 1;
    if (cursor < rawLines.length && isGameNumber(rawLines[cursor])) cursor += 1;

    const dataLines: string[] = [];
    while (cursor < rawLines.length && dataLines.length < 5) {
      const dataLine = rawLines[cursor];
      if (isTvOrTime(dataLine) || resolveBulkPasteTeamName(dataLine)) break;
      if (isGameNumber(dataLine)) {
        cursor += 1;
        continue;
      }
      dataLines.push(dataLine);
      cursor += 1;
    }

    if (dataLines.length < 5 || !isOddsLine(normalizePastedOddsText(dataLines[4]))) continue;

    const plLine = parsePastedPuckLine(dataLines[0]);
    const plOdds = parsePastedOddsValue(dataLines[1]);
    const normalizedTotalLine = normalizePastedOddsText(dataLines[2]);
    const ouMatch = normalizedTotalLine.match(/^([OoUu])\s*([\d.\s]+)/);
    const isOver = ouMatch ? ouMatch[1].toUpperCase() === "O" : true;
    const ouLine = parsePastedTotalLine(normalizedTotalLine);
    const ouOdds = parsePastedOddsValue(dataLines[3]);
    const ml = parsePastedOddsValue(dataLines[4]);

    blocks.push({ abbr, plLine, plOdds, ouLine, ouOdds, isOver, ml });
  }

  return blocks;
}

export interface BulkPasteApplyResult {
  updatedRows: LinesRow[];
  parsedTeams: number;
  updatedGames: number;
  status: string;
}

export function applyBulkPasteToLinesRows(linesRows: LinesRow[], rawText: string): BulkPasteApplyResult {
  const blocks = parseBulkPasteTeamBlocks(rawText);

  if (blocks.length < 2) {
    return {
      updatedRows: linesRows,
      parsedTeams: blocks.length,
      updatedGames: 0,
      status: `Could only parse ${blocks.length} team(s) - check format`,
    };
  }

  const matchedGames: string[] = [];
  const updatedRows = linesRows.map((row) => {
    const awayBlock = blocks.find((block) => block.abbr === row.game.awayAbbr);
    const homeBlock = blocks.find((block) => block.abbr === row.game.homeAbbr);
    if (!awayBlock || !homeBlock) return row;

    const overOdds = awayBlock.isOver ? awayBlock.ouOdds : homeBlock.isOver ? homeBlock.ouOdds : -110;
    const underOdds = !awayBlock.isOver ? awayBlock.ouOdds : !homeBlock.isOver ? homeBlock.ouOdds : -110;

    const newOdds: OddsData = {
      source: "manual",
      homeMoneyline: homeBlock.ml,
      awayMoneyline: awayBlock.ml,
      puckLine: homeBlock.plLine,
      puckLineHomeOdds: homeBlock.plOdds,
      puckLineAwayOdds: awayBlock.plOdds,
      overUnder: awayBlock.ouLine,
      overOdds,
      underOdds,
    };

    matchedGames.push(`${row.game.awayAbbr}/${row.game.homeAbbr}`);
    return { ...row, editedOdds: newOdds, simResult: null };
  });

  const updatedGames = matchedGames.length;
  if (updatedGames === 0) {
    return {
      updatedRows,
      parsedTeams: blocks.length,
      updatedGames,
      status: `No loaded games matched the pasted teams (${blocks.length} teams parsed)`,
    };
  }

  const unmatchedGames = linesRows
    .filter((row) => !matchedGames.includes(`${row.game.awayAbbr}/${row.game.homeAbbr}`))
    .map((row) => `${row.game.awayAbbr}/${row.game.homeAbbr}`);

  const unmatchedSuffix =
    unmatchedGames.length > 0 ? ` - unmatched loaded games: ${unmatchedGames.join(", ")}` : "";

  return {
    updatedRows,
    parsedTeams: blocks.length,
    updatedGames,
    status: `Updated ${updatedGames} of ${linesRows.length} game(s) - ${blocks.length} teams parsed${unmatchedSuffix}`,
  };
}
