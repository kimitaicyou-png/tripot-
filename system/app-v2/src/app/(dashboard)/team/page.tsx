import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowRight, Phone, Handshake, FileText, Trophy } from 'lucide-react';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { members, deals, actions } from '@/db/schema';
import { eq, and, isNull, sql, gte } from 'drizzle-orm';
import { getMemberColor, getMemberInitial } from '@/lib/member-color';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { EmptyState } from '@/components/ui/empty-state';
import { OverloadAlertCard } from './_components/overload-alert-card';
import { formatYen } from '@/lib/format';

const ROLE_LABEL: Record<string, string> = {
  president: '社長',
  hq_member: '本部メンバー',
  member: 'メンバー',
};

export default async function TeamPage() {
  const session = await auth();
  if (!session?.user?.member_id) redirect('/login');

  // 直近 7 日（週次行動量）の開始日
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 6);
  weekStart.setHours(0, 0, 0, 0);

  const [rows, actionStats] = await Promise.all([
    db
      .select({
        id: members.id,
        name: members.name,
        email: members.email,
        role: members.role,
        department: members.department,
        revenue: sql<number>`COALESCE(SUM(${deals.amount}) FILTER (WHERE ${deals.stage} IN ('paid', 'invoiced')), 0)::int`,
        gross_profit: sql<number>`COALESCE(SUM(${deals.gross_profit}) FILTER (WHERE ${deals.stage} IN ('paid', 'invoiced')), 0)::int`,
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
      .orderBy(sql`SUM(${deals.amount}) DESC NULLS LAST`),
    db
      .select({
        member_id: actions.member_id,
        total: sql<number>`COUNT(*)::int`,
        calls: sql<number>`COUNT(*) FILTER (WHERE ${actions.type} = 'call')::int`,
        meetings: sql<number>`COUNT(*) FILTER (WHERE ${actions.type} = 'meeting')::int`,
        proposals: sql<number>`COUNT(*) FILTER (WHERE ${actions.type} = 'proposal')::int`,
      })
      .from(actions)
      .where(
        and(
          eq(actions.company_id, session.user.company_id),
          gte(actions.occurred_at, weekStart),
        ),
      )
      .groupBy(actions.member_id),
  ]);

  const actionMap = new Map(actionStats.map((a) => [a.member_id, a]));

  const totalRevenue = rows.reduce((s, m) => s + (m.revenue ?? 0), 0);
  const totalGrossProfit = rows.reduce((s, m) => s + (m.gross_profit ?? 0), 0);
  const totalActive = rows.reduce((s, m) => s + (m.active_deals ?? 0), 0);
  const totalActions = Array.from(actionMap.values()).reduce((s, a) => s + a.total, 0);
  const maxRevenue = Math.max(...rows.map((m) => m.revenue ?? 0), 1);

  return (
    <main className="min-h-screen bg-gray-50">
      <PageHeader
        eyebrow="TEAM"
        title="チーム"
        subtitle={
          <>
            <span className="font-mono tabular-nums text-gray-900">{rows.length}</span> 名 ／ 進行中{' '}
            <span className="font-mono tabular-nums text-gray-900">{totalActive}</span>
          </>
        }
        actions={
          <Link
            href="/team/leaves"
            className="inline-flex items-center gap-1 px-4 py-2 text-sm border border-gray-200 rounded text-gray-700 hover:text-gray-900 hover:border-gray-900 transition-colors"
          >
            休暇カレンダー
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        }
      />

      <div className="px-6 py-10 max-w-5xl mx-auto space-y-10">
        {rows.length === 0 ? (
          <EmptyState icon="◯" title="メンバーがまだ登録されていません" />
        ) : (
          <>
            <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="メンバー数" value={rows.length} big />
              <StatCard label="進行中の案件" value={totalActive} big />
              <StatCard label="チーム累計売上" value={formatYen(totalRevenue)} tone="up" big />
              <StatCard
                label="直近7日 行動量"
                value={totalActions}
                tone="accent"
                sub={`粗利累計 ${formatYen(totalGrossProfit)}`}
                big
              />
            </section>

            <OverloadAlertCard companyId={session.user.company_id} />

            <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {rows.map((m, idx) => {
                const color = getMemberColor(m.id);
                const initial = getMemberInitial(m.name);
                const w = Math.round(((m.revenue ?? 0) / maxRevenue) * 100);
                const acts = actionMap.get(m.id);
                const rank = idx + 1;
                const isTop = rank <= 3 && (m.revenue ?? 0) > 0;
                const rankTone =
                  rank === 1
                    ? 'bg-amber-100 text-amber-800 border-amber-200'
                    : rank === 2
                      ? 'bg-slate-100 text-slate-700 border-slate-200'
                      : rank === 3
                        ? 'bg-orange-50 text-orange-700 border-orange-200'
                        : 'bg-gray-50 text-gray-500 border-gray-200';
                return (
                  <Link
                    key={m.id}
                    href={`/team/${m.id}`}
                    className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:border-gray-700 transition-colors block overflow-hidden"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      {isTop ? (
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-mono tabular-nums font-medium rounded-lg border shrink-0 ${rankTone}`}
                        >
                          <Trophy className="w-3 h-3" />#{rank}
                        </span>
                      ) : (
                        <span
                          className={`inline-flex items-center px-2 py-0.5 text-xs font-mono tabular-nums rounded-lg border shrink-0 ${rankTone}`}
                        >
                          #{rank}
                        </span>
                      )}
                      <div
                        className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center text-white text-base font-semibold shrink-0`}
                      >
                        {initial}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{m.name}</p>
                        <p className="text-xs text-gray-500 truncate">
                          {ROLE_LABEL[m.role]}
                          {m.department ? ` ・ ${m.department}` : ''}
                        </p>
                      </div>
                      <p className="font-mono tabular-nums text-xs text-gray-500 shrink-0">
                        {m.active_deals} 件
                      </p>
                    </div>
                    <p
                      className="font-semibold text-2xl md:text-3xl text-gray-900 tabular-nums leading-none truncate"
                      title={formatYen(m.revenue)}
                    >
                      {formatYen(m.revenue)}
                    </p>
                    <div className="h-1 bg-slate-100 rounded-full overflow-hidden mt-3">
                      <div className="h-full bg-gray-900 rounded-full" style={{ width: `${w}%` }} />
                    </div>
                    {/* 直近 7 日の行動量 */}
                    {acts && acts.total > 0 && (
                      <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-100 text-xs">
                        <span className="inline-flex items-center gap-1 text-gray-700">
                          <Phone className="w-3 h-3" />
                          <span className="font-mono tabular-nums">{acts.calls}</span>
                        </span>
                        <span className="inline-flex items-center gap-1 text-gray-700">
                          <Handshake className="w-3 h-3" />
                          <span className="font-mono tabular-nums">{acts.meetings}</span>
                        </span>
                        <span className="inline-flex items-center gap-1 text-gray-700">
                          <FileText className="w-3 h-3" />
                          <span className="font-mono tabular-nums">{acts.proposals}</span>
                        </span>
                        <span className="ml-auto text-gray-400 font-mono tabular-nums">
                          7d 計 {acts.total}
                        </span>
                      </div>
                    )}
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
