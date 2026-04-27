import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { budgets, deals, budget_actuals } from '@/db/schema';
import { eq, and, sql, isNull, gte, lte } from 'drizzle-orm';
import { BudgetEditor } from './_components/budget-editor';
import { ActualsImportDialog } from './_components/actuals-import-dialog';
import { PageHeader } from '@/components/ui/page-header';
import { HeroValue } from '@/components/ui/stat-card';
import { SectionHeading } from '@/components/ui/section-heading';

function formatYen(value: number | null): string {
  return `¥${(value ?? 0).toLocaleString('ja-JP')}`;
}

function formatMan(value: number | null): string {
  return `${Math.round((value ?? 0) / 10000).toLocaleString('ja-JP')}万`;
}

const MONTH_LABEL = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

export default async function BudgetPage() {
  const session = await auth();
  if (!session?.user?.member_id) redirect('/login');

  const year = new Date().getFullYear();
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year, 11, 31, 23, 59, 59);

  const lastYear = year - 1;

  const [budgetRows, actuals, lastYearActuals] = await Promise.all([
    db
      .select()
      .from(budgets)
      .where(and(eq(budgets.company_id, session.user.company_id), eq(budgets.year, year)))
      .orderBy(budgets.month),
    db
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
        ),
      )
      .groupBy(sql`EXTRACT(MONTH FROM ${deals.paid_at})`),
    db
      .select({
        month: budget_actuals.month,
        revenue: budget_actuals.revenue,
      })
      .from(budget_actuals)
      .where(
        and(
          eq(budget_actuals.company_id, session.user.company_id),
          eq(budget_actuals.year, lastYear)
        )
      ),
  ]);

  const actualMap = new Map<number, number>();
  for (const a of actuals) actualMap.set(a.month, a.revenue);

  const lastYearMap = new Map<number, number>();
  for (const r of lastYearActuals) lastYearMap.set(r.month, r.revenue ?? 0);
  const lastYearTotal = Array.from(lastYearMap.values()).reduce((s, v) => s + v, 0);

  const totalTarget = budgetRows.reduce((s, b) => s + (b.target_revenue ?? 0), 0);
  const totalActual = Array.from(actualMap.values()).reduce((s, v) => s + v, 0);
  const yearProgress = totalTarget > 0 ? Math.round((totalActual / totalTarget) * 100) : 0;

  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  return (
    <main className="min-h-screen bg-surface">
      <PageHeader
        eyebrow="ANNUAL PLAN"
        title={`${year}年 事業計画`}
        subtitle="年間目標 ＆ 月別計画 vs 実績"
        actions={<ActualsImportDialog />}
      />

      <div className="px-6 py-10 max-w-5xl mx-auto space-y-12">
        <HeroValue
          label="年間 売上計画"
          value={formatYen(totalTarget)}
          sub={
            <>
              実績{' '}
              <span className="font-mono tabular-nums text-ink font-medium">
                {formatYen(totalActual)}
              </span>{' '}
              ／{' '}
              <span
                className={`font-mono tabular-nums font-medium ${
                  yearProgress >= 100
                    ? 'text-kpi-up'
                    : yearProgress >= 80
                      ? 'text-ink'
                      : 'text-kpi-down'
                }`}
              >
                {yearProgress}%
              </span>
            </>
          }
        />

        <section className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                yearProgress >= 100 ? 'bg-kpi-up' : 'bg-blue-500'
              }`}
              style={{ width: `${Math.min(yearProgress, 100)}%` }}
            />
          </div>
          <div className="grid grid-cols-3 gap-4 mt-4 text-sm">
            <div>
              <p className="text-xs uppercase tracking-wider text-subtle">目標</p>
              <p className="font-mono tabular-nums text-ink mt-1">{formatYen(totalTarget)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-subtle">実績</p>
              <p className="font-mono tabular-nums text-ink mt-1">{formatYen(totalActual)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-subtle">差</p>
              <p
                className={`font-mono tabular-nums mt-1 ${
                  totalTarget - totalActual <= 0 ? 'text-kpi-up' : 'text-ink'
                }`}
              >
                {formatYen(totalActual - totalTarget)}
              </p>
            </div>
          </div>
        </section>

        <section>
          <SectionHeading
            eyebrow="MONTHLY"
            title="月別 計画 vs 実績"
            action={
              lastYearTotal > 0 ? (
                <span className="text-xs text-subtle">
                  昨年合計 <span className="font-mono text-ink">{formatYen(lastYearTotal)}</span>
                </span>
              ) : null
            }
          />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {months.map((m) => {
              const target = budgetRows.find((b) => b.month === m)?.target_revenue ?? 0;
              const actual = actualMap.get(m) ?? 0;
              const lastYearVal = lastYearMap.get(m) ?? 0;
              const rate = target > 0 ? Math.round((actual / target) * 100) : 0;
              const tone =
                target === 0 ? 'subtle' : rate >= 100 ? 'up' : rate >= 80 ? 'default' : 'down';
              const yoyPct =
                lastYearVal > 0 ? Math.round((actual / lastYearVal - 1) * 100) : null;
              const link = `/monthly/detail/${year}-${String(m).padStart(2, '0')}`;
              return (
                <Link
                  key={m}
                  href={link}
                  className="bg-card border border-border rounded-xl p-4 shadow-sm hover:border-ink-mid transition-colors block"
                >
                  <div className="flex items-baseline justify-between mb-2">
                    <p className="text-sm font-medium text-ink">{MONTH_LABEL[m - 1]}</p>
                    <p
                      className={`font-mono tabular-nums text-xs ${
                        tone === 'up'
                          ? 'text-kpi-up'
                          : tone === 'down'
                            ? 'text-kpi-down'
                            : tone === 'subtle'
                              ? 'text-subtle'
                              : 'text-ink'
                      }`}
                    >
                      {target > 0 ? `${rate}%` : '—'}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-subtle">目標</span>
                      <span className="font-mono tabular-nums text-muted">{formatMan(target)}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-subtle">実績</span>
                      <span className="font-mono tabular-nums text-ink font-medium">
                        {formatMan(actual)}
                      </span>
                    </div>
                    {lastYearVal > 0 && (
                      <div className="flex items-center justify-between text-xs pt-1 border-t border-border mt-1">
                        <span className="text-subtle">昨年同月</span>
                        <span className="font-mono tabular-nums text-subtle">
                          {formatMan(lastYearVal)}
                          {yoyPct !== null && (
                            <span
                              className={`ml-1 ${
                                yoyPct >= 0 ? 'text-kpi-up' : 'text-kpi-down'
                              }`}
                            >
                              ({yoyPct >= 0 ? '+' : ''}
                              {yoyPct}%)
                            </span>
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="h-1 bg-slate-100 rounded-full overflow-hidden mt-3">
                    <div
                      className={`h-full rounded-full ${
                        tone === 'up'
                          ? 'bg-kpi-up'
                          : tone === 'down'
                            ? 'bg-kpi-down'
                            : 'bg-blue-500'
                      }`}
                      style={{
                        width: `${target > 0 ? Math.min(rate, 100) : 0}%`,
                      }}
                    />
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        <section className="bg-card border border-border rounded-xl p-6">
          <SectionHeading eyebrow="EDIT" title="月別目標を設定" />
          <p className="text-xs text-muted mb-4">
            ボタンをクリックすると、その月の売上・粗利・営業利益の目標を編集できます。
          </p>
          <BudgetEditor
            year={year}
            rows={budgetRows.map((b) => ({
              month: b.month,
              target_revenue: b.target_revenue ?? 0,
              target_gross_profit: b.target_gross_profit ?? 0,
              target_operating_profit: b.target_operating_profit ?? 0,
            }))}
          />
        </section>
      </div>
    </main>
  );
}
