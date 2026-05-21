import { NextResponse } from 'next/server';
import { eq, and, isNull, desc } from 'drizzle-orm';
import { z } from 'zod';
import { auth } from '@/auth';
import { db, logAudit, setTenantContext } from '@/lib/db';
import { deals, customers, meetings } from '@/db/schema';
import { callJson, AiError } from '@/lib/ai';

/**
 * POST /api/ai/generate-estimate
 *
 * deal_id を起点に、案件情報 + 顧客 + 直近議事録(最大3件) からClaudeで見積明細を生成する。
 * DB には書き込まず、フロントの estimate-editor が編集可能な line_items 形式で返す。
 *
 * line_items schema は estimate-editor.tsx と整合:
 *   { description, quantity, unit_price, amount }
 *
 * 旧 system/app/src/app/api/deals/ai/route.ts の generate-estimate アクションを
 * app-v2 構造（auth + tenant + callJson + zod 検証 + audit log）で復活させたもの。
 */

const requestSchema = z.object({
  deal_id: z.string().uuid(),
});

const lineItemSchema = z.object({
  description: z.string().min(1).max(120),
  quantity: z.number().positive().max(100), // 人月 or 数量
  unit_price: z.number().int().min(0).max(10_000_000), // 人月単価（円）
});

const aiResponseSchema = z.object({
  items: z.array(lineItemSchema).min(3).max(10),
  suggested_title: z.string().min(1).max(120),
  notes: z.string().max(400).optional(),
});

const SCHEMA_PROMPT = `Return JSON like:
{
  "items": [
    {
      "description": "要件定義",
      "quantity": 1.5,
      "unit_price": 800000
    }
  ],
  "suggested_title": "○○システム開発見積（V1）",
  "notes": "前提・条件・備考を 400 字以内で（任意）"
}`;

const SYSTEM_PROMPT = `あなたは IT 受託開発（tripot）の見積積算の専門家です。
案件情報と打ち合わせ内容を読み取り、案件の実態に合った見積明細を生成します。
案件の業種・規模・要件を正確に読み取り、デザイン案件をDX案件と取り違えない、不必要な工程を入れない。

## 出力規律
- items は 5〜7 項目を基本（最小 3、最大 10）
- description: 工程名を簡潔に（例: 「要件定義」「基本設計」「フロントエンド実装」「QA・テスト」「リリース・運用引継ぎ」）
- quantity: 人月 or 数量。基本は人月（例: 1.5 = 1.5人月）
- unit_price: 人月単価（円）。一般的な相場は 60万〜120万/人月
- 各 line の amount = quantity × unit_price はフロントで自動計算する
- 合計が案件の予算目安を大幅に超えないこと（予算未定時は 300 万円前後を目安）
- 受託開発の標準工程: キックオフ準備 → 要件定義 → 設計 → 実装 → テスト → 納品

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

  const dealRow = await db
    .select({
      id: deals.id,
      title: deals.title,
      stage: deals.stage,
      amount: deals.amount,
      revenue_type: deals.revenue_type,
      metadata: deals.metadata,
      customer_name: customers.name,
    })
    .from(deals)
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

  // 直近の議事録 3 件まで（summary を優先）
  const recentMeetings = await db
    .select({
      type: meetings.type,
      summary: meetings.summary,
      raw_text: meetings.raw_text,
      occurred_at: meetings.occurred_at,
      needs: meetings.needs,
    })
    .from(meetings)
    .where(
      and(
        eq(meetings.deal_id, dealRow.id),
        eq(meetings.company_id, session.user.company_id),
        isNull(meetings.deleted_at)
      )
    )
    .orderBy(desc(meetings.occurred_at))
    .limit(3);

  const meetingsDigest = recentMeetings
    .map((m, idx) => {
      const body = m.summary ?? m.raw_text ?? '';
      return `### 議事録${idx + 1}（${m.type} / ${m.occurred_at.toISOString().slice(0, 10)}）\n${body.slice(0, 1500)}`;
    })
    .join('\n\n');

  const allNeeds = recentMeetings
    .flatMap((m) => (Array.isArray(m.needs) ? (m.needs as unknown[]) : []))
    .slice(0, 12)
    .map((n, idx) => {
      if (typeof n === 'object' && n !== null) {
        const obj = n as Record<string, unknown>;
        return `${idx + 1}. ${obj.text ?? obj.summary ?? JSON.stringify(obj).slice(0, 200)}`;
      }
      return `${idx + 1}. ${String(n).slice(0, 200)}`;
    })
    .join('\n');

  const amountHint =
    dealRow.amount && dealRow.amount > 0
      ? `¥${dealRow.amount.toLocaleString('ja-JP')}`
      : '未定（300万円前後を目安）';

  const userPrompt = `案件: ${dealRow.title}
顧客: ${dealRow.customer_name ?? '—'}
ステージ: ${dealRow.stage}
収益タイプ: ${dealRow.revenue_type}
予算目安: ${amountHint}

${meetingsDigest ? `## 直近の打ち合わせ（${recentMeetings.length}件）\n${meetingsDigest}` : '## 直近の打ち合わせ\n（議事録なし）'}

${allNeeds ? `## 抽出済みニーズ\n${allNeeds}` : ''}

この案件の見積明細を生成してください。`;

  try {
    const result = await callJson<z.infer<typeof aiResponseSchema>>(
      {
        companyId: session.user.company_id,
        memberId: session.user.member_id,
        jobType: 'generate-estimate',
        dealId: dealRow.id,
      },
      {
        userPrompt,
        systemPrompt: SYSTEM_PROMPT,
        schema: SCHEMA_PROMPT,
        maxTokens: 2048,
        temperature: 0.3,
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

    // line_items 形式に揃える（amount = quantity × unit_price）
    const itemsWithAmount = validation.data.items.map((i) => ({
      description: i.description,
      quantity: i.quantity,
      unit_price: i.unit_price,
      amount: Math.round(i.quantity * i.unit_price),
    }));

    const subtotal = itemsWithAmount.reduce((s, i) => s + i.amount, 0);

    await logAudit({
      member_id: session.user.member_id,
      company_id: session.user.company_id,
      action: 'estimate.generate_from_deal',
      resource_type: 'deal',
      resource_id: dealRow.id,
      metadata: {
        item_count: itemsWithAmount.length,
        subtotal,
        cost_micro_usd: result.usage.costMicroUsd,
        ai_job_id: result.jobId,
      },
    });

    return NextResponse.json({
      deal: {
        id: dealRow.id,
        title: dealRow.title,
      },
      items: itemsWithAmount,
      suggested_title: validation.data.suggested_title,
      notes: validation.data.notes ?? null,
      subtotal,
      meetings_used: recentMeetings.length,
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
