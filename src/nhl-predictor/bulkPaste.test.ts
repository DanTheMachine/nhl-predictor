import { describe, expect, it } from "vitest";

import { isBulkPasteErrorStatus, resolveBulkPasteTeamName } from "./bulkPaste";

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
  });

  it("leaves success messages green", () => {
    expect(isBulkPasteErrorStatus("Updated 12 of 12 game(s) - 24 teams parsed")).toBe(false);
  });
});
