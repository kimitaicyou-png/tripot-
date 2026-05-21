import { eq, and, isNull, sql, ne } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  proposals,
  estimates,
  invoices,
  meetings,
  tasks,
  production_cards,
} from '@/db/schema';
import { TRIPOT_CONFIG } from '../../../coaris.config';

/**
 * tripot 案件ステージ遷移：次に何をすれば進むかの要件判定
 *
 * 隊長指摘 (2026-05-20)「動線の中にステージがどうしたら変わるのか？見込み→提案が全く分からん」
 * への直接の解。各 stage に対して「次の stage に進む条件」を DB クエリで判定し、
 * NextStageChecklist UI に渡すデータを返す。
 *
 * Phase 2（書類 status → deal.stage 自動連動）が実装されると、ここの required 条件を
 * 満たした瞬間に deal.stage が自動進行するため、この checklist は「いま何が足りないか」の
 * 可視化ツールとして機能する（自動連動の事前 preview 兼、手動オーバーライド時のガイド）。
 */

export type RequirementStatus = 'done' | 'missing' | 'optional';

export type RequirementItem = {
  id: string;
  label: string;
  status: RequirementStatus;
  /** UI 上で「ここを押せば進む」CTA リンクのターゲットタブ */
  actionTab?: 'meetings' | 'proposals' | 'estimates' | 'invoices' | 'resources';
  /** UI 上の CTA 文言 */
  actionLabel?: string;
};

export type StageRequirementsResult = {
  currentStage: string;
  nextStage: string | null;
  /** すべての required 項目が done なら true（自動連動の対象条件と一致） */
  canAdvance: boolean;
  requirements: RequirementItem[];
};

type StageKey =
  | 'prospect'
  | 'proposing'
  | 'ordered'
  | 'in_production'
  | 'delivered'
  | 'acceptance'
  | 'invoiced'
  | 'paid'
  | 'lost';

const NEXT_STAGE_MAP: Record<StageKey, StageKey | null> = {
  prospect: 'proposing',
  proposing: 'ordered',
  ordered: 'in_production',
  in_production: 'delivered',
  delivered: 'acceptance',
  acceptance: 'invoiced',
  invoiced: 'paid',
  paid: null,
  lost: null,
};

export async function getStageRequirements(
  dealId: string,
  companyId: string,
  currentStage: string
): Promise<StageRequirementsResult> {
  const nextStage = NEXT_STAGE_MAP[currentStage as StageKey] ?? null;

  if (!nextStage) {
    return {
      currentStage,
      nextStage: null,
      canAdvance: false,
      requirements: [],
    };
  }

  const requirements = await buildRequirementsForStage(
    dealId,
    companyId,
    currentStage as StageKey
  );

  const canAdvance =
    requirements.length > 0 &&
    requirements
      .filter((r) => r.status !== 'optional')
      .every((r) => r.status === 'done');

  return {
    currentStage,
    nextStage,
    canAdvance,
    requirements,
  };
}

async function buildRequirementsForStage(
  dealId: string,
  companyId: string,
  stage: StageKey
): Promise<RequirementItem[]> {
  switch (stage) {
    case 'prospect':
      return checkProspectToProposing(dealId, companyId);
    case 'proposing':
      return checkProposingToOrdered(dealId, companyId);
    case 'ordered':
      return checkOrderedToInProduction(dealId, companyId);
    case 'in_production':
      return checkInProductionToDelivered(dealId, companyId);
    case 'delivered':
      return checkDeliveredToAcceptance(dealId, companyId);
    case 'acceptance':
      return checkAcceptanceToInvoiced(dealId, companyId);
    case 'invoiced':
      return checkInvoicedToPaid(dealId, companyId);
    default:
      return [];
  }
}

async function checkProspectToProposing(
  dealId: string,
  companyId: string
): Promise<RequirementItem[]> {
  const [meetingCountRow, proposalCountRow] = await Promise.all([
    db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(meetings)
      .where(
        and(
          eq(meetings.deal_id, dealId),
          eq(meetings.company_id, companyId),
          isNull(meetings.deleted_at)
        )
      )
      .then((rows) => rows[0]),
    db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(proposals)
      .where(
        and(
          eq(proposals.deal_id, dealId),
          eq(proposals.company_id, companyId),
          eq(proposals.status, 'shared'),
          isNull(proposals.deleted_at)
        )
      )
      .then((rows) => rows[0]),
  ]);

  return [
    {
      id: 'meeting',
      label: '商談・議事録を 1 件以上残す',
      status: (meetingCountRow?.count ?? 0) > 0 ? 'done' : 'missing',
      actionTab: 'meetings',
      actionLabel: '議事録を追加',
    },
    {
      id: 'proposal_shared',
      label: '提案書を作成して送付（status: shared）',
      status: (proposalCountRow?.count ?? 0) > 0 ? 'done' : 'optional',
      actionTab: 'proposals',
      actionLabel: '提案書を作成',
    },
  ];
}

async function checkProposingToOrdered(
  dealId: string,
  companyId: string
): Promise<RequirementItem[]> {
  const acceptedEstimate = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(estimates)
    .where(
      and(
        eq(estimates.deal_id, dealId),
        eq(estimates.company_id, companyId),
        eq(estimates.status, 'accepted'),
        isNull(estimates.deleted_at)
      )
    )
    .then((rows) => rows[0]);

  return [
    {
      id: 'estimate_accepted',
      label: '見積を顧客が承諾（status: accepted）',
      status: (acceptedEstimate?.count ?? 0) > 0 ? 'done' : 'missing',
      actionTab: 'estimates',
      actionLabel: '見積を確認・更新',
    },
  ];
}

async function checkOrderedToInProduction(
  dealId: string,
  companyId: string
): Promise<RequirementItem[]> {
  const cardCount = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(production_cards)
    .where(
      and(
        eq(production_cards.deal_id, dealId),
        eq(production_cards.company_id, companyId),
        isNull(production_cards.deleted_at)
      )
    )
    .then((rows) => rows[0]);

  return [
    {
      id: 'production_card',
      label: '制作カードを作成（カンバンに乗せる）',
      status: (cardCount?.count ?? 0) > 0 ? 'done' : 'optional',
      actionTab: 'resources',
      actionLabel: '制作カードを作成',
    },
  ];
}

async function checkInProductionToDelivered(
  dealId: string,
  companyId: string
): Promise<RequirementItem[]> {
  const [totalTasks, openTasks] = await Promise.all([
    db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(tasks)
      .where(
        and(
          eq(tasks.deal_id, dealId),
          eq(tasks.company_id, companyId),
          isNull(tasks.deleted_at)
        )
      )
      .then((rows) => rows[0]),
    db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(tasks)
      .where(
        and(
          eq(tasks.deal_id, dealId),
          eq(tasks.company_id, companyId),
          ne(tasks.status, 'done'),
          isNull(tasks.deleted_at)
        )
      )
      .then((rows) => rows[0]),
  ]);

  const total = totalTasks?.count ?? 0;
  const open = openTasks?.count ?? 0;

  return [
    {
      id: 'tasks_done',
      label:
        total === 0
          ? 'タスクを作成して消化（0 件のため未着手）'
          : `タスクを全完了（残 ${open}/${total}）`,
      status: total > 0 && open === 0 ? 'done' : 'missing',
    },
  ];
}

async function checkDeliveredToAcceptance(
  dealId: string,
  companyId: string
): Promise<RequirementItem[]> {
  const meetingCount = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(meetings)
    .where(
      and(
        eq(meetings.deal_id, dealId),
        eq(meetings.company_id, companyId),
        isNull(meetings.deleted_at)
      )
    )
    .then((rows) => rows[0]);

  return [
    {
      id: 'acceptance_meeting',
      label: '検収を顧客から取得（検収議事録を 1 件以上残す）',
      status: (meetingCount?.count ?? 0) > 0 ? 'done' : 'optional',
      actionTab: 'meetings',
      actionLabel: '検収議事録を追加',
    },
  ];
}

async function checkAcceptanceToInvoiced(
  dealId: string,
  companyId: string
): Promise<RequirementItem[]> {
  const invoiceCount = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(invoices)
    .where(
      and(
        eq(invoices.deal_id, dealId),
        eq(invoices.company_id, companyId),
        sql`${invoices.status} IN ('issued','sent','paid')`,
        isNull(invoices.deleted_at)
      )
    )
    .then((rows) => rows[0]);

  return [
    {
      id: 'invoice_issued',
      label: '請求書を発行（status: issued/sent/paid）',
      status: (invoiceCount?.count ?? 0) > 0 ? 'done' : 'missing',
      actionTab: 'invoices',
      actionLabel: '請求書を発行',
    },
  ];
}

async function checkInvoicedToPaid(
  dealId: string,
  companyId: string
): Promise<RequirementItem[]> {
  const paidInvoice = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(invoices)
    .where(
      and(
        eq(invoices.deal_id, dealId),
        eq(invoices.company_id, companyId),
        eq(invoices.status, 'paid'),
        isNull(invoices.deleted_at)
      )
    )
    .then((rows) => rows[0]);

  return [
    {
      id: 'invoice_paid',
      label: '入金確認（請求書 status: paid）',
      status: (paidInvoice?.count ?? 0) > 0 ? 'done' : 'missing',
      actionTab: 'invoices',
      actionLabel: '入金を確認',
    },
  ];
}

/**
 * TRIPOT_CONFIG.stages.order を使って「現 stage より先か」を判定。
 * 自動連動の「後退しないルール」と一致させるためのヘルパー。
 */
export function isStageAdvancement(
  currentStage: string,
  targetStage: string
): boolean {
  const current = TRIPOT_CONFIG.stages.find((s) => s.key === currentStage);
  const target = TRIPOT_CONFIG.stages.find((s) => s.key === targetStage);
  if (!current || !target) return false;
  return target.order > current.order;
}
