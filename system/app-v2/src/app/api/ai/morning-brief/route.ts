import { NextResponse } from 'next/server';
import { eq, and, isNull, gte, sql, desc } from 'drizzle-orm';
import { z } from 'zod';
import { auth } from '@/auth';
import { db, logAudit } from '@/lib/db';
import { deals, tasks, actions, members, customers } from '@/db/schema';
import { callJson, AiError } from '@/lib/ai';

const requestSchema = z.object({
  member_id: z.string().uuid().optional(),
});

const briefSchema = z.object({
  focus: z
    .array(
      z.object({
        title: z.string(),
        why: z.string(),
        suggested_action: z.string(),
        deal_id: z.string().nullable().optional(),
      })
    )
    .max(3),
  alerts: z
    .array(
      z.object({
        severity: z.enum(['info', 'warning', 'critical']),
        message: z.string(),
      })
    )
    .max(3),
  message: z.string().max(200),
});

type Brief = z.infer<typeof briefSchema>;

const SCHEMA_PROMPT = `Return JSON like:
{
  "focus": [
    { "title": "案件名やテーマ", "why": "なぜ今日重要か(1文)", "suggested_action": "今日やる具体的な行動(1文)", "deal_id": "uuid or null" }
  ],  // 最大3件、最重要から順に
  "alerts": [
    { "severity": "info" | "warning" | "critical", "message": "短い警告(1文)" }
  ],  // 最大3件、無ければ空配列
  "message": "今日のひとこと、隊長/メンバーへ語りかける口調で40文字以内"
}`;

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.member_id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: unknown = {};
  try {
    body = await request.json().catch(() => ({}));
  } catch {
    body = {};
  }
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  }

  const targetMemberId =
    parsed.data.member_id ??
    (session.user.role !== 'member' ? session.user.member_id : session.user.member_id);

  if (
    parsed.data.member_id &&
    parsed.data.member_id !== session.user.member_id &&
    session.user.role === 'member'
  ) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const companyId = session.user.company_id;
  const today = new Date();
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(today.getDate() - 7);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const memberRow = await db
    .select({ name: members.name, role: members.role })
    .from(members)
    .where(and(eq(members.id, targetMemberId), eq(members.company_id, companyId)))
    .limit(1)
    .then((rows) => rows[0]);

  if (!memberRow) {
    return NextResponse.json({ error: 'member_not_found' }, { status: 404 });
  }

  const [todoTasks, activeDeals, recentActions, stuckDeals] = await Promise.all([
    db
      .select({
        id: tasks.id,
        title: tasks.title,
        due_date: tasks.due_date,
        deal_id: tasks.deal_id,
      })
      .from(tasks)
      .where(
        and(
          eq(tasks.assignee_id, targetMemberId),
          eq(tasks.company_id, companyId),
          eq(tasks.status, 'todo'),
          isNull(tasks.deleted_at)
        )
      )
      .orderBy(tasks.due_date)
      .limit(10),
    db
      .select({
        id: deals.id,
        title: deals.title,
        stage: deals.stage,
        amount: deals.amount,
        expected_close_date: deals.expected_close_date,
        customer_name: customers.name,
      })
      .from(deals)
      .leftJoin(customers, eq(deals.customer_id, customers.id))
      .where(
        and(
          eq(deals.assignee_id, targetMemberId),
          eq(deals.company_id, companyId),
          isNull(deals.deleted_at),
          sql`${deals.stage} IN ('prospect', 'proposing', 'ordered', 'in_production')`
        )
      )
      .orderBy(desc(deals.amount))
      .limit(10),
    db
      .select({
        type: actions.type,
        n: sql<number>`count(*)::int`,
      })
      .from(actions)
      .where(
        and(
          eq(actions.member_id, targetMemberId),
          eq(actions.company_id, companyId),
          gte(actions.occurred_at, sevenDaysAgo)
        )
      )
      .groupBy(actions.type),
    db
      .select({
        id: deals.id,
        title: deals.title,
        stage: deals.stage,
        updated_at: deals.updated_at,
      })
      .from(deals)
      .where(
        and(
          eq(deals.assignee_id, targetMemberId),
          eq(deals.company_id, companyId),
          isNull(deals.deleted_at),
          sql`${deals.stage} IN ('proposing', 'ordered', 'in_production')`,
          sql`${deals.updated_at} < ${sevenDaysAgo}`
        )
      )
      .limit(5),
  ]);

  const taskDigest = todoTasks
    .map(
      (t) =>
        `- ${t.title}${t.due_date ? `（期限 ${t.due_date}）` : ''}${t.deal_id ? `（案件ID ${t.deal_id}）` : ''}`
    )
    .join('\n');
  const activeDigest = activeDeals
    .map(
      (d) =>
        `- ${d.title} / 顧客 ${d.customer_name ?? '未設定'} / ステージ ${d.stage} / 金額 ¥${(d.amount ?? 0).toLocaleString('ja-JP')}${d.expected_close_date ? ` / 受注予定 ${d.expected_close_date}` : ''}`
    )
    .join('\n');
  const actionDigest =
    recentActions.length > 0
      ? recentActions.map((a) => `${a.type}: ${a.n}件`).join(' / ')
      : 'まだ記録なし';
  const stuckDigest = stuckDeals
    .map((d) => `- ${d.title} (${d.stage} で 7日以上動いてない、最終更新 ${d.updated_at?.toISOString().slice(0, 10)})`)
    .join('\n');

  const userPrompt = `今日の日付: ${today.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  })}
メンバー: ${memberRow.name}（ロール: ${memberRow.role}）

## 残タスク（${todoTasks.length}件、期限順）
${taskDigest || '（なし）'}

## 進行中の案件（${activeDeals.length}件、金額順）
${activeDigest || '（なし）'}

## 直近7日の行動量
${actionDigest}

## 7日以上動いてない案件（要詰まり対処、${stuckDeals.length}件）
${stuckDigest || '（なし）'}

上記をもとに、今日の朝ブリーフィングを生成してください。`;

  const systemPrompt = `あなたは日本の中小企業向け経営管理SaaS "tripot v2" の朝ブリーフィングAIです。
原則:
- 「行動ベース経営」「未達OK・未決定NG」「3秒判断」をベースに
- 抽象論を避け、具体的な「今日やること」を出す
- 数字を必ず含める（金額・件数・期限）
- 警告は本当に重要なものだけ（多すぎると意味が薄れる）
- メッセージは語りかけ口調、応援する温かさを保つ
- 出力は厳密にJSON、不要な文を含めない`;

  try {
    const result = await callJson<Brief>(
      {
        companyId,
        memberId: session.user.member_id,
        jobType: 'morning-brief',
      },
      {
        userPrompt,
        systemPrompt,
        schema: SCHEMA_PROMPT,
        maxTokens: 2048,
        temperature: 0.5,
      }
    );

    const validation = briefSchema.safeParse(result.data);
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
      company_id: companyId,
      action: 'morning_brief.generate',
      resource_type: 'member',
      resource_id: targetMemberId,
      metadata: {
        focus_count: validation.data.focus.length,
        alert_count: validation.data.alerts.length,
        cost_micro_usd: result.usage.costMicroUsd,
        ai_job_id: result.jobId,
      },
    });

    return NextResponse.json({
      brief: validation.data,
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
