import { describe, expect, it } from "vitest";

import type { GoalieInfo, LinesRow } from "../nhl-core/types";
import {
  formatGoalieOverrideTag,
  applyEstimatedGoalieOverrides,
  getEstimatedGoalieIndex,
  getEstimatedGoalieLabel,
  getEstimatedGoalieOverride,
  reconcileGoalieOverride,
} from "./goalieSelection";

const goalieRoster: Record<string, GoalieInfo[]> = {
  BOS: [
    { name: "Starter A", sv: 0.919, gp: 42 },
    { name: "Backup A", sv: 0.906, gp: 18 },
  ],
  TOR: [
    { name: "Starter B", sv: 0.914, gp: 40 },
    { name: "Backup B", sv: 0.902, gp: 20 },
  ],
};

describe("goalieSelection", () => {
  it("uses the top games-started goalie on normal rest", () => {
    expect(getEstimatedGoalieOverride(goalieRoster, "BOS", false)).toBe(0.919);
  });

  it("uses the second-most-started goalie on back-to-backs", () => {
    expect(getEstimatedGoalieOverride(goalieRoster, "BOS", true)).toBe(0.906);
  });

  it("returns the estimated goalie slot index", () => {
    expect(getEstimatedGoalieIndex(goalieRoster, "BOS", false)).toBe(0);
    expect(getEstimatedGoalieIndex(goalieRoster, "BOS", true)).toBe(1);
  });

  it("updates an auto-selected goalie when B2B status changes", () => {
    expect(reconcileGoalieOverride(0.919, false, true, goalieRoster, "BOS")).toBe(0.906);
  });

  it("labels estimated starter and B2B backup overrides", () => {
    expect(getEstimatedGoalieLabel(goalieRoster, "BOS", false, 0.919)).toBe("1st");
    expect(getEstimatedGoalieLabel(goalieRoster, "BOS", true, 0.906)).toBe("2nd");
    expect(getEstimatedGoalieLabel(goalieRoster, "BOS", true, 0.911)).toBeNull();
  });

  it("formats compact goalie tags for the schedule table", () => {
    expect(formatGoalieOverrideTag("BUF", 0.91, "1st")).toBe("BUF 9.10 - 1st");
    expect(formatGoalieOverrideTag("BUF", 0.906, "2nd")).toBe("BUF 9.06 - 2nd");
    expect(formatGoalieOverrideTag("BUF", 0.911, null)).toBe("BUF 9.11");
  });

  it("preserves manual overrides when B2B status changes", () => {
    expect(reconcileGoalieOverride(0.911, false, true, goalieRoster, "BOS")).toBe(0.911);
  });

  it("applies estimated overrides across loaded schedule rows", () => {
    const rows: LinesRow[] = [
      {
        game: { homeAbbr: "BOS", awayAbbr: "TOR", gameTime: "7:00 PM ET", tvInfo: "ESPN" },
        espnOdds: null,
        editedOdds: null,
        simResult: null,
        isEditing: false,
        homeB2B: true,
        awayB2B: false,
        homeSVOverride: null,
        awaySVOverride: null,
      },
    ];

    const [updated] = applyEstimatedGoalieOverrides(rows, goalieRoster);
    expect(updated.homeSVOverride).toBe(0.906);
    expect(updated.awaySVOverride).toBe(0.914);
  });

  it("switches an already-applied estimated starter to the backup when B2B is later detected", () => {
    const rows: LinesRow[] = [
      {
        game: { homeAbbr: "BOS", awayAbbr: "TOR", gameTime: "7:00 PM ET", tvInfo: "ESPN" },
        espnOdds: null,
        editedOdds: null,
        simResult: null,
        isEditing: false,
        homeB2B: false,
        awayB2B: false,
        homeSVOverride: 0.919,
        awaySVOverride: 0.914,
      },
    ];

    const [updated] = applyEstimatedGoalieOverrides(
      rows.map((row) => ({ ...row, homeB2B: true })),
      goalieRoster,
      rows,
    );
    expect(updated.homeSVOverride).toBe(0.906);
  });
});
