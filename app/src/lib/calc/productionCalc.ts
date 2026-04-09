import type { ProductionCard, ProductionCardTask, MemberInfo } from '@/lib/stores/types';
import { safePercent, safeAvg, safeDiv } from '@/lib/safeMath';

export type ProductionKpi = {
  activeCount: number;
  completedCount: number;
  totalRevenue: number;
  totalBudget: number;
  totalCost: number;
  budgetUsedPct: number;
  grossProfit: number;
  grossRate: number;
  taskTotal: number;
  taskDone: number;
  completionRate: number;
  internalTaskCount: number;
  externalTaskCount: number;
};

export function calcProductionKpi(cards: ProductionCard[]): ProductionKpi {
  const active = cards.filter((c) => c.status === 'active' || c.status === 'paused');
  const completed = cards.filter((c) => c.status === 'done');
  const allTasks = active.flatMap((c) => c.tasks);
  const doneTasks = allTasks.filter((t) => t.status === 'done');

  const totalRevenue = active.reduce((s, c) => {
    const amendments = (c.amendments ?? []).reduce((a, x) => a + x.amount, 0);
    return s + c.amount + amendments;
  }, 0);
  const totalBudget = active.reduce((s, c) => s + c.referenceArtifacts.budget, 0);
  const totalCost = allTasks.reduce((s, t) => s + (t.estimatedCost ?? 0), 0);
  const grossProfit = totalRevenue - totalBudget;

  return {
    activeCount: active.length,
    completedCount: completed.length,
    totalRevenue,
    totalBudget,
    totalCost,
    budgetUsedPct: safePercent(totalCost, totalBudget),
    grossProfit,
    grossRate: safePercent(grossProfit, totalRevenue),
    taskTotal: allTasks.length,
    taskDone: doneTasks.length,
    completionRate: safePercent(doneTasks.length, allTasks.length),
    internalTaskCount: allTasks.filter((t) => (t.assigneeType ?? 'internal') === 'internal').length,
    externalTaskCount: allTasks.filter((t) => t.assigneeType === 'external').length,
  };
}

export type MemberPerf = {
  id: string;
  name: string;
  completed: number;
  onTime: number;
  withDue: number;
  onTimeRate: number;
  avgDaysDiff: number;
  activeTasks: number;
  totalCost: number;
  score: number;
};

export function calcMemberPerf(cards: ProductionCard[], members: MemberInfo[]): MemberPerf[] {
  const allTasks = cards.filter((c) => c.status !== 'cancelled').flatMap((c) => c.tasks);

  return members
    .map((m) => {
      const tasks = allTasks.filter((t) => t.assigneeId === m.id);
      const done = tasks.filter((t) => t.status === 'done');
      const withDue = done.filter((t) => t.dueDate && t.completedAt);
      const onTime = withDue.filter((t) => t.completedAt! <= t.dueDate!);
      const avgDiff = withDue.length > 0
        ? Math.round(safeDiv(
            withDue.reduce((s, t) => s + (new Date(t.dueDate!).getTime() - new Date(t.completedAt!).getTime()) / 86400000, 0),
            withDue.length,
          ))
        : 0;
      const onTimeRate = safePercent(onTime.length, withDue.length);
      const activeTasks = tasks.filter((t) => t.status !== 'done').length;
      const totalCost = done.reduce((s, t) => s + (t.estimatedCost ?? 0), 0);
      const score = done.length * 10 + safeDiv(onTime.length, Math.max(withDue.length, 1)) * 30 + Math.max(avgDiff, 0) * 5;

      return { id: m.id, name: m.name, completed: done.length, onTime: onTime.length, withDue: withDue.length, onTimeRate, avgDaysDiff: avgDiff, activeTasks, totalCost, score };
    })
    .filter((p) => p.completed > 0 || p.activeTasks > 0)
    .sort((a, b) => b.score - a.score);
}

export type VendorPerf = {
  name: string;
  completed: number;
  total: number;
  onTimeRate: number;
  rejected: number;
  cost: number;
};

export function calcVendorPerf(cards: ProductionCard[]): VendorPerf[] {
  const extTasks = cards
    .filter((c) => c.status !== 'cancelled')
    .flatMap((c) => c.tasks)
    .filter((t) => t.assigneeType === 'external' && t.externalPartnerName);

  const names = [...new Set(extTasks.map((t) => t.externalPartnerName!))];

  return names.map((name) => {
    const tasks = extTasks.filter((t) => t.externalPartnerName === name);
    const done = tasks.filter((t) => t.status === 'done');
    const withDue = done.filter((t) => t.dueDate && t.completedAt);
    const onTime = withDue.filter((t) => t.completedAt! <= t.dueDate!);
    return {
      name,
      completed: done.length,
      total: tasks.length,
      onTimeRate: safePercent(onTime.length, withDue.length),
      rejected: tasks.filter((t) => t.reviewStatus === 'rejected').length,
      cost: tasks.reduce((s, t) => s + (t.estimatedCost ?? 0), 0),
    };
  });
}

export function calcMemberLoad(cards: ProductionCard[]) {
  const map = new Map<string, { active: number; cost: number }>();
  for (const c of cards) {
    if (c.status === 'cancelled') continue;
    for (const t of c.tasks) {
      if (!t.assigneeId || t.status === 'done') continue;
      const prev = map.get(t.assigneeId) ?? { active: 0, cost: 0 };
      prev.active += 1;
      prev.cost += t.estimatedCost ?? 0;
      map.set(t.assigneeId, prev);
    }
  }
  return map;
}

export function parseRequirementItems(text: string | undefined) {
  if (!text) return [];
  const items: { id: string; text: string; depth: number }[] = [];
  const seen = new Set<string>();
  for (const raw of text.split('\n')) {
    const m = raw.match(/^(\s*)[-*+]\s+(.+?)\s*$/);
    if (!m) continue;
    const depth = Math.floor(m[1].length / 2);
    const content = m[2].trim();
    if (!content) continue;
    const base = content.toLowerCase().replace(/\s+/g, '_').slice(0, 40);
    let id = base;
    let n = 1;
    while (seen.has(id)) id = `${base}_${n++}`;
    seen.add(id);
    items.push({ id, text: content, depth });
  }
  return items;
}
