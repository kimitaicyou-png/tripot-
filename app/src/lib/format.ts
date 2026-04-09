export function formatYen(n: number): string {
  if (Math.abs(n) >= 10000) return `¥${Math.round(n / 10000).toLocaleString()}万`;
  return `¥${n.toLocaleString()}`;
}

export function formatYenRaw(n: number): string {
  return `¥${n.toLocaleString()}`;
}

export function formatPercent(n: number): string {
  return `${Math.round(n)}%`;
}

export function formatDelta(n: number): string {
  const prefix = n > 0 ? '+' : '';
  return `${prefix}${formatYen(n)}`;
}
