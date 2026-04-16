import { expect, test } from '@playwright/test'

test.describe('NHL Predictor', () => {
  test('runs a playoff simulation for a selected matchup', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('single-game-toggle').click()

    await page.getByTestId('home-team-select').selectOption('COL')
    await page.getByTestId('away-team-select').selectOption('DAL')
    await page.getByTestId('game-type-select').selectOption('Stanley Cup Final')
    await page.getByTestId('run-simulation-button').click()

    await expect(page.getByTestId('simulation-results')).toBeVisible()
    await expect(page.getByText('Playoff Mode')).toBeVisible()
    await expect(page.getByText('Projected Goals')).toBeVisible()
    await expect(page.getByText('Model Inputs')).toBeVisible()
  })

  test('navigates to the Model Eval tab and back', async ({ page }) => {
    await page.goto('/')

    // The header renders two tab buttons: "Predictor" and "Model Eval"
    const evalTab = page.getByRole('button', { name: 'Model Eval' })
    await expect(evalTab).toBeVisible()
    await evalTab.click()

    // The Evaluation panel should become visible (heading rendered as "MODEL EVALUATION")
    await expect(page.getByText('MODEL EVALUATION')).toBeVisible()

    // Navigate back to the Predictor tab
    await page.getByRole('button', { name: 'Predictor' }).click()

    // Single-game toggle should be present again
    await expect(page.getByTestId('single-game-toggle')).toBeVisible()
  })

  test('applies manual odds and exports a single-game CSV', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('single-game-toggle').click()

    await page.getByTestId('home-team-select').selectOption('COL')
    await page.getByTestId('away-team-select').selectOption('CHI')
    await page.getByTestId('run-simulation-button').click()
    await expect(page.getByTestId('simulation-results')).toBeVisible()

    await page.getByTestId('manual-odds-button').click()
    await page.getByTestId('manual-puck-line-home-favorite').click()
    await page.getByTestId('manual-odds-homeMoneyline').fill('-150')
    await page.getByTestId('manual-odds-awayMoneyline').fill('+135')
    await page.getByTestId('manual-odds-overUnder').fill('5.5')
    await page.getByTestId('manual-odds-puckLineHomeOdds').fill('+145')
    await page.getByTestId('manual-odds-puckLineAwayOdds').fill('-175')
    await page.getByTestId('manual-odds-overOdds').fill('-110')
    await page.getByTestId('apply-manual-odds-button').click()

    await expect(page.getByTestId('odds-status')).toContainText('Manual lines applied')
    await expect(page.getByTestId('betting-analysis')).toBeVisible()
    await expect(page.getByTestId('betting-analysis')).toContainText('Moneyline Value')

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByTestId('export-single-game-button').click(),
    ])

    expect(download.suggestedFilename()).toContain('.csv')
    expect(download.suggestedFilename()).toContain('vs')
  })
})

