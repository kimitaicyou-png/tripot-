import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { customers, deals } from '@/db/schema';
import { eq, and, isNull, sql, desc } from 'drizzle-orm';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { EmptyState } from '@/components/ui/empty-state';

function formatYen(value: number | null): string {
  return `¥${(value ?? 0).toLocaleString('ja-JP')}`;
}

export default async function CustomersPage() {
  const session = await auth();
  if (!session?.user?.member_id) redirect('/login');

  const rows = await db
    .select({
      id: customers.id,
      name: customers.name,
      contact_email: customers.contact_email,
      contact_phone: customers.contact_phone,
      deal_count: sql<number>`COUNT(${deals.id})::int`,
      total_amount: sql<number>`COALESCE(SUM(${deals.amount}) FILTER (WHERE ${deals.stage} IN ('paid', 'invoiced')), 0)::int`,
    })
    .from(customers)
    .leftJoin(deals, and(eq(deals.customer_id, customers.id), isNull(deals.deleted_at)))
    .where(and(eq(customers.company_id, session.user.company_id), isNull(customers.deleted_at)))
    .groupBy(customers.id, customers.name, customers.contact_email, customers.contact_phone)
    .orderBy(desc(sql`COUNT(${deals.id})`))
    .limit(200);

  const totalRevenue = rows.reduce((s, c) => s + (c.total_amount ?? 0), 0);
  const totalDeals = rows.reduce((s, c) => s + (c.deal_count ?? 0), 0);

  return (
    <main className="min-h-screen bg-gray-50">
      <PageHeader
        eyebrow="CUSTOMERS"
        title="顧客"
        subtitle={
          <>
            <span className="font-mono tabular-nums text-gray-900">{rows.length}</span> 社 ／ 案件{' '}
            <span className="font-mono tabular-nums text-gray-900">{totalDeals}</span>
          </>
        }
        actions={
          <div className="flex items-center gap-2">
            <Link
              href="/customers/import"
              className="inline-flex items-center gap-1 px-4 py-2 text-sm border border-gray-200 rounded text-gray-700 hover:text-gray-900 hover:border-gray-900 transition-colors"
            >
              CSV 取込
            </Link>
            <Link
              href="/customers/new"
              className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors active:scale-[0.98]"
            >
              新規登録
            </Link>
          </div>
        }
      />

      <div className="px-6 py-10 max-w-5xl mx-auto space-y-10">
        {rows.length === 0 ? (
          <EmptyState
            icon="◯"
            title="顧客がまだ登録されていません"
            description="顧客を登録すると、案件を紐付けて売上を集計できます。"
            cta={{ href: '/customers/new', label: '顧客を登録する' }}
          />
        ) : (
          <>
            <section className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <StatCard label="顧客数" value={rows.length} big />
              <StatCard label="案件総数" value={totalDeals} big />
              <StatCard label="入金累計" value={formatYen(totalRevenue)} tone="up" big />
            </section>

            <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {rows.map((c) => (
                <Link
                  key={c.id}
                  href={`/customers/${c.id}`}
                  className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:border-gray-700 transition-colors block"
                >
                  <div className="flex items-baseline justify-between mb-3">
                    <p className="text-base text-gray-900 font-medium truncate">{c.name}</p>
                    <p className="font-mono tabular-nums text-xs text-gray-500 shrink-0 ml-2">
                      {c.deal_count}件
                    </p>
                  </div>
                  <p className="font-semibold text-2xl text-gray-900 tabular-nums leading-none">
                    {formatYen(c.total_amount)}
                  </p>
                  <div className="mt-3 space-y-0.5">
                    {c.contact_email && (
                      <p className="text-xs text-gray-700 truncate">{c.contact_email}</p>
                    )}
                    {c.contact_phone && (
                      <p className="text-xs font-mono text-gray-700">{c.contact_phone}</p>
                    )}
                    {!c.contact_email && !c.contact_phone && (
                      <p className="text-xs text-gray-500">連絡先未登録</p>
                    )}
                  </div>
                </Link>
              ))}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
