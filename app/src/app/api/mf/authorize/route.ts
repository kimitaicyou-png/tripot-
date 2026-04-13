import { NextResponse } from 'next/server';

export async function GET() {
  const clientId = process.env.MF_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: 'MF_CLIENT_ID未設定' }, { status: 500 });
  }

  const baseUrl = process.env.NEXTAUTH_URL
    ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : null)
    ?? 'http://localhost:3100';
  const redirectUri = `${baseUrl}/api/mf/callback`;

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'mfc/invoice/data.read',
  });

  return NextResponse.redirect(`https://api.biz.moneyforward.com/authorize?${params.toString()}`);
}
