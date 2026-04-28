import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { actions, members, deals } from '@/db/schema';
import { eq, and, sql, isNull, gte } from 'drizzle-orm';
import { WeeklyTabs } from './_components/tabs';
import { MemberActivityGrid } from './_components/member-activity-grid';
import { WeeklyTotals } from './_components/weekly-totals';
import { PageHeader } from '@/components/ui/page-header';
import { HeroValue } from '@/components/ui/stat-card';

function formatYen(value: number | null): string {
  return `¥${(value ?? 0).toLocaleString('ja-JP')}`;
}

type SearchParams = { focus?: string };

export default async function WeeklyPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await auth();
  if (!session?.user?.member_id) redirect('/login');

  const sp = await searchParams;
  const presentation = sp.focus === 'presentation';

  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 6);
  weekStart.setHours(0, 0, 0, 0);

  const memberStats = await db
    .select({
      id: members.id,
      name: members.name,
      total: sql<number>`COALESCE(COUNT(${actions.id}), 0)::int`,
      calls: sql<number>`COALESCE(COUNT(${actions.id}) FILTER (WHERE ${actions.type} = 'call'), 0)::int`,
      meetings: sql<number>`COALESCE(COUNT(${actions.id}) FILTER (WHERE ${actions.type} = 'meeting'), 0)::int`,
      proposals: sql<number>`COALESCE(COUNT(${actions.id}) FILTER (WHERE ${actions.type} = 'proposal'), 0)::int`,
    })
    .from(members)
    .leftJoin(
      actions,
      and(eq(actions.member_id, members.id), gte(actions.occurred_at, weekStart))
    )
    .where(
      and(
        eq(members.company_id, session.user.company_id),
        eq(members.status, 'active'),
        isNull(members.deleted_at),
      )
    )
    .groupBy(members.id, members.name)
    .orderBy(sql`COUNT(${actions.id}) DESC`);

  const companyKpi = await db
    .select({
      revenue: sql<number>`COALESCE(SUM(${deals.amount}) FILTER (WHERE ${deals.stage} IN ('paid', 'invoiced')), 0)::int`,
      activeCount: sql<number>`COUNT(*) FILTER (WHERE ${deals.stage} IN ('proposing', 'ordered', 'in_production'))::int`,
    })
    .from(deals)
    .where(and(eq(deals.company_id, session.user.company_id), isNull(deals.deleted_at)))
    .then((rows) => rows[0]);

  const totalActions = memberStats.reduce((s, m) => s + m.total, 0);
  const maxActions = Math.max(...memberStats.map((m) => m.total), 1);

  return (
    <main className="min-h-screen bg-gray-50">
      <PageHeader
        eyebrow="WEEKLY"
        title="週次レポート"
        subtitle={
          <span className="font-mono">
            {weekStart.toLocaleDateString('ja-JP')} 〜 {new Date().toLocaleDateString('ja-JP')}
          </span>
        }
        actions={
          <Link
            href={presentation ? '/weekly' : '/weekly?focus=presentation'}
            className="px-4 py-2 text-sm border border-gray-200 rounded text-gray-700 hover:text-gray-900 hover:border-gray-900 transition-colors"
          >
            {presentation ? '通常表示' : '大画面モード'}
          </Link>
        }
      />

      <WeeklyTabs />

      <div className={`${presentation ? 'max-w-7xl text-lg' : 'max-w-5xl'} mx-auto px-6 py-10 space-y-12`}>
        <HeroValue
          label="会社全体の売上（入金確定累計）"
          value={formatYen(companyKpi?.revenue ?? 0)}
          sub={
            <>
              進行中{' '}
              <span className="font-mono tabular-nums text-gray-900 font-medium">
                {companyKpi?.activeCount ?? 0}
              </span>{' '}
              件 ／ 直近7日 行動量{' '}
              <span className="font-mono tabular-nums text-gray-900 font-medium">{totalActions}</span>
            </>
          }
        />

        <MemberActivityGrid members={memberStats} />

        <WeeklyTotals
          totals={{
            activeCount: companyKpi?.activeCount ?? 0,
            calls: memberStats.reduce((s, m) => s + m.calls, 0),
            meetings: memberStats.reduce((s, m) => s + m.meetings, 0),
            proposals: memberStats.reduce((s, m) => s + m.proposals, 0),
          }}
        />
      </div>
    </main>
  );
}
