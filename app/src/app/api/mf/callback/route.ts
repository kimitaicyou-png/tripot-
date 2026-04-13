import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(req: NextRequest) {
  const code = new URL(req.url).searchParams.get('code');
  if (!code) {
    return NextResponse.json({ error: '認可コードがありません' }, { status: 400 });
  }

  const clientId = process.env.MF_CLIENT_ID!;
  const clientSecret = process.env.MF_CLIENT_SECRET!;
  const baseUrl = process.env.NEXTAUTH_URL
    ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : null)
    ?? 'http://localhost:3100';
  const redirectUri = `${baseUrl}/api/mf/callback`;

  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const tokenRes = await fetch('https://invoice.moneyforward.com/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${basicAuth}`,
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    }),
  });

  const tokenData = await tokenRes.json();

  if (!tokenRes.ok || !tokenData.access_token) {
    return NextResponse.json({ error: 'トークン取得失敗', detail: tokenData }, { status: 500 });
  }

  const sql = getDb();
  const expiresAt = tokenData.expires_in
    ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
    : null;

  await sql`
    INSERT INTO integrations (id, provider, access_token, refresh_token, expires_at, scope)
    VALUES ('mf_invoice', 'moneyforward_invoice', ${tokenData.access_token}, ${tokenData.refresh_token ?? null}, ${expiresAt}, ${tokenData.scope ?? ''})
    ON CONFLICT (id) DO UPDATE SET
      access_token = ${tokenData.access_token},
      refresh_token = COALESCE(${tokenData.refresh_token ?? null}, integrations.refresh_token),
      expires_at = ${expiresAt},
      updated_at = NOW()
  `;

  return NextResponse.redirect(`${baseUrl}/settings?tab=company&mf=connected`);
}
