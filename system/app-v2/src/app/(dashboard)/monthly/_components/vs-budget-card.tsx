function formatYen(value: number | null): string {
  return `¥${(value ?? 0).toLocaleString('ja-JP')}`;
}

export function VsBudgetCard({
  targetRevenue,
  actualRevenue,
  progressRate,
}: {
  targetRevenue: number;
  actualRevenue: number;
  progressRate: number;
}) {
  const tone =
    progressRate >= 100
      ? 'text-kpi-up'
      : progressRate >= 80
        ? 'text-ink'
        : 'text-kpi-down';
  const barColor = progressRate >= 100 ? 'bg-kpi-up' : 'bg-blue-500';

  return (
    <section className="bg-card border border-border rounded-xl p-6 shadow-sm">
      <div className="flex items-baseline justify-between mb-4">
        <p className="text-sm font-medium text-ink">vs 計画</p>
        <p className={`font-serif italic text-4xl tabular-nums leading-none ${tone}`}>
          {targetRevenue > 0 ? `${progressRate}%` : '—'}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-4 text-sm mb-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-subtle">目標</p>
          <p className="font-mono tabular-nums text-ink mt-1">{formatYen(targetRevenue)}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-subtle">実績</p>
          <p className="font-mono tabular-nums text-ink mt-1">{formatYen(actualRevenue)}</p>
        </div>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${Math.min(progressRate, 100)}%` }}
        />
      </div>
    </section>
  );
}
