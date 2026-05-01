import type { OddsData } from '../nhl-core/types'

export type ParsedBulkGame = {
  awayAbbr: string
  homeAbbr: string
  odds: OddsData
  gameTime?: string
}

// Full name → canonical abbreviation for all 32 NHL teams.
// Longer entries must sort before shorter ones so the regex matches greedily.
const BULK_NAME_MAP: Record<string, string> = {
  // Atlantic
  'BOSTON BRUINS': 'BOS',
  BOSTON: 'BOS',
  'BUFFALO SABRES': 'BUF',
  BUFFALO: 'BUF',
  'DETROIT RED WINGS': 'DET',
  DETROIT: 'DET',
  'RED WINGS': 'DET',
  'FLORIDA PANTHERS': 'FLA',
  FLORIDA: 'FLA',
  PANTHERS: 'FLA',
  'MONTREAL CANADIENS': 'MTL',
  MONTREAL: 'MTL',
  CANADIENS: 'MTL',
  'OTTAWA SENATORS': 'OTT',
  OTTAWA: 'OTT',
  SENATORS: 'OTT',
  'TAMPA BAY LIGHTNING': 'TBL',
  'TAMPA BAY': 'TBL',
  LIGHTNING: 'TBL',
  'TORONTO MAPLE LEAFS': 'TOR',
  'MAPLE LEAFS': 'TOR',
  TORONTO: 'TOR',
  // Metropolitan
  'CAROLINA HURRICANES': 'CAR',
  CAROLINA: 'CAR',
  HURRICANES: 'CAR',
  'COLUMBUS BLUE JACKETS': 'CBJ',
  'BLUE JACKETS': 'CBJ',
  COLUMBUS: 'CBJ',
  'NEW JERSEY DEVILS': 'NJD',
  'NEW JERSEY': 'NJD',
  DEVILS: 'NJD',
  'NEW YORK ISLANDERS': 'NYI',
  ISLANDERS: 'NYI',
  'NEW YORK RANGERS': 'NYR',
  RANGERS: 'NYR',
  'PHILADELPHIA FLYERS': 'PHI',
  PHILADELPHIA: 'PHI',
  FLYERS: 'PHI',
  'PITTSBURGH PENGUINS': 'PIT',
  PITTSBURGH: 'PIT',
  PENGUINS: 'PIT',
  'WASHINGTON CAPITALS': 'WSH',
  WASHINGTON: 'WSH',
  CAPITALS: 'WSH',
  // Central
  'UTAH MAMMOTH': 'UTA',
  UTAH: 'UTA',
  MAMMOTH: 'UTA',
  'CHICAGO BLACKHAWKS': 'CHI',
  CHICAGO: 'CHI',
  BLACKHAWKS: 'CHI',
  'COLORADO AVALANCHE': 'COL',
  COLORADO: 'COL',
  AVALANCHE: 'COL',
  'DALLAS STARS': 'DAL',
  DALLAS: 'DAL',
  STARS: 'DAL',
  'MINNESOTA WILD': 'MIN',
  MINNESOTA: 'MIN',
  WILD: 'MIN',
  'NASHVILLE PREDATORS': 'NAS',
  NASHVILLE: 'NAS',
  PREDATORS: 'NAS',
  'ST. LOUIS BLUES': 'STL',
  'SAINT LOUIS BLUES': 'STL',
  'ST LOUIS BLUES': 'STL',
  'ST. LOUIS': 'STL',
  'ST LOUIS': 'STL',
  BLUES: 'STL',
  'WINNIPEG JETS': 'WPG',
  WINNIPEG: 'WPG',
  JETS: 'WPG',
  // Pacific
  'ANAHEIM DUCKS': 'ANA',
  ANAHEIM: 'ANA',
  DUCKS: 'ANA',
  'CALGARY FLAMES': 'CGY',
  CALGARY: 'CGY',
  FLAMES: 'CGY',
  'EDMONTON OILERS': 'EDM',
  EDMONTON: 'EDM',
  OILERS: 'EDM',
  'LOS ANGELES KINGS': 'LAK',
  'LA KINGS': 'LAK',
  KINGS: 'LAK',
  'SEATTLE KRAKEN': 'SEA',
  SEATTLE: 'SEA',
  KRAKEN: 'SEA',
  'SAN JOSE SHARKS': 'SJS',
  'SAN JOSE': 'SJS',
  SHARKS: 'SJS',
  'VANCOUVER CANUCKS': 'VAN',
  VANCOUVER: 'VAN',
  CANUCKS: 'VAN',
  'VEGAS GOLDEN KNIGHTS': 'VGK',
  'GOLDEN KNIGHTS': 'VGK',
  VEGAS: 'VGK',
}

const TEAM_NAME_PATTERNS = Object.keys(BULK_NAME_MAP)
  .sort((left, right) => right.length - left.length)
  .map((value) => escapeRegex(value))

const TEAM_NAME_REGEX = new RegExp(`\\b(?:${TEAM_NAME_PATTERNS.join('|')})\\b`, 'gi')
const BLOCK_TOKEN_REGEX = /(?:[OoUu]\s*\d+(?:\s*\.\d+)?|[+-]\s*\d+(?:\s*\.\d+)?|even|\d{3,4})/gi

const GAME_TIME_REGEX = /([1-9]|1[0-2]):\d{2}\s*(?:AM|PM)/i

const normalizeFractionGlyphs = (value: string): string =>
  value
    .trim()
    .replace(/[\u00a0\u2007\u202f]/g, ' ')
    .replace(/\s*ÃƒÆ'Ã¢â‚¬Å¡?Ãƒâ€šÃ‚Â½/g, '.5')
    .replace(/\s*ÃƒÆ'Ã¢â‚¬Å¡?Ãƒâ€šÃ‚Â¼/g, '.25')
    .replace(/\s*ÃƒÆ'Ã¢â‚¬Å¡?Ãƒâ€šÃ‚Â¾/g, '.75')
    .replace(/\s*Ã‚Â½/g, '.5')
    .replace(/\s*Ã‚Â¼/g, '.25')
    .replace(/\s*Ã‚Â¾/g, '.75')
    .replace(/\s*Â½/g, '.5')
    .replace(/\s*Â¼/g, '.25')
    .replace(/\s*Â¾/g, '.75')
    .replace(/\s*½/g, '.5')
    .replace(/\s*¼/g, '.25')
    .replace(/\s*¾/g, '.75')
    .replace(/\s+1\/2\b/g, '.5')
    .replace(/\s+1\/4\b/g, '.25')
    .replace(/\s+3\/4\b/g, '.75')
    .replace(/\s+/g, ' ')
    .replace(/(\d)\s+\.(25|5|75)\b/g, '$1.$2')

const parseOddsNum = (value: string | undefined): number | null => {
  if (!value) return null
  const clean = normalizeFractionGlyphs(value)
  if (/^even$/i.test(clean)) return 100
  const match = clean.match(/^([+-])\s*([\d.]+)$/i)
  if (!match) return null
  const sign = match[1]
  const amount = match[2]
  if (!sign || !amount) return null
  const numeric = Number.parseFloat(amount)
  return sign === '-' ? -numeric : numeric
}

const parsePuckLine = (value: string | undefined): number | null => {
  if (!value) return null
  const clean = normalizeFractionGlyphs(value)
  const match = clean.match(/^([+-])\s*([\d.]+)$/)
  if (!match) return null
  const sign = match[1]
  const amount = match[2]
  if (!sign || !amount) return null
  const numeric = Number.parseFloat(amount)
  return sign === '-' ? -numeric : numeric
}

const parseTotal = (value: string | undefined): number | null => {
  if (!value) return null
  const clean = normalizeFractionGlyphs(value)
  const match = clean.match(/^[OoUu]\s*([\d.]+)$/)
  if (!match) return null
  const amount = match[1]
  return amount ? Number.parseFloat(amount) : null
}

export function parseBulkOdds(raw: string): ParsedBulkGame[] {
  const lines = raw
    .split(/\r?\n/)
    .map((line) => normalizeFractionGlyphs(line))
    .filter(Boolean)

  const teamIndices = lines.flatMap((line, index) => (BULK_NAME_MAP[line.toUpperCase()] ? [index] : []))
  if (teamIndices.length >= 2) {
    return parseLineBlocks(lines, teamIndices)
  }

  const normalizedRaw = normalizeCapturedOddsText(raw)
  const teamMatches = [...normalizedRaw.matchAll(TEAM_NAME_REGEX)]
  if (teamMatches.length < 2) {
    throw new Error('Could not find recognizable NHL team names in the paste block.')
  }

  const games: ParsedBulkGame[] = []
  for (let i = 0; i < teamMatches.length - 1; i += 2) {
    const awayMatch = teamMatches[i]
    const homeMatch = teamMatches[i + 1]
    if (!awayMatch || !homeMatch) continue

    const awayAbbr = BULK_NAME_MAP[awayMatch[0].toUpperCase()]
    const homeAbbr = BULK_NAME_MAP[homeMatch[0].toUpperCase()]
    if (!awayAbbr || !homeAbbr) continue

    const awayStart = (awayMatch.index ?? 0) + awayMatch[0].length
    const homeStart = homeMatch.index ?? 0
    const nextBoundary = teamMatches[i + 2]?.index ?? normalizedRaw.length

    const awayBlock = extractBlockTokens(normalizedRaw.slice(awayStart, homeStart))
    const homeBlock = extractBlockTokens(normalizedRaw.slice(homeStart + homeMatch[0].length, nextBoundary))

    const [awayPuckLineRaw, awayPuckLineOddsRaw, awayTotalRaw, awayOverOddsRaw, awayMoneylineRaw] = awayBlock
    const [homePuckLineRaw, homePuckLineOddsRaw, homeTotalRaw, homeUnderOddsRaw, homeMoneylineRaw] = homeBlock

    const awayPuckLine = parsePuckLine(awayPuckLineRaw)
    const homePuckLine = parsePuckLine(homePuckLineRaw) ?? (awayPuckLine != null ? -awayPuckLine : null)
    const total = parseTotal(awayTotalRaw) ?? parseTotal(homeTotalRaw)

    games.push({
      awayAbbr,
      homeAbbr,
      odds: {
        source: 'manual',
        awayMoneyline: parseOddsNum(awayMoneylineRaw) ?? 110,
        homeMoneyline: parseOddsNum(homeMoneylineRaw) ?? -130,
        puckLine: homePuckLine ?? -1.5,
        puckLineAwayOdds: parseOddsNum(awayPuckLineOddsRaw) ?? -110,
        puckLineHomeOdds: parseOddsNum(homePuckLineOddsRaw) ?? 135,
        overUnder: total ?? 5.5,
        overOdds: parseOddsNum(awayOverOddsRaw) ?? -110,
        underOdds: parseOddsNum(homeUnderOddsRaw) ?? -110,
      },
    })
  }

  return games
}

function parseLineBlocks(lines: string[], teamIndices: number[]) {
  const games: ParsedBulkGame[] = []

  for (let i = 0; i < teamIndices.length - 1; i += 2) {
    const awayIndex = teamIndices[i]
    const homeIndex = teamIndices[i + 1]
    if (awayIndex == null || homeIndex == null) continue

    const awayAbbr = BULK_NAME_MAP[lines[awayIndex]!.toUpperCase()]
    const homeAbbr = BULK_NAME_MAP[lines[homeIndex]!.toUpperCase()]
    if (!awayAbbr || !homeAbbr) continue

    const headerLine = awayIndex > 0 ? (lines[awayIndex - 1] ?? '') : ''
    const timeMatch = GAME_TIME_REGEX.exec(headerLine)
    const gameTime = timeMatch ? timeMatch[0].replace(/\s+/, ' ').trim() : undefined

    const awayBlock = sliceBlock(lines, awayIndex + 1, homeIndex)
    const nextBoundary = teamIndices[i + 2] ?? lines.length
    const homeBlock = sliceBlock(lines, homeIndex + 1, nextBoundary)

    games.push(buildParsedGame(awayAbbr, homeAbbr, awayBlock, homeBlock, gameTime))
  }

  return games
}

function buildParsedGame(awayAbbr: string, homeAbbr: string, awayBlock: string[], homeBlock: string[], gameTime?: string): ParsedBulkGame {
  const [awayPuckLineRaw, awayPuckLineOddsRaw, awayTotalRaw, awayOverOddsRaw, awayMoneylineRaw] = awayBlock
  const [homePuckLineRaw, homePuckLineOddsRaw, homeTotalRaw, homeUnderOddsRaw, homeMoneylineRaw] = homeBlock

  const awayPuckLine = parsePuckLine(awayPuckLineRaw)
  const homePuckLine = parsePuckLine(homePuckLineRaw) ?? (awayPuckLine != null ? -awayPuckLine : null)
  const total = parseTotal(awayTotalRaw) ?? parseTotal(homeTotalRaw)

  return {
    awayAbbr,
    homeAbbr,
    odds: {
      source: 'manual',
      awayMoneyline: parseOddsNum(awayMoneylineRaw) ?? 110,
      homeMoneyline: parseOddsNum(homeMoneylineRaw) ?? -130,
      puckLine: homePuckLine ?? -1.5,
      puckLineAwayOdds: parseOddsNum(awayPuckLineOddsRaw) ?? -110,
      puckLineHomeOdds: parseOddsNum(homePuckLineOddsRaw) ?? 135,
      overUnder: total ?? 5.5,
      overOdds: parseOddsNum(awayOverOddsRaw) ?? -110,
      underOdds: parseOddsNum(homeUnderOddsRaw) ?? -110,
    },
    ...(gameTime ? { gameTime } : {}),
  }
}

function normalizeCapturedOddsText(raw: string) {
  return normalizeFractionGlyphs(raw)
    .replace(/\r/g, '\n')
    .replace(/\t/g, '\n')
    .replace(/\s+\|\s+/g, '\n')
    .replace(/\s{2,}/g, ' ')
}

function extractBlockTokens(block: string): string[] {
  const tokens = [...block.matchAll(BLOCK_TOKEN_REGEX)].map((match) => normalizeFractionGlyphs(match[0]))
  if (tokens[0] && /^\d{3,4}$/.test(tokens[0])) {
    tokens.shift()
  }
  return tokens.slice(0, 5)
}

function sliceBlock(lines: string[], start: number, end: number): string[] {
  const result: string[] = []
  let cursor = start
  if (cursor < end && /^\d{3,4}$/.test(lines[cursor] ?? '')) {
    cursor += 1
  }
  while (cursor < end && result.length < 5) {
    const line = lines[cursor]
    if (line) result.push(line)
    cursor += 1
  }
  return result
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
