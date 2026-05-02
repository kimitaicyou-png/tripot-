import { NextResponse } from 'next/server';
import { eq, and, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { auth } from '@/auth';
import { db, logAudit, setTenantContext } from '@/lib/db';
import { meetings } from '@/db/schema';
import { callJson, AiError } from '@/lib/ai';

const requestSchema = z.object({
  meeting_id: z.string().uuid(),
});

const needSchema = z.object({
  tag: z.string().max(40),
  priority: z.enum(['high', 'medium', 'low']),
  context: z.string().max(200),
});

const responseSchema = z.object({
  summary: z.string().min(1).max(2000),
  needs: z.array(needSchema).max(10),
});

const SCHEMA_PROMPT = `Return JSON like:
{
  "summary": "議事録の要点を箇条書き形式で日本語で200-500字、ですます調",
  "needs": [
    { "tag": "予算", "priority": "high" | "medium" | "low", "context": "具体的な発言や状況の引用、80字以内" }
  ]
}
needs の tag 例: 予算 / 期限 / 決裁者 / 競合 / 課題 / 機能要望 / 懸念 / 次の予定 / その他`;

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.member_id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  await setTenantContext(session.user.company_id);

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

  const meeting = await db
    .select({
      id: meetings.id,
      type: meetings.type,
      title: meetings.title,
      raw_text: meetings.raw_text,
      occurred_at: meetings.occurred_at,
      deal_id: meetings.deal_id,
    })
    .from(meetings)
    .where(
      and(
        eq(meetings.id, parsed.data.meeting_id),
        eq(meetings.company_id, session.user.company_id),
        isNull(meetings.deleted_at)
      )
    )
    .limit(1)
    .then((rows) => rows[0]);

  if (!meeting) {
    return NextResponse.json({ error: 'meeting_not_found' }, { status: 404 });
  }

  if (!meeting.raw_text || meeting.raw_text.trim().length === 0) {
    return NextResponse.json(
      { error: 'no_raw_text', message: '本文が空のため要約できません' },
      { status: 400 }
    );
  }

  const userPrompt = `議事録種別: ${meeting.type}
${meeting.title ? `タイトル: ${meeting.title}\n` : ''}日時: ${meeting.occurred_at.toISOString().slice(0, 16).replace('T', ' ')}

## 本文
${meeting.raw_text}

上記から要約と needs（顧客のニーズ・懸念事項）を抽出してください。`;

  const systemPrompt = `あなたは日本のBtoB営業のシニアアシスタント。商談・電話・メールの議事録を読んで、後で見返した時に判断できる要約と、提案書作成に使える「顧客のニーズ・懸念事項」を構造化して抽出します。

要約の原則:
- ですます調、200-500字
- 「誰が・何を・なぜ」が読み取れる箇条書き
- 数字（金額・期限・人数）は省略しない
- 主観や感想を書かない

needs の原則:
- 顧客側の事情だけ抽出（こちら側の対応はnot needs）
- priority="high" は受注に直結する重大事項のみ
- context は元発言の引用や状況描写を 80字以内で`;

  try {
    const result = await callJson<{ summary: string; needs: { tag: string; priority: string; context: string }[] }>(
      {
        companyId: session.user.company_id,
        memberId: session.user.member_id,
        jobType: 'summarize-voice',
        dealId: meeting.deal_id ?? undefined,
      },
      {
        userPrompt,
        systemPrompt,
        schema: SCHEMA_PROMPT,
        maxTokens: 2048,
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

    await db
      .update(meetings)
      .set({
        summary: validation.data.summary,
        needs: validation.data.needs,
        updated_at: new Date(),
      })
      .where(eq(meetings.id, meeting.id));

    await logAudit({
      member_id: session.user.member_id,
      company_id: session.user.company_id,
      action: 'meeting.ai_summarize',
      resource_type: 'meeting',
      resource_id: meeting.id,
      metadata: {
        deal_id: meeting.deal_id,
        needs_count: validation.data.needs.length,
        cost_micro_usd: result.usage.costMicroUsd,
        ai_job_id: result.jobId,
      },
    });

    return NextResponse.json({
      meeting_id: meeting.id,
      summary: validation.data.summary,
      needs: validation.data.needs,
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
