import { eq, and, desc, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { ai_jobs } from '@/db/schema';

/**
 * AI ジョブの履歴取得 helper（Server Component / Server Action 用）。
 *
 * 各 AI route は input jsonb に `_deal_id` を埋め込んで保存している（client.ts:startJob）。
 * これを引いて「特定 deal の最新成功 job output」を取得する。
 *
 * 用途：案件詳細ページを開いた時、過去の AI 分析結果（risk-score / next-action 等）を
 * 自動で再表示する。毎回ボタンを押させない、AI 機能の体感価値を上げる。
 */
/**
 * 特定メンバーの最新成功 AI ジョブを取得（member_id ネイティブカラムで検索）。
 * morning-brief / next-action(member 単位) 等で使用。
 */
export async function getLatestAiJobForMember<T = unknown>(params: {
  memberId: string;
  jobType: string;
  companyId: string;
}): Promise<{ output: T; finishedAt: Date } | null> {
  const row = await db
    .select({
      output: ai_jobs.output,
      finished_at: ai_jobs.finished_at,
    })
    .from(ai_jobs)
    .where(
      and(
        eq(ai_jobs.company_id, params.companyId),
        eq(ai_jobs.job_type, params.jobType),
        eq(ai_jobs.status, 'succeeded'),
        eq(ai_jobs.member_id, params.memberId)
      )
    )
    .orderBy(desc(ai_jobs.finished_at))
    .limit(1)
    .then((rows) => rows[0]);
  if (!row || !row.output || !row.finished_at) return null;
  return {
    output: row.output as T,
    finishedAt: row.finished_at,
  };
}

export async function getLatestAiJobForDeal<T = unknown>(params: {
  dealId: string;
  jobType: string;
  companyId: string;
}): Promise<{ output: T; finishedAt: Date } | null> {
  const row = await db
    .select({
      output: ai_jobs.output,
      finished_at: ai_jobs.finished_at,
    })
    .from(ai_jobs)
    .where(
      and(
        eq(ai_jobs.company_id, params.companyId),
        eq(ai_jobs.job_type, params.jobType),
        eq(ai_jobs.status, 'succeeded'),
        sql`${ai_jobs.input}->>'_deal_id' = ${params.dealId}`
      )
    )
    .orderBy(desc(ai_jobs.finished_at))
    .limit(1)
    .then((rows) => rows[0]);
  if (!row || !row.output || !row.finished_at) return null;
  return {
    output: row.output as T,
    finishedAt: row.finished_at,
  };
}
