import { NextRequest, NextResponse } from 'next/server';
import { auth, type UserRole } from '@/auth';
import { getDb } from '@/lib/db';

type MemberRow = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  invited_by: string | null;
  invited_at: string | null;
};

async function getCallerRole(): Promise<{ role: UserRole | null; memberId: string | null }> {
  try {
    const session = await auth();
    if (!session?.user?.email) return { role: null, memberId: null };
    const sql = getDb();
    const rows = await sql`SELECT id, role FROM members WHERE email = ${session.user.email} LIMIT 1`;
    if (rows.length === 0) return { role: null, memberId: null };
    return { role: rows[0].role as UserRole, memberId: rows[0].id };
  } catch {
    return { role: null, memberId: null };
  }
}

export async function GET() {
  const sql = getDb();
  const rows = await sql`SELECT id, email, name, role, invited_by, invited_at, status FROM members ORDER BY created_at`;
  return NextResponse.json({ members: rows });
}

export async function POST(req: NextRequest) {
  const { role, memberId } = await getCallerRole();
  if (role !== 'owner') {
    return NextResponse.json({ error: 'owner権限が必要です' }, { status: 403 });
  }

  const body = await req.json() as { email: string; name: string; role: UserRole };
  if (!body.email || !body.name || !body.role) {
    return NextResponse.json({ error: 'email, name, role は必須です' }, { status: 400 });
  }

  const sql = getDb();
  const existing = await sql`SELECT id FROM members WHERE email = ${body.email}`;
  if (existing.length > 0) {
    return NextResponse.json({ error: 'このメールアドレスは既に登録されています' }, { status: 409 });
  }

  const id = body.name.split(' ')[0]?.toLowerCase() ?? `m${Date.now()}`;
  const invitedAt = new Date().toISOString().slice(0, 10);

  const rows = await sql`
    INSERT INTO members (id, email, name, role, invited_by, invited_at, status)
    VALUES (${id}, ${body.email}, ${body.name}, ${body.role}, ${memberId}, ${invitedAt}, 'pending')
    RETURNING id, email, name, role, invited_by, invited_at, status
  `;

  return NextResponse.json({ member: rows[0] });
}

export async function PUT(req: NextRequest) {
  const { role } = await getCallerRole();
  if (role !== 'owner') {
    return NextResponse.json({ error: 'owner権限が必要です' }, { status: 403 });
  }

  const body = await req.json() as { id: string; role?: UserRole; name?: string; email?: string; status?: string };
  if (!body.id) {
    return NextResponse.json({ error: 'id は必須です' }, { status: 400 });
  }

  const sql = getDb();
  const existing = await sql`SELECT id FROM members WHERE id = ${body.id}`;
  if (existing.length === 0) {
    return NextResponse.json({ error: 'メンバーが見つかりません' }, { status: 404 });
  }

  if (body.role) await sql`UPDATE members SET role = ${body.role} WHERE id = ${body.id}`;
  if (body.name) await sql`UPDATE members SET name = ${body.name} WHERE id = ${body.id}`;
  if (body.email) await sql`UPDATE members SET email = ${body.email} WHERE id = ${body.id}`;
  if (body.status) await sql`UPDATE members SET status = ${body.status} WHERE id = ${body.id}`;

  const rows = await sql`SELECT id, email, name, role, invited_by, invited_at, status FROM members WHERE id = ${body.id}`;
  return NextResponse.json({ member: rows[0] });
}

export async function DELETE(req: NextRequest) {
  const { role } = await getCallerRole();
  if (role !== 'owner') {
    return NextResponse.json({ error: 'owner権限が必要です' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'id は必須です' }, { status: 400 });
  }

  const sql = getDb();
  const target = await sql`SELECT id, role FROM members WHERE id = ${id}`;
  if (target.length === 0) {
    return NextResponse.json({ error: 'メンバーが見つかりません' }, { status: 404 });
  }

  if (target[0].role === 'owner') {
    const owners = await sql`SELECT count(*) as cnt FROM members WHERE role = 'owner'`;
    if (Number(owners[0].cnt) <= 1) {
      return NextResponse.json({ error: 'ownerは最低1人必要です' }, { status: 400 });
    }
  }

  await sql`DELETE FROM members WHERE id = ${id}`;
  return NextResponse.json({ deleted: id });
}
