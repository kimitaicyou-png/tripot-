import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { deals, members, customers, actions, budgets } from '@/db/schema';
import { eq, and, sql, isNull, gte, lte, desc } from 'drizzle-orm';
import { PageHeader } from '@/components/ui/page-header';
import { HeroValue, StatCard } from '@/components/ui/stat-card';
import { SectionHeading } from '@/components/ui/section-heading';
import { EmptyState } from '@/components/ui/empty-state';

const STAGE_LABEL: Record<string, string> = {
  prospect: '見込み',
  proposing: '提案中',
  ordered: '受注',
  in_production: '制作中',
  delivered: '納品済',
  acceptance: '検収',
  invoiced: '請求済',
  paid: '入金済',
  lost: '失注',
};

const STAGE_COLOR: Record<string, string> = {
  prospect: 'bg-slate-100 text-slate-700',
  proposing: 'bg-blue-50 text-blue-700',
  ordered: 'bg-amber-50 text-amber-700',
  in_production: 'bg-indigo-50 text-indigo-700',
  delivered: 'bg-purple-50 text-purple-700',
  acceptance: 'bg-pink-50 text-pink-700',
  invoiced: 'bg-rose-50 text-rose-700',
  paid: 'bg-emerald-50 text-emerald-700',
  lost: 'bg-red-50 text-red-700',
};

function formatYen(value: number | null): string {
  return `¥${(value ?? 0).toLocaleString('ja-JP')}`;
}

function formatMan(value: number | null): string {
  return `${Math.round((value ?? 0) / 10000).toLocaleString('ja-JP')}万`;
}

function parseYearMonth(s: string): { year: number; month: number } | null {
  const m = /^(\d{4})-(\d{2})$/.exec(s);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  if (!Number.isFinite(year) || !Number.isFinite(month)) return null;
  if (month < 1 || month > 12) return null;
  return { year, month };
}

export default async function MonthlyDetailPage({
  params,
}: {
  params: Promise<{ yearMonth: string }>;
}) {
  const session = await auth();
  if (!session?.user?.member_id) redirect('/login');

  const { yearMonth } = await params;
  const parsed = parseYearMonth(yearMonth);
  if (!parsed) notFound();
  const { year, month } = parsed;

  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0, 23, 59, 59);
  const monthStartIso = monthStart.toISOString().slice(0, 10);
  const monthEndIso = `${year}-${String(month).padStart(2, '0')}-${String(monthEnd.getDate()).padStart(2, '0')}`;

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

  const paidDeals = await db
    .select({
      id: deals.id,
      title: deals.title,
      stage: deals.stage,
      amount: deals.amount,
      paid_at: deals.paid_at,
      assignee_name: members.name,
      customer_name: customers.name,
    })
    .from(deals)
    .leftJoin(members, eq(deals.assignee_id, members.id))
    .leftJoin(customers, eq(deals.customer_id, customers.id))
    .where(
      and(
        eq(deals.company_id, session.user.company_id),
        isNull(deals.deleted_at),
        sql`${deals.stage} IN ('paid', 'invoiced')`,
        gte(deals.paid_at, monthStartIso),
        lte(deals.paid_at, monthEndIso),
      ),
    )
    .orderBy(desc(deals.paid_at));

  const orderedDeals = await db
    .select({
      id: deals.id,
      amount: deals.amount,
      ordered_at: deals.ordered_at,
    })
    .from(deals)
    .where(
      and(
        eq(deals.company_id, session.user.company_id),
        isNull(deals.deleted_at),
        gte(deals.ordered_at, monthStartIso),
        lte(deals.ordered_at, monthEndIso),
      ),
    );

  const byCustomer = await db
    .select({
      id: customers.id,
      name: customers.name,
      revenue: sql<number>`COALESCE(SUM(${deals.amount}), 0)::int`,
      count: sql<number>`COUNT(${deals.id})::int`,
    })
    .from(customers)
    .leftJoin(
      deals,
      and(
        eq(deals.customer_id, customers.id),
        sql`${deals.stage} IN ('paid', 'invoiced')`,
        gte(deals.paid_at, monthStartIso),
        lte(deals.paid_at, monthEndIso),
        isNull(deals.deleted_at),
      ),
    )
    .where(and(eq(customers.company_id, session.user.company_id), isNull(customers.deleted_at)))
    .groupBy(customers.id, customers.name)
    .having(sql`COUNT(${deals.id}) > 0`)
    .orderBy(desc(sql`SUM(${deals.amount})`));

  const byAssignee = await db
    .select({
      id: members.id,
      name: members.name,
      revenue: sql<number>`COALESCE(SUM(${deals.amount}), 0)::int`,
      count: sql<number>`COUNT(${deals.id})::int`,
    })
    .from(members)
    .leftJoin(
      deals,
      and(
        eq(deals.assignee_id, members.id),
        sql`${deals.stage} IN ('paid', 'invoiced')`,
        gte(deals.paid_at, monthStartIso),
        lte(deals.paid_at, monthEndIso),
        isNull(deals.deleted_at),
      ),
    )
    .where(
      and(
        eq(members.company_id, session.user.company_id),
        eq(members.status, 'active'),
        isNull(members.deleted_at),
      ),
    )
    .groupBy(members.id, members.name)
    .having(sql`COUNT(${deals.id}) > 0`)
    .orderBy(desc(sql`SUM(${deals.amount})`));

  const actionStats = await db
    .select({
      total: sql<number>`COUNT(*)::int`,
      calls: sql<number>`COUNT(*) FILTER (WHERE ${actions.type} = 'call')::int`,
      meetings: sql<number>`COUNT(*) FILTER (WHERE ${actions.type} = 'meeting')::int`,
      proposals: sql<number>`COUNT(*) FILTER (WHERE ${actions.type} = 'proposal')::int`,
    })
    .from(actions)
    .where(
      and(
        eq(actions.company_id, session.user.company_id),
        gte(actions.occurred_at, monthStart),
        lte(actions.occurred_at, monthEnd),
      ),
    )
    .then((rows) => rows[0]);

  const totalRevenue = paidDeals.reduce((s, d) => s + (d.amount ?? 0), 0);
  const totalOrdered = orderedDeals.reduce((s, d) => s + (d.amount ?? 0), 0);
  const targetRevenue = budgetRow?.target_revenue ?? 0;
  const progressRate = targetRevenue > 0 ? Math.round((totalRevenue / targetRevenue) * 100) : 0;

  const prev = month === 1 ? `${year - 1}-12` : `${year}-${String(month - 1).padStart(2, '0')}`;
  const next = month === 12 ? `${year + 1}-01` : `${year}-${String(month + 1).padStart(2, '0')}`;
  const maxByCustomer = Math.max(...byCustomer.map((c) => c.revenue), 1);
  const maxByAssignee = Math.max(...byAssignee.map((a) => a.revenue), 1);

  return (
    <main className="min-h-screen bg-surface">
      <PageHeader
        eyebrow="MONTHLY · DETAIL"
        title={`${year}年 ${month}月 ドリルダウン`}
        back={{ href: '/monthly', label: '月次レポート' }}
        actions={
          <>
            <Link
              href={`/monthly/detail/${prev}`}
              className="px-3 py-1.5 bg-card border border-border text-xs font-medium text-ink rounded-lg hover:bg-slate-50"
            >
              ← 前月
            </Link>
            <Link
              href={`/monthly/detail/${next}`}
              className="px-3 py-1.5 bg-card border border-border text-xs font-medium text-ink rounded-lg hover:bg-slate-50"
            >
              翌月 →
            </Link>
          </>
        }
      />

      <div className="px-6 py-10 max-w-5xl mx-auto space-y-12">
        <HeroValue
          label="今月の入金確定額"
          value={formatYen(totalRevenue)}
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
              `${paidDeals.length} 件の入金 ／ ${orderedDeals.length} 件の受注`
            )
          }
        />

        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="入金確定"
            value={formatMan(totalRevenue)}
            sub={`${paidDeals.length} 件`}
          />
          <StatCard
            label="受注"
            value={formatMan(totalOrdered)}
            sub={`${orderedDeals.length} 件`}
          />
          <StatCard label="行動量" value={actionStats?.total ?? 0} sub="月内合計" />
          <StatCard
            label="vs 計画"
            value={targetRevenue > 0 ? `${progressRate}%` : '—'}
            tone={progressRate >= 100 ? 'up' : progressRate < 80 ? 'down' : 'default'}
          />
        </section>

        <section>
          <SectionHeading eyebrow="ACTIVITY" title="今月の行動量" />
          <div className="bg-card border border-border rounded-xl p-6 grid grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-xs uppercase tracking-wider text-subtle">合計</p>
              <p className="font-semibold text-3xl text-ink mt-1 tabular-nums">
                {actionStats?.total ?? 0}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-subtle">電話</p>
              <p className="font-semibold text-3xl text-ink mt-1 tabular-nums">
                {actionStats?.calls ?? 0}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-subtle">商談</p>
              <p className="font-semibold text-3xl text-ink mt-1 tabular-nums">
                {actionStats?.meetings ?? 0}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-subtle">提案</p>
              <p className="font-semibold text-3xl text-ink mt-1 tabular-nums">
                {actionStats?.proposals ?? 0}
              </p>
            </div>
          </div>
        </section>

        <section>
          <SectionHeading eyebrow="DEALS" title="入金確定案件" count={paidDeals.length} />
          {paidDeals.length === 0 ? (
            <EmptyState icon="◯" title="この月に入金確定した案件はありません" />
          ) : (
            <div className="bg-card border border-border rounded-xl divide-y divide-border">
              {paidDeals.map((d) => (
                <Link
                  key={d.id}
                  href={`/deals/${d.id}`}
                  className="px-5 py-4 flex items-center gap-4 hover:bg-slate-50 transition-colors"
                >
                  <span className="text-xs font-mono text-subtle w-20 shrink-0">
                    {d.paid_at ?? '—'}
                  </span>
                  <span
                    className={`inline-flex px-2.5 py-0.5 rounded-lg text-xs font-medium shrink-0 ${STAGE_COLOR[d.stage] ?? ''}`}
                  >
                    {STAGE_LABEL[d.stage] ?? d.stage}
                  </span>
                  <span className="flex-1 text-sm text-ink truncate font-medium">{d.title}</span>
                  <span className="text-xs text-muted shrink-0 hidden md:inline">
                    {d.customer_name ?? '—'}
                  </span>
                  <span className="text-xs text-muted shrink-0 hidden md:inline">
                    {d.assignee_name ?? '—'}
                  </span>
                  <span className="font-mono tabular-nums text-sm text-ink font-semibold shrink-0">
                    {formatYen(d.amount)}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <SectionHeading eyebrow="BY CUSTOMER" title="顧客別売上" count={byCustomer.length} />
            <div className="bg-card border border-border rounded-xl p-5 space-y-3">
              {byCustomer.length === 0 ? (
                <p className="text-sm text-muted text-center py-4">データなし</p>
              ) : (
                byCustomer.map((c) => {
                  const w = Math.round((c.revenue / maxByCustomer) * 100);
                  return (
                    <div key={c.id}>
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="text-sm text-ink truncate">{c.name}</p>
                        <p className="font-mono tabular-nums text-xs text-ink font-medium shrink-0 ml-2">
                          {formatYen(c.revenue)}
                        </p>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-ink rounded-full" style={{ width: `${w}%` }} />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
          <div>
            <SectionHeading eyebrow="BY ASSIGNEE" title="担当者別売上" count={byAssignee.length} />
            <div className="bg-card border border-border rounded-xl p-5 space-y-3">
              {byAssignee.length === 0 ? (
                <p className="text-sm text-muted text-center py-4">データなし</p>
              ) : (
                byAssignee.map((a) => {
                  const w = Math.round((a.revenue / maxByAssignee) * 100);
                  return (
                    <div key={a.id}>
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="text-sm text-ink truncate">{a.name}</p>
                        <p className="font-mono tabular-nums text-xs text-ink font-medium shrink-0 ml-2">
                          {formatYen(a.revenue)}
                        </p>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-600 rounded-full"
                          style={{ width: `${w}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
