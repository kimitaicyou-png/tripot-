/**
 * 主観確度の実測キャリブレーション（秋美レビュー 2026-05-26 改良 2）
 *
 * 業界共通の罠：「A=1.0 / B=0.8 ... のデフォルト値は convention（慣習）、自社実測ではない」。
 * HubSpot / Salesforce / Pipedrive のデフォルト % も実測と一致しない（forecastio.ai 集約）。
 *
 * 3-6 ヶ月運用後に：
 * 1. 案件作成時の主観確度（rank_at_creation）を audit_logs から取得
 * 2. 最終 outcome（paid / lost）と紐付け
 * 3. A〜E 別の実際の受注率を計算
 * 4. CONFIDENCE_WEIGHT 定数を実測値で上書き
 *
 * このファイルは migration 不要で audit_logs を集計するだけ。
 * 6 ヶ月後の運用データが溜まったら calibration job として cron 化予定。
 */

import { and, eq, sql, inArray, gte } from 'drizzle-orm';
import { db } from '@/lib/db';
import { deals, audit_logs } from '@/db/schema';
import type { SubjectiveConfidence } from './confidence';

export interface CalibrationResult {
  /** A〜E + 想定/継続 別の集計 */
  byConfidence: Array<{
    confidence: SubjectiveConfidence;
    totalSampleSize: number;
    actualWonCount: number;
    actualWonRate: number; // 0.0〜1.0
    currentDefaultWeight: number; // CONFIDENCE_WEIGHT[confidence]
    suggestedWeight: number; // = actualWonRate
    deviation: number; // suggestedWeight - currentDefaultWeight
  }>;
  /** 集計対象期間 */
  periodStart: string; // YYYY-MM-DD
  periodEnd: string;
  /** 集計件数 = 期間内に won/lost が確定した案件数 */
  totalDealsAnalyzed: number;
  /** サンプル不足判定（n < 30 で warning）*/
  warnings: string[];
}

/**
 * 期間内に paid / lost が確定した案件について、
 * 「作成時の主観確度 → 実際の outcome」を集計してキャリブレーション提案を返す。
 *
 * 注：
 * - 作成時の confidence は audit_logs の `deal.confidence_update` のうち、
 *   metadata.from が null（= 初回設定）の record を採用。
 * - 作成時 confidence 未設定の案件はサンプルから除外（A〜E 判定不能）。
 * - サンプルサイズ < 30 の confidence ラベルは warning に記録、weight 提案は出すが信頼度低。
 *
 * @param companyId - マルチテナント遵守
 * @param sinceDate - 集計開始日（推奨：3-6 ヶ月前）
 */
export async function computeForecastCalibration({
  companyId,
  sinceDate,
}: {
  companyId: string;
  sinceDate: Date;
}): Promise<CalibrationResult> {
  // 期間内に paid / lost に到達した案件を取得
  const closedDeals = await db
    .select({
      id: deals.id,
      stage: deals.stage,
      updated_at: deals.updated_at,
    })
    .from(deals)
    .where(
      and(
        eq(deals.company_id, companyId),
        inArray(deals.stage, ['paid', 'lost']),
        gte(deals.updated_at, sinceDate),
      ),
    );

  if (closedDeals.length === 0) {
    return emptyResult(sinceDate, ['対象期間に closed 案件なし']);
  }

  // 各 deal の作成時 confidence を audit_logs から取得
  const dealIds = closedDeals.map((d) => d.id);
  const confidenceHistory = await db
    .select({
      resource_id: audit_logs.resource_id,
      metadata: audit_logs.metadata,
      occurred_at: audit_logs.occurred_at,
    })
    .from(audit_logs)
    .where(
      and(
        eq(audit_logs.company_id, companyId),
        eq(audit_logs.action, 'deal.confidence_update'),
        inArray(audit_logs.resource_id, dealIds),
      ),
    )
    .orderBy(audit_logs.occurred_at);

  // 各 deal の「最初の confidence 設定」を抽出
  const initialConfidenceByDeal = new Map<string, SubjectiveConfidence>();
  for (const log of confidenceHistory) {
    if (!log.resource_id || initialConfidenceByDeal.has(log.resource_id)) continue;
    const meta = log.metadata as { from?: unknown; to?: unknown } | null;
    if (!meta) continue;
    if (meta.from === null && typeof meta.to === 'string') {
      initialConfidenceByDeal.set(log.resource_id, meta.to as SubjectiveConfidence);
    }
  }

  // confidence ラベル別に集計
  const confidenceLabels: SubjectiveConfidence[] = [
    'a',
    'b',
    'c',
    'd',
    'e',
    'expected',
    'continuing',
  ];
  const buckets: Record<
    SubjectiveConfidence,
    { won: number; total: number }
  > = {} as Record<SubjectiveConfidence, { won: number; total: number }>;
  for (const c of confidenceLabels) {
    buckets[c] = { won: 0, total: 0 };
  }

  for (const deal of closedDeals) {
    const initial = initialConfidenceByDeal.get(deal.id);
    if (!initial) continue; // 作成時 confidence 未設定 = サンプル外
    buckets[initial].total += 1;
    if (deal.stage === 'paid') buckets[initial].won += 1;
  }

  // 初期 weight（重複定義を避けるため、ここでは参照のみ）
  const DEFAULT_WEIGHT: Record<SubjectiveConfidence, number> = {
    a: 1.0,
    b: 0.8,
    c: 0.5,
    d: 0.2,
    e: 0.1,
    expected: 0.3,
    continuing: 0.7,
  };

  const warnings: string[] = [];
  const MIN_SAMPLE_SIZE = 30;

  const byConfidence = confidenceLabels.map((c) => {
    const bucket = buckets[c];
    const actualRate = bucket.total > 0 ? bucket.won / bucket.total : 0;
    if (bucket.total < MIN_SAMPLE_SIZE) {
      warnings.push(`${c} のサンプルサイズ ${bucket.total} < ${MIN_SAMPLE_SIZE}（信頼度低）`);
    }
    return {
      confidence: c,
      totalSampleSize: bucket.total,
      actualWonCount: bucket.won,
      actualWonRate: actualRate,
      currentDefaultWeight: DEFAULT_WEIGHT[c],
      suggestedWeight: actualRate,
      deviation: actualRate - DEFAULT_WEIGHT[c],
    };
  });

  return {
    byConfidence,
    periodStart: sinceDate.toISOString().slice(0, 10),
    periodEnd: new Date().toISOString().slice(0, 10),
    totalDealsAnalyzed: closedDeals.length,
    warnings,
  };
}

function emptyResult(sinceDate: Date, warnings: string[]): CalibrationResult {
  return {
    byConfidence: [],
    periodStart: sinceDate.toISOString().slice(0, 10),
    periodEnd: new Date().toISOString().slice(0, 10),
    totalDealsAnalyzed: 0,
    warnings,
  };
}

// 未使用 import を抑止（sql は将来の native SQL 拡張用に予約）
void sql;
