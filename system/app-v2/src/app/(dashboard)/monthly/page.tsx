import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { deals, budgets } from '@/db/schema';
import { eq, and, sql, isNull } from 'drizzle-orm';
import { PageHeader } from '@/components/ui/page-header';
import { HeroValue } from '@/components/ui/stat-card';
import { SendToHqButton } from './_components/send-to-hq-button';
import { VsBudgetCard } from './_components/vs-budget-card';
import { MonthlyKpiCards } from './_components/monthly-kpi-cards';

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

  const actualKpi = await db
    .select({
      revenue: sql<number>`COALESCE(SUM(${deals.amount}) FILTER (WHERE ${deals.stage} IN ('paid', 'invoiced') AND ${deals.paid_at} >= ${monthStart} AND ${deals.paid_at} <= ${monthEnd}), 0)::int`,
      ordered: sql<number>`COALESCE(SUM(${deals.amount}) FILTER (WHERE ${deals.stage} = 'ordered' AND ${deals.ordered_at} >= ${monthStart} AND ${deals.ordered_at} <= ${monthEnd}), 0)::int`,
    })
    .from(deals)
    .where(and(eq(deals.company_id, session.user.company_id), isNull(deals.deleted_at)))
    .then((rows) => rows[0]);

  const budgetRow = await db
    .select()
    .from(budgets)
    .where(
      and(
        eq(budgets.company_id, session.user.company_id),
        eq(budgets.year, year),
        eq(budgets.month, month),
      ),
    )
    .limit(1)
    .then((rows) => rows[0]);

  const targetRevenue = budgetRow?.target_revenue ?? 0;
  const actualRevenue = actualKpi?.revenue ?? 0;
  const progressRate = targetRevenue > 0 ? Math.round((actualRevenue / targetRevenue) * 100) : 0;
  const yearMonth = `${year}-${String(month).padStart(2, '0')}`;
  const remaining = calculateRemainingDays(year, month);

  return (
    <main className="min-h-screen bg-gray-50">
      <PageHeader
        eyebrow="MONTHLY"
        title={`${year}年 ${month}月`}
        subtitle="今月の実績 vs 計画"
        actions={
          <div className="flex items-center gap-3 flex-wrap">
            <SendToHqButton yearMonth={yearMonth} />
            <Link
              href={`/monthly/finance?ym=${yearMonth}`}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-200 text-xs font-medium text-gray-900 rounded-lg hover:bg-slate-50"
            >
              ファイナンス
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <Link
              href={`/monthly/detail/${yearMonth}`}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-200 text-xs font-medium text-gray-900 rounded-lg hover:bg-slate-50"
            >
              ドリルダウン
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        }
      />

      <div className="px-6 py-10 max-w-5xl mx-auto space-y-12">
        <HeroValue
          label="今月の売上（入金確定）"
          value={formatYen(actualRevenue)}
          sub={
            targetRevenue > 0 ? (
              <>
                目標{' '}
                <span className="font-mono tabular-nums text-gray-900">{formatYen(targetRevenue)}</span>
                {' '}に対し{' '}
                <span
                  className={`font-mono tabular-nums font-medium ${
                    progressRate >= 100
                      ? 'text-emerald-700'
                      : progressRate >= 80
                        ? 'text-gray-900'
                        : 'text-red-700'
                  }`}
                >
                  {progressRate}%
                </span>
              </>
            ) : (
              '目標未設定（事業計画から設定できます）'
            )
          }
        />

        <VsBudgetCard
          targetRevenue={targetRevenue}
          actualRevenue={actualRevenue}
          progressRate={progressRate}
        />

        <MonthlyKpiCards
          ordered={actualKpi?.ordered ?? 0}
          remainingDays={remaining}
          progressRate={progressRate}
          targetRevenue={targetRevenue}
          actualRevenue={actualRevenue}
        />
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
