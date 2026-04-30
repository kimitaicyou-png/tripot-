import { NextResponse } from 'next/server';
import { z } from 'zod';
import Anthropic from '@anthropic-ai/sdk';
import { auth } from '@/auth';
import { CHAT_TOOLS, executeToolCall } from '@/lib/ai/chat-tools';

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
  const toolCallLog: Array<{ name: string; input: unknown; ok: boolean }> = [];

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

      // Collect text blocks
      for (const block of response.content) {
        if (block.type === 'text') {
          finalText += block.text;
        }
      }

      if (response.stop_reason !== 'tool_use') {
        // 終端
        break;
      }

      // Tool use blocks → execute → return tool_result
      const toolUseBlocks = response.content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use'
      );

      // Append assistant message (with tool_use blocks)
      messages.push({ role: 'assistant', content: response.content });

      // Execute tools and build user message with tool_result blocks
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

    return NextResponse.json({
      reply: finalText.trim() || '回答が空でした。質問をもう一度お願いします。',
      iterations,
      tool_calls: toolCallLog,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error';
    return NextResponse.json(
      { error: 'ai_error', message, iterations, tool_calls: toolCallLog },
      { status: 502 }
    );
  }
}
