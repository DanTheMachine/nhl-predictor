import { describe, expect, it, vi } from 'vitest'

import { buildExportRow, rowsToCSV } from './export'
import type { LinesRow } from './types'

describe('buildExportRow', () => {
  it('fills betting fields when odds are available', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-19T15:00:00Z'))

    const row: LinesRow = {
      game: {
        homeAbbr: 'COL',
        awayAbbr: 'CHI',
        gameTime: '7:00 PM ET',
        tvInfo: 'ESPN',
      },
      espnOdds: {
        source: 'espn',
        homeMoneyline: -110,
        awayMoneyline: -110,
        puckLine: -1.5,
        puckLineHomeOdds: 130,
        puckLineAwayOdds: -150,
        overUnder: 5.5,
        overOdds: -110,
        underOdds: -110,
      },
      editedOdds: null,
      simResult: null,
      isEditing: false,
      homeB2B: false,
      awayB2B: false,
      homeSVOverride: 0.93,
      awaySVOverride: null,
    }

    const exportRow = buildExportRow(row)

    expect(exportRow.home).toBe('COL Avalanche')
    expect(exportRow.away).toBe('CHI Blackhawks')
    expect(exportRow.oddsSource).toBe('ESPN')
    expect(exportRow.homeSVOverrideExport).toBe('.930')
    expect(exportRow.vegaHomeML).toBe('-110')
    expect(exportRow.vegaPuckLine).toBe('-1.5')
    expect(exportRow.vegaPuckLineHomeOdds).toBe('+130')
    expect(exportRow.vegaOverOdds).toBe('-110')
    expect(exportRow.lookupKey.endsWith('COLCHI')).toBe(true)

    vi.useRealTimers()
  })

  it('uses placeholder values when no odds are available', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-19T15:00:00Z'))

    const row: LinesRow = {
      game: {
        homeAbbr: 'BOS',
        awayAbbr: 'MTL',
        gameTime: '7:30 PM ET',
        tvInfo: 'NESN',
      },
      espnOdds: null,
      editedOdds: null,
      simResult: null,
      isEditing: false,
      homeB2B: false,
      awayB2B: true,
      homeSVOverride: null,
      awaySVOverride: null,
    }

    const exportRow = buildExportRow(row)

    expect(exportRow.oddsSource).toBe('No odds')
    expect(exportRow.vegaHomeML).toBe('-')
    expect(exportRow.mlValueSide).toBe('-')
    expect(exportRow.puckLineRec).toBe('-')

    vi.useRealTimers()
  })
})

describe('rowsToCSV', () => {
  it('escapes quotes and preserves the header order', () => {
    const csv = rowsToCSV([
      {
        date: '03/19/2026',
        gameTime: '7:00 PM ET',
        home: 'COL Avalanche',
        away: 'CHI Blackhawks',
        homeWinProb: '60.0%',
        awayWinProb: '40.0%',
        homeGoals: '3.20',
        awayGoals: '2.10',
        total: '5.30',
        vegaOU: '5.5',
        ouRec: 'UNDER',
        ouEdge: '-0.20',
        homeML: '-150',
        awayML: '+150',
        vegaHomeML: '-110',
        vegaAwayML: '+100',
        vegaPuckLine: '-1.5',
        vegaPuckLineHomeOdds: '+130',
        vegaPuckLineAwayOdds: '-150',
        vegaOverOdds: '-110',
        vegaUnderOdds: '-110',
        homeEdgePct: '+7.5%',
        awayEdgePct: '-7.5%',
        mlValueSide: 'HOME ML',
        mlKelly: '3.1%',
        puckLineRec: 'PASS',
        puckLineEdge: '-',
        homeCorsi: '56.4%',
        awayCorsi: '45.0%',
        homeXGF: '55.8%',
        awayXGF: '44.2%',
        homeSV: '.926',
        awaySV: '.903',
        homeSVOverrideExport: '-',
        awaySVOverrideExport: '-',
        homePP: '25.5%',
        awayPP: '18.0%',
        homePK: '83.0%',
        awayPK: '76.0%',
        homePDO: '101.3',
        awayPDO: '98.7',
        oddsSource: 'Manual "book"',
        lookupKey: '20260319COLCHI',
      },
    ])

    expect(csv).toContain('"Date","Game Time","Home","Away"')
    expect(csv).toContain('"Vegas Puck Line","Home PL Odds","Away PL Odds","Over Odds","Under Odds"')
    expect(csv).toContain('"Manual ""book"""')
    expect(csv.split('\n')).toHaveLength(2)
  })
})
