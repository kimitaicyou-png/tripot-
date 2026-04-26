import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { members, deals, tasks, actions } from '@/db/schema';
import { eq, and, sql, isNull, gte } from 'drizzle-orm';
import { LogActionButton } from '@/components/log-action-button';
import { MorningBrief } from './_components/morning-brief';

const QUOTES = [
  '打席に立たなければヒットは出ない。',
  '小さな一歩が、大きな案件を動かす。',
  '放置は最大の敵。今日連絡するだけで状況は変わる。',
  '行動量がKPIの源泉。量×質=結果。',
];

function pickQuote(memberId: string): string {
  let hash = 0;
  for (let i = 0; i < memberId.length; i++) {
    hash = (hash << 5) - hash + memberId.charCodeAt(i);
    hash = hash & hash;
  }
  return QUOTES[Math.abs(hash) % QUOTES.length]!;
}

function formatYen(value: number | null): string {
  return `¥${(value ?? 0).toLocaleString('ja-JP')}`;
}

export default async function MemberHomePage({ params }: { params: Promise<{ memberId: string }> }) {
  const session = await auth();
  if (!session?.user?.member_id) redirect('/login');

  const companyId = session.user.company_id;
  const { memberId } = await params;

  if (memberId !== session.user.member_id && session.user.role === 'member') {
    redirect(`/home/${session.user.member_id}`);
  }

  const member = await db
    .select()
    .from(members)
    .where(and(eq(members.id, memberId), eq(members.company_id, companyId), isNull(members.deleted_at)))
    .limit(1)
    .then((rows) => rows[0]);

  if (!member) redirect('/login');

  const dealStats = await db
    .select({
      revenue: sql<number>`COALESCE(SUM(${deals.amount}) FILTER (WHERE ${deals.stage} IN ('paid', 'invoiced')), 0)::int`,
      activeCount: sql<number>`COUNT(*) FILTER (WHERE ${deals.stage} IN ('proposing', 'ordered', 'in_production'))::int`,
    })
    .from(deals)
    .where(and(eq(deals.assignee_id, memberId), eq(deals.company_id, companyId), isNull(deals.deleted_at)))
    .then((rows) => rows[0]);

  const taskCount = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(tasks)
    .where(
      and(
        eq(tasks.assignee_id, memberId),
        eq(tasks.company_id, companyId),
        eq(tasks.status, 'todo'),
        isNull(tasks.deleted_at),
      )
    )
    .then((rows) => rows[0]?.count ?? 0);

  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 6);
  weekStart.setHours(0, 0, 0, 0);

  const actionStats = await db
    .select({
      total: sql<number>`COUNT(*)::int`,
      calls: sql<number>`COUNT(*) FILTER (WHERE ${actions.type} = 'call')::int`,
      meetings: sql<number>`COUNT(*) FILTER (WHERE ${actions.type} = 'meeting')::int`,
      proposals: sql<number>`COUNT(*) FILTER (WHERE ${actions.type} = 'proposal')::int`,
    })
    .from(actions)
    .where(and(eq(actions.member_id, memberId), eq(actions.company_id, companyId), gte(actions.occurred_at, weekStart)))
    .then((rows) => rows[0]);

  const quote = pickQuote(memberId);

  return (
    <main className="min-h-screen bg-surface">
      <header className="bg-card border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted">{member.name} のホーム</p>
          <p className="text-xs font-mono text-subtle">
            {new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })}
          </p>
        </div>
      </header>

      <div className="px-6 py-8 max-w-5xl mx-auto pb-32 md:pb-12">
        <section>
          <p className="text-sm text-muted">あなたの売上（入金確定）</p>
          <h1 className="font-serif italic text-6xl md:text-8xl text-ink tracking-tight tabular-nums mt-2">
            {formatYen(dealStats?.revenue ?? 0)}
          </h1>
        </section>

        <section className="mt-12 border-l-2 border-ink pl-6 py-2">
          <p className="font-serif italic text-2xl text-ink-mid leading-relaxed">{quote}</p>
        </section>

        <div className="mt-12">
          <MorningBrief memberId={memberId} />
        </div>

        <section className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
            <p className="text-xs text-subtle">進行中の案件</p>
            <p className="font-serif italic text-4xl text-ink mt-1 tabular-nums">{dealStats?.activeCount ?? 0}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
            <p className="text-xs text-subtle">残タスク</p>
            <p className="font-serif italic text-4xl text-ink mt-1 tabular-nums">{taskCount}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
            <p className="text-xs text-subtle">今週の電話</p>
            <p className="font-serif italic text-4xl text-ink mt-1 tabular-nums">{actionStats?.calls ?? 0}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
            <p className="text-xs text-subtle">今週の商談</p>
            <p className="font-serif italic text-4xl text-ink mt-1 tabular-nums">{actionStats?.meetings ?? 0}</p>
          </div>
        </section>

        <section className="mt-8 bg-card border border-border rounded-xl p-5 shadow-sm">
          <p className="text-sm font-medium text-ink mb-3">今週の行動量（直近7日）</p>
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <p className="text-xs text-subtle">合計</p>
              <p className="font-serif italic text-3xl text-ink tabular-nums">{actionStats?.total ?? 0}</p>
            </div>
            <div className="flex-1">
              <p className="text-xs text-subtle">電話</p>
              <p className="font-mono tabular-nums text-xl text-ink">{actionStats?.calls ?? 0}</p>
            </div>
            <div className="flex-1">
              <p className="text-xs text-subtle">商談</p>
              <p className="font-mono tabular-nums text-xl text-ink">{actionStats?.meetings ?? 0}</p>
            </div>
            <div className="flex-1">
              <p className="text-xs text-subtle">提案</p>
              <p className="font-mono tabular-nums text-xl text-ink">{actionStats?.proposals ?? 0}</p>
            </div>
          </div>
        </section>
      </div>

      <LogActionButton />
    </main>
  );
}
