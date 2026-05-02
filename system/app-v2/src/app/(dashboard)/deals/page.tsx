import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { deals, members, customers } from '@/db/schema';
import { eq, and, isNull, desc } from 'drizzle-orm';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
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

const STAGE_ORDER: readonly string[] = [
  'prospect',
  'proposing',
  'ordered',
  'in_production',
  'delivered',
  'acceptance',
  'invoiced',
  'paid',
  'lost',
];

function formatYen(value: number | null): string {
  if (!value) return '¥0';
  return `¥${value.toLocaleString('ja-JP')}`;
}

export default async function DealsListPage() {
  const session = await auth();
  if (!session?.user?.member_id) redirect('/login');

  const rows = await db
    .select({
      id: deals.id,
      title: deals.title,
      stage: deals.stage,
      amount: deals.amount,
      monthly_amount: deals.monthly_amount,
      revenue_type: deals.revenue_type,
      assignee_name: members.name,
      customer_name: customers.name,
      updated_at: deals.updated_at,
    })
    .from(deals)
    .leftJoin(members, eq(deals.assignee_id, members.id))
    .leftJoin(customers, eq(deals.customer_id, customers.id))
    .where(and(eq(deals.company_id, session.user.company_id), isNull(deals.deleted_at)))
    .orderBy(desc(deals.updated_at))
    .limit(200);

  const totalActive = rows.filter((d) =>
    ['proposing', 'ordered', 'in_production'].includes(d.stage),
  ).length;
  const totalRevenue = rows
    .filter((d) => d.stage === 'paid' || d.stage === 'invoiced')
    .reduce((s, d) => s + (d.amount ?? 0), 0);
  const totalPipeline = rows
    .filter((d) => !['paid', 'lost'].includes(d.stage))
    .reduce((s, d) => s + (d.amount ?? 0), 0);

  const grouped = STAGE_ORDER.map((stage) => ({
    stage,
    items: rows.filter((d) => d.stage === stage),
  })).filter((g) => g.items.length > 0);

  return (
    <main className="min-h-screen bg-gray-50">
      <PageHeader
        eyebrow="DEALS"
        title="案件"
        subtitle={
          <>
            <span className="font-mono tabular-nums text-gray-900">{rows.length}</span> 件 ／ 進行中{' '}
            <span className="font-mono tabular-nums text-gray-900">{totalActive}</span>
          </>
        }
        actions={
          <div className="flex items-center gap-2">
            <Link
              href="/deals/import"
              className="inline-flex items-center gap-1 px-4 py-2 text-sm border border-gray-200 rounded text-gray-700 hover:text-gray-900 hover:border-gray-900 transition-colors"
            >
              CSV 取込
            </Link>
            <Link
              href="/deals/new"
              className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors active:scale-[0.98]"
            >
              新規登録
            </Link>
          </div>
        }
      />

      <div className="px-6 py-10 max-w-7xl mx-auto space-y-12">
        {rows.length === 0 ? (
          <EmptyState
            icon="◯"
            title="まだ案件が登録されていません"
            description="最初の案件を登録して、行動を積み上げていきましょう。"
            cta={{ href: '/deals/new', label: '案件を登録する' }}
          />
        ) : (
          <>
            <section className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <StatCard label="入金確定累計" value={formatYen(totalRevenue)} tone="up" big />
              <StatCard label="パイプライン" value={formatYen(totalPipeline)} tone="accent" big />
              <StatCard label="進行中の案件" value={totalActive} sub={`全${rows.length}件中`} big />
            </section>

            {grouped.map((g) => (
              <section key={g.stage}>
                <SectionHeading
                  eyebrow={g.stage.toUpperCase()}
                  title={STAGE_LABEL[g.stage] ?? g.stage}
                  count={g.items.length}
                />
                <div className="bg-white border border-gray-200 rounded-xl divide-y divide-border">
                  {g.items.map((d) => (
                    <Link
                      key={d.id}
                      href={`/deals/${d.id}`}
                      className="px-5 py-4 flex items-center gap-4 hover:bg-slate-50 transition-colors"
                    >
                      <span
                        className={`inline-flex px-2.5 py-0.5 rounded-lg text-xs font-medium shrink-0 ${STAGE_COLOR[d.stage] ?? ''}`}
                      >
                        {STAGE_LABEL[d.stage] ?? d.stage}
                      </span>
                      <span className="flex-1 text-sm text-gray-900 truncate font-medium">
                        {d.title}
                      </span>
                      <span className="text-xs text-gray-700 shrink-0 hidden md:inline w-32 truncate">
                        {d.customer_name ?? '—'}
                      </span>
                      <span className="text-xs text-gray-700 shrink-0 hidden md:inline w-20 truncate">
                        {d.assignee_name ?? '—'}
                      </span>
                      <span className="text-right shrink-0">
                        <span className="font-mono tabular-nums text-sm text-gray-900 font-semibold block">
                          {formatYen(d.amount)}
                        </span>
                        {d.revenue_type !== 'spot' && d.monthly_amount ? (
                          <span className="text-xs text-amber-700 font-mono tabular-nums">
                            月 {formatYen(d.monthly_amount)}
                          </span>
                        ) : null}
                      </span>
                    </Link>
                  ))}
                </div>
              </section>
            ))}
          </>
        )}
      </div>
    </main>
  );
}
