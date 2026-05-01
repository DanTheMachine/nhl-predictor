import {
  evaluateNhl,
  exportNhlPredictionsCsv,
  exportNhlResultsCsv,
  fetchNhlSlate,
  generateNhlPredictions,
  getNhlLatestRuns,
  ingestNhlResults,
  runNhlDailyPipeline,
} from './server/services/nhl/nhlAutomation.js'
import { captureOddsOverrides } from './server/services/nhl/oddsCapture.js'
import {
  approveOddsOverrides,
  importBulkOddsOverridesFromFile,
  listOddsOverrides,
  rejectOddsOverrides,
} from './server/services/nhl/oddsOverrides.js'

type CommandHandler = (args: Record<string, string | boolean>) => Promise<unknown>

function parseArgs(argv: string[]) {
  const [command = 'help', ...rest] = argv
  const args: Record<string, string | boolean> = {}

  for (let index = 0; index < rest.length; index += 1) {
    const token = rest[index]
    if (!token?.startsWith('--')) continue
    const key = token.slice(2)
    const next = rest[index + 1]
    if (!next || next.startsWith('--')) {
      args[key] = true
      continue
    }
    args[key] = next
    index += 1
  }

  return { command, args }
}

const commands: Record<string, CommandHandler> = {
  async 'nhl:load-slate'(args) {
    return fetchNhlSlate(toStringArg(args.date) ?? new Date().toISOString().slice(0, 10))
  },
  async 'nhl:run-predictions'(args) {
    return generateNhlPredictions(toStringArg(args.date))
  },
  async 'nhl:run-daily-pipeline'(args) {
    return runNhlDailyPipeline(toStringArg(args.date))
  },
  async 'nhl:export-predictions-csv'(args) {
    return exportNhlPredictionsCsv({
      date: toStringArg(args.date),
      runId: toStringArg(args.runId),
    })
  },
  async 'nhl:ingest-results'(args) {
    return ingestNhlResults(toStringArg(args.date))
  },
  async 'nhl:export-results-csv'(args) {
    return exportNhlResultsCsv(toStringArg(args.date))
  },
  async 'nhl:evaluate'(args) {
    const from = toStringArg(args.from) ?? new Date().toISOString().slice(0, 10)
    const to = toStringArg(args.to) ?? from
    return evaluateNhl({ from, to })
  },
  async 'nhl:list-runs'() {
    return getNhlLatestRuns()
  },
  async 'nhl:capture-odds-overrides'(args) {
    return captureOddsOverrides({
      date: toStringArg(args.date),
      source: toStringArg(args.source),
    })
  },
  async 'nhl:import-odds-overrides'(args) {
    const file = toStringArg(args.file)
    if (!file) throw new Error('--file is required')
    return importBulkOddsOverridesFromFile({
      date: toStringArg(args.date),
      file,
      source: toStringArg(args.source),
    })
  },
  async 'nhl:list-odds-overrides'(args) {
    return listOddsOverrides(toStringArg(args.date))
  },
  async 'nhl:approve-odds-overrides'(args) {
    return approveOddsOverrides({
      date: toStringArg(args.date),
      source: toStringArg(args.source),
      lookupKeys: toStringArg(args.lookupKeys)?.split(','),
    })
  },
  async 'nhl:reject-odds-overrides'(args) {
    return rejectOddsOverrides({
      date: toStringArg(args.date),
      source: toStringArg(args.source),
      lookupKeys: toStringArg(args.lookupKeys)?.split(','),
    })
  },
}

async function main() {
  const { command, args } = parseArgs(process.argv.slice(2))
  const handler = commands[command]

  if (!handler) {
    console.log(
      [
        'Available commands:',
        '  nhl:load-slate                --date YYYY-MM-DD',
        '  nhl:run-predictions           --date YYYY-MM-DD',
        '  nhl:run-daily-pipeline        --date YYYY-MM-DD',
        '  nhl:export-predictions-csv    --date YYYY-MM-DD [--runId RUN_ID]',
        '  nhl:ingest-results            --date YYYY-MM-DD',
        '  nhl:export-results-csv        --date YYYY-MM-DD',
        '  nhl:evaluate                  --from YYYY-MM-DD --to YYYY-MM-DD',
        '  nhl:list-runs',
        '  nhl:capture-odds-overrides    --date YYYY-MM-DD [--source LABEL]',
        '  nhl:import-odds-overrides     --date YYYY-MM-DD --file PATH [--source LABEL]',
        '  nhl:list-odds-overrides       --date YYYY-MM-DD',
        '  nhl:approve-odds-overrides    --date YYYY-MM-DD [--source LABEL] [--lookupKeys KEY1,KEY2]',
        '  nhl:reject-odds-overrides     --date YYYY-MM-DD [--source LABEL] [--lookupKeys KEY1,KEY2]',
      ].join('\n'),
    )
    process.exitCode = command === 'help' ? 0 : 1
    return
  }

  try {
    const result = await handler(args)
    console.log(JSON.stringify(result, null, 2))
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'Command failed.')
    process.exitCode = 1
  }
}

function toStringArg(value: string | boolean | undefined) {
  return typeof value === 'string' ? value : undefined
}

void main()
