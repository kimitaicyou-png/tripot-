import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

function rowToCard(r: Record<string, unknown>) {
  const extra = (r.extra ?? {}) as Record<string, unknown>;
  return {
    id: r.id,
    dealId: r.deal_id,
    dealName: r.deal_name,
    clientName: r.client_name,
    status: r.status,
    phase: r.phase,
    assigneeId: r.assignee_id,
    startDate: r.start_date,
    endDate: r.end_date,
    tasks: r.tasks ?? [],
    milestones: r.milestones ?? [],
    risk: r.risk,
    memo: r.memo,
    ...extra,
  };
}

function cardToExtra(body: Record<string, unknown>): Record<string, unknown> {
  const coreKeys = new Set(['id', 'dealId', 'dealName', 'clientName', 'status', 'phase', 'assigneeId', 'startDate', 'endDate', 'tasks', 'milestones', 'risk', 'memo']);
  const extra: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body)) {
    if (!coreKeys.has(key) && value !== undefined) {
      extra[key] = value;
    }
  }
  return extra;
}

export async function GET() {
  const sql = getDb();
  const rows = await sql`SELECT * FROM production_cards ORDER BY created_at DESC`;
  return NextResponse.json({ cards: rows.map(rowToCard) });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const sql = getDb();
  const id = body.id || `pc_${Date.now()}`;

  const existing = await sql`SELECT id FROM production_cards WHERE id = ${id}`;
  if (existing.length > 0) {
    return NextResponse.json({ id, skipped: true });
  }

  const extra = cardToExtra(body);

  await sql`
    INSERT INTO production_cards (id, deal_id, deal_name, client_name, status, phase, assignee_id, start_date, end_date, tasks, milestones, risk, memo, extra)
    VALUES (
      ${id},
      ${body.dealId ?? ''},
      ${body.dealName ?? ''},
      ${body.clientName ?? ''},
      ${body.status ?? 'active'},
      ${body.phase ?? 'kickoff'},
      ${body.assigneeId ?? ''},
      ${body.startDate ?? ''},
      ${body.endDate ?? ''},
      ${JSON.stringify(body.tasks ?? [])},
      ${JSON.stringify(body.milestones ?? [])},
      ${body.risk ?? 'none'},
      ${body.memo ?? ''},
      ${JSON.stringify(extra)}
    )
  `;

  return NextResponse.json({ id });
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  if (!body.id) return NextResponse.json({ error: 'id必須' }, { status: 400 });

  const sql = getDb();
  const existing = await sql`SELECT * FROM production_cards WHERE id = ${body.id}`;
  if (existing.length === 0) return NextResponse.json({ error: 'カードが見つかりません' }, { status: 404 });

  const cur = existing[0];
  const now = new Date().toISOString();
  const curExtra = (cur.extra ?? {}) as Record<string, unknown>;
  const newExtra = { ...curExtra, ...cardToExtra(body) };

  await sql`
    UPDATE production_cards SET
      deal_name = ${body.dealName ?? cur.deal_name},
      client_name = ${body.clientName ?? cur.client_name},
      status = ${body.status ?? cur.status},
      phase = ${body.phase ?? cur.phase},
      assignee_id = ${body.assigneeId ?? cur.assignee_id},
      start_date = ${body.startDate ?? cur.start_date},
      end_date = ${body.endDate ?? cur.end_date},
      tasks = ${JSON.stringify(body.tasks ?? cur.tasks)},
      milestones = ${JSON.stringify(body.milestones ?? cur.milestones)},
      risk = ${body.risk ?? cur.risk},
      memo = ${body.memo ?? cur.memo},
      extra = ${JSON.stringify(newExtra)},
      updated_at = ${now}
    WHERE id = ${body.id}
  `;

  return NextResponse.json({ updated: body.id });
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id必須' }, { status: 400 });

  const sql = getDb();
  await sql`DELETE FROM production_cards WHERE id = ${id}`;
  return NextResponse.json({ deleted: id });
}
