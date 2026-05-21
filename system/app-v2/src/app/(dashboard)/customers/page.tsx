import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { customers, deals } from '@/db/schema';
import { eq, and, isNull, sql, desc, or } from 'drizzle-orm';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { EmptyState } from '@/components/ui/empty-state';
import { formatYen } from '@/lib/format';

const PAGE_SIZE = 50;

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.member_id) redirect('/login');

  const { q: rawQ, page: pageStr } = await searchParams;
  const q = (rawQ ?? '').trim();
  const requestedPage = Math.max(1, Number(pageStr) || 1);
  const offset = (requestedPage - 1) * PAGE_SIZE;

  // 検索条件（name / email / phone の ILIKE）
  const baseConds = [
    eq(customers.company_id, session.user.company_id),
    isNull(customers.deleted_at),
  ];
  if (q) {
    const pattern = `%${q.replace(/[\\%_]/g, '\\$&')}%`;
    baseConds.push(
      or(
        sql`${customers.name} ILIKE ${pattern}`,
        sql`${customers.contact_email} ILIKE ${pattern}`,
        sql`${customers.contact_phone} ILIKE ${pattern}`,
      )!,
    );
  }

  const [rows, totalRow] = await Promise.all([
    db
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
      .where(and(...baseConds))
      .groupBy(customers.id, customers.name, customers.contact_email, customers.contact_phone)
      .orderBy(desc(sql`COUNT(${deals.id})`))
      .limit(PAGE_SIZE)
      .offset(offset),
    db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(customers)
      .where(and(...baseConds))
      .then((r) => r[0]),
  ]);

  const filteredTotal = totalRow?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(filteredTotal / PAGE_SIZE));
  const currentPage = Math.min(requestedPage, totalPages);

  const totalCustomersCount = q
    ? await db
        .select({ count: sql<number>`COUNT(*)::int` })
        .from(customers)
        .where(
          and(
            eq(customers.company_id, session.user.company_id),
            isNull(customers.deleted_at),
          ),
        )
        .then((r) => r[0]?.count ?? 0)
    : filteredTotal;

  const totalRevenue = rows.reduce((s, c) => s + (c.total_amount ?? 0), 0);
  const totalDeals = rows.reduce((s, c) => s + (c.deal_count ?? 0), 0);

  function pageHref(p: number): string {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (p > 1) params.set('page', String(p));
    return `/customers${params.toString() ? `?${params.toString()}` : ''}`;
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <PageHeader
        eyebrow="CUSTOMERS"
        title="顧客"
        subtitle={
          <>
            {q ? (
              <>
                該当{' '}
                <span className="font-mono tabular-nums text-amber-700">{filteredTotal}</span>{' '}
                ／ 全{' '}
                <span className="font-mono tabular-nums text-gray-900">
                  {totalCustomersCount}
                </span>{' '}
                社
              </>
            ) : (
              <>
                <span className="font-mono tabular-nums text-gray-900">
                  {totalCustomersCount}
                </span>{' '}
                社 ／ 案件{' '}
                <span className="font-mono tabular-nums text-gray-900">{totalDeals}</span>
              </>
            )}
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

      <div className="px-6 py-10 max-w-5xl mx-auto space-y-8">
        {/* 検索フォーム（GET、URL クエリで保持） */}
        <form action="/customers" className="flex gap-2 items-center">
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="顧客名 / メール / 電話番号で検索"
            className="flex-1 px-3 py-2 text-sm text-gray-900 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900/20"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 active:scale-[0.98]"
          >
            検索
          </button>
          {q && (
            <Link
              href="/customers"
              className="px-3 py-2 text-xs text-gray-700 hover:text-gray-900 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              解除
            </Link>
          )}
        </form>

        {rows.length === 0 ? (
          q ? (
            <EmptyState
              icon="◯"
              title="検索条件に一致する顧客がいません"
              description="別の名前 / メール / 電話番号で再検索してください"
            />
          ) : (
            <EmptyState
              icon="◯"
              title="顧客がまだ登録されていません"
              description="顧客を登録すると、案件を紐付けて売上を集計できます。"
              cta={{ href: '/customers/new', label: '顧客を登録する' }}
            />
          )
        ) : (
          <>
            <section className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <StatCard label="表示中" value={rows.length} sub={`全${filteredTotal}件中`} big />
              <StatCard label="案件総数（表示中）" value={totalDeals} big />
              <StatCard label="入金累計（表示中）" value={formatYen(totalRevenue)} tone="up" big />
            </section>

            <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {rows.map((c) => (
                <Link
                  key={c.id}
                  href={`/customers/${c.id}`}
                  className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:border-gray-700 transition-colors block overflow-hidden"
                >
                  <div className="flex items-baseline justify-between mb-3">
                    <p className="text-base text-gray-900 font-medium truncate">{c.name}</p>
                    <p className="font-mono tabular-nums text-xs text-gray-500 shrink-0 ml-2">
                      {c.deal_count}件
                    </p>
                  </div>
                  <p
                    className="font-semibold text-xl md:text-2xl text-gray-900 tabular-nums leading-none truncate"
                    title={formatYen(c.total_amount)}
                  >
                    {formatYen(c.total_amount)}
                  </p>
                  <div className="mt-3 space-y-0.5">
                    {c.contact_email && (
                      <p className="text-xs text-gray-700 truncate">{c.contact_email}</p>
                    )}
                    {c.contact_phone && (
                      <p className="text-xs font-mono text-gray-700 truncate">
                        {c.contact_phone}
                      </p>
                    )}
                    {!c.contact_email && !c.contact_phone && (
                      <p className="text-xs text-gray-500">連絡先未登録</p>
                    )}
                  </div>
                </Link>
              ))}
            </section>

            {totalPages > 1 && (
              <nav
                className="flex items-center justify-between gap-3 pt-4 border-t border-gray-200"
                aria-label="ページネーション"
              >
                <p className="text-xs text-gray-600">
                  {(currentPage - 1) * PAGE_SIZE + 1}–
                  {Math.min(currentPage * PAGE_SIZE, filteredTotal)} / 全{' '}
                  <span className="font-mono tabular-nums text-gray-900">{filteredTotal}</span>{' '}
                  件
                </p>
                <div className="flex items-center gap-2">
                  {currentPage > 1 ? (
                    <Link
                      href={pageHref(currentPage - 1)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 active:scale-[0.98]"
                    >
                      ← 前へ
                    </Link>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-3 py-1.5 text-xs text-gray-300 border border-gray-100 rounded-lg">
                      ← 前へ
                    </span>
                  )}
                  <span className="font-mono tabular-nums text-xs text-gray-700 px-2">
                    {currentPage} / {totalPages}
                  </span>
                  {currentPage < totalPages ? (
                    <Link
                      href={pageHref(currentPage + 1)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 active:scale-[0.98]"
                    >
                      次へ →
                    </Link>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-3 py-1.5 text-xs text-gray-300 border border-gray-100 rounded-lg">
                      次へ →
                    </span>
                  )}
                </div>
              </nav>
            )}
          </>
        )}
      </div>
    </main>
  );
}
