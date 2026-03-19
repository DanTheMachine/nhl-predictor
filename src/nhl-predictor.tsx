import { AnalysisPanel } from "./nhl-predictor/AnalysisPanel";
import { DashboardHeader } from "./nhl-predictor/DashboardHeader";
import { ModelSetupPanel } from "./nhl-predictor/ModelSetupPanel";
import { SchedulePanel } from "./nhl-predictor/SchedulePanel";
import { SingleGamePanel } from "./nhl-predictor/SingleGamePanel";
import { SingleGameResults } from "./nhl-predictor/SingleGameResults";
import { useNhlPredictorController } from "./nhl-predictor/useNhlPredictorController";

export default function NHLModel() {
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
    <div style={{ minHeight: "100vh", background: "linear-gradient(170deg,#0b1220 0%,#0e1628 50%,#0b1220 100%)", color: "#c8e8ff", fontFamily: "monospace", padding: "24px 20px" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;700;900&display=swap');
        @keyframes fadeUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse  { 0%,100%{opacity:1} 50%{opacity:0.15} }
        @keyframes glint  { 0%,100%{opacity:0.6} 50%{opacity:1} }
        .nhl-card { background:rgba(100,180,255,0.06); border:1px solid rgba(100,180,255,0.2); border-radius:6px; padding:18px; margin-bottom:14px; }
        select option, select optgroup { background:#0d1520; color:#c8e8ff; }
      `}</style>

      <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: 3, zIndex: 100, background: "linear-gradient(90deg,#0ea5e9,#38bdf8,#7dd3fc,#38bdf8,#0ea5e9)", animation: "glint 3s ease infinite" }} />

      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
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
        />
        <ModelSetupPanel
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
        <SingleGamePanel
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
        <AnalysisPanel
          linesRows={linesRows}
          resultsStatus={resultsStatus}
          resultsRunning={resultsRunning}
        />
      </div>
    </div>
  );
}
