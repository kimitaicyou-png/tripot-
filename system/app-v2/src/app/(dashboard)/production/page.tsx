import { redirect } from 'next/navigation';
import { AlertOctagon } from 'lucide-react';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { deals } from '@/db/schema';
import { eq, and, isNull, asc } from 'drizzle-orm';
import { listProductionCards, bugCounts } from '@/lib/actions/production';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { EmptyState } from '@/components/ui/empty-state';
import { ProductionCreateForm } from './_components/production-create-form';
import { ProductionKanban } from './_components/production-kanban';

type ProductionStatus = 'requirements' | 'designing' | 'building' | 'reviewing' | 'delivered' | 'cancelled';

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

  const totalActive = cards.filter((c) => c.status !== 'delivered' && c.status !== 'cancelled').length;
  const totalDelivered = cards.filter((c) => c.status === 'delivered').length;

  const kanbanCards = cards.map((c) => ({
    id: c.id,
    title: c.title,
    status: c.status as ProductionStatus,
    deal_id: c.deal_id,
    deal_title: c.deal_title,
    estimated_cost: c.estimated_cost,
    actual_cost: c.actual_cost,
    started_at: c.started_at,
    delivered_at: c.delivered_at,
  }));

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
            label="Critical"
            value={bugStats.critical}
            tone={bugStats.critical > 0 ? 'down' : 'default'}
            sub={bugStats.critical > 0 ? '即対応' : 'なし'}
          />
        </section>

        {cards.length === 0 ? (
          <EmptyState
            icon={AlertOctagon}
            title="制作カードがありません"
            description="案件が「受注」になったら、ここで制作工程を管理します"
            cta={{ label: '案件一覧へ', href: '/deals' }}
          />
        ) : (
          <section>
            <p className="text-xs text-gray-500 mb-3">
              カードをドラッグして列間で移動するとステータスが自動更新されます
            </p>
            <ProductionKanban initialCards={kanbanCards} />
          </section>
        )}
      </div>
    </main>
  );
}
