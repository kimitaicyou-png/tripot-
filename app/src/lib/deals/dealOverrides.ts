import type { Deal, HistoryEvent, Attachment } from './types';

const DEALS_OVERRIDE_KEY = 'coaris_deals_override';

export function loadOverrides(): Record<string, Partial<Deal>> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(DEALS_OVERRIDE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, Partial<Deal>>) : {};
  } catch { return {}; }
}

export function saveOverrides(overrides: Record<string, Partial<Deal>>) {
  try { localStorage.setItem(DEALS_OVERRIDE_KEY, JSON.stringify(overrides)); } catch {}
}

export function appendHistory(
  dealId: string,
  event: Omit<HistoryEvent, 'id' | 'at'>,
  setDeal: (updater: (d: Deal) => Deal) => void,
) {
  const now = new Date().toISOString();
  const newEvent: HistoryEvent = { ...event, id: `h${Date.now()}`, at: now };
  setDeal((d) => {
    if (d.id !== dealId) return d;
    const next = { ...d, history: [newEvent, ...(d.history ?? [])] };
    const overrides = loadOverrides();
    overrides[dealId] = { ...overrides[dealId], history: next.history };
    saveOverrides(overrides);
    return next;
  });
}

export function loadAttachments(dealId: string): Attachment[] {
  try {
    const raw = localStorage.getItem(DEALS_OVERRIDE_KEY);
    if (!raw) return [];
    const overrides = JSON.parse(raw) as Record<string, { attachments?: Attachment[] }>;
    return overrides[dealId]?.attachments ?? [];
  } catch { return []; }
}

export function saveAttachments(dealId: string, attachments: Attachment[]) {
  try {
    const raw = localStorage.getItem(DEALS_OVERRIDE_KEY);
    const overrides = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
    const existing = (overrides[dealId] as Record<string, unknown>) ?? {};
    overrides[dealId] = { ...existing, attachments };
    localStorage.setItem(DEALS_OVERRIDE_KEY, JSON.stringify(overrides));
  } catch {}
}
