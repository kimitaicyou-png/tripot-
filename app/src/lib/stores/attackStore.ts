const KEY = 'coaris_attack_list';

export type AttackTarget = {
  id: string;
  name: string;
  company: string;
  position: string;
  department: string;
  industry: string;
  email: string;
  phone: string;
  exchangedDate: string;
  memo: string;
  priority: number;
  status: 'new' | 'contacted' | 'meeting' | 'dealt' | 'declined';
};

function storageWarn(action: string, e: unknown): void {
  console.warn(`[attackStore] ${action} failed:`, e);
}

export function loadTargets(): AttackTarget[] {
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

export function saveTargets(targets: AttackTarget[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(KEY, JSON.stringify(targets));
  } catch (e) {
    storageWarn('save', e);
  }
}

export function addTarget(target: AttackTarget): void {
  const targets = loadTargets();
  if (targets.some((t) => t.id === target.id)) return;
  saveTargets([...targets, target]);
}

export function updateTarget(id: string, patch: Partial<AttackTarget>): void {
  const targets = loadTargets();
  const idx = targets.findIndex((t) => t.id === id);
  if (idx === -1) return;
  targets[idx] = { ...targets[idx], ...patch };
  saveTargets(targets);
}

export function removeTarget(id: string): void {
  saveTargets(loadTargets().filter((t) => t.id !== id));
}

export function resetTargets(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(KEY);
}
