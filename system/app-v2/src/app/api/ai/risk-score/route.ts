import { NextResponse } from 'next/server';
import { eq, and, isNull, desc } from 'drizzle-orm';
import { z } from 'zod';
import { auth } from '@/auth';
import { db, logAudit } from '@/lib/db';
import { deals, customers, members, meetings, actions } from '@/db/schema';
import { callJson, AiError } from '@/lib/ai';

const requestSchema = z.object({
  deal_id: z.string().uuid(),
});

const responseSchema = z.object({
  score: z.number().int().min(0).max(100),
  level: z.enum(['low', 'medium', 'high', 'critical']),
  reasons: z.array(z.string().min(1).max(160)).min(1).max(4),
  recommended_actions: z.array(z.string().min(1).max(160)).min(1).max(3),
});

const SCHEMA_PROMPT = `Return JSON like:
{
  "score": 0-100 (高いほど失注リスク高),
  "level": "low" | "medium" | "high" | "critical",
  "reasons": ["この案件のリスク要因を簡潔に3点", "...", "..."],
  "recommended_actions": ["今すぐやるべき具体的対策を2点", "..."]
}`;

const LEVEL_FROM_SCORE = (score: number): 'low' | 'medium' | 'high' | 'critical' => {
  if (score >= 80) return 'critical';
  if (score >= 60) return 'high';
  if (score >= 30) return 'medium';
  return 'low';
};

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.member_id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  }

  const dealRow = await db
    .select({
      id: deals.id,
      title: deals.title,
      stage: deals.stage,
      amount: deals.amount,
      expected_close_date: deals.expected_close_date,
      created_at: deals.created_at,
      assignee_name: members.name,
      customer_name: customers.name,
    })
    .from(deals)
    .leftJoin(members, eq(deals.assignee_id, members.id))
    .leftJoin(customers, eq(deals.customer_id, customers.id))
    .where(
      and(
        eq(deals.id, parsed.data.deal_id),
        eq(deals.company_id, session.user.company_id),
        isNull(deals.deleted_at)
      )
    )
    .limit(1)
    .then((rows) => rows[0]);

  if (!dealRow) {
    return NextResponse.json({ error: 'deal_not_found' }, { status: 404 });
  }

  const [recentMeetings, recentActions] = await Promise.all([
    db
      .select({
        type: meetings.type,
        title: meetings.title,
        summary: meetings.summary,
        occurred_at: meetings.occurred_at,
      })
      .from(meetings)
      .where(
        and(
          eq(meetings.deal_id, parsed.data.deal_id),
          eq(meetings.company_id, session.user.company_id),
          isNull(meetings.deleted_at)
        )
      )
      .orderBy(desc(meetings.occurred_at))
      .limit(3),
    db
      .select({
        type: actions.type,
        note: actions.note,
        occurred_at: actions.occurred_at,
      })
      .from(actions)
      .where(eq(actions.deal_id, parsed.data.deal_id))
      .orderBy(desc(actions.occurred_at))
      .limit(5),
  ]);

  const now = new Date();
  const daysSince = (d: Date | null | undefined): number | null => {
    if (!d) return null;
    return Math.floor((now.getTime() - new Date(d).getTime()) / 86_400_000);
  };

  const daysSinceCreated = daysSince(dealRow.created_at) ?? 0;
  const daysSinceLastAction =
    recentActions.length > 0 ? daysSince(recentActions[0].occurred_at) : null;
  const daysSinceLastMeeting =
    recentMeetings.length > 0 ? daysSince(recentMeetings[0].occurred_at) : null;
  const daysToClose = dealRow.expected_close_date
    ? Math.floor(
        (new Date(dealRow.expected_close_date).getTime() - now.getTime()) /
          86_400_000
      )
    : null;

  const meetingDigest = recentMeetings
    .map(
      (m) =>
        `- ${m.type} ${m.occurred_at.toISOString().slice(0, 10)}${m.title ? ` (${m.title})` : ''}${m.summary ? `: ${m.summary.slice(0, 200)}` : ''}`
    )
    .join('\n');
  const actionDigest = recentActions
    .map(
      (a) =>
        `- ${a.type} ${a.occurred_at.toISOString().slice(0, 10)}${a.note ? `: ${a.note.slice(0, 100)}` : ''}`
    )
    .join('\n');

  const userPrompt = `案件: ${dealRow.title}
顧客: ${dealRow.customer_name ?? '未設定'}
担当: ${dealRow.assignee_name ?? '—'}
ステージ: ${dealRow.stage}
受注金額: ¥${(dealRow.amount ?? 0).toLocaleString('ja-JP')}
受注予定: ${dealRow.expected_close_date ?? '未設定'}${daysToClose !== null ? `（${daysToClose >= 0 ? `あと${daysToClose}日` : `${-daysToClose}日超過`}）` : ''}
案件作成からの経過: ${daysSinceCreated}日
最終行動からの経過: ${daysSinceLastAction !== null ? `${daysSinceLastAction}日` : '行動記録なし'}
最終議事録からの経過: ${daysSinceLastMeeting !== null ? `${daysSinceLastMeeting}日` : '議事録なし'}

## 直近の議事録（${recentMeetings.length}件）
${meetingDigest || '（なし）'}

## 直近の行動（${recentActions.length}件）
${actionDigest || '（なし）'}

この案件の失注リスクを 0-100 で評価し、理由3点と推奨対策2点を提示してください。`;

  const systemPrompt = `あなたはBtoB営業のリスク評価アナリスト。案件の失注リスクを冷静に数値化します。

## スコアリング指針（0-100）
- 0-29 (low/青): 順調に進行、特段の懸念なし
- 30-59 (medium/黄): 注意が必要、軽微な遅延や沈黙あり
- 60-79 (high/橙): 失注の兆候あり、即対処が必要
- 80-100 (critical/赤): 高確率で失注、緊急介入が必要

## 加点要因（リスク高）
- 沈黙日数 14日以上（→ +20）
- 受注予定日を過ぎている（→ +30）
- proposing/ordered で議事録ゼロ（→ +25）
- 受注予定日まで7日以内なのに延期の兆候（→ +20）
- 案件作成から30日経過してもステージ進展なし（→ +20）
- 直近議事録に「予算」「決裁」「他社」「再検討」のキーワード（→ +15）

## 減点要因（リスク低）
- 直近7日以内に行動・議事録あり
- ordered/in_production/delivered などの後段ステージ
- paid/invoiced は基本 0-10（既に確定）

## reasons / recommended_actions の書き方
- 抽象論NG：「コミュニケーションが不足」NG → 「最終行動から21日沈黙」OK
- 数値ベースで具体的に
- recommended_actions は今週中に動ける具体的アクション

出力は厳密にJSON、不要な文を含めない。`;

  try {
    const result = await callJson<{
      score: number;
      level: string;
      reasons: string[];
      recommended_actions: string[];
    }>(
      {
        companyId: session.user.company_id,
        memberId: session.user.member_id,
        jobType: 'risk-score',
        dealId: parsed.data.deal_id,
      },
      {
        userPrompt,
        systemPrompt,
        schema: SCHEMA_PROMPT,
        maxTokens: 1024,
        temperature: 0.3,
      }
    );

    const validation = responseSchema.safeParse(result.data);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'ai_invalid_format',
          details: validation.error.flatten(),
          rawText: result.rawText.slice(0, 1000),
        },
        { status: 422 }
      );
    }

    const correctedLevel = LEVEL_FROM_SCORE(validation.data.score);

    await logAudit({
      member_id: session.user.member_id,
      company_id: session.user.company_id,
      action: 'risk_score.assess',
      resource_type: 'deal',
      resource_id: parsed.data.deal_id,
      metadata: {
        score: validation.data.score,
        level: correctedLevel,
        cost_micro_usd: result.usage.costMicroUsd,
        ai_job_id: result.jobId,
      },
    });

    return NextResponse.json({
      ...validation.data,
      level: correctedLevel,
      generated_at: new Date().toISOString(),
      usage: result.usage,
    });
  } catch (err) {
    if (err instanceof AiError) {
      return NextResponse.json(
        { error: 'ai_error', message: err.message, retryable: err.retryable },
        { status: err.retryable ? 503 : 500 }
      );
    }
    const message = err instanceof Error ? err.message : 'unknown_error';
    return NextResponse.json({ error: 'internal', message }, { status: 500 });
  }
}
