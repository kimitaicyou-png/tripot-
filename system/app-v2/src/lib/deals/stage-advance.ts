'use server';

import { eq, and } from 'drizzle-orm';
import { db, logAudit } from '@/lib/db';
import { deals } from '@/db/schema';
import { TRIPOT_CONFIG } from '../../../coaris.config';

type DealStageKey =
  | 'prospect'
  | 'proposing'
  | 'ordered'
  | 'in_production'
  | 'delivered'
  | 'acceptance'
  | 'invoiced'
  | 'paid'
  | 'lost';

/**
 * 案件ステージを「行動」起点で前方自動進行させるユーティリティ。
 *
 * 隊長思想 (2026-05-20)「毎日の行動が、週次→月次→全社→PL/CF」の動く実装：
 * 書類 status を更新する Server Action から本関数を呼ぶと、対応する deal.stage が
 * 自動進行する。営業メンバーは「ステージを変える」操作を意識せず、書類を進めるだけ。
 *
 * 既存実装パターン：lost_deals.ts の recordLostDeal が deals.stage='lost' を
 * 同一関数内で更新しているのと同じ書き方。本ファイルでそれを汎用化。
 *
 * ## 後退しないルール（重要）
 * TRIPOT_CONFIG.stages.order を比較し、target が現 stage より前方の時だけ更新する。
 * 例：deal が既に paid のとき estimate.accepted が再送されても ordered に戻さない。
 *
 * ## 失注（lost, order=999）の扱い
 * lost は order=999 の終端。lost に進める / lost から動かすは別フロー（recordLostDeal）。
 * 本関数は lost を target にしないし、現在 stage が lost のときは何もしない。
 *
 * ## 監査ログ
 * 進行があったとき audit_logs に `deal.stage_auto_advance` を記録、triggered_by を
 * metadata に入れる（例：'estimate.accepted' / 'proposal.shared' / 'invoice.paid'）。
 */

export type AdvanceResult = {
  advanced: boolean;
  from?: string;
  to?: string;
  reason?: 'already_forward' | 'not_found' | 'lost_terminal' | 'invalid_target';
};

export async function maybeAdvanceDealStage(params: {
  dealId: string;
  companyId: string;
  memberId: string;
  targetStage: string;
  triggeredBy: string;
}): Promise<AdvanceResult> {
  const { dealId, companyId, memberId, targetStage, triggeredBy } = params;

  // target 妥当性チェック（lost を target にしない）
  const targetDef = TRIPOT_CONFIG.stages.find((s) => s.key === targetStage);
  if (!targetDef || targetStage === 'lost') {
    return { advanced: false, reason: 'invalid_target' };
  }

  // 現 stage 取得
  const current = await db
    .select({ stage: deals.stage })
    .from(deals)
    .where(and(eq(deals.id, dealId), eq(deals.company_id, companyId)))
    .limit(1)
    .then((rows) => rows[0]);

  if (!current) {
    return { advanced: false, reason: 'not_found' };
  }

  // lost からは自動進行しない（手動でのみ復帰させる、recordLostDeal の対称）
  if (current.stage === 'lost') {
    return { advanced: false, reason: 'lost_terminal' };
  }

  const currentDef = TRIPOT_CONFIG.stages.find((s) => s.key === current.stage);
  if (!currentDef) {
    return { advanced: false, reason: 'invalid_target' };
  }

  // 後退しないルール：target が現 stage 以下なら何もしない
  if (targetDef.order <= currentDef.order) {
    return {
      advanced: false,
      from: current.stage,
      to: targetStage,
      reason: 'already_forward',
    };
  }

  // 同一トランザクション思想に従い、書類 update と同じセッションで実行する。
  // ただし drizzle は明示的なトランザクションを使わなくても、各 update は atomic。
  // 一貫性が必須な場合は呼び出し側で db.transaction() を使う想定。
  await db
    .update(deals)
    .set({ stage: targetStage as DealStageKey, updated_at: new Date() })
    .where(and(eq(deals.id, dealId), eq(deals.company_id, companyId)));

  await logAudit({
    member_id: memberId,
    company_id: companyId,
    action: 'deal.stage_auto_advance',
    resource_type: 'deal',
    resource_id: dealId,
    metadata: {
      from: current.stage,
      to: targetStage,
      triggered_by: triggeredBy,
    },
  });

  return { advanced: true, from: current.stage, to: targetStage };
}
