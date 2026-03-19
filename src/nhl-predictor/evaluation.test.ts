import { describe, expect, it } from "vitest";

import {
  evaluatePredictionResults,
  parsePredictionCsv,
  parseResultsCsv,
} from "./evaluation";

const predictionsCsv = `"Date","Game Time","Home","Away","Home Win %","Away Win %","Home Goals","Away Goals","Model Total","Vegas O/U","O/U Rec","O/U Edge","Home ML (Model)","Away ML (Model)","Vegas Home ML","Vegas Away ML","Vegas Puck Line","Home PL Odds","Away PL Odds","Over Odds","Under Odds","Home ML Edge","Away ML Edge","ML Value Side","ML Kelly %","Puck Line Rec","Puck Line Edge","Home CF%","Away CF%","Home xGF%","Away xGF%","Home SV%","Away SV%","Home Goalie Override","Away Goalie Override","Home PP%","Away PP%","Home PK%","Away PK%","Home PDO","Away PDO","Odds Source","LookupKey"
"03/19/2026","7:00 PM ET","COL Avalanche","CHI Blackhawks","60.0%","40.0%","3.20","2.10","5.30","5.5","UNDER","-0.20","-150","+150","-110","+100","-1.5","+130","-150","-110","-110","+7.5%","-7.5%","HOME ML","3.1%","HOME -1.5","+4.5%","56.4%","45.0%","55.8%","44.2%",".926",".903","-","-","25.5%","18.0%","83.0%","76.0%","101.3","98.7","ESPN","20260319COLCHI"
"03/19/2026","8:00 PM ET","BOS Bruins","TOR Maple Leafs","54.0%","46.0%","3.10","2.80","5.90","6.0","OVER","+0.45","-117","+117","+105","-125","+1.5","-165","+145","-105","-115","+5.2%","-5.2%","HOME ML","2.2%","PASS","-","49.0%","45.6%","46.4%","47.6%",".914",".899","-","-","25.6%","19.7%","77.2%","83.0%","101.9","100.2","ESPN","20260319BOSTOR"`;

const resultsCsv = `"Date","Home","Away","Home Goals","Away Goals","Winner","Total","LookupKey"
"03-19-2026","COL","CHI","4","2","COL","6","20260319COLCHI"
"03-19-2026","BOS","TOR","2","5","TOR","7","20260319BOSTOR"`;

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
    expect(summary.thresholdSummaries.find((bucket) => bucket.threshold === 4)?.bets).toBe(4);
    expect(summary.calibration.find((bucket) => bucket.label === "60-65%")?.games).toBe(1);
    expect(summary.calibration.find((bucket) => bucket.label === "50-55%")?.games).toBe(1);
  });
});
