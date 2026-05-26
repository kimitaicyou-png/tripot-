import Link from 'next/link';
import { eq, and, isNull, desc } from 'drizzle-orm';
import { Phone, Handshake, FileText, Mail, Footprints, FileEdit } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { tasks, actions, members } from '@/db/schema';
import { TaskCheckbox } from '../../../tasks/task-checkbox';
import { TaskQuickAdd } from '@/components/task-quick-add';
import { LogActionButton } from '@/components/log-action-button';
import { deleteDeal } from '@/lib/actions/deals';
import { getLatestAiJobForDeal } from '@/lib/ai/jobs';
import { formatYen } from '@/lib/format';
import { NextActionSection } from './next-action-section';
import { RiskScoreSection } from './risk-score-section';
import { EmailDraftButton } from './email-draft-button';
import { AttackSection } from './attack-section';
import { ApprovalRequestButton } from './approval-request-button';
import { LostDealSection } from './lost-deal-section';
import { InternalNoteSection } from './internal-note-section';
import { RunningSection } from './running-section';
import { TargetSection } from './target-section';
import { ExternalCostForm } from './external-cost-form';
import { ImportReplyButton } from './import-reply-button';
import { ConfidenceDropdown } from './confidence-dropdown';
import type { SubjectiveConfidence } from '@/lib/deals/confidence';

const ACTION_TYPE_LABEL: Record<string, string> = {
  call: '電話',
  meeting: '商談',
  proposal: '提案',
  email: 'メール',
  visit: '訪問',
  other: 'その他',
};

const ACTION_TYPE_ICON: Record<string, LucideIcon> = {
  call: Phone,
  meeting: Handshake,
  proposal: FileText,
  email: Mail,
  visit: Footprints,
  other: FileEdit,
};

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
  external_cost: number | null;
  gross_profit: number | null;
  gross_profit_rate: string | number | null;
  subjective_confidence: SubjectiveConfidence | null;
};

export async function OverviewTab({ deal }: { deal: DealOverview }) {
  const session = await auth();
  if (!session?.user?.member_id) return null;

  const dealId = deal.id;

  // 過去の AI ジョブ（risk-score / next-action）を並列取得、あれば即表示
  const [latestRiskJob, latestNextActionJob] = await Promise.all([
    getLatestAiJobForDeal<{
      score: number;
      level: string;
      reasons: string[];
      recommended_actions: string[];
    }>({ dealId, jobType: 'risk-score', companyId: session.user.company_id }),
    getLatestAiJobForDeal<{
      action: string;
      reason: string;
      due_in_days: number;
      action_type: string;
    }>({ dealId, jobType: 'next-action', companyId: session.user.company_id }),
  ]);

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

  const handleDelete = deleteDeal.bind(null, dealId);

  return (
    <div className="space-y-6">
      <section className="bg-white border border-gray-200 rounded-xl p-6 overflow-hidden">
        <p className="text-xs uppercase tracking-widest text-gray-500 truncate">受注金額</p>
        <p
          className="font-semibold text-3xl md:text-5xl text-gray-900 tracking-tight tabular-nums mt-1 truncate"
          title={formatYen(deal.amount)}
        >
          {formatYen(deal.amount)}
        </p>
        {deal.revenue_type !== 'spot' && deal.monthly_amount ? (
          <p className="text-sm text-gray-700 mt-2 font-mono">
            ＋月額 {formatYen(deal.monthly_amount)}
          </p>
        ) : null}
      </section>

      <ExternalCostForm
        dealId={dealId}
        externalCost={deal.external_cost ?? 0}
        grossProfit={deal.gross_profit ?? deal.amount ?? 0}
        grossProfitRate={deal.gross_profit_rate}
      />

      <NextActionSection
        dealId={dealId}
        initialData={
          latestNextActionJob
            ? {
                action: latestNextActionJob.output.action,
                reason: latestNextActionJob.output.reason,
                due_in_days: Number(latestNextActionJob.output.due_in_days ?? 0),
                action_type: latestNextActionJob.output.action_type as
                  | 'call'
                  | 'meeting'
                  | 'proposal'
                  | 'email'
                  | 'visit'
                  | 'other',
                generated_at: latestNextActionJob.finishedAt.toISOString(),
              }
            : null
        }
      />

      <RiskScoreSection
        dealId={dealId}
        initialData={
          latestRiskJob
            ? {
                score: Number(latestRiskJob.output.score),
                level: latestRiskJob.output.level as 'low' | 'medium' | 'high' | 'critical',
                reasons: latestRiskJob.output.reasons,
                recommended_actions: latestRiskJob.output.recommended_actions,
                generated_at: latestRiskJob.finishedAt.toISOString(),
              }
            : null
        }
      />

      {/* 主観確度（ADR-0013、G3、2026-05-25）— stage と直交、営業の温度感をここで設定 */}
      <section className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-xs text-gray-500">主観確度（営業の温度感、A〜E + 想定/継続）</p>
          <p className="text-[11px] text-gray-500 mt-0.5">
            stage は書類・タスクの自動進行、確度は営業の判断軸。両方持つことで「同じ提案中でも A と E が混ざらない」
          </p>
        </div>
        <ConfidenceDropdown dealId={dealId} initial={deal.subjective_confidence} />
      </section>

      <section className="bg-white border border-gray-200 rounded-xl p-6 grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
        <div>
          <p className="text-xs text-gray-500 mb-1">担当</p>
          <p className="text-gray-900 font-medium">{deal.assignee_name ?? '—'}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">顧客</p>
          <p className="text-gray-900 font-medium">{deal.customer_name ?? '—'}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">受注予定</p>
          <p className="text-gray-900 font-medium font-mono">{deal.expected_close_date ?? '—'}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">受注日</p>
          <p className="text-gray-900 font-medium font-mono">{deal.ordered_at ?? '—'}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">入金日</p>
          <p className="text-gray-900 font-medium font-mono">{deal.paid_at ?? '—'}</p>
        </div>
      </section>

      <section className="bg-white border border-gray-200 rounded-xl p-6">
        <h3 className="text-sm font-medium text-gray-900 mb-3">
          タスク <span className="text-xs text-gray-500 font-normal">{dealTasks.length}件</span>
        </h3>
        {dealTasks.length === 0 ? (
          <p className="text-sm text-gray-700">タスクはまだありません</p>
        ) : (
          <ul className="space-y-2">
            {dealTasks.map((t) => (
              <li
                key={t.id}
                className={`flex items-center gap-3 ${t.status === 'done' ? 'opacity-60' : ''}`}
              >
                <TaskCheckbox taskId={t.id} done={t.status === 'done'} />
                <p
                  className={`flex-1 text-sm text-gray-900 ${t.status === 'done' ? 'line-through' : ''}`}
                >
                  {t.title}
                </p>
                {t.due_date && (
                  <span className="text-xs font-mono text-gray-700">{t.due_date}</span>
                )}
              </li>
            ))}
          </ul>
        )}
        <TaskQuickAdd dealId={dealId} />
      </section>

      <section className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-gray-900">
            行動履歴{' '}
            <span className="text-xs text-gray-500 font-normal">{dealActions.length}件</span>
          </h3>
          <div className="flex items-center gap-2 flex-wrap">
            <ImportReplyButton dealId={dealId} />
            <LogActionButton dealId={dealId} variant="inline" />
          </div>
        </div>
        {dealActions.length === 0 ? (
          <p className="text-sm text-gray-700">まだ行動が記録されていません</p>
        ) : (
          <ul className="space-y-3">
            {dealActions.map((a) => {
              const Icon = ACTION_TYPE_ICON[a.type] ?? FileEdit;
              return (
                <li key={a.id} className="flex items-start gap-3 border-l-2 border-gray-200 pl-3">
                  <div className="flex-1">
                    <p className="inline-flex items-center gap-1.5 text-sm text-gray-900">
                      <Icon className="w-3.5 h-3.5" />
                      <span className="font-medium">{ACTION_TYPE_LABEL[a.type] ?? a.type}</span>
                      <span className="text-gray-700 ml-1">by {a.member_name}</span>
                    </p>
                    {a.note && <p className="text-sm text-gray-700 mt-1">{a.note}</p>}
                    <p className="text-xs font-mono text-gray-500 mt-1">
                      {new Date(a.occurred_at).toLocaleString('ja-JP')}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* 補助 sections — 使用頻度低めの section を折りたたみ（隊長明示 2026-05-27 02:10「スクロール深い、優先順位整理」）*/}
      <details className="group bg-white border border-gray-200 rounded-xl overflow-hidden">
        <summary className="px-6 py-3 cursor-pointer hover:bg-gray-50 text-sm font-medium text-gray-900 flex items-center justify-between list-none">
          <span>
            補助セクション
            <span className="text-xs text-gray-500 font-normal ml-2">
              攻略カード ／ 失注フォーム ／ 目標（クリックで展開）
            </span>
          </span>
          <span className="text-xs text-gray-400 group-open:hidden">▶</span>
          <span className="text-xs text-gray-400 hidden group-open:inline">▼</span>
        </summary>
        <div className="px-6 py-4 space-y-6 border-t border-gray-100">
          <AttackSection dealId={dealId} />

          <LostDealSection dealId={dealId} currentStage={deal.stage} />

          <TargetSection
            dealId={dealId}
            currentAmount={deal.amount}
            currentExpectedClose={deal.expected_close_date}
            targetRevenue={
              typeof (deal.metadata as Record<string, unknown> | null)?.target_revenue === 'number'
                ? ((deal.metadata as Record<string, unknown>).target_revenue as number)
                : 0
            }
            targetGp={
              typeof (deal.metadata as Record<string, unknown> | null)?.target_gp === 'number'
                ? ((deal.metadata as Record<string, unknown>).target_gp as number)
                : 0
            }
            targetCloseDate={
              typeof (deal.metadata as Record<string, unknown> | null)?.target_close_date === 'string'
                ? ((deal.metadata as Record<string, unknown>).target_close_date as string)
                : null
            }
            winReason={
              typeof (deal.metadata as Record<string, unknown> | null)?.win_reason === 'string'
                ? ((deal.metadata as Record<string, unknown>).win_reason as string)
                : ''
            }
          />
        </div>
      </details>

      {(deal.revenue_type === 'running' || deal.revenue_type === 'both') && (
        <RunningSection
          dealId={dealId}
          monthlyAmount={deal.monthly_amount}
          nextRenewalDate={
            typeof (deal.metadata as Record<string, unknown> | null)?.next_renewal_date === 'string'
              ? ((deal.metadata as Record<string, unknown>).next_renewal_date as string)
              : null
          }
          autoRenew={(deal.metadata as Record<string, unknown> | null)?.auto_renew === true}
          renewalCount={
            typeof (deal.metadata as Record<string, unknown> | null)?.renewal_count === 'number'
              ? ((deal.metadata as Record<string, unknown>).renewal_count as number)
              : 0
          }
          renewalNote={
            typeof (deal.metadata as Record<string, unknown> | null)?.renewal_note === 'string'
              ? ((deal.metadata as Record<string, unknown>).renewal_note as string)
              : ''
          }
        />
      )}

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
            className="px-4 py-2 bg-white border border-gray-200 text-gray-900 text-sm font-medium rounded-lg hover:bg-slate-50"
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
