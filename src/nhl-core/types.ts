export interface TeamData {
  name: string;
  color: string;
  alt: string;
  div: string;
  conf: string;
  cf: number;
  ff: number;
  xgf: number;
  pdo: number;
  goalieSV: number;
  shootingPct: number;
  ppPct: number;
  pkPct: number;
  gf: number;
  ga: number;
  srs: number;
  arena: string;
  capacity: number;
  ice: IceType;
}

export type IceType = "standard" | "altitude" | "hybrid";

export interface IceCondition {
  label: string;
  scoringAdj: number;
  ppAdj: number;
}

export interface GoalieInfo {
  name: string;
  sv: number;
  gp: number;
}

export interface LiveTeamStats {
  cf: number;
  ff: number;
  xgf: number;
  pdo: number;
  goalieSV: number;
  shootingPct: number;
  ppPct: number;
  pkPct: number;
  gf: number;
  ga: number;
  srs: number;
  gp: number;
  lastUpdated: string;
}

export interface PredictInput {
  homeTeam: string;
  awayTeam: string;
  gameType: string;
  homeB2B: boolean;
  awayB2B: boolean;
  liveStats?: Record<string, LiveTeamStats>;
  homeSVOverride?: number | null;
  awaySVOverride?: number | null;
}

export interface Feature {
  label: string;
  detail: string;
  good: boolean;
}

export interface PredictResult {
  hWinProb: number;
  aWinProb: number;
  hGoals: string;
  aGoals: string;
  total: string;
  otProb: number;
  goalieEdge: string;
  hPDOLuck: string;
  aPDOLuck: string;
  isPlayoff: boolean;
  features: Feature[];
}

export interface EspnTeamData {
  color: string;
  altColor: string;
  displayName: string;
}

export type EspnMap = Record<string, EspnTeamData>;

export interface OddsData {
  source: "espn" | "manual";
  homeMoneyline: number;
  awayMoneyline: number;
  puckLine: number;
  puckLineHomeOdds: number;
  puckLineAwayOdds: number;
  overUnder: number;
  overOdds: number;
  underOdds: number;
}

export interface BettingAnalysis {
  homeImpliedProb: number;
  awayImpliedProb: number;
  homeEdge: number;
  awayEdge: number;
  mlValueSide: "home" | "away" | "none";
  mlValuePct: number;
  puckLineRec: "home -1.5" | "home +1.5" | "away -1.5" | "away +1.5" | "pass";
  puckLineEdge: number;
  ouRec: "over" | "under" | "pass";
  ouEdge: number;
  kellyHome: number;
  kellyAway: number;
}

export interface ScheduleGame {
  homeAbbr: string;
  awayAbbr: string;
  gameTime: string;
  tvInfo: string;
}

export interface LinesRow {
  game: ScheduleGame;
  espnOdds: OddsData | null;
  editedOdds: OddsData | null;
  simResult: PredictResult | null;
  isEditing: boolean;
  homeB2B: boolean;
  awayB2B: boolean;
  homeSVOverride: number | null;
  awaySVOverride: number | null;
}

export interface ExportRow {
  date: string;
  gameTime: string;
  home: string;
  away: string;
  homeWinProb: string;
  awayWinProb: string;
  homeGoals: string;
  awayGoals: string;
  total: string;
  vegaOU: string;
  ouRec: string;
  ouEdge: string;
  homeML: string;
  awayML: string;
  vegaHomeML: string;
  vegaAwayML: string;
  vegaPuckLine: string;
  vegaPuckLineHomeOdds: string;
  vegaPuckLineAwayOdds: string;
  vegaOverOdds: string;
  vegaUnderOdds: string;
  homeEdgePct: string;
  awayEdgePct: string;
  mlValueSide: string;
  mlKelly: string;
  puckLineRec: string;
  puckLineEdge: string;
  homeCorsi: string;
  awayCorsi: string;
  homeXGF: string;
  awayXGF: string;
  homeSV: string;
  awaySV: string;
  homeSVOverrideExport: string;
  awaySVOverrideExport: string;
  homePP: string;
  awayPP: string;
  homePK: string;
  awayPK: string;
  homePDO: string;
  awayPDO: string;
  oddsSource: string;
  lookupKey: string;
}
