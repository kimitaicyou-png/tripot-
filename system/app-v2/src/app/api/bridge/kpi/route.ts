/**
 * /api/bridge/kpi — 本部接続標準エンドポイント
 *
 * ブリッジAI思想：本来繋げられないものを繋げる
 * 本部 (coaris.ai) からの service token 認証で受信、tripot のKPIを集計して返す
 */

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { deals, actions, members } from '@/db/schema';
import { eq, and, gte, lte, isNull, sql, inArray } from 'drizzle-orm';
import { TRIPOT_CONFIG } from '../../../../../coaris.config';

const ORDERED_STAGES = ['ordered', 'in_production', 'delivered', 'acceptance', 'invoiced', 'paid'] as const;
type OrderedStage = (typeof ORDERED_STAGES)[number];

export async function GET(request: Request) {
  // service token 認証
  const authHeader = request.headers.get('authorization') ?? '';
  const expected = `Bearer ${process.env.BRIDGE_SERVICE_TOKEN}`;
  if (!process.env.BRIDGE_SERVICE_TOKEN || authHeader !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const period = url.searchParams.get('period') ?? new Date().toISOString().slice(0, 7); // YYYY-MM

  const [year, month] = period.split('-').map((s) => Number(s));
  if (!year || !month) {
    return NextResponse.json({ error: 'Invalid period (expected YYYY-MM)' }, { status: 400 });
  }

  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0, 23, 59, 59);

  // 会社IDを slug から逆引き
  const company = await db.query.companies.findFirst({
    where: (c, { eq }) => eq(c.id_slug, TRIPOT_CONFIG.id),
  });
  if (!company) {
    return NextResponse.json({ error: 'Company not registered in DB' }, { status: 500 });
  }

  // 入金済 deals = 売上
  const revenueRow = await db
    .select({
      revenue: sql<number>`COALESCE(SUM(${deals.amount}), 0)::int`,
      activeDeals: sql<number>`COUNT(*) FILTER (WHERE ${deals.stage} IN ('proposing', 'ordered', 'in_production'))::int`,
      closedDeals: sql<number>`COUNT(*) FILTER (WHERE ${deals.stage} IN ('paid', 'invoiced'))::int`,
    })
    .from(deals)
    .where(
      and(
        eq(deals.company_id, company.id),
        isNull(deals.deleted_at),
        inArray(deals.stage, [...ORDERED_STAGES] as OrderedStage[]),
      )
    )
    .then((rows) => rows[0]);

  // 当月の行動量
  const activityRow = await db
    .select({
      calls: sql<number>`COUNT(*) FILTER (WHERE ${actions.type} = 'call')::int`,
      meetings: sql<number>`COUNT(*) FILTER (WHERE ${actions.type} = 'meeting')::int`,
      proposals: sql<number>`COUNT(*) FILTER (WHERE ${actions.type} = 'proposal')::int`,
    })
    .from(actions)
    .where(
      and(
        eq(actions.company_id, company.id),
        gte(actions.occurred_at, monthStart),
        lte(actions.occurred_at, monthEnd),
      )
    )
    .then((rows) => rows[0]);

  // ※ gross_profit / operating_profit は v2 では tasks.estimated_cost と budgets を使った精緻化が秋美担当
  // 今は revenue ベースで仮置き（30% gross 想定）
  const revenue = revenueRow?.revenue ?? 0;
  const grossProfit = Math.round(revenue * 0.3);
  const operatingProfit = Math.round(grossProfit * 0.6);

  return NextResponse.json({
    company: TRIPOT_CONFIG.id,
    period,
    kpi: {
      gross_profit: grossProfit,
      operating_profit: operatingProfit,
      revenue,
      active_deals: revenueRow?.activeDeals ?? 0,
      closed_deals: revenueRow?.closedDeals ?? 0,
      team_activity: {
        calls: activityRow?.calls ?? 0,
        meetings: activityRow?.meetings ?? 0,
        proposals: activityRow?.proposals ?? 0,
      },
    },
    alerts: [], // 将来：支払遅延・期限リスク・CF警告など
    updated_at: new Date().toISOString(),
  });
}
