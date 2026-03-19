import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { FeatureRow, IceRink, StatBar, TeamCard } from './components'

describe('IceRink', () => {
  it('renders both teams and their win percentages', () => {
    render(
      <IceRink
        hProb={0.625}
        hColor="#0033aa"
        aColor="#cc0000"
        hName="Bruins"
        aName="Canadiens"
      />,
    )

    expect(screen.getByText('62.5%')).toBeInTheDocument()
    expect(screen.getByText('37.5%')).toBeInTheDocument()
    expect(screen.getByText('Bruins (HOME)')).toBeInTheDocument()
    expect(screen.getByText('Canadiens (AWAY)')).toBeInTheDocument()
  })
})

describe('StatBar', () => {
  it('formats percentage values', () => {
    render(
      <StatBar
        label="Power Play"
        hVal={24.4}
        aVal={19.8}
        hColor="#0033aa"
        aColor="#cc0000"
        lo={0}
        hi={40}
        format="pct"
      />,
    )

    expect(screen.getByText('Power Play')).toBeInTheDocument()
    expect(screen.getByText('24.4%')).toBeInTheDocument()
    expect(screen.getByText('19.8%')).toBeInTheDocument()
  })

  it('formats save percentage values', () => {
    render(
      <StatBar
        label="Goalie SV"
        hVal={0.918}
        aVal={0.904}
        hColor="#0033aa"
        aColor="#cc0000"
        lo={0.85}
        hi={0.95}
        format="sv"
      />,
    )

    expect(screen.getByText('Goalie SV')).toBeInTheDocument()
    expect(screen.getByText('.918')).toBeInTheDocument()
    expect(screen.getByText('.904')).toBeInTheDocument()
  })
})

describe('FeatureRow', () => {
  it('renders the label and detail text', () => {
    render(<FeatureRow label="Corsi" detail="54.0% vs 48.0%" good />)

    expect(screen.getByText('Corsi')).toBeInTheDocument()
    expect(screen.getByText('54.0% vs 48.0%')).toBeInTheDocument()
  })
})

describe('TeamCard', () => {
  it('renders team info and live badge when live stats are present', () => {
    render(
      <TeamCard
        abbr="COL"
        side="HOME"
        espnData={{
          COL: {
            color: '#6F263D',
            altColor: '#236192',
            displayName: 'Colorado Avalanche',
          },
        }}
        liveStats={{
          COL: {
            cf: 57,
            ff: 56,
            xgf: 58,
            pdo: 101.2,
            goalieSV: 0.929,
            shootingPct: 11.3,
            ppPct: 26,
            pkPct: 84,
            gf: 3.4,
            ga: 2.1,
            srs: 1.6,
            gp: 12,
            lastUpdated: '2026-03-19T00:00:00Z',
          },
        }}
      />,
    )

    expect(screen.getByText(/HOME/)).toBeInTheDocument()
    expect(screen.getByText('AVALANCHE')).toBeInTheDocument()
    expect(screen.getByText('LIVE')).toBeInTheDocument()
    expect(screen.getByText('Ball Arena')).toBeInTheDocument()
    expect(screen.getByText('High Altitude (DEN)')).toBeInTheDocument()
  })

  it('falls back to team defaults without live data and hides standard-ice badge', () => {
    render(<TeamCard abbr="BOS" side="AWAY" espnData={null} />)

    expect(screen.getByText(/AWAY/)).toBeInTheDocument()
    expect(screen.getByText('BRUINS')).toBeInTheDocument()
    expect(screen.queryByText('LIVE')).not.toBeInTheDocument()
    expect(screen.getByText('TD Garden')).toBeInTheDocument()
    expect(screen.queryByText('Standard NHL Ice')).not.toBeInTheDocument()
  })
})
