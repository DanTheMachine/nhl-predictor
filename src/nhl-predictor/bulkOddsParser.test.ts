import { describe, expect, it } from 'vitest'

import { parseBulkOdds } from './bulkOddsParser'

// Multiline block format: each team name on its own line, 3-digit rotation number skipped.
// This is the standard sportsbook format the parser was designed for.
const MULTILINE_TWO_GAME_BLOCK = `THURSDAY - 4/30/2026
7:00 PM
EDMONTON
108
- 1 ½
+ 180
O 7
- 105
- 120
ANAHEIM
107
+ 1 ½
- 200
U 7
- 105
+ 110
7:30 PM
BOSTON
202
- 1 ½
+ 155
O 6
- 115
- 165
TORONTO
201
+ 1 ½
- 175
U 6
+ 105
+ 145`

// Betlotus-style: 2-digit rotation numbers are NOT skipped, so the rotation
// number shifts into position 0 of the block and odds parse to defaults.
// Team pairing is still correct.
const BETLOTUS_TWO_DIGIT_ROTATION = `THURSDAY - 4/30/2026 7:00 PM
EDMONTON
45
- 1 ½
+ 180
O 7
- 105
- 120
ANAHEIM
46
+ 1 ½
- 200
U 7
- 105
+ 110`

// Inline format: all team names embedded in continuous text, no standalone team lines.
const INLINE_ONE_GAME = 'EDMONTON + 1 ½ - 200 U 7 - 105 + 110 ANAHEIM - 1 ½ + 180 O 7 - 105 - 120'

describe('parseBulkOdds — line-block mode (3-digit rotation)', () => {
  it('correctly parses a two-game slate', () => {
    const games = parseBulkOdds(MULTILINE_TWO_GAME_BLOCK)

    expect(games).toHaveLength(2)
  })

  it('assigns away/home teams from block order', () => {
    const [edm, bos] = parseBulkOdds(MULTILINE_TWO_GAME_BLOCK)

    expect(edm!.awayAbbr).toBe('EDM')
    expect(edm!.homeAbbr).toBe('ANA')
    expect(bos!.awayAbbr).toBe('BOS')
    expect(bos!.homeAbbr).toBe('TOR')
  })

  it('parses puck line, odds, and O/U from block lines', () => {
    const [game] = parseBulkOdds(MULTILINE_TWO_GAME_BLOCK)

    // Home (ANA) gets +1.5; puckLine stores the home spread
    expect(game!.odds.puckLine).toBe(1.5)
    expect(game!.odds.puckLineAwayOdds).toBe(180)
    expect(game!.odds.puckLineHomeOdds).toBe(-200)
    expect(game!.odds.overUnder).toBe(7)
    expect(game!.odds.overOdds).toBe(-105)
    expect(game!.odds.underOdds).toBe(-105)
    expect(game!.odds.awayMoneyline).toBe(-120)
    expect(game!.odds.homeMoneyline).toBe(110)
  })

  it('extracts the game time from the header line preceding the away team', () => {
    const [game] = parseBulkOdds(MULTILINE_TWO_GAME_BLOCK)
    expect(game!.gameTime).toBe('7:00 PM')
  })

  it('filters out period-specific lines — only full-game team names standalone', () => {
    const periodBlock = `THURSDAY - 4/30/2026
7:00 PM
EDMONTON
108
- 1 ½
+ 180
O 7
- 105
- 120
ANAHEIM
107
+ 1 ½
- 200
U 7
- 105
+ 110
1st Period
1P EDMONTON
108
- ½
+ 160
O 1 ½
- 180
- 120
1P ANAHEIM
107
+ ½
- 190
U 1 ½
+ 150
Even`

    // "1P EDMONTON" is not a bare team name — it won't appear in teamIndices.
    const games = parseBulkOdds(periodBlock)
    expect(games).toHaveLength(1)
    expect(games[0]!.awayAbbr).toBe('EDM')
  })
})

describe('parseBulkOdds — 2-digit rotation numbers (betlotus format)', () => {
  it('correctly identifies teams even when rotation numbers are 2 digits', () => {
    const games = parseBulkOdds(BETLOTUS_TWO_DIGIT_ROTATION)

    expect(games).toHaveLength(1)
    expect(games[0]!.awayAbbr).toBe('EDM')
    expect(games[0]!.homeAbbr).toBe('ANA')
  })

  it('falls back to defaults for puck line when 2-digit rotation occupies slot 0', () => {
    const [game] = parseBulkOdds(BETLOTUS_TWO_DIGIT_ROTATION)

    // 2-digit rotation occupies the puck-line slot, so parsePuckLine returns null
    // and the parser falls back to the hardcoded default of -1.5.
    expect(game!.odds.puckLine).toBe(-1.5)
  })
})

describe('parseBulkOdds — inline mode', () => {
  it('parses a single inline game', () => {
    const games = parseBulkOdds(INLINE_ONE_GAME)

    expect(games).toHaveLength(1)
    expect(games[0]!.awayAbbr).toBe('EDM')
    expect(games[0]!.homeAbbr).toBe('ANA')
  })

  it('falls back to inline mode when no standalone team names are found', () => {
    // No team name appears as a bare line — inline parser is used.
    const text = 'BOSTON BRUINS - 1 ½ + 160 O 6 - 110 - 140 TORONTO MAPLE LEAFS + 1 ½ - 180 U 6 - 110 + 120'
    const games = parseBulkOdds(text)

    expect(games).toHaveLength(1)
    expect(games[0]!.awayAbbr).toBe('BOS')
    expect(games[0]!.homeAbbr).toBe('TOR')
  })
})

describe('parseBulkOdds — team name resolution', () => {
  it('resolves full names and city-name aliases', () => {
    const block = (away: string, home: string) =>
      `${away}\n108\n- 1 ½\n+ 150\nO 6\n- 110\n- 130\n${home}\n107\n+ 1 ½\n- 165\nU 6\n- 110\n+ 115`

    // Full name + city alias
    expect(parseBulkOdds(block('BOSTON BRUINS', 'TORONTO MAPLE LEAFS'))[0]!.awayAbbr).toBe('BOS')
    expect(parseBulkOdds(block('BOSTON', 'TORONTO MAPLE LEAFS'))[0]!.awayAbbr).toBe('BOS')

    // Full name + mascot alias (both sides)
    expect(parseBulkOdds(block('VEGAS GOLDEN KNIGHTS', 'COLORADO AVALANCHE'))[0]!.awayAbbr).toBe('VGK')
    expect(parseBulkOdds(block('GOLDEN KNIGHTS', 'COLORADO AVALANCHE'))[0]!.awayAbbr).toBe('VGK')
    expect(parseBulkOdds(block('EDMONTON OILERS', 'CAROLINA HURRICANES'))[0]!.awayAbbr).toBe('EDM')
    expect(parseBulkOdds(block('OILERS', 'HURRICANES'))[0]!.awayAbbr).toBe('EDM')

    // Multi-word city + punctuation
    expect(parseBulkOdds(block('ST. LOUIS BLUES', 'NASHVILLE PREDATORS'))[0]!.awayAbbr).toBe('STL')
    expect(parseBulkOdds(block('UTAH MAMMOTH', 'DALLAS STARS'))[0]!.awayAbbr).toBe('UTA')
    expect(parseBulkOdds(block('MAMMOTH', 'STARS'))[0]!.awayAbbr).toBe('UTA')
  })
})

describe('parseBulkOdds — error handling', () => {
  it('throws when no recognizable NHL team names are found', () => {
    expect(() => parseBulkOdds('No teams here at all')).toThrow(
      'Could not find recognizable NHL team names',
    )
  })

  it('throws when only one team name is found', () => {
    expect(() => parseBulkOdds('BOSTON BRUINS just one team')).toThrow()
  })
})

describe('parseBulkOdds — odds defaults', () => {
  it('applies all defaults when no odds lines follow the team names', () => {
    // Minimal block: only team names + 3-digit rotation numbers, no odds data.
    // sliceBlock skips the rotation number and finds an empty block → all defaults.
    const minimalBlock = `EDMONTON\n108\nANAHEIM\n107`
    const [game] = parseBulkOdds(minimalBlock)

    expect(game!.odds.puckLine).toBe(-1.5)
    expect(game!.odds.overUnder).toBe(5.5)
    expect(game!.odds.awayMoneyline).toBe(110)
    expect(game!.odds.homeMoneyline).toBe(-130)
    expect(game!.odds.puckLineAwayOdds).toBe(-110)
    expect(game!.odds.puckLineHomeOdds).toBe(135)
  })
})
