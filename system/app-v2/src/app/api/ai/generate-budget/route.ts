import { NextResponse } from 'next/server';
import { eq, and, isNull, desc } from 'drizzle-orm';
import { z } from 'zod';
import { auth } from '@/auth';
import { db, logAudit, setTenantContext } from '@/lib/db';
import { deals, customers, estimates } from '@/db/schema';
import { callJson, AiError } from '@/lib/ai';

/**
 * POST /api/ai/generate-budget
 *
 * 案件の最新見積（estimates の最新 version）から、各明細の予測原価を AI で算出。
 * 業界相場と工数を考慮、粗利率 25-35% を目安にする。
 *
 * 隊長指摘 (2026-05-20)：「行動 → 粗利 → PL/CF」の動線完成のため、
 * 旧 system/app/api/deals/ai/route.ts の generate-budget アクションを復活。
 *
 * 入力：deal_id
 * 出力：line ごとの予測原価 + 合計 + 推奨 external_cost
 * UI 側で「この値で外注費を更新」ボタン → external_cost を投入 → 粗利自動計算（generated column）
 */

const requestSchema = z.object({
  deal_id: z.string().uuid(),
});

const budgetItemSchema = z.object({
  name: z.string().min(1).max(120),
  revenue: z.number().int().nonnegative(),
  budget_cost: z.number().int().nonnegative(),
  cost_label: z.string().min(1).max(200),
  gross_profit: z.number().int(),
});

const aiResponseSchema = z.object({
  items: z.array(budgetItemSchema).min(1).max(15),
  total_revenue: z.number().int().nonnegative(),
  total_budget_cost: z.number().int().nonnegative(),
  total_gross_profit: z.number().int(),
  gross_profit_rate: z.number().min(-100).max(100),
  notes: z.string().max(400).optional(),
});

const SCHEMA_PROMPT = `Return JSON like:
{
  "items": [
    {
      "name": "要件定義",
      "revenue": 1200000,
      "budget_cost": 900000,
      "cost_label": "1.5人月 × ¥60万 (内製想定)",
      "gross_profit": 300000
    }
  ],
  "total_revenue": 5000000,
  "total_budget_cost": 3500000,
  "total_gross_profit": 1500000,
  "gross_profit_rate": 30.0,
  "notes": "外注費を抑えれば粗利率 35% も可。デザインは内製化推奨"
}`;

const SYSTEM_PROMPT = `あなたは IT 受託開発（tripot）の経理担当です。
見積明細に対する予測原価を算出します。出力は JSON のみ。

## 原則
- 受託開発の標準原価率：人月単価 60-80% が原価（外注 / 人件費 / 直接費）
- 粗利率 25-35% を目安（業界相場、Tripot 経営方針）
- cost_label は「○人月 × ¥○万 (内製/外注/直接費)」形式で内訳を明示
- 各項目で revenue - budget_cost = gross_profit になるように厳密に計算
- total_gross_profit / total_revenue * 100 = gross_profit_rate（少数 1 位まで）

## 業界別の補正
- IT 受託開発：人月単価 70 万円が平均、デザイン作業は内製化で原価率下がる
- 案件規模が小さい（< 500 万円）：原価率上がる（70-80%）
- 案件規模が大きい（> 2000 万円）：スケールで原価率下がる（55-65%）

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
      amount: deals.amount,
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

  // 最新 estimate（最大 version）を取得
  const latestEstimate = await db
    .select({
      id: estimates.id,
      title: estimates.title,
      line_items: estimates.line_items,
      subtotal: estimates.subtotal,
      total: estimates.total,
    })
    .from(estimates)
    .where(
      and(
        eq(estimates.deal_id, dealRow.id),
        eq(estimates.company_id, session.user.company_id),
        isNull(estimates.deleted_at)
      )
    )
    .orderBy(desc(estimates.version))
    .limit(1)
    .then((rows) => rows[0]);

  if (!latestEstimate) {
    return NextResponse.json(
      {
        error: 'no_estimate',
        message:
          '見積がまだ作成されていません。先に見積を作成して、AI 明細生成または手動入力してください',
      },
      { status: 422 }
    );
  }

  type LineItem = {
    description: string;
    quantity: number;
    unit_price: number;
    amount: number;
  };
  const lineItems = Array.isArray(latestEstimate.line_items)
    ? (latestEstimate.line_items as LineItem[])
    : [];

  if (lineItems.length === 0) {
    return NextResponse.json(
      { error: 'empty_estimate', message: '見積の明細が空です' },
      { status: 422 }
    );
  }

  const itemsDigest = lineItems
    .map(
      (i, idx) =>
        `${idx + 1}. ${i.description}: 売上 ¥${i.amount.toLocaleString('ja-JP')}（${i.quantity} × ¥${i.unit_price.toLocaleString('ja-JP')}）`
    )
    .join('\n');

  const userPrompt = `案件: ${dealRow.title}
顧客: ${dealRow.customer_name ?? '—'}
案件金額（合計）: ¥${(dealRow.amount ?? 0).toLocaleString('ja-JP')}
見積タイトル: ${latestEstimate.title}
見積合計（税込）: ¥${(latestEstimate.total ?? 0).toLocaleString('ja-JP')}

## 見積明細（${lineItems.length} 行）
${itemsDigest}

この見積に対する予測原価を、各項目で算出してください。
受託開発 (IT) の業界相場と Tripot の経営方針（粗利率 25-35% を目安）を考慮。`;

  try {
    const result = await callJson<z.infer<typeof aiResponseSchema>>(
      {
        companyId: session.user.company_id,
        memberId: session.user.member_id,
        jobType: 'generate-budget',
        dealId: dealRow.id,
      },
      {
        userPrompt,
        systemPrompt: SYSTEM_PROMPT,
        schema: SCHEMA_PROMPT,
        maxTokens: 2048,
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
      action: 'budget.generate_from_estimate',
      resource_type: 'deal',
      resource_id: dealRow.id,
      metadata: {
        estimate_id: latestEstimate.id,
        item_count: validation.data.items.length,
        total_budget_cost: validation.data.total_budget_cost,
        gross_profit_rate: validation.data.gross_profit_rate,
        cost_micro_usd: result.usage.costMicroUsd,
        ai_job_id: result.jobId,
      },
    });

    return NextResponse.json({
      deal: { id: dealRow.id, title: dealRow.title },
      estimate: { id: latestEstimate.id, title: latestEstimate.title },
      items: validation.data.items,
      total_revenue: validation.data.total_revenue,
      total_budget_cost: validation.data.total_budget_cost,
      total_gross_profit: validation.data.total_gross_profit,
      gross_profit_rate: validation.data.gross_profit_rate,
      notes: validation.data.notes ?? null,
      // UI 側で「この値で外注費を更新」ボタンに渡す値
      suggested_external_cost: validation.data.total_budget_cost,
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
