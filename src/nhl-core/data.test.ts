import { describe, expect, it } from 'vitest'

import { DIVISIONS, GAME_TYPES, ICE_CONDITIONS, TEAMS } from './data'

const TEAM_ABBRS = Object.keys(TEAMS)

describe('TEAMS', () => {
  it('contains exactly 32 franchises', () => {
    expect(TEAM_ABBRS).toHaveLength(32)
  })

  it('every team has a valid division and conference', () => {
    const validDivisions = new Set(['Atlantic', 'Metropolitan', 'Central', 'Pacific'])
    const validConferences = new Set(['East', 'West'])

    for (const abbr of TEAM_ABBRS) {
      const team = TEAMS[abbr]
      expect(validDivisions, `${abbr} division`).toContain(team.div)
      expect(validConferences, `${abbr} conference`).toContain(team.conf)
    }
  })

  it('East teams are in Atlantic or Metropolitan, West teams are in Central or Pacific', () => {
    for (const abbr of TEAM_ABBRS) {
      const { conf, div } = TEAMS[abbr]
      if (conf === 'East') {
        expect(['Atlantic', 'Metropolitan'], `${abbr} in East but div=${div}`).toContain(div)
      } else {
        expect(['Central', 'Pacific'], `${abbr} in West but div=${div}`).toContain(div)
      }
    }
  })

  it('all numeric stats are within plausible NHL ranges', () => {
    for (const abbr of TEAM_ABBRS) {
      const t = TEAMS[abbr]

      // Corsi / xGF percentages
      expect(t.cf, `${abbr}.cf`).toBeGreaterThan(30)
      expect(t.cf, `${abbr}.cf`).toBeLessThan(70)
      expect(t.ff, `${abbr}.ff`).toBeGreaterThan(30)
      expect(t.ff, `${abbr}.ff`).toBeLessThan(70)
      expect(t.xgf, `${abbr}.xgf`).toBeGreaterThan(30)
      expect(t.xgf, `${abbr}.xgf`).toBeLessThan(70)

      // Save percentage
      expect(t.goalieSV, `${abbr}.goalieSV`).toBeGreaterThan(0.85)
      expect(t.goalieSV, `${abbr}.goalieSV`).toBeLessThan(0.96)

      // Shooting percentage
      expect(t.shootingPct, `${abbr}.shootingPct`).toBeGreaterThan(4)
      expect(t.shootingPct, `${abbr}.shootingPct`).toBeLessThan(18)

      // Special-teams rates
      expect(t.ppPct, `${abbr}.ppPct`).toBeGreaterThan(5)
      expect(t.ppPct, `${abbr}.ppPct`).toBeLessThan(40)
      expect(t.pkPct, `${abbr}.pkPct`).toBeGreaterThan(60)
      expect(t.pkPct, `${abbr}.pkPct`).toBeLessThan(95)

      // Goals for / against
      expect(t.gf, `${abbr}.gf`).toBeGreaterThan(0.5)
      expect(t.gf, `${abbr}.gf`).toBeLessThan(4)
      expect(t.ga, `${abbr}.ga`).toBeGreaterThan(0.5)
      expect(t.ga, `${abbr}.ga`).toBeLessThan(4)

      // PDO (sv% + sh% × 100, centred around 100)
      expect(t.pdo, `${abbr}.pdo`).toBeGreaterThan(95)
      expect(t.pdo, `${abbr}.pdo`).toBeLessThan(108)

      // Capacity
      expect(t.capacity, `${abbr}.capacity`).toBeGreaterThan(14_000)
      expect(t.capacity, `${abbr}.capacity`).toBeLessThan(22_000)
    }
  })

  it('ice type is one of the known conditions', () => {
    const valid: Set<string> = new Set(Object.keys(ICE_CONDITIONS))
    for (const abbr of TEAM_ABBRS) {
      expect(valid, `${abbr}.ice`).toContain(TEAMS[abbr].ice)
    }
  })

  it('COL is the only altitude team and BOS is the only hybrid team', () => {
    const altitudeTeams = TEAM_ABBRS.filter((a) => TEAMS[a].ice === 'altitude')
    const hybridTeams = TEAM_ABBRS.filter((a) => TEAMS[a].ice === 'hybrid')

    expect(altitudeTeams).toEqual(['COL'])
    expect(hybridTeams).toEqual(['BOS'])
  })

  it('every team has a non-empty name, arena, color, and alt color', () => {
    for (const abbr of TEAM_ABBRS) {
      const t = TEAMS[abbr]
      expect(t.name, `${abbr}.name`).toBeTruthy()
      expect(t.arena, `${abbr}.arena`).toBeTruthy()
      expect(t.color, `${abbr}.color`).toMatch(/^#[0-9A-Fa-f]{6}$/)
      expect(t.alt, `${abbr}.alt`).toMatch(/^#[0-9A-Fa-f]{6}$/)
    }
  })
})

describe('DIVISIONS', () => {
  it('derives exactly 4 unique divisions', () => {
    expect(DIVISIONS).toHaveLength(4)
    expect(new Set(DIVISIONS).size).toBe(4)
  })

  it('contains the four expected division names', () => {
    expect(DIVISIONS).toContain('Atlantic')
    expect(DIVISIONS).toContain('Metropolitan')
    expect(DIVISIONS).toContain('Central')
    expect(DIVISIONS).toContain('Pacific')
  })
})

describe('ICE_CONDITIONS', () => {
  it('defines standard, altitude, and hybrid types', () => {
    expect(Object.keys(ICE_CONDITIONS)).toEqual(['standard', 'altitude', 'hybrid'])
  })

  it('standard ice has neutral adjustments', () => {
    expect(ICE_CONDITIONS.standard.scoringAdj).toBe(1.0)
    expect(ICE_CONDITIONS.standard.ppAdj).toBe(1.0)
  })

  it('altitude ice boosts scoring more than hybrid', () => {
    expect(ICE_CONDITIONS.altitude.scoringAdj).toBeGreaterThan(ICE_CONDITIONS.hybrid.scoringAdj)
    expect(ICE_CONDITIONS.hybrid.scoringAdj).toBeGreaterThan(ICE_CONDITIONS.standard.scoringAdj)
  })

  it('altitude ice has a pp bonus while hybrid does not', () => {
    expect(ICE_CONDITIONS.altitude.ppAdj).toBeGreaterThan(1.0)
    expect(ICE_CONDITIONS.hybrid.ppAdj).toBe(1.0)
  })

  it('every condition has a non-empty label', () => {
    for (const [type, cond] of Object.entries(ICE_CONDITIONS)) {
      expect(cond.label, `ICE_CONDITIONS.${type}.label`).toBeTruthy()
    }
  })
})

describe('GAME_TYPES', () => {
  it('has exactly 5 entries', () => {
    expect(GAME_TYPES).toHaveLength(5)
  })

  it('Regular Season is first and Stanley Cup Final is last', () => {
    expect(GAME_TYPES[0]).toBe('Regular Season')
    expect(GAME_TYPES[GAME_TYPES.length - 1]).toBe('Stanley Cup Final')
  })

  it('all playoff types contain Playoff or Final', () => {
    const playoffTypes = GAME_TYPES.filter((g) => g !== 'Regular Season')
    for (const type of playoffTypes) {
      expect(type).toMatch(/Playoff|Final/)
    }
  })
})
