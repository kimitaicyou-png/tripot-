import { MOCK_DEALS_INIT, type Deal } from '@/components/personal/DealsContent';

const DEALS_KEY = 'tripot_deals_all';
const ATTACK_KEY = 'coaris_attack_to_deals';
const OVERRIDE_KEY = 'coaris_deals_override';
const RESET_KEY = 'tripot_data_reset';

export function loadAllDeals(): Deal[] {
  if (typeof window === 'undefined') return [];

  const mainDeals: Deal[] = (() => {
    const saved = localStorage.getItem(DEALS_KEY);
    if (!saved) return [];
    try { const p = JSON.parse(saved); return Array.isArray(p) ? p : []; } catch { return []; }
  })();

  const attacks = loadAttacks();
  const mainIds = new Set(mainDeals.map((d) => d.id));
  const merged = [...mainDeals, ...attacks.filter((d) => !mainIds.has(d.id))];
  return merged;
}

export function addDeal(deal: Deal): void {
  const deals = loadAllDeals();
  const existing = deals.find((d) => d.id === deal.id);
  if (existing) return;
  saveAllDeals([...deals, deal]);
}

export function updateDeal(id: string, patch: Partial<Deal>): void {
  const deals = loadAllDeals();
  const idx = deals.findIndex((d) => d.id === id);
  if (idx === -1) return;
  deals[idx] = { ...deals[idx], ...patch };
  saveAllDeals(deals);
}

export function saveAllDeals(deals: Deal[]): void {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(DEALS_KEY, JSON.stringify(deals)); } catch {}
}

function loadOverrides(): Record<string, Partial<Deal>> {
  try {
    const raw = localStorage.getItem(OVERRIDE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, Partial<Deal>>) : {};
  } catch { return {}; }
}

function loadAttacks(): Deal[] {
  try {
    const raw = localStorage.getItem(ATTACK_KEY);
    return raw ? (JSON.parse(raw) as Deal[]) : [];
  } catch { return []; }
}

export type DealKpiSummary = {
  totalRevenue: number;
  totalGrossProfit: number;
  grossMarginRate: number;
  dealCount: number;
  orderedCount: number;
  pipelineCount: number;
  pipelineWeighted: number;
  memberStats: MemberDealStat[];
};

export type MemberDealStat = {
  name: string;
  appointments: number;
  meetings: number;
  estimates: number;
  orders: number;
  revenue: number;
  grossProfit: number;
};

const SALES_STAGES = ['lead', 'meeting', 'proposal', 'estimate_sent', 'negotiation'];
const ORDERED_STAGES = ['ordered', 'in_production', 'delivered', 'acceptance', 'invoiced', 'accounting', 'paid'];

export function calcDealKpi(deals: Deal[]): DealKpiSummary {
  const ordered = deals.filter((d) => ORDERED_STAGES.includes(d.stage));
  const pipeline = deals.filter((d) => SALES_STAGES.includes(d.stage));
  const totalRevenue = ordered.reduce((s, d) => s + d.amount, 0) + ordered.filter((d) => d.revenueType === 'running' && d.monthlyAmount).reduce((s, d) => s + (d.monthlyAmount ?? 0), 0);
  const grossRate = 0.457;
  const totalGrossProfit = Math.round(totalRevenue * grossRate);
  const pipelineWeighted = pipeline.reduce((s, d) => s + Math.round(d.amount * d.probability / 100), 0);

  const assignees = [...new Set(deals.map((d) => d.assignee))];
  const memberStats: MemberDealStat[] = assignees.map((name) => {
    const mine = deals.filter((d) => d.assignee === name);
    const myOrdered = mine.filter((d) => ORDERED_STAGES.includes(d.stage));
    const rev = myOrdered.reduce((s, d) => s + d.amount, 0);
    return {
      name,
      appointments: mine.filter((d) => d.stage === 'lead').length,
      meetings: mine.filter((d) => d.stage === 'meeting').length,
      estimates: mine.filter((d) => ['proposal', 'estimate_sent'].includes(d.stage)).length,
      orders: myOrdered.length,
      revenue: rev,
      grossProfit: Math.round(rev * grossRate),
    };
  });

  return {
    totalRevenue,
    totalGrossProfit,
    grossMarginRate: totalRevenue > 0 ? Math.round((totalGrossProfit / totalRevenue) * 100) : 0,
    dealCount: deals.length,
    orderedCount: ordered.length,
    pipelineCount: pipeline.length,
    pipelineWeighted,
    memberStats,
  };
}
