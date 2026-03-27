import { describe, expect, it } from "vitest";

import type { LinesRow } from "../nhl-core/types";

import {
  applyBulkPasteToLinesRows,
  isBulkPasteErrorStatus,
  parseBulkPasteTeamBlocks,
  resolveBulkPasteTeamName,
} from "./bulkPaste";

describe("resolveBulkPasteTeamName", () => {
  it("matches full team names, mascot names, and city-only names", () => {
    expect(resolveBulkPasteTeamName("Toronto Maple Leafs")).toBe("TOR");
    expect(resolveBulkPasteTeamName("Maple Leafs")).toBe("TOR");
    expect(resolveBulkPasteTeamName("TORONTO")).toBe("TOR");

    expect(resolveBulkPasteTeamName("Boston Bruins")).toBe("BOS");
    expect(resolveBulkPasteTeamName("Bruins")).toBe("BOS");
    expect(resolveBulkPasteTeamName("BOSTON")).toBe("BOS");

    expect(resolveBulkPasteTeamName("LAS VEGAS")).toBe("VGK");
    expect(resolveBulkPasteTeamName("LOS ANGELES")).toBe("LAK");
    expect(resolveBulkPasteTeamName("TAMPA BAY")).toBe("TBL");
    expect(resolveBulkPasteTeamName("ST. LOUIS")).toBe("STL");
    expect(resolveBulkPasteTeamName("NY ISLANDERS")).toBe("NYI");
  });
});

describe("isBulkPasteErrorStatus", () => {
  it("marks parse failures and missing-input messages as errors", () => {
    expect(isBulkPasteErrorStatus("Could only parse 0 team(s) - check format")).toBe(true);
    expect(isBulkPasteErrorStatus("Load today's games first")).toBe(true);
    expect(isBulkPasteErrorStatus("Nothing to parse")).toBe(true);
    expect(isBulkPasteErrorStatus("No loaded games matched the pasted teams (4 teams parsed)")).toBe(true);
  });

  it("leaves success messages green", () => {
    expect(isBulkPasteErrorStatus("Updated 12 of 12 game(s) - 24 teams parsed")).toBe(false);
  });
});

describe("bulk pasted lines application", () => {
  const samplePaste = `BOSTON
73
+ 1 ½
- 140
O 6 ½
- 105
+ 170
BUFFALO
74
- 1 ½
+ 130
U 6 ½
- 105
- 190
© RSN | TVA | MSG4:30 PM
NY RANGERS
75
- 1 ½
+ 215
O 6
- 115
- 110
TORONTO
76
+ 1 ½
- 245
U 6
+ 105
Even`;

  function buildRow(awayAbbr: string, homeAbbr: string): LinesRow {
    return {
      game: {
        awayAbbr,
        homeAbbr,
        gameTime: "7:00 PM",
        tvInfo: "",
      },
      espnOdds: null,
      editedOdds: null,
      simResult: null,
      isEditing: false,
      homeB2B: false,
      awayB2B: false,
      homeSVOverride: null,
      awaySVOverride: null,
    };
  }

  it("parses the pasted team blocks from the multiline sportsbook format", () => {
    expect(parseBulkPasteTeamBlocks(samplePaste)).toEqual([
      { abbr: "BOS", plLine: 1.5, plOdds: -140, ouLine: 6.5, ouOdds: -105, isOver: true, ml: 170 },
      { abbr: "BUF", plLine: -1.5, plOdds: 130, ouLine: 6.5, ouOdds: -105, isOver: false, ml: -190 },
      { abbr: "NYR", plLine: -1.5, plOdds: 215, ouLine: 6, ouOdds: -115, isOver: true, ml: -110 },
      { abbr: "TOR", plLine: 1.5, plOdds: -245, ouLine: 6, ouOdds: 105, isOver: false, ml: 100 },
    ]);
  });

  it("applies parsed lines onto matching loaded games", () => {
    const result = applyBulkPasteToLinesRows([buildRow("BOS", "BUF"), buildRow("NYR", "TOR")], samplePaste);

    expect(result.updatedGames).toBe(2);
    expect(result.status).toBe("Updated 2 of 2 game(s) - 4 teams parsed");
    expect(result.updatedRows[0].editedOdds).toEqual({
      source: "manual",
      homeMoneyline: -190,
      awayMoneyline: 170,
      puckLine: -1.5,
      puckLineHomeOdds: 130,
      puckLineAwayOdds: -140,
      overUnder: 6.5,
      overOdds: -105,
      underOdds: -105,
    });
    expect(result.updatedRows[1].editedOdds).toEqual({
      source: "manual",
      homeMoneyline: 100,
      awayMoneyline: -110,
      puckLine: 1.5,
      puckLineHomeOdds: -245,
      puckLineAwayOdds: 215,
      overUnder: 6,
      overOdds: -115,
      underOdds: 105,
    });
  });

  it("returns an error when pasted teams do not match the loaded slate", () => {
    const result = applyBulkPasteToLinesRows([buildRow("DET", "FLA")], samplePaste);

    expect(result.updatedGames).toBe(0);
    expect(result.status).toBe("No loaded games matched the pasted teams (4 teams parsed)");
    expect(isBulkPasteErrorStatus(result.status)).toBe(true);
  });

  it("keeps CBJ/MTL totals at 6.5 and DAL/NYI puck-line direction aligned to the home team", () => {
    const largerSamplePaste = `SEATTLE
1
+ 1 Â½
+ 105
O 6 Â½
+ 110
+ 260
TAMPA BAY
2
- 1 Â½
- 115
U 6 Â½
- 120
- 290
© ESPN | RSNP4:00 PM
MINNESOTA
11
- 1 Â½
+ 175
O 6 Â½
+ 105
- 155
FLORIDA
12
+ 1 Â½
- 195
U 6 Â½
- 115
+ 145
© TSN2 | RDS | FDOH4:00 PM
COLUMBUS
3
+ 1 Â½
- 230
O 6 Â½
- 110
Even
MONTREAL
4
- 1 Â½
+ 200
U 6 Â½
Even
- 110
© SNPT | TSN5 | RDS24:00 PM
PITTSBURGH
5
+ 1 Â½
- 190
O 6
- 110
+ 135
OTTAWA
6
- 1 Â½
+ 170
U 6
Even
- 145
© VIC+ | MSGS4:00 PM
DALLAS
7
- 1 Â½
+ 200
O 5 Â½
- 115
- 120
NY ISLANDERS
8
+ 1 Â½
- 230
U 5 Â½
+ 105
+ 110`;

    const result = applyBulkPasteToLinesRows([buildRow("CBJ", "MTL"), buildRow("DAL", "NYI")], largerSamplePaste);

    expect(result.updatedGames).toBe(2);
    expect(result.updatedRows[0].editedOdds).toEqual({
      source: "manual",
      homeMoneyline: -110,
      awayMoneyline: 100,
      puckLine: -1.5,
      puckLineHomeOdds: 200,
      puckLineAwayOdds: -230,
      overUnder: 6.5,
      overOdds: -110,
      underOdds: 100,
    });
    expect(result.updatedRows[1].editedOdds).toEqual({
      source: "manual",
      homeMoneyline: 110,
      awayMoneyline: -120,
      puckLine: 1.5,
      puckLineHomeOdds: -230,
      puckLineAwayOdds: 200,
      overUnder: 5.5,
      overOdds: -115,
      underOdds: 105,
    });
  });
});
