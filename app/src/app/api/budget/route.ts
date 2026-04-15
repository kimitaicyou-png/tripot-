import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getDb } from '@/lib/db';

const COMPANY_ID = 'tripot';

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const sql = getDb();
  const rows = await sql`SELECT plan, fiscal_year, updated_at, updated_by FROM budget_plans WHERE company_id = ${COMPANY_ID} LIMIT 1`;
  if (rows.length === 0) {
    return NextResponse.json({ plan: null });
  }
  return NextResponse.json({
    plan: rows[0].plan,
    fiscalYear: rows[0].fiscal_year,
    updatedAt: rows[0].updated_at,
    updatedBy: rows[0].updated_by,
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const sql = getDb();
  const caller = await sql`SELECT id, role FROM members WHERE email = ${session.user.email} AND status = 'active' LIMIT 1`;
  if (caller.length === 0) {
    return NextResponse.json({ error: 'not a member' }, { status: 403 });
  }
  const role = caller[0].role;
  if (role !== 'owner' && role !== 'manager') {
    return NextResponse.json({ error: 'owner または manager 権限が必要です' }, { status: 403 });
  }

  const body = await req.json() as { plan: unknown; fiscalYear?: number };
  if (!body.plan || typeof body.plan !== 'object') {
    return NextResponse.json({ error: 'plan is required' }, { status: 400 });
  }

  await sql`
    INSERT INTO budget_plans (company_id, plan, fiscal_year, updated_at, updated_by)
    VALUES (${COMPANY_ID}, ${JSON.stringify(body.plan)}, ${body.fiscalYear ?? null}, NOW(), ${caller[0].id})
    ON CONFLICT (company_id) DO UPDATE SET
      plan = EXCLUDED.plan,
      fiscal_year = EXCLUDED.fiscal_year,
      updated_at = NOW(),
      updated_by = EXCLUDED.updated_by
  `;

  return NextResponse.json({ ok: true });
}
