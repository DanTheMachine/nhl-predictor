import { TEAMS } from '../../../src/nhl-core/data.js'
import type { NhlAutomationPredictionRow, NhlResultRow } from './nhlAutomation.js'

function csvEscape(value: string | number | boolean | null | undefined) {
  const text = value == null ? '' : String(value)
  return `"${text.replaceAll('"', '""')}"`
}

function teamLabel(abbr: string) {
  const team = TEAMS[abbr as keyof typeof TEAMS]
  return team ? `${abbr} ${team.name}` : abbr
}

export function buildNhlPredictionsCsv(rows: NhlAutomationPredictionRow[]) {
  const header = [
    'Date',
    'GameTime',
    'Away',
    'Home',
    'AwayGoals',
    'HomeGoals',
    'Total',
    'OTProb',
    'HomeWinProb',
    'AwayWinProb',
    'MLRec',
    'MLEdgePct',
    'PuckLineRec',
    'PuckLineEdge',
    'OURec',
    'OUEdge',
    'VegasHomeML',
    'VegasAwayML',
    'VegasPuckLine',
    'VegasPuckLineHomeOdds',
    'VegasPuckLineAwayOdds',
    'VegasOU',
    'OverOdds',
    'UnderOdds',
    'IsPlayoff',
    'LookupKey',
  ]

  const lines = rows.map((row) =>
    [
      row.date,
      row.gameTime,
      teamLabel(row.awayTeam),
      teamLabel(row.homeTeam),
      row.awayGoals,
      row.homeGoals,
      row.total,
      (row.otProb * 100).toFixed(1),
      (row.homeWinProb * 100).toFixed(1),
      (row.awayWinProb * 100).toFixed(1),
      row.mlRec,
      row.mlEdgePct.toFixed(1),
      row.puckLineRec,
      row.puckLineEdge.toFixed(1),
      row.ouRec,
      row.ouEdge.toFixed(1),
      row.vegasHomeML,
      row.vegasAwayML,
      row.vegasPuckLine,
      row.vegasPuckLineHomeOdds,
      row.vegasPuckLineAwayOdds,
      row.vegasOU,
      row.overOdds,
      row.underOdds,
      row.isPlayoff,
      row.lookupKey,
    ]
      .map(csvEscape)
      .join(','),
  )

  return [header.map(csvEscape).join(','), ...lines].join('\n')
}

export function buildNhlResultsCsv(rows: NhlResultRow[]) {
  const header = ['Date', 'Away', 'Home', 'AwayScore', 'HomeScore', 'Winner', 'Total', 'LookupKey']
  const lines = rows.map((row) =>
    [
      row.date,
      teamLabel(row.away),
      teamLabel(row.home),
      row.awayScore,
      row.homeScore,
      row.homeScore > row.awayScore ? row.home : row.away,
      row.homeScore + row.awayScore,
      row.lookupKey,
    ]
      .map(csvEscape)
      .join(','),
  )

  return [header.map(csvEscape).join(','), ...lines].join('\n')
}
