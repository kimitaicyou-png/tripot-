import type { ProductionCard, ProductionCardTask, Phase } from './types';

const KEY = 'tripot_production_cards';

function storageWarn(action: string, e: unknown): void {
  console.warn(`[productionStore] ${action} failed:`, e);
}

export function loadCards(): ProductionCard[] {
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

export function saveCards(cards: ProductionCard[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(KEY, JSON.stringify(cards));
  } catch (e) {
    storageWarn('save', e);
  }
}

export function addCard(card: ProductionCard): void {
  const cards = loadCards().filter((c) => c.dealId !== card.dealId);
  saveCards([card, ...cards]);
}

export function updateCard(id: string, patch: Partial<ProductionCard>): ProductionCard | undefined {
  const cards = loadCards();
  const idx = cards.findIndex((c) => c.id === id);
  if (idx === -1) return undefined;
  const updated = { ...cards[idx], ...patch, updatedAt: new Date().toISOString() };
  cards[idx] = updated;
  saveCards(cards);
  return updated;
}

export function updateTask(cardId: string, taskId: string, patch: Partial<ProductionCardTask>): void {
  const cards = loadCards();
  const card = cards.find((c) => c.id === cardId);
  if (!card) return;
  const now = new Date().toISOString().slice(0, 10);
  card.tasks = card.tasks.map((t) => {
    if (t.id !== taskId) return t;
    const merged = { ...t, ...patch };
    if (patch.status === 'done' && !t.completedAt) merged.completedAt = now;
    if (patch.status === 'doing' && !t.startedAt) merged.startedAt = now;
    if (patch.status !== undefined && patch.status !== 'done') merged.completedAt = undefined;
    return merged;
  });
  card.updatedAt = new Date().toISOString();
  saveCards(cards);
}

export function addTask(cardId: string, task: ProductionCardTask): void {
  const cards = loadCards();
  const card = cards.find((c) => c.id === cardId);
  if (!card) return;
  card.tasks = [...card.tasks, task];
  card.updatedAt = new Date().toISOString();
  saveCards(cards);
}

export function removeTask(cardId: string, taskId: string): void {
  const cards = loadCards();
  const card = cards.find((c) => c.id === cardId);
  if (!card) return;
  card.tasks = card.tasks.filter((t) => t.id !== taskId);
  card.updatedAt = new Date().toISOString();
  saveCards(cards);
}

export function movePhase(cardId: string, phase: Phase): void {
  updateCard(cardId, { phase });
}

export function getCardByDealId(dealId: string): ProductionCard | undefined {
  return loadCards().find((c) => c.dealId === dealId);
}

export function removeCard(id: string): void {
  saveCards(loadCards().filter((c) => c.id !== id));
}

export function resetCards(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(KEY);
}

export function buildCard(input: {
  dealId: string;
  dealName: string;
  clientName: string;
  amount: number;
  pmId: string;
  pmName: string;
  teamMemberIds: string[];
  externalPartnerIds: string[];
  requirement: string;
  proposalSummary: string;
  quoteTotal: number;
  budget: number;
}): ProductionCard {
  const now = new Date().toISOString();
  return {
    id: `pc_${input.dealId}_${Date.now()}`,
    dealId: input.dealId,
    dealName: input.dealName,
    clientName: input.clientName,
    amount: input.amount,
    pmId: input.pmId,
    pmName: input.pmName,
    teamMemberIds: input.teamMemberIds,
    externalPartnerIds: input.externalPartnerIds,
    referenceArtifacts: {
      requirement: input.requirement,
      proposalSummary: input.proposalSummary,
      quoteTotal: input.quoteTotal,
      budget: input.budget,
    },
    tasks: [],
    milestones: [],
    phase: 'kickoff',
    progress: 0,
    risk: 'none',
    status: 'active',
    createdAt: now,
    updatedAt: now,
  };
}
