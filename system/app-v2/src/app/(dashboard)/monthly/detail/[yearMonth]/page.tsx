import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { deals, members, customers, actions, budgets } from '@/db/schema';
import { eq, and, sql, isNull, gte, lte, desc } from 'drizzle-orm';

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

  // 当月予算
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

  // 当月入金確定案件
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

  // 当月受注案件
  const orderedDeals = await db
    .select({
      id: deals.id,
      title: deals.title,
      amount: deals.amount,
      ordered_at: deals.ordered_at,
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
        gte(deals.ordered_at, monthStartIso),
        lte(deals.ordered_at, monthEndIso),
      ),
    )
    .orderBy(desc(deals.ordered_at));

  // 顧客別売上
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

  // 担当者別売上
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
    .where(and(eq(members.company_id, session.user.company_id), eq(members.status, 'active'), isNull(members.deleted_at)))
    .groupBy(members.id, members.name)
    .having(sql`COUNT(${deals.id}) > 0`)
    .orderBy(desc(sql`SUM(${deals.amount})`));

  // 当月行動量
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

  // 前月リンク・翌月リンク
  const prev = month === 1 ? `${year - 1}-12` : `${year}-${String(month - 1).padStart(2, '0')}`;
  const next = month === 12 ? `${year + 1}-01` : `${year}-${String(month + 1).padStart(2, '0')}`;

  return (
    <main className="min-h-screen bg-surface">
      <header className="bg-card border-b border-border px-6 py-4 flex items-center justify-between">
        <div>
          <Link href="/monthly" className="text-muted hover:text-ink text-xs">← 月次レポート</Link>
          <h1 className="text-lg font-semibold text-ink">
            {year}年 {month}月 ドリルダウン
          </h1>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <Link
            href={`/monthly/detail/${prev}`}
            className="px-3 py-1.5 bg-card border border-border text-ink rounded-lg hover:bg-slate-50"
          >
            ← 前月
          </Link>
          <Link
            href={`/monthly/detail/${next}`}
            className="px-3 py-1.5 bg-card border border-border text-ink rounded-lg hover:bg-slate-50"
          >
            翌月 →
          </Link>
        </div>
      </header>

      <div className="px-6 py-8 max-w-5xl mx-auto space-y-8">
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-card border border-border rounded-xl p-5">
            <p className="text-xs text-subtle">入金確定</p>
            <p className="font-serif italic text-3xl text-ink mt-1 tabular-nums">
              {formatYen(totalRevenue)}
            </p>
            <p className="text-xs text-muted mt-1">{paidDeals.length} 件</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-5">
            <p className="text-xs text-subtle">受注金額</p>
            <p className="font-serif italic text-3xl text-ink mt-1 tabular-nums">
              {formatYen(totalOrdered)}
            </p>
            <p className="text-xs text-muted mt-1">{orderedDeals.length} 件</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-5">
            <p className="text-xs text-subtle">vs 計画</p>
            <p
              className={`font-serif italic text-3xl mt-1 tabular-nums ${
                progressRate >= 100 ? 'text-kpi-up' : progressRate >= 80 ? 'text-ink' : 'text-kpi-down'
              }`}
            >
              {targetRevenue > 0 ? `${progressRate}%` : '—'}
            </p>
            <p className="text-xs text-muted mt-1">目標 {formatMan(targetRevenue)}</p>
          </div>
        </section>

        <section>
          <h3 className="text-sm font-medium text-ink mb-3">行動量</h3>
          <div className="bg-card border border-border rounded-xl p-5 grid grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-xs text-subtle">合計</p>
              <p className="font-mono tabular-nums text-2xl text-ink mt-1">{actionStats?.total ?? 0}</p>
            </div>
            <div>
              <p className="text-xs text-subtle">電話</p>
              <p className="font-mono tabular-nums text-2xl text-ink mt-1">{actionStats?.calls ?? 0}</p>
            </div>
            <div>
              <p className="text-xs text-subtle">商談</p>
              <p className="font-mono tabular-nums text-2xl text-ink mt-1">{actionStats?.meetings ?? 0}</p>
            </div>
            <div>
              <p className="text-xs text-subtle">提案</p>
              <p className="font-mono tabular-nums text-2xl text-ink mt-1">{actionStats?.proposals ?? 0}</p>
            </div>
          </div>
        </section>

        <section>
          <h3 className="text-sm font-medium text-ink mb-3">
            入金確定案件 <span className="text-xs text-subtle font-normal">{paidDeals.length}件</span>
          </h3>
          {paidDeals.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-8 text-center text-sm text-muted">
              この月に入金確定した案件はありません
            </div>
          ) : (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-slate-50">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted">入金日</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted">案件</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted">顧客</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted">担当</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-muted">金額</th>
                  </tr>
                </thead>
                <tbody>
                  {paidDeals.map((d) => (
                    <tr key={d.id} className="border-b border-border last:border-0 hover:bg-slate-50">
                      <td className="px-4 py-3 text-xs font-mono text-muted">{d.paid_at ?? '—'}</td>
                      <td className="px-4 py-3 text-sm">
                        <Link href={`/deals/${d.id}`} className="text-ink hover:underline font-medium">
                          {d.title}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted">{d.customer_name ?? '—'}</td>
                      <td className="px-4 py-3 text-sm text-muted">{d.assignee_name ?? '—'}</td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums text-sm text-ink font-semibold">
                        {formatYen(d.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-medium text-ink mb-3">顧客別売上</h3>
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              {byCustomer.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted">データなし</div>
              ) : (
                <ul className="divide-y divide-border">
                  {byCustomer.map((c) => (
                    <li key={c.id} className="px-4 py-3 flex items-center justify-between">
                      <p className="text-sm text-ink">{c.name}</p>
                      <p className="font-mono tabular-nums text-sm text-ink font-semibold">
                        {formatYen(c.revenue)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          <div>
            <h3 className="text-sm font-medium text-ink mb-3">担当者別売上</h3>
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              {byAssignee.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted">データなし</div>
              ) : (
                <ul className="divide-y divide-border">
                  {byAssignee.map((a) => (
                    <li key={a.id} className="px-4 py-3 flex items-center justify-between">
                      <p className="text-sm text-ink">{a.name}</p>
                      <p className="font-mono tabular-nums text-sm text-ink font-semibold">
                        {formatYen(a.revenue)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
