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
    await expect(page.getByText('PLAYOFF MODE')).toBeVisible()
    await expect(page.getByText('PROJECTED GOALS')).toBeVisible()
    await expect(page.getByText('MODEL INPUTS')).toBeVisible()
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
    await expect(page.getByTestId('betting-analysis')).toContainText('MONEYLINE VALUE')

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByTestId('export-single-game-button').click(),
    ])

    expect(download.suggestedFilename()).toContain('.csv')
    expect(download.suggestedFilename()).toContain('vs')
  })
})

