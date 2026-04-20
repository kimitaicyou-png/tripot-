import type { AttackTarget } from './types';

const STORAGE_KEY = 'coaris-attack-list';

export function loadTargets(): AttackTarget[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (err) { console.error('loadTargets failed:', err); return []; }
}

export function saveTargets(targets: AttackTarget[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(targets));
}
