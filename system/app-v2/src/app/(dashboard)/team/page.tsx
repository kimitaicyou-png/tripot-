import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { members, deals, actions } from '@/db/schema';
import { eq, and, isNull, sql, gte } from 'drizzle-orm';
import { getMemberColor, getMemberInitial } from '@/lib/member-color';

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

  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 6);
  weekStart.setHours(0, 0, 0, 0);

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
    .where(and(eq(members.company_id, session.user.company_id), eq(members.status, 'active'), isNull(members.deleted_at)))
    .groupBy(members.id, members.name, members.email, members.role, members.department);

  return (
    <main className="min-h-screen bg-surface">
      <header className="bg-card border-b border-border px-6 py-4">
        <h1 className="text-lg font-semibold text-ink">チーム</h1>
      </header>

      <div className="px-6 py-6 max-w-5xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {rows.map((m) => {
            const color = getMemberColor(m.id);
            const initial = getMemberInitial(m.name);
            return (
              <Link
                key={m.id}
                href={`/team/${m.id}`}
                className="bg-card border border-border rounded-xl p-5 shadow-sm block hover:border-ink-mid transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-lg ${color} flex items-center justify-center text-white text-lg font-semibold`}>
                    {initial}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-medium text-ink">{m.name}</p>
                    <p className="text-xs text-subtle">{ROLE_LABEL[m.role]}{m.department ? ` ・ ${m.department}` : ''}</p>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-subtle">売上累計</p>
                    <p className="font-mono tabular-nums text-ink mt-0.5">{formatYen(m.revenue)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-subtle">進行中</p>
                    <p className="font-mono tabular-nums text-ink mt-0.5">{m.active_deals} 件</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </main>
  );
}
