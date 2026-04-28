function businessDaysRemaining(): number {
  const today = new Date();
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  let days = 0;
  for (
    let d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    d <= lastDay;
    d.setDate(d.getDate() + 1)
  ) {
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) days++;
  }
  return days;
}

export function RevenueAchievementCard({
  current,
  target,
  accent = '#F59E0B',
}: {
  current: number;
  target: number;
  accent?: string;
}) {
  const pct = target > 0 ? Math.min(Math.round((current / target) * 100), 100) : 0;
  const remain = Math.max(target - current, 0);
  const remainingDays = businessDaysRemaining();
  const w = 220;
  const h = 8;
  const filledW = (pct / 100) * w;
  const gradId = `bar-${accent.replace('#', '')}`;

  const tone =
    pct >= 100 ? 'text-kpi-up' : pct >= 80 ? 'text-amber-700' : pct >= 50 ? 'text-ink' : 'text-kpi-down';

  return (
    <div className="bg-card border border-border rounded-xl p-5 w-full flex flex-col">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-widest text-subtle">売上達成率</p>
        <span className="text-xs text-muted">残り営業日 {remainingDays}日</span>
      </div>
      <div className="flex items-baseline gap-2 mt-3">
        <p className={`font-semibold text-5xl ${tone} tabular-nums leading-none`}>{pct}</p>
        <p className="text-base text-muted">%</p>
      </div>
      <div className="mt-3">
        <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height: 8 }}>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={accent} stopOpacity="0.7" />
              <stop offset="100%" stopColor={accent} />
            </linearGradient>
          </defs>
          <rect x="0" y="0" width={w} height={h} rx="4" fill="#E2E8F0" />
          <rect x="0" y="0" width={filledW} height={h} rx="4" fill={`url(#${gradId})`} />
        </svg>
      </div>
      <div className="grid grid-cols-2 gap-3 mt-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-subtle">実績</p>
          <p className="font-mono tabular-nums text-base text-ink mt-0.5">
            ¥{Math.round(current / 10000).toLocaleString('ja-JP')}
            <span className="text-xs text-subtle ml-0.5">万</span>
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-widest text-subtle">残り</p>
          <p className="font-mono tabular-nums text-base mt-0.5" style={{ color: accent }}>
            ¥{Math.round(remain / 10000).toLocaleString('ja-JP')}
            <span className="text-xs text-subtle ml-0.5">万</span>
          </p>
        </div>
      </div>
    </div>
  );
}
