import { StatCard } from '@/components/ui/stat-card';

function formatMan(value: number | null): string {
  return `${Math.round((value ?? 0) / 10000).toLocaleString('ja-JP')}万`;
}

export function MonthlyKpiCards({
  ordered,
  remainingDays,
  progressRate,
  targetRevenue,
  actualRevenue,
}: {
  ordered: number;
  remainingDays: number;
  progressRate: number;
  targetRevenue: number;
  actualRevenue: number;
}) {
  return (
    <section className="grid grid-cols-2 md:grid-cols-3 gap-4">
      <StatCard label="今月の受注" value={formatMan(ordered)} />
      <StatCard
        label="残営業日"
        value={`${remainingDays}日`}
        tone={remainingDays <= 3 ? 'down' : 'default'}
      />
      <StatCard
        label="進捗"
        value={`${progressRate}%`}
        tone={progressRate >= 100 ? 'up' : progressRate < 80 ? 'down' : 'default'}
        sub={targetRevenue > 0 ? `差 ${formatMan(targetRevenue - actualRevenue)}` : undefined}
      />
    </section>
  );
}
