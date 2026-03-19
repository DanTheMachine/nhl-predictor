Project: nhl-predictor

Purpose:
Build an NHL Predictive model

Key stack:
React

Important modules:
- src/nhl-predictor.tsx


Summary:
NHL Predictor - Google Sheets Workflow Fixes
LookupKey bug - Predictions CSV exported Home as "CAR Hurricanes" (abbr + name), so C2&D2 never matched the Results LookupKey of "CARCGY". Fixed by adding a dedicated LookupKey column to the Predictions CSV export built from homeAbbr + awayAbbr only.
Date-prefixed LookupKey - To handle duplicate matchups across a season/playoffs, LookupKey was changed to YYYYMMDD + homeAbbr + awayAbbr (e.g. 20260312PITBOS) in both the Predictions and Results CSV exports. Both use ET timezone to stay consistent with NHL scheduling.
Google Sheets formula columns (row 2, drag to 2000):

AL2 (LookupKey): =IFERROR(TEXT(A2,"YYYYMMDD")&LEFT(C2,FIND(" ",C2)-1)&LEFT(D2,FIND(" ",D2)-1),"")
AM2 (Actual Home Goals): =IFERROR(INDEX(Results!$A:$H,MATCH(AL2,Results!$H:$H,0),MATCH("Home Goals",Results!$1:$1,0)),"")
AN2 (Actual Away Goals): same pattern, "Away Goals"
AO2 (Actual Winner): same pattern, "Winner"
AP2 (Actual Total): same pattern, "Total"
AQ2 (ML Hit): =IF(OR(AO2="",S2="",S2="PASS"),"",IF(S2="HOME ML",IF(AO2=LEFT(C2,FIND(" ",C2)-1),1,0),IF(S2="AWAY ML",IF(AO2=LEFT(D2,FIND(" ",D2)-1),1,0),"")))
AR2 (O/U Hit): =IF(OR(AP2="",J2="",K2="",K2="PASS"),"",IF((AP2>J2)=(K2="OVER"),1,0))
AS2 (PL Hit): Handles all four puck line values - HOME -1.5, AWAY -1.5, HOME +1.5, AWAY +1.5

Key behaviors:

Blank = PASS (no bet placed), not an error
Results and Predictions tabs don't need to match row counts - MATCH-based lookup finds by key regardless of order
Renaming tabs via Google Sheets UI auto-updates all formula references
Hit rate formula: =COUNTIF(col,1)/(COUNTIF(col,1)+COUNTIF(col,0)) - ignores blanks correctly
1/0 preferred over W/L for easier COUNTIF/SUM/AVERAGE math

Predictions CSV date fix - Was using new Date() local time, which rolled to the next day after midnight. Fixed to use ET timezone (America/New_York) consistently across the filename, date column, and LookupKey in both buildExportRow and handleExport.

NHL Predictor - UI Improvements (this session)
Best Bets section - Added below sim results cards after Run All Sims. Pools all ML, PL, and O/U bets across all simmed games, sorts by edge % descending. Compact single-row layout with columns: Game / Pick | Model | Odds | Edge | Kelly | Strength badge (STRONG >= 8%, MED 4-8%, THIN < 4%). Model column shows win% for ML, cover% for PL, projected total for O/U. Kelly only shown for ML bets.
Single-game odds fetch - Status line now shows full line: ESPN / NYI -142 / PHI +120 / PL -1.5 (-130/+108) / O/U 5.5 (-110/-110). Clicking MANUAL when ESPN odds are loaded pre-populates all 8 manual input fields with the fetched values.
Green color consistency - Three status messages now all use #4ade80:

Fetch ESPN Data confirmation
Apply NST Data confirmation
Single-game Live Lines confirmation (was already green)


Current file: nhl-predictor.tsx in outputs - this is the actively maintained version. Upload it at the start of any new session before making changes.
