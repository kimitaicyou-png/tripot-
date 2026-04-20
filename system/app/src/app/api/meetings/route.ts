import { requireAuth, isAuthError } from '@/lib/apiAuth';
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(req: NextRequest) {
  const authResult = await requireAuth(); if (isAuthError(authResult)) return authResult;
  const dealId = new URL(req.url).searchParams.get('dealId');
  const sql = getDb();
  const rows = dealId
    ? await sql`SELECT * FROM meetings WHERE deal_id = ${dealId} ORDER BY created_at DESC`
    : await sql`SELECT * FROM meetings ORDER BY created_at DESC LIMIT 100`;
  return NextResponse.json({ meetings: rows });
}

export async function POST(req: NextRequest) {
  const authResult = await requireAuth(); if (isAuthError(authResult)) return authResult;
  const body = await req.json();
  const sql = getDb();
  const id = body.id || `m_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

  const existing = await sql`SELECT id FROM meetings WHERE id = ${id}`;
  if (existing.length > 0) return NextResponse.json({ id, skipped: true });

  await sql`
    INSERT INTO meetings (id, deal_id, date, type, title, summary, needs)
    VALUES (
      ${id},
      ${body.deal_id ?? body.dealId ?? ''},
      ${body.date ?? new Date().toISOString().slice(0, 10)},
      ${body.type ?? 'meeting'},
      ${body.title ?? ''},
      ${body.summary ?? ''},
      ${JSON.stringify(body.needs ?? [])}
    )
  `;
  return NextResponse.json({ id });
}
