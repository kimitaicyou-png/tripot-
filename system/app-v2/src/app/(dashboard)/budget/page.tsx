import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { budgets, deals } from '@/db/schema';
import { eq, and, sql, isNull, gte, lte } from 'drizzle-orm';

function formatYen(value: number | null): string {
  return `¥${(value ?? 0).toLocaleString('ja-JP')}`;
}

function formatMan(value: number | null): string {
  return `${Math.round((value ?? 0) / 10000).toLocaleString('ja-JP')}万`;
}

export default async function BudgetPage() {
  const session = await auth();
  if (!session?.user?.member_id) redirect('/login');

  const year = new Date().getFullYear();
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year, 11, 31, 23, 59, 59);

  // 当年予算
  const budgetRows = await db
    .select()
    .from(budgets)
    .where(and(eq(budgets.company_id, session.user.company_id), eq(budgets.year, year)))
    .orderBy(budgets.month);

  // 当年実績（月別）
  const actuals = await db
    .select({
      month: sql<number>`EXTRACT(MONTH FROM ${deals.paid_at})::int`,
      revenue: sql<number>`COALESCE(SUM(${deals.amount}), 0)::int`,
    })
    .from(deals)
    .where(
      and(
        eq(deals.company_id, session.user.company_id),
        isNull(deals.deleted_at),
        sql`${deals.stage} IN ('paid', 'invoiced')`,
        gte(deals.paid_at, yearStart.toISOString().slice(0, 10)),
        lte(deals.paid_at, yearEnd.toISOString().slice(0, 10)),
      )
    )
    .groupBy(sql`EXTRACT(MONTH FROM ${deals.paid_at})`);

  const actualMap = new Map<number, number>();
  for (const a of actuals) actualMap.set(a.month, a.revenue);

  const totalTarget = budgetRows.reduce((s, b) => s + (b.target_revenue ?? 0), 0);
  const totalActual = Array.from(actualMap.values()).reduce((s, v) => s + v, 0);
  const yearProgress = totalTarget > 0 ? Math.round((totalActual / totalTarget) * 100) : 0;

  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  return (
    <main className="min-h-screen bg-surface">
      <header className="bg-card border-b border-border px-6 py-4">
        <h1 className="text-lg font-semibold text-ink">事業計画</h1>
        <p className="text-xs text-subtle mt-1 font-mono">{year}年</p>
      </header>

      <div className="px-6 py-8 max-w-5xl mx-auto space-y-8">
        <section className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <p className="text-sm text-muted">年間 売上計画</p>
          <h2 className="font-serif italic text-5xl text-ink tracking-tight tabular-nums mt-2">
            {formatYen(totalTarget)}
          </h2>
          <div className="mt-4 flex items-baseline gap-3">
            <p className="text-sm text-muted">実績</p>
            <p className="font-mono tabular-nums text-xl text-ink">{formatYen(totalActual)}</p>
            <p className={`font-serif italic text-2xl tabular-nums ${yearProgress >= 100 ? 'text-kpi-up' : yearProgress >= 80 ? 'text-ink' : 'text-kpi-down'}`}>
              ({yearProgress}%)
            </p>
          </div>
          <div className="mt-3 h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${yearProgress >= 100 ? 'bg-kpi-up' : 'bg-blue-500'}`}
              style={{ width: `${Math.min(yearProgress, 100)}%` }}
            />
          </div>
        </section>

        <section>
          <h3 className="text-sm font-medium text-ink mb-4">月別 計画 vs 実績</h3>
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-slate-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted">月</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-muted">目標</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-muted">実績</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-muted">進捗</th>
                </tr>
              </thead>
              <tbody>
                {months.map((m) => {
                  const target = budgetRows.find((b) => b.month === m)?.target_revenue ?? 0;
                  const actual = actualMap.get(m) ?? 0;
                  const rate = target > 0 ? Math.round((actual / target) * 100) : 0;
                  return (
                    <tr key={m} className="border-b border-border last:border-0">
                      <td className="px-4 py-3 text-sm text-ink font-medium">{m}月</td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums text-sm text-muted">{formatMan(target)}</td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums text-sm text-ink font-semibold">{formatMan(actual)}</td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums text-sm">
                        <span className={rate >= 100 ? 'text-kpi-up' : rate >= 80 ? 'text-ink' : 'text-kpi-down'}>
                          {target > 0 ? `${rate}%` : '—'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <p className="text-xs text-subtle text-center">
          ※ 年間目標の設定は明日朝の合議で（API実装は明朝）
        </p>
      </div>
    </main>
  );
}
