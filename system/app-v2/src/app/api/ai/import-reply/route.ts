import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { logAudit, setTenantContext } from '@/lib/db';
import { callJson, AiError } from '@/lib/ai';

/**
 * POST /api/ai/import-reply
 *
 * 顧客 / 社内からの返信（メール / Slack / チャット）を解析し、
 * 行動履歴（actions）に登録するための構造化データを抽出する AI。
 *
 * 旧 system/app/api/production/ai の import-reply アクションを app-v2 で復活。
 * セバス指摘の機能脱落 4 件は完了済みだが、本ルートは旧 production/ai の 6 アクションの
 * うち「保留」としていた最後の 1 つを実装する（goal 2/4）。
 *
 * 動作：
 * 1. 入力：返信テキスト + channel（email/slack/etc）+ deal_id（任意）
 * 2. AI が action_type / 要約 / 送信者 / 次のアクション / 顧客ニーズを抽出
 * 3. レスポンスを UI でプレビュー → ユーザーが確定 → actions テーブルに insert（UI 側で実行）
 *
 * このルート自体は DB 書込みせず、構造化抽出のみ（呼出側が createAction で insert）。
 */

const requestSchema = z.object({
  reply_text: z.string().min(5).max(8000),
  channel: z.enum(['email', 'slack', 'chat', 'other']).default('email'),
  deal_id: z.string().uuid().optional().nullable(),
});

const aiResponseSchema = z.object({
  action_type: z.enum(['call', 'meeting', 'proposal', 'email', 'visit', 'other']),
  occurred_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD'),
  note: z.string().min(1).max(300),
  sender_name: z.string().max(80),
  is_from_customer: z.boolean(),
  suggested_next_action: z.string().max(200).optional(),
  extracted_needs: z.array(z.string().min(1).max(200)).max(8),
  sentiment: z.enum(['positive', 'neutral', 'negative']).optional(),
});

const SCHEMA_PROMPT = `Return JSON like:
{
  "action_type": "email",
  "occurred_at": "2026-05-20",
  "note": "見積を社内検討中、6月初旬に決裁会議。価格は予算内、機能優先順位を絞り込みたい",
  "sender_name": "鈴木部長（A社）",
  "is_from_customer": true,
  "suggested_next_action": "決裁会議までに機能優先順位の資料を送る",
  "extracted_needs": ["機能優先順位の整理", "決裁会議向け資料"],
  "sentiment": "positive"
}`;

const SYSTEM_PROMPT = `あなたは tripot（IT 受託開発会社）の営業支援アシスタント。
顧客や社内から届いた返信（メール / Slack / チャット）を読み、
行動履歴（actions）への登録用に構造化データを抽出する。

## 原則
- action_type は返信そのものを記録する種別を選ぶ（メールなら 'email'、電話だったなら 'call'）
- occurred_at は本文中に日付があればその日、無ければ「今日」
- note は要約（300 字以内）、決定事項・期限・金額があれば優先して含める
- sender_name は本文または署名から判定、不明なら空文字
- is_from_customer は顧客側からの返信か（true）、社内・自分発信か（false）
- suggested_next_action は「次にこちらが取るべき行動」を 1 文（200 字以内）
- extracted_needs は顧客側のニーズ・要望（最大 8 個、各 200 字以内）
- sentiment は返信全体のトーン（顧客向け文の場合、自社目線で positive/neutral/negative）

JSON のみ、markdown 禁止。`;

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

  const today = new Date().toISOString().slice(0, 10);
  const userPrompt = `返信チャネル: ${parsed.data.channel}
今日: ${today}
${parsed.data.deal_id ? `案件 ID: ${parsed.data.deal_id}（参考、本文内容を優先）` : ''}

---
${parsed.data.reply_text}
---

この返信から行動履歴登録用の構造化データを抽出してください。`;

  try {
    const result = await callJson<z.infer<typeof aiResponseSchema>>(
      {
        companyId: session.user.company_id,
        memberId: session.user.member_id,
        jobType: 'import-reply',
        dealId: parsed.data.deal_id ?? undefined,
      },
      {
        userPrompt,
        systemPrompt: SYSTEM_PROMPT,
        schema: SCHEMA_PROMPT,
        maxTokens: 1024,
        temperature: 0.2,
      }
    );

    const validation = aiResponseSchema.safeParse(result.data);
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
      action: 'reply.import_parsed',
      resource_type: 'ai_job',
      resource_id: result.jobId,
      metadata: {
        deal_id: parsed.data.deal_id ?? null,
        channel: parsed.data.channel,
        action_type: validation.data.action_type,
        needs_count: validation.data.extracted_needs.length,
        cost_micro_usd: result.usage.costMicroUsd,
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
