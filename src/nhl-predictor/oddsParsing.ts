const HALF_POINT_PATTERN = /(?:Ãƒâ€šÃ‚Â½|Ã‚Â½|Â½|½)/g;

function normalizeHalfPoints(raw: string): string {
  return raw
    .replace(/(\d+)\s*(?:Ãƒâ€šÃ‚Â½|Ã‚Â½|Â½|½)/g, "$1.5")
    .replace(HALF_POINT_PATTERN, ".5");
}

export function normalizePastedOddsText(raw: string): string {
  return normalizeHalfPoints(raw)
    .replace(/[Ã¢â‚¬â€œÃ¢â‚¬â€Ã¢Ë†â€™–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

export function parsePastedOddsValue(raw: string): number {
  const normalized = normalizePastedOddsText(raw).replace(/\s/g, "");
  if (/^even$/i.test(normalized)) return 100;

  const value = parseFloat(normalized.replace(/[^0-9.+-]/g, ""));
  return Number.isNaN(value) ? 0 : value;
}

export function parsePastedPuckLine(raw: string): number {
  const normalized = normalizePastedOddsText(raw).replace(/\s/g, "");
  const match = normalized.match(/([+-]?\d+\.?\d*)/);
  return match ? parseFloat(match[1]) : -1.5;
}

export function parsePastedTotalLine(raw: string): number {
  const normalized = normalizePastedOddsText(raw);
  const match = normalized.match(/^[OoUu]\s*([+-]?\d+\.?\d*)/);
  return match ? parseFloat(match[1]) : 5.5;
}
