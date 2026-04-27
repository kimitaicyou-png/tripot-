import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { actions, members, deals } from '@/db/schema';
import { eq, and, sql, isNull, gte } from 'drizzle-orm';
import { WeeklyTabs } from './_components/tabs';
import { PageHeader } from '@/components/ui/page-header';
import { HeroValue, StatCard } from '@/components/ui/stat-card';
import { SectionHeading } from '@/components/ui/section-heading';
import { EmptyState } from '@/components/ui/empty-state';
import { getMemberColor, getMemberInitial } from '@/lib/member-color';

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
    <main className="min-h-screen bg-surface">
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
            className="px-4 py-2 text-sm border border-border rounded text-muted hover:text-ink hover:border-ink transition-colors"
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
              <span className="font-mono tabular-nums text-ink font-medium">
                {companyKpi?.activeCount ?? 0}
              </span>{' '}
              件 ／ 直近7日 行動量{' '}
              <span className="font-mono tabular-nums text-ink font-medium">{totalActions}</span>
            </>
          }
        />

        <section>
          <SectionHeading
            eyebrow="ACTIVITY"
            title="メンバー別 行動量"
            count={memberStats.length}
          />
          {memberStats.length === 0 ? (
            <EmptyState icon="◯" title="メンバーがまだ登録されていません" />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {memberStats.map((m) => {
                const color = getMemberColor(m.id);
                const initial = getMemberInitial(m.name);
                const widthPct = Math.round((m.total / maxActions) * 100);
                return (
                  <div
                    key={m.id}
                    className="bg-card border border-border rounded-xl p-5 shadow-sm"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div
                        className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center text-white text-base font-semibold`}
                      >
                        {initial}
                      </div>
                      <p className="flex-1 text-sm text-ink font-medium truncate">{m.name}</p>
                      <p className="font-serif italic text-2xl text-ink tabular-nums leading-none">
                        {m.total}
                      </p>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mb-3">
                      <div
                        className="h-full bg-ink rounded-full transition-all"
                        style={{ width: `${widthPct}%` }}
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-subtle">電話</p>
                        <p className="font-mono tabular-nums text-sm text-ink mt-0.5">{m.calls}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-subtle">商談</p>
                        <p className="font-mono tabular-nums text-sm text-ink mt-0.5">
                          {m.meetings}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-subtle">提案</p>
                        <p className="font-mono tabular-nums text-sm text-ink mt-0.5">
                          {m.proposals}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="進行中の案件" value={companyKpi?.activeCount ?? 0} />
          <StatCard label="今週の電話" value={memberStats.reduce((s, m) => s + m.calls, 0)} />
          <StatCard label="今週の商談" value={memberStats.reduce((s, m) => s + m.meetings, 0)} />
          <StatCard label="今週の提案" value={memberStats.reduce((s, m) => s + m.proposals, 0)} />
        </section>
      </div>
    </main>
  );
}
