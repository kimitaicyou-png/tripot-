import Link from 'next/link';
import { sql, eq, and, isNull } from 'drizzle-orm';
import { Users, AlertTriangle, ShieldCheck } from 'lucide-react';
import { db } from '@/lib/db';
import { members, tasks } from '@/db/schema';

const ALERT_THRESHOLD = 15;
const OVERLOAD_THRESHOLD = 30;

export async function OverloadAlertCard({ companyId }: { companyId: string }) {
  const rows = await db
    .select({
      id: members.id,
      name: members.name,
      todo_count: sql<number>`COUNT(${tasks.id}) FILTER (WHERE ${tasks.status} = 'todo' AND ${tasks.deleted_at} IS NULL)::int`,
      overdue_count: sql<number>`COUNT(${tasks.id}) FILTER (WHERE ${tasks.status} = 'todo' AND ${tasks.due_date} < CURRENT_DATE AND ${tasks.deleted_at} IS NULL)::int`,
    })
    .from(members)
    .leftJoin(tasks, eq(tasks.assignee_id, members.id))
    .where(
      and(
        eq(members.company_id, companyId),
        eq(members.status, 'active'),
        isNull(members.deleted_at)
      )
    )
    .groupBy(members.id, members.name);

  const scored = rows
    .map((r) => ({
      id: r.id,
      name: r.name,
      todoCount: r.todo_count ?? 0,
      overdueCount: r.overdue_count ?? 0,
      score: (r.todo_count ?? 0) + (r.overdue_count ?? 0) * 2,
    }))
    .filter((m) => m.score >= ALERT_THRESHOLD)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) {
    return (
      <section className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-2">
          <ShieldCheck className="w-4 h-4 text-blue-600" />
          <p className="text-xs uppercase tracking-widest text-gray-500">チーム稼働状況</p>
        </div>
        <p className="text-sm text-gray-700">
          全メンバーの負荷は適正範囲内です。期限切れタスク・残タスクの偏りはありません
        </p>
      </section>
    );
  }

  return (
    <section className="bg-white border border-gray-200 rounded-xl p-6">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-orange-600" />
          <p className="text-xs uppercase tracking-widest text-gray-500">
            過負荷アラート {scored.length}人
          </p>
        </div>
        <p className="text-xs text-gray-500">
          残タスク + 期限切れ × 2 ≥ {ALERT_THRESHOLD}
        </p>
      </div>

      <ul className="divide-y divide-gray-100">
        {scored.map((m) => {
          const isOverload = m.score >= OVERLOAD_THRESHOLD;
          const tone = isOverload ? 'text-red-700' : 'text-orange-700';
          const badge = isOverload
            ? 'bg-red-50 text-red-800 border-red-200'
            : 'bg-orange-50 text-orange-800 border-orange-200';
          const label = isOverload ? '過負荷' : '警戒';

          return (
            <li key={m.id} className="py-3 flex items-center gap-3">
              <Users className="w-4 h-4 text-gray-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <Link
                  href={`/team/${m.id}`}
                  className="text-sm font-medium text-gray-900 hover:text-blue-700 truncate block"
                >
                  {m.name}
                </Link>
                <p className="text-xs text-gray-500 mt-0.5 font-mono">
                  残{m.todoCount}件 / 期限切れ{m.overdueCount}件
                </p>
              </div>
              <div className="text-right">
                <span
                  className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-lg border ${badge}`}
                >
                  {label}
                </span>
                <p className={`font-mono text-xs font-semibold mt-1 ${tone}`}>
                  score {m.score}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
