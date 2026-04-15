import { useState } from "react";

import { AnalysisPanel } from "./nhl-predictor/AnalysisPanel";
import { DashboardHeader } from "./nhl-predictor/DashboardHeader";
import { EvaluationPanel } from "./nhl-predictor/EvaluationPanel";
import { ModelSetupPanel } from "./nhl-predictor/ModelSetupPanel";
import { SchedulePanel } from "./nhl-predictor/SchedulePanel";
import { SingleGamePanel } from "./nhl-predictor/SingleGamePanel";
import { SingleGameResults } from "./nhl-predictor/SingleGameResults";
import { useNhlPredictorController } from "./nhl-predictor/useNhlPredictorController";

export default function NHLModel() {
  const [activeTab, setActiveTab] = useState<"predictor" | "evaluation">("predictor");
  const [singleGameToolsOpen, setSingleGameToolsOpen] = useState(false);
  const {
    homeTeam,
    setHomeTeam,
    awayTeam,
    setAwayTeam,
    gameType,
    setGameType,
    homeB2B,
    setHomeB2B,
    awayB2B,
    setAwayB2B,
    result,
    setResult,
    espnData,
    dataSource,
    fetchStatus,
    fetchError,
    liveStats,
    setLiveStats,
    statsLastUpdated,
    setStatsLastUpdated,
    nstPaste,
    setNstPaste,
    nstStatus,
    setNstStatus,
    showNstPanel,
    setShowNstPanel,
    divFilter,
    setDivFilter,
    running,
    simCount,
    odds,
    setOdds,
    oddsSource,
    setOddsSource,
    oddsStatus,
    setOddsStatus,
    manualOdds,
    setManualOdds,
    linesRows,
    setLinesRows,
    scheduleStatus,
    scheduleLoading,
    simsRunning,
    exportRunning,
    resultsRunning,
    goalieRoster,
    goalieLoading,
    resultsStatus,
    showLinesTable,
    showBulkPaste,
    setShowBulkPaste,
    bulkPasteText,
    setBulkPasteText,
    bulkPasteStatus,
    setBulkPasteStatus,
    parseNSTData,
    handleFetch,
    runSim,
    handleFetchOdds,
    applyManualOdds,
    fetchGoalieRoster,
    fetchYesterdayResults,
    handleLoadSchedule,
    updateLinesField,
    toggleEditing,
    handleRunOneSim,
    handleBulkPaste,
    handleRunAllSims,
    exportSingleGame,
    handleExport,
    hColor,
    aColor,
    hTeam,
    aTeam,
  } = useNhlPredictorController();

  return (
    <div style={{
      minHeight: "100vh",
      background: `
        radial-gradient(ellipse 100% 60% at 50% -8%, rgba(30,64,175,0.16) 0%, transparent 65%),
        radial-gradient(ellipse 50% 35% at 95% 95%, rgba(124,58,237,0.07) 0%, transparent 50%),
        linear-gradient(180deg, #060c17 0%, #0a1320 100%)
      `,
      color: "var(--text)",
      fontFamily: "var(--font-mono)",
      padding: "28px 20px 48px",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@400;700;800;900&family=Syne:wght@400;500;600;700;800&family=JetBrains+Mono:ital,wght@0,300;0,400;0,500;0,700;1,400&display=swap');
      `}</style>

      {/* Top progress shimmer bar */}
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0, height: 2, zIndex: 100,
        background: "linear-gradient(90deg, #1d4ed8, #3b82f6, #22d3ee, #3b82f6, #1d4ed8)",
        backgroundSize: "200% 100%",
        animation: "topbarShimmer 4s linear infinite",
      }} />

      <div style={{ maxWidth: 1240, margin: "0 auto" }}>
        {activeTab === "predictor" ? (
          <>
            <DashboardHeader
              dataSource={dataSource}
              fetchStatus={fetchStatus}
              fetchError={fetchError}
              liveStats={liveStats}
              statsLastUpdated={statsLastUpdated}
              onFetch={handleFetch}
              showNstPanel={showNstPanel}
              onToggleNstPanel={() => setShowNstPanel(!showNstPanel)}
              nstStatus={nstStatus}
              nstPaste={nstPaste}
              onNstPasteChange={setNstPaste}
              onParseNstData={parseNSTData}
              onClearNstData={() => { setLiveStats({}); setStatsLastUpdated(""); setNstStatus("NST data cleared - using ESPN / estimates"); }}
              activeTab={activeTab}
              onTabChange={setActiveTab}
            />
            <ModelSetupPanel
              showSingleGameExtras={singleGameToolsOpen}
              divFilter={divFilter}
              onDivFilterChange={setDivFilter}
              homeTeam={homeTeam}
              awayTeam={awayTeam}
              onHomeTeamChange={(value) => { setHomeTeam(value); setResult(null); }}
              onAwayTeamChange={(value) => { setAwayTeam(value); setResult(null); }}
              espnData={espnData}
              liveStats={liveStats}
              gameType={gameType}
              onGameTypeChange={(value) => { setGameType(value); setResult(null); }}
              homeB2B={homeB2B}
              awayB2B={awayB2B}
              onHomeB2BChange={(value) => { setHomeB2B(value); setResult(null); }}
              onAwayB2BChange={(value) => { setAwayB2B(value); setResult(null); }}
              hColor={hColor}
              aColor={aColor}
              hTeam={hTeam}
              aTeam={aTeam}
            />
            <SchedulePanel
              linesRows={linesRows}
              scheduleStatus={scheduleStatus}
              scheduleLoading={scheduleLoading}
              goalieLoading={goalieLoading}
              goalieRoster={goalieRoster}
              showBulkPaste={showBulkPaste}
              bulkPasteText={bulkPasteText}
              bulkPasteStatus={bulkPasteStatus}
              showLinesTable={showLinesTable}
              simsRunning={simsRunning}
              exportRunning={exportRunning}
              resultsRunning={resultsRunning}
              liveStats={liveStats}
              onLoadSchedule={handleLoadSchedule}
              onLoadGoalies={fetchGoalieRoster}
              onToggleBulkPaste={() => {
                setShowBulkPaste((prev) => !prev);
                setBulkPasteStatus("");
              }}
              onRunAllSims={handleRunAllSims}
              onExport={handleExport}
              onFetchResults={fetchYesterdayResults}
              onCloseBulkPaste={() => setShowBulkPaste(false)}
              onBulkPasteTextChange={(value) => { setBulkPasteText(value); setBulkPasteStatus(""); }}
              onApplyBulkPaste={handleBulkPaste}
              onClearBulkPaste={() => { setBulkPasteText(""); setBulkPasteStatus(""); }}
              onRunOneSim={handleRunOneSim}
              onToggleEditing={toggleEditing}
              onUpdateLinesField={updateLinesField}
              setLinesRows={setLinesRows}
            />
            <SingleGamePanel
              isOpen={singleGameToolsOpen}
              onToggleOpen={() => setSingleGameToolsOpen((prev) => !prev)}
              running={running}
              simCount={simCount}
              onRunSim={runSim}
              odds={odds}
              oddsSource={oddsSource}
              oddsStatus={oddsStatus}
              onFetchOdds={handleFetchOdds}
              manualOdds={manualOdds}
              setManualOdds={setManualOdds}
              setOddsSource={setOddsSource}
              setOddsStatus={setOddsStatus}
              setOdds={setOdds}
              onApplyManualOdds={applyManualOdds}
            />
            {result && (
              <SingleGameResults
                result={result}
                odds={odds}
                homeTeam={homeTeam}
                awayTeam={awayTeam}
                hColor={hColor}
                aColor={aColor}
                hTeam={hTeam}
                aTeam={aTeam}
                dataSource={dataSource}
                onExportSingleGame={exportSingleGame}
              />
            )}
            <AnalysisPanel
              linesRows={linesRows}
              resultsStatus={resultsStatus}
              resultsRunning={resultsRunning}
            />
          </>
        ) : (
          <>
            <DashboardHeader
              dataSource={dataSource}
              fetchStatus={fetchStatus}
              fetchError={fetchError}
              liveStats={liveStats}
              statsLastUpdated={statsLastUpdated}
              onFetch={handleFetch}
              showNstPanel={showNstPanel}
              onToggleNstPanel={() => setShowNstPanel(!showNstPanel)}
              nstStatus={nstStatus}
              nstPaste={nstPaste}
              onNstPasteChange={setNstPaste}
              onParseNstData={parseNSTData}
              onClearNstData={() => { setLiveStats({}); setStatsLastUpdated(""); setNstStatus("NST data cleared - using ESPN / estimates"); }}
              activeTab={activeTab}
              onTabChange={setActiveTab}
            />
            <EvaluationPanel />
          </>
        )}
      </div>
    </div>
  );
}
