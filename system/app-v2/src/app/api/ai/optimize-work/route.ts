import { NextResponse } from 'next/server';
import { eq, and, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { auth } from '@/auth';
import { db, logAudit } from '@/lib/db';
import { production_cards, tasks } from '@/db/schema';
import { callJson, AiError } from '@/lib/ai';

const HOURLY_RATE_YEN = 3000;

const AI_REDUCTION_MAP: Record<string, number> = {
  development: 0.80,
  testing: 0.60,
  document: 0.50,
  template: 0.70,
};

const CATEGORY_VALUES = [
  'development',
  'testing',
  'document',
  'template',
  'ui',
  'business_logic',
  'customer_facing',
  'negotiation',
  'other',
] as const;

type Category = (typeof CATEGORY_VALUES)[number];

const HUMAN_ONLY: Set<Category> = new Set([
  'ui',
  'business_logic',
  'customer_facing',
  'negotiation',
  'other',
]);

const requestSchema = z.object({
  card_id: z.string().uuid(),
});

const aiResponseSchema = z.object({
  tasks: z.array(
    z.object({
      id: z.string().uuid(),
      category: z.enum(CATEGORY_VALUES),
      rationale: z.string().min(1).max(160),
    })
  ),
});

const SCHEMA_PROMPT = `Return JSON like:
{
  "tasks": [
    { "id": "<uuid>", "category": "development|testing|document|template|ui|business_logic|customer_facing|negotiation|other", "rationale": "なぜそのカテゴリか1文" }
  ]
}`;

const SYSTEM_PROMPT = `あなたはBtoB受託開発の工数分析エキスパート。タスク title から category を分類します。

## カテゴリ定義（AI 削減率付き）
- development: コーディング・実装作業（AI 80% 削減可）
- testing: テストコード・QA作業（AI 60% 削減可）
- document: 仕様書・ドキュメント作成（AI 50% 削減可）
- template: テンプレ流用・定型作業（AI 70% 削減可）

## 人間専管（AI 削減率 0%）
- ui: 視覚デザイン・UX 設計
- business_logic: 業務固有ロジック設計
- customer_facing: 顧客対応・要件ヒアリング
- negotiation: 交渉・調整・社内合意
- other: 上記いずれにも当てはまらない

## 判断指針
- 「ユーザー認証 CRUD 実装」→ development
- 「ユニットテスト作成」→ testing
- 「API 仕様書作成」→ document
- 「ヘッダー UI コンポーネント」→ ui（見た目設計だから人間）
- 「権限管理ロジック設計」→ business_logic
- 「顧客との要件ヒアリング」→ customer_facing
- 「契約金額の交渉」→ negotiation
- 不明 / 短すぎる title → other

各 task の id は **絶対に変更しない**（input の id をそのまま使う）。
出力は厳密に JSON、不要な文を含めない。`;

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

  const cardRow = await db
    .select({
      id: production_cards.id,
      title: production_cards.title,
      deal_id: production_cards.deal_id,
      estimated_cost: production_cards.estimated_cost,
    })
    .from(production_cards)
    .where(
      and(
        eq(production_cards.id, parsed.data.card_id),
        eq(production_cards.company_id, session.user.company_id),
        isNull(production_cards.deleted_at)
      )
    )
    .limit(1)
    .then((rows) => rows[0]);

  if (!cardRow) {
    return NextResponse.json({ error: 'card_not_found' }, { status: 404 });
  }

  if (!cardRow.deal_id) {
    return NextResponse.json(
      { error: 'no_linked_deal', message: '案件に紐付かない card は最適化対象外' },
      { status: 422 }
    );
  }

  const taskRows = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      estimated_cost: tasks.estimated_cost,
      status: tasks.status,
    })
    .from(tasks)
    .where(
      and(
        eq(tasks.deal_id, cardRow.deal_id),
        eq(tasks.company_id, session.user.company_id),
        isNull(tasks.deleted_at)
      )
    );

  if (taskRows.length === 0) {
    return NextResponse.json(
      { error: 'no_tasks', message: 'この case に紐付くタスクがありません' },
      { status: 422 }
    );
  }

  const taskList = taskRows
    .map((t) => `- id: ${t.id}\n  title: ${t.title}\n  estimated_cost: ¥${(t.estimated_cost ?? 0).toLocaleString('ja-JP')}`)
    .join('\n');

  const userPrompt = `案件名: ${cardRow.title}
タスク数: ${taskRows.length}

## タスク一覧
${taskList}

各 task の id を保持しつつ、category を分類してください。`;

  try {
    const result = await callJson<{
      tasks: Array<{ id: string; category: Category; rationale: string }>;
    }>(
      {
        companyId: session.user.company_id,
        memberId: session.user.member_id,
        jobType: 'refine-requirements',
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

    const classifyMap = new Map(
      validation.data.tasks.map((t) => [t.id, { category: t.category, rationale: t.rationale }])
    );

    let totalOriginalHours = 0;
    let totalOptimizedHours = 0;
    const items = taskRows.map((t) => {
      const cls = classifyMap.get(t.id);
      const category: Category = cls?.category ?? 'other';
      const rationale = cls?.rationale ?? '分類不能';
      const originalHours = Math.round((t.estimated_cost ?? 0) / HOURLY_RATE_YEN);

      let optimizedHours = originalHours;
      let reductionRate = 0;
      let isAi = false;

      if (!HUMAN_ONLY.has(category)) {
        const rate = AI_REDUCTION_MAP[category];
        if (rate !== undefined && originalHours > 0) {
          optimizedHours = Math.round(originalHours * (1 - rate));
          reductionRate = rate;
          isAi = true;
        }
      }

      totalOriginalHours += originalHours;
      totalOptimizedHours += optimizedHours;

      return {
        id: t.id,
        title: t.title,
        category,
        rationale,
        original_hours: originalHours,
        optimized_hours: optimizedHours,
        reduction_rate: reductionRate,
        is_ai: isAi,
      };
    });

    const totalReductionHours = totalOriginalHours - totalOptimizedHours;
    const overallReductionRate =
      totalOriginalHours > 0
        ? Math.round((totalReductionHours / totalOriginalHours) * 100)
        : 0;
    const costSavingYen = totalReductionHours * HOURLY_RATE_YEN;

    await logAudit({
      member_id: session.user.member_id,
      company_id: session.user.company_id,
      action: 'work_optimization.assess',
      resource_type: 'production_card',
      resource_id: parsed.data.card_id,
      metadata: {
        task_count: taskRows.length,
        total_original_hours: totalOriginalHours,
        total_optimized_hours: totalOptimizedHours,
        cost_saving_yen: costSavingYen,
        cost_micro_usd: result.usage.costMicroUsd,
        ai_job_id: result.jobId,
      },
    });

    return NextResponse.json({
      card: {
        id: cardRow.id,
        title: cardRow.title,
      },
      hourly_rate_yen: HOURLY_RATE_YEN,
      items,
      summary: {
        task_count: taskRows.length,
        total_original_hours: totalOriginalHours,
        total_optimized_hours: totalOptimizedHours,
        total_reduction_hours: totalReductionHours,
        overall_reduction_rate: overallReductionRate,
        cost_saving_yen: costSavingYen,
      },
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
