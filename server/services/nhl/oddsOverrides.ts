import { readFile } from 'node:fs/promises'

import { parseBulkOdds } from '../../../src/nhl-predictor/bulkOddsParser.js'
import type { OddsData } from '../../../src/nhl-core/types.js'
import { assertDateInput } from '../../config.js'
import {
  listNhlOddsOverridesByDate,
  saveNhlOddsOverrides,
  updateNhlOddsOverrideStatus,
} from '../../db/repositories.js'

export type PersistedOddsOverride = {
  date: string
  lookupKey: string
  awayTeam: string
  homeTeam: string
  source: string
  status: string
  odds: OddsData
  metadata?: Record<string, unknown> | null
}

export type ImportResult = {
  date: string
  source: string
  importedCount: number
  lookupKeys: string[]
}

export type StatusResult = {
  date: string
  source: string | null
  status: string
  updatedCount: number
  lookupKeys: string[]
}

export async function importBulkOddsOverridesFromFile(args: { date?: string; file: string; source?: string }): Promise<ImportResult> {
  const date = assertDateInput(args.date)
  const source = (args.source ?? 'manual-paste').trim() || 'manual-paste'
  const raw = await readFile(args.file, 'utf8')
  return importBulkOddsOverrides({ date, raw, source, metadata: { file: args.file } })
}

export async function importBulkOddsOverrides(args: {
  date: string
  raw: string
  source?: string
  metadata?: Record<string, unknown>
}): Promise<ImportResult> {
  const date = assertDateInput(args.date)
  const source = (args.source ?? 'manual-paste').trim() || 'manual-paste'
  const parsed = parseBulkOdds(args.raw)

  const matchupCounts = new Map<string, number>()
  const rows = parsed.map((game) => {
    const baseKey = buildLookupKey(date, game.homeAbbr, game.awayAbbr)
    const count = (matchupCounts.get(baseKey) ?? 0) + 1
    matchupCounts.set(baseKey, count)
    const lookupKey = count === 1 ? baseKey : `${baseKey}_${count}`
    return {
      lookupKey,
      awayTeam: game.awayAbbr,
      homeTeam: game.homeAbbr,
      source,
      status: 'staged' as const,
      odds: game.odds,
      metadata: { ...(args.metadata ?? {}), ...(game.gameTime ? { gameTime: game.gameTime } : {}) },
    }
  })

  await saveNhlOddsOverrides(date, rows)

  return {
    date,
    source,
    importedCount: rows.length,
    lookupKeys: rows.map((row) => row.lookupKey),
  }
}

export async function listOddsOverrides(dateInput?: string): Promise<PersistedOddsOverride[]> {
  const date = assertDateInput(dateInput)
  const rows = await listNhlOddsOverridesByDate(date)
  return rows.map((row) => ({
    date,
    lookupKey: row.lookupKey,
    awayTeam: row.awayTeam,
    homeTeam: row.homeTeam,
    source: row.source,
    status: row.status,
    odds: row.odds as unknown as OddsData,
    metadata: row.metadata as Record<string, unknown> | null,
  }))
}

export async function approveOddsOverrides(args: { date?: string; source?: string; lookupKeys?: string[] }): Promise<StatusResult> {
  return setOddsOverrideStatus({ ...args, status: 'approved' })
}

export async function rejectOddsOverrides(args: { date?: string; source?: string; lookupKeys?: string[] }): Promise<StatusResult> {
  return setOddsOverrideStatus({ ...args, status: 'rejected' })
}

function buildLookupKey(date: string, homeTeam: string, awayTeam: string) {
  return `${date.replaceAll('-', '')}${homeTeam}${awayTeam}`
}

async function setOddsOverrideStatus(args: {
  date?: string
  source?: string
  lookupKeys?: string[]
  status: 'approved' | 'rejected'
}): Promise<StatusResult> {
  const date = assertDateInput(args.date)
  const lookupKeys = (args.lookupKeys ?? []).map((value) => value.trim()).filter(Boolean)
  const result = await updateNhlOddsOverrideStatus({
    date,
    source: args.source,
    lookupKeys,
    status: args.status,
  })

  return {
    date,
    source: args.source ?? null,
    status: args.status,
    updatedCount: result.count,
    lookupKeys,
  }
}
