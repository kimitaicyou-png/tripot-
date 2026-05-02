import { NextResponse } from 'next/server';
import { eq, and, isNull, desc } from 'drizzle-orm';
import { z } from 'zod';
import { auth } from '@/auth';
import { db, logAudit, setTenantContext } from '@/lib/db';
import { deals, customers, members, meetings } from '@/db/schema';
import { callJson, AiError } from '@/lib/ai';

const requestSchema = z.object({
  deal_id: z.string().uuid(),
  intent: z.enum([
    'thank_you',
    'follow_up',
    'proposal_send',
    'estimate_send',
    'meeting_request',
    'price_discussion',
    'apology',
    'closing_check',
    'custom',
  ]),
  custom_prompt: z.string().max(500).optional(),
  recipient_name: z.string().max(80).optional(),
  formality: z.enum(['formal', 'casual']).default('formal'),
});

const responseSchema = z.object({
  subject: z.string().min(1).max(200),
  body: z.string().min(1).max(3000),
});

const INTENT_GUIDE: Record<string, string> = {
  thank_you: '商談・打ち合わせのお礼メール。次のステップを提示する',
  follow_up: '提案後 / 見積後の進捗確認、検討状況を丁寧に問う',
  proposal_send: '提案書を送付する案内メール。提案の核心 1-2 行のサマリ',
  estimate_send: '見積書を送付する案内メール。金額・有効期限・確認依頼',
  meeting_request: '次回打ち合わせの日程調整、候補を 2-3 件出す',
  price_discussion: '価格の相談・交渉。値引き根拠 or 価値の再強調',
  apology: '対応遅延・トラブルへの謝罪、再発防止策と次のアクション',
  closing_check: '受注に向けた最終確認、契約書の準備など',
  custom: 'ユーザー指定の意図に従う',
};

const SCHEMA_PROMPT = `Return JSON like:
{
  "subject": "件名（簡潔、内容が一目でわかる）",
  "body": "本文。冒頭に「○○様」、末尾に「よろしくお願い申し上げます。」+ 署名はメンバー名のみ"
}`;

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
    return NextResponse.json(
      { error: 'invalid_request', details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const dealRow = await db
    .select({
      id: deals.id,
      title: deals.title,
      stage: deals.stage,
      amount: deals.amount,
      assignee_name: members.name,
      customer_name: customers.name,
      customer_email: customers.contact_email,
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

  const recentMeetings = await db
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
    .limit(2);

  const meetingDigest = recentMeetings
    .map(
      (m) =>
        `- ${m.type} ${m.occurred_at.toISOString().slice(0, 10)}${m.title ? ` (${m.title})` : ''}${m.summary ? `: ${m.summary.slice(0, 200)}` : ''}`
    )
    .join('\n');

  const recipientName =
    parsed.data.recipient_name ?? `${dealRow.customer_name ?? 'お客様'} ご担当者`;

  const intentGuide = INTENT_GUIDE[parsed.data.intent] ?? '';

  const userPrompt = `案件: ${dealRow.title}
顧客: ${dealRow.customer_name ?? '未設定'}
受信者: ${recipientName}
担当(送信者): ${dealRow.assignee_name ?? session.user.name ?? '担当者'}
ステージ: ${dealRow.stage}
金額: ¥${(dealRow.amount ?? 0).toLocaleString('ja-JP')}

意図: ${parsed.data.intent} (${intentGuide})
${parsed.data.custom_prompt ? `\n追加指示: ${parsed.data.custom_prompt}\n` : ''}
トーン: ${parsed.data.formality === 'formal' ? '丁寧・フォーマル' : 'カジュアル・親しみ'}

## 直近の議事録
${meetingDigest || '（なし）'}

上記をもとに、メール下書きを生成してください。`;

  const systemPrompt = `あなたは日本のBtoB営業のシニアコピーライター。送信前に最終チェックされる前提のメール下書きを書きます。
原則:
- 件名は20-40字、内容が一目でわかる
- 本文の冒頭は「${recipientName}」、末尾の署名は「${dealRow.assignee_name ?? '担当者'}」のみ（会社名やフルアドレス署名は省略）
- 段落は1-2文ごとに改行、読みやすく
- 抽象的な美辞麗句を避ける（「お世話になっております」程度はOK、過剰な敬語NG）
- 数字（金額・日程）は議事録から拾って必ず書く
- 「○○させていただきます」「お送りいたします」はOK、「弊社」「貴社」も使ってよい
- 出力は厳密にJSON、不要な文を含めない`;

  try {
    const result = await callJson<{ subject: string; body: string }>(
      {
        companyId: session.user.company_id,
        memberId: session.user.member_id,
        jobType: 'generate-email',
        dealId: parsed.data.deal_id,
      },
      {
        userPrompt,
        systemPrompt,
        schema: SCHEMA_PROMPT,
        maxTokens: 2048,
        temperature: 0.4,
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
      action: 'email.draft_generate',
      resource_type: 'deal',
      resource_id: parsed.data.deal_id,
      metadata: {
        intent: parsed.data.intent,
        formality: parsed.data.formality,
        cost_micro_usd: result.usage.costMicroUsd,
        ai_job_id: result.jobId,
      },
    });

    return NextResponse.json({
      subject: validation.data.subject,
      body: validation.data.body,
      to: dealRow.customer_email,
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
