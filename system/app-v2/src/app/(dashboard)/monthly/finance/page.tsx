import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { deals, estimates, budget_actuals, mf_journals, customers } from '@/db/schema';
import { eq, and, isNull, sql, gte, lte } from 'drizzle-orm';
import { PageHeader } from '@/components/ui/page-header';
import { HeroValue, StatCard } from '@/components/ui/stat-card';
import { SectionHeading } from '@/components/ui/section-heading';
import { EmptyState } from '@/components/ui/empty-state';

const SGA_CODES = ['6110', '6210', '6310', '6410', '6510', '6610', '6710', '6810'];
const FIXED_CATEGORIES = [
  { code: '6110', label: '役員報酬' },
  { code: '6210', label: '給与手当' },
  { code: '6310', label: '法定福利費' },
  { code: '6410', label: '地代家賃' },
  { code: '6510', label: '水道光熱費' },
  { code: '6610', label: '通信費' },
  { code: '6710', label: '減価償却費' },
  { code: '6810', label: 'その他販管費' },
];

function formatYen(v: number | null): string {
  return `¥${(v ?? 0).toLocaleString('ja-JP')}`;
}

function pct(v: number): string {
  return `${(v >= 0 ? '+' : '')}${(v * 100).toFixed(1)}%`;
}

type SearchParams = { ym?: string };

export default async function MonthlyFinancePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await auth();
  if (!session?.user?.member_id) redirect('/login');

  const companyId = session.user.company_id;
  const sp = await searchParams;
  const today = new Date();
  const ym = sp.ym ?? `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const [yearStr, monthStr] = ym.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);

  const monthStart = new Date(year, month - 1, 1).toISOString().slice(0, 10);
  const monthEnd = new Date(year, month, 0).toISOString().slice(0, 10);
  const prevMonthStart = new Date(year, month - 2, 1).toISOString().slice(0, 10);
  const prevMonthEnd = new Date(year, month - 1, 0).toISOString().slice(0, 10);

  const [estimateAccuracyRows, actualRow, paidDeals, fixedCostRows, prevFixedRows] = await Promise.all([
    db
      .select({
        deal_id: deals.id,
        deal_title: deals.title,
        customer_name: customers.name,
        estimate_total: sql<number>`COALESCE(MAX(${estimates.total}), 0)::int`,
        deal_amount: sql<number>`MAX(${deals.amount})::int`,
        paid_at: deals.paid_at,
      })
      .from(deals)
      .innerJoin(estimates, eq(estimates.deal_id, deals.id))
      .leftJoin(customers, eq(deals.customer_id, customers.id))
      .where(
        and(
          eq(deals.company_id, companyId),
          isNull(deals.deleted_at),
          gte(deals.paid_at, monthStart),
          lte(deals.paid_at, monthEnd),
          isNull(estimates.deleted_at)
        )
      )
      .groupBy(deals.id, deals.title, deals.paid_at, customers.name)
      .orderBy(deals.paid_at),
    db
      .select({
        revenue: budget_actuals.revenue,
        cogs: budget_actuals.cogs,
        sga: budget_actuals.sga,
        operating_profit: budget_actuals.operating_profit,
      })
      .from(budget_actuals)
      .where(
        and(
          eq(budget_actuals.company_id, companyId),
          eq(budget_actuals.year, year),
          eq(budget_actuals.month, month)
        )
      )
      .limit(1)
      .then((rows) => rows[0]),
    db
      .select({
        revenue: sql<number>`COALESCE(SUM(${deals.amount}) FILTER (WHERE ${deals.stage} IN ('paid','invoiced')), 0)::int`,
        count: sql<number>`COUNT(*) FILTER (WHERE ${deals.stage} IN ('paid','invoiced'))::int`,
      })
      .from(deals)
      .where(
        and(
          eq(deals.company_id, companyId),
          isNull(deals.deleted_at),
          gte(deals.paid_at, monthStart),
          lte(deals.paid_at, monthEnd)
        )
      )
      .then((rows) => rows[0]),
    db
      .select({
        code: mf_journals.account_code,
        amount: sql<number>`COALESCE(SUM(${mf_journals.amount}), 0)::int`,
      })
      .from(mf_journals)
      .where(
        and(
          eq(mf_journals.company_id, companyId),
          gte(mf_journals.entry_date, monthStart),
          lte(mf_journals.entry_date, monthEnd),
          sql`${mf_journals.account_code} = ANY(${SGA_CODES})`
        )
      )
      .groupBy(mf_journals.account_code),
    db
      .select({
        code: mf_journals.account_code,
        amount: sql<number>`COALESCE(SUM(${mf_journals.amount}), 0)::int`,
      })
      .from(mf_journals)
      .where(
        and(
          eq(mf_journals.company_id, companyId),
          gte(mf_journals.entry_date, prevMonthStart),
          lte(mf_journals.entry_date, prevMonthEnd),
          sql`${mf_journals.account_code} = ANY(${SGA_CODES})`
        )
      )
      .groupBy(mf_journals.account_code),
  ]);

  const accuracyData = estimateAccuracyRows.map((r) => {
    const est = r.estimate_total ?? 0;
    const act = r.deal_amount ?? 0;
    const diff = act - est;
    const ratio = est > 0 ? diff / est : 0;
    return {
      ...r,
      diff,
      ratio,
    };
  });

  const accuracyCount = accuracyData.length;
  const accuracyAvgRatio = accuracyCount > 0
    ? accuracyData.reduce((s, r) => s + r.ratio, 0) / accuracyCount
    : 0;
  const accuracyOver = accuracyData.filter((r) => r.ratio > 0).length;
  const accuracyUnder = accuracyData.filter((r) => r.ratio < 0).length;

  const finalRevenue = actualRow?.revenue ?? paidDeals?.revenue ?? 0;
  const finalCogs = actualRow?.cogs ?? 0;
  const finalSga = actualRow?.sga ?? fixedCostRows.reduce((s, r) => s + r.amount, 0);
  const finalOp = actualRow?.operating_profit ?? finalRevenue - finalCogs - finalSga;
  const finalGp = finalRevenue - finalCogs;

  const fixedTotal = fixedCostRows.reduce((s, r) => s + r.amount, 0);
  const prevFixedTotal = prevFixedRows.reduce((s, r) => s + r.amount, 0);
  const fixedRatio = prevFixedTotal > 0 ? (fixedTotal - prevFixedTotal) / prevFixedTotal : 0;

  const fixedByCategory = FIXED_CATEGORIES.map((cat) => {
    const curr = fixedCostRows.find((r) => r.code === cat.code)?.amount ?? 0;
    const prev = prevFixedRows.find((r) => r.code === cat.code)?.amount ?? 0;
    const diff = prev > 0 ? (curr - prev) / prev : 0;
    return { ...cat, curr, prev, diff };
  });

  const hasMfData = fixedTotal > 0 || prevFixedTotal > 0;

  const prevYm = (() => {
    const d = new Date(year, month - 2, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  })();
  const nextYm = (() => {
    const d = new Date(year, month, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  })();

  return (
    <main className="min-h-screen bg-surface">
      <PageHeader
        eyebrow="MONTHLY · FINANCE"
        title={`${year}年 ${month}月 ファイナンスレポート`}
        subtitle="見積精度 / 最終利益 / 固定費"
        back={{ href: '/monthly', label: '月次レポート' }}
        actions={
          <div className="flex items-center gap-2">
            <Link
              href={`/monthly/finance?ym=${prevYm}`}
              className="px-3 py-1.5 text-xs border border-border rounded text-muted hover:text-ink hover:border-ink transition-colors"
            >
              ← {prevYm}
            </Link>
            <Link
              href={`/monthly/finance?ym=${nextYm}`}
              className="px-3 py-1.5 text-xs border border-border rounded text-muted hover:text-ink hover:border-ink transition-colors"
            >
              {nextYm} →
            </Link>
          </div>
        }
      />

      <div className="px-6 py-10 max-w-5xl mx-auto space-y-12">
        <section className="space-y-4">
          <SectionHeading
            eyebrow="ESTIMATE ACCURACY"
            title="見積精度（当月入金確定案件）"
            count={accuracyCount}
          />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              label="対象案件"
              value={`${accuracyCount}件`}
              sub="見積→入金"
            />
            <StatCard
              label="平均誤差"
              value={pct(accuracyAvgRatio)}
              sub={accuracyAvgRatio > 0 ? '見積より高く受注' : accuracyAvgRatio < 0 ? '見積より低く受注' : '—'}
              tone={Math.abs(accuracyAvgRatio) <= 0.05 ? 'up' : 'default'}
            />
            <StatCard
              label="増額成立"
              value={`${accuracyOver}件`}
              sub="見積超え"
              tone="up"
            />
            <StatCard
              label="減額成立"
              value={`${accuracyUnder}件`}
              sub="見積未満"
              tone={accuracyUnder > 0 ? 'down' : 'default'}
            />
          </div>
          {accuracyCount === 0 ? (
            <EmptyState
              icon="◌"
              title="当月入金 + 見積登録済の案件がありません"
              description="見積を登録した案件が当月入金確定すると精度集計されます"
            />
          ) : (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-bg border-b border-border">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs uppercase tracking-widest text-subtle font-medium">案件</th>
                    <th className="px-4 py-3 text-left text-xs uppercase tracking-widest text-subtle font-medium">顧客</th>
                    <th className="px-4 py-3 text-right text-xs uppercase tracking-widest text-subtle font-medium">見積</th>
                    <th className="px-4 py-3 text-right text-xs uppercase tracking-widest text-subtle font-medium">入金</th>
                    <th className="px-4 py-3 text-right text-xs uppercase tracking-widest text-subtle font-medium">差額</th>
                    <th className="px-4 py-3 text-right text-xs uppercase tracking-widest text-subtle font-medium">誤差率</th>
                  </tr>
                </thead>
                <tbody>
                  {accuracyData.map((r) => (
                    <tr key={r.deal_id} className="border-b border-border last:border-b-0">
                      <td className="px-4 py-3">
                        <Link href={`/deals/${r.deal_id}`} className="text-ink hover:underline">
                          {r.deal_title}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-muted">{r.customer_name ?? '—'}</td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums text-muted">{formatYen(r.estimate_total)}</td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums text-ink">{formatYen(r.deal_amount)}</td>
                      <td className={`px-4 py-3 text-right font-mono tabular-nums ${r.diff > 0 ? 'text-kpi-up' : r.diff < 0 ? 'text-kpi-down' : 'text-ink'}`}>
                        {r.diff >= 0 ? '+' : ''}{formatYen(r.diff)}
                      </td>
                      <td className={`px-4 py-3 text-right font-mono tabular-nums ${r.ratio > 0 ? 'text-kpi-up' : r.ratio < 0 ? 'text-kpi-down' : 'text-ink'}`}>
                        {pct(r.ratio)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="space-y-4">
          <SectionHeading
            eyebrow="FINAL PROFIT"
            title="最終利益レポート（当月）"
          />
          <HeroValue
            label={`${year}年${month}月 営業利益`}
            value={formatYen(finalOp)}
            sub={
              actualRow
                ? '出典：budget_actuals 確定値'
                : `推計（売上 ${formatYen(finalRevenue)} − 固定費 ${formatYen(finalSga)}）`
            }
            tone={finalOp > 0 ? 'up' : finalOp < 0 ? 'down' : 'default'}
          />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="売上" value={formatYen(finalRevenue)} sub={`${paidDeals?.count ?? 0}件入金`} />
            <StatCard label="売上原価" value={formatYen(finalCogs)} sub={actualRow ? '確定' : 'MF未連携'} />
            <StatCard label="粗利" value={formatYen(finalGp)} tone={finalGp > 0 ? 'up' : 'down'} />
            <StatCard label="固定費" value={formatYen(finalSga)} sub={actualRow ? '確定' : '推計'} />
          </div>
        </section>

        <section className="space-y-4">
          <SectionHeading
            eyebrow="FIXED COSTS"
            title="固定費内訳（当月 vs 前月）"
            count={fixedByCategory.filter((c) => c.curr > 0 || c.prev > 0).length}
          />
          {!hasMfData ? (
            <EmptyState
              icon="◌"
              title="MFクラウド連携データがありません"
              description="販管費科目（6110-6810）の仕訳が必要"
              cta={{ label: 'MF連携設定へ', href: '/settings/mf' }}
            />
          ) : (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-bg border-b border-border">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs uppercase tracking-widest text-subtle font-medium">勘定科目</th>
                    <th className="px-4 py-3 text-right text-xs uppercase tracking-widest text-subtle font-medium">当月</th>
                    <th className="px-4 py-3 text-right text-xs uppercase tracking-widest text-subtle font-medium">前月</th>
                    <th className="px-4 py-3 text-right text-xs uppercase tracking-widest text-subtle font-medium">前月比</th>
                  </tr>
                </thead>
                <tbody>
                  {fixedByCategory.filter((c) => c.curr > 0 || c.prev > 0).map((c) => (
                    <tr key={c.code} className="border-b border-border last:border-b-0">
                      <td className="px-4 py-3">
                        <span className="text-ink">{c.label}</span>
                        <span className="text-xs font-mono text-subtle ml-2">{c.code}</span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums text-ink">{formatYen(c.curr)}</td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums text-muted">{formatYen(c.prev)}</td>
                      <td className={`px-4 py-3 text-right font-mono tabular-nums ${c.diff > 0.05 ? 'text-kpi-down' : c.diff < -0.05 ? 'text-kpi-up' : 'text-muted'}`}>
                        {pct(c.diff)}
                      </td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-border bg-bg">
                    <td className="px-4 py-3 font-medium text-ink">合計</td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums font-serif italic text-2xl text-ink">{formatYen(fixedTotal)}</td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-muted">{formatYen(prevFixedTotal)}</td>
                    <td className={`px-4 py-3 text-right font-mono tabular-nums ${fixedRatio > 0.05 ? 'text-kpi-down' : fixedRatio < -0.05 ? 'text-kpi-up' : 'text-muted'}`}>
                      {pct(fixedRatio)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
