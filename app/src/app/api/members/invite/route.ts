import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const body = await req.json() as { email: string; name: string; inviterName: string };
  const { email, name, inviterName } = body;

  if (!email || !name) {
    return NextResponse.json({ error: 'email と name は必須です' }, { status: 400 });
  }

  const loginUrl = process.env.NEXTAUTH_URL ?? process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}/login`
    : 'http://localhost:3100/login';

  const subject = `【トライポット】${inviterName}さんからの招待`;
  const body_text = `${name}さん

${inviterName}さんからトライポット業務システムへの招待が届きました。

以下のリンクからGoogleアカウント（${email}）でログインしてください。

${loginUrl}

トライポット株式会社
Coaris AI 経営管理システム`;

  const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body_text)}`;

  return NextResponse.json({ gmailUrl });
}
