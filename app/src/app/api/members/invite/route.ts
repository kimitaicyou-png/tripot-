import { requireAuth, isAuthError } from '@/lib/apiAuth';
import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

export async function POST(req: NextRequest) {
  const authResult = await requireAuth(); if (isAuthError(authResult)) return authResult;
  const body = await req.json() as { email: string; name: string; inviterName: string };
  const { email, name, inviterName } = body;

  if (!email || !name) {
    return NextResponse.json({ error: 'email と name は必須です' }, { status: 400 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'メール送信が設定されていません（RESEND_API_KEY未設定）' }, { status: 500 });
  }

  const baseUrl = process.env.NEXTAUTH_URL
    ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : null)
    ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null)
    ?? 'http://localhost:3100';
  const loginUrl = `${baseUrl}/login`;

  const resend = new Resend(apiKey);

  try {
    const { data, error } = await resend.emails.send({
      from: 'トライポット業務システム <onboarding@resend.dev>',
      to: email,
      subject: `【トライポット】${inviterName}さんからの招待`,
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #1e293b; font-size: 18px;">${name}さん、こんにちは！</h2>
          <p style="color: #475569; line-height: 1.7;">
            ${inviterName}さんから<strong>トライポット業務システム</strong>への招待が届きました。
          </p>
          <p style="color: #475569; line-height: 1.7;">
            以下のボタンからGoogleアカウント（<strong>${email}</strong>）でログインしてください。
          </p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${loginUrl}" style="display: inline-block; background: #2563eb; color: #fff; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-weight: 600; font-size: 15px;">
              ログインする
            </a>
          </div>
          <p style="color: #94a3b8; font-size: 12px; margin-top: 32px; border-top: 1px solid #e2e8f0; padding-top: 16px;">
            トライポット株式会社 | Coaris AI 経営管理システム
          </p>
        </div>
      `,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ sent: true, messageId: data?.id });
  } catch (e) {
    return NextResponse.json({ error: 'メール送信に失敗しました' }, { status: 500 });
  }
}
