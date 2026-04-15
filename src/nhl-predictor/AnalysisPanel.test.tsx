import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { LinesRow } from "../nhl-core/types";
import { AnalysisPanel } from "./AnalysisPanel";
import { analyzeBetting } from "./engine";

describe("AnalysisPanel", () => {
  it("keeps O/U edge percentages consistent between game cards and best bets", () => {
    const row: LinesRow = {
      game: {
        homeAbbr: "BOS",
        awayAbbr: "TOR",
        gameTime: "7:00 PM ET",
        tvInfo: "ESPN",
      },
      espnOdds: null,
      editedOdds: {
        source: "manual",
        homeMoneyline: -120,
        awayMoneyline: 100,
        puckLine: -1.5,
        puckLineHomeOdds: 165,
        puckLineAwayOdds: -185,
        overUnder: 5.5,
        overOdds: -110,
        underOdds: -110,
      },
      simResult: {
        hWinProb: 0.54,
        aWinProb: 0.46,
        hGoals: "3.30",
        aGoals: "3.00",
        total: "6.30",
        otProb: 0.18,
        goalieEdge: "+2.0 SV pts",
        hPDOLuck: "Running hot",
        aPDOLuck: "Running hot",
        isPlayoff: false,
        features: [],
      },
      isEditing: false,
      homeB2B: false,
      awayB2B: false,
      homeSVOverride: null,
      awaySVOverride: null,
    };
    const linesRows: LinesRow[] = [row];
    const expectedEdgePct = (Math.abs(analyzeBetting(row.simResult!, row.editedOdds!).ouEdge) * 100).toFixed(1);

    render(<AnalysisPanel linesRows={linesRows} resultsStatus="" resultsRunning={false} />);

    expect(screen.getAllByText(`OVER +${expectedEdgePct}%`).length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText(`+${expectedEdgePct}%`)).toBeInTheDocument();
    expect(screen.getByText("STRONG")).toBeInTheDocument();
  });

  it("uses a stricter strong threshold for moneyline bets", () => {
    const row: LinesRow = {
      game: {
        homeAbbr: "BOS",
        awayAbbr: "TOR",
        gameTime: "7:00 PM ET",
        tvInfo: "ESPN",
      },
      espnOdds: null,
      editedOdds: {
        source: "manual",
        homeMoneyline: -115,
        awayMoneyline: -105,
        puckLine: -1.5,
        puckLineHomeOdds: 165,
        puckLineAwayOdds: -185,
        overUnder: 5.5,
        overOdds: -110,
        underOdds: -110,
      },
      simResult: {
        hWinProb: 0.61,
        aWinProb: 0.39,
        hGoals: "3.10",
        aGoals: "2.30",
        total: "5.40",
        otProb: 0.18,
        goalieEdge: "+2.0 SV pts",
        hPDOLuck: "Running hot",
        aPDOLuck: "Running cold",
        isPlayoff: false,
        features: [],
      },
      isEditing: false,
      homeB2B: false,
      awayB2B: false,
      homeSVOverride: null,
      awaySVOverride: null,
    };

    render(<AnalysisPanel linesRows={[row]} resultsStatus="" resultsRunning={false} />);

    expect(screen.getAllByText("MED").length).toBeGreaterThan(0);
    expect(screen.queryByText("STRONG")).not.toBeInTheDocument();
  });

  it("shows edited Vegas labels when odds were pasted or manually changed", () => {
    const row: LinesRow = {
      game: {
        homeAbbr: "DAL",
        awayAbbr: "COL",
        gameTime: "8:00 PM ET",
        tvInfo: "ESPN",
      },
      espnOdds: {
        source: "espn",
        homeMoneyline: -110,
        awayMoneyline: -110,
        puckLine: -1.5,
        puckLineHomeOdds: 150,
        puckLineAwayOdds: -170,
        overUnder: 6.0,
        overOdds: -110,
        underOdds: -110,
      },
      editedOdds: {
        source: "manual",
        homeMoneyline: 100,
        awayMoneyline: -120,
        puckLine: -1.5,
        puckLineHomeOdds: 160,
        puckLineAwayOdds: -180,
        overUnder: 6.5,
        overOdds: -105,
        underOdds: -115,
      },
      simResult: {
        hWinProb: 0.272,
        aWinProb: 0.728,
        hGoals: "2.40",
        aGoals: "3.60",
        total: "6.00",
        otProb: 0.17,
        goalieEdge: "+1.5 SV pts",
        hPDOLuck: "Running cold",
        aPDOLuck: "Running hot",
        isPlayoff: false,
        features: [],
      },
      isEditing: false,
      homeB2B: false,
      awayB2B: false,
      homeSVOverride: null,
      awaySVOverride: null,
    };

    render(<AnalysisPanel linesRows={[row]} resultsStatus="" resultsRunning={false} />);

    expect(screen.getAllByText("Vegas (Edited)")).toHaveLength(3);
    expect(screen.queryByText("Vegas line")).not.toBeInTheDocument();
  });
});
