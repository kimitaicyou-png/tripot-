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

/**
 * 議事録から生まれた AI 成果物の集約（H、隊長明示 2026-05-26 03:14、議事録の集約感改善）
 *
 * meeting_id を input.meeting_id key で持つ ai_jobs を job_type 別に最新 1 件ずつ取得。
 * 議事録カードの下に「この議事録から生まれた成果物」一覧として表示する。
 */
export type MeetingArtifactKind =
  | 'generate-requirement'
  | 'generate-proposal'
  | 'generate-tasks'
  | 'generate-sitemap'
  | 'summarize-meeting';

export interface MeetingArtifact {
  jobType: MeetingArtifactKind;
  finishedAt: Date;
  hasOutput: boolean;
}

const ARTIFACT_JOB_TYPES: MeetingArtifactKind[] = [
  'generate-requirement',
  'generate-proposal',
  'generate-tasks',
  'generate-sitemap',
  'summarize-meeting',
];

export async function listArtifactsForMeeting(params: {
  meetingId: string;
  companyId: string;
}): Promise<MeetingArtifact[]> {
  const rows = await db
    .select({
      job_type: ai_jobs.job_type,
      finished_at: ai_jobs.finished_at,
      output: ai_jobs.output,
    })
    .from(ai_jobs)
    .where(
      and(
        eq(ai_jobs.company_id, params.companyId),
        eq(ai_jobs.status, 'succeeded'),
        sql`${ai_jobs.input}->>'meeting_id' = ${params.meetingId}`,
      ),
    )
    .orderBy(desc(ai_jobs.finished_at));

  // job_type 別に最新 1 件のみ採用
  const latest = new Map<string, MeetingArtifact>();
  for (const r of rows) {
    if (!r.finished_at) continue;
    if (latest.has(r.job_type)) continue;
    if (!ARTIFACT_JOB_TYPES.includes(r.job_type as MeetingArtifactKind)) continue;
    latest.set(r.job_type, {
      jobType: r.job_type as MeetingArtifactKind,
      finishedAt: r.finished_at,
      hasOutput: r.output != null,
    });
  }
  // 順序固定（要約 → 要件 → 提案 → 見積 → タスク → サイトマップ）
  const ORDER: MeetingArtifactKind[] = [
    'summarize-meeting',
    'generate-requirement',
    'generate-proposal',
    'generate-tasks',
    'generate-sitemap',
  ];
  return ORDER.flatMap((k) => {
    const v = latest.get(k);
    return v ? [v] : [];
  });
}
