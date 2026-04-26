type Stage = { label: string; count: number };

export function FunnelCard({
  data,
  accent = '#0F172A',
}: {
  data: Stage[];
  accent?: string;
}) {
  if (data.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-5 w-full">
        <p className="text-xs uppercase tracking-widest text-subtle">案件ファネル</p>
        <p className="text-sm text-muted mt-3">まだ案件がありません</p>
      </div>
    );
  }

  const max = data[0]?.count || 1;
  const last = data[data.length - 1]!;
  const overall = max > 0 ? Math.round((last.count / max) * 100) : 0;

  return (
    <div className="bg-card border border-border rounded-xl p-5 w-full flex flex-col">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-subtle">案件ファネル</p>
          <div className="flex items-baseline gap-2 mt-1">
            <p className="font-serif italic text-3xl text-ink tabular-nums">{overall}</p>
            <p className="text-sm text-muted">% 総合転換率</p>
          </div>
        </div>
      </div>
      <div className="flex-1 mt-3 space-y-2 flex flex-col justify-around">
        {data.map((d, i) => {
          const pct = (d.count / max) * 100;
          const conv =
            i > 0 && data[i - 1]!.count > 0
              ? Math.round((d.count / data[i - 1]!.count) * 100)
              : null;
          const opacity = 1 - (i / data.length) * 0.45;
          return (
            <div key={d.label}>
              <div className="flex items-baseline justify-between mb-1">
                <span className="text-xs font-medium text-ink-mid">{d.label}</span>
                <div className="flex items-baseline gap-2">
                  {conv !== null && (
                    <span
                      className={`text-xs font-medium tabular-nums ${
                        conv >= 60
                          ? 'text-kpi-up'
                          : conv >= 40
                            ? 'text-muted'
                            : 'text-amber-700'
                      }`}
                    >
                      {conv}%
                    </span>
                  )}
                  <span className="text-sm font-medium text-ink tabular-nums">{d.count}</span>
                </div>
              </div>
              <div className="h-2 bg-surface rounded-full overflow-hidden border border-border">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${pct}%`, backgroundColor: accent, opacity }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
