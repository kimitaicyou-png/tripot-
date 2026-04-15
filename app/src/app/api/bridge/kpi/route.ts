import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { MONTHLY_TARGETS } from '@/lib/data/company';

// トライポット → 本部 ブリッジエンドポイント
// 本部 (hq/coaris-main) がこのURLを叩いて月次KPIを吸い上げる

const ORDERED_STAGES = ['ordered', 'in_production', 'delivered', 'acceptance', 'invoiced', 'accounting', 'paid'];
const PIPELINE_STAGES = ['lead', 'meeting', 'proposal', 'estimate_sent', 'negotiation'];
const GROSS_MARGIN_RATE = 0.457;

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
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

  const deals = dealRows as Array<{ stage: string; amount: number; probability: number; revenue_type: string; monthly_amount: number }>;

  const ordered = deals.filter((d) => ORDERED_STAGES.includes(d.stage));
  const shotRevenue = ordered.filter((d) => d.revenue_type !== 'running').reduce((s, d) => s + (Number(d.amount) || 0), 0);
  const runningRevenue = ordered.filter((d) => d.revenue_type === 'running').reduce((s, d) => s + (Number(d.monthly_amount) || 0), 0);
  const revenue = shotRevenue + runningRevenue;
  const gross = Math.round(revenue * GROSS_MARGIN_RATE);

  const pipeline = deals.filter((d) => PIPELINE_STAGES.includes(d.stage));
  const pipelineWeighted = pipeline.reduce((s, d) => s + Math.round((Number(d.amount) || 0) * (Number(d.probability) || 0) / 100), 0);

  const target = MONTHLY_TARGETS[month] ?? MONTHLY_TARGETS['2026-04'];
  const revenueTarget = target?.revenue ?? 12000000;
  const grossTarget = target?.grossProfit ?? 5520000;
  const sga = target?.sga ?? 3500000;
  const op = gross - sga;
  const opTarget = target?.operatingProfit ?? (grossTarget - sga);

  const opRate = opTarget > 0 ? (op / opTarget) * 100 : 0;
  const revenueRate = revenueTarget > 0 ? (revenue / revenueTarget) * 100 : 0;
  const alertLevel: 'normal' | 'caution' | 'danger' = opRate < 70 ? 'danger' : opRate < 85 ? 'caution' : 'normal';
  const alerts: string[] = [];
  if (opRate < 70) alerts.push('営業利益達成率が70%未満');
  if (revenueRate < 85) alerts.push('売上が予算の85%未満');
  if (pipelineWeighted < revenueTarget * 0.3) alerts.push('パイプライン加重が売上目標の30%未満');

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
    orderedCount: ordered.length,
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
