import { NextResponse } from 'next/server';
import { eq, and, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { auth } from '@/auth';
import { db, logAudit, setTenantContext } from '@/lib/db';
import { meetings, deals, customers } from '@/db/schema';
import { callJson, AiError } from '@/lib/ai';

/**
 * POST /api/ai/generate-requirement
 *
 * 議事録から要件定義を生成する。
 * tripot 思想フロー：録音 → 文字起こし → 議事録整形 → ニーズ抽出 →
 *   ★ 要件定義生成（本 route）★ → 提案 → 見積 → 受注 → 制作 → 請求
 *
 * 旧 system/app/api/deals/ai/route.ts の generate-requirement アクションが
 * app-v2 移植時に脱落していたため復活。隊長指摘 (2026-05-20)
 * 「議事録から要件定義が生まれる。ニーズやウォンツがでるようにするのよ」を実装。
 *
 * 入力：meeting_id（議事録 1 件）
 * 出力：構造化された要件定義（overview, functional, non_functional, out_of_scope, questions, next_actions）
 * 保存：DB には書かず、フロントの modal で表示 → 「提案書を作成」ボタンで proposals に展開
 */

const requestSchema = z.object({
  meeting_id: z.string().uuid(),
});

const itemSchema = z.object({
  category: z.string().min(1).max(80),
  items: z.array(z.string().min(1).max(300)).min(1).max(15),
});

const aiResponseSchema = z.object({
  title: z.string().min(1).max(120),
  overview: z.string().min(1).max(800),
  functional_requirements: z.array(itemSchema).min(1).max(8),
  non_functional_requirements: z.array(itemSchema).max(8),
  out_of_scope: z.array(z.string().min(1).max(200)).max(10),
  open_questions: z.array(z.string().min(1).max(200)).max(10),
  next_actions: z.array(z.string().min(1).max(200)).min(1).max(8),
});

const SCHEMA_PROMPT = `Return JSON like:
{
  "title": "○○システム開発 要件定義書 v0.1",
  "overview": "全体概要（背景・目的・対象範囲、800字以内）",
  "functional_requirements": [
    {
      "category": "ユーザー管理",
      "items": ["管理者がユーザーを招待できる", "ロール（admin/member）を設定できる"]
    }
  ],
  "non_functional_requirements": [
    {
      "category": "性能・可用性",
      "items": ["同時接続100ユーザー", "稼働率99.5%"]
    }
  ],
  "out_of_scope": ["決済機能は対象外", "モバイルアプリは別案件"],
  "open_questions": ["既存システムとのデータ移行範囲は？", "想定ユーザー数は？"],
  "next_actions": ["先方に open_questions を確認", "技術検証 PoC の要否判断"]
}`;

const SYSTEM_PROMPT = `あなたは IT 受託開発（tripot）のシニア要件定義者です。
顧客との商談議事録と抽出済ニーズから、開発チームと顧客の双方が読める「要件定義の叩き台」を作ります。

## 原則
- 議事録に書かれていない事は推測で書かない、ただし**業界標準で省略可能なものは補完**する（補完したものは out_of_scope か open_questions に明示）
- 顧客のニーズ（needs）は functional_requirements か non_functional_requirements に必ず反映
- 「とは」「目的」「ゴール」を overview の冒頭に置く
- ウォンツ（顧客が言ったが必須か微妙なもの）は out_of_scope or open_questions に分類
- next_actions は今すぐ営業がやるべきことを 3〜5 件

## カテゴリ例
- functional: ユーザー管理 / コンテンツ管理 / 検索 / 通知 / 帳票 / 連携（API/CSV）/ 認証
- non_functional: 性能 / 可用性 / セキュリティ / 運用 / 保守

## 出力規律
- JSON のみ、markdown 禁止
- 各 item は具体的に（× 「ログイン機能」、○ 「メールアドレス + パスワードでログイン、Google OAuth 連携」）
- overview は 800 字以内、それ以上は分割せず要約する`;

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
        message: '議事録の本文が空のため要件定義を生成できません。先に「要約」を実行するか、本文を入力してください',
      },
      { status: 422 }
    );
  }

  const needsArray = Array.isArray(meetingRow.needs) ? (meetingRow.needs as unknown[]) : [];
  const needsDigest = needsArray
    .slice(0, 15)
    .map((n, idx) => {
      if (typeof n === 'object' && n !== null) {
        const obj = n as Record<string, unknown>;
        const tag = obj.tag ? `[${obj.tag}]` : '';
        const priority = obj.priority ? `(${obj.priority})` : '';
        return `${idx + 1}. ${tag}${priority} ${obj.context ?? obj.text ?? obj.summary ?? JSON.stringify(obj).slice(0, 200)}`;
      }
      return `${idx + 1}. ${String(n).slice(0, 200)}`;
    })
    .join('\n');

  const userPrompt = `案件: ${meetingRow.deal_title ?? '（未紐付）'}
顧客: ${meetingRow.customer_name ?? '—'}
会議種別: ${meetingRow.type}
日時: ${meetingRow.occurred_at.toISOString().slice(0, 10)}

## 議事録${meetingRow.summary ? '要約' : '本文'}
${sourceContent.slice(0, 6000)}

${
  needsDigest
    ? `## 抽出済みニーズ・ウォンツ（${needsArray.length}件）\n${needsDigest}`
    : ''
}

この議事録から、顧客と開発チームの双方が読める要件定義書の叩き台を作成してください。`;

  try {
    const result = await callJson<z.infer<typeof aiResponseSchema>>(
      {
        companyId: session.user.company_id,
        memberId: session.user.member_id,
        jobType: 'generate-requirement',
        dealId: meetingRow.deal_id ?? undefined,
      },
      {
        userPrompt,
        systemPrompt: SYSTEM_PROMPT,
        schema: SCHEMA_PROMPT,
        maxTokens: 4096,
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
      action: 'requirement.generate_from_meeting',
      resource_type: 'meeting',
      resource_id: parsed.data.meeting_id,
      metadata: {
        deal_id: meetingRow.deal_id,
        functional_count: validation.data.functional_requirements.length,
        non_functional_count: validation.data.non_functional_requirements.length,
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
