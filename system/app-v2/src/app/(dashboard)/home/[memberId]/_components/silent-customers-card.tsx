import Link from 'next/link';
import { sql, eq, and, isNull } from 'drizzle-orm';
import { Phone, AlertTriangle } from 'lucide-react';
import { db } from '@/lib/db';
import { customers, deals, actions } from '@/db/schema';

const SILENCE_THRESHOLD_DAYS = 14;
const TOP_LIMIT = 5;

function formatYen(value: number | null): string {
  return `¥${(value ?? 0).toLocaleString('ja-JP')}`;
}

function daysSince(date: Date | null): number | null {
  if (!date) return null;
  return Math.floor((Date.now() - new Date(date).getTime()) / 86_400_000);
}

export async function SilentCustomersCard({ companyId }: { companyId: string }) {
  const rows = await db
    .select({
      id: customers.id,
      name: customers.name,
      total_amount: sql<number>`COALESCE(SUM(${deals.amount}) FILTER (WHERE ${deals.stage} IN ('paid','invoiced')), 0)::int`,
      active_count: sql<number>`COUNT(${deals.id}) FILTER (WHERE ${deals.stage} IN ('proposing','ordered','in_production'))::int`,
      last_action_at: sql<Date | null>`MAX(${actions.occurred_at})`,
    })
    .from(customers)
    .leftJoin(deals, and(eq(deals.customer_id, customers.id), isNull(deals.deleted_at)))
    .leftJoin(actions, eq(actions.deal_id, deals.id))
    .where(and(eq(customers.company_id, companyId), isNull(customers.deleted_at)))
    .groupBy(customers.id, customers.name)
    .having(
      sql`MAX(${actions.occurred_at}) IS NULL OR MAX(${actions.occurred_at}) < NOW() - INTERVAL '${sql.raw(String(SILENCE_THRESHOLD_DAYS))} days'`
    )
    .orderBy(sql`MAX(${actions.occurred_at}) ASC NULLS FIRST`)
    .limit(TOP_LIMIT);

  const candidates = rows.filter((r) => (r.active_count ?? 0) > 0 || (r.total_amount ?? 0) > 0);

  if (candidates.length === 0) {
    return (
      <section className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-2">
          <Phone className="w-4 h-4 text-gray-500" />
          <p className="text-xs uppercase tracking-widest text-gray-500">沈黙顧客</p>
        </div>
        <p className="text-sm text-gray-700">
          直近 {SILENCE_THRESHOLD_DAYS} 日間の沈黙顧客はいません。良い接触ペースを維持できています
        </p>
      </section>
    );
  }

  return (
    <section className="bg-white border border-gray-200 rounded-xl p-6">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          <p className="text-xs uppercase tracking-widest text-gray-500">
            沈黙顧客 Top{candidates.length}
          </p>
        </div>
        <p className="text-xs text-gray-500">
          {SILENCE_THRESHOLD_DAYS}日以上連絡なし
        </p>
      </div>

      <ul className="divide-y divide-gray-100">
        {candidates.map((c) => {
          const days = daysSince(c.last_action_at);
          const tone =
            days === null || days >= 60
              ? 'text-red-700'
              : days >= 30
              ? 'text-orange-700'
              : 'text-amber-700';

          return (
            <li key={c.id} className="py-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <Link
                  href={`/customers/${c.id}`}
                  className="text-sm font-medium text-gray-900 hover:text-blue-700 truncate block"
                >
                  {c.name}
                </Link>
                <p className="text-xs text-gray-500 mt-0.5 font-mono">
                  入金累計 {formatYen(c.total_amount)} ／ 進行中 {c.active_count}件
                </p>
              </div>
              <div className="text-right">
                <p className={`font-mono text-sm font-semibold ${tone}`}>
                  {days === null ? '記録なし' : `${days}日沈黙`}
                </p>
                {c.last_action_at && (
                  <p className="text-xs text-gray-500 font-mono mt-0.5">
                    {new Date(c.last_action_at).toLocaleDateString('ja-JP')}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <Link
        href="/customers"
        className="mt-4 inline-block text-xs text-blue-700 hover:text-blue-900"
      >
        すべての顧客を見る →
      </Link>
    </section>
  );
}
