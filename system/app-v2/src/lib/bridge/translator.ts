import { eq, and, isNull, sql, gte, lte, lt, desc } from 'drizzle-orm';
import { db } from '@/lib/db';
import { deals, customers, actions, budgets, budget_actuals } from '@/db/schema';

export type BridgeKpi = {
  company: string;
  period: string;
  kpi: {
    gross_profit: number;
    operating_profit: number;
    revenue: number;
    revenue_target: number;
    revenue_progress_pct: number;
    last_year_revenue: number;
    yoy_pct: number | null;
    active_deals: number;
    closed_deals: number;
    team_activity: {
      calls: number;
      meetings: number;
      proposals: number;
      [key: string]: number;
    };
  };
  alerts: BridgeAlert[];
  updated_at: string;
};

export type BridgeAlert = {
  type: 'payment_delay' | 'deadline_risk' | 'cf_warning' | 'silence' | 'stuck_deal' | 'budget_under' | 'custom';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  deal_id?: string;
  customer_id?: string;
  action_required?: boolean;
};

const ORDERED_STAGES = ['ordered', 'in_production', 'delivered', 'acceptance', 'invoiced', 'paid'] as const;
const SILENCE_DAYS = 30;
const STUCK_DAYS = 14;
const GROSS_MARGIN_RATIO = 0.3;
const OPERATING_MARGIN_RATIO = 0.6;

export function parsePeriod(period: string): { year: number; month: number; start: Date; end: Date } | null {
  const m = /^(\d{4})-(\d{2})$/.exec(period);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  if (year < 2000 || year > 2100 || month < 1 || month > 12) return null;
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59);
  return { year, month, start, end };
}

export async function buildKpiForCompany(params: {
  companySlug: string;
  companyId: string;
  period: string;
}): Promise<BridgeKpi | null> {
  const parsed = parsePeriod(params.period);
  if (!parsed) return null;
  const { year, month, start, end } = parsed;
  const lastYear = year - 1;

  const [revenueRow, activityRow, budgetRow, lastYearActualRow, silenceCount, stuckDeals] =
    await Promise.all([
      db
        .select({
          revenue: sql<number>`COALESCE(SUM(${deals.amount}) FILTER (WHERE ${deals.paid_at} >= ${start} AND ${deals.paid_at} <= ${end}), 0)::int`,
          activeDeals: sql<number>`COUNT(*) FILTER (WHERE ${deals.stage} IN ('proposing', 'ordered', 'in_production'))::int`,
          closedDeals: sql<number>`COUNT(*) FILTER (WHERE ${deals.stage} IN ('paid', 'invoiced'))::int`,
        })
        .from(deals)
        .where(and(eq(deals.company_id, params.companyId), isNull(deals.deleted_at)))
        .then((rows) => rows[0]),
      db
        .select({
          calls: sql<number>`COUNT(*) FILTER (WHERE ${actions.type} = 'call')::int`,
          meetings: sql<number>`COUNT(*) FILTER (WHERE ${actions.type} = 'meeting')::int`,
          proposals: sql<number>`COUNT(*) FILTER (WHERE ${actions.type} = 'proposal')::int`,
        })
        .from(actions)
        .where(
          and(
            eq(actions.company_id, params.companyId),
            gte(actions.occurred_at, start),
            lte(actions.occurred_at, end)
          )
        )
        .then((rows) => rows[0]),
      db
        .select({ target: budgets.target_revenue })
        .from(budgets)
        .where(
          and(
            eq(budgets.company_id, params.companyId),
            eq(budgets.year, year),
            eq(budgets.month, month)
          )
        )
        .limit(1)
        .then((rows) => rows[0]),
      db
        .select({ revenue: budget_actuals.revenue })
        .from(budget_actuals)
        .where(
          and(
            eq(budget_actuals.company_id, params.companyId),
            eq(budget_actuals.year, lastYear),
            eq(budget_actuals.month, month)
          )
        )
        .limit(1)
        .then((rows) => rows[0]),
      db
        .select({ n: sql<number>`count(*)::int` })
        .from(customers)
        .where(
          and(
            eq(customers.company_id, params.companyId),
            isNull(customers.deleted_at),
            sql`${customers.id} NOT IN (
              SELECT ${actions.deal_id} FROM ${actions}
              WHERE ${actions.company_id} = ${params.companyId}
                AND ${actions.deal_id} IS NOT NULL
                AND ${actions.occurred_at} >= NOW() - INTERVAL '${sql.raw(String(SILENCE_DAYS))} days'
            )`
          )
        )
        .then((rows) => rows[0]?.n ?? 0),
      db
        .select({
          id: deals.id,
          title: deals.title,
          stage: deals.stage,
          updated_at: deals.updated_at,
        })
        .from(deals)
        .where(
          and(
            eq(deals.company_id, params.companyId),
            isNull(deals.deleted_at),
            sql`${deals.stage} IN ('proposing', 'ordered', 'in_production')`,
            lt(deals.updated_at, new Date(Date.now() - STUCK_DAYS * 24 * 60 * 60 * 1000))
          )
        )
        .orderBy(desc(deals.amount))
        .limit(5),
    ]);

  const revenue = revenueRow?.revenue ?? 0;
  const grossProfit = Math.round(revenue * GROSS_MARGIN_RATIO);
  const operatingProfit = Math.round(grossProfit * OPERATING_MARGIN_RATIO);
  const revenueTarget = budgetRow?.target ?? 0;
  const revenueProgressPct = revenueTarget > 0 ? Math.round((revenue / revenueTarget) * 100) : 0;
  const lastYearRevenue = lastYearActualRow?.revenue ?? 0;
  const yoyPct = lastYearRevenue > 0 ? Math.round((revenue / lastYearRevenue - 1) * 100) : null;

  const alerts: BridgeAlert[] = [];

  if (revenueTarget > 0 && revenue < revenueTarget * 0.5) {
    alerts.push({
      type: 'budget_under',
      severity: 'warning',
      message: `${year}年${month}月の売上が予算 ${Math.round(revenueProgressPct)}% に留まっています`,
      action_required: true,
    });
  }

  if (silenceCount > 0) {
    alerts.push({
      type: 'silence',
      severity: 'info',
      message: `${SILENCE_DAYS}日以上接触のない顧客が ${silenceCount} 件あります`,
    });
  }

  if (stuckDeals.length > 0) {
    alerts.push({
      type: 'stuck_deal',
      severity: 'warning',
      message: `${STUCK_DAYS}日以上動きのない進行中案件が ${stuckDeals.length} 件あります（最高金額：${stuckDeals[0]!.title}）`,
      deal_id: stuckDeals[0]!.id,
      action_required: true,
    });
  }

  return {
    company: params.companySlug,
    period: params.period,
    kpi: {
      gross_profit: grossProfit,
      operating_profit: operatingProfit,
      revenue,
      revenue_target: revenueTarget,
      revenue_progress_pct: revenueProgressPct,
      last_year_revenue: lastYearRevenue,
      yoy_pct: yoyPct,
      active_deals: revenueRow?.activeDeals ?? 0,
      closed_deals: revenueRow?.closedDeals ?? 0,
      team_activity: {
        calls: activityRow?.calls ?? 0,
        meetings: activityRow?.meetings ?? 0,
        proposals: activityRow?.proposals ?? 0,
      },
    },
    alerts,
    updated_at: new Date().toISOString(),
  };
}
