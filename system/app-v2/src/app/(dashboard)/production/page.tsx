import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { deals } from '@/db/schema';
import { eq, and, isNull, asc } from 'drizzle-orm';
import { listProductionCards, bugCounts } from '@/lib/actions/production';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { SectionHeading } from '@/components/ui/section-heading';
import { EmptyState } from '@/components/ui/empty-state';
import { ProductionStatusButton } from './_components/production-status-button';
import { ProductionCreateForm } from './_components/production-create-form';

const STATUS_GROUPS = [
  { key: 'requirements', label: '要件定義', tone: 'text-gray-700' },
  { key: 'designing', label: '設計', tone: 'text-blue-700' },
  { key: 'building', label: '実装', tone: 'text-indigo-700' },
  { key: 'reviewing', label: 'レビュー', tone: 'text-amber-700' },
  { key: 'delivered', label: '納品済', tone: 'text-emerald-700' },
  { key: 'cancelled', label: 'キャンセル', tone: 'text-gray-500' },
] as const;

function formatYen(value: number | null): string {
  return `¥${(value ?? 0).toLocaleString('ja-JP')}`;
}

export default async function ProductionPage() {
  const session = await auth();
  if (!session?.user?.member_id) redirect('/login');

  const [cards, bugStats, dealsForSelect] = await Promise.all([
    listProductionCards(),
    bugCounts(),
    db
      .select({ id: deals.id, title: deals.title })
      .from(deals)
      .where(
        and(
          eq(deals.company_id, session.user.company_id),
          isNull(deals.deleted_at)
        )
      )
      .orderBy(asc(deals.title))
      .limit(200),
  ]);

  const grouped = new Map<string, typeof cards>();
  for (const c of cards) {
    const list = grouped.get(c.status) ?? [];
    list.push(c);
    grouped.set(c.status, list);
  }

  const totalActive = cards.filter((c) => c.status !== 'delivered' && c.status !== 'cancelled').length;
  const totalDelivered = cards.filter((c) => c.status === 'delivered').length;

  return (
    <main className="min-h-screen bg-gray-50">
      <PageHeader
        eyebrow="PRODUCTION"
        title="制作管理"
        subtitle={
          <>
            進行中{' '}
            <span className="font-mono tabular-nums text-gray-900">{totalActive}</span> /
            納品済{' '}
            <span className="font-mono tabular-nums text-gray-900">{totalDelivered}</span>
          </>
        }
        actions={<ProductionCreateForm deals={dealsForSelect} />}
      />

      <div className="px-6 py-10 max-w-6xl mx-auto space-y-10">
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="進行中" value={totalActive} sub={`合計${cards.length}件`} />
          <StatCard
            label="バグ Open"
            value={bugStats.open}
            tone={bugStats.open > 0 ? 'down' : 'default'}
          />
          <StatCard
            label="バグ 進行中"
            value={bugStats.inProgress}
            sub={bugStats.inProgress > 0 ? '対応中' : undefined}
          />
          <StatCard
            label="🚨 Critical"
            value={bugStats.critical}
            tone={bugStats.critical > 0 ? 'down' : 'default'}
            sub={bugStats.critical > 0 ? '即対応' : 'なし'}
          />
        </section>

        {cards.length === 0 ? (
          <EmptyState
            icon="◌"
            title="制作カードがありません"
            description="案件が「受注」になったら、ここで制作工程を管理します"
            cta={{ label: '案件一覧へ', href: '/deals' }}
          />
        ) : (
          STATUS_GROUPS.map((g) => {
            const list = grouped.get(g.key) ?? [];
            if (list.length === 0) return null;
            return (
              <section key={g.key}>
                <SectionHeading
                  eyebrow={g.label.toUpperCase()}
                  title={g.label}
                  count={list.length}
                />
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {list.map((c) => (
                    <li
                      key={c.id}
                      className="bg-white border border-gray-200 rounded-lg p-4 space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <Link
                            href={`/production/${c.id}`}
                            className="text-base font-medium text-gray-900 truncate block hover:underline"
                          >
                            {c.title}
                          </Link>
                          {c.deal_id && c.deal_title && (
                            <Link
                              href={`/deals/${c.deal_id}`}
                              className="text-xs text-gray-700 hover:text-gray-900 truncate block"
                            >
                              ↗ {c.deal_title}
                            </Link>
                          )}
                        </div>
                        <span className={`text-xs uppercase tracking-widest shrink-0 ${g.tone}`}>
                          {g.label}
                        </span>
                      </div>

                      <div className="flex items-baseline gap-3 text-xs">
                        {c.estimated_cost && c.estimated_cost > 0 ? (
                          <span className="text-gray-500">
                            見積 <span className="font-mono tabular-nums text-gray-900">{formatYen(c.estimated_cost)}</span>
                          </span>
                        ) : null}
                        {c.actual_cost && c.actual_cost > 0 ? (
                          <span className="text-gray-500">
                            実績 <span className="font-mono tabular-nums text-gray-900">{formatYen(c.actual_cost)}</span>
                          </span>
                        ) : null}
                        {c.delivered_at && (
                          <span className="text-gray-500 font-mono tabular-nums">納品 {c.delivered_at}</span>
                        )}
                      </div>

                      <ProductionStatusButton cardId={c.id} currentStatus={c.status} />
                    </li>
                  ))}
                </ul>
              </section>
            );
          })
        )}
      </div>
    </main>
  );
}
