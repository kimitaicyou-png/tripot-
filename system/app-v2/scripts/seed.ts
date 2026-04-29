/**
 * tripot v2 初期データ投入スクリプト
 *
 * 使い方：
 *   npm run db:push     # schema を Neon に push（migrations 不要）
 *   tsx scripts/seed.ts # このスクリプトで初期データ投入
 *
 * 投入されるもの：
 * - companies: tripot（株式会社トライポット）
 * - members: 隊長（土岐公人 president）+ 小野ちゃん（小野隆士 hq_member）
 * - サンプル deals: 動作確認用に3件
 */

import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { eq } from 'drizzle-orm';
import * as schema from '../src/db/schema';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('❌ DATABASE_URL が未設定です');
  process.exit(1);
}

const client = neon(databaseUrl);
const db = drizzle({ client, schema, casing: 'snake_case' });

async function seed() {
  console.log('🌱 tripot v2 seed 開始...\n');

  // 1. company（既にあればスキップ）
  let tripot = await db
    .select()
    .from(schema.companies)
    .where(eq(schema.companies.id_slug, 'tripot'))
    .limit(1)
    .then((rows) => rows[0]);

  if (!tripot) {
    [tripot] = await db
      .insert(schema.companies)
      .values({
        id_slug: 'tripot',
        name: 'トライポット株式会社',
        legal_form: '株式会社',
        config: {
          primaryColor: 'bg-blue-600',
          industryType: 'IT',
          features: { moneyForward: true, csvImport: true, weeklyMeeting: true, monthlyMeeting: true, yearlyBudget: true, productionDashboard: true, customerCRM: true, approvalFlow: true, aiAssistant: true, auditLog: true },
        },
      })
      .returning();
    console.log(`✅ company 作成：${tripot!.name}`);
  } else {
    console.log(`✓ company 既存：${tripot.name}`);
  }

  if (!tripot) {
    console.error('❌ company 作成失敗');
    process.exit(1);
  }

  // 2. members
  const memberSeeds = [
    { email: 'k.toki@coaris.ai', name: '土岐 公人', role: 'president' as const, department: '代表' },
    { email: 'ono@coaris.ai', name: '小野 隆士', role: 'hq_member' as const, department: '本部' },
  ];

  for (const m of memberSeeds) {
    const existing = await db
      .select({ id: schema.members.id })
      .from(schema.members)
      .where(eq(schema.members.email, m.email))
      .limit(1)
      .then((rows) => rows[0]);

    if (!existing) {
      await db.insert(schema.members).values({
        company_id: tripot.id,
        ...m,
      });
      console.log(`✅ member 作成：${m.name} (${m.email})`);
    } else {
      console.log(`✓ member 既存：${m.name}`);
    }
  }

  // 3. サンプル案件（動作確認用、3件）
  const toki = await db
    .select({ id: schema.members.id })
    .from(schema.members)
    .where(eq(schema.members.email, 'k.toki@coaris.ai'))
    .limit(1)
    .then((rows) => rows[0]);

  if (toki) {
    const dealSeeds = [
      { title: 'A社向け 新サービス開発', stage: 'ordered' as const, amount: 5_000_000 },
      { title: 'B社 営業支援システム導入', stage: 'proposing' as const, amount: 3_000_000 },
      { title: 'C社 データ分析プラットフォーム', stage: 'paid' as const, amount: 8_000_000 },
    ];

    for (const d of dealSeeds) {
      const existing = await db
        .select({ id: schema.deals.id })
        .from(schema.deals)
        .where(eq(schema.deals.title, d.title))
        .limit(1)
        .then((rows) => rows[0]);

      if (!existing) {
        await db.insert(schema.deals).values({
          company_id: tripot.id,
          assignee_id: toki.id,
          ...d,
        });
        console.log(`✅ deal 作成：${d.title}`);
      }
    }
  }

  console.log('\n🎉 seed 完了！');
  console.log(`\n   coaris.ai/tripot にアクセス → k.toki@coaris.ai でログインできます`);
}

seed()
  .catch((err) => {
    console.error('❌ seed エラー：', err);
    process.exit(1);
  });
