import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { MONTHLY_TARGETS } from '@/lib/data/company';

// トライポット → 本部 ブリッジエンドポイント
// 本部 (hq/coaris-main) がこのURLを叩いて月次KPIを吸い上げる

const ORDERED_STAGES = ['ordered', 'in_production', 'delivered', 'acceptance', 'invoiced', 'accounting', 'paid'];
const PIPELINE_STAGES = ['lead', 'meeting', 'proposal', 'estimate_sent', 'negotiation'];

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function num(v: unknown): number {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

export async function GET(req: Request) {
  const auth = req.headers.get('authorization');
  const expected = process.env.BRIDGE_API_KEY;

  if (expected && auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const month = currentMonth();
  const sql = getDb();

  const dealRows = await sql`SELECT * FROM deals WHERE last_date LIKE ${month + '%'}`;
  const memberRows = await sql`SELECT id FROM members WHERE status = 'active'`;

  type DealRow = { id: string; stage: string; amount: number; probability: number; revenue_type: string; monthly_amount: number };
  const deals = dealRows as DealRow[];

  const orderedAll = deals.filter((d) => ORDERED_STAGES.includes(d.stage));
  const shotRevenue = orderedAll.filter((d) => d.revenue_type !== 'running').reduce((s, d) => s + num(d.amount), 0);
  const runningRevenue = orderedAll.filter((d) => d.revenue_type === 'running').reduce((s, d) => s + num(d.monthly_amount), 0);
  const revenue = shotRevenue + runningRevenue;

  const orderedIds = orderedAll.map((d) => d.id);
  let prodCost = 0;
  if (orderedIds.length > 0) {
    try {
      const cardRows = await sql`SELECT deal_id, tasks FROM production_cards WHERE deal_id = ANY(${orderedIds})` as Array<{ deal_id: string; tasks: Array<{ estimatedCost?: number }> }>;
      prodCost = cardRows.reduce((s, c) => s + (Array.isArray(c.tasks) ? c.tasks.reduce((a, t) => a + num(t.estimatedCost), 0) : 0), 0);
    } catch {
      prodCost = 0;
    }
  }
  const gross = prodCost > 0 ? revenue - prodCost : 0;

  const pipeline = deals.filter((d) => PIPELINE_STAGES.includes(d.stage));
  const pipelineWeighted = pipeline.reduce((s, d) => s + Math.round(num(d.amount) * num(d.probability) / 100), 0);

  const target = MONTHLY_TARGETS[month];
  const revenueTarget = num(target?.revenue);
  const grossTarget = num(target?.grossProfit);
  const sga = num(target?.sga);
  const op = gross - sga;
  const opTarget = num(target?.operatingProfit) || (grossTarget - sga);

  const opRate = opTarget > 0 ? (op / opTarget) * 100 : 0;
  const revenueRate = revenueTarget > 0 ? (revenue / revenueTarget) * 100 : 0;
  const alertLevel: 'normal' | 'caution' | 'danger' = opTarget > 0 && opRate < 70 ? 'danger' : opTarget > 0 && opRate < 85 ? 'caution' : 'normal';
  const alerts: string[] = [];
  if (opTarget > 0 && opRate < 70) alerts.push('営業利益達成率が70%未満');
  if (revenueTarget > 0 && revenueRate < 85) alerts.push('売上が予算の85%未満');
  if (revenueTarget > 0 && pipelineWeighted < revenueTarget * 0.3) alerts.push('パイプライン加重が売上目標の30%未満');

  const payload = {
    companyId: 'tripot',
    name: 'トライポット',
    industry: 'IT・システム開発',
    month,
    revenue,
    revenueTarget,
    gross,
    grossTarget,
    op,
    opTarget,
    sga,
    pipelineWeighted,
    dealCount: deals.length,
    orderedCount: orderedAll.length,
    members: memberRows.length,
    alertLevel,
    alerts,
    updatedAt: new Date().toISOString(),
  };

  return NextResponse.json(payload, {
    headers: {
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
    },
  });
}
