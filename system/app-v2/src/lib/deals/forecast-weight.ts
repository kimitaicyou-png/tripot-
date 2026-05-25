/**
 * 案件の予測売上 重み付け（forecast weight）
 *
 * 秋美レビュー 2026-05-26 02:44（他社 SFA 6 社比較）受けて実装：
 * - 業界標準のハイブリッド型（HubSpot / Salesforce / Pipedrive / Mazrica と同系統）
 * - 段階別 fallback：見込み・提案中は主観確度優先、受注以降は stage CF 加重採用
 * - 提案中（proposing）のみ境界加重平均（主観 70% + stage 30%）で受注移行時の急ジャンプ吸収
 * - 受注以降の主観確度自動リセットを前提（updateDealStage 側で実装）
 *
 * 業界共通の罠「デフォルト % は convention、実測値ではない」への対処：
 *   3-6 ヶ月運用後の実測キャリブレーションは calibration.ts 側で別途集計。
 *   ここでは convention（初期値）を提供。
 */

import { TRIPOT_CONFIG } from '../../../coaris.config';
import type { SubjectiveConfidence } from './confidence';

// 主観確度の重み（A〜E + 想定/継続）— 初期値、運用後に実測で上書き予定
export const CONFIDENCE_WEIGHT: Record<SubjectiveConfidence, number> = {
  a: 1.0, // 見積以降、受注確実
  b: 0.8, // ヒアリング・補助金待ち、根拠あり
  c: 0.5, // 提案中、検討中
  d: 0.2, // アポ段階、初期
  e: 0.1, // 見込み顧客、温度感低
  expected: 0.3, // 想定（計画段階、未確定）
  continuing: 0.7, // 継続（既存顧客追加、リピート）
};

// 受注以降の stage（stage CF 加重を優先採用）
const POST_ORDER_STAGES = new Set<string>([
  'ordered',
  'in_production',
  'delivered',
  'acceptance',
  'invoiced',
  'paid',
]);

// 提案中（境界 stage、加重平均で滑らかに移行）
const PROPOSING_STAGE = 'proposing';

/**
 * stage 別 CF 加重を取得（TRIPOT_CONFIG から、なければ 0）
 */
function getStageCashflowWeight(stage: string): number {
  return TRIPOT_CONFIG.stages.find((s) => s.key === stage)?.cashflowWeight ?? 0;
}

/**
 * 案件の forecast weight（0.0〜1.0）を返す。
 *
 * @param stage - dealStage enum
 * @param confidence - subjective_confidence (nullable)
 * @returns 0.0〜1.0
 */
export function getDealForecastWeight(
  stage: string,
  confidence: SubjectiveConfidence | null,
): number {
  // 失注は 0
  if (stage === 'lost') return 0;

  // 入金済は 100% 確定
  if (stage === 'paid') return 1.0;

  // 受注以降：stage CF 加重採用（事実が先、主観は参考程度）
  if (POST_ORDER_STAGES.has(stage)) {
    return getStageCashflowWeight(stage);
  }

  // 提案中：境界 stage、主観 70% + stage 30% の加重平均で滑らかに
  if (stage === PROPOSING_STAGE) {
    const stageCf = getStageCashflowWeight(stage);
    if (confidence) {
      return CONFIDENCE_WEIGHT[confidence] * 0.7 + stageCf * 0.3;
    }
    return stageCf;
  }

  // 見込み（prospect）など前段：主観確度優先、未設定なら stage CF
  if (confidence) {
    return CONFIDENCE_WEIGHT[confidence];
  }
  return getStageCashflowWeight(stage);
}

/**
 * 案件の予測売上金額を返す（amount × weight）
 */
export function getDealForecastAmount(
  amount: number | null,
  stage: string,
  confidence: SubjectiveConfidence | null,
): number {
  const w = getDealForecastWeight(stage, confidence);
  return Math.round((amount ?? 0) * w);
}
