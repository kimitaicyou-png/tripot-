export function safeDiv(numerator: number, denominator: number, fallback = 0): number {
  if (denominator === 0 || !Number.isFinite(denominator)) return fallback;
  const result = numerator / denominator;
  return Number.isFinite(result) ? result : fallback;
}

export function safePercent(part: number, total: number, fallback = 0): number {
  return Math.round(safeDiv(part, total, fallback / 100) * 100);
}

export function safeAvg(values: number[], fallback = 0): number {
  if (values.length === 0) return fallback;
  return safeDiv(
    values.reduce((a, b) => a + b, 0),
    values.length,
    fallback,
  );
}

export function safeRate(budget: number, actual: number, fallback = 0): number {
  return safePercent(actual, budget, fallback);
}

export function clampPercent(value: number, min = -999, max = 999): number {
  return Math.max(min, Math.min(max, value));
}
