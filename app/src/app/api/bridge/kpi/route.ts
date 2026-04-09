import { NextResponse } from 'next/server';
import { aggregateMonthly, MEMBER_KPIS } from '@/lib/data/aggregation';

// トライポット → 本部 ブリッジエンドポイント
// 本部 (hq/coaris-main) がこのURLを叩いて月次KPIを吸い上げる
export const runtime = 'edge';

export async function GET(req: Request) {
  const auth = req.headers.get('authorization');
  const expected = process.env.BRIDGE_API_KEY;

  if (expected && auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const monthly = aggregateMonthly('tripot', 'トライポット', '2026年4月');
  const members = MEMBER_KPIS.length;

  const payload = {
    companyId: 'tripot',
    name: 'トライポット',
    industry: 'IT・システム開発',
    month: '2026-04',
    revenue: monthly.revenue,
    revenueTarget: monthly.revenueTarget,
    gross: monthly.gross,
    grossTarget: monthly.grossTarget,
    op: monthly.op,
    opTarget: monthly.opTarget,
    members,
    alertLevel: monthly.alertLevel,
    alerts: monthly.alerts,
    cashWarning: monthly.cashWarning,
    updatedAt: new Date().toISOString(),
  };

  return NextResponse.json(payload, {
    headers: {
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
    },
  });
}
