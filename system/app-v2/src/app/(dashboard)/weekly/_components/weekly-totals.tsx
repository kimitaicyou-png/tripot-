import { StatCard } from '@/components/ui/stat-card';

type Totals = {
  activeCount: number;
  calls: number;
  meetings: number;
  proposals: number;
};

export function WeeklyTotals({ totals }: { totals: Totals }) {
  return (
    <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatCard label="進行中の案件" value={totals.activeCount} />
      <StatCard label="今週の電話" value={totals.calls} />
      <StatCard label="今週の商談" value={totals.meetings} />
      <StatCard label="今週の提案" value={totals.proposals} />
    </section>
  );
}
