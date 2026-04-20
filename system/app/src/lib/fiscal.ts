export function getFiscalStartMonth(): number {
  if (typeof window === 'undefined') return 4;
  try {
    const raw = localStorage.getItem('fiscal_start_month');
    if (!raw) return 4;
    const n = Number(raw);
    return Number.isInteger(n) && n >= 1 && n <= 12 ? n : 4;
  } catch { return 4; }
}

export function getCurrentFiscalMonthIdx(date: Date = new Date()): number {
  const start = getFiscalStartMonth();
  const m = date.getMonth() + 1;
  return (m - start + 12) % 12;
}

export function fiscalMonthLabels(): string[] {
  const start = getFiscalStartMonth();
  return Array.from({ length: 12 }, (_, i) => `${((start - 1 + i) % 12) + 1}月`);
}
