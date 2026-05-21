import { NextResponse } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import Anthropic from '@anthropic-ai/sdk';
import { auth } from '@/auth';
import { db, logAudit, setTenantContext } from '@/lib/db';
import { ai_jobs, ai_usage } from '@/db/schema';
import { CHAT_TOOLS, executeToolCall } from '@/lib/ai/chat-tools';
import { calculateCost } from '@/lib/ai/cost';

const requestSchema = z.object({
  message: z.string().min(1).max(2000),
});

const SYSTEM_PROMPT = `あなたは tripot（IT受託開発会社）の営業支援AIアシスタント「コアリスAI」です。
回答は日本語、簡潔に、箇条書きや太字を活用して読みやすく。300字以内。
ユーザーは営業メンバーまたは経営者です。質問は売上・案件・顧客・行動・タスクに関するものが多いです。

利用可能なツール（必要なら使うこと）：
- query_deals_summary: 案件のステージ別集計
- query_revenue: 入金確定売上（this_month / last_month / all_time）
- query_recent_actions: 直近の行動量（電話・商談・提案）

データを使う質問は必ずツールで実数を取ってから答えること。
金額は「¥1,234,567」形式で表示。件数は「N件」。`;

const MODEL = 'claude-sonnet-4-6';
const MAX_TOKENS = 1024;
const MAX_ITERATIONS = 5;

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.member_id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  await setTenantContext(session.user.company_id);

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

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'config_error', message: 'ANTHROPIC_API_KEY is not set' },
      { status: 500 }
    );
  }

  const client = new Anthropic({ apiKey, timeout: 60_000 });

  // Tool use multi-turn loop
  const messages: Anthropic.MessageParam[] = [
    { role: 'user', content: parsed.data.message },
  ];

  let finalText = '';
  let iterations = 0;
  let totalTokensIn = 0;
  let totalTokensOut = 0;
  const toolCallLog: Array<{ name: string; input: unknown; ok: boolean }> = [];

  // ai_jobs に running 状態で 1 件作成、最後に成功/失敗で update
  // セバス指摘 (2026-05-20)「chat だけ lib/ai/client.ts を経由していない、
  // コスト記録と監査証跡が取れていない」への対応。tool use loop で client.ts の
  // 標準 callText/callJson に乗らないため、本 route 内で直接 ai_jobs/ai_usage を扱う。
  const [jobRow] = await db
    .insert(ai_jobs)
    .values({
      company_id: session.user.company_id,
      member_id: session.user.member_id,
      job_type: 'chat',
      provider: 'anthropic',
      model: MODEL,
      status: 'running',
      input: { message: parsed.data.message } as Record<string, unknown>,
      started_at: new Date(),
    })
    .returning({ id: ai_jobs.id });
  const jobId = jobRow!.id;

  try {
    while (iterations < MAX_ITERATIONS) {
      iterations += 1;
      const response = await client.messages.create({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: SYSTEM_PROMPT,
        tools: CHAT_TOOLS,
        messages,
      });

      // usage 累積（各 iteration 毎）
      totalTokensIn += response.usage.input_tokens;
      totalTokensOut += response.usage.output_tokens;

      // Collect text blocks
      for (const block of response.content) {
        if (block.type === 'text') {
          finalText += block.text;
        }
      }

      if (response.stop_reason !== 'tool_use') {
        break;
      }

      const toolUseBlocks = response.content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use'
      );

      messages.push({ role: 'assistant', content: response.content });

      const toolResultContent: Anthropic.ToolResultBlockParam[] = [];
      for (const tu of toolUseBlocks) {
        const result = await executeToolCall(
          tu.name,
          tu.input as Record<string, unknown>,
          session.user.company_id
        );
        toolCallLog.push({ name: tu.name, input: tu.input, ok: result.ok });
        toolResultContent.push({
          type: 'tool_result',
          tool_use_id: tu.id,
          content: JSON.stringify(result.data ?? { error: result.error }),
          is_error: !result.ok,
        });
      }

      messages.push({ role: 'user', content: toolResultContent });
    }

    if (!finalText && iterations >= MAX_ITERATIONS) {
      finalText = '回答生成に失敗しました（ツール呼出 上限到達）。質問を簡潔にしてもう一度お試しください。';
    }

    const reply = finalText.trim() || '回答が空でした。質問をもう一度お願いします。';
    const usage = calculateCost(MODEL, totalTokensIn, totalTokensOut);

    // ai_usage に集計済 1 件、ai_jobs を succeeded に更新、audit_logs に記録
    await Promise.all([
      db.insert(ai_usage).values({
        company_id: session.user.company_id,
        member_id: session.user.member_id,
        job_id: jobId,
        provider: 'anthropic',
        model: MODEL,
        tokens_in: usage.tokensIn,
        tokens_out: usage.tokensOut,
        cost_micro_usd: usage.costMicroUsd,
      }),
      db
        .update(ai_jobs)
        .set({
          status: 'succeeded',
          output: { reply, iterations, tool_calls: toolCallLog } as Record<string, unknown>,
          finished_at: new Date(),
        })
        .where(eq(ai_jobs.id, jobId)),
      logAudit({
        member_id: session.user.member_id,
        company_id: session.user.company_id,
        action: 'chat.completed',
        resource_type: 'ai_job',
        resource_id: jobId,
        metadata: {
          iterations,
          tool_call_count: toolCallLog.length,
          tokens_in: usage.tokensIn,
          tokens_out: usage.tokensOut,
          cost_micro_usd: usage.costMicroUsd,
        },
      }),
    ]);

    return NextResponse.json({
      reply,
      iterations,
      tool_calls: toolCallLog,
      usage,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error';
    // 失敗時も ai_jobs と audit_logs に記録、usage は集計分を残す
    await db
      .update(ai_jobs)
      .set({
        status: 'failed',
        output: null,
        error: message,
        finished_at: new Date(),
      })
      .where(eq(ai_jobs.id, jobId));
    if (totalTokensIn > 0 || totalTokensOut > 0) {
      const usage = calculateCost(MODEL, totalTokensIn, totalTokensOut);
      await db.insert(ai_usage).values({
        company_id: session.user.company_id,
        member_id: session.user.member_id,
        job_id: jobId,
        provider: 'anthropic',
        model: MODEL,
        tokens_in: usage.tokensIn,
        tokens_out: usage.tokensOut,
        cost_micro_usd: usage.costMicroUsd,
      });
    }
    return NextResponse.json(
      { error: 'ai_error', message, iterations, tool_calls: toolCallLog },
      { status: 502 }
    );
  }
}
