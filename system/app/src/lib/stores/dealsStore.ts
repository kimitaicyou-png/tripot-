import type { Deal } from './types';

const KEY = 'tripot_deals_all';

function storageWarn(action: string, e: unknown): void {
  console.warn(`[dealsStore] ${action} failed:`, e);
}

export function loadDeals(): Deal[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    storageWarn('load', e);
    return [];
  }
}

export function saveDeals(deals: Deal[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(KEY, JSON.stringify(deals));
  } catch (e) {
    storageWarn('save', e);
  }
}

export function addDeal(deal: Deal): void {
  const deals = loadDeals();
  if (deals.some((d) => d.id === deal.id)) return;
  saveDeals([...deals, deal]);
}

export function updateDeal(id: string, patch: Partial<Deal>): void {
  const deals = loadDeals();
  const idx = deals.findIndex((d) => d.id === id);
  if (idx === -1) return;
  deals[idx] = { ...deals[idx], ...patch, updatedAt: new Date().toISOString() };
  saveDeals(deals);
}

export function removeDeal(id: string): void {
  saveDeals(loadDeals().filter((d) => d.id !== id));
}

export function getDealById(id: string): Deal | undefined {
  return loadDeals().find((d) => d.id === id);
}

export function resetDeals(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(KEY);
}
