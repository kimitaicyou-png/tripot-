import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

type MfBilling = {
  id: string;
  title: string;
  partner_name: string;
  billing_date: string;
  due_date: string;
  total_amount: number;
  total_amount_with_tax: number;
  status: string;
  memo: string;
  items?: Array<{ name: string; quantity: number; unit_price: number; amount: number }>;
};

function billingToStage(status: string): string {
  switch (status) {
    case 'paid': return 'paid';
    case 'sent': return 'invoiced';
    case 'overdue': return 'invoiced';
    default: return 'ordered';
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json() as { billings: MfBilling[] };
  if (!body.billings || !Array.isArray(body.billings)) {
    return NextResponse.json({ error: 'billings配列が必要です' }, { status: 400 });
  }

  const sql = getDb();
  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const b of body.billings) {
    const dealId = `mf_${b.id}`;
    const existing = await sql`SELECT id FROM deals WHERE id = ${dealId}`;
    if (existing.length > 0) {
      skipped++;
      continue;
    }

    try {
      const stage = billingToStage(b.status);
      await sql`
        INSERT INTO deals (id, client_name, deal_name, industry, stage, amount, probability, assignee, last_date, memo, revenue_type, invoice_date, payment_due, paid_date)
        VALUES (
          ${dealId},
          ${b.partner_name ?? ''},
          ${b.title ?? `${b.partner_name} 請求書`},
          ${''},
          ${stage},
          ${b.total_amount_with_tax ?? b.total_amount ?? 0},
          ${stage === 'paid' ? 100 : 80},
          ${''},
          ${b.billing_date ?? ''},
          ${`MFクラウド請求書からインポート${b.memo ? ` / ${b.memo}` : ''}`},
          ${'shot'},
          ${b.billing_date ?? null},
          ${b.due_date ?? null},
          ${b.status === 'paid' ? b.billing_date : null}
        )
      `;
      imported++;
    } catch (e) {
      errors.push(`${b.title ?? b.id}: ${e instanceof Error ? e.message : '不明なエラー'}`);
    }
  }

  return NextResponse.json({ imported, skipped, errors, total: body.billings.length });
}
