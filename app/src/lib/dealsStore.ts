import { type Deal } from '@/components/deals';

export function normalizeAssignee(s: unknown): string {
  if (typeof s !== 'string') return '';
  return s.replace(/[\s\u3000]+/g, ' ').trim();
}

export function matchesAssignee(dealAssignee: unknown, memberName: string): boolean {
  const a = normalizeAssignee(dealAssignee);
  const m = normalizeAssignee(memberName);
  if (!a || !m) return false;
  if (a === m) return true;
  const aLast = a.split(' ')[0];
  const mLast = m.split(' ')[0];
  if (aLast && mLast && aLast === mLast) return true;
  return false;
}

const CACHE_KEY = 'tripot_deals_cache';
const CACHE_TS_KEY = 'tripot_deals_cache_ts';
const CACHE_TTL = 10_000;

let memoryCache: Deal[] | null = null;

function readCache(): Deal[] {
  if (memoryCache) return memoryCache;
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    memoryCache = Array.isArray(parsed) ? parsed : [];
    return memoryCache;
  } catch { return []; }
}

function writeCache(deals: Deal[]): void {
  memoryCache = deals;
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(deals));
    localStorage.setItem(CACHE_TS_KEY, String(Date.now()));
  } catch {}
}

export function loadAllDeals(): Deal[] {
  return readCache();
}

export async function fetchDeals(): Promise<Deal[]> {
  try {
    const res = await fetch('/api/deals');
    const data = await res.json();
    const deals: Deal[] = data.deals ?? [];
    writeCache(deals);
    return deals;
  } catch {
    return readCache();
  }
}

export async function addDeal(deal: Deal): Promise<void> {
  try {
    await fetch('/api/deals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(deal),
    });
    const cache = readCache();
    if (!cache.some((d) => d.id === deal.id)) {
      writeCache([deal, ...cache]);
    }
  } catch {}
}

export async function updateDeal(id: string, patch: Partial<Deal>): Promise<void> {
  try {
    await fetch('/api/deals', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...patch }),
    });
    const cache = readCache();
    const idx = cache.findIndex((d) => d.id === id);
    if (idx !== -1) {
      cache[idx] = { ...cache[idx], ...patch };
      writeCache([...cache]);
    }
  } catch {}
}

export async function removeDeal(id: string): Promise<void> {
  try {
    await fetch(`/api/deals?id=${id}`, { method: 'DELETE' });
    writeCache(readCache().filter((d) => d.id !== id));
  } catch {}
}

export function saveAllDeals(_deals: Deal[]): void {
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
  unassignedRevenue: number;
  unassignedGrossProfit: number;
  unassignedOrderedCount: number;
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

type DealCostLookup = {
  dealCostById?: Map<string, number>;
  fallbackCogsRate?: number;
};

export function calcDealKpi(deals: Deal[], costLookup?: DealCostLookup): DealKpiSummary {
  const hasAssignee = (d: Deal) => Boolean(normalizeAssignee(d.assignee));
  const num = (v: unknown): number => {
    const n = typeof v === 'number' ? v : Number(v);
    return Number.isFinite(n) ? n : 0;
  };
  const revenueOf = (d: Deal) => num(d.amount) + ((d.revenueType === 'running' || d.revenueType === 'both') ? num(d.monthlyAmount) : 0);
  const grossOf = (d: Deal, rev: number) => {
    const cost = costLookup?.dealCostById?.get(d.id);
    if (cost !== undefined && cost > 0) return rev - cost;
    const fallbackCogsRate = costLookup?.fallbackCogsRate;
    if (fallbackCogsRate === undefined || fallbackCogsRate === null) return 0;
    return rev - Math.round(rev * fallbackCogsRate);
  };

  const ordered = deals.filter((d) => ORDERED_STAGES.includes(d.stage));
  const pipeline = deals.filter((d) => SALES_STAGES.includes(d.stage));

  const assignedOrdered = ordered.filter(hasAssignee);
  const unassignedOrdered = ordered.filter((d) => !hasAssignee(d));

  const totalRevenue = assignedOrdered.reduce((s, d) => s + revenueOf(d), 0);
  const totalGrossProfit = assignedOrdered.reduce((s, d) => s + grossOf(d, revenueOf(d)), 0);
  const unassignedRevenue = unassignedOrdered.reduce((s, d) => s + revenueOf(d), 0);
  const unassignedGrossProfit = unassignedOrdered.reduce((s, d) => s + grossOf(d, revenueOf(d)), 0);

  const pipelineWeighted = pipeline.filter(hasAssignee).reduce((s, d) => s + Math.round(d.amount * d.probability / 100), 0);

  const assignees = [...new Set(deals.filter(hasAssignee).map((d) => normalizeAssignee(d.assignee)))];
  const memberStats: MemberDealStat[] = assignees.map((name) => {
    const mine = deals.filter((d) => matchesAssignee(d.assignee, name));
    const myOrdered = mine.filter((d) => ORDERED_STAGES.includes(d.stage));
    const rev = myOrdered.reduce((s, d) => s + revenueOf(d), 0);
    const gross = myOrdered.reduce((s, d) => s + grossOf(d, revenueOf(d)), 0);
    return {
      name,
      appointments: mine.filter((d) => d.stage === 'lead').length,
      meetings: mine.filter((d) => d.stage === 'meeting').length,
      estimates: mine.filter((d) => ['proposal', 'estimate_sent'].includes(d.stage)).length,
      orders: myOrdered.length,
      revenue: rev,
      grossProfit: gross,
    };
  });

  return {
    totalRevenue,
    totalGrossProfit,
    grossMarginRate: totalRevenue > 0 ? Math.round((totalGrossProfit / totalRevenue) * 100) : 0,
    dealCount: deals.length,
    orderedCount: assignedOrdered.length,
    pipelineCount: pipeline.length,
    unassignedRevenue,
    unassignedGrossProfit,
    unassignedOrderedCount: unassignedOrdered.length,
    pipelineWeighted,
    memberStats,
  };
}
