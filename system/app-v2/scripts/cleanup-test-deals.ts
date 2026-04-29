import { neon } from '@neondatabase/serverless';

// 明らかにゴミ（amount=0、明確なテストデータ）のみ削除。
// A/B/C社の placeholder 案件は home/deals 数値に影響するため、
// 削除/rename/customer紐付けは隊長判断キュー（明朝確認）に置く。
const TEST_TITLES = [
  'テスト',
];

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL not set');

  const sql = neon(url);

  console.log('[cleanup] target titles:', TEST_TITLES);

  const matched = await sql`
    SELECT id, title, customer_id, stage, amount
    FROM deals
    WHERE title = ANY(${TEST_TITLES})
  `;

  console.log('[cleanup] matched deals:', matched.length);
  for (const d of matched) {
    console.log(`  - ${d.id} | ${d.title} | customer=${d.customer_id} | stage=${d.stage} | ¥${d.amount}`);
  }

  if (matched.length === 0) {
    console.log('[cleanup] nothing to delete');
    return;
  }

  const dealIds = matched.map((d) => d.id);

  const dryRun = process.argv.includes('--dry-run');
  if (dryRun) {
    console.log('[cleanup] DRY RUN — no deletion performed');
    return;
  }

  console.log('[cleanup] deleting child rows...');

  // Each table that may FK-link to deals.id
  await sql`DELETE FROM actions WHERE deal_id = ANY(${dealIds})`;
  await sql`DELETE FROM tasks WHERE deal_id = ANY(${dealIds})`;
  await sql`DELETE FROM meetings WHERE deal_id = ANY(${dealIds})`;
  await sql`DELETE FROM proposals WHERE deal_id = ANY(${dealIds})`;
  await sql`DELETE FROM estimates WHERE deal_id = ANY(${dealIds})`;
  await sql`DELETE FROM invoices WHERE deal_id = ANY(${dealIds})`;

  const deleted = await sql`
    DELETE FROM deals
    WHERE id = ANY(${dealIds})
    RETURNING id, title
  `;

  console.log('[cleanup] deleted deals:', deleted.length);
  for (const d of deleted) {
    console.log(`  ✓ ${d.id} | ${d.title}`);
  }

  console.log('[cleanup] DONE');
}

main().catch((e) => {
  console.error('[cleanup] error:', e);
  process.exit(1);
});
