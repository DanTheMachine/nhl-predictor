import { describe, expect, it } from "vitest";

import {
  evaluatePredictionResults,
  parsePredictionCsv,
  parseResultsCsv,
} from "./evaluation";

const predictionsCsv = `"Date","Game Time","Home","Away","Home Win %","Away Win %","Home Goals","Away Goals","Model Total","Vegas O/U","O/U Rec","O/U Edge","Home ML (Model)","Away ML (Model)","Vegas Home ML","Vegas Away ML","Vegas Puck Line","Home PL Odds","Away PL Odds","Over Odds","Under Odds","Home ML Edge","Away ML Edge","ML Value Side","ML Kelly %","Puck Line Rec","Puck Line Edge","Home CF%","Away CF%","Home xGF%","Away xGF%","Home SV%","Away SV%","Home Goalie Override","Away Goalie Override","Home PP%","Away PP%","Home PK%","Away PK%","Home PDO","Away PDO","Odds Source","LookupKey"
"03/19/2026","7:00 PM ET","COL Avalanche","CHI Blackhawks","60.0%","40.0%","3.20","2.10","5.30","5.5","UNDER","-4.8%","-150","+150","-110","+100","-1.5","+130","-150","-110","-110","+7.5%","-7.5%","HOME ML","3.1%","HOME -1.5","+4.5%","56.4%","45.0%","55.8%","44.2%",".926",".903","-","-","25.5%","18.0%","83.0%","76.0%","101.3","98.7","ESPN","20260319COLCHI"
"03/19/2026","8:00 PM ET","BOS Bruins","TOR Maple Leafs","54.0%","46.0%","3.10","2.80","5.90","6.0","OVER","+6.2%","-117","+117","+105","-125","+1.5","-165","+145","-105","-115","+5.2%","-5.2%","HOME ML","2.2%","PASS","-","49.0%","45.6%","46.4%","47.6%",".914",".899","-","-","25.6%","19.7%","77.2%","83.0%","101.9","100.2","ESPN","20260319BOSTOR"`;

const resultsCsv = `"Date","Home","Away","Home Goals","Away Goals","Winner","Total","LookupKey"
"03-19-2026","COL","CHI","4","2","COL","6","20260319COLCHI"
"03-19-2026","BOS","TOR","2","5","TOR","7","20260319BOSTOR"`;

const mergedSpreadsheetCsv = `,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,51-42,52-24,46-31,23-20,1-1,2-4
Date,Game Time,Home,Away,Home Win %,Away Win %,Home Goals,Away Goals,Model Total,Vegas O/U,O/U Rec,O/U Edge,Home ML (Model),Away ML (Model),Vegas Home ML,Vegas Away ML,Vegas Puck Line,Home PL Odds,Away PL Odds,Over Odds,Under Odds,Home ML Edge,Away ML Edge,ML Value Side,ML Kelly %,Puck Line Rec,Puck Line Edge,Home CF%,Away CF%,Home xGF%,Away xGF%,Home SV%,Away SV%,Home Goalie Override,Away Goalie Override,Home PP%,Away PP%,Home PK%,Away PK%,Home PDO,Away PDO,Odds Source,LookupKey,Actual Home Goals,Actual Away Goals,Actual Winner,Actual Total,ML Hit,O/U Hit,PL,ML Bet,O/U Bet,PL Bet
03/19/2026,7:00 PM EDT,OTT Senators,NYI Islanders,60.3%,39.7%,3.08,2.44,5.52,6.0,UNDER,-5.1%,-152,+152,-125,+115,,,,,,+5.9%,-5.9%,HOME ML,3.2%,HOME -1.5,+7.4%,53.0%,48.1%,54.5%,46.3%,.891,.917,,,23.7%,16.0%,72.4%,81.1%,99.2,100.6,ESPN,20260319OTTNYI,3,2,OTT,5,1,1,0,,,
03/20/2026,7:00 PM EDT,TOR Maple Leafs,CAR Hurricanes,18.0%,82.0%,2.28,3.71,5.99,6.0,PASS,-0.4%,+456,-456,+185,-205,+1.0,-140,+130,-115,+105,-16.3%,+16.3%,AWAY ML,11.9%,AWAY -1.5,+7.2%,45.6%,59.8%,47.6%,55.5%,.899,.901,,,19.7%,22.6%,83.0%,80.0%,100.2,99.1,ESPN,20260320TORCAR,,,,,,,,,,x`;

const weightedBetSpreadsheetCsv = `Date,Game Time,Home,Away,Home Win %,Away Win %,Home Goals,Away Goals,Model Total,Vegas O/U,O/U Rec,O/U Edge,Home ML (Model),Away ML (Model),Vegas Home ML,Vegas Away ML,Vegas Puck Line,Home PL Odds,Away PL Odds,Over Odds,Under Odds,Home ML Edge,Away ML Edge,ML Value Side,ML Kelly %,Puck Line Rec,Puck Line Edge,Home CF%,Away CF%,Home xGF%,Away xGF%,Home SV%,Away SV%,Home Goalie Override,Away Goalie Override,Home PP%,Away PP%,Home PK%,Away PK%,Home PDO,Away PDO,Odds Source,LookupKey,Actual Home Goals,Actual Away Goals,Actual Winner,Actual Total,ML Hit,O/U Hit,PL,ML Bet,O/U Bet,PL Bet
03/19/2026,7:00 PM ET,COL Avalanche,CHI Blackhawks,60.0%,40.0%,3.20,2.10,5.30,5.5,UNDER,-4.8%,-150,+150,-110,+100,-1.5,+130,-150,-110,-110,+7.5%,-7.5%,HOME ML,3.1%,HOME -1.5,+4.5%,56.4%,45.0%,55.8%,44.2%,.926,.903,-,-,25.5%,18.0%,83.0%,76.0%,101.3,98.7,ESPN,20260319COLCHI,4,2,COL,6,1,0,1,2,1.5,
03/19/2026,8:00 PM ET,BOS Bruins,TOR Maple Leafs,54.0%,46.0%,3.10,2.80,5.90,6.0,OVER,+6.2%,-117,+117,+105,-125,+1.5,-165,+145,-105,-115,+5.2%,-5.2%,HOME ML,2.2%,PASS,-,49.0%,45.6%,46.4%,47.6%,.914,.899,-,-,25.6%,19.7%,77.2%,83.0%,101.9,100.2,ESPN,20260319BOSTOR,2,5,TOR,7,0,1,0,,,`;

describe("CSV evaluation parsing", () => {
  it("parses prediction and results rows from exported CSV text", () => {
    const predictions = parsePredictionCsv(predictionsCsv);
    const results = parseResultsCsv(resultsCsv);

    expect(predictions).toHaveLength(2);
    expect(predictions[0].vegaPuckLineHomeOdds).toBe(130);
    expect(predictions[1].ouRec).toBe("over");
    expect(results).toHaveLength(2);
    expect(results[0].winner).toBe("COL");
  });

  it("parses merged spreadsheet exports with prepended summary rows and appended actuals", () => {
    const predictions = parsePredictionCsv(mergedSpreadsheetCsv);
    const results = parseResultsCsv(mergedSpreadsheetCsv);

    expect(predictions).toHaveLength(2);
    expect(predictions[0].lookupKey).toBe("20260319OTTNYI");
    expect(predictions[1].vegaPuckLineHomeOdds).toBe(-140);
    expect(results).toHaveLength(2);
    expect(results[0].winner).toBe("OTT");
    expect(results[0].homeGoals).toBe(3);
    expect(results[1].winner).toBe("");
  });

  it("parses numeric stake sizes from ML Bet, O/U Bet, and PL Bet columns", () => {
    const predictions = parsePredictionCsv(weightedBetSpreadsheetCsv);

    expect(predictions[0].mlBetUnits).toBe(2);
    expect(predictions[0].ouBetUnits).toBe(1.5);
    expect(predictions[0].puckLineBetUnits).toBeNull();
    expect(predictions[1].mlBetUnits).toBeNull();
  });
});

describe("evaluatePredictionResults", () => {
  it("computes market summaries, threshold buckets, and calibration", () => {
    const summary = evaluatePredictionResults(
      parsePredictionCsv(predictionsCsv),
      parseResultsCsv(resultsCsv),
    );

    expect(summary.matchedGames).toBe(2);
    expect(summary.unmatchedPredictions).toBe(0);
    expect(summary.marketSummaries.find((market) => market.market === "ML")?.bets).toBe(2);
    expect(summary.marketSummaries.find((market) => market.market === "ML")?.wins).toBe(1);
    expect(summary.marketSummaries.find((market) => market.market === "O/U")?.wins).toBe(1);
    expect(summary.marketSummaries.find((market) => market.market === "PL")?.wins).toBe(1);
    expect(summary.thresholdSummaries.find((bucket) => bucket.threshold === 4)?.bets).toBe(5);
    expect(summary.calibration.find((bucket) => bucket.label === "60-65%")?.games).toBe(1);
    expect(summary.calibration.find((bucket) => bucket.label === "50-55%")?.games).toBe(1);
    expect(summary.ouRecommendationSummaries.find((bucket) => bucket.recommendation === "under")?.wins).toBe(0);
    expect(summary.ouRecommendationSummaries.find((bucket) => bucket.recommendation === "over")?.wins).toBe(1);
    expect(summary.ouEdgeBuckets.find((bucket) => bucket.label === "5-10%")?.bets).toBe(1);
  });

  it("uses explicit bet sizes when present and keeps separate actual-bet summaries", () => {
    const summary = evaluatePredictionResults(
      parsePredictionCsv(weightedBetSpreadsheetCsv),
      parseResultsCsv(weightedBetSpreadsheetCsv),
    );

    const mlSummary = summary.marketSummaries.find((market) => market.market === "ML");
    const ouSummary = summary.marketSummaries.find((market) => market.market === "O/U");

    expect(mlSummary?.bets).toBe(2);
    expect(mlSummary?.wins).toBe(1);
    expect(mlSummary?.units).toBeCloseTo(0.8182, 4);
    expect(mlSummary?.roi).toBeCloseTo(0.2727, 4);
    expect(mlSummary?.actualBets).toBe(1);
    expect(mlSummary?.actualWins).toBe(1);
    expect(mlSummary?.actualUnits).toBeCloseTo(1.8182, 4);
    expect(mlSummary?.actualRoi).toBeCloseTo(0.9091, 4);

    expect(ouSummary?.bets).toBe(2);
    expect(ouSummary?.wins).toBe(1);
    expect(ouSummary?.units).toBeCloseTo(-0.5476, 4);
    expect(ouSummary?.roi).toBeCloseTo(-0.219, 3);
    expect(ouSummary?.actualBets).toBe(1);
    expect(ouSummary?.actualWins).toBe(0);
    expect(ouSummary?.actualUnits).toBeCloseTo(-1.5, 4);
    expect(ouSummary?.actualRoi).toBe(-1);
  });
});
