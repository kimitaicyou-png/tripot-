import Link from 'next/link';
import { eq, and, isNull, desc } from 'drizzle-orm';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { tasks, actions, members } from '@/db/schema';
import { TaskCheckbox } from '../../../tasks/task-checkbox';
import { TaskQuickAdd } from '@/components/task-quick-add';
import { LogActionButton } from '@/components/log-action-button';
import { deleteDeal } from '@/lib/actions/deals';
import { TRIPOT_CONFIG } from '../../../../../../coaris.config';
import { NextActionSection } from './next-action-section';
import { EmailDraftButton } from './email-draft-button';
import { AttackSection } from './attack-section';
import { ApprovalRequestButton } from './approval-request-button';
import { LostDealSection } from './lost-deal-section';
import { InternalNoteSection } from './internal-note-section';

const ACTION_TYPE_LABEL: Record<string, string> = {
  call: '📞 電話',
  meeting: '🤝 商談',
  proposal: '📄 提案',
  email: '✉️ メール',
  visit: '🚶 訪問',
  other: '📝 その他',
};

function formatYen(value: number | null): string {
  return `¥${(value ?? 0).toLocaleString('ja-JP')}`;
}

export type DealOverview = {
  id: string;
  title: string;
  stage: string;
  amount: number | null;
  monthly_amount: number | null;
  revenue_type: string;
  expected_close_date: string | null;
  ordered_at: string | null;
  paid_at: string | null;
  metadata: Record<string, unknown> | null;
  assignee_name: string | null;
  customer_name: string | null;
};

export async function OverviewTab({ deal }: { deal: DealOverview }) {
  const session = await auth();
  if (!session?.user?.member_id) return null;

  const dealId = deal.id;

  const [dealTasks, dealActions] = await Promise.all([
    db
      .select({
        id: tasks.id,
        title: tasks.title,
        status: tasks.status,
        due_date: tasks.due_date,
      })
      .from(tasks)
      .where(and(eq(tasks.deal_id, dealId), isNull(tasks.deleted_at)))
      .orderBy(tasks.status, tasks.due_date),
    db
      .select({
        id: actions.id,
        type: actions.type,
        note: actions.note,
        occurred_at: actions.occurred_at,
        member_name: members.name,
      })
      .from(actions)
      .leftJoin(members, eq(actions.member_id, members.id))
      .where(eq(actions.deal_id, dealId))
      .orderBy(desc(actions.occurred_at))
      .limit(20),
  ]);

  const stageDef = TRIPOT_CONFIG.stages.find((s) => s.key === deal.stage);
  const stageLabel = stageDef?.label ?? deal.stage;
  const stageBadge = stageDef?.badgeClass ?? 'bg-slate-100 text-slate-700';

  const handleDelete = deleteDeal.bind(null, dealId);

  return (
    <div className="space-y-6">
      <section className="bg-card border border-border rounded-xl p-6">
        <p className="text-xs uppercase tracking-widest text-subtle">受注金額</p>
        <p className="font-serif italic text-5xl text-ink tracking-tight tabular-nums mt-1">
          {formatYen(deal.amount)}
        </p>
        {deal.revenue_type !== 'spot' && deal.monthly_amount ? (
          <p className="text-sm text-muted mt-2 font-mono">
            ＋月額 {formatYen(deal.monthly_amount)}
          </p>
        ) : null}
      </section>

      <NextActionSection dealId={dealId} />

      <AttackSection dealId={dealId} />

      <section className="bg-card border border-border rounded-xl p-6 grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
        <div>
          <p className="text-xs text-subtle mb-1">ステージ</p>
          <span
            className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-lg ${stageBadge}`}
          >
            {stageLabel}
          </span>
        </div>
        <div>
          <p className="text-xs text-subtle mb-1">担当</p>
          <p className="text-ink font-medium">{deal.assignee_name ?? '—'}</p>
        </div>
        <div>
          <p className="text-xs text-subtle mb-1">顧客</p>
          <p className="text-ink font-medium">{deal.customer_name ?? '—'}</p>
        </div>
        <div>
          <p className="text-xs text-subtle mb-1">受注予定</p>
          <p className="text-ink font-medium font-mono">{deal.expected_close_date ?? '—'}</p>
        </div>
        <div>
          <p className="text-xs text-subtle mb-1">受注日</p>
          <p className="text-ink font-medium font-mono">{deal.ordered_at ?? '—'}</p>
        </div>
        <div>
          <p className="text-xs text-subtle mb-1">入金日</p>
          <p className="text-ink font-medium font-mono">{deal.paid_at ?? '—'}</p>
        </div>
      </section>

      <section className="bg-card border border-border rounded-xl p-6">
        <h3 className="text-sm font-medium text-ink mb-3">
          タスク <span className="text-xs text-subtle font-normal">{dealTasks.length}件</span>
        </h3>
        {dealTasks.length === 0 ? (
          <p className="text-sm text-muted">タスクはまだありません</p>
        ) : (
          <ul className="space-y-2">
            {dealTasks.map((t) => (
              <li
                key={t.id}
                className={`flex items-center gap-3 ${t.status === 'done' ? 'opacity-60' : ''}`}
              >
                <TaskCheckbox taskId={t.id} done={t.status === 'done'} />
                <p
                  className={`flex-1 text-sm text-ink ${t.status === 'done' ? 'line-through' : ''}`}
                >
                  {t.title}
                </p>
                {t.due_date && (
                  <span className="text-xs font-mono text-muted">{t.due_date}</span>
                )}
              </li>
            ))}
          </ul>
        )}
        <TaskQuickAdd dealId={dealId} />
      </section>

      <section className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-ink">
            行動履歴{' '}
            <span className="text-xs text-subtle font-normal">{dealActions.length}件</span>
          </h3>
          <LogActionButton dealId={dealId} variant="inline" />
        </div>
        {dealActions.length === 0 ? (
          <p className="text-sm text-muted">まだ行動が記録されていません</p>
        ) : (
          <ul className="space-y-3">
            {dealActions.map((a) => (
              <li key={a.id} className="flex items-start gap-3 border-l-2 border-border pl-3">
                <div className="flex-1">
                  <p className="text-sm text-ink">
                    <span className="font-medium">
                      {ACTION_TYPE_LABEL[a.type] ?? a.type}
                    </span>
                    <span className="text-muted ml-2">by {a.member_name}</span>
                  </p>
                  {a.note && <p className="text-sm text-muted mt-1">{a.note}</p>}
                  <p className="text-xs font-mono text-subtle mt-1">
                    {new Date(a.occurred_at).toLocaleString('ja-JP')}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <LostDealSection dealId={dealId} currentStage={deal.stage} />

      <InternalNoteSection
        dealId={dealId}
        initialNote={
          typeof (deal.metadata as Record<string, unknown> | null)?.internal_note === 'string'
            ? ((deal.metadata as Record<string, unknown>).internal_note as string)
            : ''
        }
        updatedAt={
          typeof (deal.metadata as Record<string, unknown> | null)?.internal_note_updated_at === 'string'
            ? ((deal.metadata as Record<string, unknown>).internal_note_updated_at as string)
            : null
        }
      />

      <section className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <EmailDraftButton dealId={dealId} dealTitle={deal.title} />
          <ApprovalRequestButton dealId={dealId} />
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={`/deals/${dealId}/edit`}
            className="px-4 py-2 bg-card border border-border text-ink text-sm font-medium rounded-lg hover:bg-slate-50"
          >
            編集
          </Link>
          <form action={handleDelete}>
            <button
              type="submit"
              className="px-4 py-2 bg-red-50 border border-red-200 text-red-700 text-sm font-medium rounded-lg hover:bg-red-100"
            >
              削除
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
