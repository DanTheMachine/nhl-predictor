import { describe, expect, it } from 'vitest'

import { analyzeBetting, americanToImplied, mlAmerican, predictGame } from './engine'
import type { OddsData } from './types'

describe('americanToImplied', () => {
  it('converts negative American odds', () => {
    expect(americanToImplied(-150)).toBeCloseTo(0.6, 4)
  })

  it('converts positive American odds', () => {
    expect(americanToImplied(130)).toBeCloseTo(100 / 230, 4)
  })

  it('falls back to a coin flip for invalid odds', () => {
    expect(americanToImplied(0)).toBe(0.5)
    expect(americanToImplied(Number.NaN)).toBe(0.5)
  })
})

describe('predictGame', () => {
  it('returns balanced probabilities that sum to one', () => {
    const result = predictGame({
      homeTeam: 'COL',
      awayTeam: 'CHI',
      gameType: 'Regular Season',
      homeB2B: false,
      awayB2B: false,
    })

    expect(result.hWinProb + result.aWinProb).toBeCloseTo(1, 4)
    expect(Number(result.hGoals)).toBeGreaterThanOrEqual(0.8)
    expect(Number(result.aGoals)).toBeGreaterThanOrEqual(0.8)
    expect(result.features).toHaveLength(6)
    expect(result.isPlayoff).toBe(false)
  })

  it('marks playoff games and slightly suppresses scoring', () => {
    const regularSeason = predictGame({
      homeTeam: 'COL',
      awayTeam: 'DAL',
      gameType: 'Regular Season',
      homeB2B: false,
      awayB2B: false,
    })

    const playoff = predictGame({
      homeTeam: 'COL',
      awayTeam: 'DAL',
      gameType: 'Stanley Cup Final',
      homeB2B: false,
      awayB2B: false,
    })

    expect(playoff.isPlayoff).toBe(true)
    expect(Number(playoff.total)).toBeLessThan(Number(regularSeason.total))
  })

  it('applies live stats and goalie overrides', () => {
    const baseline = predictGame({
      homeTeam: 'BOS',
      awayTeam: 'MTL',
      gameType: 'Regular Season',
      homeB2B: false,
      awayB2B: false,
    })

    const adjusted = predictGame({
      homeTeam: 'BOS',
      awayTeam: 'MTL',
      gameType: 'Regular Season',
      homeB2B: false,
      awayB2B: false,
      homeSVOverride: 0.94,
      awaySVOverride: 0.88,
      liveStats: {
        BOS: {
          cf: 54,
          ff: 54,
          xgf: 55,
          pdo: 101,
          goalieSV: 0.91,
          shootingPct: 11,
          ppPct: 28,
          pkPct: 85,
          gf: 3.1,
          ga: 1.9,
          srs: 0.6,
          gp: 10,
          lastUpdated: '2026-03-19T00:00:00Z',
        },
      },
    })

    expect(adjusted.hWinProb).toBeGreaterThan(baseline.hWinProb)
    expect(adjusted.goalieEdge).toContain('+')
  })

  it('does not apply the estimated-data scoring bump when both teams have live stats', () => {
    const liveResult = predictGame({
      homeTeam: 'BOS',
      awayTeam: 'MTL',
      gameType: 'Regular Season',
      homeB2B: false,
      awayB2B: false,
      liveStats: {
        BOS: {
          cf: 54,
          ff: 54,
          xgf: 55,
          pdo: 101,
          goalieSV: 0.91,
          shootingPct: 11,
          ppPct: 28,
          pkPct: 85,
          gf: 3.1,
          ga: 2.6,
          srs: 0.5,
          gp: 10,
          lastUpdated: '2026-03-19T00:00:00Z',
        },
        MTL: {
          cf: 50,
          ff: 50,
          xgf: 49,
          pdo: 99,
          goalieSV: 0.9,
          shootingPct: 9.4,
          ppPct: 21,
          pkPct: 78,
          gf: 2.9,
          ga: 3.0,
          srs: -0.1,
          gp: 10,
          lastUpdated: '2026-03-19T00:00:00Z',
        },
      },
    })

    expect(Number(liveResult.total)).toBeLessThan(7)
    expect(Number(liveResult.total)).toBeGreaterThan(5.4)
  })

  it('captures schedule disadvantage in the feature summary', () => {
    const result = predictGame({
      homeTeam: 'BOS',
      awayTeam: 'MTL',
      gameType: 'Regular Season',
      homeB2B: true,
      awayB2B: false,
    })

    expect(result.features.at(-1)).toEqual({
      label: 'Schedule',
      detail: 'Home B2B / Away Rested',
      good: false,
    })
  })
})

describe('analyzeBetting', () => {
  it('identifies a home moneyline edge when the model is materially higher than market', () => {
    const result = predictGame({
      homeTeam: 'COL',
      awayTeam: 'CHI',
      gameType: 'Regular Season',
      homeB2B: false,
      awayB2B: false,
    })

    const odds: OddsData = {
      source: 'manual',
      homeMoneyline: -110,
      awayMoneyline: -110,
      puckLine: -1.5,
      puckLineHomeOdds: 130,
      puckLineAwayOdds: -150,
      overUnder: 5.5,
      overOdds: -110,
      underOdds: -110,
    }

    const analysis = analyzeBetting(result, odds)

    expect(analysis.mlValueSide).toBe('home')
    expect(analysis.mlValuePct).toBeGreaterThan(0)
    expect(analysis.kellyHome).toBeGreaterThan(0)
  })

  it('returns pass recommendations for moneyline and total when model and market are close', () => {
    const analysis = analyzeBetting(
      {
        hWinProb: 0.5,
        aWinProb: 0.5,
        hGoals: '2.75',
        aGoals: '2.75',
        total: '5.50',
        otProb: 0.24,
        goalieEdge: '+0.0 SV pts',
        hPDOLuck: 'Running hot',
        aPDOLuck: 'Running cold',
        isPlayoff: false,
        features: [],
      },
      {
        source: 'manual',
        homeMoneyline: -110,
        awayMoneyline: -110,
        puckLine: -1.5,
        puckLineHomeOdds: 400,
        puckLineAwayOdds: -500,
        overUnder: 5.5,
        overOdds: -110,
        underOdds: -110,
      },
    )

    expect(analysis.mlValueSide).toBe('none')
    expect(analysis.ouRec).toBe('pass')
    expect(analysis.kellyHome).toBe(0)
    expect(analysis.kellyAway).toBe(0)
  })

  it('can recommend the away side and the under', () => {
    const analysis = analyzeBetting(
      {
        hWinProb: 0.39,
        aWinProb: 0.61,
        hGoals: '2.10',
        aGoals: '2.60',
        total: '4.70',
        otProb: 0.21,
        goalieEdge: '-12.0 SV pts',
        hPDOLuck: 'Running cold',
        aPDOLuck: 'Running hot',
        isPlayoff: false,
        features: [],
      },
      {
        source: 'manual',
        homeMoneyline: -105,
        awayMoneyline: -115,
        puckLine: 1.5,
        puckLineHomeOdds: -102,
        puckLineAwayOdds: -118,
        overUnder: 5.5,
        overOdds: -110,
        underOdds: -110,
      },
    )

    expect(analysis.mlValueSide).toBe('away')
    expect(analysis.ouRec).toBe('under')
    expect(analysis.kellyAway).toBeGreaterThan(0)
  })

  it('can recommend the over when the projected total clears the market by enough', () => {
    const analysis = analyzeBetting(
      {
        hWinProb: 0.54,
        aWinProb: 0.46,
        hGoals: '3.30',
        aGoals: '3.00',
        total: '6.30',
        otProb: 0.18,
        goalieEdge: '+2.0 SV pts',
        hPDOLuck: 'Running hot',
        aPDOLuck: 'Running hot',
        isPlayoff: false,
        features: [],
      },
      {
        source: 'manual',
        homeMoneyline: -120,
        awayMoneyline: +100,
        puckLine: -1.5,
        puckLineHomeOdds: 165,
        puckLineAwayOdds: -185,
        overUnder: 5.5,
        overOdds: -110,
        underOdds: -110,
      },
    )

    expect(analysis.ouRec).toBe('over')
    expect(analysis.ouEdge).toBeGreaterThan(0.035)
  })
})

describe('mlAmerican', () => {
  it('formats favorite, underdog, and invalid probabilities', () => {
    expect(mlAmerican(0.6)).toBe('-150')
    expect(mlAmerican(0.4)).toBe('+150')
    expect(mlAmerican(1)).toBe('N/A')
  })
})
