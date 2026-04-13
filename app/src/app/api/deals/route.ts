import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

function rowToDeal(r: Record<string, unknown>) {
  return {
    id: r.id,
    clientName: r.client_name,
    dealName: r.deal_name,
    industry: r.industry,
    stage: r.stage,
    amount: r.amount,
    probability: r.probability,
    assignee: r.assignee,
    lastDate: r.last_date,
    memo: r.memo,
    revenueType: r.revenue_type,
    monthlyAmount: r.monthly_amount,
    runningStartDate: r.running_start_date,
    progress: r.progress,
    invoiceDate: r.invoice_date,
    paymentDue: r.payment_due,
    paidDate: r.paid_date,
    invoice: r.invoice ?? {},
    history: r.history ?? [],
    attachments: r.attachments ?? [],
    process: r.process ?? {},
  };
}

export async function GET() {
  const sql = getDb();
  const rows = await sql`SELECT * FROM deals ORDER BY updated_at DESC`;
  return NextResponse.json({ deals: rows.map(rowToDeal) });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const sql = getDb();
  const id = body.id || `d${Date.now()}`;
  const now = new Date().toISOString();

  const existing = await sql`SELECT id FROM deals WHERE id = ${id}`;
  if (existing.length > 0) {
    return NextResponse.json({ id, skipped: true });
  }

  await sql`
    INSERT INTO deals (id, client_name, deal_name, industry, stage, amount, probability, assignee, last_date, memo, revenue_type, monthly_amount, running_start_date, progress, invoice_date, payment_due, paid_date, invoice, history, attachments, process, updated_at)
    VALUES (
      ${id},
      ${body.clientName ?? ''},
      ${body.dealName ?? ''},
      ${body.industry ?? ''},
      ${body.stage ?? 'lead'},
      ${body.amount ?? 0},
      ${body.probability ?? 50},
      ${body.assignee ?? ''},
      ${body.lastDate ?? now.slice(0, 10)},
      ${body.memo ?? ''},
      ${body.revenueType ?? 'shot'},
      ${body.monthlyAmount ?? 0},
      ${body.runningStartDate ?? null},
      ${body.progress ?? 0},
      ${body.invoiceDate ?? null},
      ${body.paymentDue ?? null},
      ${body.paidDate ?? null},
      ${JSON.stringify(body.invoice ?? {})},
      ${JSON.stringify(body.history ?? [])},
      ${JSON.stringify(body.attachments ?? [])},
      ${JSON.stringify(body.process ?? {})},
      ${now}
    )
  `;

  return NextResponse.json({ id });
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  if (!body.id) return NextResponse.json({ error: 'id必須' }, { status: 400 });

  const sql = getDb();
  const now = new Date().toISOString();

  const existing = await sql`SELECT * FROM deals WHERE id = ${body.id}`;
  if (existing.length === 0) return NextResponse.json({ error: '案件が見つかりません' }, { status: 404 });

  const cur = existing[0];

  await sql`
    UPDATE deals SET
      client_name = ${body.clientName ?? cur.client_name},
      deal_name = ${body.dealName ?? cur.deal_name},
      industry = ${body.industry ?? cur.industry},
      stage = ${body.stage ?? cur.stage},
      amount = ${body.amount ?? cur.amount},
      probability = ${body.probability ?? cur.probability},
      assignee = ${body.assignee ?? cur.assignee},
      last_date = ${body.lastDate ?? cur.last_date},
      memo = ${body.memo ?? cur.memo},
      revenue_type = ${body.revenueType ?? cur.revenue_type},
      monthly_amount = ${body.monthlyAmount ?? cur.monthly_amount},
      progress = ${body.progress ?? cur.progress},
      invoice_date = ${body.invoiceDate ?? cur.invoice_date},
      payment_due = ${body.paymentDue ?? cur.payment_due},
      paid_date = ${body.paidDate ?? cur.paid_date},
      invoice = ${JSON.stringify(body.invoice ?? cur.invoice)},
      history = ${JSON.stringify(body.history ?? cur.history)},
      attachments = ${JSON.stringify(body.attachments ?? cur.attachments)},
      process = ${JSON.stringify(body.process ?? cur.process)},
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
  await sql`DELETE FROM deals WHERE id = ${id}`;
  return NextResponse.json({ deleted: id });
}
