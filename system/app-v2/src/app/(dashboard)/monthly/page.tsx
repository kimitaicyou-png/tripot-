import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { deals, budgets } from '@/db/schema';
import { eq, and, sql, isNull } from 'drizzle-orm';
import { PageHeader } from '@/components/ui/page-header';
import { HeroValue, StatCard } from '@/components/ui/stat-card';
import { SendToHqButton } from './_components/send-to-hq-button';

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
    <main className="min-h-screen bg-surface">
      <PageHeader
        eyebrow="MONTHLY"
        title={`${year}年 ${month}月`}
        subtitle="今月の実績 vs 計画"
        actions={
          <div className="flex items-center gap-3 flex-wrap">
            <SendToHqButton yearMonth={yearMonth} />
            <Link
              href={`/monthly/finance?ym=${yearMonth}`}
              className="px-3 py-1.5 bg-card border border-border text-xs font-medium text-ink rounded-lg hover:bg-slate-50"
            >
              ファイナンス →
            </Link>
            <Link
              href={`/monthly/detail/${yearMonth}`}
              className="px-3 py-1.5 bg-card border border-border text-xs font-medium text-ink rounded-lg hover:bg-slate-50"
            >
              ドリルダウン →
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
                <span className="font-mono tabular-nums text-ink">{formatYen(targetRevenue)}</span>
                {' '}に対し{' '}
                <span
                  className={`font-mono tabular-nums font-medium ${
                    progressRate >= 100
                      ? 'text-kpi-up'
                      : progressRate >= 80
                        ? 'text-ink'
                        : 'text-kpi-down'
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

        <section className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <div className="flex items-baseline justify-between mb-4">
            <p className="text-sm font-medium text-ink">vs 計画</p>
            <p
              className={`font-serif italic text-4xl tabular-nums leading-none ${
                progressRate >= 100
                  ? 'text-kpi-up'
                  : progressRate >= 80
                    ? 'text-ink'
                    : 'text-kpi-down'
              }`}
            >
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
              className={`h-full rounded-full transition-all ${
                progressRate >= 100 ? 'bg-kpi-up' : 'bg-blue-500'
              }`}
              style={{ width: `${Math.min(progressRate, 100)}%` }}
            />
          </div>
        </section>

        <section className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <StatCard label="今月の受注" value={formatMan(actualKpi?.ordered ?? 0)} />
          <StatCard
            label="残営業日"
            value={`${remaining}日`}
            tone={remaining <= 3 ? 'down' : 'default'}
          />
          <StatCard
            label="進捗"
            value={`${progressRate}%`}
            tone={progressRate >= 100 ? 'up' : progressRate < 80 ? 'down' : 'default'}
            sub={targetRevenue > 0 ? `差 ${formatMan(targetRevenue - actualRevenue)}` : undefined}
          />
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
