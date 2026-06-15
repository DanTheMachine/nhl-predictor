import { describe, expect, it } from 'vitest'

import { americanToImplied, analyzeBetting, mlAmerican, predictGame } from './engine'
import type { OddsData, PredictResult } from '../nhl-core/types'

// Minimal valid PredictResult for analyzeBetting tests
function makeResult(overrides: Partial<PredictResult> = {}): PredictResult {
  return {
    hWinProb: 0.54,
    aWinProb: 0.46,
    hGoals: '2.90',
    aGoals: '2.60',
    total: '5.50',
    otProb: 0.22,
    goalieEdge: '+3.000',
    hPDOLuck: '0.010',
    aPDOLuck: '-0.010',
    isPlayoff: false,
    features: [],
    ...overrides,
  }
}

const evenOdds: OddsData = {
  source: 'manual',
  homeMoneyline: -110,
  awayMoneyline: -110,
  puckLine: -1.5,
  puckLineHomeOdds: -110,
  puckLineAwayOdds: -110,
  overUnder: 5.5,
  overOdds: -110,
  underOdds: -110,
}

describe('predictGame — production engine', () => {
  it('returns win probabilities that sum to 1', () => {
    const result = predictGame({
      homeTeam: 'COL',
      awayTeam: 'CHI',
      gameType: 'Regular Season',
      homeB2B: false,
      awayB2B: false,
    })

    expect(result.hWinProb + result.aWinProb).toBeCloseTo(1, 4)
    expect(result.features).toHaveLength(12)
    expect(result.isPlayoff).toBe(false)
  })

  it('caps win probability at [22%, 78%]', () => {
    // DAL vs a weak team with all stats in DAL's favor should still be capped
    const result = predictGame({
      homeTeam: 'DAL',
      awayTeam: 'CHI',
      gameType: 'Regular Season',
      homeB2B: false,
      awayB2B: false,
      homeSVOverride: 0.93,
      awaySVOverride: 0.88,
    })

    expect(result.hWinProb).toBeLessThanOrEqual(0.78)
    expect(result.aWinProb).toBeGreaterThanOrEqual(0.219)
  })

  it('playoff factor reduces projected total vs regular season', () => {
    const reg = predictGame({ homeTeam: 'CAR', awayTeam: 'NYR', gameType: 'Regular Season', homeB2B: false, awayB2B: false })
    const playoff = predictGame({ homeTeam: 'CAR', awayTeam: 'NYR', gameType: 'Stanley Cup Playoffs', homeB2B: false, awayB2B: false })

    expect(playoff.isPlayoff).toBe(true)
    expect(Number(playoff.total)).toBeLessThan(Number(reg.total))
  })

  it('B2B penalty reduces the affected team\'s win probability', () => {
    const rested = predictGame({ homeTeam: 'BOS', awayTeam: 'MTL', gameType: 'Regular Season', homeB2B: false, awayB2B: false })
    const homeB2B = predictGame({ homeTeam: 'BOS', awayTeam: 'MTL', gameType: 'Regular Season', homeB2B: true, awayB2B: false })

    expect(homeB2B.hWinProb).toBeLessThan(rested.hWinProb)
    expect(Number(homeB2B.hGoals)).toBeLessThan(Number(rested.hGoals))
  })

  it('live stats replace baseline and use LIVE calibration (lower total)', () => {
    // With ESTIMATED_TOTAL_SCORING_CALIBRATION = 1.45 vs LIVE = 1.0,
    // passing live gf/ga that match baseline per-60 values should drop the projected total
    const baseline = predictGame({
      homeTeam: 'BOS',
      awayTeam: 'MTL',
      gameType: 'Regular Season',
      homeB2B: false,
      awayB2B: false,
    })

    const live = predictGame({
      homeTeam: 'BOS',
      awayTeam: 'MTL',
      gameType: 'Regular Season',
      homeB2B: false,
      awayB2B: false,
      liveStats: {
        BOS: { cf: 53, ff: 52, xgf: 54, pdo: 101, goalieSV: 0.915, shootingPct: 10, ppPct: 24, pkPct: 82, gf: 3.0, ga: 2.5, srs: 0.4, gp: 50, lastUpdated: '' },
        MTL: { cf: 48, ff: 47, xgf: 47, pdo: 99, goalieSV: 0.900, shootingPct: 9, ppPct: 19, pkPct: 78, gf: 2.7, ga: 3.1, srs: -0.2, gp: 50, lastUpdated: '' },
      },
    })

    expect(Number(live.total)).toBeLessThan(Number(baseline.total))
  })

  it('clampPct prevents extreme cf/xgf values from blowing up goals', () => {
    // cf=0.6 (decimal fraction form) and cf=600 (raw count form) are both corrupt;
    // without clampPct they push the multiplier to extreme values
    const result = predictGame({
      homeTeam: 'CAR',
      awayTeam: 'OTT',
      gameType: 'Regular Season',
      homeB2B: false,
      awayB2B: false,
      liveStats: {
        CAR: { cf: 0.6, ff: 0.6, xgf: 0.6, pdo: 98, goalieSV: 0.910, shootingPct: 9, ppPct: 22, pkPct: 80, gf: 2.18, ga: 1.97, srs: 0.4, gp: 82, lastUpdated: '' },
        OTT: { cf: 600, ff: 600, xgf: 600, pdo: 99, goalieSV: 0.905, shootingPct: 10, ppPct: 23, pkPct: 78, gf: 2.22, ga: 2.01, srs: 0.2, gp: 82, lastUpdated: '' },
      },
    })

    expect(Number(result.hGoals)).toBeGreaterThanOrEqual(0.8)
    expect(Number(result.hGoals)).toBeLessThan(6)
    expect(Number(result.aGoals)).toBeGreaterThanOrEqual(0.8)
    expect(Number(result.aGoals)).toBeLessThan(6)
  })

  it('goalie override shifts win probability in the expected direction', () => {
    const base = predictGame({ homeTeam: 'BOS', awayTeam: 'CHI', gameType: 'Regular Season', homeB2B: false, awayB2B: false })
    const eliteGoalie = predictGame({
      homeTeam: 'BOS',
      awayTeam: 'CHI',
      gameType: 'Regular Season',
      homeB2B: false,
      awayB2B: false,
      homeSVOverride: 0.940,
      awaySVOverride: 0.870,
    })

    expect(eliteGoalie.hWinProb).toBeGreaterThan(base.hWinProb)
  })

  it('PP formula: equal PP/PK produces near-zero special teams adjustment', () => {
    // When ppPct ≈ (100 - opponentPkPct), the PP term is ~0, so goals are driven
    // purely by gf/ga averages. Use symmetric baselines to confirm no skew.
    const result = predictGame({
      homeTeam: 'CAR',
      awayTeam: 'CAR', // same team — symmetric baseline
      gameType: 'Regular Season',
      homeB2B: false,
      awayB2B: false,
    })

    // hGoals and aGoals should be very close (small hfa is expected)
    const diff = Math.abs(Number(result.hGoals) - Number(result.aGoals))
    expect(diff).toBeLessThan(0.5)
  })
})

describe('americanToImplied — production engine', () => {
  it('converts negative odds', () => {
    expect(americanToImplied(-150)).toBeCloseTo(0.6, 4)
  })

  it('converts positive odds', () => {
    expect(americanToImplied(130)).toBeCloseTo(100 / 230, 4)
  })

  it('returns 0.5 for invalid input', () => {
    expect(americanToImplied(0)).toBe(0.5)
    expect(americanToImplied(NaN)).toBe(0.5)
  })
})

describe('analyzeBetting — production engine', () => {
  it('identifies home ML value when model probability exceeds market by more than 7%', () => {
    const result = makeResult({ hWinProb: 0.65, aWinProb: 0.35 })
    const odds: OddsData = { ...evenOdds, homeMoneyline: -110, awayMoneyline: -110 }
    const analysis = analyzeBetting(result, odds)

    expect(analysis.mlValueSide).toBe('home')
    expect(analysis.homeEdge).toBeGreaterThan(0.07)
    expect(analysis.kellyHome).toBeGreaterThan(0)
  })

  it('does not flag a 6% edge as a play (below 7% ML_EDGE_THRESHOLD)', () => {
    const result = makeResult({ hWinProb: 0.56, aWinProb: 0.44 })
    const analysis = analyzeBetting(result, evenOdds)

    expect(analysis.mlValueSide).toBe('none')
    expect(analysis.kellyHome).toBe(0)
  })

  it('recommends the over when projected total clears the line by enough', () => {
    const result = makeResult({ hGoals: '3.50', aGoals: '3.20', total: '6.70' })
    const analysis = analyzeBetting(result, { ...evenOdds, overUnder: 5.5 })

    expect(analysis.ouRec).toBe('over')
    expect(analysis.ouEdge).toBeGreaterThan(0.06)
  })

  it('recommends the under when projected total is well below the line', () => {
    const result = makeResult({ hGoals: '2.10', aGoals: '2.00', total: '4.10' })
    const analysis = analyzeBetting(result, { ...evenOdds, overUnder: 5.5 })

    expect(analysis.ouRec).toBe('under')
  })

  it('passes on O/U when totals are close', () => {
    const result = makeResult({ hGoals: '2.80', aGoals: '2.70', total: '5.50' })
    const analysis = analyzeBetting(result, { ...evenOdds, overUnder: 5.5 })

    expect(analysis.ouRec).toBe('pass')
  })

  it('puck line recommendation uses cover probability vs market implied', () => {
    // Large projected goal diff (2.5 goals) makes home -1.5 cover likely — clears 8% threshold
    const result = makeResult({ hGoals: '4.50', aGoals: '2.00', total: '6.50', hWinProb: 0.78, aWinProb: 0.22 })
    const odds: OddsData = { ...evenOdds, puckLine: -1.5, puckLineHomeOdds: -110, puckLineAwayOdds: -110 }
    const analysis = analyzeBetting(result, odds)

    expect(analysis.puckLineRec).not.toBe('pass')
  })

  it('puck line passes when projected diff is near the 1.5-goal line (neither side clears 8%)', () => {
    // Projected diff ~1.5 goals → cover probability ≈ 50/50 → edge near zero on both sides
    const result = makeResult({ hGoals: '3.50', aGoals: '2.00', total: '5.50', hWinProb: 0.62, aWinProb: 0.38 })
    const odds: OddsData = { ...evenOdds, puckLine: -1.5, puckLineHomeOdds: -110, puckLineAwayOdds: -110 }
    const analysis = analyzeBetting(result, odds)

    expect(analysis.puckLineRec).toBe('pass')
  })

  it('O/U passes on modest 4% edge that would have triggered old 3.5% threshold', () => {
    // projected total 5.9 vs line 5.5 — edge is real but below new 6% threshold
    const result = makeResult({ hGoals: '3.00', aGoals: '2.90', total: '5.90' })
    const analysis = analyzeBetting(result, { ...evenOdds, overUnder: 5.5 })

    expect(analysis.ouRec).toBe('pass')
  })
})

describe('mlAmerican — production engine', () => {
  it('formats favorite odds', () => {
    expect(mlAmerican(0.6)).toBe('-150')
  })

  it('formats underdog odds', () => {
    expect(mlAmerican(0.4)).toBe('+150')
  })

  it('returns N/A for boundary values', () => {
    expect(mlAmerican(0)).toBe('N/A')
    expect(mlAmerican(1)).toBe('N/A')
  })
})
