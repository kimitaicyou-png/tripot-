import type { Deal } from '@/lib/stores/types';
import { safePercent, safeDiv } from '@/lib/safeMath';

const ORDERED_STAGES = new Set(['ordered', 'in_production', 'delivered', 'acceptance', 'invoiced', 'accounting', 'paid']);
const SALES_STAGES = new Set(['lead', 'meeting', 'proposal', 'estimate_sent', 'negotiation']);
const GROSS_RATE = 0.457;

export type DealKpi = {
  totalRevenue: number;
  totalGrossProfit: number;
  grossMarginRate: number;
  dealCount: number;
  orderedCount: number;
  pipelineCount: number;
  pipelineWeighted: number;
  shotRevenue: number;
  runningRevenue: number;
};

export function calcDealKpi(deals: Deal[]): DealKpi {
  const ordered = deals.filter((d) => ORDERED_STAGES.has(d.stage));
  const pipeline = deals.filter((d) => SALES_STAGES.has(d.stage));

  const shotRevenue = ordered
    .filter((d) => d.revenueType === 'shot')
    .reduce((s, d) => s + (d.amount ?? 0), 0);

  const runningRevenue = ordered
    .filter((d) => d.revenueType === 'running' && d.monthlyAmount)
    .reduce((s, d) => s + (d.monthlyAmount ?? 0), 0);

  const totalRevenue = shotRevenue + runningRevenue;
  const totalGrossProfit = Math.round(totalRevenue * GROSS_RATE);
  const pipelineWeighted = pipeline.reduce(
    (s, d) => s + Math.round((d.amount ?? 0) * (d.probability ?? 0) / 100),
    0,
  );

  return {
    totalRevenue,
    totalGrossProfit,
    grossMarginRate: safePercent(totalGrossProfit, totalRevenue),
    dealCount: deals.length,
    orderedCount: ordered.length,
    pipelineCount: pipeline.length,
    pipelineWeighted,
    shotRevenue,
    runningRevenue,
  };
}

export type MemberDealStat = {
  name: string;
  leads: number;
  meetings: number;
  estimates: number;
  orders: number;
  revenue: number;
  grossProfit: number;
};

export function calcMemberStats(deals: Deal[]): MemberDealStat[] {
  const assignees = [...new Set(deals.map((d) => d.assignee))];
  return assignees.map((name) => {
    const mine = deals.filter((d) => d.assignee === name);
    const myOrdered = mine.filter((d) => ORDERED_STAGES.has(d.stage));
    const rev = myOrdered.reduce((s, d) => s + (d.amount ?? 0), 0);
    return {
      name,
      leads: mine.filter((d) => d.stage === 'lead').length,
      meetings: mine.filter((d) => d.stage === 'meeting').length,
      estimates: mine.filter((d) => SALES_STAGES.has(d.stage) && d.stage !== 'lead' && d.stage !== 'meeting').length,
      orders: myOrdered.length,
      revenue: rev,
      grossProfit: Math.round(rev * GROSS_RATE),
    };
  });
}

export function calcFunnel(deals: Deal[]) {
  return [
    { label: 'アポ', count: deals.filter((d) => d.stage === 'lead').length },
    { label: '商談', count: deals.filter((d) => d.stage === 'meeting').length },
    { label: '提案', count: deals.filter((d) => ['proposal', 'estimate_sent'].includes(d.stage)).length },
    { label: '見積', count: deals.filter((d) => d.stage === 'negotiation').length },
    { label: '受注', count: deals.filter((d) => ORDERED_STAGES.has(d.stage)).length },
  ];
}

export function calcCancelReasons(deals: Deal[]) {
  const cancelled = deals.filter((d) => d.stage === 'lost' && d.cancelReason);
  const map = new Map<string, number>();
  for (const d of cancelled) {
    const r = d.cancelReason!;
    map.set(r, (map.get(r) ?? 0) + 1);
  }
  return [...map.entries()].map(([reason, count]) => ({ reason, count })).sort((a, b) => b.count - a.count);
}

export function calcCustomerRanking(deals: Deal[], limit = 5) {
  const ordered = deals.filter((d) => ORDERED_STAGES.has(d.stage));
  const map = new Map<string, number>();
  for (const d of ordered) map.set(d.clientName, (map.get(d.clientName) ?? 0) + d.amount);
  return [...map.entries()]
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, limit);
}
