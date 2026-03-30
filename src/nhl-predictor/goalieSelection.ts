import type { GoalieInfo, LinesRow } from "../nhl-core/types";

const GOALIE_SV_EPSILON = 0.0005;

function areSameGoalieSv(a: number | null, b: number | null): boolean {
  if (a == null || b == null) return a == null && b == null;
  return Math.abs(a - b) < GOALIE_SV_EPSILON;
}

export function getEstimatedGoalieOverride(
  goalieRoster: Record<string, GoalieInfo[]>,
  abbr: string,
  isB2B: boolean,
): number | null {
  const goalies = goalieRoster[abbr] ?? [];
  if (goalies.length === 0) return null;

  const selected = isB2B && goalies.length > 1 ? goalies[1] : goalies[0];
  return selected?.sv ?? null;
}

export function getEstimatedGoalieIndex(
  goalieRoster: Record<string, GoalieInfo[]>,
  abbr: string,
  isB2B: boolean,
): number | null {
  const goalies = goalieRoster[abbr] ?? [];
  if (goalies.length === 0) return null;
  return isB2B && goalies.length > 1 ? 1 : 0;
}

export function getEstimatedGoalieLabel(
  goalieRoster: Record<string, GoalieInfo[]>,
  abbr: string,
  isB2B: boolean,
  currentOverride: number | null,
): string | null {
  const estimatedOverride = getEstimatedGoalieOverride(goalieRoster, abbr, isB2B);
  if (!areSameGoalieSv(currentOverride, estimatedOverride)) return null;
  return isB2B && (goalieRoster[abbr]?.length ?? 0) > 1 ? "2nd" : "1st";
}

export function formatGoalieOverrideTag(abbr: string, value: number, label: string | null): string {
  const formattedSv = ((Math.round(value * 1000) / 1000) * 10).toFixed(2);
  return label ? `${abbr} ${formattedSv} - ${label}` : `${abbr} ${formattedSv}`;
}

export function reconcileGoalieOverride(
  currentOverride: number | null,
  wasB2B: boolean,
  isB2B: boolean,
  goalieRoster: Record<string, GoalieInfo[]>,
  abbr: string,
): number | null {
  const previousSuggested = getEstimatedGoalieOverride(goalieRoster, abbr, wasB2B);
  const nextSuggested = getEstimatedGoalieOverride(goalieRoster, abbr, isB2B);

  if (currentOverride == null) return nextSuggested;
  if (areSameGoalieSv(currentOverride, previousSuggested) || areSameGoalieSv(currentOverride, nextSuggested)) {
    return nextSuggested;
  }

  return currentOverride;
}

export function applyEstimatedGoalieOverrides(
  rows: LinesRow[],
  goalieRoster: Record<string, GoalieInfo[]>,
  previousRows?: LinesRow[],
): LinesRow[] {
  return rows.map((row, index) => {
    const previousRow = previousRows?.[index];
    return {
      ...row,
      homeSVOverride: reconcileGoalieOverride(
        row.homeSVOverride,
        previousRow?.homeB2B ?? row.homeB2B,
        row.homeB2B,
        goalieRoster,
        row.game.homeAbbr,
      ),
      awaySVOverride: reconcileGoalieOverride(
        row.awaySVOverride,
        previousRow?.awayB2B ?? row.awayB2B,
        row.awayB2B,
        goalieRoster,
        row.game.awayAbbr,
      ),
    };
  });
}
