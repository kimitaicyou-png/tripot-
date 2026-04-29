/**
 * tripot v2 デモ用拡充 seed スクリプト
 *
 * 5/2 D-day デモ用のリアルなデータを投入。
 * 既存 seed.ts (company + member 2 + deal 3) の上に追加で：
 * - メンバー +3
 * - 顧客 6社
 * - 案件 +7（stage バラバラ）
 * - 行動 50件（過去7日分）
 * - 議事録 5件
 * - 提案書 3件
 * - 見積 3件 + 請求書 2件
 * - タスク 10件
 * - 予算 2026年12ヶ月分
 *
 * 使い方：
 *   tsx scripts/seed-demo.ts
 *
 * 冪等性：既存データがあれば skip、再実行しても安全。
 */

import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { eq, and } from 'drizzle-orm';
import * as schema from '../src/db/schema';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('❌ DATABASE_URL が未設定です');
  process.exit(1);
}

const client = neon(databaseUrl);
const db = drizzle({ client, schema, casing: 'snake_case' });

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function hoursAgo(n: number): Date {
  const d = new Date();
  d.setHours(d.getHours() - n);
  return d;
}

async function seed() {
  console.log('🌱 tripot v2 demo seed 開始...\n');

  // 1. company を取得
  const tripot = await db
    .select()
    .from(schema.companies)
    .where(eq(schema.companies.id_slug, 'tripot'))
    .limit(1)
    .then((rows) => rows[0]);

  if (!tripot) {
    console.error('❌ company tripot が見つかりません。先に seed.ts を実行してください');
    process.exit(1);
  }
  console.log(`✓ company: ${tripot.name}`);

  // 2. メンバー追加
  const memberSeeds = [
    { email: 'tanifuji@coaris.ai', name: '谷藤 健太', role: 'hq_member' as const, department: '営業' },
    { email: 'kawazoe@coaris.ai', name: '川添 健', role: 'member' as const, department: '営業' },
    { email: 'kuriyama@coaris.ai', name: '栗山 顧問', role: 'hq_member' as const, department: '顧問' },
  ];

  for (const m of memberSeeds) {
    const existing = await db
      .select({ id: schema.members.id })
      .from(schema.members)
      .where(eq(schema.members.email, m.email))
      .limit(1)
      .then((rows) => rows[0]);
    if (!existing) {
      await db.insert(schema.members).values({ company_id: tripot.id, ...m });
      console.log(`  ✅ member: ${m.name}`);
    }
  }

  const allMembers = await db
    .select({ id: schema.members.id, email: schema.members.email, name: schema.members.name })
    .from(schema.members)
    .where(eq(schema.members.company_id, tripot.id));

  const toki = allMembers.find((m) => m.email === 'k.toki@coaris.ai')!;
  const ono = allMembers.find((m) => m.email === 'ono@coaris.ai')!;
  const tani = allMembers.find((m) => m.email === 'tanifuji@coaris.ai')!;
  const kawa = allMembers.find((m) => m.email === 'kawazoe@coaris.ai')!;

  // 3. 顧客 6社
  const customerSeeds = [
    { name: '株式会社 アクシス', contact_email: 'sato@axis-corp.example', contact_phone: '03-1234-5678' },
    { name: 'ベルウッド工業', contact_email: 'tanaka@bellwood.example', contact_phone: '06-2345-6789' },
    { name: 'コスモテック', contact_email: 'ito@cosmotech.example', contact_phone: '052-3456-7890' },
    { name: 'デルタ商事', contact_email: 'yamada@delta-shoji.example', contact_phone: '03-4567-8901' },
    { name: 'エイト・ファイナンス', contact_email: 'suzuki@eight-fin.example', contact_phone: '03-5678-9012' },
    { name: 'フロンティア物流', contact_email: 'takahashi@frontier-l.example', contact_phone: '045-6789-0123' },
  ];

  const customers: { id: string; name: string }[] = [];
  for (const c of customerSeeds) {
    const existing = await db
      .select({ id: schema.customers.id, name: schema.customers.name })
      .from(schema.customers)
      .where(and(eq(schema.customers.company_id, tripot.id), eq(schema.customers.name, c.name)))
      .limit(1)
      .then((rows) => rows[0]);
    if (existing) {
      customers.push(existing);
      continue;
    }
    const [created] = await db
      .insert(schema.customers)
      .values({ company_id: tripot.id, ...c })
      .returning({ id: schema.customers.id, name: schema.customers.name });
    customers.push(created!);
    console.log(`  ✅ customer: ${c.name}`);
  }

  // 4. 案件 +7（既存3件と合わせて 10件）
  const dealSeeds = [
    {
      title: 'アクシス CRM 導入支援',
      stage: 'prospect' as const,
      amount: 4_000_000,
      revenue_type: 'spot' as const,
      assignee_id: tani.id,
      customer_id: customers[0]!.id,
      expected_close_date: daysAgo(-30),
    },
    {
      title: 'ベルウッド 製造管理 PoC',
      stage: 'proposing' as const,
      amount: 6_500_000,
      revenue_type: 'spot' as const,
      assignee_id: ono.id,
      customer_id: customers[1]!.id,
      expected_close_date: daysAgo(-14),
    },
    {
      title: 'コスモテック AI 導入',
      stage: 'ordered' as const,
      amount: 9_800_000,
      revenue_type: 'spot' as const,
      assignee_id: toki.id,
      customer_id: customers[2]!.id,
      ordered_at: daysAgo(20),
    },
    {
      title: 'デルタ商事 在庫システム刷新',
      stage: 'in_production' as const,
      amount: 7_200_000,
      revenue_type: 'spot' as const,
      assignee_id: kawa.id,
      customer_id: customers[3]!.id,
      ordered_at: daysAgo(35),
    },
    {
      title: 'エイト・ファイナンス 月額保守',
      stage: 'paid' as const,
      amount: 1_200_000,
      monthly_amount: 100_000,
      revenue_type: 'running' as const,
      assignee_id: tani.id,
      customer_id: customers[4]!.id,
      ordered_at: daysAgo(60),
      paid_at: daysAgo(15),
    },
    {
      title: 'フロンティア物流 ダッシュボード',
      stage: 'delivered' as const,
      amount: 3_400_000,
      revenue_type: 'spot' as const,
      assignee_id: ono.id,
      customer_id: customers[5]!.id,
      ordered_at: daysAgo(45),
      delivered_at: daysAgo(5),
    },
    {
      title: 'アクシス 追加機能開発',
      stage: 'lost' as const,
      amount: 2_500_000,
      revenue_type: 'spot' as const,
      assignee_id: tani.id,
      customer_id: customers[0]!.id,
      metadata: { lost_reason: '価格', lost_competitor: '内製化', lost_at: daysAgo(10) },
    },
  ];

  const dealMap: Record<string, string> = {};
  for (const d of dealSeeds) {
    const existing = await db
      .select({ id: schema.deals.id })
      .from(schema.deals)
      .where(and(eq(schema.deals.company_id, tripot.id), eq(schema.deals.title, d.title)))
      .limit(1)
      .then((rows) => rows[0]);
    if (existing) {
      dealMap[d.title] = existing.id;
      continue;
    }
    const [created] = await db
      .insert(schema.deals)
      .values({ company_id: tripot.id, ...d })
      .returning({ id: schema.deals.id });
    dealMap[d.title] = created!.id;
    console.log(`  ✅ deal: ${d.title} (${d.stage})`);
  }

  // 既存 deal の id も取得
  const allDeals = await db
    .select({ id: schema.deals.id, title: schema.deals.title })
    .from(schema.deals)
    .where(eq(schema.deals.company_id, tripot.id));
  const dealsByTitle: Record<string, string> = Object.fromEntries(allDeals.map((d) => [d.title, d.id]));

  // 5. 行動 50件（過去7日分、メンバー別バラ）
  const actionTypes: Array<'call' | 'meeting' | 'proposal' | 'email' | 'visit' | 'other'> = [
    'call',
    'meeting',
    'proposal',
    'email',
    'visit',
    'other',
  ];
  const actionMembers = [toki, ono, tani, kawa];
  const actionDeals = Object.values(dealsByTitle);

  const existingActionsCount = await db
    .select({ id: schema.actions.id })
    .from(schema.actions)
    .where(eq(schema.actions.company_id, tripot.id))
    .then((rows) => rows.length);

  if (existingActionsCount < 30) {
    let inserted = 0;
    for (let i = 0; i < 50; i++) {
      const member = actionMembers[i % actionMembers.length]!;
      const type = actionTypes[Math.floor(Math.random() * actionTypes.length)]!;
      const deal_id = Math.random() > 0.3 ? actionDeals[Math.floor(Math.random() * actionDeals.length)] : null;
      const occurred_at = hoursAgo(Math.floor(Math.random() * 24 * 7));
      const notes: Record<typeof type, string[]> = {
        call: ['進捗確認の電話', '日程調整', '価格相談'],
        meeting: ['キックオフ商談', '提案 review', '受注後 PJ 開始'],
        proposal: ['提案書 v1 送付', '見積 3案作成'],
        email: ['御礼メール', '次回打ち合わせ調整', '資料送付'],
        visit: ['先方オフィス訪問', '現地ヒアリング', '工場見学'],
        other: ['社内 review', 'ドキュメント整理', '名刺整理'],
      };
      const noteOptions = notes[type];
      const note = noteOptions[Math.floor(Math.random() * noteOptions.length)]!;

      await db.insert(schema.actions).values({
        company_id: tripot.id,
        member_id: member.id,
        deal_id,
        type,
        note,
        occurred_at,
      });
      inserted++;
    }
    console.log(`  ✅ actions: ${inserted}件 投入`);
  } else {
    console.log(`  ✓ actions: 既に ${existingActionsCount}件あるため skip`);
  }

  // 6. 議事録 5件（needs/summary 入り）
  const meetingSeeds = [
    {
      deal: 'アクシス CRM 導入支援',
      member: tani,
      type: 'meeting' as const,
      title: '初回ヒアリング',
      raw_text: '現状の営業管理は Excel と Salesforce が混在。月次レポートに5日かかる。受注タイミングが見えない。',
      summary: '営業管理ツール混在、月次レポ作成に5日。受注予測の可視化を求めている。',
      needs: [
        { tag: '統合', priority: 'high', context: 'Excel/Salesforce 混在解消' },
        { tag: '時短', priority: 'medium', context: '月次レポ 5日→1日' },
      ],
    },
    {
      deal: 'ベルウッド 製造管理 PoC',
      member: ono,
      type: 'gmeet' as const,
      title: '提案書 review',
      raw_text: 'バグ管理の機能要件を確認。重要度4段階、ステータス4段階、QAテストケース管理を希望。',
      summary: 'バグ管理 + QA連携が中核。重要度・ステータスの遷移可視化を提案書に反映。',
      needs: [
        { tag: 'バグ管理', priority: 'high', context: '重要度4段階 + ステータス4段階' },
        { tag: 'QA', priority: 'medium', context: 'テストケースとの連携' },
      ],
    },
    {
      deal: 'コスモテック AI 導入',
      member: toki,
      type: 'meeting' as const,
      title: '受注決定 MTG',
      raw_text: '社長判断で発注決定。納期は3月末。週次の進捗報告を希望、月次は四半期末まとめ。',
      summary: '受注決定。3月末納期、週次進捗 + 月次四半期末まとめの運用。',
      needs: [
        { tag: '納期', priority: 'high', context: '3月末固定、後ろ倒しなし' },
        { tag: '報告', priority: 'high', context: '週次 + 四半期末' },
      ],
    },
    {
      deal: 'デルタ商事 在庫システム刷新',
      member: kawa,
      type: 'visit' as const,
      title: '現地視察',
      raw_text: '倉庫オペレーション見学。バーコードリーダーが古い。在庫データは紙で集計、月末に Excel 化。',
      summary: '紙 + 月末 Excel 集計から脱却したい。バーコードリーダー刷新も射程。',
      needs: [
        { tag: 'リアルタイム', priority: 'high', context: '紙→デジタル化' },
        { tag: 'ハードウェア', priority: 'medium', context: 'バーコードリーダー更新' },
      ],
    },
    {
      deal: 'エイト・ファイナンス 月額保守',
      member: tani,
      type: 'call' as const,
      title: '月次定例',
      raw_text: '今月のインシデント報告。先月比でアラート 30%減。来月は監査対応で稼働増の見込み。',
      summary: '安定運用継続。来月監査対応で工数増 +20% 見込み。',
      needs: [{ tag: '監査', priority: 'medium', context: '監査ログ整備' }],
    },
  ];

  for (const m of meetingSeeds) {
    const dealId = dealsByTitle[m.deal];
    if (!dealId) continue;
    const existing = await db
      .select({ id: schema.meetings.id })
      .from(schema.meetings)
      .where(and(eq(schema.meetings.deal_id, dealId), eq(schema.meetings.title, m.title)))
      .limit(1)
      .then((rows) => rows[0]);
    if (existing) continue;
    await db.insert(schema.meetings).values({
      company_id: tripot.id,
      deal_id: dealId,
      member_id: m.member.id,
      type: m.type,
      title: m.title,
      raw_text: m.raw_text,
      summary: m.summary,
      needs: m.needs,
      occurred_at: hoursAgo(Math.floor(Math.random() * 24 * 14)),
    });
    console.log(`  ✅ meeting: ${m.title}`);
  }

  // 7. 提案書 3件
  const proposalSeeds = [
    {
      deal: 'ベルウッド 製造管理 PoC',
      title: 'ベルウッド製造管理 提案書 v1',
      status: 'shared' as const,
      slides: [
        { type: 'cover', title: 'ベルウッド工業 製造管理 PoC 提案', subtitle: '2026年4月' },
        { type: 'agenda', title: '本日の議題', bullets: ['現状課題', '提案概要', 'スケジュール', '費用'] },
        { type: 'problem', title: '現状の課題', bullets: ['バグ追跡が紙ベース', 'QA 連携が分断', '進捗が不透明'] },
        { type: 'solution', title: '提案ソリューション', bullets: ['バグ管理 SaaS 導入', 'QA テストケース統合', 'リアルタイムダッシュボード'] },
        { type: 'schedule', title: 'スケジュール', items: ['Phase 1: 要件定義 (2週間)', 'Phase 2: 開発 (8週間)', 'Phase 3: テスト・展開 (4週間)'] },
        { type: 'price', title: '費用', message: '初期費用 650万円 + 月額保守 8万円' },
      ],
    },
    {
      deal: 'アクシス CRM 導入支援',
      title: 'アクシス CRM 統合 提案書 v1',
      status: 'draft' as const,
      slides: [
        { type: 'cover', title: 'アクシス CRM 統合 提案', subtitle: '営業管理一元化' },
        { type: 'problem', title: '統合前の課題', bullets: ['Excel と Salesforce 混在', '月次レポ 5日', '受注予測が困難'] },
        { type: 'solution', title: '提案', bullets: ['Salesforce 統合', '月次レポ自動化', '受注予測 AI'] },
      ],
    },
    {
      deal: 'コスモテック AI 導入',
      title: 'コスモテック AI 受注プラン',
      status: 'won' as const,
      slides: [
        { type: 'cover', title: 'コスモテック AI 導入計画', subtitle: '受注後 PJ 計画' },
        { type: 'schedule', title: 'マイルストーン', items: ['1月：要件確定', '2月：開発', '3月：本番展開'] },
      ],
    },
  ];

  for (const p of proposalSeeds) {
    const dealId = dealsByTitle[p.deal];
    if (!dealId) continue;
    const existing = await db
      .select({ id: schema.proposals.id })
      .from(schema.proposals)
      .where(and(eq(schema.proposals.deal_id, dealId), eq(schema.proposals.title, p.title)))
      .limit(1)
      .then((rows) => rows[0]);
    if (existing) continue;
    await db.insert(schema.proposals).values({
      company_id: tripot.id,
      deal_id: dealId,
      version: 1,
      title: p.title,
      status: p.status,
      slides: p.slides,
      created_by: toki.id,
    });
    console.log(`  ✅ proposal: ${p.title}`);
  }

  // 8. 見積 3件
  const estimateSeeds = [
    {
      deal: 'ベルウッド 製造管理 PoC',
      title: 'ベルウッド PoC 見積 v1',
      status: 'sent' as const,
      line_items: [
        { description: '要件定義', quantity: 1, unit_price: 800_000, amount: 800_000 },
        { description: '開発（バグ管理 + QA連携）', quantity: 1, unit_price: 4_500_000, amount: 4_500_000 },
        { description: 'テスト・展開', quantity: 1, unit_price: 1_200_000, amount: 1_200_000 },
      ],
      subtotal: 6_500_000,
      tax: 650_000,
      total: 7_150_000,
    },
    {
      deal: 'コスモテック AI 導入',
      title: 'コスモテック 受注見積',
      status: 'accepted' as const,
      line_items: [
        { description: 'AI 導入一式', quantity: 1, unit_price: 9_800_000, amount: 9_800_000 },
      ],
      subtotal: 9_800_000,
      tax: 980_000,
      total: 10_780_000,
    },
    {
      deal: 'フロンティア物流 ダッシュボード',
      title: 'フロンティア ダッシュボード見積',
      status: 'accepted' as const,
      line_items: [
        { description: 'ダッシュボード開発', quantity: 1, unit_price: 2_400_000, amount: 2_400_000 },
        { description: 'データ連携実装', quantity: 1, unit_price: 1_000_000, amount: 1_000_000 },
      ],
      subtotal: 3_400_000,
      tax: 340_000,
      total: 3_740_000,
    },
  ];

  const estimateMap: Record<string, string> = {};
  for (const e of estimateSeeds) {
    const dealId = dealsByTitle[e.deal];
    if (!dealId) continue;
    const existing = await db
      .select({ id: schema.estimates.id })
      .from(schema.estimates)
      .where(and(eq(schema.estimates.deal_id, dealId), eq(schema.estimates.title, e.title)))
      .limit(1)
      .then((rows) => rows[0]);
    if (existing) {
      estimateMap[e.deal] = existing.id;
      continue;
    }
    const [created] = await db
      .insert(schema.estimates)
      .values({
        company_id: tripot.id,
        deal_id: dealId,
        version: 1,
        title: e.title,
        status: e.status,
        line_items: e.line_items,
        subtotal: e.subtotal,
        tax: e.tax,
        total: e.total,
        created_by: toki.id,
      })
      .returning({ id: schema.estimates.id });
    estimateMap[e.deal] = created!.id;
    console.log(`  ✅ estimate: ${e.title}`);
  }

  // 9. 請求書 2件（受注確定の見積から）
  const invoiceSeeds = [
    {
      deal: 'コスモテック AI 導入',
      number: 'INV-2026-0001',
      status: 'paid' as const,
      total: 10_780_000,
      subtotal: 9_800_000,
      tax: 980_000,
      issue_date: daysAgo(30),
      due_date: daysAgo(0),
      paid_at: daysAgo(2),
    },
    {
      deal: 'フロンティア物流 ダッシュボード',
      number: 'INV-2026-0002',
      status: 'sent' as const,
      total: 3_740_000,
      subtotal: 3_400_000,
      tax: 340_000,
      issue_date: daysAgo(5),
      due_date: daysAgo(-25),
    },
  ];

  for (const inv of invoiceSeeds) {
    const dealId = dealsByTitle[inv.deal];
    if (!dealId) continue;
    const existing = await db
      .select({ id: schema.invoices.id })
      .from(schema.invoices)
      .where(and(eq(schema.invoices.company_id, tripot.id), eq(schema.invoices.invoice_number, inv.number)))
      .limit(1)
      .then((rows) => rows[0]);
    if (existing) continue;
    await db.insert(schema.invoices).values({
      company_id: tripot.id,
      deal_id: dealId,
      estimate_id: estimateMap[inv.deal] ?? null,
      invoice_number: inv.number,
      status: inv.status,
      subtotal: inv.subtotal,
      tax: inv.tax,
      total: inv.total,
      issue_date: inv.issue_date,
      due_date: inv.due_date,
      paid_at: inv.paid_at ?? null,
    });
    console.log(`  ✅ invoice: ${inv.number}`);
  }

  // 10. タスク 10件
  const taskSeeds = [
    { deal: 'アクシス CRM 導入支援', title: 'ヒアリング議事録まとめ', status: 'done' as const, assignee: tani, due: daysAgo(2) },
    { deal: 'アクシス CRM 導入支援', title: '提案書 v1 作成', status: 'in_progress' as const, assignee: tani, due: daysAgo(-3) },
    { deal: 'ベルウッド 製造管理 PoC', title: 'PoC スコープ確定', status: 'done' as const, assignee: ono, due: daysAgo(5) },
    { deal: 'ベルウッド 製造管理 PoC', title: '価格交渉準備', status: 'todo' as const, assignee: ono, due: daysAgo(-5) },
    { deal: 'コスモテック AI 導入', title: 'キックオフ MTG 設定', status: 'done' as const, assignee: toki, due: daysAgo(15) },
    { deal: 'コスモテック AI 導入', title: '要件定義書 確認', status: 'in_progress' as const, assignee: toki, due: daysAgo(-7) },
    { deal: 'デルタ商事 在庫システム刷新', title: '現地視察レポート', status: 'in_progress' as const, assignee: kawa, due: daysAgo(-2) },
    { deal: 'フロンティア物流 ダッシュボード', title: '請求書送付確認', status: 'done' as const, assignee: ono, due: daysAgo(3) },
    { deal: null, title: '今週の活動振り返り', status: 'todo' as const, assignee: toki, due: daysAgo(-1) },
    { deal: null, title: '営業会議 資料準備', status: 'todo' as const, assignee: tani, due: daysAgo(-2) },
  ];

  for (const t of taskSeeds) {
    const dealId = t.deal ? dealsByTitle[t.deal] : null;
    const existing = await db
      .select({ id: schema.tasks.id })
      .from(schema.tasks)
      .where(and(eq(schema.tasks.company_id, tripot.id), eq(schema.tasks.title, t.title)))
      .limit(1)
      .then((rows) => rows[0]);
    if (existing) continue;
    await db.insert(schema.tasks).values({
      company_id: tripot.id,
      deal_id: dealId,
      assignee_id: t.assignee.id,
      title: t.title,
      status: t.status,
      due_date: t.due,
    });
    console.log(`  ✅ task: ${t.title}`);
  }

  // 11. 予算 2026年12ヶ月分
  const monthlyTargets = [
    { month: 1, revenue: 5_000_000, gp: 2_500_000, op: 1_500_000 },
    { month: 2, revenue: 5_500_000, gp: 2_700_000, op: 1_700_000 },
    { month: 3, revenue: 7_000_000, gp: 3_500_000, op: 2_500_000 },
    { month: 4, revenue: 6_000_000, gp: 3_000_000, op: 2_000_000 },
    { month: 5, revenue: 6_500_000, gp: 3_200_000, op: 2_200_000 },
    { month: 6, revenue: 7_500_000, gp: 3_700_000, op: 2_700_000 },
    { month: 7, revenue: 6_500_000, gp: 3_200_000, op: 2_200_000 },
    { month: 8, revenue: 6_000_000, gp: 3_000_000, op: 2_000_000 },
    { month: 9, revenue: 7_000_000, gp: 3_500_000, op: 2_500_000 },
    { month: 10, revenue: 7_500_000, gp: 3_700_000, op: 2_700_000 },
    { month: 11, revenue: 8_000_000, gp: 4_000_000, op: 3_000_000 },
    { month: 12, revenue: 9_000_000, gp: 4_500_000, op: 3_500_000 },
  ];

  for (const b of monthlyTargets) {
    const existing = await db
      .select({ id: schema.budgets.id })
      .from(schema.budgets)
      .where(
        and(
          eq(schema.budgets.company_id, tripot.id),
          eq(schema.budgets.year, 2026),
          eq(schema.budgets.month, b.month),
        ),
      )
      .limit(1)
      .then((rows) => rows[0]);
    if (existing) continue;
    await db.insert(schema.budgets).values({
      company_id: tripot.id,
      year: 2026,
      month: b.month,
      target_revenue: b.revenue,
      target_gross_profit: b.gp,
      target_operating_profit: b.op,
    });
  }
  console.log(`  ✅ budgets: 2026年12ヶ月分`);

  // 12. bridge_notices 3件（本部 → tripot 指示プッシュのデモ）
  const noticeSeeds = [
    {
      title: '4月期決算 数字確定のお願い',
      body: '4月末締めの月次レポート、本部に5/3 17:00 までに送信してください。bridge/kpi 経由で自動送信されますので、月次画面の「本部に送信」ボタンを押すだけです。',
      severity: 'info',
      sent_days_ago: 1,
      acknowledge: false,
    },
    {
      title: '⚠ 経費承認フロー変更（5/1〜）',
      body: '5月1日より、10万円超の経費は本部承認必須となります。承認申請ボタンから「経費承認」を選択してください。',
      severity: 'warning',
      sent_days_ago: 3,
      acknowledge: true,
    },
    {
      title: '🚨 セキュリティ：パスワード再設定のお願い',
      body: '社内システムのパスワード方針変更により、5/15 までに全メンバーのパスワード再設定が必要です。詳細は別途メールでご案内します。',
      severity: 'critical',
      sent_days_ago: 5,
      acknowledge: false,
    },
  ];

  for (const n of noticeSeeds) {
    const existing = await db
      .select({ id: schema.bridge_notices.id })
      .from(schema.bridge_notices)
      .where(and(eq(schema.bridge_notices.company_id, tripot.id), eq(schema.bridge_notices.title, n.title)))
      .limit(1)
      .then((rows) => rows[0]);
    if (existing) continue;
    const sentAt = new Date();
    sentAt.setDate(sentAt.getDate() - n.sent_days_ago);
    await db.insert(schema.bridge_notices).values({
      company_id: tripot.id,
      title: n.title,
      body: n.body,
      severity: n.severity,
      sent_at: sentAt,
      acknowledged_at: n.acknowledge ? new Date() : null,
      acknowledged_by: n.acknowledge ? toki.id : null,
    });
    console.log(`  ✅ bridge_notice: ${n.title}`);
  }

  console.log('\n🎉 demo seed 完了！');
  console.log(`\n   メンバー ${allMembers.length}名 / 顧客 ${customers.length}社 / 案件 ${allDeals.length}件`);
}

seed().catch((err) => {
  console.error('❌ seed エラー：', err);
  process.exit(1);
});
