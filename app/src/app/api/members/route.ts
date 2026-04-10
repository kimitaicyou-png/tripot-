import { NextRequest, NextResponse } from 'next/server';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { auth, type AllowedUser, type UserRole } from '@/auth';

const SRC_PATH = join(process.cwd(), 'src/data/members.json');
const TMP_PATH = '/tmp/tripot_members.json';

function loadMembers(): AllowedUser[] {
  try {
    try {
      const tmp = readFileSync(TMP_PATH, 'utf-8');
      return JSON.parse(tmp) as AllowedUser[];
    } catch {}
    const raw = readFileSync(SRC_PATH, 'utf-8');
    return JSON.parse(raw) as AllowedUser[];
  } catch {
    return [];
  }
}

function saveMembers(members: AllowedUser[]): void {
  const json = JSON.stringify(members, null, 2);
  try { writeFileSync(TMP_PATH, json, 'utf-8'); } catch {}
  try { writeFileSync(SRC_PATH, json, 'utf-8'); } catch {}
}

async function getCallerRole(): Promise<{ role: UserRole | null; memberId: string | null }> {
  try {
    const session = await auth();
    if (!session?.user?.email) return { role: null, memberId: null };
    const members = loadMembers();
    const me = members.find((m) => m.email === session.user!.email);
    return { role: me?.role ?? null, memberId: me?.id ?? null };
  } catch {
    return { role: null, memberId: null };
  }
}

export async function GET() {
  const members = loadMembers();
  return NextResponse.json({ members });
}

export async function POST(req: NextRequest) {
  const { role, memberId } = await getCallerRole();
  if (role !== 'owner') {
    return NextResponse.json({ error: 'owner権限が必要です' }, { status: 403 });
  }

  const body = await req.json() as {
    email: string;
    name: string;
    role: UserRole;
  };

  if (!body.email || !body.name || !body.role) {
    return NextResponse.json({ error: 'email, name, role は必須です' }, { status: 400 });
  }

  const members = loadMembers();
  if (members.find((m) => m.email === body.email)) {
    return NextResponse.json({ error: 'このメールアドレスは既に登録されています' }, { status: 409 });
  }

  const newMember: AllowedUser = {
    id: body.name.split(' ')[0]?.toLowerCase() ?? `m${Date.now()}`,
    email: body.email,
    name: body.name,
    role: body.role,
    invitedBy: memberId,
    invitedAt: new Date().toISOString().slice(0, 10),
  };

  members.push(newMember);
  saveMembers(members);

  return NextResponse.json({ member: newMember });
}

export async function PUT(req: NextRequest) {
  const { role } = await getCallerRole();
  if (role !== 'owner') {
    return NextResponse.json({ error: 'owner権限が必要です' }, { status: 403 });
  }

  const body = await req.json() as { id: string; role?: UserRole; name?: string; email?: string };
  if (!body.id) {
    return NextResponse.json({ error: 'id は必須です' }, { status: 400 });
  }

  const members = loadMembers();
  const idx = members.findIndex((m) => m.id === body.id);
  if (idx === -1) {
    return NextResponse.json({ error: 'メンバーが見つかりません' }, { status: 404 });
  }

  if (body.role) members[idx].role = body.role;
  if (body.name) members[idx].name = body.name;
  if (body.email) members[idx].email = body.email;
  saveMembers(members);

  return NextResponse.json({ member: members[idx] });
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

  const members = loadMembers();
  const target = members.find((m) => m.id === id);
  if (!target) {
    return NextResponse.json({ error: 'メンバーが見つかりません' }, { status: 404 });
  }
  if (target.role === 'owner' && members.filter((m) => m.role === 'owner').length <= 1) {
    return NextResponse.json({ error: 'ownerは最低1人必要です' }, { status: 400 });
  }

  const filtered = members.filter((m) => m.id !== id);
  saveMembers(filtered);

  return NextResponse.json({ deleted: id });
}
