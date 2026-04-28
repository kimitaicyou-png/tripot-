import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { members, deals, customers, actions, tasks } from '@/db/schema';
import { eq, and, sql, isNull, desc, gte } from 'drizzle-orm';
import { getMemberColor, getMemberInitial } from '@/lib/member-color';

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

const ROLE_LABEL: Record<string, string> = {
  president: '社長',
  hq_member: '本部メンバー',
  member: 'メンバー',
};

function formatYen(value: number | null): string {
  return `¥${(value ?? 0).toLocaleString('ja-JP')}`;
}

export default async function TeamMemberDetailPage({
  params,
}: {
  params: Promise<{ memberId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.member_id) redirect('/login');

  const { memberId } = await params;

  const member = await db
    .select()
    .from(members)
    .where(
      and(
        eq(members.id, memberId),
        eq(members.company_id, session.user.company_id),
        isNull(members.deleted_at),
      ),
    )
    .limit(1)
    .then((rows) => rows[0]);

  if (!member) notFound();

  const memberDeals = await db
    .select({
      id: deals.id,
      title: deals.title,
      stage: deals.stage,
      amount: deals.amount,
      customer_name: customers.name,
      updated_at: deals.updated_at,
    })
    .from(deals)
    .leftJoin(customers, eq(deals.customer_id, customers.id))
    .where(
      and(
        eq(deals.assignee_id, memberId),
        eq(deals.company_id, session.user.company_id),
        isNull(deals.deleted_at),
      ),
    )
    .orderBy(desc(deals.updated_at))
    .limit(50);

  const totalRevenue = memberDeals
    .filter((d) => d.stage === 'paid' || d.stage === 'invoiced')
    .reduce((s, d) => s + (d.amount ?? 0), 0);

  const activeDeals = memberDeals.filter((d) =>
    ['proposing', 'ordered', 'in_production'].includes(d.stage),
  ).length;

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
    .where(
      and(
        eq(actions.member_id, memberId),
        eq(actions.company_id, session.user.company_id),
        gte(actions.occurred_at, weekStart),
      ),
    )
    .then((rows) => rows[0]);

  const taskCounts = await db
    .select({
      todo: sql<number>`COUNT(*) FILTER (WHERE ${tasks.status} != 'done')::int`,
      done: sql<number>`COUNT(*) FILTER (WHERE ${tasks.status} = 'done')::int`,
    })
    .from(tasks)
    .where(
      and(
        eq(tasks.assignee_id, memberId),
        eq(tasks.company_id, session.user.company_id),
        isNull(tasks.deleted_at),
      ),
    )
    .then((rows) => rows[0]);

  const color = getMemberColor(memberId);
  const initial = getMemberInitial(member.name);

  return (
    <main className="min-h-screen bg-surface">
      <header className="bg-card border-b border-border px-6 py-4 flex items-center gap-4">
        <Link href="/team" className="text-muted hover:text-ink text-sm">
          ← チーム
        </Link>
        <h1 className="text-lg font-semibold text-ink">{member.name}</h1>
      </header>

      <div className="px-6 py-8 max-w-3xl mx-auto space-y-6">
        <section className="bg-card border border-border rounded-xl p-6 flex items-center gap-5">
          <div className={`w-16 h-16 rounded-xl ${color} flex items-center justify-center text-white text-2xl font-semibold shrink-0`}>
            {initial}
          </div>
          <div className="flex-1">
            <p className="text-base font-medium text-ink">{member.name}</p>
            <p className="text-xs text-muted mt-0.5">
              {ROLE_LABEL[member.role]}
              {member.department ? ` ・ ${member.department}` : ''}
            </p>
            <p className="text-xs font-mono text-subtle mt-0.5">{member.email}</p>
          </div>
        </section>

        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-card border border-border rounded-xl p-5">
            <p className="text-xs text-subtle">売上累計</p>
            <p className="font-semibold text-2xl text-ink mt-1 tabular-nums">
              {formatYen(totalRevenue)}
            </p>
          </div>
          <div className="bg-card border border-border rounded-xl p-5">
            <p className="text-xs text-subtle">進行中</p>
            <p className="font-semibold text-2xl text-ink mt-1 tabular-nums">{activeDeals} 件</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-5">
            <p className="text-xs text-subtle">直近7日 行動量</p>
            <p className="font-semibold text-2xl text-ink mt-1 tabular-nums">{actionStats?.total ?? 0}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-5">
            <p className="text-xs text-subtle">タスク</p>
            <p className="font-semibold text-2xl text-ink mt-1 tabular-nums">
              {taskCounts?.todo ?? 0}
              <span className="text-sm text-muted ml-2">/ {(taskCounts?.todo ?? 0) + (taskCounts?.done ?? 0)}</span>
            </p>
          </div>
        </section>

        <section className="bg-card border border-border rounded-xl p-6">
          <h3 className="text-sm font-medium text-ink mb-3">行動量内訳（直近7日）</h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs text-subtle">電話</p>
              <p className="font-mono tabular-nums text-2xl text-ink mt-1">{actionStats?.calls ?? 0}</p>
            </div>
            <div>
              <p className="text-xs text-subtle">商談</p>
              <p className="font-mono tabular-nums text-2xl text-ink mt-1">{actionStats?.meetings ?? 0}</p>
            </div>
            <div>
              <p className="text-xs text-subtle">提案</p>
              <p className="font-mono tabular-nums text-2xl text-ink mt-1">{actionStats?.proposals ?? 0}</p>
            </div>
          </div>
        </section>

        <section className="bg-card border border-border rounded-xl p-6">
          <h3 className="text-sm font-medium text-ink mb-3">
            担当案件 <span className="text-xs text-subtle font-normal">{memberDeals.length}件</span>
          </h3>
          {memberDeals.length === 0 ? (
            <p className="text-sm text-muted">担当案件はまだありません</p>
          ) : (
            <ul className="divide-y divide-border">
              {memberDeals.map((d) => (
                <li key={d.id} className="py-3 flex items-center gap-3">
                  <span
                    className={`inline-flex px-2.5 py-0.5 rounded-lg text-xs font-medium shrink-0 ${STAGE_COLOR[d.stage] ?? ''}`}
                  >
                    {STAGE_LABEL[d.stage] ?? d.stage}
                  </span>
                  <Link href={`/deals/${d.id}`} className="flex-1 text-sm text-ink hover:underline truncate">
                    {d.title}
                  </Link>
                  <span className="text-xs text-muted shrink-0 hidden md:inline">
                    {d.customer_name ?? '—'}
                  </span>
                  <span className="font-mono tabular-nums text-sm text-ink shrink-0">
                    {formatYen(d.amount)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
