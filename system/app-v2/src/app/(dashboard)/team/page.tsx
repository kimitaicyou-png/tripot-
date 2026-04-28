import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { members, deals } from '@/db/schema';
import { eq, and, isNull, sql } from 'drizzle-orm';
import { getMemberColor, getMemberInitial } from '@/lib/member-color';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { EmptyState } from '@/components/ui/empty-state';

const ROLE_LABEL: Record<string, string> = {
  president: '社長',
  hq_member: '本部メンバー',
  member: 'メンバー',
};

function formatYen(value: number | null): string {
  return `¥${(value ?? 0).toLocaleString('ja-JP')}`;
}

export default async function TeamPage() {
  const session = await auth();
  if (!session?.user?.member_id) redirect('/login');

  const rows = await db
    .select({
      id: members.id,
      name: members.name,
      email: members.email,
      role: members.role,
      department: members.department,
      revenue: sql<number>`COALESCE(SUM(${deals.amount}) FILTER (WHERE ${deals.stage} IN ('paid', 'invoiced')), 0)::int`,
      active_deals: sql<number>`COUNT(DISTINCT ${deals.id}) FILTER (WHERE ${deals.stage} IN ('proposing', 'ordered', 'in_production'))::int`,
    })
    .from(members)
    .leftJoin(deals, and(eq(deals.assignee_id, members.id), isNull(deals.deleted_at)))
    .where(
      and(
        eq(members.company_id, session.user.company_id),
        eq(members.status, 'active'),
        isNull(members.deleted_at),
      ),
    )
    .groupBy(members.id, members.name, members.email, members.role, members.department)
    .orderBy(sql`SUM(${deals.amount}) DESC NULLS LAST`);

  const totalRevenue = rows.reduce((s, m) => s + (m.revenue ?? 0), 0);
  const totalActive = rows.reduce((s, m) => s + (m.active_deals ?? 0), 0);
  const maxRevenue = Math.max(...rows.map((m) => m.revenue ?? 0), 1);

  return (
    <main className="min-h-screen bg-surface">
      <PageHeader
        eyebrow="TEAM"
        title="チーム"
        subtitle={
          <>
            <span className="font-mono tabular-nums text-ink">{rows.length}</span> 名 ／ 進行中{' '}
            <span className="font-mono tabular-nums text-ink">{totalActive}</span>
          </>
        }
        actions={
          <Link
            href="/team/leaves"
            className="px-4 py-2 text-sm border border-border rounded text-muted hover:text-ink hover:border-ink transition-colors"
          >
            休暇カレンダー →
          </Link>
        }
      />

      <div className="px-6 py-10 max-w-5xl mx-auto space-y-10">
        {rows.length === 0 ? (
          <EmptyState icon="◯" title="メンバーがまだ登録されていません" />
        ) : (
          <>
            <section className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <StatCard label="メンバー数" value={rows.length} big />
              <StatCard label="進行中の案件" value={totalActive} big />
              <StatCard label="チーム累計売上" value={formatYen(totalRevenue)} tone="up" big />
            </section>

            <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {rows.map((m) => {
                const color = getMemberColor(m.id);
                const initial = getMemberInitial(m.name);
                const w = Math.round(((m.revenue ?? 0) / maxRevenue) * 100);
                return (
                  <Link
                    key={m.id}
                    href={`/team/${m.id}`}
                    className="bg-card border border-border rounded-xl p-5 shadow-sm hover:border-ink-mid transition-colors block"
                  >
                    <div className="flex items-center gap-4 mb-4">
                      <div
                        className={`w-12 h-12 rounded-lg ${color} flex items-center justify-center text-white text-lg font-semibold`}
                      >
                        {initial}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-base font-medium text-ink">{m.name}</p>
                        <p className="text-xs text-subtle">
                          {ROLE_LABEL[m.role]}
                          {m.department ? ` ・ ${m.department}` : ''}
                        </p>
                      </div>
                      <p className="font-mono tabular-nums text-xs text-subtle shrink-0">
                        {m.active_deals} 件
                      </p>
                    </div>
                    <p className="font-semibold text-3xl text-ink tabular-nums leading-none">
                      {formatYen(m.revenue)}
                    </p>
                    <div className="h-1 bg-slate-100 rounded-full overflow-hidden mt-3">
                      <div className="h-full bg-ink rounded-full" style={{ width: `${w}%` }} />
                    </div>
                  </Link>
                );
              })}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
