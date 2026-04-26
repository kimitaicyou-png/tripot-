import { NextResponse } from 'next/server';
import { eq, and, isNull, desc } from 'drizzle-orm';
import { z } from 'zod';
import { auth } from '@/auth';
import { db, logAudit } from '@/lib/db';
import { deals, customers, members, meetings, actions, tasks } from '@/db/schema';
import { callJson, AiError } from '@/lib/ai';

const requestSchema = z.object({
  deal_id: z.string().uuid(),
});

const responseSchema = z.object({
  action: z.string().min(1).max(200),
  reason: z.string().min(1).max(300),
  due_in_days: z.number().int().min(0).max(60),
  action_type: z.enum(['call', 'meeting', 'proposal', 'email', 'visit', 'other']),
});

const SCHEMA_PROMPT = `Return JSON like:
{
  "action": "今日(または今週)やる具体的な行動を1文で",
  "reason": "なぜこれが今最重要か、文脈を踏まえた1-2文で",
  "due_in_days": 0,
  "action_type": "call" | "meeting" | "proposal" | "email" | "visit" | "other"
}`;

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

  const [recentMeetings, recentActions, openTasks] = await Promise.all([
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
    db
      .select({ title: tasks.title, due_date: tasks.due_date })
      .from(tasks)
      .where(
        and(
          eq(tasks.deal_id, parsed.data.deal_id),
          eq(tasks.status, 'todo'),
          isNull(tasks.deleted_at)
        )
      )
      .limit(5),
  ]);

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
  const taskDigest = openTasks
    .map((t) => `- ${t.title}${t.due_date ? ` (期限 ${t.due_date})` : ''}`)
    .join('\n');

  const userPrompt = `案件: ${dealRow.title}
顧客: ${dealRow.customer_name ?? '未設定'}
担当: ${dealRow.assignee_name ?? '—'}
ステージ: ${dealRow.stage}
受注金額: ¥${(dealRow.amount ?? 0).toLocaleString('ja-JP')}
受注予定: ${dealRow.expected_close_date ?? '未設定'}

## 直近の議事録（${recentMeetings.length}件）
${meetingDigest || '（なし）'}

## 直近の行動（${recentActions.length}件）
${actionDigest || '（なし）'}

## 未完了タスク（${openTasks.length}件）
${taskDigest || '（なし）'}

この案件の「次の一手」を1つだけ提案してください。`;

  const systemPrompt = `あなたは日本のBtoB営業のシニアコーチ。「次の一手」を1つだけ提案します。
原則:
- ステージと文脈から本当に今やるべき1つだけ
- 抽象論を避ける（「フォローする」NG → 「鈴木様に水曜午後の電話で予算決裁の進捗を聞く」OK）
- due_in_days は今日中なら 0、明日なら 1、来週なら 7
- 沈黙が長いなら「電話 or 訪問で再接続」を優先
- 詰まりが見えたら「見積価格の見直し」「決裁ルートの確認」などを提案
- 出力は厳密にJSON、不要な文を含めない`;

  try {
    const result = await callJson<{
      action: string;
      reason: string;
      due_in_days: number;
      action_type: string;
    }>(
      {
        companyId: session.user.company_id,
        memberId: session.user.member_id,
        jobType: 'suggest-next-action',
        dealId: parsed.data.deal_id,
      },
      {
        userPrompt,
        systemPrompt,
        schema: SCHEMA_PROMPT,
        maxTokens: 1024,
        temperature: 0.5,
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

    await logAudit({
      member_id: session.user.member_id,
      company_id: session.user.company_id,
      action: 'next_action.suggest',
      resource_type: 'deal',
      resource_id: parsed.data.deal_id,
      metadata: {
        action_type: validation.data.action_type,
        cost_micro_usd: result.usage.costMicroUsd,
        ai_job_id: result.jobId,
      },
    });

    return NextResponse.json({
      ...validation.data,
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
