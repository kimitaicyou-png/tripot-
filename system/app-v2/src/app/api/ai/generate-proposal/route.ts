import { NextResponse } from 'next/server';
import { eq, and, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { auth } from '@/auth';
import { db, logAudit } from '@/lib/db';
import { deals, customers, meetings, proposals } from '@/db/schema';
import { callJson, AiError } from '@/lib/ai';
import { sql } from 'drizzle-orm';

const requestSchema = z.object({
  deal_id: z.string().uuid(),
  meeting_ids: z.array(z.string().uuid()).optional(),
  notes: z.string().max(5000).optional(),
});

const slideSchema = z.object({
  id: z.string(),
  type: z.enum(['title', 'agenda', 'content', 'comparison', 'closing']),
  title: z.string(),
  subtitle: z.string().optional(),
  bullets: z.array(z.string()).optional(),
  items: z.array(z.string()).optional(),
  message: z.string().optional(),
});

const slidesArraySchema = z.array(slideSchema);
type Slide = z.infer<typeof slideSchema>;

const SLIDE_SCHEMA_PROMPT = `Each slide is one of:
{ id, type: "title", title, subtitle }
{ id, type: "agenda", title, items: string[] }
{ id, type: "content", title, bullets: string[] }
{ id, type: "comparison", title, bullets: string[] }
{ id, type: "closing", title, message }
Return an array of 12-15 slides covering: title -> agenda -> 顧客課題 -> 提案概要 -> 解決策 (3-5枚) -> 実装ステップ -> 体制 -> 費用感 -> リスク/前提 -> closing.`;

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
    return NextResponse.json(
      { error: 'invalid_request', details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { deal_id, meeting_ids, notes } = parsed.data;

  const dealRow = await db
    .select({
      id: deals.id,
      title: deals.title,
      stage: deals.stage,
      amount: deals.amount,
      revenue_type: deals.revenue_type,
      customer_name: customers.name,
    })
    .from(deals)
    .leftJoin(customers, eq(deals.customer_id, customers.id))
    .where(
      and(
        eq(deals.id, deal_id),
        eq(deals.company_id, session.user.company_id),
        isNull(deals.deleted_at)
      )
    )
    .limit(1)
    .then((rows) => rows[0]);

  if (!dealRow) {
    return NextResponse.json({ error: 'deal_not_found' }, { status: 404 });
  }

  const meetingRows = await db
    .select({
      title: meetings.title,
      summary: meetings.summary,
      raw_text: meetings.raw_text,
      occurred_at: meetings.occurred_at,
      type: meetings.type,
    })
    .from(meetings)
    .where(
      and(
        eq(meetings.deal_id, deal_id),
        eq(meetings.company_id, session.user.company_id),
        isNull(meetings.deleted_at)
      )
    );

  const meetingsForContext = meetingRows
    .filter((m) => !meeting_ids || meeting_ids.length === 0 || true)
    .slice(0, 10);

  const meetingDigest = meetingsForContext
    .map(
      (m, i) =>
        `## 議事録${i + 1} (${m.type}, ${m.occurred_at?.toISOString().slice(0, 10) ?? '日付不明'})\n` +
        (m.title ? `タイトル: ${m.title}\n` : '') +
        (m.summary ? `要約: ${m.summary}\n` : '') +
        (m.raw_text ? `本文: ${m.raw_text.slice(0, 2000)}` : '')
    )
    .join('\n\n');

  const userPrompt = `案件: ${dealRow.title}
顧客: ${dealRow.customer_name ?? '未設定'}
現ステージ: ${dealRow.stage}
受注予定金額: ¥${(dealRow.amount ?? 0).toLocaleString('ja-JP')}
収益タイプ: ${dealRow.revenue_type}

${meetingDigest ? `## これまでの議事録（${meetingsForContext.length}件）\n${meetingDigest}` : '議事録はまだありません。一般的な提案書を作ってください。'}

${notes ? `## 補足メモ\n${notes}` : ''}

上記をもとに、12-15枚の提案書スライドJSON配列を生成してください。日本語、ビジネスフォーマル、決裁者向け。`;

  const systemPrompt = `あなたはトライポット株式会社のシニアセールスエンジニア。提案書を作成します。
原則：
- 顧客の課題から始める
- 「なぜ我々が選ばれるべきか」を明確に
- 数字と根拠で語る、抽象論を避ける
- スライド1枚=1メッセージ
- 12-15枚で完結（だらだらしない）`;

  try {
    const result = await callJson<Slide[]>(
      {
        companyId: session.user.company_id,
        memberId: session.user.member_id,
        jobType: 'generate-proposal',
        dealId: deal_id,
      },
      {
        userPrompt,
        systemPrompt,
        schema: SLIDE_SCHEMA_PROMPT,
        maxTokens: 8192,
        temperature: 0.4,
      }
    );

    const slidesValidation = slidesArraySchema.safeParse(result.data);
    if (!slidesValidation.success) {
      return NextResponse.json(
        {
          error: 'ai_invalid_format',
          details: slidesValidation.error.flatten(),
          rawText: result.rawText.slice(0, 1000),
        },
        { status: 422 }
      );
    }

    const slides = slidesValidation.data;

    const [maxRow] = await db
      .select({ max: sql<number>`coalesce(max(${proposals.version}), 0)` })
      .from(proposals)
      .where(
        and(eq(proposals.deal_id, deal_id), eq(proposals.company_id, session.user.company_id))
      );
    const nextVersion = (maxRow?.max ?? 0) + 1;

    const [created] = await db
      .insert(proposals)
      .values({
        company_id: session.user.company_id,
        deal_id,
        version: nextVersion,
        title: `${dealRow.title} 提案書 v${nextVersion}`,
        status: 'draft',
        slides,
        created_by: session.user.member_id,
      })
      .returning({ id: proposals.id, version: proposals.version });

    await logAudit({
      member_id: session.user.member_id,
      company_id: session.user.company_id,
      action: 'proposal.ai_generate',
      resource_type: 'proposal',
      resource_id: created!.id,
      metadata: {
        deal_id,
        version: created!.version,
        slide_count: slides.length,
        cost_micro_usd: result.usage.costMicroUsd,
        ai_job_id: result.jobId,
      },
    });

    return NextResponse.json({
      proposal_id: created!.id,
      version: created!.version,
      slide_count: slides.length,
      slides,
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
