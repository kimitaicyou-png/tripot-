/**
 * 月次会議画面 — 会社KPI vs 計画
 *
 * 隊長思想「月次会議：vs 計画 → 着地」
 */

import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { deals, budgets } from '@/db/schema';
import { eq, and, sql, isNull, gte, lte } from 'drizzle-orm';

function formatYen(value: number | null): string {
  return `¥${(value ?? 0).toLocaleString('ja-JP')}`;
}

function formatMan(value: number | null): string {
  return `${Math.round((value ?? 0) / 10000).toLocaleString('ja-JP')}万`;
}

export default async function MonthlyPage() {
  const session = await auth();
  if (!session?.user?.member_id) redirect('/login');

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0, 23, 59, 59);

  // 当月実績
  const actualKpi = await db
    .select({
      revenue: sql<number>`COALESCE(SUM(${deals.amount}) FILTER (WHERE ${deals.stage} IN ('paid', 'invoiced') AND ${deals.paid_at} >= ${monthStart} AND ${deals.paid_at} <= ${monthEnd}), 0)::int`,
      ordered: sql<number>`COALESCE(SUM(${deals.amount}) FILTER (WHERE ${deals.stage} = 'ordered' AND ${deals.ordered_at} >= ${monthStart} AND ${deals.ordered_at} <= ${monthEnd}), 0)::int`,
    })
    .from(deals)
    .where(and(eq(deals.company_id, session.user.company_id), isNull(deals.deleted_at)))
    .then((rows) => rows[0]);

  // 当月予算
  const budgetRow = await db
    .select()
    .from(budgets)
    .where(and(eq(budgets.company_id, session.user.company_id), eq(budgets.year, year), eq(budgets.month, month)))
    .limit(1)
    .then((rows) => rows[0]);

  const targetRevenue = budgetRow?.target_revenue ?? 0;
  const actualRevenue = actualKpi?.revenue ?? 0;
  const progressRate = targetRevenue > 0 ? Math.round((actualRevenue / targetRevenue) * 100) : 0;

  return (
    <main className="min-h-screen bg-surface">
      <header className="bg-card border-b border-border px-6 py-4">
        <h1 className="text-lg font-semibold text-ink">月次レポート</h1>
        <p className="text-xs text-subtle mt-1 font-mono">{year}年 {month}月</p>
      </header>

      <div className="px-6 py-8 max-w-5xl mx-auto">
        {/* h1：当月売上デカ表示 */}
        <section>
          <p className="text-sm text-muted">今月の売上（入金確定）</p>
          <h2 className="font-serif italic text-6xl md:text-8xl text-ink tracking-tight tabular-nums mt-2">
            {formatYen(actualRevenue)}
          </h2>
        </section>

        {/* vs 計画 */}
        <section className="mt-8 bg-card border border-border rounded-xl p-6 shadow-sm">
          <div className="flex items-baseline justify-between mb-3">
            <p className="text-sm font-medium text-ink">vs 計画</p>
            <p className={`font-serif italic text-3xl tabular-nums ${progressRate >= 100 ? 'text-kpi-up' : progressRate >= 80 ? 'text-ink' : 'text-kpi-down'}`}>
              {progressRate}%
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-subtle">目標</p>
              <p className="font-mono tabular-nums text-ink mt-1">{formatYen(targetRevenue)}</p>
            </div>
            <div>
              <p className="text-xs text-subtle">実績</p>
              <p className="font-mono tabular-nums text-ink mt-1">{formatYen(actualRevenue)}</p>
            </div>
          </div>
          {/* プログレスバー */}
          <div className="mt-4 h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${progressRate >= 100 ? 'bg-kpi-up' : 'bg-blue-500'}`}
              style={{ width: `${Math.min(progressRate, 100)}%` }}
            />
          </div>
        </section>

        {/* 当月の動き */}
        <section className="mt-6 grid grid-cols-2 gap-4">
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
            <p className="text-xs text-subtle">今月の受注</p>
            <p className="font-serif italic text-3xl text-ink mt-1 tabular-nums">{formatMan(actualKpi?.ordered ?? 0)}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
            <p className="text-xs text-subtle">残営業日</p>
            <p className="font-serif italic text-3xl text-ink mt-1 tabular-nums">{calculateRemainingDays(year, month)}日</p>
          </div>
        </section>
      </div>
    </main>
  );
}

function calculateRemainingDays(year: number, month: number): number {
  const today = new Date();
  const lastDay = new Date(year, month, 0).getDate();
  const currentDay = today.getDate();
  let remaining = 0;
  for (let d = currentDay; d <= lastDay; d++) {
    const day = new Date(year, month - 1, d).getDay();
    if (day !== 0 && day !== 6) remaining++;
  }
  return remaining;
}
