import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export async function GET() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const hasKey = Object.prototype.hasOwnProperty.call(process.env, 'ANTHROPIC_API_KEY');
  const keyLen = apiKey?.length ?? 0;

  if (!apiKey) {
    return NextResponse.json({ envOk: false, hasKey, keyLen, callOk: false });
  }

  try {
    const client = new Anthropic({ apiKey, timeout: 30_000 });
    const result = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 32,
      messages: [{ role: 'user', content: 'ping. respond with just "pong"' }],
    });
    const text = result.content
      .filter((b) => b.type === 'text')
      .map((b) => (b.type === 'text' ? b.text : ''))
      .join('');
    return NextResponse.json({
      envOk: true,
      hasKey,
      keyLen,
      callOk: true,
      response: text,
      note: 'TEMPORARY DEBUG - to be removed',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error';
    return NextResponse.json({ envOk: true, hasKey, keyLen, callOk: false, error: message });
  }
}
