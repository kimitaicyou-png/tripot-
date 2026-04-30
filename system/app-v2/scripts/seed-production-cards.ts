import { neon } from '@neondatabase/serverless';

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL not set');

  const sql = neon(url);

  // 1. Get target deals: in_production / delivered / paid (受注後の案件)
  const deals = await sql`
    SELECT id, title, stage, company_id, amount, ordered_at, delivered_at
    FROM deals
    WHERE stage IN ('in_production', 'delivered', 'paid')
      AND deleted_at IS NULL
    ORDER BY stage, title
  `;

  console.log('[seed-prod] target deals:', deals.length);
  for (const d of deals) {
    console.log(`  - ${d.title} | stage=${d.stage} | ¥${d.amount}`);
  }

  // 2. Check existing production_cards
  const existing = await sql`SELECT deal_id, title FROM production_cards WHERE deleted_at IS NULL`;
  const existingDealIds = new Set(existing.map((c) => c.deal_id));
  console.log('[seed-prod] existing cards:', existing.length);

  // 3. Map deal stage → production status
  const statusMap: Record<string, string> = {
    in_production: 'building',
    delivered: 'delivered',
    paid: 'delivered',
  };

  const inserted: { id: string; title: string; status: string }[] = [];

  for (const d of deals) {
    if (existingDealIds.has(d.id)) {
      console.log(`  [skip] already has card: ${d.title}`);
      continue;
    }

    const status = statusMap[d.stage as string] ?? 'requirements';
    const startedAt = d.ordered_at;
    const deliveredAt = d.delivered_at;
    // Calc estimated/actual cost: 約 60% of deal amount as cost
    const estimatedCost = Math.round((d.amount ?? 0) * 0.6);
    const actualCost = status === 'delivered' ? Math.round(estimatedCost * 0.95) : Math.round(estimatedCost * 0.4);

    const result = await sql`
      INSERT INTO production_cards
        (company_id, deal_id, title, status, started_at, delivered_at, estimated_cost, actual_cost)
      VALUES
        (${d.company_id}, ${d.id}, ${d.title}, ${status}, ${startedAt}, ${deliveredAt}, ${estimatedCost}, ${actualCost})
      RETURNING id, title, status
    `;
    inserted.push(...(result as { id: string; title: string; status: string }[]));
    console.log(`  ✓ ${d.title} | status=${status} | est=¥${estimatedCost} actual=¥${actualCost}`);
  }

  console.log('[seed-prod] inserted:', inserted.length);
  console.log('[seed-prod] DONE');
}

main().catch((e) => {
  console.error('[seed-prod] error:', e);
  process.exit(1);
});
