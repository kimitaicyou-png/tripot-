import { NextResponse } from 'next/server';
import { eq, and, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { auth } from '@/auth';
import { db, logAudit, setTenantContext } from '@/lib/db';
import { meetings, deals, customers } from '@/db/schema';
import { callJson, AiError } from '@/lib/ai';

const requestSchema = z.object({
  meeting_id: z.string().uuid(),
});

const aiResponseSchema = z.object({
  tasks: z
    .array(
      z.object({
        title: z.string().min(1).max(160),
        estimated_hours: z.number().int().min(0).max(400),
        type: z.enum(['development', 'testing', 'document', 'template', 'ui', 'business_logic', 'customer_facing', 'negotiation', 'other']),
        priority: z.enum(['high', 'medium', 'low']),
        rationale: z.string().min(1).max(200),
      })
    )
    .min(1)
    .max(15),
  overall_estimated_hours: z.number().int().min(0).max(2000),
  notes: z.string().min(1).max(400),
});

const SCHEMA_PROMPT = `Return JSON like:
{
  "tasks": [
    {
      "title": "ユーザー認証 API 実装",
      "estimated_hours": 16,
      "type": "development|testing|document|template|ui|business_logic|customer_facing|negotiation|other",
      "priority": "high|medium|low",
      "rationale": "なぜこのタスクが必要か1文"
    }
  ],
  "overall_estimated_hours": 120,
  "notes": "全体の所感、注意事項、依存関係を 200 字以内で"
}`;

const SYSTEM_PROMPT = `あなたはBtoB受託開発のプロジェクトマネージャー。議事録から制作タスクを自動生成します。

## タスク粒度
- 1 タスク = 1 担当者が 1-3 日で完結する単位
- 大きすぎたら分割（80h を超えるタスクは 2 つに）
- 小さすぎたら統合（1h 未満は他と合体）
- 5-12 個程度が適正、案件規模で調整

## type の判断基準
- development: コーディング・実装作業
- testing: テスト・QA
- document: 仕様書・設計書
- template: テンプレ流用
- ui: UI 設計・デザイン
- business_logic: 業務ロジック設計
- customer_facing: 顧客対応・要件ヒアリング
- negotiation: 交渉・調整
- other: 上記以外

## priority
- high: ブロッカー、依存元
- medium: 通常
- low: 後回し可能

## 出力規律
- title: 動詞 + 名詞で具体的に（× 「準備」、◯ 「DB schema 設計書作成」）
- estimated_hours: 整数、現実的に
- rationale: 1文で「なぜ必要」「何の前提」を明示

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

  const meetingRow = await db
    .select({
      id: meetings.id,
      title: meetings.title,
      type: meetings.type,
      raw_text: meetings.raw_text,
      summary: meetings.summary,
      needs: meetings.needs,
      occurred_at: meetings.occurred_at,
      deal_id: meetings.deal_id,
      deal_title: deals.title,
      customer_name: customers.name,
    })
    .from(meetings)
    .leftJoin(deals, eq(meetings.deal_id, deals.id))
    .leftJoin(customers, eq(meetings.customer_id, customers.id))
    .where(
      and(
        eq(meetings.id, parsed.data.meeting_id),
        eq(meetings.company_id, session.user.company_id),
        isNull(meetings.deleted_at)
      )
    )
    .limit(1)
    .then((rows) => rows[0]);

  if (!meetingRow) {
    return NextResponse.json({ error: 'meeting_not_found' }, { status: 404 });
  }

  const sourceContent = meetingRow.summary ?? meetingRow.raw_text ?? '';
  if (!sourceContent || sourceContent.trim().length < 10) {
    return NextResponse.json(
      {
        error: 'no_source',
        message: '議事録の本文 / 要約が空のためタスク生成できません。先に「要約」を実行してください',
      },
      { status: 422 }
    );
  }

  const needsArray = Array.isArray(meetingRow.needs) ? (meetingRow.needs as unknown[]) : [];
  const needsDigest = needsArray
    .slice(0, 8)
    .map((n, idx) => {
      if (typeof n === 'object' && n !== null) {
        const obj = n as Record<string, unknown>;
        return `${idx + 1}. ${obj.text ?? obj.summary ?? JSON.stringify(obj).slice(0, 200)}`;
      }
      return `${idx + 1}. ${String(n).slice(0, 200)}`;
    })
    .join('\n');

  const userPrompt = `案件: ${meetingRow.deal_title ?? '（未紐付）'}
顧客: ${meetingRow.customer_name ?? '—'}
会議種別: ${meetingRow.type}
日時: ${meetingRow.occurred_at.toISOString().slice(0, 10)}

## 議事録${meetingRow.summary ? '要約' : '本文'}
${sourceContent.slice(0, 4000)}

${
  needsDigest
    ? `## 抽出済みニーズ（${needsArray.length}件）\n${needsDigest}`
    : ''
}

この議事録から、制作実行のための具体的タスク 5-12 個を生成してください。`;

  try {
    const result = await callJson<{
      tasks: Array<{
        title: string;
        estimated_hours: number;
        type: string;
        priority: string;
        rationale: string;
      }>;
      overall_estimated_hours: number;
      notes: string;
    }>(
      {
        companyId: session.user.company_id,
        memberId: session.user.member_id,
        jobType: 'generate-tasks',
        dealId: meetingRow.deal_id ?? undefined,
      },
      {
        userPrompt,
        systemPrompt: SYSTEM_PROMPT,
        schema: SCHEMA_PROMPT,
        maxTokens: 2048,
        temperature: 0.4,
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
      action: 'tasks.generate_from_meeting',
      resource_type: 'meeting',
      resource_id: parsed.data.meeting_id,
      metadata: {
        task_count: validation.data.tasks.length,
        overall_hours: validation.data.overall_estimated_hours,
        cost_micro_usd: result.usage.costMicroUsd,
        ai_job_id: result.jobId,
      },
    });

    return NextResponse.json({
      meeting: {
        id: meetingRow.id,
        deal_id: meetingRow.deal_id,
        deal_title: meetingRow.deal_title,
      },
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
