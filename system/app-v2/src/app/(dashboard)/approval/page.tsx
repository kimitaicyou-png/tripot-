import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { approvals, members, deals } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';

const TYPE_LABEL: Record<string, string> = {
  discount: '値引き',
  expense: '経費',
  contract: '契約',
  custom: 'その他',
};

const STATUS_COLOR: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700',
  approved: 'bg-emerald-50 text-emerald-700',
  rejected: 'bg-red-50 text-red-700',
};

const STATUS_LABEL: Record<string, string> = {
  pending: '承認待ち',
  approved: '承認済み',
  rejected: '却下',
};

export default async function ApprovalPage() {
  const session = await auth();
  if (!session?.user?.member_id) redirect('/login');

  const requester = alias(members, 'requester');
  const approver = alias(members, 'approver');

  const rows = await db
    .select({
      id: approvals.id,
      type: approvals.type,
      status: approvals.status,
      requested_at: approvals.requested_at,
      requester_name: requester.name,
      approver_name: approver.name,
      deal_title: deals.title,
      deal_id: deals.id,
    })
    .from(approvals)
    .leftJoin(requester, eq(approvals.requester_id, requester.id))
    .leftJoin(approver, eq(approvals.approver_id, approver.id))
    .leftJoin(deals, eq(approvals.deal_id, deals.id))
    .where(eq(approvals.company_id, session.user.company_id))
    .orderBy(desc(approvals.requested_at))
    .limit(100);

  return (
    <main className="min-h-screen bg-surface">
      <header className="bg-card border-b border-border px-6 py-4">
        <h1 className="text-lg font-semibold text-ink">承認</h1>
      </header>

      <div className="px-6 py-6 max-w-5xl mx-auto">
        {rows.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-12 text-center">
            <p className="text-muted">承認案件はまだありません</p>
            <p className="text-xs text-subtle mt-2">案件詳細から承認申請できます（実装は明朝）</p>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-slate-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted">種類</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted">案件</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted">申請者</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted">承認者</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted">状態</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((a) => (
                  <tr key={a.id} className="border-b border-border last:border-0 hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm text-ink">{TYPE_LABEL[a.type] ?? a.type}</td>
                    <td className="px-4 py-3 text-sm text-muted">{a.deal_title ?? '—'}</td>
                    <td className="px-4 py-3 text-sm text-muted">{a.requester_name ?? '—'}</td>
                    <td className="px-4 py-3 text-sm text-muted">{a.approver_name ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-lg text-xs font-medium ${STATUS_COLOR[a.status] ?? ''}`}>
                        {STATUS_LABEL[a.status] ?? a.status}
                      </span>
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
