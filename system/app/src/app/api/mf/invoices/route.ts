import { requireAuth, isAuthError } from '@/lib/apiAuth';
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

async function getMfToken(): Promise<string | null> {
  const sql = getDb();
  const rows = await sql`SELECT access_token, refresh_token, expires_at FROM integrations WHERE id = 'mf_invoice'`;
  if (rows.length === 0) return null;

  const { access_token, refresh_token, expires_at } = rows[0];

  if (expires_at && new Date(expires_at as string) < new Date()) {
    if (!refresh_token) return null;
    const clientId = process.env.MF_CLIENT_ID!;
    const clientSecret = process.env.MF_CLIENT_SECRET!;
    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const res = await fetch('https://api.biz.moneyforward.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${basicAuth}`,
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refresh_token as string,
      }),
    });
    const data = await res.json();
    if (!data.access_token) return null;
    const newExpires = data.expires_in ? new Date(Date.now() + data.expires_in * 1000).toISOString() : null;
    await sql`
      UPDATE integrations SET access_token = ${data.access_token}, refresh_token = COALESCE(${data.refresh_token ?? null}, refresh_token), expires_at = ${newExpires}, updated_at = NOW()
      WHERE id = 'mf_invoice'
    `;
    return data.access_token;
  }

  return access_token as string;
}

export async function GET(req: NextRequest) {
  const authResult = await requireAuth(); if (isAuthError(authResult)) return authResult;
  const token = await getMfToken();
  if (!token) {
    return NextResponse.json({ error: 'MFクラウド未連携。設定画面から連携してください。', needsAuth: true }, { status: 401 });
  }

  const page = new URL(req.url).searchParams.get('page') ?? '1';
  const perPage = new URL(req.url).searchParams.get('per_page') ?? '100';

  const res = await fetch(`https://invoice.moneyforward.com/api/v3/billings?page=${page}&per_page=${perPage}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return NextResponse.json({ error: 'MFクラウドAPI エラー', detail: err }, { status: res.status });
  }

  const data = await res.json();
  return NextResponse.json(data);
}
