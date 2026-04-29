import { NextResponse } from 'next/server';

export async function GET() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const hasKey = Object.prototype.hasOwnProperty.call(process.env, 'ANTHROPIC_API_KEY');
  const keyLen = apiKey?.length ?? 0;
  const isEmpty = !apiKey;
  const envCount = Object.keys(process.env).length;
  const anthropicKeys = Object.keys(process.env).filter((k) => k.includes('ANTHROPIC'));
  const head = apiKey ? `${apiKey.substring(0, 7)}...` : null;

  return NextResponse.json({
    hasKey,
    keyLen,
    isEmpty,
    envCount,
    anthropicKeys,
    keyHead: head,
    note: 'TEMPORARY DEBUG - to be removed',
  });
}
