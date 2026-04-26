import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { actions, members, deals } from '@/db/schema';
import { eq, and, sql, isNull, gte } from 'drizzle-orm';
import { WeeklyTabs } from './_components/tabs';

function formatYen(value: number | null): string {
  return `¥${(value ?? 0).toLocaleString('ja-JP')}`;
}

export default async function WeeklyPage() {
  const session = await auth();
  if (!session?.user?.member_id) redirect('/login');

  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 6);
  weekStart.setHours(0, 0, 0, 0);

  // チーム別週次行動量
  const memberStats = await db
    .select({
      id: members.id,
      name: members.name,
      total: sql<number>`COALESCE(COUNT(${actions.id}), 0)::int`,
      calls: sql<number>`COALESCE(COUNT(${actions.id}) FILTER (WHERE ${actions.type} = 'call'), 0)::int`,
      meetings: sql<number>`COALESCE(COUNT(${actions.id}) FILTER (WHERE ${actions.type} = 'meeting'), 0)::int`,
      proposals: sql<number>`COALESCE(COUNT(${actions.id}) FILTER (WHERE ${actions.type} = 'proposal'), 0)::int`,
    })
    .from(members)
    .leftJoin(
      actions,
      and(eq(actions.member_id, members.id), gte(actions.occurred_at, weekStart))
    )
    .where(
      and(
        eq(members.company_id, session.user.company_id),
        eq(members.status, 'active'),
        isNull(members.deleted_at),
      )
    )
    .groupBy(members.id, members.name)
    .orderBy(sql`COUNT(${actions.id}) DESC`);

  // 会社全体KPI
  const companyKpi = await db
    .select({
      revenue: sql<number>`COALESCE(SUM(${deals.amount}) FILTER (WHERE ${deals.stage} IN ('paid', 'invoiced')), 0)::int`,
      activeCount: sql<number>`COUNT(*) FILTER (WHERE ${deals.stage} IN ('proposing', 'ordered', 'in_production'))::int`,
    })
    .from(deals)
    .where(and(eq(deals.company_id, session.user.company_id), isNull(deals.deleted_at)))
    .then((rows) => rows[0]);

  return (
    <main className="min-h-screen bg-surface">
      <header className="bg-card border-b border-border px-6 py-4">
        <h1 className="text-lg font-semibold text-ink">週次レポート</h1>
        <p className="text-xs text-subtle mt-1 font-mono">
          {weekStart.toLocaleDateString('ja-JP')} 〜 {new Date().toLocaleDateString('ja-JP')}
        </p>
      </header>

      <WeeklyTabs />

      <div className="px-6 py-8 max-w-5xl mx-auto">
        <section className="mb-8">
          <p className="text-sm text-muted">会社全体の売上（入金確定）</p>
          <h2 className="font-serif italic text-5xl md:text-7xl text-ink tracking-tight tabular-nums mt-2">
            {formatYen(companyKpi?.revenue ?? 0)}
          </h2>
          <p className="text-sm text-muted mt-2">進行中：<span className="font-mono tabular-nums text-ink font-medium">{companyKpi?.activeCount ?? 0}</span> 件</p>
        </section>

        <section>
          <h3 className="text-sm font-medium text-ink mb-4">メンバー別 行動量（直近7日）</h3>
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-slate-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted">メンバー</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-muted">合計</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-muted">電話</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-muted">商談</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-muted">提案</th>
                </tr>
              </thead>
              <tbody>
                {memberStats.map((m) => (
                  <tr key={m.id} className="border-b border-border last:border-0 hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm text-ink font-medium">{m.name}</td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-ink font-semibold">{m.total}</td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-muted">{m.calls}</td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-muted">{m.meetings}</td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-muted">{m.proposals}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
