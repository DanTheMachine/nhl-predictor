import { describe, expect, it } from "vitest";

import {
  normalizePastedOddsText,
  parsePastedOddsValue,
  parsePastedPuckLine,
  parsePastedTotalLine,
} from "./oddsParsing";

describe("pasted odds parsing", () => {
  it("preserves half-point totals from direct unicode fractions", () => {
    expect(normalizePastedOddsText("O 5 ½")).toBe("O 5.5");
    expect(parsePastedTotalLine("O 5 ½")).toBe(5.5);
    expect(parsePastedTotalLine("U 6 ½")).toBe(6.5);
  });

  it("preserves half-point puck lines and odds values", () => {
    expect(parsePastedPuckLine("- 1 ½")).toBe(-1.5);
    expect(parsePastedPuckLine("+ 1 ½")).toBe(1.5);
    expect(parsePastedOddsValue("Even")).toBe(100);
  });

  it("handles mojibake half-point text the same way", () => {
    expect(parsePastedTotalLine("O 6 Ã‚Â½")).toBe(6.5);
    expect(parsePastedPuckLine("- 1 Ã‚Â½")).toBe(-1.5);
  });
});
