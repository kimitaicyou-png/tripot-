import { NextResponse } from 'next/server';
import { eq, and, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { auth } from '@/auth';
import { db, logAudit, setTenantContext } from '@/lib/db';
import { meetings, deals, customers } from '@/db/schema';
import { callJson, AiError } from '@/lib/ai';

/**
 * POST /api/ai/generate-sitemap
 *
 * 議事録 + ニーズから Web サイト / アプリのサイトマップを Markdown 階層リストで生成。
 *
 * 旧 system/app/api/production/ai/route.ts の generate-sitemap アクションを
 * app-v2 構造で復活（セバス指摘 MEDIUM の機能脱落 4 件の最後の 1 つ）。
 *
 * tripot 受託開発フロー：
 *   要件定義 → ★ サイトマップ生成 ★ → 画面遷移 → デザイン → 実装
 * 顧客との合意形成に使う中間成果物。提案書の素材にもなる。
 *
 * 出力：階層リスト形式（- TopPage, -- About, --- ... 等）+ 各ページの目的コメント
 */

const requestSchema = z.object({
  meeting_id: z.string().uuid(),
});

const pageSchema = z.object({
  path: z.string().min(1).max(100),
  title: z.string().min(1).max(80),
  purpose: z.string().min(1).max(200),
  depth: z.number().int().min(0).max(5),
  parent: z.string().nullable().optional(),
});

const aiResponseSchema = z.object({
  project_type: z.enum(['website', 'webapp', 'mobile_app', 'lp', 'other']),
  total_pages: z.number().int().min(1).max(60),
  pages: z.array(pageSchema).min(1).max(60),
  notes: z.string().max(400).optional(),
});

const SCHEMA_PROMPT = `Return JSON like:
{
  "project_type": "website",
  "total_pages": 8,
  "pages": [
    { "path": "/", "title": "トップ", "purpose": "サービス概要と CV 導線", "depth": 0, "parent": null },
    { "path": "/about", "title": "会社概要", "purpose": "信頼性訴求、企業情報", "depth": 1, "parent": "/" },
    { "path": "/about/team", "title": "メンバー", "purpose": "顔の見える組織", "depth": 2, "parent": "/about" },
    { "path": "/services", "title": "サービス", "purpose": "サービス一覧、各詳細への導線", "depth": 1, "parent": "/" }
  ],
  "notes": "BtoB なので会社概要を厚く、ブログは Phase 2 で別構築推奨"
}`;

const SYSTEM_PROMPT = `あなたは Web サイト / アプリの情報設計者（IA）です。
議事録と顧客ニーズから、受託開発の最初の合意形成に使えるサイトマップを設計します。

## 原則
- 議事録に明示された機能要望を優先、推測で勝手にページを増やさない
- 標準的な web サイト構造（top / about / services / contact 等）を踏まえる
- depth は 0=トップ、1=メインカテゴリ、2 以降はサブ
- path は kebab-case、日本語 path は禁止（/services/web-design は OK、/サービス は NG）
- title は日本語で 30 字以内、purpose は 100 字以内
- pages は 5〜30 が一般的、超えるなら notes で警告

## project_type 判定
- website：会社サイト / コーポレート / メディア
- webapp：ログイン後の管理画面 / SaaS
- mobile_app：iOS / Android アプリ
- lp：ランディング 1 枚もの
- other：上記以外

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
        message:
          '議事録の本文が空のためサイトマップを生成できません。先に「要約」を実行するか、本文を入力してください',
      },
      { status: 422 }
    );
  }

  const needsArray = Array.isArray(meetingRow.needs) ? (meetingRow.needs as unknown[]) : [];
  const needsDigest = needsArray
    .slice(0, 12)
    .map((n, idx) => {
      if (typeof n === 'object' && n !== null) {
        const obj = n as Record<string, unknown>;
        return `${idx + 1}. ${obj.context ?? obj.text ?? obj.summary ?? JSON.stringify(obj).slice(0, 200)}`;
      }
      return `${idx + 1}. ${String(n).slice(0, 200)}`;
    })
    .join('\n');

  const userPrompt = `案件: ${meetingRow.deal_title ?? '（未紐付）'}
顧客: ${meetingRow.customer_name ?? '—'}
会議種別: ${meetingRow.type}
日時: ${meetingRow.occurred_at.toISOString().slice(0, 10)}

## 議事録${meetingRow.summary ? '要約' : '本文'}
${sourceContent.slice(0, 5000)}

${needsDigest ? `## 抽出済みニーズ\n${needsDigest}` : ''}

この議事録から、顧客との合意形成に使えるサイトマップを設計してください。`;

  try {
    const result = await callJson<z.infer<typeof aiResponseSchema>>(
      {
        companyId: session.user.company_id,
        memberId: session.user.member_id,
        jobType: 'generate-sitemap',
        dealId: meetingRow.deal_id ?? undefined,
      },
      {
        userPrompt,
        systemPrompt: SYSTEM_PROMPT,
        schema: SCHEMA_PROMPT,
        maxTokens: 3072,
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

    await logAudit({
      member_id: session.user.member_id,
      company_id: session.user.company_id,
      action: 'sitemap.generate_from_meeting',
      resource_type: 'meeting',
      resource_id: parsed.data.meeting_id,
      metadata: {
        deal_id: meetingRow.deal_id,
        project_type: validation.data.project_type,
        page_count: validation.data.pages.length,
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
