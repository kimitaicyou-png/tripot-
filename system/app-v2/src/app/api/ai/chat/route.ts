import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { callText, AiError } from '@/lib/ai';

const requestSchema = z.object({
  message: z.string().min(1).max(2000),
});

const SYSTEM_PROMPT = `あなたは tripot（IT受託開発会社）の営業支援AIアシスタント「コアリスAI」です。
回答は日本語、簡潔に、箇条書きや太字を活用して読みやすく。300字以内。
ユーザーは営業メンバーまたは経営者です。質問は売上・案件・顧客・行動・タスクに関するものが多いです。
具体的なデータが必要な質問には、現時点では DB 直接アクセスができないため「次回バージョンで実装予定」と一言添えて、考え方や一般論で答えてください。`;

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

  try {
    const result = await callText(
      {
        companyId: session.user.company_id,
        memberId: session.user.member_id,
        jobType: 'chat',
      },
      {
        systemPrompt: SYSTEM_PROMPT,
        userPrompt: parsed.data.message,
        maxTokens: 1024,
        temperature: 0.7,
      }
    );

    return NextResponse.json({
      reply: result.text,
      job_id: result.jobId,
    });
  } catch (err) {
    if (err instanceof AiError) {
      return NextResponse.json({ error: 'ai_error', message: err.message }, { status: 502 });
    }
    const message = err instanceof Error ? err.message : 'unknown error';
    return NextResponse.json({ error: 'internal_error', message }, { status: 500 });
  }
}
