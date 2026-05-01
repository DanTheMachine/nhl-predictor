import express from 'express'

import { appConfig, assertDateInput } from './server/config.js'
import {
  evaluateNhl,
  exportNhlPredictionsCsv,
  exportNhlResultsCsv,
  generateNhlPredictions,
  getNhlLatestRuns,
  getNhlStoredPredictions,
  getNhlStoredResults,
  ingestNhlResults,
  runNhlDailyPipeline,
} from './server/services/nhl/nhlAutomation.js'

const app = express()
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.header('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') {
    res.sendStatus(204)
    return
  }
  next()
})
app.use(express.json())

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'nhl-automation-api' })
})

app.get('/api/nhl/runs/latest', async (req, res) => {
  try {
    const limit = Number.parseInt(String(req.query.limit ?? '10'), 10)
    res.json(await getNhlLatestRuns(Number.isFinite(limit) ? limit : 10))
  } catch (error) {
    res.status(500).json({ ok: false, error: error instanceof Error ? error.message : 'Failed to load runs.' })
  }
})

app.get('/api/nhl/predictions', async (req, res) => {
  try {
    const runId = typeof req.query.runId === 'string' ? req.query.runId : undefined
    const date = typeof req.query.date === 'string' ? assertDateInput(req.query.date) : undefined
    res.json(await getNhlStoredPredictions({ runId, date }))
  } catch (error) {
    res.status(400).json({ ok: false, error: error instanceof Error ? error.message : 'Failed to load predictions.' })
  }
})

app.get('/api/nhl/results', async (req, res) => {
  try {
    const from = assertDateInput(typeof req.query.from === 'string' ? req.query.from : undefined)
    const to = assertDateInput(typeof req.query.to === 'string' ? req.query.to : from, from)
    res.json(await getNhlStoredResults(from, to))
  } catch (error) {
    res.status(400).json({ ok: false, error: error instanceof Error ? error.message : 'Failed to load results.' })
  }
})

app.get('/api/nhl/evaluation', async (req, res) => {
  try {
    const from = assertDateInput(typeof req.query.from === 'string' ? req.query.from : undefined)
    const to = assertDateInput(typeof req.query.to === 'string' ? req.query.to : from, from)
    res.json(await evaluateNhl({ from, to }))
  } catch (error) {
    res.status(400).json({ ok: false, error: error instanceof Error ? error.message : 'Failed to evaluate.' })
  }
})

app.post('/api/nhl/predictions/run', async (req, res) => {
  try {
    const date = assertDateInput(typeof req.body?.date === 'string' ? req.body.date : undefined)
    res.json(await generateNhlPredictions(date))
  } catch (error) {
    res.status(400).json({ ok: false, error: error instanceof Error ? error.message : 'Prediction run failed.' })
  }
})

app.post('/api/nhl/pipeline/run', async (req, res) => {
  try {
    const date = assertDateInput(typeof req.body?.date === 'string' ? req.body.date : undefined)
    res.json(await runNhlDailyPipeline(date))
  } catch (error) {
    res.status(400).json({ ok: false, error: error instanceof Error ? error.message : 'Daily pipeline run failed.' })
  }
})

app.post('/api/nhl/results/ingest', async (req, res) => {
  try {
    const date = assertDateInput(typeof req.body?.date === 'string' ? req.body.date : undefined)
    res.json(await ingestNhlResults(date))
  } catch (error) {
    res.status(400).json({ ok: false, error: error instanceof Error ? error.message : 'Result ingestion failed.' })
  }
})

app.get('/api/nhl/exports/predictions', async (req, res) => {
  try {
    const runId = typeof req.query.runId === 'string' ? req.query.runId : undefined
    const date = typeof req.query.date === 'string' ? assertDateInput(req.query.date) : undefined
    const result = await exportNhlPredictionsCsv({ runId, date })
    res.type('text/csv').send(result.csv)
  } catch (error) {
    res.status(400).json({ ok: false, error: error instanceof Error ? error.message : 'Prediction export failed.' })
  }
})

app.get('/api/nhl/exports/results', async (req, res) => {
  try {
    const date = assertDateInput(typeof req.query.date === 'string' ? req.query.date : undefined)
    const result = await exportNhlResultsCsv(date)
    res.type('text/csv').send(result.csv)
  } catch (error) {
    res.status(400).json({ ok: false, error: error instanceof Error ? error.message : 'Results export failed.' })
  }
})

app.listen(appConfig.apiPort, () => {
  console.log(`NHL automation API listening on port ${appConfig.apiPort}`)
})
