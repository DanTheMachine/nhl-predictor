import { useState, type ChangeEvent } from "react";

import {
  evaluatePredictionResults,
  parsePredictionCsv,
  parseResultsCsv,
  type EvaluationSummary,
} from "./evaluation";

function formatPct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function formatUnits(value: number): string {
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}u`;
}

function readTextFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error(`Could not read ${file.name}`));
    reader.readAsText(file);
  });
}

export function EvaluationPanel() {
  const [predictionsText, setPredictionsText] = useState("");
  const [resultsText, setResultsText] = useState("");
  const [status, setStatus] = useState("");
  const [summary, setSummary] = useState<EvaluationSummary | null>(null);

  const handleEvaluate = () => {
    try {
      const predictions = parsePredictionCsv(predictionsText);
      const results = parseResultsCsv(resultsText);

      if (predictions.length === 0 || results.length === 0) {
        setSummary(null);
        setStatus("Paste or upload both predictions and results CSVs to evaluate the model.");
        return;
      }

      const nextSummary = evaluatePredictionResults(predictions, results);
      setSummary(nextSummary);
      setStatus(
        `Matched ${nextSummary.matchedGames} games · ${nextSummary.bets.length} graded bets · ${nextSummary.unmatchedPredictions} unmatched predictions`,
      );
    } catch (error) {
      setSummary(null);
      setStatus(`Could not evaluate CSVs: ${(error as Error).message}`);
    }
  };

  const handleFileLoad = async (
    event: ChangeEvent<HTMLInputElement>,
    setter: (value: string) => void,
    label: string,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await readTextFile(file);
      setter(text);
      setStatus(`${label} loaded: ${file.name}`);
    } catch (error) {
      setStatus((error as Error).message);
    } finally {
      event.target.value = "";
    }
  };

  return (
    <div style={{ marginTop: 22 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: "#c3ced8", letterSpacing: 3, fontFamily: "monospace", marginBottom: 12 }}>
        MODEL EVALUATION
      </div>

      <div style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 8, padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
          <div style={{ fontSize: 12, color: "#b3c0cc", lineHeight: 1.7 }}>
            Paste exported <strong style={{ color: "#58a6ff" }}>Predictions</strong> and <strong style={{ color: "#58a6ff" }}>Results</strong> CSVs, or a merged tracking sheet with appended actual-result columns, then score the model locally.
          </div>
          <button
            onClick={handleEvaluate}
            style={{ background: "linear-gradient(135deg,#0f766e,#14b8a6)", border: "1px solid rgba(45,212,191,0.35)", borderRadius: 6, padding: "9px 16px", color: "#ccfbf1", fontSize: 11, fontWeight: 900, letterSpacing: 2, fontFamily: "monospace", cursor: "pointer" }}
          >
            EVALUATE CSVs
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", gap: 12 }}>
          <div style={{ background: "#0d1117", border: "1px solid #21262d", borderRadius: 6, padding: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <label htmlFor="predictions-csv" style={{ fontSize: 11, color: "#e6edf3", fontWeight: 700 }}>
                Predictions CSV
              </label>
              <input
                id="predictions-file"
                type="file"
                accept=".csv,text/csv"
                onChange={(event) => void handleFileLoad(event, setPredictionsText, "Predictions CSV")}
                style={{ fontSize: 10, color: "#8b949e" }}
              />
            </div>
            <textarea
              id="predictions-csv"
              value={predictionsText}
              onChange={(event) => setPredictionsText(event.target.value)}
              placeholder="Paste the exported predictions CSV or your merged tracking sheet here"
              style={{ width: "100%", minHeight: 150, background: "#010409", border: "1px solid #30363d", borderRadius: 6, color: "#c8e8ff", padding: 10, fontFamily: "monospace", fontSize: 10, resize: "vertical" }}
            />
          </div>

          <div style={{ background: "#0d1117", border: "1px solid #21262d", borderRadius: 6, padding: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <label htmlFor="results-csv" style={{ fontSize: 11, color: "#e6edf3", fontWeight: 700 }}>
                Results CSV
              </label>
              <input
                id="results-file"
                type="file"
                accept=".csv,text/csv"
                onChange={(event) => void handleFileLoad(event, setResultsText, "Results CSV")}
                style={{ fontSize: 10, color: "#8b949e" }}
              />
            </div>
            <textarea
              id="results-csv"
              value={resultsText}
              onChange={(event) => setResultsText(event.target.value)}
              placeholder='Paste the exported results CSV here, or the same merged sheet if it includes "Actual ..." columns'
              style={{ width: "100%", minHeight: 150, background: "#010409", border: "1px solid #30363d", borderRadius: 6, color: "#c8e8ff", padding: 10, fontFamily: "monospace", fontSize: 10, resize: "vertical" }}
            />
          </div>
        </div>

        {status && (
          <div style={{ marginTop: 10, fontSize: 11, color: "#8b949e", fontFamily: "monospace" }}>
            {status}
          </div>
        )}

        {summary && (
          <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10 }}>
              {[
                { label: "Matched Games", value: String(summary.matchedGames), color: "#7dd3fc" },
                { label: "Total Bets", value: String(summary.bets.length), color: "#e6edf3" },
                { label: "Unmatched Predictions", value: String(summary.unmatchedPredictions), color: "#fbbf24" },
                { label: "Unmatched Results", value: String(summary.unmatchedResults), color: "#f59e0b" },
              ].map((card) => (
                <div key={card.label} style={{ background: "#0d1117", border: "1px solid #21262d", borderRadius: 6, padding: 12 }}>
                  <div style={{ fontSize: 9, color: "#8b949e", letterSpacing: 2, marginBottom: 6 }}>{card.label}</div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: card.color }}>{card.value}</div>
                </div>
              ))}
            </div>

            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#8b949e", letterSpacing: 3, marginBottom: 8 }}>ROI BY MARKET</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 10 }}>
                {summary.marketSummaries.map((market) => (
                  <div key={market.market} style={{ background: "#0d1117", border: "1px solid #21262d", borderRadius: 6, padding: 12 }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: "#e6edf3", marginBottom: 8 }}>{market.market}</div>
                    <div style={{ fontSize: 11, color: "#b3c0cc", lineHeight: 1.8 }}>
                      <div>Bets: <span style={{ color: "#e6edf3" }}>{market.bets}</span></div>
                      <div>Record: <span style={{ color: "#e6edf3" }}>{market.wins}-{market.losses}-{market.pushes}</span></div>
                      <div>Hit rate: <span style={{ color: "#7dd3fc" }}>{formatPct(market.hitRate)}</span></div>
                      <div>Units: <span style={{ color: market.units >= 0 ? "#3fb950" : "#f87171" }}>{formatUnits(market.units)}</span></div>
                      <div>ROI: <span style={{ color: market.roi >= 0 ? "#3fb950" : "#f87171" }}>{formatPct(market.roi)}</span></div>
                      <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid #21262d" }}>Actual Bets: <span style={{ color: "#e6edf3" }}>{market.actualBets}</span></div>
                      <div>Actual Record: <span style={{ color: "#e6edf3" }}>{market.actualWins}-{market.actualLosses}-{market.actualPushes}</span></div>
                      <div>Actual Hit rate: <span style={{ color: "#7dd3fc" }}>{formatPct(market.actualHitRate)}</span></div>
                      <div>Actual Units: <span style={{ color: market.actualUnits >= 0 ? "#3fb950" : "#f87171" }}>{formatUnits(market.actualUnits)}</span></div>
                      <div>Actual ROI: <span style={{ color: market.actualRoi >= 0 ? "#3fb950" : "#f87171" }}>{formatPct(market.actualRoi)}</span></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#8b949e", letterSpacing: 3, marginBottom: 8 }}>EDGE THRESHOLDS</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 10 }}>
                {summary.thresholdSummaries.map((bucket) => (
                  <div key={bucket.threshold} style={{ background: "#0d1117", border: "1px solid #21262d", borderRadius: 6, padding: 12 }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: "#e6edf3", marginBottom: 8 }}>Edge {bucket.threshold}%+</div>
                    <div style={{ fontSize: 11, color: "#b3c0cc", lineHeight: 1.8 }}>
                      <div>Bets: <span style={{ color: "#e6edf3" }}>{bucket.bets}</span></div>
                      <div>Record: <span style={{ color: "#e6edf3" }}>{bucket.wins}-{bucket.losses}-{bucket.pushes}</span></div>
                      <div>Hit rate: <span style={{ color: "#7dd3fc" }}>{formatPct(bucket.hitRate)}</span></div>
                      <div>ROI: <span style={{ color: bucket.roi >= 0 ? "#3fb950" : "#f87171" }}>{formatPct(bucket.roi)}</span></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#8b949e", letterSpacing: 3, marginBottom: 8 }}>CALIBRATION</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 10 }}>
                {summary.calibration.map((bucket) => (
                  <div key={bucket.label} style={{ background: "#0d1117", border: "1px solid #21262d", borderRadius: 6, padding: 12 }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: "#e6edf3", marginBottom: 8 }}>{bucket.label}</div>
                    <div style={{ fontSize: 11, color: "#b3c0cc", lineHeight: 1.8 }}>
                      <div>Games: <span style={{ color: "#e6edf3" }}>{bucket.games}</span></div>
                      <div>Accuracy: <span style={{ color: "#7dd3fc" }}>{formatPct(bucket.accuracy)}</span></div>
                      <div>Avg predicted: <span style={{ color: "#c4b5fd" }}>{formatPct(bucket.avgPredicted)}</span></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#8b949e", letterSpacing: 3, marginBottom: 8 }}>O/U CALIBRATION</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 10 }}>
                {summary.ouRecommendationSummaries.map((bucket) => (
                  <div key={bucket.recommendation} style={{ background: "#0d1117", border: "1px solid #21262d", borderRadius: 6, padding: 12 }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: "#e6edf3", marginBottom: 8 }}>{bucket.recommendation.toUpperCase()}</div>
                    <div style={{ fontSize: 11, color: "#b3c0cc", lineHeight: 1.8 }}>
                      <div>Games: <span style={{ color: "#e6edf3" }}>{bucket.games}</span></div>
                      <div>Avg edge: <span style={{ color: "#c4b5fd" }}>{bucket.avgEdgePct.toFixed(1)}%</span></div>
                      {bucket.recommendation === "pass" ? (
                        <div style={{ color: "#8b949e" }}>No bet tracked for PASS rows</div>
                      ) : (
                        <>
                          <div>Record: <span style={{ color: "#e6edf3" }}>{bucket.wins}-{bucket.losses}-{bucket.pushes}</span></div>
                          <div>Hit rate: <span style={{ color: "#7dd3fc" }}>{formatPct(bucket.hitRate)}</span></div>
                          <div>Units: <span style={{ color: bucket.units >= 0 ? "#3fb950" : "#f87171" }}>{formatUnits(bucket.units)}</span></div>
                          <div>ROI: <span style={{ color: bucket.roi >= 0 ? "#3fb950" : "#f87171" }}>{formatPct(bucket.roi)}</span></div>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#8b949e", letterSpacing: 3, marginBottom: 8 }}>O/U EDGE BUCKETS</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 10 }}>
                {summary.ouEdgeBuckets.map((bucket) => (
                  <div key={bucket.label} style={{ background: "#0d1117", border: "1px solid #21262d", borderRadius: 6, padding: 12 }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: "#e6edf3", marginBottom: 8 }}>{bucket.label}</div>
                    <div style={{ fontSize: 11, color: "#b3c0cc", lineHeight: 1.8 }}>
                      <div>Bets: <span style={{ color: "#e6edf3" }}>{bucket.bets}</span></div>
                      <div>Avg edge: <span style={{ color: "#c4b5fd" }}>{bucket.avgEdgePct.toFixed(1)}%</span></div>
                      <div>Record: <span style={{ color: "#e6edf3" }}>{bucket.wins}-{bucket.losses}-{bucket.pushes}</span></div>
                      <div>Hit rate: <span style={{ color: "#7dd3fc" }}>{formatPct(bucket.hitRate)}</span></div>
                      <div>ROI: <span style={{ color: bucket.roi >= 0 ? "#3fb950" : "#f87171" }}>{formatPct(bucket.roi)}</span></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
