/**
 * 案件一覧 — 隊長思想「3秒判断」のため、stage 別カンバン形式
 */

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { deals, members, customers } from '@/db/schema';
import { eq, and, isNull, desc } from 'drizzle-orm';

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

function formatYen(value: number | null): string {
  if (!value) return '¥0';
  return `¥${value.toLocaleString('ja-JP')}`;
}

export default async function DealsListPage() {
  const session = await auth();
  if (!session?.user?.member_id) redirect('/login');

  const rows = await db
    .select({
      id: deals.id,
      title: deals.title,
      stage: deals.stage,
      amount: deals.amount,
      monthly_amount: deals.monthly_amount,
      revenue_type: deals.revenue_type,
      assignee_name: members.name,
      customer_name: customers.name,
      updated_at: deals.updated_at,
    })
    .from(deals)
    .leftJoin(members, eq(deals.assignee_id, members.id))
    .leftJoin(customers, eq(deals.customer_id, customers.id))
    .where(and(eq(deals.company_id, session.user.company_id), isNull(deals.deleted_at)))
    .orderBy(desc(deals.updated_at))
    .limit(200);

  return (
    <main className="min-h-screen bg-surface">
      <header className="bg-card border-b border-border px-6 py-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-ink">案件</h1>
        <Link
          href="/deals/new"
          className="px-4 py-2 bg-ink text-white text-sm font-medium rounded-lg hover:bg-ink-mid transition-colors active:scale-[0.98]"
        >
          新規登録
        </Link>
      </header>

      <div className="px-6 py-6 max-w-7xl mx-auto">
        {rows.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-12 text-center">
            <p className="text-muted">まだ案件が登録されていません</p>
            <Link
              href="/deals/new"
              className="inline-block mt-4 text-blue-600 hover:underline text-sm"
            >
              最初の案件を登録する →
            </Link>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-slate-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted">案件名</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted">顧客</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted">担当</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted">ステージ</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-muted">金額</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((d) => (
                  <tr key={d.id} className="border-b border-border last:border-0 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/deals/${d.id}`} className="text-ink hover:underline font-medium">
                        {d.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted">{d.customer_name ?? '—'}</td>
                    <td className="px-4 py-3 text-sm text-muted">{d.assignee_name ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-lg text-xs font-medium ${STAGE_COLOR[d.stage] ?? ''}`}>
                        {STAGE_LABEL[d.stage] ?? d.stage}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-sm text-ink">
                      {formatYen(d.amount)}
                      {d.revenue_type !== 'spot' && d.monthly_amount ? (
                        <span className="block text-xs text-muted">月 {formatYen(d.monthly_amount)}</span>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
