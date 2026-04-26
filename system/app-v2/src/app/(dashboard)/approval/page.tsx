import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { approvals, members, deals } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { DecideButtons } from './_components/decide-buttons';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { SectionHeading } from '@/components/ui/section-heading';
import { EmptyState } from '@/components/ui/empty-state';

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
      requester_id: approvals.requester_id,
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

  const myMemberId = session.user.member_id;
  const pendingCount = rows.filter((a) => a.status === 'pending').length;
  const approvedCount = rows.filter((a) => a.status === 'approved').length;
  const rejectedCount = rows.filter((a) => a.status === 'rejected').length;

  const pendingForMe = rows.filter(
    (a) => a.status === 'pending' && a.requester_id !== myMemberId,
  );
  const myPending = rows.filter((a) => a.status === 'pending' && a.requester_id === myMemberId);
  const decided = rows.filter((a) => a.status !== 'pending');

  return (
    <main className="min-h-screen bg-surface">
      <PageHeader
        eyebrow="APPROVALS"
        title="承認"
        subtitle={
          <>
            承認待ち <span className="font-mono tabular-nums text-amber-700">{pendingCount}</span> ／ 全
            <span className="font-mono tabular-nums text-ink"> {rows.length}</span> 件
          </>
        }
      />

      <div className="px-6 py-10 max-w-5xl mx-auto space-y-12">
        {rows.length === 0 ? (
          <EmptyState
            icon="◯"
            title="承認案件はまだありません"
            description="案件詳細から承認申請を起こすと、ここに表示されます。"
          />
        ) : (
          <>
            <section className="grid grid-cols-3 gap-4">
              <StatCard
                label="承認待ち"
                value={pendingCount}
                tone={pendingCount > 0 ? 'accent' : 'default'}
              />
              <StatCard label="承認済み" value={approvedCount} tone="up" />
              <StatCard
                label="却下"
                value={rejectedCount}
                tone={rejectedCount > 0 ? 'down' : 'default'}
              />
            </section>

            {pendingForMe.length > 0 && (
              <section>
                <SectionHeading
                  eyebrow="ACTION REQUIRED"
                  title="あなたの承認が必要"
                  count={pendingForMe.length}
                />
                <div className="bg-card border border-border rounded-xl divide-y divide-border">
                  {pendingForMe.map((a) => (
                    <div
                      key={a.id}
                      className="px-5 py-4 flex items-center gap-4 hover:bg-slate-50 transition-colors"
                    >
                      <span
                        className={`inline-flex px-2.5 py-0.5 rounded-lg text-xs font-medium shrink-0 ${STATUS_COLOR[a.status]}`}
                      >
                        {STATUS_LABEL[a.status]}
                      </span>
                      <span className="text-xs text-muted shrink-0 w-16">
                        {TYPE_LABEL[a.type] ?? a.type}
                      </span>
                      <span className="flex-1 text-sm text-ink truncate">
                        {a.deal_title ?? '—'}
                      </span>
                      <span className="text-xs text-muted shrink-0 hidden md:inline">
                        申請: {a.requester_name ?? '—'}
                      </span>
                      <DecideButtons approvalId={a.id} />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {myPending.length > 0 && (
              <section>
                <SectionHeading
                  eyebrow="MY REQUESTS"
                  title="自分の申請（承認待ち）"
                  count={myPending.length}
                />
                <div className="bg-card border border-border rounded-xl divide-y divide-border">
                  {myPending.map((a) => (
                    <div key={a.id} className="px-5 py-4 flex items-center gap-4">
                      <span
                        className={`inline-flex px-2.5 py-0.5 rounded-lg text-xs font-medium shrink-0 ${STATUS_COLOR[a.status]}`}
                      >
                        {STATUS_LABEL[a.status]}
                      </span>
                      <span className="text-xs text-muted shrink-0 w-16">
                        {TYPE_LABEL[a.type] ?? a.type}
                      </span>
                      <span className="flex-1 text-sm text-ink truncate">
                        {a.deal_title ?? '—'}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {decided.length > 0 && (
              <section>
                <SectionHeading eyebrow="HISTORY" title="決定済み" count={decided.length} />
                <div className="bg-card border border-border rounded-xl divide-y divide-border">
                  {decided.map((a) => (
                    <div key={a.id} className="px-5 py-4 flex items-center gap-4 opacity-80">
                      <span
                        className={`inline-flex px-2.5 py-0.5 rounded-lg text-xs font-medium shrink-0 ${STATUS_COLOR[a.status]}`}
                      >
                        {STATUS_LABEL[a.status]}
                      </span>
                      <span className="text-xs text-muted shrink-0 w-16">
                        {TYPE_LABEL[a.type] ?? a.type}
                      </span>
                      <span className="flex-1 text-sm text-ink truncate">
                        {a.deal_title ?? '—'}
                      </span>
                      <span className="text-xs text-muted shrink-0 hidden md:inline">
                        承認: {a.approver_name ?? '—'}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}
