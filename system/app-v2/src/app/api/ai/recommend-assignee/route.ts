import { NextResponse } from 'next/server';
import { eq, and, isNull, gte, sql } from 'drizzle-orm';
import { z } from 'zod';
import { auth } from '@/auth';
import { db, logAudit } from '@/lib/db';
import { production_cards, members, vendors, time_logs } from '@/db/schema';
import { callJson, AiError } from '@/lib/ai';

const requestSchema = z.object({
  card_id: z.string().uuid(),
});

const aiResponseSchema = z.object({
  required_skills: z.array(z.string()).min(1).max(8),
  task_summary: z.string().min(1).max(200),
  recommend_rationale: z.string().min(1).max(300),
});

const SCHEMA_PROMPT = `Return JSON like:
{
  "required_skills": ["TypeScript", "Next.js", "Drizzle"],
  "task_summary": "1文でタスクの本質を要約（120字以内）",
  "recommend_rationale": "AI 推薦の判断軸を1-2文で説明（200字以内）"
}`;

const SYSTEM_PROMPT = `あなたは BtoB 受託開発のリソース配分アナリスト。production card のタイトル + 関連 tasks から、必要スキルを推論する。

## 必要スキルの粒度
- 技術名で具体的に（× 「コーディング」、◯ 「TypeScript」「PostgreSQL」「Next.js」）
- 業界スキル含む（「製造業ドメイン理解」「医療法務」等もOK）
- 3-6 個程度、多すぎても少なすぎても NG

## 出力規律
- required_skills: 配列、3-6 個
- task_summary: タスク本質を 120 字以内で
- recommend_rationale: 推薦時の判断軸（スキル + 稼働 + 速度 + 品質 + コスト）を1-2文で

JSON のみ、markdown 禁止。`;

const SCORE_BREAKDOWN = {
  SKILL_MATCH_PER: 30,
  LOAD_LOW: 20,
  LOAD_MID: 10,
  LOAD_HIGH: -20,
  SPEED_FAST: 15,
  QUALITY_HIGH: 10,
  PRICE_MIN: 5,
} as const;

type ResourceScore = {
  id: string;
  name: string;
  type: 'inhouse' | 'outsource';
  role: string;
  skills: string[];
  matched_skills: string[];
  load_rate: number;
  avg_speed_rate: number;
  quality_score: number;
  unit_price_yen: number;
  score: number;
  reason: string;
};

function buildReason(r: ResourceScore, rank: number): string {
  if (rank === 1) {
    if (r.load_rate > 80) return '稼働は高めだが最もスキルマッチ';
    return 'スキルマッチ・稼働バランスが最良';
  }
  if (r.load_rate < 50) return '稼働に余裕あり、育成も兼ねて';
  if (r.type === 'outsource') {
    return `外注、コスト ¥${(r.unit_price_yen / 10000).toFixed(0)}万/月`;
  }
  if (r.matched_skills.length === 0) return 'スキル直接マッチなし、横展開も可';
  return 'バランス型、安定したアウトプット';
}

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

  const card = await db
    .select({
      id: production_cards.id,
      title: production_cards.title,
      requirements: production_cards.requirements,
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

  if (!card) {
    return NextResponse.json({ error: 'card_not_found' }, { status: 404 });
  }

  const requirements = (card.requirements as Record<string, unknown> | null) ?? null;
  const reqSummary = requirements
    ? Object.entries(requirements)
        .slice(0, 5)
        .map(([k, v]) => `- ${k}: ${typeof v === 'string' ? v.slice(0, 100) : JSON.stringify(v).slice(0, 100)}`)
        .join('\n')
    : '（要件未設定）';

  const userPrompt = `案件名: ${card.title}

## 要件メタ
${reqSummary}

タスク本質を要約し、必要スキル 3-6 個を推論してください。`;

  let aiResult: {
    required_skills: string[];
    task_summary: string;
    recommend_rationale: string;
  };

  try {
    const aiCall = await callJson<typeof aiResult>(
      {
        companyId: session.user.company_id,
        memberId: session.user.member_id,
        jobType: 'refine-requirements',
      },
      {
        userPrompt,
        systemPrompt: SYSTEM_PROMPT,
        schema: SCHEMA_PROMPT,
        maxTokens: 1024,
        temperature: 0.3,
      }
    );

    const validation = aiResponseSchema.safeParse(aiCall.data);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'ai_invalid_format',
          details: validation.error.flatten(),
          rawText: aiCall.rawText.slice(0, 1000),
        },
        { status: 422 }
      );
    }

    aiResult = validation.data;

    const memberRows = await db
      .select({
        id: members.id,
        name: members.name,
        role: members.role,
        metadata: members.metadata,
      })
      .from(members)
      .where(
        and(
          eq(members.company_id, session.user.company_id),
          eq(members.status, 'active'),
          isNull(members.deleted_at)
        )
      );

    const vendorRows = await db
      .select({
        id: vendors.id,
        name: vendors.name,
        rating: vendors.rating,
        skills: vendors.skills,
        metadata: vendors.metadata,
      })
      .from(vendors)
      .where(
        and(
          eq(vendors.company_id, session.user.company_id),
          isNull(vendors.deleted_at)
        )
      );

    const last30 = new Date();
    last30.setDate(last30.getDate() - 30);
    last30.setHours(0, 0, 0, 0);

    const loadRows = await db
      .select({
        member_id: time_logs.member_id,
        total_minutes: sql<number>`COALESCE(SUM(${time_logs.minutes}), 0)::int`,
      })
      .from(time_logs)
      .where(
        and(
          eq(time_logs.company_id, session.user.company_id),
          gte(time_logs.occurred_on, last30.toISOString().slice(0, 10))
        )
      )
      .groupBy(time_logs.member_id);

    const loadByMember = new Map(loadRows.map((r) => [r.member_id, r.total_minutes ?? 0]));
    const standardMonthlyMinutes = 160 * 60;

    const requiredSkillsLower = aiResult.required_skills.map((s) => s.toLowerCase());

    const memberResources: ResourceScore[] = memberRows.map((m) => {
      const meta = (m.metadata as Record<string, unknown> | null) ?? {};
      const skills = Array.isArray(meta.skills) ? (meta.skills as string[]) : [];
      const matched = skills.filter((s) =>
        requiredSkillsLower.some((req) => s.toLowerCase().includes(req) || req.includes(s.toLowerCase()))
      );
      const minutes = loadByMember.get(m.id) ?? 0;
      const loadRate = Math.min(100, Math.round((minutes / standardMonthlyMinutes) * 100));
      const avgSpeedRate = typeof meta.avg_speed_rate === 'number' ? meta.avg_speed_rate : 100;
      const qualityScore = typeof meta.quality_score === 'number' ? meta.quality_score : 4.0;
      const unitPriceYen = typeof meta.unit_price_yen === 'number' ? meta.unit_price_yen : 0;

      return {
        id: m.id,
        name: m.name,
        type: 'inhouse',
        role: m.role,
        skills,
        matched_skills: matched,
        load_rate: loadRate,
        avg_speed_rate: avgSpeedRate,
        quality_score: qualityScore,
        unit_price_yen: unitPriceYen,
        score: 0,
        reason: '',
      };
    });

    const vendorResources: ResourceScore[] = vendorRows.map((v) => {
      const skills = Array.isArray(v.skills) ? (v.skills as string[]) : [];
      const meta = (v.metadata as Record<string, unknown> | null) ?? {};
      const matched = skills.filter((s) =>
        requiredSkillsLower.some((req) => s.toLowerCase().includes(req) || req.includes(s.toLowerCase()))
      );
      const loadRate = typeof meta.load_rate === 'number' ? meta.load_rate : 50;
      const avgSpeedRate = typeof meta.avg_speed_rate === 'number' ? meta.avg_speed_rate : 100;
      const qualityScore = (v.rating ?? 3) * 1.0;
      const unitPriceYen = typeof meta.unit_price_yen === 'number' ? meta.unit_price_yen : 0;

      return {
        id: v.id,
        name: v.name,
        type: 'outsource',
        role: 'vendor',
        skills,
        matched_skills: matched,
        load_rate: loadRate,
        avg_speed_rate: avgSpeedRate,
        quality_score: qualityScore,
        unit_price_yen: unitPriceYen,
        score: 0,
        reason: '',
      };
    });

    const allResources = [...memberResources, ...vendorResources];
    const validPrices = allResources
      .map((r) => r.unit_price_yen)
      .filter((p) => p > 0);
    const minPrice = validPrices.length > 0 ? Math.min(...validPrices) : 0;

    const ranked = allResources
      .map((r) => {
        let score = 0;
        score += r.matched_skills.length * SCORE_BREAKDOWN.SKILL_MATCH_PER;
        if (r.load_rate < 50) score += SCORE_BREAKDOWN.LOAD_LOW;
        else if (r.load_rate <= 80) score += SCORE_BREAKDOWN.LOAD_MID;
        else score += SCORE_BREAKDOWN.LOAD_HIGH;
        if (r.avg_speed_rate < 100) score += SCORE_BREAKDOWN.SPEED_FAST;
        if (r.quality_score >= 4.5) score += SCORE_BREAKDOWN.QUALITY_HIGH;
        if (minPrice > 0 && r.unit_price_yen === minPrice) score += SCORE_BREAKDOWN.PRICE_MIN;
        return { ...r, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((r, idx) => ({ ...r, reason: buildReason(r, idx + 1) }));

    if (ranked.length === 0) {
      return NextResponse.json(
        { error: 'no_resources', message: 'メンバー / 外注先が登録されていません' },
        { status: 422 }
      );
    }

    await logAudit({
      member_id: session.user.member_id,
      company_id: session.user.company_id,
      action: 'assignee_recommend.assess',
      resource_type: 'production_card',
      resource_id: parsed.data.card_id,
      metadata: {
        required_skills: aiResult.required_skills,
        top_score: ranked[0]?.score ?? 0,
        cost_micro_usd: aiCall.usage.costMicroUsd,
        ai_job_id: aiCall.jobId,
      },
    });

    return NextResponse.json({
      card: { id: card.id, title: card.title },
      ai: aiResult,
      ranked,
      score_breakdown: SCORE_BREAKDOWN,
      generated_at: new Date().toISOString(),
      usage: aiCall.usage,
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
