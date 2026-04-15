import type { Deal, ProductionCard } from '@/lib/stores/types';
import { safePercent } from '@/lib/safeMath';

const ORDERED_STAGES = new Set(['ordered', 'in_production', 'delivered', 'acceptance', 'invoiced', 'accounting', 'paid']);
const SALES_STAGES = new Set(['lead', 'meeting', 'proposal', 'estimate_sent', 'negotiation']);

function num(v: unknown): number {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function normalizeAssignee(s: unknown): string {
  if (typeof s !== 'string') return '';
  return s.replace(/[\s\u3000]+/g, ' ').trim();
}

function matchesAssignee(a: unknown, b: string): boolean {
  const na = normalizeAssignee(a);
  const nb = normalizeAssignee(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  const la = na.split(' ')[0];
  const lb = nb.split(' ')[0];
  return Boolean(la && lb && la === lb);
}

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

export function calcDealKpi(deals: Deal[], cards?: ProductionCard[]): DealKpi {
  const hasAssignee = (d: Deal) => Boolean(normalizeAssignee(d.assignee));
  const assignedOrdered = deals.filter((d) => ORDERED_STAGES.has(d.stage) && hasAssignee(d));
  const pipeline = deals.filter((d) => SALES_STAGES.has(d.stage) && hasAssignee(d));

  const shotRevenue = assignedOrdered
    .filter((d) => d.revenueType === 'shot')
    .reduce((s, d) => s + num(d.amount), 0);

  const runningRevenue = assignedOrdered
    .filter((d) => d.revenueType === 'running' || d.revenueType === 'both')
    .reduce((s, d) => s + num(d.monthlyAmount), 0);

  const totalRevenue = shotRevenue + runningRevenue;

  const dealCostById = new Map<string, number>();
  if (cards) {
    for (const c of cards) {
      const cost = c.tasks.reduce((a, t) => a + num(t.estimatedCost), 0);
      if (cost > 0) dealCostById.set(c.dealId, cost);
    }
  }
  const totalGrossProfit = assignedOrdered.reduce((s, d) => {
    const rev = num(d.amount) + ((d.revenueType === 'running' || d.revenueType === 'both') ? num(d.monthlyAmount) : 0);
    const cost = dealCostById.get(d.id) ?? 0;
    return s + (cost > 0 ? rev - cost : 0);
  }, 0);

  const pipelineWeighted = pipeline.reduce(
    (s, d) => s + Math.round(num(d.amount) * num(d.probability) / 100),
    0,
  );

  return {
    totalRevenue,
    totalGrossProfit,
    grossMarginRate: safePercent(totalGrossProfit, totalRevenue),
    dealCount: deals.length,
    orderedCount: assignedOrdered.length,
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

export function calcMemberStats(deals: Deal[], cards?: ProductionCard[]): MemberDealStat[] {
  const dealCostById = new Map<string, number>();
  if (cards) {
    for (const c of cards) {
      const cost = c.tasks.reduce((a, t) => a + num(t.estimatedCost), 0);
      if (cost > 0) dealCostById.set(c.dealId, cost);
    }
  }
  const assignees = [...new Set(deals.map((d) => normalizeAssignee(d.assignee)).filter(Boolean))];
  return assignees.map((name) => {
    const mine = deals.filter((d) => matchesAssignee(d.assignee, name));
    const myOrdered = mine.filter((d) => ORDERED_STAGES.has(d.stage));
    const rev = myOrdered.reduce((s, d) => {
      const running = (d.revenueType === 'running' || d.revenueType === 'both') ? num(d.monthlyAmount) : 0;
      return s + num(d.amount) + running;
    }, 0);
    const gross = myOrdered.reduce((s, d) => {
      const r = num(d.amount) + ((d.revenueType === 'running' || d.revenueType === 'both') ? num(d.monthlyAmount) : 0);
      const c = dealCostById.get(d.id) ?? 0;
      return s + (c > 0 ? r - c : 0);
    }, 0);
    return {
      name,
      leads: mine.filter((d) => d.stage === 'lead').length,
      meetings: mine.filter((d) => d.stage === 'meeting').length,
      estimates: mine.filter((d) => SALES_STAGES.has(d.stage) && d.stage !== 'lead' && d.stage !== 'meeting').length,
      orders: myOrdered.length,
      revenue: rev,
      grossProfit: gross,
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
  for (const d of ordered) map.set(d.clientName, (map.get(d.clientName) ?? 0) + num(d.amount));
  return [...map.entries()]
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, limit);
}
