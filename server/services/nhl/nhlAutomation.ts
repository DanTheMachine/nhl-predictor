import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { analyzeBetting, predictGame } from '../../../src/nhl-predictor/engine.js'
import { TEAMS } from '../../../src/nhl-core/data.js'
import type { OddsData } from '../../../src/nhl-core/types.js'
import { appConfig, assertDateInput, isDbConfigured, subtractOneDay } from '../../config.js'
import {
  createNhlPredictionFileRecord,
  createNhlPredictionRun,
  createNhlResultFileRecord,
  getNhlPredictionsByDateRange,
  getNhlPredictionsByRunOrDate,
  getNhlResultsByDateRange,
  saveNhlMarketOddsSnapshot,
  saveNhlPredictions,
  saveNhlResults,
  saveNhlSlateRows,
  saveNhlTeamStatSnapshot,
  updateNhlPredictionRunExports,
  saveNhlEvaluationSummary,
} from '../../db/repositories.js'
import { buildNhlPredictionsCsv, buildNhlResultsCsv } from './nhlCsv.js'

export const CURRENT_MODEL_VERSION = 'heuristic-v1'

const ESPN_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
  Referer: 'https://www.espn.com/',
  Accept: 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
  'Cache-Control': 'no-cache',
}

// ─── ESPN Types ───────────────────────────────────────────────────────────────

type ESPNCompetitor = {
  homeAway?: 'home' | 'away'
  score?: string
  team?: { abbreviation?: string }
}

type ESPNOdds = {
  moneyline?: {
    home?: { close?: { odds?: string }; open?: { odds?: string } }
    away?: { close?: { odds?: string }; open?: { odds?: string } }
  }
  spread?: {
    home?: { close?: { line?: string; odds?: string } }
    away?: { close?: { odds?: string } }
  }
  total?: {
    over?: { close?: { line?: string; odds?: string } }
    under?: { close?: { odds?: string } }
  }
}

type ESPNEvent = {
  id?: string
  date?: string
  status?: { type?: { completed?: boolean; name?: string } }
  competitions?: Array<{
    competitors?: ESPNCompetitor[]
    odds?: ESPNOdds[]
  }>
}

type ScoreboardResponse = {
  events?: ESPNEvent[]
}

// ─── Public Types ─────────────────────────────────────────────────────────────

export type NhlScheduleGame = {
  homeAbbr: string
  awayAbbr: string
  gameTime: string
  gameDateIso: string
  lookupKey: string
  espnOdds: OddsData | null
  status: string
}

export type NhlAutomationPredictionRow = {
  date: string
  gameTime: string
  awayTeam: string
  homeTeam: string
  homeGoals: string
  awayGoals: string
  total: string
  otProb: number
  homeWinProb: number
  awayWinProb: number
  mlRec: string
  mlEdgePct: number
  puckLineRec: string
  puckLineEdge: number
  ouRec: string
  ouEdge: number
  vegasHomeML: number
  vegasAwayML: number
  vegasPuckLine: number
  vegasPuckLineHomeOdds: number
  vegasPuckLineAwayOdds: number
  vegasOU: number
  overOdds: number
  underOdds: number
  isPlayoff: boolean
  lookupKey: string
}

export type NhlResultRow = {
  date: string
  home: string
  away: string
  homeScore: number
  awayScore: number
  lookupKey: string
}

// ─── ESPN Data Fetching ───────────────────────────────────────────────────────

function toEspnDate(date: string) {
  return date.replaceAll('-', '')
}

function normalizeAbbr(abbr: string): string {
  const map: Record<string, string> = {
    WSH: 'WSH',
    TB: 'TBL',
    NJ: 'NJD',
    SJ: 'SJS',
    LA: 'LAK',
    CLB: 'CBJ',
    VGK: 'VGK',
  }
  return map[abbr] ?? abbr
}

function parseMoneyline(raw?: string): number {
  if (!raw) return 0
  const n = Number(raw)
  return Number.isFinite(n) ? n : 0
}

function parseEspnOdds(odds?: ESPNOdds): OddsData | null {
  if (!odds) return null

  const homeML = parseMoneyline(odds.moneyline?.home?.close?.odds ?? odds.moneyline?.home?.open?.odds)
  const awayML = parseMoneyline(odds.moneyline?.away?.close?.odds ?? odds.moneyline?.away?.open?.odds)
  const puckLine = Number(odds.spread?.home?.close?.line ?? '-1.5') || -1.5
  const puckLineHomeOdds = parseMoneyline(odds.spread?.home?.close?.odds)
  const puckLineAwayOdds = parseMoneyline(odds.spread?.away?.close?.odds)
  const overUnder = Number(odds.total?.over?.close?.line ?? '0') || 0
  const overOdds = parseMoneyline(odds.total?.over?.close?.odds)
  const underOdds = parseMoneyline(odds.total?.under?.close?.odds)

  if (!homeML && !awayML && !overUnder) return null

  return {
    source: 'espn',
    homeMoneyline: homeML,
    awayMoneyline: awayML,
    puckLine,
    puckLineHomeOdds: puckLineHomeOdds || -110,
    puckLineAwayOdds: puckLineAwayOdds || -110,
    overUnder,
    overOdds: overOdds || -110,
    underOdds: underOdds || -110,
  }
}

async function fetchEspnScoreboard(date: string): Promise<ESPNEvent[]> {
  // seasontype=2 forces regular-season stats year-round (prevents playoff skew)
  const url = `https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/scoreboard?dates=${toEspnDate(date)}&seasontype=2`
  const res = await fetch(url, { headers: ESPN_HEADERS })
  if (!res.ok) throw new Error(`ESPN NHL scoreboard fetch failed: ${res.status}`)
  const data = (await res.json()) as ScoreboardResponse
  return data.events ?? []
}

// ─── Schedule / Slate ─────────────────────────────────────────────────────────

export async function fetchNhlSlate(date: string): Promise<NhlScheduleGame[]> {
  const events = await fetchEspnScoreboard(date)
  const games: NhlScheduleGame[] = []

  for (const event of events) {
    const comp = event.competitions?.[0]
    if (!comp) continue

    const home = comp.competitors?.find((c) => c.homeAway === 'home')
    const away = comp.competitors?.find((c) => c.homeAway === 'away')
    if (!home?.team?.abbreviation || !away?.team?.abbreviation) continue

    const homeAbbr = normalizeAbbr(home.team.abbreviation)
    const awayAbbr = normalizeAbbr(away.team.abbreviation)

    // Only include teams we have baseline data for
    if (!TEAMS[homeAbbr as keyof typeof TEAMS] || !TEAMS[awayAbbr as keyof typeof TEAMS]) continue

    const gameDate = event.date ? new Date(event.date) : new Date()
    const gameDateIso = gameDate.toISOString().slice(0, 10)
    const gameTime = gameDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'America/New_York',
    })

    const lookupKey = buildLookupKey(date, homeAbbr, awayAbbr)
    const espnOdds = parseEspnOdds(comp.odds?.[0])

    games.push({
      homeAbbr,
      awayAbbr,
      gameTime,
      gameDateIso,
      lookupKey,
      espnOdds,
      status: event.status?.type?.name ?? 'scheduled',
    })
  }

  return games
}

// ─── Predictions ──────────────────────────────────────────────────────────────

export async function generateNhlPredictions(dateInput?: string) {
  const date = assertDateInput(dateInput)
  const slate = await fetchNhlSlate(date)

  await saveNhlSlateRows(
    date,
    slate.map((g) => ({
      lookupKey: g.lookupKey,
      awayTeam: g.awayAbbr,
      homeTeam: g.homeAbbr,
      gameTime: new Date(`${g.gameDateIso}T00:00:00Z`),
      gameDateIso: g.gameDateIso,
      context: { gameTime: g.gameTime, espnOdds: g.espnOdds, status: g.status },
    })),
  )

  const oddsRows = slate
    .filter((g) => g.espnOdds)
    .map((g) => ({ lookupKey: g.lookupKey, source: 'espn', odds: g.espnOdds as Record<string, unknown> }))
  await saveNhlMarketOddsSnapshot(date, oddsRows)

  const season = Number(date.slice(0, 4))
  await saveNhlTeamStatSnapshot(date, season, TEAMS as unknown as Record<string, unknown>)

  const predictionRows: NhlAutomationPredictionRow[] = slate
    .filter((g) => g.espnOdds)
    .map((g) => {
      const odds = g.espnOdds!
      const result = predictGame({
        homeTeam: g.homeAbbr,
        awayTeam: g.awayAbbr,
        gameType: 'Regular Season',
        homeB2B: false,
        awayB2B: false,
        liveStats: {},
      })

      const analysis = analyzeBetting(result, odds)

      return {
        date,
        gameTime: g.gameTime,
        awayTeam: g.awayAbbr,
        homeTeam: g.homeAbbr,
        homeGoals: result.hGoals,
        awayGoals: result.aGoals,
        total: result.total,
        otProb: result.otProb,
        homeWinProb: result.hWinProb,
        awayWinProb: result.aWinProb,
        mlRec: analysis.mlValueSide === 'none' ? 'PASS' : `${analysis.mlValueSide.toUpperCase()} ML`,
        mlEdgePct: analysis.mlValuePct,
        puckLineRec: analysis.puckLineRec === 'pass' ? 'PASS' : analysis.puckLineRec.toUpperCase(),
        puckLineEdge: analysis.puckLineEdge,
        ouRec: analysis.ouRec === 'pass' ? 'PASS' : analysis.ouRec.toUpperCase(),
        ouEdge: analysis.ouEdge * 100,
        vegasHomeML: odds.homeMoneyline,
        vegasAwayML: odds.awayMoneyline,
        vegasPuckLine: odds.puckLine,
        vegasPuckLineHomeOdds: odds.puckLineHomeOdds,
        vegasPuckLineAwayOdds: odds.puckLineAwayOdds,
        vegasOU: odds.overUnder,
        overOdds: odds.overOdds,
        underOdds: odds.underOdds,
        isPlayoff: result.isPlayoff,
        lookupKey: g.lookupKey,
      } satisfies NhlAutomationPredictionRow
    })

  const summary = {
    totalGames: slate.length,
    predictedGames: predictionRows.length,
    dbPersisted: isDbConfigured(),
    generatedAt: new Date().toISOString(),
  }

  const run = await createNhlPredictionRun(date, CURRENT_MODEL_VERSION, summary)
  await saveNhlPredictions(run?.id ?? null, date, predictionRows)

  return {
    date,
    modelVersion: CURRENT_MODEL_VERSION,
    runId: run?.id ?? null,
    rows: predictionRows,
  }
}

// ─── Results ──────────────────────────────────────────────────────────────────

export async function ingestNhlResults(dateInput?: string): Promise<NhlResultRow[]> {
  const date = assertDateInput(dateInput)
  const events = await fetchEspnScoreboard(date)
  const results: NhlResultRow[] = []

  for (const event of events) {
    if (!event.status?.type?.completed) continue
    const comp = event.competitions?.[0]
    if (!comp) continue

    const home = comp.competitors?.find((c) => c.homeAway === 'home')
    const away = comp.competitors?.find((c) => c.homeAway === 'away')
    if (!home?.team?.abbreviation || !away?.team?.abbreviation) continue

    const homeAbbr = normalizeAbbr(home.team.abbreviation)
    const awayAbbr = normalizeAbbr(away.team.abbreviation)
    if (!TEAMS[homeAbbr as keyof typeof TEAMS] || !TEAMS[awayAbbr as keyof typeof TEAMS]) continue

    const homeScore = Number(home.score ?? '0')
    const awayScore = Number(away.score ?? '0')
    if (!homeScore && !awayScore) continue

    const lookupKey = buildLookupKey(date, homeAbbr, awayAbbr)
    results.push({ date, home: homeAbbr, away: awayAbbr, homeScore, awayScore, lookupKey })
  }

  await saveNhlResults(
    date,
    results.map((r) => ({
      lookupKey: r.lookupKey,
      awayTeam: r.away,
      homeTeam: r.home,
      awayScore: r.awayScore,
      homeScore: r.homeScore,
    })),
  )

  return results
}

// ─── CSV Export ───────────────────────────────────────────────────────────────

export async function exportNhlPredictionsCsv(args: { date?: string; runId?: string }) {
  const records = await getNhlPredictionsByRunOrDate(args)
  const rows = records.map((r) => r.payload as unknown as NhlAutomationPredictionRow)
  rows.sort((a, b) => (a.gameTime ?? '').localeCompare(b.gameTime ?? ''))

  const csv = buildNhlPredictionsCsv(rows)
  const fileDate = args.date ?? rows[0]?.date ?? new Date().toISOString().slice(0, 10)
  const outputPath = path.resolve(appConfig.exportDir, `nhl-predictions-${fileDate}.csv`)
  await ensureExportDir()
  await writeFile(outputPath, csv, 'utf8')

  if (args.runId) {
    await updateNhlPredictionRunExports(args.runId, { exportPath: outputPath })
  }
  await createNhlPredictionFileRecord({
    date: fileDate,
    path: outputPath,
    source: 'automation-export',
    fileRole: 'export',
    runId: args.runId ?? null,
    metadata: { rowCount: rows.length },
  })

  return { path: outputPath, csv, rowCount: rows.length }
}

export async function exportNhlResultsCsv(dateInput?: string) {
  const date = assertDateInput(dateInput)
  const results = await ingestNhlResults(date)
  const csv = buildNhlResultsCsv(results)
  const outputPath = path.resolve(appConfig.exportDir, `nhl-results-${date}.csv`)
  await ensureExportDir()
  await writeFile(outputPath, csv, 'utf8')
  await createNhlResultFileRecord({
    date,
    path: outputPath,
    source: 'automation-export',
    fileRole: 'export',
    metadata: { rowCount: results.length },
  })
  return { path: outputPath, csv, rowCount: results.length }
}

// ─── Pipeline ─────────────────────────────────────────────────────────────────

export async function runNhlDailyPipeline(dateInput?: string) {
  const date = assertDateInput(dateInput)
  const predictions = await generateNhlPredictions(date)
  const predictionsExport = await exportNhlPredictionsCsv({
    runId: predictions.runId ?? undefined,
    date,
  })
  const resultsDate = subtractOneDay(date)
  const ingestedResults = await ingestNhlResults(resultsDate)
  const resultsExport = await exportNhlResultsCsv(resultsDate)

  return {
    date,
    resultsDate,
    predictionRunId: predictions.runId,
    predictionCount: predictions.rows.length,
    resultsIngested: ingestedResults.length,
    predictionsExportPath: predictionsExport.path,
    resultsExportPath: resultsExport.path,
  }
}

// ─── Evaluation ───────────────────────────────────────────────────────────────

export async function evaluateNhl(dateRange?: { from: string; to: string }) {
  if (!isDbConfigured()) {
    if (appConfig.enableFallbackMode) {
      return { mode: 'fallback', report: { message: 'Database not configured.' } }
    }
    throw new Error('Database-backed evaluation requires DATABASE_URL.')
  }

  const from = assertDateInput(dateRange?.from)
  const to = assertDateInput(dateRange?.to, from)

  const predictionRecords = await getNhlPredictionsByDateRange(from, to)
  const resultRecords = await getNhlResultsByDateRange(from, to)

  const resultsByKey = new Map(resultRecords.map((r) => [r.lookupKey, r]))

  let mlWins = 0, mlLosses = 0, mlBets = 0
  let ouWins = 0, ouLosses = 0, ouBets = 0
  let plWins = 0, plLosses = 0, plBets = 0

  for (const record of predictionRecords) {
    const row = record.payload as unknown as NhlAutomationPredictionRow
    const result = resultsByKey.get(row.lookupKey)
    if (!result?.homeScore || !result?.awayScore) continue

    const homeWon = (result.homeScore ?? 0) > (result.awayScore ?? 0)

    if (row.mlRec !== 'PASS') {
      mlBets++
      const pickedHome = row.mlRec.startsWith('HOME')
      if (pickedHome === homeWon) mlWins++
      else mlLosses++
    }

    const actualTotal = (result.homeScore ?? 0) + (result.awayScore ?? 0)
    if (row.ouRec !== 'PASS') {
      ouBets++
      if (row.ouRec === 'OVER' && actualTotal > row.vegasOU) ouWins++
      else if (row.ouRec === 'UNDER' && actualTotal < row.vegasOU) ouWins++
      else ouLosses++
    }

    if (row.puckLineRec !== 'PASS') {
      plBets++
      const actualMargin = (result.homeScore ?? 0) - (result.awayScore ?? 0)
      const pickedHomeCover = row.puckLineRec.includes('HOME')
      const covered = pickedHomeCover ? actualMargin > 1.5 : actualMargin < -1.5
      if (covered) plWins++
      else plLosses++
    }
  }

  const report = {
    from,
    to,
    totalPredictions: predictionRecords.length,
    totalResults: resultRecords.length,
    ml: { bets: mlBets, wins: mlWins, losses: mlLosses, pct: mlBets ? ((mlWins / mlBets) * 100).toFixed(1) : 'N/A' },
    ou: { bets: ouBets, wins: ouWins, losses: ouLosses, pct: ouBets ? ((ouWins / ouBets) * 100).toFixed(1) : 'N/A' },
    puckLine: { bets: plBets, wins: plWins, losses: plLosses, pct: plBets ? ((plWins / plBets) * 100).toFixed(1) : 'N/A' },
  }

  await saveNhlEvaluationSummary(from, to, {}, report as unknown as Record<string, unknown>, CURRENT_MODEL_VERSION)

  return { mode: 'database', report }
}

// ─── Read Helpers ─────────────────────────────────────────────────────────────

export async function getNhlLatestRuns(limit = 10) {
  const prisma = (await import('../../db/client.js')).getPrismaClient()
  if (!prisma) return []
  return prisma.predictionRun.findMany({
    where: { sport: 'NHL' },
    orderBy: [{ businessDate: 'desc' }, { createdAt: 'desc' }],
    take: limit,
  })
}

export async function getNhlStoredPredictions(args: { runId?: string; date?: string }) {
  const records = await getNhlPredictionsByRunOrDate(args)
  return records.map((r) => r.payload as unknown as NhlAutomationPredictionRow)
}

export async function getNhlStoredResults(from: string, to: string) {
  const rows = await getNhlResultsByDateRange(from, to)
  return rows.map((r) => ({
    lookupKey: r.lookupKey,
    awayTeam: r.awayTeam,
    homeTeam: r.homeTeam,
    awayScore: r.awayScore,
    homeScore: r.homeScore,
    businessDate: r.businessDate,
  }))
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildLookupKey(date: string, homeTeam: string, awayTeam: string) {
  return `${date.replaceAll('-', '')}${homeTeam}${awayTeam}`
}

async function ensureExportDir() {
  await mkdir(path.resolve(appConfig.exportDir), { recursive: true })
}
