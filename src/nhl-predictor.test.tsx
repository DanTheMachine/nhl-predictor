import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import NHLPredictor from "./nhl-predictor";

const mockController = vi.hoisted(() => ({
  homeTeam: "BOS",
  setHomeTeam: vi.fn(),
  awayTeam: "TOR",
  setAwayTeam: vi.fn(),
  gameType: "Regular Season",
  setGameType: vi.fn(),
  homeB2B: false,
  setHomeB2B: vi.fn(),
  awayB2B: false,
  setAwayB2B: vi.fn(),
  result: null,
  setResult: vi.fn(),
  espnData: null,
  dataSource: "estimated" as const,
  fetchStatus: "",
  fetchError: "",
  liveStats: {},
  setLiveStats: vi.fn(),
  statsLastUpdated: "",
  setStatsLastUpdated: vi.fn(),
  nstPaste: "",
  setNstPaste: vi.fn(),
  nstStatus: "",
  setNstStatus: vi.fn(),
  showNstPanel: false,
  setShowNstPanel: vi.fn(),
  divFilter: "ALL",
  setDivFilter: vi.fn(),
  running: false,
  simCount: 0,
  odds: null,
  setOdds: vi.fn(),
  oddsSource: "none" as const,
  setOddsSource: vi.fn(),
  oddsStatus: "",
  setOddsStatus: vi.fn(),
  manualOdds: {
    homeMoneyline: "-160",
    awayMoneyline: "+135",
    homePuckLine: "-1.5",
    puckLineHomeOdds: "+145",
    puckLineAwayOdds: "-175",
    overUnder: "5.5",
    overOdds: "-110",
    underOdds: "-110",
  },
  setManualOdds: vi.fn(),
  linesRows: [],
  setLinesRows: vi.fn(),
  scheduleStatus: "",
  scheduleLoading: false,
  simsRunning: false,
  exportRunning: false,
  resultsRunning: false,
  goalieRoster: {},
  goalieLoading: false,
  resultsStatus: "",
  showLinesTable: false,
  showBulkPaste: false,
  setShowBulkPaste: vi.fn(),
  bulkPasteText: "",
  setBulkPasteText: vi.fn(),
  bulkPasteStatus: "",
  setBulkPasteStatus: vi.fn(),
  parseNSTData: vi.fn(),
  handleFetch: vi.fn(),
  runSim: vi.fn(),
  handleFetchOdds: vi.fn(),
  applyManualOdds: vi.fn(),
  fetchGoalieRoster: vi.fn(),
  fetchYesterdayResults: vi.fn(),
  handleLoadSchedule: vi.fn(),
  updateLinesField: vi.fn(),
  toggleEditing: vi.fn(),
  handleRunOneSim: vi.fn(),
  handleBulkPaste: vi.fn(),
  handleRunAllSims: vi.fn(),
  exportSingleGame: vi.fn(),
  handleExport: vi.fn(),
  hColor: "#FFB81C",
  aColor: "#00205B",
  hTeam: {
    name: "Bruins",
    color: "#FFB81C",
    alt: "#000000",
    div: "Atlantic",
    conf: "East",
    cf: 48.95,
    ff: 49.16,
    xgf: 46.36,
    pdo: 101.9,
    goalieSV: 0.9145,
    shootingPct: 10.49,
    ppPct: 25.6,
    pkPct: 77.2,
    gf: 2.2,
    ga: 1.85,
    srs: 0.35,
    arena: "TD Garden",
    capacity: 17850,
    ice: "hybrid" as const,
  },
  aTeam: {
    name: "Maple Leafs",
    color: "#00205B",
    alt: "#FFFFFF",
    div: "Atlantic",
    conf: "East",
    cf: 45.59,
    ff: 46.18,
    xgf: 47.58,
    pdo: 100.2,
    goalieSV: 0.8989,
    shootingPct: 10.28,
    ppPct: 19.7,
    pkPct: 83.0,
    gf: 2.19,
    ga: 2.52,
    srs: -0.33,
    arena: "Scotiabank Arena",
    capacity: 18819,
    ice: "standard" as const,
  },
}));

vi.mock("./nhl-predictor/useNhlPredictorController", () => ({
  useNhlPredictorController: () => mockController,
}));

vi.mock("./nhl-predictor/SchedulePanel", () => ({
  SchedulePanel: () => <div>Schedule Panel</div>,
}));

vi.mock("./nhl-predictor/AnalysisPanel", () => ({
  AnalysisPanel: () => <div>Analysis Panel</div>,
}));

vi.mock("./nhl-predictor/SingleGameResults", () => ({
  SingleGameResults: () => <div>Single Game Results</div>,
}));

vi.mock("./nhl-predictor/EvaluationPanel", () => ({
  EvaluationPanel: () => <div>Evaluation Panel</div>,
}));

describe("NHLPredictor navigation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("switches between Predictor and Model Eval tabs", async () => {
    const user = userEvent.setup();
    render(<NHLPredictor />);

    expect(screen.getByText("Schedule Panel")).toBeInTheDocument();
    expect(screen.queryByText("Evaluation Panel")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Model Eval" }));

    expect(screen.getByText("Evaluation Panel")).toBeInTheDocument();
    expect(screen.queryByText("Schedule Panel")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Predictor" }));

    expect(screen.getByText("Schedule Panel")).toBeInTheDocument();
    expect(screen.queryByText("Evaluation Panel")).not.toBeInTheDocument();
  });
});

describe("single game tools collapse", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("is closed by default and reveals the full single-game setup when opened", async () => {
    const user = userEvent.setup();
    render(<NHLPredictor />);

    expect(screen.getByRole("button", { name: "OPEN SINGLE GAME" })).toBeInTheDocument();
    expect(screen.queryByText("RUN SIMULATION")).not.toBeInTheDocument();
    expect(screen.queryByText("FILTER BY DIVISION")).not.toBeInTheDocument();
    expect(screen.queryByText("ADVANCED STATS COMPARISON")).not.toBeInTheDocument();
    expect(screen.queryByText("GAME TYPE")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "OPEN SINGLE GAME" }));

    expect(screen.getByRole("button", { name: "HIDE SINGLE GAME" })).toBeInTheDocument();
    expect(screen.getByText("RUN SIMULATION")).toBeInTheDocument();
    expect(screen.getByText("FILTER BY DIVISION")).toBeInTheDocument();
    expect(screen.getByText("ADVANCED STATS COMPARISON")).toBeInTheDocument();
    expect(screen.getByText("GAME TYPE")).toBeInTheDocument();
    expect(screen.getByText("LIVE ODDS / LINES")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "HIDE SINGLE GAME" }));

    expect(screen.queryByText("RUN SIMULATION")).not.toBeInTheDocument();
    expect(screen.queryByText("FILTER BY DIVISION")).not.toBeInTheDocument();
    expect(screen.queryByText("ADVANCED STATS COMPARISON")).not.toBeInTheDocument();
    expect(screen.queryByText("GAME TYPE")).not.toBeInTheDocument();
  });
});
